import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ExponentialBackoff,
  FailureReason,
  handleWhen,
  retry,
  TaskCancelledError,
  timeout,
  TimeoutPolicy,
  TimeoutStrategy,
  wrap,
} from 'cockatiel';
import CircuitBreaker from 'opossum';
import { UpstreamCircuitOpenException } from '../exceptions/UpstreamCircuitOpenException';
import { UpstreamTimeoutException } from '../exceptions/UpstreamTimeoutException';
import { UpstreamProvider } from '../UpstreamProvider';
import { RetryAfterBackoff } from './RetryAfterBackoff';
import { classifyUpstreamFailure } from './UpstreamFailureClassification';

export interface RetryOptions {
  /**
   * Retries after the initial attempt; 0 disables retrying.
   */
  maxRetries: number;

  /**
   * First backoff delay; later delays grow exponentially with jitter
   * (cockatiel's decorrelated jitter) up to maxDelayMs.
   */
  baseDelayMs: number;

  maxDelayMs: number;
}

/**
 * opossum options, one breaker per provider.
 */
export interface CircuitBreakerOptions {
  /**
   * Failure percentage within the rolling window at which the circuit opens.
   */
  errorThresholdPercentage: number;

  /**
   * Minimum number of calls within the rolling window before the circuit
   * may open.
   */
  volumeThreshold: number;

  /**
   * Length of the rolling statistics window.
   */
  rollingWindowMs: number;

  /**
   * How long an open circuit rejects calls before one probe call is let
   * through (opossum's half-open state admits exactly one).
   */
  resetTimeoutMs: number;
}

export interface UpstreamRequestExecutorOptions {
  /**
   * Overall budget of one upstream request including retries and the waits
   * between them (INTEGRATIONS_HTTP_TIMEOUT_MS). The request is aborted at
   * the budget's deadline whatever it is doing.
   */
  requestBudgetMs: number;

  retry: RetryOptions;

  circuitBreaker: CircuitBreakerOptions;
}

/**
 * One attempt of the request; must honour the signal and raise
 * IntegrationException subclasses for upstream failures.
 */
export type UpstreamAttempt<T> = (signal: AbortSignal) => Promise<T>;

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

type ProviderBreaker = CircuitBreaker<
  [AbortSignal, UpstreamAttempt<unknown>],
  unknown
>;

/**
 * Runs idempotent upstream GETs with the resilience policy of the
 * integration layer, composed from cockatiel and opossum:
 * timeout(budget) → retry(backoff) → opossum breaker per provider →
 * attempt. Shared by every client of a provider so that breaker state
 * reflects the provider, not a single endpoint.
 *
 * Log lines carry provider, attempt, retry reason and breaker transitions
 * next to the sanitized URL only.
 */
export class UpstreamRequestExecutor implements OnModuleDestroy {
  readonly requestBudgetMs: number;
  private readonly retryOptions: RetryOptions;
  private readonly breakerOptions: CircuitBreakerOptions;
  private readonly budget: TimeoutPolicy;
  private readonly breakers = new Map<UpstreamProvider, ProviderBreaker>();
  private readonly logger = new Logger(UpstreamRequestExecutor.name);

  constructor(options: UpstreamRequestExecutorOptions) {
    assertPositive('requestBudgetMs', options.requestBudgetMs);
    assertNonNegativeInteger('retry.maxRetries', options.retry.maxRetries);
    assertNonNegative('retry.baseDelayMs', options.retry.baseDelayMs);
    assertNonNegative('retry.maxDelayMs', options.retry.maxDelayMs);
    assertNonNegative(
      'circuitBreaker.errorThresholdPercentage',
      options.circuitBreaker.errorThresholdPercentage,
    );
    assertNonNegativeInteger(
      'circuitBreaker.volumeThreshold',
      options.circuitBreaker.volumeThreshold,
    );
    assertPositive(
      'circuitBreaker.rollingWindowMs',
      options.circuitBreaker.rollingWindowMs,
    );
    assertPositive(
      'circuitBreaker.resetTimeoutMs',
      options.circuitBreaker.resetTimeoutMs,
    );

    this.requestBudgetMs = options.requestBudgetMs;
    this.retryOptions = options.retry;
    this.breakerOptions = options.circuitBreaker;
    this.budget = timeout(options.requestBudgetMs, TimeoutStrategy.Aggressive);
  }

  circuitState(provider: UpstreamProvider): CircuitState {
    const breaker = this.breakerFor(provider);

    if (breaker.halfOpen) return 'HALF_OPEN';

    return breaker.opened ? 'OPEN' : 'CLOSED';
  }

