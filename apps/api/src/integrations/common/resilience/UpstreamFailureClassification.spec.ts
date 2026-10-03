import { ConstantBackoff } from 'cockatiel';
import { UpstreamCircuitOpenException } from '../exceptions/UpstreamCircuitOpenException';
import { UpstreamContractViolationException } from '../exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from '../exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from '../exceptions/UpstreamTimeoutException';
import { RetryAfterBackoff } from './RetryAfterBackoff';
import { parseRetryAfterHeader } from './RetryAfterHeader';
import { classifyUpstreamFailure } from './UpstreamFailureClassification';

const URL = 'https://upstream.test/api/thing';

describe('classifyUpstreamFailure', () => {
  it.each([
    [
      'network failure',
      new UpstreamNetworkException(URL, new Error('ECONNRESET')),
      { retryable: true, outage: true },
    ],
    [
      'timeout',
      new UpstreamTimeoutException(URL, 15_000),
      { retryable: false, outage: true },
    ],
    [
      'HTTP 429',
      new UpstreamHttpException(URL, 429, undefined, 1_500),
      { retryable: true, outage: false, retryAfterMs: 1_500 },
    ],
    [
      'HTTP 502',
      new UpstreamHttpException(URL, 502),
      { retryable: true, outage: true },
    ],
    [
      'HTTP 503',
      new UpstreamHttpException(URL, 503, undefined, 2_000),
      { retryable: true, outage: true, retryAfterMs: 2_000 },
    ],
    [
      'HTTP 504',
      new UpstreamHttpException(URL, 504),
      { retryable: true, outage: true },
    ],
    [
      'HTTP 500',
      new UpstreamHttpException(URL, 500),
      { retryable: false, outage: true },
    ],
    [
      'HTTP 400',
      new UpstreamHttpException(URL, 400),
      { retryable: false, outage: false },
    ],
    [
      'HTTP 404',
      new UpstreamHttpException(URL, 404),
      { retryable: false, outage: false },
    ],
    [
      'UpstreamContractViolationException',
      new UpstreamContractViolationException(URL, ['name: must be a string']),
      { retryable: false, outage: false },
    ],
    [
      'UpstreamCircuitOpenException',
      new UpstreamCircuitOpenException(URL, 'PVOG'),
      { retryable: false, outage: false },
    ],
  ])('classifies %s', (reason, error, expected) => {
    expect(classifyUpstreamFailure(error)).toEqual({ reason, ...expected });
  });

  it('leaves non-integration errors unclassified', () => {
    expect(classifyUpstreamFailure(new TypeError('bug'))).toBeUndefined();
    expect(classifyUpstreamFailure('string')).toBeUndefined();
  });
});

describe('parseRetryAfterHeader', () => {
  const now = Date.parse('2026-10-03T12:00:00Z');

  it('reads delay seconds', () => {
    expect(parseRetryAfterHeader('2', now)).toBe(2_000);
    expect(parseRetryAfterHeader(' 0 ', now)).toBe(0);
  });

  it('reads an HTTP-date relative to now', () => {
    expect(parseRetryAfterHeader('Sat, 03 Oct 2026 12:00:05 GMT', now)).toBe(
      5_000,
    );
    expect(parseRetryAfterHeader('Sat, 03 Oct 2026 11:00:00 GMT', now)).toBe(0);
  });

  it('ignores a missing or malformed header', () => {
    expect(parseRetryAfterHeader(null, now)).toBeUndefined();
    expect(parseRetryAfterHeader('soon', now)).toBeUndefined();
    expect(parseRetryAfterHeader('-5', now)).toBeUndefined();
  });
});

describe('RetryAfterBackoff', () => {
  const context = (error: Error) => ({
    attempt: 1,
    signal: new AbortController().signal,
    result: { error },
  });

  it('waits for Retry-After when the upstream sent one, else for the fallback', () => {
    const backoff = new RetryAfterBackoff(new ConstantBackoff(50));

    const first = backoff.next(
      context(new UpstreamHttpException(URL, 429, undefined, 7)),
    );
    const second = first.next(context(new UpstreamHttpException(URL, 503)));
    const third = second.next(
      context(new UpstreamNetworkException(URL, new Error('down'))),
    );

    expect([first.duration, second.duration, third.duration]).toEqual([
      7, 50, 50,
    ]);
  });
});
