import { Logger } from '@nestjs/common';
import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { FetchStub } from '../../../test/FetchStub';
import { testUpstreamRequestExecutor } from '../../../test/UpstreamTestSupport';
import {
  BaseHttpClient,
  QueryParams,
  UpstreamReadOptions,
} from './BaseHttpClient';
import { IntegrationCache } from './cache/IntegrationCache';
import { LruIntegrationCache } from './cache/LruIntegrationCache';
import { NoopIntegrationCache } from './cache/NoopIntegrationCache';
import { UpstreamContractViolationException } from './exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from './exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from './exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from './exceptions/UpstreamTimeoutException';
import { UpstreamRequestExecutor } from './resilience/UpstreamRequestExecutor';
import { UpstreamProvider } from './UpstreamProvider';

class WireItem {
  @Expose()
  @IsString()
  name!: string;

  @Expose({ name: 'weight' })
  @IsNumber()
  relevance!: number;
}

class TestClient extends BaseHttpClient {
  protected readonly baseUrl = 'https://upstream.test/api';
  protected readonly provider: UpstreamProvider = 'PVOG';
  protected readonly cacheTtlMs = 60_000;

  constructor(executor: UpstreamRequestExecutor, cache: IntegrationCache) {
    super(executor, cache);
  }

  item(
    path: string,
    params?: QueryParams,
    options?: UpstreamReadOptions,
  ): Promise<WireItem> {
    return this.getModel(WireItem, path, params, options);
  }

  items(
    path: string,
    params?: QueryParams,
    options?: UpstreamReadOptions,
  ): Promise<WireItem[]> {
    return this.getModelArray(WireItem, path, params, options);
  }

  raw<T>(
    path: string,
    params?: QueryParams,
    options?: UpstreamReadOptions,
  ): Promise<T> {
    return this.getRawJson<T>(path, params, options);
  }
}

function json(body: unknown, status = 200, headers = {}): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );
}

