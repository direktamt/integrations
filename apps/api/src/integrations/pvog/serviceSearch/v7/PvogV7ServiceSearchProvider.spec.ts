import { FetchStub } from '../../../../../test/FetchStub';
import { PvogV7ServiceSearchProvider } from './PvogV7ServiceSearchProvider';

/**
 * Minimal synthetic v7 search payload shaped like docs/INTEGRATIONS.md,
 * section 1.3. Values are invented.
 */
const SERVICE_DESCRIPTION = {
  id: 'L100002.LB.1',
  name: 'Wohnsitz anmelden',
  description: 'Anmeldung einer Wohnung.',
  leikakeys: ['99115005104000'],
  ars: ['053150000000'],
  arsFederalstate: ['05'],
  addressees: ['Bürger'],
  availableLanguages: ['de', 'en'],
  details: [
    {
      '@type': '_module',
      code: '14',
      title: 'Erforderliche Unterlagen',
      text: '<p>Personalausweis</p>',
      links: [{ uri: 'https://example.test/form', title: 'Formular' }],
    },
  ],
};

describe('PvogV7ServiceSearchProvider', () => {
  const fetchStub = new FetchStub();
  const provider = new PvogV7ServiceSearchProvider();

  beforeAll(() => {
    fetchStub.install();
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
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

    const result = await provider.searchServices(
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
    expect(params.get('page')).toBe('0');
    expect(params.get('fuzzysearch')).toBe('true');
    expect(params.get('useArsHierarchy')).toBe('true');
    expect(params.has('personalMatters')).toBe(false);
    expect(params.has('validDate')).toBe(false);
    expect(result.totalElements).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.services.map((s) => s.id)).toEqual(['L100002.LB.1']);
  });

  it('forwards every search option to its upstream parameter', async () => {
    fetchStub.respondWithJson({ serviceDescriptions: { content: [] } });

    await provider.searchServices('053150000000', 'Hund', {
      size: 20,
      page: 3,
      fuzzySearch: false,
      useRegionalHierarchy: false,
      lifeSituationCodes: ['1010000', '1020000'],
      validDate: '2026-09-30',
    });

    const params = fetchStub.lastUrl().searchParams;
    expect(params.get('size')).toBe('20');
    expect(params.get('page')).toBe('3');
    expect(params.get('fuzzysearch')).toBe('false');
    expect(params.get('useArsHierarchy')).toBe('false');
    expect(params.getAll('personalMatters')).toEqual(['1010000', '1020000']);
    expect(params.get('validDate')).toBe('2026-09-30');
  });

  it('carries the full description including metadata into the result', async () => {
    fetchStub.respondWithJson({
      serviceDescriptions: {
        content: [SERVICE_DESCRIPTION],
        totalElements: 1,
        totalPages: 1,
      },
    });

    const result = await provider.searchServices('053150000000', 'Wohnsitz', {
      size: 10,
      page: 0,
      fuzzySearch: true,
      useRegionalHierarchy: true,
    });

    expect(result.services[0]).toMatchObject({
      title: 'Wohnsitz anmelden',
      summary: 'Anmeldung einer Wohnung.',
      serviceCatalogKeys: ['99115005104000'],
      regionalKeys: ['053150000000'],
      federalStateKeys: ['05'],
      targetAudiences: ['Bürger'],
      availableLanguages: ['de', 'en'],
    });
    expect(result.services[0].sections).toHaveLength(1);
  });

  it('answers an empty page as an empty result', async () => {
    fetchStub.respondWithJson({
      serviceDescriptions: { content: [], totalElements: 0, totalPages: 0 },
    });

    await expect(
      provider.searchServices('053150000000', 'xyz', {
        size: 10,
        page: 0,
        fuzzySearch: true,
        useRegionalHierarchy: true,
      }),
    ).resolves.toEqual({ services: [], totalElements: 0, totalPages: 0 });
  });
});
