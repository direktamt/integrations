import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ContractDriftVerifier, FetchFunction } from './ContractDriftVerifier';
import { DriftClass } from './DriftClass';
import { ProbeKind, UpstreamProbe } from './UpstreamProbe';

class WireThing {
  @Expose()
  @IsString()
  id!: string;

  @Expose({ name: 'weight' })
  @IsOptional()
  @IsString()
  relevance?: string;
}

class WirePage {
  @Expose()
  @IsString()
  nextPageToken!: string;

  @Expose()
  @IsOptional()
  hits?: unknown;
}

const PROBE: UpstreamProbe = {
  provider: 'PVOG',
  endpoint: 'GET /v3/things/{id}',
  handbookSection: '1.0',
  url: 'https://upstream.test/api/v3/things/1?q=secret',
  kind: ProbeKind.Wire,
  wireModel: WireThing,
};

const PAGED_PROBE: UpstreamProbe = {
  provider: 'PVOG',
  endpoint: 'GET /v1beta2/pages',
  handbookSection: '1.6',
  url: 'https://upstream.test/api/v1beta2/pages?ars=1',
  kind: ProbeKind.Wire,
  wireModel: WirePage,
  pagination: {
    tokenField: 'nextPageToken',
    tokenParameter: 'nextPageToken',
    maxPages: 5,
  },
};

const RAW_PROBE: UpstreamProbe = {
  provider: 'FIM',
  endpoint: 'GET /v0/parsed',
  handbookSection: '2.2',
  url: 'https://fim.test/api/v0/parsed',
  kind: ProbeKind.Raw,
  instability: 'declared unstable by the operator',
};

function response(
  body: string,
  status = 200,
  headers: Record<string, string> = { 'content-type': 'application/json' },
): Response {
  return new Response(body, { status, headers });
}

function json(body: unknown, headers?: Record<string, string>): Response {
  return response(JSON.stringify(body), 200, {
    'content-type': 'application/json',
    ...headers,
  });
}

function verifierWith(fetch: FetchFunction) {
  return new ContractDriftVerifier({
    fetch,
    maxAttempts: 3,
    retryDelayMs: 0,
    timeoutMs: 50,
  });
}

