import { AuthorityRole } from '@direktamt/integrations-contracts';
import { Logger } from '@nestjs/common';
import { FetchStub } from '../../test/FetchStub';
import { UpstreamHttpException } from './common/exceptions/UpstreamHttpException';
import { FimPortalClient } from './fim/FimPortalClient';
import { GovDataFacade } from './GovDataFacade';
import { PvogAuthorityClient } from './pvog/PvogAuthorityClient';
import { PvogSearchClient } from './pvog/PvogSearchClient';
import { ServiceContextAssembler } from './ServiceContextAssembler';

/**
 * Synthetic PVOG payloads for the service → authorities composition
 * (docs/INTEGRATIONS.md, sections 1.4 and 1.5). Values are invented.
 */
const SERVICE_PATH =
  '/suchdienst/api/v6/servicedescriptions/L100002.LB.1/detail';
const AUTHORITY_PATH = '/suchdienst/api/v5/organisationunits/detail';

const SERVICE = {
  id: 'L100002.LB.1',
  name: 'Wohnsitz anmelden',
  leikakeys: ['99115005104000'],
  ars: ['053150000000'],
  details: [],
  organisations: [
    {
      id: 'L100002.OE.1',
      title: 'Kundenzentrum Innenstadt',
      role: { code: '02', name: 'Zuständige Stelle' },
    },
    {
      id: 'L100002.OE.2',
      title: 'Bürgertelefon',
      role: { code: '03', name: 'Ansprechpunkt' },
    },
  ],
};

const unit = (id: string) => ({
  id,
  lastUpdate: '2026-01-01T00:00:00Z',
  role: { code: '03', name: 'Ansprechpunkt' },
  location: {
    communications: [{ code: '02', name: 'Telefon Festnetz', value: '0221 1' }],
  },
});

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('GovDataFacade', () => {
  const fetchStub = new FetchStub();
  const pvogSearchClient = new PvogSearchClient();
  const pvogAuthorityClient = new PvogAuthorityClient();
  const fimPortalClient = new FimPortalClient();
  const facade = new GovDataFacade(
    pvogSearchClient,
    pvogAuthorityClient,
    fimPortalClient,
    new ServiceContextAssembler(
      pvogSearchClient,
      pvogAuthorityClient,
      fimPortalClient,
    ),
  );

  function serve(service: unknown, unitsById: Record<string, unknown>) {
    fetchStub.respondWith((url) => {
      const { pathname, searchParams } = new URL(url);

      if (pathname === SERVICE_PATH) return json(service);
      const found =
        pathname === AUTHORITY_PATH
          ? unitsById[searchParams.get('q') ?? '']
          : undefined;

      return found ? json(found) : json({ code: 'NOT_FOUND' }, 404);
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the public service description without the references', async () => {
    serve(SERVICE, {});

    const service = await facade.getServiceDescription(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    expect(service.id).toBe('L100002.LB.1');
    expect(service).not.toHaveProperty('authorityReferences');
    expect(fetchStub.calls).toHaveLength(1);
  });

  it('composes the authorities from the service detail and the unit details', async () => {
    serve(SERVICE, {
      'L100002.OE.1': unit('L100002.OE.1'),
      'L100002.OE.2': unit('L100002.OE.2'),
    });

    const authorities = await facade.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      false,
    );

    expect(fetchStub.calls.map((call) => new URL(call.url).pathname)).toEqual([
      SERVICE_PATH,
      AUTHORITY_PATH,
      AUTHORITY_PATH,
    ]);
    const serviceUrl = new URL(fetchStub.calls[0].url);
    expect(serviceUrl.searchParams.get('ars')).toBe('053150000000');
    expect(serviceUrl.searchParams.get('useArsHierarchy')).toBe('false');
    const unitUrl = new URL(fetchStub.calls[1].url);
    expect(unitUrl.searchParams.get('q')).toBe('L100002.OE.1');
    expect(unitUrl.searchParams.has('ars')).toBe(false);
    expect(unitUrl.searchParams.has('lbId')).toBe(false);

    expect(authorities).toMatchObject([
      {
        id: 'L100002.OE.1',
        name: 'Kundenzentrum Innenstadt',
        role: AuthorityRole.ResponsibleAuthority,
      },
      {
        id: 'L100002.OE.2',
        name: 'Bürgertelefon',
        role: AuthorityRole.ContactPoint,
      },
    ]);
  });

  it('returns an empty list with a single request when the service names no authority', async () => {
    serve({ ...SERVICE, organisations: [] }, {});

    await expect(
      facade.listServiceAuthorities('L100002.LB.1', '053150000000', true),
    ).resolves.toEqual([]);
    expect(fetchStub.calls).toHaveLength(1);
  });

  it('passes an upstream 404 for an unknown service through without loading units', async () => {
    fetchStub.respondWithJson({ code: 'NOT_FOUND' }, 404);

    const failure = facade.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    await expect(failure).rejects.toBeInstanceOf(UpstreamHttpException);
    await expect(failure).rejects.toMatchObject({ status: 404 });
    expect(fetchStub.calls).toHaveLength(1);
  });
});
