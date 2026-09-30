import { Logger } from '@nestjs/common';
import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { FetchStub } from '../../../test/FetchStub';
import { BaseHttpClient, QueryParams } from './BaseHttpClient';
import { UpstreamContractViolationException } from './exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from './exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from './exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from './exceptions/UpstreamTimeoutException';

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
  protected readonly timeoutMs = 30;

  item(path: string, params?: QueryParams): Promise<WireItem> {
    return this.getModel(WireItem, path, params);
  }

  items(path: string, params?: QueryParams): Promise<WireItem[]> {
    return this.getModelArray(WireItem, path, params);
  }

  raw<T>(path: string, params?: QueryParams): Promise<T> {
    return this.getRawJson<T>(path, params);
  }
}

describe('BaseHttpClient', () => {
  const fetchStub = new FetchStub();
  const client = new TestClient();
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

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
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
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

    it('maps a rejected fetch to UpstreamNetworkException', async () => {
      const cause = new TypeError('fetch failed');
      fetchStub.respondWith(() => Promise.reject(cause));

      const error = await client.item('/thing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamNetworkException);
      expect((error as UpstreamNetworkException).cause).toBe(cause);
    });

    it('aborts after the configured timeout with UpstreamTimeoutException', async () => {
      fetchStub.respondNever();

      const error = await client.item('/thing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamTimeoutException);
      expect((error as UpstreamTimeoutException).timeoutMs).toBe(30);
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
