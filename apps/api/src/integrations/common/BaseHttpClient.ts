import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { CONFIG } from '../../config';
import {
  INTEGRATION_CACHE,
  type IntegrationCache,
} from './cache/IntegrationCache';
import { UpstreamContractViolationException } from './exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from './exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from './exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from './exceptions/UpstreamTimeoutException';
import { parseRetryAfterHeader } from './resilience/RetryAfterHeader';
import { UpstreamRequestExecutor } from './resilience/UpstreamRequestExecutor';
import { UpstreamProvider } from './UpstreamProvider';
import { sanitizeUrlForLogging } from './UrlSanitizer';

export interface QueryParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface UpstreamReadOptions {
  /**
   * Serve the validated result from the integration cache when present and
   * store a fresh one for the configured TTL. Opt in only for key-based
   * reads of data that changes rarely (a territory, a catalog entry, an
   * organisation unit); never for searches or enumerations. Failures are
   * never cached because only a validated result reaches the cache.
   */
  cacheable?: boolean;
}

/**
 * HTTP gateway shared by all external API clients: native fetch, wire
 * contract validation, typed exceptions (see ./exceptions). Every request
 * runs through the UpstreamRequestExecutor, which applies the provider's
 * circuit breaker, bounded retries and the request budget
 * (INTEGRATIONS_HTTP_TIMEOUT_MS); opted-in reads are served from the
 * integration cache.
 *
 * Logs and exceptions only ever carry the sanitized upstream URL (origin and
 * path); query values such as search terms or postal codes are never logged.
 */