  async execute<T>(
    provider: UpstreamProvider,
    url: string,
    attempt: UpstreamAttempt<T>,
  ): Promise<T> {
    const breaker = this.breakerFor(provider);
    const deadline = Date.now() + this.requestBudgetMs;
    const maxAttempts = this.retryOptions.maxRetries + 1;
    let attempts = 0;

    const retryPolicy = retry(
      handleWhen((error) => this.isRetryableWithinBudget(error, deadline)),
      {
        maxAttempts: this.retryOptions.maxRetries,
        backoff: new RetryAfterBackoff(
          new ExponentialBackoff({
            initialDelay: this.retryOptions.baseDelayMs,
            maxDelay: this.retryOptions.maxDelayMs,
          }),
        ),
      },
    );

    retryPolicy.onRetry((event) => {
      this.logger.warn(
        `${provider} retry ${event.attempt + 1}/${maxAttempts} in ${Math.round(event.delay)} ms after ${describe(event)}: ${url}`,
      );
    });
    retryPolicy.onGiveUp((reason) => {
      if (attempts > 1) {
        this.logger.warn(
          `${provider} request failed after ${attempts} attempt(s), last reason ${describe(reason)}: ${url}`,
        );
      }
    });

    try {
      return await wrap(this.budget, retryPolicy).execute(
        async ({ signal }) => {
          if (signal.aborted) {
            throw new UpstreamTimeoutException(url, this.requestBudgetMs);
          }

          attempts += 1;

          try {
            return (await breaker.fire(signal, attempt)) as T;
          } catch (error) {
            if (isOpenBreakerError(error)) {
              this.logger.debug(
                `${provider} circuit ${this.circuitState(provider)}: rejected without an upstream call: ${url}`,
              );

              throw new UpstreamCircuitOpenException(url, provider);
            }

            throw error;
          }
        },
      );
    } catch (error) {
      if (error instanceof TaskCancelledError) {
        this.logger.warn(
          `${provider} request budget of ${this.requestBudgetMs} ms exhausted after ${attempts} attempt(s): ${url}`,
        );

        throw new UpstreamTimeoutException(url, this.requestBudgetMs);
      }

      throw error;
    }
  }

  onModuleDestroy(): void {
    for (const breaker of this.breakers.values()) breaker.shutdown();

    this.breakers.clear();
  }

  /**
   * Transient failures are retried unless the upstream's own Retry-After
   * would already overrun the request budget; the budget itself aborts a
   * retry sequence that runs past the deadline.
   */
  private isRetryableWithinBudget(error: unknown, deadline: number): boolean {
    const failure = classifyUpstreamFailure(error);

    if (failure === undefined || !failure.retryable) return false;

    return (
      failure.retryAfterMs === undefined ||
      Date.now() + failure.retryAfterMs < deadline
    );
  }

  private breakerFor(provider: UpstreamProvider): ProviderBreaker {
    let breaker = this.breakers.get(provider);

    if (breaker === undefined) {
      breaker = new CircuitBreaker(
        (signal: AbortSignal, attempt: UpstreamAttempt<unknown>) =>
          attempt(signal),
        {
          name: provider,
          timeout: false,
          errorThresholdPercentage:
            this.breakerOptions.errorThresholdPercentage,
          volumeThreshold: this.breakerOptions.volumeThreshold,
          rollingCountTimeout: this.breakerOptions.rollingWindowMs,
          resetTimeout: this.breakerOptions.resetTimeoutMs,
          // Only availability failures count: 4xx answers, contract
          // violations and programming errors leave the circuit alone.
          errorFilter: (error: unknown) =>
            !(classifyUpstreamFailure(error)?.outage ?? false),
        },
      );
      breaker.on('open', () =>
        this.logger.warn(
          `${provider} circuit OPEN: upstream calls rejected for ${this.breakerOptions.resetTimeoutMs} ms`,
        ),
      );
      breaker.on('halfOpen', () =>
        this.logger.log(
          `${provider} circuit HALF_OPEN: one probe call allowed`,
        ),
      );
      breaker.on('close', () =>
        this.logger.log(`${provider} circuit CLOSED: upstream recovered`),
      );
      this.breakers.set(provider, breaker);
    }

    return breaker;
  }
}

function describe(reason: FailureReason<unknown>): string {
  if (!('error' in reason)) return 'unexpected result';

  return classifyUpstreamFailure(reason.error)?.reason ?? 'unexpected error';
}

function isOpenBreakerError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as { code?: unknown }).code === 'EOPENBREAKER'
  );
}

function assertPositive(name: string, value: number): void {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(
      `Upstream resilience: ${name} must be a positive number, got ${value}`,
    );
  }
}

function assertNonNegative(name: string, value: number): void {
  if (!(value >= 0) || !Number.isFinite(value)) {
    throw new Error(
      `Upstream resilience: ${name} must be a non-negative number, got ${value}`,
    );
  }
}

function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Upstream resilience: ${name} must be a non-negative integer, got ${value}`,
    );
  }
}
