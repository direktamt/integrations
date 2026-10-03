import type { PublicServiceDescription } from '@direktamt/integrations-contracts';
import { FetchStub } from '../../../../test/FetchStub';
import { testHttpClientDependencies } from '../../../../test/UpstreamTestSupport';
import { PvogSearchClient } from '../PvogSearchClient';
import { PvogV7ServiceSearchProvider } from './v7/PvogV7ServiceSearchProvider';
import { PvogV8BetaServiceSearchProvider } from './v8beta1/PvogV8BetaServiceSearchProvider';

/**
 * Semantic compatibility of the two upstream versions: equivalent upstream
 * fixtures (the same two services as a v7 hit list, and as a v8beta1 hit
 * list plus their detail responses) must map to the same normalized
 * ServiceSearchResult. Values are invented.
 */
const V7_PATH = '/suchdienst/api/v7/servicedescriptions/053150000000';
const V8_PATH = '/suchdienst/api/v8beta1/servicedescriptions';
const detailPath = (id: string) =>
  `/suchdienst/api/v6/servicedescriptions/${id}/detail`;

const SECTIONS = [
  {
    '@type': '_module',
    code: '03',
    title: 'Leistungsbezeichnung',
    text: 'Wohnsitz anmelden',
    links: [],
  },
  {
    '@type': '_module',
    code: '14',
    title: 'Erforderliche Unterlagen',
    text: '<p>Personalausweis</p>',
    links: [{ uri: 'https://example.test/form', title: 'Formular' }],
  },
  { '@type': '_module', code: '99', title: 'Unbekannt', text: '', links: [] },
];

/**
 * Canonical service data; the version-specific fixtures are derived from
 * it so that they are equivalent by construction.
 */
const SERVICES = [
  {
    id: 'L100002.LB.1',
    name: 'Wohnsitz anmelden',
    description: 'Anmeldung einer Wohnung.',
    leikakeys: ['99115005104000'],
    ars: ['053150000000'],
    arsFederalstate: ['05'],
    addressees: ['Bürger'],
    availableLanguages: ['de', 'en'],
    details: SECTIONS,
  },
  {
    id: 'B100019.LB.2',
    name: 'Umzug in einen anderen Mitgliedstaat',
    description: 'Umzug innerhalb der EU.',
    leikakeys: ['99001001000000', '99001001000001'],
    ars: ['000000000000'],
    arsFederalstate: ['00'],
    addressees: ['Bürger', 'Unternehmen'],
    availableLanguages: ['de'],
    details: SECTIONS.slice(0, 1),
  },
];

const V7_RESPONSE = {
  facades: {},
  serviceDescriptions: {
    content: SERVICES.map((service) => ({
      ...service,
      teaser: 'ignored',
      sourcePortals: [],
      synonyms: [],
    })),
    totalElements: 2,
    totalPages: 1,
  },
};

const V8_RESPONSE = {
  serviceDescriptions: {
    content: SERVICES.map((service) => ({
      id: service.id,
      name: service.name,
      teaser: 'ignored',
      arsFederalstate: service.arsFederalstate,
      languageComplete: {},
      onlineServiceLinks: [],
      availableLanguages: service.availableLanguages,
    })),
    page: { size: 10, number: 0, totalElements: 2, totalPages: 1 },
  },
  facades: { personalMatters: [] },
};

/**
 * The detail endpoint publishes no `description` and no `addressees`.
 */
const DETAILS = Object.fromEntries(
  SERVICES.map((service) => [
    service.id,
    {
      id: service.id,
      name: service.name,
      leikakeys: service.leikakeys,
      ars: service.ars,
      availableLanguages: service.availableLanguages,
      details: service.details,
      organisations: [],
    },
  ]),
);

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

/**
 * What v8beta1 cannot deliver even with the detail endpoint; every other
 * field must be identical.
 */
function withDocumentedGaps(
  service: PublicServiceDescription,
): PublicServiceDescription {
  return { ...service, summary: undefined, targetAudiences: undefined };
}