describe('ContractDriftVerifier', () => {
  it('reports a valid wire response without findings', async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<FetchFunction>>(() =>
      Promise.resolve(json({ id: 'a', weight: '1' })),
    );

    const finding = await verifierWith(fetch).verify(PROBE);

    expect(finding).toMatchObject({
      provider: 'PVOG',
      endpoint: 'GET /v3/things/{id}',
      url: 'https://upstream.test/api/v3/things/1',
      status: 200,
      contract: 'valid',
      deprecated: false,
      driftClass: null,
      messages: [],
      attempts: 1,
    });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      redirect: 'manual',
      headers: { Accept: 'application/json' },
    });
  });

  it('classifies a missing required field as breaking', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(json({ weight: '1' })),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.Breaking);
    expect(finding.contract).toBe('violated');
    expect(finding.messages).toEqual([
      'wire contract: id: id must be a string',
    ]);
  });

  it('classifies a wrong type as breaking', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(json({ id: 'a', weight: 1.5 })),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.Breaking);
    expect(finding.messages[0]).toContain(
      'relevance: relevance must be a string',
    );
  });

  it('classifies an undeclared field as additive', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(json({ id: 'a', brandNew: true })),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.Additive);
    expect(finding.contract).toBe('valid');
    expect(finding.messages).toEqual(['undeclared fields: brandNew']);
  });

  it('ignores undeclared fields the probe lists as known', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(json({ id: 'a', teaser: 'known', brandNew: true })),
    ).verify({ ...PROBE, knownUndeclaredFields: ['teaser'] });

    expect(finding.driftClass).toBe(DriftClass.Additive);
    expect(finding.messages).toEqual(['undeclared fields: brandNew']);
  });

  it('classifies a deprecation header as deprecated even when the body is valid', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(json({ id: 'a' }, { 'x-pvog-deprecated': 'true' })),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.Deprecated);
    expect(finding.deprecated).toBe(true);
    expect(finding.contract).toBe('valid');
  });

  it('keeps breaking above deprecated and additive', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(json({ brandNew: 1 }, { 'x-pvog-deprecated': 'true' })),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.Breaking);
    expect(finding.deprecated).toBe(true);
    expect(finding.messages).toEqual([
      'wire contract: id: id must be a string',
      'undeclared fields: brandNew',
      'upstream sent X-Pvog-Deprecated: true',
    ]);
  });

  it('classifies invalid JSON and a non-JSON content type as breaking', async () => {
    const notJson = await verifierWith(() =>
      Promise.resolve(response('{"id": ', 200)),
    ).verify(PROBE);
    const html = await verifierWith(() =>
      Promise.resolve(response('<html>', 200, { 'content-type': 'text/html' })),
    ).verify(PROBE);

    expect(notJson.driftClass).toBe(DriftClass.Breaking);
    expect(notJson.messages).toEqual(['body is not valid JSON']);
    expect(html.driftClass).toBe(DriftClass.Breaking);
    expect(html.messages).toEqual([
      'content type is text/html, expected application/json',
    ]);
  });

  it('classifies a 4xx on the reference request as breaking', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(response('{"code":"NOT_FOUND"}', 404)),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.Breaking);
    expect(finding.status).toBe(404);
    expect(finding.messages).toEqual(['reference request answered HTTP 404']);
  });

  it('classifies a redirect as breaking and names only the target origin', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(
        response('', 301, {
          location: 'https://moved.test/api/v9/things/1?x=1',
        }),
      ),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.Breaking);
    expect(finding.messages).toEqual([
      'unexpected redirect (HTTP 301) to https://moved.test',
    ]);
  });

  it('retries a transport failure and then reports an infrastructure failure', async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<FetchFunction>>(() =>
      Promise.reject(new TypeError('fetch failed')),
    );

    const finding = await verifierWith(fetch).verify(PROBE);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(finding.status).toBeUndefined();
    expect(finding).toMatchObject({
      contract: 'unavailable',
      driftClass: DriftClass.InfrastructureFailure,
      attempts: 3,
    });
    expect(finding.messages[0]).toBe(
      'transport failure: TypeError on 3 attempt(s); inconclusive, not contract drift',
    );
  });

  it('retries a 5xx and succeeds when the upstream recovers', async () => {
    let calls = 0;
    const finding = await verifierWith(() =>
      Promise.resolve(++calls < 3 ? response('down', 503) : json({ id: 'a' })),
    ).verify(PROBE);

    expect(calls).toBe(3);
    expect(finding.driftClass).toBeNull();
    expect(finding.attempts).toBe(3);
  });

  it('reports a persistent 5xx as an infrastructure failure, not as drift', async () => {
    const finding = await verifierWith(() =>
      Promise.resolve(response('down', 503)),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.InfrastructureFailure);
    expect(finding.messages[0]).toContain('upstream answered HTTP 503');
  });

  it('reports a timeout as an infrastructure failure', async () => {
    const finding = await verifierWith(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        ),
    ).verify(PROBE);

    expect(finding.driftClass).toBe(DriftClass.InfrastructureFailure);
    expect(finding.messages[0]).toContain('no response within 50 ms');
  });

  it('checks a raw endpoint for status and JSON only and repeats the instability note', async () => {
    const ok = await verifierWith(() =>
      Promise.resolve(json({ any: { shape: [1, null] } })),
    ).verify(RAW_PROBE);
    const broken = await verifierWith(() =>
      Promise.resolve(response('nope', 200)),
    ).verify(RAW_PROBE);

    expect(ok).toMatchObject({
      contract: 'not-validated',
      driftClass: null,
      messages: [
        'raw pass-through; upstream: declared unstable by the operator',
      ],
    });
    expect(broken.driftClass).toBe(DriftClass.Breaking);
    expect(broken.messages).toEqual(['body is not valid JSON']);
  });

  describe('pagination', () => {
    const page = (token: string) => json({ nextPageToken: token, hits: 1 });

    it('follows the cursor until the empty final page', async () => {
      const fetch = jest.fn<Promise<Response>, Parameters<FetchFunction>>(
        (url) => {
          const token = new URL(url).searchParams.get('nextPageToken');

          return Promise.resolve(
            token === null
              ? page('t1')
              : token === 't1'
                ? page('t2')
                : page(''),
          );
        },
      );

      const finding = await verifierWith(fetch).verify(PAGED_PROBE);

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(new URL(fetch.mock.calls[1][0]).searchParams.get('ars')).toBe('1');
      expect(finding.driftClass).toBeNull();
      expect(finding.messages).toEqual([
        'pagination: cursor usable, 3 page(s) followed, terminated with an empty cursor',
      ]);
    });

    it('reports a single page without a cursor as terminated', async () => {
      const finding = await verifierWith(() =>
        Promise.resolve(page('')),
      ).verify(PAGED_PROBE);

      expect(finding.driftClass).toBeNull();
      expect(finding.messages[0]).toContain('cursor not exercised');
    });

    it('detects a repeated cursor as breaking', async () => {
      const finding = await verifierWith(() =>
        Promise.resolve(page('same')),
      ).verify(PAGED_PROBE);

      expect(finding.driftClass).toBe(DriftClass.Breaking);
      expect(finding.contract).toBe('violated');
      expect(finding.messages[0]).toContain('cursor repeated after 2 page(s)');
    });

    it('stops at the page cap without a finding', async () => {
      let n = 0;
      const finding = await verifierWith(() =>
        Promise.resolve(page(`t${++n}`)),
      ).verify({
        ...PAGED_PROBE,
        pagination: { ...PAGED_PROBE.pagination!, maxPages: 2 },
      });

      expect(finding.driftClass).toBeNull();
      expect(finding.messages[0]).toContain('stopped at the probe cap of 2');
    });

    it('treats a missing cursor field as breaking', async () => {
      const finding = await verifierWith(() =>
        Promise.resolve(json({ nextPageToken: 5 })),
      ).verify(PAGED_PROBE);

      expect(finding.driftClass).toBe(DriftClass.Breaking);
    });
  });
});