@Injectable()
export abstract class BaseHttpClient {
  protected abstract readonly baseUrl: string;
  protected abstract readonly provider: UpstreamProvider;
  protected readonly cacheTtlMs: number = CONFIG.integrations.cache.ttlMs;
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly executor: UpstreamRequestExecutor,
    @Inject(INTEGRATION_CACHE) private readonly cache: IntegrationCache,
  ) {}

  /**
   * GET expecting a single JSON object matching the given wire model.
   */
  protected getModel<T extends object>(
    model: ClassConstructor<T>,
    path: string,
    params?: QueryParams,
    options: UpstreamReadOptions = {},
  ): Promise<T> {
    return this.read(model.name, path, params, options, (payload, url) => {
      if (!isJsonObject(payload)) {
        throw this.contractViolation(url, [
          `expected a JSON object at the top level, got ${describeJsonValue(payload)}`,
        ]);
      }

      return this.toValidatedInstance(model, payload, url);
    });
  }

  /**
   * GET expecting a JSON array whose items match the given wire model.
   */
  protected getModelArray<T extends object>(
    model: ClassConstructor<T>,
    path: string,
    params?: QueryParams,
    options: UpstreamReadOptions = {},
  ): Promise<T[]> {
    return this.read(
      `${model.name}[]`,
      path,
      params,
      options,
      (payload, url) => {
        if (!Array.isArray(payload)) {
          throw this.contractViolation(url, [
            `expected a JSON array at the top level, got ${describeJsonValue(payload)}`,
          ]);
        }

        return payload.map((item, index) =>
          this.toValidatedInstance(model, item, url, `[${index}]`),
        );
      },
    );
  }

  /**
   * GET without wire validation; only for endpoints with a dynamic shape.
   */
  protected getRawJson<T>(
    path: string,
    params?: QueryParams,
    options: UpstreamReadOptions = {},
  ): Promise<T> {
    return this.read('raw', path, params, options, (payload) => payload as T);
  }

  /**
   * Cache lookup, request through the executor, parsing, cache store. The
   * cache key holds the full request URL; it stays in memory and is never
   * logged. `kind` separates the representations of one URL.
   */
  private async read<T>(
    kind: string,
    path: string,
    params: QueryParams | undefined,
    options: UpstreamReadOptions,
    parse: (payload: unknown, url: string) => T,
  ): Promise<T> {
    const requestUrl = this.buildUrl(path, params);
    const url = sanitizeUrlForLogging(requestUrl);
    const cacheKey = options.cacheable
      ? `${this.provider}:${kind}:${requestUrl}`
      : undefined;

    if (cacheKey !== undefined) {
      const cached = await this.cache.get<T>(cacheKey);

      this.logger.debug(
        `Cache ${cached === undefined ? 'miss' : 'hit'} for ${this.provider}: ${url}`,
      );

      if (cached !== undefined) return cached;
    }

    const payload = await this.fetchJson(requestUrl, url);
    const value = parse(payload, url);

    if (cacheKey !== undefined) {
      await this.cache.set(cacheKey, value, this.cacheTtlMs);
    }

    return value;
  }

  /**
   * One upstream request under the executor's policy; `url` is the
   * sanitized form used for logs and exceptions.
   */
  private fetchJson(requestUrl: string, url: string): Promise<unknown> {
    return this.executor.execute(this.provider, url, async (signal) => {
      let response: Response;

      try {
        response = await fetch(requestUrl, {
          signal,
          headers: { Accept: 'application/json' },
        });
      } catch (error) {
        throw this.transportFailure(url, error, signal);
      }

      if (!response.ok) {
        const bodySnippet = await readBodySnippet(response);

        this.logger.warn(`HTTP ${response.status} from upstream: ${url}`);

        throw new UpstreamHttpException(
          url,
          response.status,
          bodySnippet,
          parseRetryAfterHeader(
            response.headers.get('retry-after'),
            Date.now(),
          ),
        );
      }
      try {
        return (await response.json()) as unknown;
      } catch (error) {
        if (signal.aborted) {
          throw this.transportFailure(url, error, signal);
        }

        throw this.contractViolation(url, ['response body is not valid JSON']);
      }
    });
  }

  private transportFailure(
    url: string,
    error: unknown,
    signal: AbortSignal,
  ): UpstreamTimeoutException | UpstreamNetworkException {
    if (signal.aborted) {
      const budgetMs = this.executor.requestBudgetMs;

      this.logger.error(`Timed out after ${budgetMs} ms: ${url}`);

      return new UpstreamTimeoutException(url, budgetMs);
    }

    this.logger.error(`Network failure for ${url}`, error);

    return new UpstreamNetworkException(url, error);
  }

  private toValidatedInstance<T extends object>(
    model: ClassConstructor<T>,
    payload: unknown,
    url: string,
    pathPrefix = '',
  ): T {
    if (!isJsonObject(payload)) {
      throw this.contractViolation(url, [
        `${pathPrefix || 'value'}: expected a JSON object, got ${describeJsonValue(payload)}`,
      ]);
    }

    const instance = plainToInstance(model, payload, {
      excludeExtraneousValues: true,
    });

    const errors = validateSync(instance, { forbidUnknownValues: false });

    if (errors.length > 0) {
      throw this.contractViolation(
        url,
        flattenValidationErrors(errors, pathPrefix),
      );
    }

    return instance;
  }

  private contractViolation(
    url: string,
    violations: string[],
  ): UpstreamContractViolationException {
    this.logger.error(
      `Wire contract violated by ${url}: ${violations.join('; ')}`,
    );

    return new UpstreamContractViolationException(url, violations);
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const url = new URL(this.baseUrl + path);

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, item);
      } else {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath: string,
): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    for (const constraint of Object.values(error.constraints ?? {})) {
      messages.push(`${path}: ${constraint}`);
    }
    if (error.children && error.children.length > 0) {
      messages.push(...flattenValidationErrors(error.children, path));
    }
  }

  return messages;
}

function describeJsonValue(value: unknown): string {
  if (value === null) return 'null';

  if (Array.isArray(value)) return 'an array';

  return typeof value;
}

async function readBodySnippet(
  response: Response,
): Promise<string | undefined> {
  try {
    const text = await response.text();

    return text.slice(0, 300) || undefined;
  } catch {
    return undefined;
  }
}