describe('service search compatibility v7 ↔ v8beta1', () => {
  const fetchStub = new FetchStub();
  const v7 = new PvogV7ServiceSearchProvider(...testHttpClientDependencies());
  const v8beta1 = new PvogV8BetaServiceSearchProvider(
    ...testHttpClientDependencies(),
    new PvogSearchClient(...testHttpClientDependencies()),
  );
  const options = {
    size: 10,
    page: 0,
    fuzzySearch: true,
    useRegionalHierarchy: true,
    lifeSituationCodes: ['1010000'],
  };

  beforeAll(() => {
    fetchStub.install();
    fetchStub.respondWith((url) => {
      const { pathname } = new URL(url);

      if (pathname === V7_PATH) return json(V7_RESPONSE);
      if (pathname === V8_PATH) return json(V8_RESPONSE);
      const found = Object.entries(DETAILS).find(
        ([id]) => pathname === detailPath(id),
      );

      return found ? json(found[1]) : json({ code: 'NOT_FOUND' }, 404);
    });
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
  });

  it('maps equivalent upstream fixtures to the same normalized result', async () => {
    const [fromV7, fromV8] = await Promise.all([
      v7.searchServices('053150000000', 'Wohnsitz anmelden', options),
      v8beta1.searchServices('053150000000', 'Wohnsitz anmelden', options),
    ]);

    expect(fromV8.services).toEqual(fromV7.services.map(withDocumentedGaps));
    expect(fromV8.totalElements).toBe(fromV7.totalElements);
    expect(fromV8.totalPages).toBe(fromV7.totalPages);
  });

  it('agrees on ids, titles, LeiKa keys, regional keys, federal states, languages and sections', async () => {
    const [fromV7, fromV8] = await Promise.all([
      v7.searchServices('053150000000', 'Wohnsitz anmelden', options),
      v8beta1.searchServices('053150000000', 'Wohnsitz anmelden', options),
    ]);
    const projection = (service: PublicServiceDescription) => ({
      id: service.id,
      title: service.title,
      serviceCatalogKeys: service.serviceCatalogKeys,
      regionalKeys: service.regionalKeys,
      federalStateKeys: service.federalStateKeys,
      availableLanguages: service.availableLanguages,
      sections: service.sections.map((section) => [
        section.type,
        section.originalTitle,
        section.htmlText,
        section.links.map((link) => link.url),
      ]),
    });

    expect(fromV8.services.map(projection)).toEqual(
      fromV7.services.map(projection),
    );
    expect(fromV7.services.map(projection)[0]).toEqual({
      id: 'L100002.LB.1',
      title: 'Wohnsitz anmelden',
      serviceCatalogKeys: ['99115005104000'],
      regionalKeys: ['053150000000'],
      federalStateKeys: ['05'],
      availableLanguages: ['de', 'en'],
      sections: [
        ['SERVICE_NAME', 'Leistungsbezeichnung', 'Wohnsitz anmelden', []],
        [
          'REQUIRED_DOCUMENTS',
          'Erforderliche Unterlagen',
          '<p>Personalausweis</p>',
          ['https://example.test/form'],
        ],
        ['OTHER', 'Unbekannt', '', []],
      ],
    });
  });

  it('documents the fields only v7 delivers', async () => {
    const [fromV7, fromV8] = await Promise.all([
      v7.searchServices('053150000000', 'Wohnsitz anmelden', options),
      v8beta1.searchServices('053150000000', 'Wohnsitz anmelden', options),
    ]);

    expect(fromV7.services.map((s) => s.summary)).toEqual([
      'Anmeldung einer Wohnung.',
      'Umzug innerhalb der EU.',
    ]);
    expect(fromV7.services.map((s) => s.targetAudiences)).toEqual([
      ['Bürger'],
      ['Bürger', 'Unternehmen'],
    ]);
    expect(fromV8.services.map((s) => s.summary)).toEqual([
      undefined,
      undefined,
    ]);
    expect(fromV8.services.map((s) => s.targetAudiences)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('translates the shared options identically and drops what v8beta1 does not support', async () => {
    await v7.searchServices('053150000000', 'Wohnsitz anmelden', {
      ...options,
      fuzzySearch: false,
      useRegionalHierarchy: false,
      validDate: '2026-09-30',
    });
    await v8beta1.searchServices('053150000000', 'Wohnsitz anmelden', {
      ...options,
      fuzzySearch: false,
      useRegionalHierarchy: false,
      validDate: '2026-09-30',
    });

    const v7Params = new URL(fetchStub.calls[0].url).searchParams;
    const v8Params = new URL(
      fetchStub.calls.find((call) => new URL(call.url).pathname === V8_PATH)!
        .url,
    ).searchParams;

    for (const shared of [
      'q',
      'size',
      'page',
      'useArsHierarchy',
      'personalMatters',
    ]) {
      expect(v8Params.getAll(shared)).toEqual(v7Params.getAll(shared));
    }
    expect(v8Params.get('ars')).toBe('053150000000');
    expect(v7Params.get('fuzzysearch')).toBe('false');
    expect(v7Params.get('validDate')).toBe('2026-09-30');
    expect(v8Params.has('fuzzysearch')).toBe(false);
    expect(v8Params.has('validDate')).toBe(false);
  });
});