describe('BaseHttpClient', () => {
  const fetchStub = new FetchStub();
  const client = new TestClient(
    testUpstreamRequestExecutor({ requestBudgetMs: 30 }),
    new NoopIntegrationCache(),
  );
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeAll(() => {
    fetchStub.install();
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    debugSpy = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
  });

  describe('request building', () => {
    it('appends scalar query parameters and asks for JSON', async () => {
      fetchStub.respondWithJson([]);

      await client.items('/things', { q: 'Köln', size: 5, fuzzy: true });

      const url = fetchStub.lastUrl();
      expect(url.origin + url.pathname).toBe(
        'https://upstream.test/api/things',
      );
      expect(url.searchParams.get('q')).toBe('Köln');
      expect(url.searchParams.get('size')).toBe('5');
      expect(url.searchParams.get('fuzzy')).toBe('true');

      const headers = fetchStub.calls[0].init?.headers as Record<
        string,
        string
      >;
      expect(headers.Accept).toBe('application/json');
    });

    it('repeats array query parameters once per item', async () => {
      fetchStub.respondWithJson([]);

      await client.items('/things', { ids: ['a', 'b'] });

      expect(fetchStub.lastUrl().searchParams.getAll('ids')).toEqual([
        'a',
        'b',
      ]);
    });

    it('omits undefined query parameters', async () => {
      fetchStub.respondWithJson([]);

      await client.items('/things', { q: 'x', skip: undefined });

      expect(fetchStub.lastUrl().search).toBe('?q=x');
    });
  });

  describe('successful responses', () => {
    it('maps a JSON object onto the wire model and drops extraneous fields', async () => {
      fetchStub.respondWithJson({
        name: 'Köln',
        weight: 1.5,
        extra: 'ignored',
      });

      const item = await client.item('/thing');

      expect(item).toBeInstanceOf(WireItem);
      expect(item).toEqual({ name: 'Köln', relevance: 1.5 });
    });

    it('maps every element of a JSON array', async () => {
      fetchStub.respondWithJson([
        { name: 'a', weight: 1 },
        { name: 'b', weight: 2 },
      ]);

      const items = await client.items('/things');

      expect(items).toEqual([
        { name: 'a', relevance: 1 },
        { name: 'b', relevance: 2 },
      ]);
    });

    it('returns raw JSON untouched', async () => {
      fetchStub.respondWithJson({ anything: [1, 2, 3] });

      await expect(client.raw('/dynamic')).resolves.toEqual({
        anything: [1, 2, 3],
      });
    });
  });

  describe('contract violations', () => {
    it('rejects an array where an object is expected', async () => {
      fetchStub.respondWithJson([]);

      await expect(client.item('/thing')).rejects.toBeInstanceOf(
        UpstreamContractViolationException,
      );
    });

    it('rejects an object where an array is expected', async () => {
      fetchStub.respondWithJson({});

      await expect(client.items('/things')).rejects.toBeInstanceOf(
        UpstreamContractViolationException,
      );
    });

    it('reports wire validation failures with the offending field', async () => {
      fetchStub.respondWithJson([{ name: 1, weight: 'heavy' }]);

      const error = await client.items('/things').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamContractViolationException);
      const violations = (error as UpstreamContractViolationException)
        .violations;
      expect(violations.some((v) => v.startsWith('[0].name'))).toBe(true);
      expect(violations.some((v) => v.startsWith('[0].relevance'))).toBe(true);
    });

    it('rejects a body that is not JSON', async () => {
      fetchStub.respondWithText('<html>maintenance</html>');

      await expect(client.item('/thing')).rejects.toBeInstanceOf(
        UpstreamContractViolationException,
      );
    });
  });

  describe('transport failures', () => {
    it('maps a non-2xx status to UpstreamHttpException', async () => {
      fetchStub.respondWithText('service unavailable', 503);

      const error = await client.item('/thing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamHttpException);
      expect((error as UpstreamHttpException).status).toBe(503);
      expect((error as UpstreamHttpException).bodySnippet).toBe(
        'service unavailable',
      );
    });

    it('parses a Retry-After header into the exception', async () => {
      fetchStub.respondWith(() =>
        json({ code: 'BUSY' }, 429, { 'retry-after': '3' }),
      );

      const error = await client.item('/thing').catch((e: unknown) => e);

      expect((error as UpstreamHttpException).retryAfterMs).toBe(3_000);
    });

    it('maps a rejected fetch to UpstreamNetworkException', async () => {
      const cause = new TypeError('fetch failed');
      fetchStub.respondWith(() => Promise.reject(cause));

      const error = await client.item('/thing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamNetworkException);
      expect((error as UpstreamNetworkException).cause).toBe(cause);
    });

    it('aborts after the request budget with UpstreamTimeoutException', async () => {
      fetchStub.respondNever();

      const error = await client.item('/thing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamTimeoutException);
      expect((error as UpstreamTimeoutException).timeoutMs).toBe(30);
      expect(fetchStub.calls).toHaveLength(1);
    });
  });

  describe('retries', () => {
    const retrying = new TestClient(
      testUpstreamRequestExecutor({
        requestBudgetMs: 10_000,
        retry: { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10 },
      }),
      new NoopIntegrationCache(),
    );

    /**
     * Answers the configured responses in order; the last one repeats.
     */
    function respondInSequence(...responses: (() => Promise<Response>)[]) {
      let index = 0;

      fetchStub.respondWith(() => {
        const next = responses[Math.min(index, responses.length - 1)];
        index += 1;

        return next();
      });
    }

    const warnings = (): string =>
      (warnSpy.mock.calls as unknown[][])
        .map((call) => String(call[0]))
        .join('\n');

    it('retries a 503 and returns the later success', async () => {
      respondInSequence(
        () => json({ code: 'DOWN' }, 503),
        () => json({ name: 'a', weight: 1 }),
      );

      await expect(retrying.item('/thing')).resolves.toEqual({
        name: 'a',
        relevance: 1,
      });
      expect(fetchStub.calls).toHaveLength(2);
      expect(warnings()).toContain('PVOG retry 2/3');
    });

    it('retries a network failure until the configured attempts are used', async () => {
      respondInSequence(
        () => Promise.reject(new TypeError('fetch failed')),
        () => Promise.reject(new TypeError('fetch failed')),
        () => json({ name: 'a', weight: 1 }),
      );

      await expect(retrying.item('/thing')).resolves.toBeInstanceOf(WireItem);
      expect(fetchStub.calls).toHaveLength(3);
    });

    it('waits for Retry-After on a 429', async () => {
      respondInSequence(
        () => json({ code: 'BUSY' }, 429, { 'retry-after': '0' }),
        () => json({ name: 'a', weight: 1 }),
      );

      await expect(retrying.item('/thing')).resolves.toBeInstanceOf(WireItem);
      expect(warnings()).toContain('retry 2/3 in 0 ms after HTTP 429');
    });

    it.each([400, 404, 500])('does not retry HTTP %i', async (status) => {
      respondInSequence(() => json({ code: 'NO' }, status));

      await expect(retrying.item('/thing')).rejects.toMatchObject({ status });
      expect(fetchStub.calls).toHaveLength(1);
    });

    it('does not retry a contract violation', async () => {
      respondInSequence(() => json({ name: 1 }));

      await expect(retrying.item('/thing')).rejects.toBeInstanceOf(
        UpstreamContractViolationException,
      );
      expect(fetchStub.calls).toHaveLength(1);
    });

    it('does not retry an unparseable body', async () => {
      fetchStub.respondWithText('<html>maintenance</html>');

      await expect(retrying.item('/thing')).rejects.toBeInstanceOf(
        UpstreamContractViolationException,
      );
      expect(fetchStub.calls).toHaveLength(1);
    });

    it('gives up after the configured retries with the last error', async () => {
      respondInSequence(() => json({ code: 'DOWN' }, 503));

      const error = await retrying.item('/thing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamHttpException);
      expect((error as UpstreamHttpException).status).toBe(503);
      expect(fetchStub.calls).toHaveLength(3);
      expect(warnings()).toContain('failed after 3 attempt(s)');
    });

    it('never puts query values into retry log lines', async () => {
      respondInSequence(() => json({ code: 'DOWN' }, 503));

      await retrying
        .item('/thing', { plz: '50667', q: 'sensitive input' })
        .catch(() => undefined);

      expect(warnings()).toContain('retry 2/3');
      expect(warnings()).toContain('https://upstream.test/api/thing');
      expect(warnings()).not.toContain('50667');
      expect(warnings()).not.toContain('sensitive');
    });
  });

  describe('cache', () => {
    let cache: LruIntegrationCache;
    let cached: TestClient;

    beforeEach(() => {
      cache = new LruIntegrationCache(10);
      cached = new TestClient(testUpstreamRequestExecutor(), cache);
    });

    it('serves a repeated cacheable read without a second request', async () => {
      fetchStub.respondWithJson({ name: 'a', weight: 1 });

      const first = await cached.item(
        '/thing',
        { id: '1' },
        { cacheable: true },
      );
      const second = await cached.item(
        '/thing',
        { id: '1' },
        { cacheable: true },
      );

      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(fetchStub.calls).toHaveLength(1);
    });

    it('never hands out a reference held by the cache', async () => {
      fetchStub.respondWithJson({ name: 'a', weight: 1, list: [1, 2, 3] });

      const item = await cached.item('/thing', undefined, { cacheable: true });
      item.name = 'changed';
      const raw = await cached.raw<{ list: number[] }>('/thing', undefined, {
        cacheable: true,
      });
      raw.list.push(4);

      await expect(
        cached.item('/thing', undefined, { cacheable: true }),
      ).resolves.toEqual({ name: 'a', relevance: 1 });
      await expect(
        cached.raw<{ list: number[] }>('/thing', undefined, {
          cacheable: true,
        }),
      ).resolves.toMatchObject({ list: [1, 2, 3] });
      expect(fetchStub.calls).toHaveLength(2);
    });

    it('keys the cache by the full request, so other parameters miss', async () => {
      fetchStub.respondWithJson({ name: 'a', weight: 1 });

      await cached.item('/thing', { id: '1' }, { cacheable: true });
      await cached.item('/thing', { id: '2' }, { cacheable: true });

      expect(fetchStub.calls).toHaveLength(2);
    });

    it('separates representations of the same URL', async () => {
      fetchStub.respondWithJson({ name: 'a', weight: 1 });

      await cached.item('/thing', undefined, { cacheable: true });
      await cached.raw('/thing', undefined, { cacheable: true });

      expect(fetchStub.calls).toHaveLength(2);
      expect(cache.size).toBe(2);
    });

    it('does not cache reads that did not opt in', async () => {
      fetchStub.respondWithJson({ name: 'a', weight: 1 });

      await cached.item('/thing');
      await cached.item('/thing');

      expect(fetchStub.calls).toHaveLength(2);
      expect(cache.size).toBe(0);
    });

    it.each([
      ['an error status', () => json({ code: 'DOWN' }, 503)],
      ['a contract violation', () => json({ name: 1 })],
      ['a network failure', () => Promise.reject(new TypeError('down'))],
    ])('does not cache %s', async (_label, failure) => {
      let calls = 0;
      fetchStub.respondWith(() =>
        (calls += 1) === 1 ? failure() : json({ name: 'a', weight: 1 }),
      );

      await cached
        .item('/thing', undefined, { cacheable: true })
        .catch(() => undefined);

      expect(cache.size).toBe(0);
      await expect(
        cached.item('/thing', undefined, { cacheable: true }),
      ).resolves.toBeInstanceOf(WireItem);
      expect(fetchStub.calls).toHaveLength(2);
    });

    it('requests every time when the cache is disabled', async () => {
      const disabled = new TestClient(
        testUpstreamRequestExecutor(),
        new NoopIntegrationCache(),
      );
      fetchStub.respondWithJson({ name: 'a', weight: 1 });

      await disabled.item('/thing', undefined, { cacheable: true });
      await disabled.item('/thing', undefined, { cacheable: true });

      expect(fetchStub.calls).toHaveLength(2);
    });

    it('logs hits and misses with the sanitized URL only', async () => {
      fetchStub.respondWithJson({ name: 'a', weight: 1 });

      await cached.item('/thing', { plz: '50667' }, { cacheable: true });
      await cached.item('/thing', { plz: '50667' }, { cacheable: true });

      const logged = debugSpy.mock.calls.map((call: unknown[]) =>
        String(call[0]),
      );
      expect(logged).toEqual([
        'Cache miss for PVOG: https://upstream.test/api/thing',
        'Cache hit for PVOG: https://upstream.test/api/thing',
      ]);
    });
  });

  describe('logging hygiene', () => {
    it('never puts query values into exceptions or log lines', async () => {
      fetchStub.respondWithText('nope', 500);

      let error: UpstreamHttpException | undefined;

      try {
        await client.item('/thing', { plz: '50667', q: 'sensitive input' });
      } catch (e) {
        error = e as UpstreamHttpException;
      }

      expect(error).toBeInstanceOf(UpstreamHttpException);
      expect(error?.url).toBe('https://upstream.test/api/thing');
      expect(error?.message).not.toContain('50667');
      expect(error?.message).not.toContain('sensitive');

      const logged = warnSpy.mock.calls
        .map((call: unknown[]) => String(call[0]))
        .join('\n');
      expect(logged).toContain('https://upstream.test/api/thing');
      expect(logged).not.toContain('50667');
      expect(logged).not.toContain('sensitive');
    });
  });
});
