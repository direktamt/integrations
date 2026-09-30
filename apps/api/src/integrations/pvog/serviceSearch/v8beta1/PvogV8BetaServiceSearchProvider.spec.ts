import { Logger } from '@nestjs/common';
import { FetchStub } from '../../../../../test/FetchStub';
import { UpstreamContractViolationException } from '../../../common/exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../../../common/exceptions/UpstreamHttpException';
import { PvogSearchClient } from '../../PvogSearchClient';
import { PvogV8BetaServiceSearchProvider } from './PvogV8BetaServiceSearchProvider';

/**
 * Synthetic v8beta1 hits (reduced view) and the matching detail responses
 * the adapter loads for them. Values are invented.
 */
const SEARCH_PATH = '/suchdienst/api/v8beta1/servicedescriptions';
const detailPath = (id: string) =>
  `/suchdienst/api/v6/servicedescriptions/${id}/detail`;

const hit = (id: string, name: string) => ({
  id,
  name,
  teaser: 'Kurzer Vorschautext',
  arsFederalstate: ['05'],
  languageComplete: { en: false },
  onlineServiceLinks: [],
  availableLanguages: ['de', 'en'],
});

const detail = (id: string, name: string) => ({
  id,
  name,
  leikakeys: ['99115005104000'],
  ars: ['053150000000'],
  availableLanguages: ['de', 'en'],
  details: [
    {
      '@type': '_module',
      code: '14',
      title: 'Erforderliche Unterlagen',
      text: '<p>Personalausweis</p>',
      links: [],
    },
  ],
  organisations: [],
});

const page = (hits: unknown[], totalElements = hits.length) => ({
  serviceDescriptions: {
    content: hits,
    page: {
      size: 10,
      number: 0,
      totalElements,
      totalPages: Math.ceil(totalElements / 10),
    },
  },
  facades: { personalMatters: [] },
});

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

const OPTIONS = {
  size: 10,
  page: 0,
  fuzzySearch: false,
  useRegionalHierarchy: false,
  lifeSituationCodes: ['1010000'],
  validDate: '2026-09-30',
};

