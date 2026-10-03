import type {
  IBackoff,
  IBackoffFactory,
  IRetryBackoffContext,
} from 'cockatiel';
import { classifyUpstreamFailure } from './UpstreamFailureClassification';

type RetryContext = IRetryBackoffContext<unknown>;

/**
 * cockatiel backoff that waits as long as the upstream asked for via
 * `Retry-After` (429/503) and otherwise defers to the wrapped backoff,
 * typically an ExponentialBackoff with jitter.
 */
export class RetryAfterBackoff implements IBackoffFactory<RetryContext> {
  constructor(private readonly fallback: IBackoffFactory<unknown>) {}

  next(context: RetryContext): IBackoff<RetryContext> {
    return step(this.fallback.next(context), context);
  }
}

function step(
  fallback: IBackoff<unknown>,
  context: RetryContext,
): IBackoff<RetryContext> {
  const retryAfterMs =
    'error' in context.result
      ? classifyUpstreamFailure(context.result.error)?.retryAfterMs
      : undefined;

  return {
    duration: retryAfterMs ?? fallback.duration,
    next: (nextContext) => step(fallback.next(nextContext), nextContext),
  };
}
