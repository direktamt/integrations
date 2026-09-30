import { ServiceSectionType } from '@direktamt/integrations-contracts';
import { FetchStub } from '../../../test/FetchStub';
import { PvogSearchClient } from './PvogSearchClient';

/**
 * Minimal synthetic payloads shaped like the PVOG Suchdienst responses
 * documented in docs/INTEGRATIONS.md. Values are invented.
 */
const LOCATION = {
  ars: '053150000000',
  arsFederalstate: '05',
  name: "Köln 'Altstadt-Nord'",
  gemeinde: 'Köln',
  plz: '50667',
  koordinaten: ['6.95', '50.93'],
};

const SERVICE_DESCRIPTION = {
  id: 'L100002.LB.1',
  name: 'Wohnsitz anmelden',
  description: 'Anmeldung einer Wohnung.',
  leikakeys: ['99115005104000'],
  ars: ['053150000000'],
  arsFederalstate: ['05'],
  details: [
    {
      '@type': '_module',
      code: '14',
      title: 'Erforderliche Unterlagen',
      text: '<p>Personalausweis</p>',
      xZufiCategory: 'TEXT_MODUL',
      links: [{ uri: 'https://example.test/form', title: 'Formular' }],
      filled: true,
      placeholder: false,
    },
    {
      '@type': '_module',
      code: '99',
      title: 'Unbekannter Abschnitt',
      text: '',
      links: [],
    },
  ],
  extraneous: 'dropped',
};

describe('PvogSearchClient', () => {
  const fetchStub = new FetchStub();
  const client = new PvogSearchClient();

  beforeAll(() => {
    fetchStub.install();
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
  });

  it('maps location suggestions', async () => {
    fetchStub.respondWithJson([{ name: 'Köln', weight: 1.89 }]);

    const suggestions = await client.suggestLocations('Kö');

    expect(fetchStub.lastUrl().pathname).toBe(
      '/suchdienst/api/v3/locations/suggestions',
    );
    expect(fetchStub.lastUrl().searchParams.get('q')).toBe('Kö');
    expect(suggestions).toEqual([{ name: 'Köln', relevance: 1.89 }]);
  });

  it('resolves a city name to territories and caps the result size', async () => {
    fetchStub.respondWithJson([LOCATION]);

    const locations = await client.resolveLocation({ cityName: 'Köln' });

    const params = fetchStub.lastUrl().searchParams;
    expect(fetchStub.lastUrl().pathname).toBe(
      '/suchdienst/api/v3/locations/details',
    );
    expect(params.get('ort')).toBe('Köln');
    expect(params.has('plz')).toBe(false);
    expect(params.get('limit')).toBe('10');
    expect(params.getAll('distinctBy')).toEqual(['ARS']);
    expect(locations).toEqual([
      { regionalKey: '053150000000', federalStateKey: '05', name: 'Köln' },
    ]);
  });

  it('returns null for an unknown regional key', async () => {
    fetchStub.respondWithJson([]);

    await expect(client.getLocation('999999999999')).resolves.toBeNull();
  });

  it('maps a service description with typed sections and links', async () => {
    fetchStub.respondWithJson(SERVICE_DESCRIPTION);

    const service = await client.getServiceDescription(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    expect(fetchStub.lastUrl().pathname).toBe(
      '/suchdienst/api/v6/servicedescriptions/L100002.LB.1/detail',
    );
    expect(fetchStub.lastUrl().searchParams.get('ars')).toBe('053150000000');
    expect(service).toEqual({
      id: 'L100002.LB.1',
      serviceCatalogKeys: ['99115005104000'],
      title: 'Wohnsitz anmelden',
      summary: 'Anmeldung einer Wohnung.',
      regionalKeys: ['053150000000'],
      sections: [
        {
          type: ServiceSectionType.RequiredDocuments,
          originalTitle: 'Erforderliche Unterlagen',
          htmlText: '<p>Personalausweis</p>',
          links: [
            {
              url: 'https://example.test/form',
              title: 'Formular',
              description: undefined,
            },
          ],
        },
        {
          type: ServiceSectionType.Other,
          originalTitle: 'Unbekannter Abschnitt',
          htmlText: '',
          links: [],
        },
      ],
    });
  });

  it('searches services and unwraps the paginated envelope', async () => {
    fetchStub.respondWithJson({
      facades: {},
      serviceDescriptions: {
        content: [SERVICE_DESCRIPTION],
        totalElements: 1,
        totalPages: 1,
      },
    });

    const result = await client.searchServices(
      '053150000000',
      'Wohnsitz anmelden',
      {
        size: 10,
        page: 0,
        fuzzySearch: true,
        useRegionalHierarchy: true,
      },
    );

    const params = fetchStub.lastUrl().searchParams;
    expect(fetchStub.lastUrl().pathname).toBe(
      '/suchdienst/api/v7/servicedescriptions/053150000000',
    );
    expect(params.getAll('q')).toEqual(['Wohnsitz anmelden']);
    expect(params.get('size')).toBe('10');
    expect(params.get('fuzzysearch')).toBe('true');
    expect(params.get('useArsHierarchy')).toBe('true');
    expect(params.has('personalMatters')).toBe(false);
    expect(result.totalElements).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.services.map((s) => s.id)).toEqual(['L100002.LB.1']);
  });

  it('lists online services with de-duplicated service catalog keys', async () => {
    fetchStub.respondWithJson({
      nextPageToken: '',
      hits: 1,
      totalHits: 1,
      onlineservices: [
        {
          id: 'L100002.OD.1',
          name: 'Wohnsitz anmelden',
          links: [
            { uri: 'https://example.test/apply', title: 'Jetzt beantragen' },
          ],
          externalLastUpdate: '2026-01-01T00:00:00Z',
          serviceDescriptions: [
            {
              lbId: 'L100002.LB.1',
              ars: ['053150000000'],
              leikakeys: ['99115005104000'],
            },
            {
              lbId: 'L100002.LB.2',
              ars: ['053150000000'],
              leikakeys: ['99115005104000', '99115005104001'],
            },
          ],
        },
      ],
    });

    const services = await client.listOnlineServices('053150000000', [
      '99115005104000',
    ]);

    const params = fetchStub.lastUrl().searchParams;
    expect(fetchStub.lastUrl().pathname).toBe(
      '/suchdienst/api/v1beta2/onlineservices',
    );
    expect(params.get('ars')).toBe('053150000000');
    expect(params.getAll('leikaIds')).toEqual(['99115005104000']);
    expect(services).toEqual([
      {
        id: 'L100002.OD.1',
        name: 'Wohnsitz anmelden',
        description: undefined,
        serviceCatalogKeys: ['99115005104000', '99115005104001'],
        links: [
          {
            url: 'https://example.test/apply',
            title: 'Jetzt beantragen',
            description: undefined,
          },
        ],
        lastUpdatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });
});
