import { IntegrationException } from '../exceptions/IntegrationException';
import { UpstreamHttpException } from '../exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from '../exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from '../exceptions/UpstreamTimeoutException';

/**
 * What a failed upstream attempt means for retry and circuit-breaker
 * decisions.
 */
export interface UpstreamFailureClassification {
  /**
   * Short label for log lines, e.g. `HTTP 503` or `network failure`.
   */
  reason: string;

  /**
   * Transient by nature: worth another attempt of the same idempotent GET.
   */
  retryable: boolean;

  /**
   * Indicates that the provider is unavailable (no answer, timeout, 5xx)
   * and therefore counts towards opening the provider's circuit.
   */
  outage: boolean;

  /**
   * Delay the upstream asked for via `Retry-After`, when it sent a valid
   * header on a status that honours it.
   */
  retryAfterMs?: number;
}

/**
 * Classifies a failure raised inside one attempt. Only idempotent GET
 * requests pass through here, so a retry never repeats a side effect.
 *
 * - network failure: retryable, outage;
 * - timeout: outage, not retryable (the request budget is spent);
 * - HTTP 429: retryable (Retry-After honoured), not an outage;
 * - HTTP 502/503/504: retryable, outage (Retry-After honoured on 503);
 * - other 5xx: outage, not retryable;
 * - other 4xx, contract violations, unparseable bodies: neither.
 *
 * Returns undefined for errors that are not integration failures; those are
 * programming errors and propagate untouched.
 */
export function classifyUpstreamFailure(
  error: unknown,
): UpstreamFailureClassification | undefined {
  if (error instanceof UpstreamNetworkException) {
    return { reason: 'network failure', retryable: true, outage: true };
  }
  if (error instanceof UpstreamTimeoutException) {
    return { reason: 'timeout', retryable: false, outage: true };
  }
  if (error instanceof UpstreamHttpException) {
    const { status } = error;
    const reason = `HTTP ${status}`;

    switch (status) {
      case 429:
        return {
          reason,
          retryable: true,
          outage: false,
          retryAfterMs: error.retryAfterMs,
        };
      case 503:
        return {
          reason,
          retryable: true,
          outage: true,
          retryAfterMs: error.retryAfterMs,
        };
      case 502:
      case 504:
        return { reason, retryable: true, outage: true };
      default:
        return { reason, retryable: false, outage: status >= 500 };
    }
  }
  if (error instanceof IntegrationException) {
    return { reason: error.name, retryable: false, outage: false };
  }

  return undefined;
}