describe('PvogV8BetaServiceSearchProvider', () => {
  const fetchStub = new FetchStub();
  const provider = new PvogV8BetaServiceSearchProvider(new PvogSearchClient());

  function serve(searchBody: unknown, detailsById: Record<string, unknown>) {
    fetchStub.respondWith((url) => {
      const { pathname } = new URL(url);

      if (pathname === SEARCH_PATH) return json(searchBody);
      const found = Object.entries(detailsById).find(
        ([id]) => pathname === detailPath(id),
      );

      return found ? json(found[1]) : json({ code: 'NOT_FOUND' }, 404);
    });
  }

  beforeAll(() => {
    fetchStub.install();
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes every hit through the detail endpoint', async () => {
    serve(
      page([
        hit('L100002.LB.1', 'Wohnsitz anmelden'),
        hit('L100002.LB.2', 'Heirat'),
      ]),
      {
        'L100002.LB.1': detail('L100002.LB.1', 'Wohnsitz anmelden'),
        'L100002.LB.2': detail('L100002.LB.2', 'Heirat'),
      },
    );

    const result = await provider.searchServices(
      '053150000000',
      'Wohnsitz',
      OPTIONS,
    );

    const paths = fetchStub.calls.map((call) => new URL(call.url).pathname);
    expect(paths[0]).toBe(SEARCH_PATH);
    expect(paths.slice(1).sort()).toEqual(
      [detailPath('L100002.LB.1'), detailPath('L100002.LB.2')].sort(),
    );
    const search = new URL(fetchStub.calls[0].url).searchParams;
    expect(search.get('ars')).toBe('053150000000');
    expect(search.getAll('q')).toEqual(['Wohnsitz']);
    expect(search.get('size')).toBe('10');
    expect(search.get('page')).toBe('0');
    expect(search.get('useArsHierarchy')).toBe('false');
    expect(search.getAll('personalMatters')).toEqual(['1010000']);
    expect(search.has('fuzzysearch')).toBe(false);
    expect(search.has('validDate')).toBe(false);
    const detailParams = new URL(fetchStub.calls[1].url).searchParams;
    expect(detailParams.get('ars')).toBe('053150000000');
    expect(detailParams.get('useArsHierarchy')).toBe('false');

    expect(result.totalElements).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.services.map((service) => service.id)).toEqual([
      'L100002.LB.1',
      'L100002.LB.2',
    ]);
    expect(result.services[0]).toEqual({
      id: 'L100002.LB.1',
      serviceCatalogKeys: ['99115005104000'],
      title: 'Wohnsitz anmelden',
      summary: undefined,
      regionalKeys: ['053150000000'],
      federalStateKeys: ['05'],
      targetAudiences: [],
      availableLanguages: ['de', 'en'],
      sections: [
        {
          type: 'REQUIRED_DOCUMENTS',
          originalTitle: 'Erforderliche Unterlagen',
          htmlText: '<p>Personalausweis</p>',
          links: [],
        },
      ],
    });
  });

  it('reads the totals from the separate page object', async () => {
    serve(page([hit('L100002.LB.1', 'A')], 23), {
      'L100002.LB.1': detail('L100002.LB.1', 'A'),
    });

    const result = await provider.searchServices('053150000000', 'A', OPTIONS);

    expect(result.totalElements).toBe(23);
    expect(result.totalPages).toBe(3);
  });

  it('answers an empty page without detail calls', async () => {
    serve(page([]), {});

    await expect(
      provider.searchServices('053150000000', 'xyz', OPTIONS),
    ).resolves.toEqual({ services: [], totalElements: 0, totalPages: 0 });
    expect(fetchStub.calls).toHaveLength(1);
  });

  it('keeps at most eight detail requests in flight', async () => {
    const hits = Array.from({ length: 30 }, (_, i) =>
      hit(`L100002.LB.${i}`, `Service ${i}`),
    );
    let inFlight = 0;
    let peak = 0;
    fetchStub.respondWith((url) => {
      const { pathname } = new URL(url);

      if (pathname === SEARCH_PATH) return json(page(hits));
      inFlight++;
      peak = Math.max(peak, inFlight);
      const id = decodeURIComponent(pathname.split('/')[5]);

      return new Promise((resolve) =>
        setTimeout(() => {
          inFlight--;
          resolve(
            new Response(JSON.stringify(detail(id, `Service ${id}`)), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          );
        }, 2),
      );
    });

    const result = await provider.searchServices('053150000000', 'S', OPTIONS);

    expect(result.services).toHaveLength(30);
    expect(result.services.map((s) => s.id)).toEqual(hits.map((h) => h.id));
    expect(peak).toBeLessThanOrEqual(8);
    expect(peak).toBeGreaterThan(1);
  });

  it('treats a hit without a detail as a contract violation', async () => {
    serve(page([hit('L100002.LB.gone', 'Weg')]), {});

    await expect(
      provider.searchServices('053150000000', 'Weg', OPTIONS),
    ).rejects.toBeInstanceOf(UpstreamContractViolationException);
  });

  it('passes other detail failures through', async () => {
    fetchStub.respondWith((url) =>
      new URL(url).pathname === SEARCH_PATH
        ? json(page([hit('L100002.LB.1', 'A')]))
        : json({ code: 'INTERNAL' }, 500),
    );

    await expect(
      provider.searchServices('053150000000', 'A', OPTIONS),
    ).rejects.toMatchObject({ status: 500 });
    await expect(
      provider.searchServices('053150000000', 'A', OPTIONS),
    ).rejects.toBeInstanceOf(UpstreamHttpException);
  });

  it.each([
    ['hits that are not a list', { serviceDescriptions: { content: 'nope' } }],
    ['a hit without an id', page([{ name: 'ohne Id' }])],
    ['a top-level list', [page([])]],
  ])('rejects a malformed search contract: %s', async (_label, body) => {
    serve(body, {});

    await expect(
      provider.searchServices('053150000000', 'A', OPTIONS),
    ).rejects.toBeInstanceOf(UpstreamContractViolationException);
    expect(fetchStub.calls).toHaveLength(1);
  });
});
