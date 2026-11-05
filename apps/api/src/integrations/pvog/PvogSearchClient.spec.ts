import {
  AuthorityRole,
  ServiceCatalogKeyMatchType,
  ServiceSectionType,
} from '@direktamt/integrations-contracts';
import { FetchStub } from '../../../test/FetchStub';
import { testHttpClientDependencies } from '../../../test/UpstreamTestSupport';
import { UpstreamContractViolationException } from '../common/exceptions/UpstreamContractViolationException';
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
  addressees: ['Bürger'],
  availableLanguages: ['de', 'en'],
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
  const client = new PvogSearchClient(...testHttpClientDependencies());

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

    const { service, authorityReferences } = await client.getServiceDescription(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    expect(fetchStub.lastUrl().pathname).toBe(
      '/suchdienst/api/v6/servicedescriptions/L100002.LB.1/detail',
    );
    expect(fetchStub.lastUrl().searchParams.get('ars')).toBe('053150000000');
    expect(authorityReferences).toEqual([]);
    expect(service).toEqual({
      id: 'L100002.LB.1',
      serviceCatalogKeys: ['99115005104000'],
      title: 'Wohnsitz anmelden',
      summary: 'Anmeldung einer Wohnung.',
      regionalKeys: ['053150000000'],
      federalStateKeys: ['05'],
      targetAudiences: ['Bürger'],
      availableLanguages: ['de', 'en'],
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

  describe('authority references', () => {
    it('maps the responsible organisation units with their roles', async () => {
      fetchStub.respondWithJson({
        ...SERVICE_DESCRIPTION,
        organisations: [
          {
            id: 'L100002.OE.1',
            title: 'Kundenzentrum',
            role: { code: '02', name: 'Zuständige Stelle' },
          },
          {
            id: 'L100002.OE.2',
            title: 'Bürgertelefon',
            role: { code: '03', name: 'Ansprechpunkt' },
          },
          {
            id: 'L100002.OE.3',
            title: 'Beides',
            role: { code: '01', name: 'Zuständige Stelle und Ansprechpunkt' },
          },
          {
            id: 'L100002.OE.4',
            title: 'EA',
            role: { code: '11', name: 'Einheitlicher Ansprechpartner' },
          },
          {
            id: 'L100002.OE.5',
            title: 'Andere',
            role: { code: '19', name: 'Andere Einheitliche Stelle' },
          },
          {
            id: 'L100002.OE.6',
            title: '',
            role: { code: '99', name: 'Unbekannt' },
          },
          { id: 'L100002.OE.7' },
        ],
      });

      const { authorityReferences } = await client.getServiceDescription(
        'L100002.LB.1',
        '053150000000',
        true,
      );

      expect(authorityReferences).toEqual([
        {
          id: 'L100002.OE.1',
          name: 'Kundenzentrum',
          role: AuthorityRole.ResponsibleAuthority,
        },
        {
          id: 'L100002.OE.2',
          name: 'Bürgertelefon',
          role: AuthorityRole.ContactPoint,
        },
        {
          id: 'L100002.OE.3',
          name: 'Beides',
          role: AuthorityRole.ResponsibleAuthorityAndContactPoint,
        },
        {
          id: 'L100002.OE.4',
          name: 'EA',
          role: AuthorityRole.SinglePointOfContact,
        },
        {
          id: 'L100002.OE.5',
          name: 'Andere',
          role: AuthorityRole.OtherSinglePointOfContact,
        },
        { id: 'L100002.OE.6', name: undefined, role: AuthorityRole.Other },
        { id: 'L100002.OE.7', name: undefined, role: AuthorityRole.Other },
      ]);
    });

    it('rejects a reference without an id as a contract violation', async () => {
      fetchStub.respondWithJson({
        ...SERVICE_DESCRIPTION,
        organisations: [{ title: 'Ohne Id' }],
      });

      await expect(
        client.getServiceDescription('L100002.LB.1', '053150000000', true),
      ).rejects.toBeInstanceOf(UpstreamContractViolationException);
    });
  });

  describe('service metadata', () => {
    it('normalizes missing metadata arrays to empty lists', async () => {
      fetchStub.respondWithJson({
        id: 'L100002.LB.2',
        name: 'Ohne Metadaten',
        details: [],
      });

      const { service } = await client.getServiceDescription(
        'L100002.LB.2',
        '053150000000',
        true,
      );

      expect(service).toMatchObject({
        serviceCatalogKeys: [],
        regionalKeys: [],
        availableLanguages: [],
        sections: [],
      });
      expect(service.federalStateKeys).toBeUndefined();
      expect(service.targetAudiences).toBeUndefined();
    });

    it('keeps every published federal state, target audience and language', async () => {
      fetchStub.respondWithJson({
        ...SERVICE_DESCRIPTION,
        ars: ['053150000000', '110000000000'],
        arsFederalstate: ['05', '11', '00'],
        addressees: ['Bürger', 'Unternehmen'],
        availableLanguages: ['de', 'en', 'fr'],
      });

      const { service } = await client.getServiceDescription(
        'L100002.LB.1',
        '053150000000',
        true,
      );

      expect(service.federalStateKeys).toEqual(['05', '11', '00']);
      expect(service.targetAudiences).toEqual(['Bürger', 'Unternehmen']);
      expect(service.availableLanguages).toEqual(['de', 'en', 'fr']);
    });
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

  describe('catalog entry services', () => {
    const HIERARCHY_PATH =
      '/suchdienst/api/v2/servicedescriptions/leikahierarchy';
    const description = (id: string, leikakey: string) => ({
      id,
      name: id,
      leikakeys: [leikakey],
      ars: ['110000000000'],
      arsFederalstate: ['11'],
      availableLanguages: ['de'],
      details: [],
    });
    const hierarchyPage = (
      exact: boolean,
      totalPages: number,
      ...content: ReturnType<typeof description>[]
    ) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            content,
            meta: { exact },
            totalElements: content.length,
            totalPages,
            last: true,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    it('requests the hierarchy search for one key and territory', async () => {
      fetchStub.respondWith(() => hierarchyPage(true, 1));

      await client.listCatalogEntryServices('99115005104000', '053140000000');

      const params = fetchStub.lastUrl().searchParams;
      expect(fetchStub.lastUrl().pathname).toBe(HIERARCHY_PATH);
      expect(params.getAll('leikaIds')).toEqual(['99115005104000']);
      expect(params.get('ars')).toBe('053140000000');
      expect(params.get('size')).toBe('100');
      expect(params.get('page')).toBe('0');
    });

    it('maps exact hits to full descriptions marked EXACT', async () => {
      fetchStub.respondWithJson({
        content: [SERVICE_DESCRIPTION],
        meta: { exact: true },
        totalElements: 1,
        totalPages: 1,
      });

      const services = await client.listCatalogEntryServices(
        '99115005104000',
        '053150000000',
      );

      expect(services).toHaveLength(1);
      expect(services[0].matchType).toBe(ServiceCatalogKeyMatchType.Exact);
      expect(services[0].service).toMatchObject({
        id: 'L100002.LB.1',
        title: 'Wohnsitz anmelden',
        serviceCatalogKeys: ['99115005104000'],
        regionalKeys: ['053150000000'],
        federalStateKeys: ['05'],
      });
      expect(services[0].service.sections[0].type).toBe(
        ServiceSectionType.RequiredDocuments,
      );
    });

    it('marks hits of a fallback page as HIERARCHY', async () => {
      fetchStub.respondWith(() =>
        hierarchyPage(
          false,
          1,
          description('L100108.LB.1', '99115005104001'),
          description('L100108.LB.2', '99115005104002'),
        ),
      );

      const services = await client.listCatalogEntryServices(
        '99115005104000',
        '110000000000',
      );

      expect(
        services.map((entry) => [
          entry.service.id,
          entry.service.serviceCatalogKeys,
          entry.matchType,
        ]),
      ).toEqual([
        [
          'L100108.LB.1',
          ['99115005104001'],
          ServiceCatalogKeyMatchType.Hierarchy,
        ],
        [
          'L100108.LB.2',
          ['99115005104002'],
          ServiceCatalogKeyMatchType.Hierarchy,
        ],
      ]);
    });

    it('returns an empty list when nothing is published', async () => {
      fetchStub.respondWithJson({
        content: [],
        meta: { exact: false },
        totalElements: 0,
        totalPages: 0,
      });

      await expect(
        client.listCatalogEntryServices('99010038020000', '053140000000'),
      ).resolves.toEqual([]);
      expect(fetchStub.calls).toHaveLength(1);
    });

    it('collects every page in upstream order with the same filters', async () => {
      fetchStub.respondWith((url) => {
        const page = new URL(url).searchParams.get('page');

        return page === '1'
          ? hierarchyPage(
              false,
              2,
              description('L100002.LB.2', '99140001002000'),
            )
          : hierarchyPage(
              false,
              2,
              description('L100002.LB.1', '99140001001000'),
            );
      });

      const services = await client.listCatalogEntryServices(
        '99140001000000',
        '053140000000',
      );

      expect(fetchStub.calls).toHaveLength(2);
      const second = new URL(fetchStub.calls[1].url).searchParams;
      expect(second.getAll('leikaIds')).toEqual(['99140001000000']);
      expect(second.get('ars')).toBe('053140000000');
      expect(second.get('page')).toBe('1');
      expect(services.map((entry) => entry.service.id)).toEqual([
        'L100002.LB.1',
        'L100002.LB.2',
      ]);
    });

    it('rejects a page without match metadata as a contract violation', async () => {
      fetchStub.respondWithJson({
        content: [SERVICE_DESCRIPTION],
        totalElements: 1,
        totalPages: 1,
      });

      await expect(
        client.listCatalogEntryServices('99115005104000', '053150000000'),
      ).rejects.toBeInstanceOf(UpstreamContractViolationException);
    });

    it('rejects a total beyond the upstream page limit as a contract violation', async () => {
      fetchStub.respondWith(() =>
        hierarchyPage(true, 102, description('L100002.LB.1', '99115005104000')),
      );

      await expect(
        client.listCatalogEntryServices('99115005104000', '053150000000'),
      ).rejects.toBeInstanceOf(UpstreamContractViolationException);
      expect(fetchStub.calls).toHaveLength(1);
    });
  });

  describe('online-service pagination', () => {
    const service = (id: string) => ({
      id,
      name: id,
      links: [],
      serviceDescriptions: [
        {
          lbId: 'L100002.LB.1',
          ars: ['053150000000'],
          leikakeys: ['99115005104000'],
        },
      ],
    });
    const page = (token: string, ...ids: string[]) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            nextPageToken: token,
            hits: ids.length,
            totalHits: ids.length,
            onlineservices: ids.map(service),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    it('requests once when the first page has no next token', async () => {
      fetchStub.respondWith(() => page('', 'L100002.OD.1'));

      const services = await client.listOnlineServices('053150000000');

      expect(fetchStub.calls).toHaveLength(1);
      expect(fetchStub.lastUrl().searchParams.has('nextPageToken')).toBe(false);
      expect(services.map((s) => s.id)).toEqual(['L100002.OD.1']);
    });

    it('follows the next-page token and merges all pages', async () => {
      fetchStub.respondWith((url) =>
        new URL(url).searchParams.get('nextPageToken') === 'abc'
          ? page('', 'L100002.OD.2')
          : page('abc', 'L100002.OD.1'),
      );

      const services = await client.listOnlineServices('053150000000');

      expect(fetchStub.calls).toHaveLength(2);
      expect(services.map((s) => s.id)).toEqual([
        'L100002.OD.1',
        'L100002.OD.2',
      ]);
    });

    it('keeps the territory and LeiKa filters on every page', async () => {
      fetchStub.respondWith((url) =>
        new URL(url).searchParams.get('nextPageToken') === 'abc'
          ? page('', 'L100002.OD.2')
          : page('abc', 'L100002.OD.1'),
      );

      await client.listOnlineServices('053150000000', ['99115005104000']);

      const second = new URL(fetchStub.calls[1].url).searchParams;
      expect(second.get('ars')).toBe('053150000000');
      expect(second.getAll('leikaIds')).toEqual(['99115005104000']);
      expect(second.get('nextPageToken')).toBe('abc');
    });

    it('stops with a contract violation when a token repeats', async () => {
      fetchStub.respondWith(() => page('abc', 'L100002.OD.1'));

      await expect(
        client.listOnlineServices('053150000000'),
      ).rejects.toBeInstanceOf(UpstreamContractViolationException);
      expect(fetchStub.calls).toHaveLength(2);
    });
  });
});
