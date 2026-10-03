import { Logger } from '@nestjs/common';
import { testUpstreamRequestExecutor } from '../../../../test/UpstreamTestSupport';
import { UpstreamCircuitOpenException } from '../exceptions/UpstreamCircuitOpenException';
import { UpstreamContractViolationException } from '../exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from '../exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from '../exceptions/UpstreamTimeoutException';
import { UpstreamRequestExecutor } from './UpstreamRequestExecutor';

const URL = 'https://upstream.test/api/thing';

/**
 * Attempt that fails with the given errors in order and then succeeds.
 */
function failingThen<T>(value: T, ...errors: Error[]) {
  return jest.fn((): Promise<T> => {
    const error = errors.shift();

    return error === undefined ? Promise.resolve(value) : Promise.reject(error);
  });
}

const http = (status: number, retryAfterMs?: number) =>
  new UpstreamHttpException(URL, status, undefined, retryAfterMs);
const network = () =>
  new UpstreamNetworkException(URL, new Error('ECONNRESET'));
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('UpstreamRequestExecutor', () => {
  const created: UpstreamRequestExecutor[] = [];
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  const warnings = (): string[] =>
    (warnSpy.mock.calls as unknown[][]).map((call) => String(call[0]));
  const logs = (): string[] =>
    (logSpy.mock.calls as unknown[][]).map((call) => String(call[0]));

  function executor(
    overrides: Parameters<typeof testUpstreamRequestExecutor>[0] = {},
  ): UpstreamRequestExecutor {
    const subject = testUpstreamRequestExecutor({
      requestBudgetMs: 10_000,
      retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 2 },
      circuitBreaker: {
        errorThresholdPercentage: 50,
        volumeThreshold: 3,
        rollingWindowMs: 10_000,
        resetTimeoutMs: 30,
      },
      ...overrides,
    });
    created.push(subject);

    return subject;
  }

  beforeEach(() => {
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    debugSpy = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    debugSpy.mockRestore();
    created.forEach((subject) => subject.onModuleDestroy());
    created.length = 0;
  });

  describe('retry', () => {
    it('returns the first success', async () => {
      const attempt = failingThen('ok');

      await expect(executor().execute('PVOG', URL, attempt)).resolves.toBe(
        'ok',
      );
      expect(attempt).toHaveBeenCalledTimes(1);
      expect(warnings()).toEqual([]);
    });

    it('retries after a transient failure and succeeds', async () => {
      const attempt = failingThen('ok', http(503));

      await expect(executor().execute('PVOG', URL, attempt)).resolves.toBe(
        'ok',
      );
      expect(attempt).toHaveBeenCalledTimes(2);
      expect(warnings()).toEqual([
        expect.stringMatching(/^PVOG retry 2\/3 in \d+ ms after HTTP 503: /),
      ]);
    });

    it('retries up to the configured number of times', async () => {
      const attempt = failingThen('ok', network(), http(502));

      await executor().execute('PVOG', URL, attempt);

      expect(attempt).toHaveBeenCalledTimes(3);
      expect(warnings()).toEqual([
        expect.stringContaining('retry 2/3'),
        expect.stringContaining('retry 3/3'),
      ]);
    });

    it('waits for Retry-After on 429 and 503', async () => {
      const subject = executor({
        retry: { maxRetries: 2, baseDelayMs: 20, maxDelayMs: 40 },
      });

      await subject.execute('PVOG', URL, failingThen('ok', http(429, 5)));
      await subject.execute('PVOG', URL, failingThen('ok', http(503, 7)));

      expect(warnings()).toEqual([
        expect.stringContaining('in 5 ms after HTTP 429'),
        expect.stringContaining('in 7 ms after HTTP 503'),
      ]);
    });

    it.each([
      ['HTTP 400', http(400)],
      ['HTTP 404', http(404)],
      ['HTTP 500', http(500)],
      [
        'contract violation',
        new UpstreamContractViolationException(URL, ['name: must be a string']),
      ],
      ['timeout', new UpstreamTimeoutException(URL, 10_000)],
    ])('does not retry a %s', async (_label, error) => {
      const attempt = failingThen('ok', error);

      await expect(executor().execute('PVOG', URL, attempt)).rejects.toBe(
        error,
      );
      expect(attempt).toHaveBeenCalledTimes(1);
      expect(warnings()).toEqual([]);
    });

    it('rethrows the last error once the retries are exhausted', async () => {
      const last = http(503);
      const attempt = failingThen('ok', http(503), network(), last);

      await expect(executor().execute('PVOG', URL, attempt)).rejects.toBe(last);
      expect(attempt).toHaveBeenCalledTimes(3);
      expect(warnings().at(-1)).toContain(
        'PVOG request failed after 3 attempt(s), last reason HTTP 503',
      );
    });

    it('propagates programming errors without retrying', async () => {
      const bug = new TypeError('bug');
      const attempt = failingThen('ok', bug);

      await expect(executor().execute('PVOG', URL, attempt)).rejects.toBe(bug);
      expect(attempt).toHaveBeenCalledTimes(1);
    });
  });

  describe('request budget', () => {
    it('does not retry when Retry-After exceeds the remaining budget', async () => {
      const error = http(503, 20_000);
      const attempt = failingThen('ok', error);

      await expect(
        executor({ requestBudgetMs: 50 }).execute('PVOG', URL, attempt),
      ).rejects.toBe(error);
      expect(attempt).toHaveBeenCalledTimes(1);
      expect(warnings()).toEqual([]);
    });

    it('aborts a hanging attempt at the deadline', async () => {
      const attempt = jest.fn(
        (signal: AbortSignal) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(new UpstreamTimeoutException(URL, 20)),
            );
          }),
      );

      const error = await executor({ requestBudgetMs: 20 })
        .execute('PVOG', URL, attempt)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamTimeoutException);
      expect((error as UpstreamTimeoutException).timeoutMs).toBe(20);
      expect(attempt).toHaveBeenCalledTimes(1);
      expect(warnings().at(-1)).toContain(
        'request budget of 20 ms exhausted after 1 attempt(s)',
      );
    });

    it('ends a retry sequence that runs past the deadline with a timeout', async () => {
      const attempt = failingThen('ok', http(503), http(503), http(503));

      const error = await executor({
        requestBudgetMs: 15,
        retry: { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 100 },
      })
        .execute('PVOG', URL, attempt)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamTimeoutException);
      expect(attempt).toHaveBeenCalledTimes(1);
      await sleep(120);
      expect(attempt).toHaveBeenCalledTimes(1);
    });

    it('exposes the budget for timeout messages', () => {
      expect(executor({ requestBudgetMs: 1_234 }).requestBudgetMs).toBe(1_234);
    });
  });

  describe('circuit breaker', () => {
    const noRetry = { retry: { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 2 } };

    async function failTimes(
      subject: UpstreamRequestExecutor,
      provider: 'PVOG' | 'FIM',
      times: number,
      error: () => Error = network,
    ): Promise<void> {
      for (let i = 0; i < times; i += 1) {
        await subject
          .execute(provider, URL, () => Promise.reject(error()))
          .catch(() => undefined);
      }
    }

    it('opens after the volume threshold and rejects without calling upstream', async () => {
      const subject = executor(noRetry);
      await failTimes(subject, 'PVOG', 3);
      const attempt = jest.fn(() => Promise.resolve('ok'));

      await expect(
        subject.execute('PVOG', URL, attempt),
      ).rejects.toBeInstanceOf(UpstreamCircuitOpenException);
      expect(attempt).not.toHaveBeenCalled();
      expect(subject.circuitState('PVOG')).toBe('OPEN');
      expect(warnings()).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'PVOG circuit OPEN: upstream calls rejected for 30 ms',
          ),
        ]),
      );
    });

    it('counts every failed attempt of a retried request', async () => {
      const subject = executor();

      await subject
        .execute('PVOG', URL, () => Promise.reject(network()))
        .catch(() => undefined);

      expect(subject.circuitState('PVOG')).toBe('OPEN');
    });

    it.each([
      ['HTTP 404', () => http(404)],
      ['HTTP 429', () => http(429)],
      [
        'contract violation',
        () => new UpstreamContractViolationException(URL, ['x']),
      ],
      ['programming error', () => new TypeError('bug')],
    ])('does not count a %s as an outage', async (_label, error) => {
      const subject = executor(noRetry);

      await failTimes(subject, 'PVOG', 5, error);

      expect(subject.circuitState('PVOG')).toBe('CLOSED');
    });

    it.each([
      ['timeout', () => new UpstreamTimeoutException(URL, 10_000)],
      ['HTTP 500', () => http(500)],
      ['HTTP 503', () => http(503)],
      ['network failure', network],
    ])('counts a %s as an outage', async (_label, error) => {
      const subject = executor(noRetry);

      await failTimes(subject, 'PVOG', 3, error);

      expect(subject.circuitState('PVOG')).toBe('OPEN');
    });

    it('lets one probe through after the reset timeout and closes on its success', async () => {
      const subject = executor(noRetry);
      await failTimes(subject, 'PVOG', 3);
      await sleep(40);

      expect(subject.circuitState('PVOG')).toBe('HALF_OPEN');
      await expect(
        subject.execute('PVOG', URL, () => Promise.resolve('ok')),
      ).resolves.toBe('ok');
      expect(subject.circuitState('PVOG')).toBe('CLOSED');
      expect(logs()).toEqual([
        expect.stringContaining('PVOG circuit HALF_OPEN'),
        expect.stringContaining('PVOG circuit CLOSED'),
      ]);
    });

    it('reopens when the probe fails', async () => {
      const subject = executor(noRetry);
      await failTimes(subject, 'PVOG', 3);
      await sleep(40);
      await failTimes(subject, 'PVOG', 1);

      expect(subject.circuitState('PVOG')).toBe('OPEN');
      await expect(
        subject.execute('PVOG', URL, () => Promise.resolve('ok')),
      ).rejects.toBeInstanceOf(UpstreamCircuitOpenException);
    });

    it('rejects further calls while the probe is in flight', async () => {
      const subject = executor(noRetry);
      await failTimes(subject, 'PVOG', 3);
      await sleep(40);
      let finishProbe: (value: string) => void = () => undefined;
      const probe = subject.execute(
        'PVOG',
        URL,
        () => new Promise<string>((resolve) => (finishProbe = resolve)),
      );

      await expect(
        subject.execute('PVOG', URL, () => Promise.resolve('ok')),
      ).rejects.toBeInstanceOf(UpstreamCircuitOpenException);

      finishProbe('ok');
      await expect(probe).resolves.toBe('ok');
      expect(subject.circuitState('PVOG')).toBe('CLOSED');
    });

    it('isolates the providers', async () => {
      const subject = executor(noRetry);
      await failTimes(subject, 'PVOG', 3);

      await expect(
        subject.execute('FIM', URL, () => Promise.resolve('fim')),
      ).resolves.toBe('fim');
      expect(subject.circuitState('FIM')).toBe('CLOSED');
      expect(subject.circuitState('PVOG')).toBe('OPEN');
    });
  });

  it('rejects invalid options at construction', () => {
    expect(() => executor({ requestBudgetMs: 0 })).toThrow();
    expect(() =>
      executor({
        retry: { maxRetries: Number.NaN, baseDelayMs: 1, maxDelayMs: 1 },
      }),
    ).toThrow();
    expect(() =>
      executor({
        circuitBreaker: {
          errorThresholdPercentage: 50,
          volumeThreshold: 1.5,
          rollingWindowMs: 10_000,
          resetTimeoutMs: 1_000,
        },
      }),
    ).toThrow();
  });
});
