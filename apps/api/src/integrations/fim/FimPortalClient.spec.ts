import { FetchStub } from '../../../test/FetchStub';
import { testHttpClientDependencies } from '../../../test/UpstreamTestSupport';
import { FimPortalClient } from './FimPortalClient';

/**
 * Minimal synthetic payload shaped like a FIM Portal catalog entry
 * (docs/INTEGRATIONS.md, section 2.1). Values are invented.
 */
const CATALOG_ITEM = {
  leistungsschluessel: '99101002104007',
  redaktion_id: 'B100019',
  leistung_id: '1',
  title: 'Bestattung Anmeldung',
  leistungsbezeichnung: 'Bestattung Anmeldung',
  leistungsbezeichnung_2: null,
  freigabe_status: 6,
  erstellt_datum_zeit: '2026-01-01T00:00:00Z',
  geaendert_datum_zeit: '2026-02-01T00:00:00Z',
  typisierung: ['1'],
  leistungstyp: 'lov',
  rechtsgrundlagen: '§ 1 Beispielgesetz',
  sdg_informationsbereiche: [],
  extraneous: 'dropped',
};

const EXPECTED_ENTRY = {
  serviceCatalogKey: '99101002104007',
  editorialOfficeId: 'B100019',
  serviceId: '1',
  title: 'Bestattung Anmeldung',
  officialName: 'Bestattung Anmeldung',
  citizenFacingName: undefined,
  approvalStatus: 6,
  createdAt: '2026-01-01T00:00:00Z',
  modifiedAt: '2026-02-01T00:00:00Z',
  typeCodes: ['1'],
  serviceType: 'lov',
  legalBasis: '§ 1 Beispielgesetz',
};

describe('FimPortalClient', () => {
  const fetchStub = new FetchStub();
  const client = new FimPortalClient(...testHttpClientDependencies());

  beforeAll(() => {
    fetchStub.install();
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
  });

  it('searches the catalog with the upstream full-text parameter', async () => {
    fetchStub.respondWithJson({
      items: [CATALOG_ITEM],
      offset: 0,
      limit: 20,
      count: 1,
      total_count: 303,
    });

    const result = await client.searchCatalog('Anmeldung');

    const url = fetchStub.lastUrl();
    expect(url.pathname).toBe('/api/v0/leistung-steckbriefe');
    expect(url.searchParams.get('fts_query')).toBe('Anmeldung');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(result).toEqual({
      entries: [EXPECTED_ENTRY],
      offset: 0,
      limit: 20,
      count: 1,
      totalCount: 303,
    });
  });

  it('fetches a single catalog entry by its encoded service catalog key', async () => {
    fetchStub.respondWithJson(CATALOG_ITEM);

    const entry = await client.getCatalogEntry('99101002104007');

    expect(fetchStub.lastUrl().pathname).toBe(
      '/api/v0/leistung-steckbriefe/99101002104007',
    );
    expect(entry).toEqual(EXPECTED_ENTRY);
  });

  it('passes the parsed master text through without validation', async () => {
    fetchStub.respondWithJson({ id: 'x', modul_text: [] });

    const text = await client.getParsedMasterText('L100039', '10268781');

    expect(fetchStub.lastUrl().pathname).toBe(
      '/api/v0/leistung-stammtexte/L100039/10268781/primary/parsed-xzufi',
    );
    expect(text).toEqual({ id: 'x', modul_text: [] });
  });
});
