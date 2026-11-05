import {
  ServiceCatalogKeyMatchType,
  type CatalogEntryService,
  type Location,
  type ServiceContext,
} from '@direktamt/integrations-contracts';
import { DirektAmtApiError } from './DirektAmtApiError.js';
import { DirektAmtClient } from './DirektAmtClient.js';
import type { FetchLike } from './DirektAmtClientOptions.js';

interface RecordedCall {
  url: URL;
  init: Parameters<FetchLike>[1];
}

/**
 * Stub fetch: records every call and answers with the configured response
 * (or rejects when the request was aborted).
 */
function stubFetch(
  respond: (call: RecordedCall) => Response = () => json([]),
): FetchLike & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetch = ((input, init) => {
    const call = { url: new URL(input), init };

    calls.push(call);
    if (init.signal?.aborted) {
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    }

    return Promise.resolve(respond(call));
  }) as FetchLike & { calls: RecordedCall[] };

  fetch.calls = calls;

  return fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const LOCATION: Location = {
  regionalKey: '053140000000',
  federalStateKey: '05',
  name: 'Bonn',
};

describe('DirektAmtClient', () => {
  it('builds the request URL from the base URL, path and query', async () => {
    const fetch = stubFetch(() => json([LOCATION]));
    const client = new DirektAmtClient({
      baseUrl: 'http://localhost:3000/',
      fetch,
    });

    const locations = await client.locations.resolve({ cityName: 'Bonn' });

    expect(locations).toEqual([LOCATION]);
    const [call] = fetch.calls;
    expect(call.url.toString()).toBe(
      'http://localhost:3000/locations?cityName=Bonn',
    );
    expect(call.init.method).toBe('GET');
    expect(call.init.headers).toEqual({ Accept: 'application/json' });
  });

  it('serializes arrays as repeated keys', async () => {
    const fetch = stubFetch(() =>
      json({ services: [], totalElements: 0, totalPages: 0 }),
    );
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    await client.services.search({
      regionalKey: '053140000000',
      query: 'Hund',
      lifeSituationCodes: ['1010000', '1020000'],
    });
    await client.onlineServices.list({
      regionalKey: '053140000000',
      serviceCatalogKeys: ['99115005104000', '99115005104001'],
    });

    expect(
      fetch.calls[0].url.searchParams.getAll('lifeSituationCodes'),
    ).toEqual(['1010000', '1020000']);
    expect(
      fetch.calls[1].url.searchParams.getAll('serviceCatalogKeys'),
    ).toEqual(['99115005104000', '99115005104001']);
  });

  it('sends an explicit false and a zero instead of dropping them', async () => {
    const fetch = stubFetch(() =>
      json({ services: [], totalElements: 0, totalPages: 0 }),
    );
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    await client.services.search({
      regionalKey: '053140000000',
      query: 'Hund',
      page: 0,
      fuzzySearch: false,
      useRegionalHierarchy: false,
    });
    await client.catalog.search({ term: 'Anmeldung', offset: 0, limit: 1 });

    const search = fetch.calls[0].url.searchParams;
    expect(search.get('page')).toBe('0');
    expect(search.get('fuzzySearch')).toBe('false');
    expect(search.get('useRegionalHierarchy')).toBe('false');
    expect(search.has('size')).toBe(false);
    expect(fetch.calls[1].url.search).toBe('?term=Anmeldung&offset=0&limit=1');
  });

  it('encodes path segments and keeps ids out of the query', async () => {
    const fetch = stubFetch(() => json({}));
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    await client.services.get({
      id: 'L100002.LB.1/x?y',
      regionalKey: '053140000000',
    });

    expect(fetch.calls[0].url.pathname).toBe('/services/L100002.LB.1%2Fx%3Fy');
    expect(fetch.calls[0].url.search).toBe('?regionalKey=053140000000');
  });

  it.each([
    [
      'locations.suggest',
      (c: DirektAmtClient) => c.locations.suggest({ query: 'Bo' }),
      '/locations/suggestions',
      'query=Bo',
    ],
    [
      'locations.get',
      (c: DirektAmtClient) => c.locations.get({ regionalKey: '053140000000' }),
      '/locations/053140000000',
      '',
    ],
    [
      'authorities.listForService',
      (c: DirektAmtClient) =>
        c.authorities.listForService({
          id: 'L100002.LB.1',
          regionalKey: '053140000000',
          useRegionalHierarchy: false,
        }),
      '/services/L100002.LB.1/authorities',
      'regionalKey=053140000000&useRegionalHierarchy=false',
    ],
    [
      'authorities.listForOnlineService',
      (c: DirektAmtClient) =>
        c.authorities.listForOnlineService({ id: 'L100002.OD.1' }),
      '/online-services/L100002.OD.1/authorities',
      '',
    ],
    [
      'catalog.get',
      (c: DirektAmtClient) =>
        c.catalog.get({ serviceCatalogKey: '99115005104000' }),
      '/catalog/99115005104000',
      '',
    ],
    [
      'catalog.listServices',
      (c: DirektAmtClient) =>
        c.catalog.listServices({
          serviceCatalogKey: '99115005104000',
          regionalKey: '110000000000',
        }),
      '/catalog/99115005104000/services',
      'regionalKey=110000000000',
    ],
    [
      'masterTexts.get',
      (c: DirektAmtClient) =>
        c.masterTexts.get({
          editorialOfficeId: 'B100019',
          serviceId: '582787',
          source: 'primary',
        }),
      '/master-texts/B100019/582787',
      'source=primary',
    ],
    [
      'raw.pvog.getServiceJzufi',
      (c: DirektAmtClient) =>
        c.raw.pvog.getServiceJzufi({ id: 'L100002.LB.1' }),
      '/raw/pvog/services/L100002.LB.1/jzufi-2-3',
      '',
    ],
    [
      'raw.pvog.getOnlineServiceJzufi',
      (c: DirektAmtClient) =>
        c.raw.pvog.getOnlineServiceJzufi({ id: 'L100002.OD.1' }),
      '/raw/pvog/online-services/L100002.OD.1/jzufi-2-3',
      '',
    ],
  ])('%s calls its endpoint', async (_label, call, path, query) => {
    const fetch = stubFetch(() => json({}));
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    await call(client);

    expect(fetch.calls[0].url.pathname).toBe(path);
    expect(fetch.calls[0].url.searchParams.toString()).toBe(query);
  });

  it('returns the catalog entry services typed with their match type', async () => {
    const entries: CatalogEntryService[] = [
      {
        matchType: ServiceCatalogKeyMatchType.Hierarchy,
        service: {
          id: 'L100108.LB.1',
          serviceCatalogKeys: ['99115005104001'],
          title: 'Wohnsitz - Hauptwohnung anmelden',
          regionalKeys: ['110000000000'],
          availableLanguages: ['de'],
          sections: [],
        },
      },
    ];
    const fetch = stubFetch(() => json(entries));
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    const result = await client.catalog.listServices({
      serviceCatalogKey: '99115005104000',
      regionalKey: '110000000000',
    });

    expect(result[0].matchType).toBe('HIERARCHY');
    expect(result[0].service.serviceCatalogKeys).toEqual(['99115005104001']);
  });

  it('returns the composed service context typed', async () => {
    const context: ServiceContext = {
      service: {
        id: 'L100002.LB.1',
        serviceCatalogKeys: ['99115005104000'],
        title: 'Wohnsitz anmelden',
        regionalKeys: ['053140000000'],
        federalStateKeys: [],
        targetAudiences: [],
        availableLanguages: ['de'],
        sections: [],
      },
      authorities: [],
      onlineServices: [],
      catalogEntries: [],
      masterTexts: [],
      status: { complete: true, unavailableParts: [] },
    };
    const fetch = stubFetch(() => json(context));
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    const result = await client.services.getContext({
      id: 'L100002.LB.1',
      regionalKey: '053140000000',
    });

    expect(fetch.calls[0].url.pathname).toBe('/services/L100002.LB.1/context');
    expect(fetch.calls[0].url.search).toBe('?regionalKey=053140000000');
    expect(result.status.complete).toBe(true);
    expect(result.service.title).toBe('Wohnsitz anmelden');
  });

  it('throws a typed error with the validation details for a 400', async () => {
    const fetch = stubFetch(() =>
      json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: [
            'regionalKey should not be empty',
            'size must not be less than 5',
          ],
        },
        400,
      ),
    );
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    const failure = client.services.search({
      regionalKey: '',
      query: 'x',
      size: 1,
    });

    await expect(failure).rejects.toBeInstanceOf(DirektAmtApiError);
    await expect(failure).rejects.toMatchObject({
      name: 'DirektAmtApiError',
      status: 400,
      code: 'Bad Request',
      details: [
        'regionalKey should not be empty',
        'size must not be less than 5',
      ],
      message: 'regionalKey should not be empty; size must not be less than 5',
    });
  });

  it('throws a typed error for a 404', async () => {
    const fetch = stubFetch(() =>
      json(
        {
          statusCode: 404,
          error: 'UpstreamHttpException',
          message:
            'The requested resource does not exist in the government data source.',
        },
        404,
      ),
    );
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });

    await expect(
      client.locations.get({ regionalKey: '999999999999' }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'UpstreamHttpException',
      details: [
        'The requested resource does not exist in the government data source.',
      ],
      responseBody: { statusCode: 404, error: 'UpstreamHttpException' },
    });
  });

  it('throws a typed error for a 502, also when the body is not JSON', async () => {
    const client = new DirektAmtClient({
      baseUrl: 'http://api.test',
      fetch: stubFetch(() =>
        json(
          {
            statusCode: 502,
            error: 'UpstreamNetworkException',
            message: 'The government data source is currently unavailable.',
          },
          502,
        ),
      ),
    });
    const proxied = new DirektAmtClient({
      baseUrl: 'http://api.test',
      fetch: stubFetch(
        () => new Response('<html>bad gateway</html>', { status: 502 }),
      ),
    });

    await expect(client.catalog.search({ term: 'x' })).rejects.toMatchObject({
      status: 502,
      code: 'UpstreamNetworkException',
    });
    await expect(proxied.catalog.search({ term: 'x' })).rejects.toMatchObject({
      status: 502,
      code: undefined,
      message: 'GET /catalog failed with HTTP 502',
      responseBody: '<html>bad gateway</html>',
    });
  });

  it('throws a typed error for a 2xx body that is not JSON', async () => {
    const client = new DirektAmtClient({
      baseUrl: 'http://api.test',
      fetch: stubFetch(() => new Response('not json', { status: 200 })),
    });

    await expect(
      client.locations.suggest({ query: 'Bo' }),
    ).rejects.toMatchObject({
      status: 200,
      code: 'MALFORMED_RESPONSE',
      responseBody: 'not json',
    });
  });

  it('passes the AbortSignal to fetch and surfaces the abort', async () => {
    const fetch = stubFetch();
    const client = new DirektAmtClient({ baseUrl: 'http://api.test', fetch });
    const controller = new AbortController();

    await client.locations.suggest(
      { query: 'Bo' },
      { signal: controller.signal },
    );
    expect(fetch.calls[0].init.signal).toBe(controller.signal);

    controller.abort();
    await expect(
      client.locations.suggest({ query: 'Bo' }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('uses the custom fetch and merges default and per-request headers', async () => {
    const fetch = stubFetch(() => json([]));
    const client = new DirektAmtClient({
      baseUrl: 'http://api.test',
      fetch,
      headers: { 'X-Correlation-Id': 'abc', Accept: 'application/json' },
    });

    await client.locations.suggest(
      { query: 'Bo' },
      { headers: { 'X-Correlation-Id': 'per-request', 'X-Trace': '1' } },
    );

    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].init.headers).toEqual({
      Accept: 'application/json',
      'X-Correlation-Id': 'per-request',
      'X-Trace': '1',
    });
  });
});
