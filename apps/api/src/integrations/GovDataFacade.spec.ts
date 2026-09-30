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
        authority: { id: 'L100002.OE.1', name: 'Kundenzentrum Innenstadt' },
        role: AuthorityRole.ResponsibleAuthority,
      },
      {
        authority: { id: 'L100002.OE.2', name: 'Bürgertelefon' },
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

  describe('listOnlineServiceAuthorities', () => {
    const RELATION_PATH =
      '/suchdienst/api/v1beta2/onlineservices/L100002.OD.1/organisations';
    const responsibility = (role: string) => ({
      role,
      lbId: 'L100002.LB.1',
      leikakeys: ['99115005104000'],
      ars: ['053150000000'],
    });

    function serveRelation(
      relation: unknown,
      unitsById: Record<string, unknown>,
    ) {
      fetchStub.respondWith((url) => {
        const { pathname, searchParams } = new URL(url);

        if (pathname === RELATION_PATH) return json(relation);
        const found =
          pathname === AUTHORITY_PATH
            ? unitsById[searchParams.get('q') ?? '']
            : undefined;

        return found ? json(found) : json({ code: 'NOT_FOUND' }, 404);
      });
    }

    it('composes the relation with the unit details and loads every unit once', async () => {
      serveRelation(
        {
          organisations: [
            {
              oeId: 'L100002.OE.1',
              name: 'Kundenzentrum Innenstadt',
              roles: [
                responsibility('COMPETENT_OFFICE'),
                responsibility('CONTACT_POINT'),
              ],
            },
            {
              oeId: 'L100002.OE.2',
              name: 'Hotline',
              roles: [responsibility('CONTACT_POINT')],
            },
            {
              oeId: 'L100002.OE.1',
              roles: [responsibility('COMPETENT_OFFICE')],
            },
          ],
        },
        {
          'L100002.OE.1': unit('L100002.OE.1'),
          'L100002.OE.2': unit('L100002.OE.2'),
        },
      );

      const authorities =
        await facade.listOnlineServiceAuthorities('L100002.OD.1');

      expect(fetchStub.calls.map((call) => new URL(call.url).pathname)).toEqual(
        [RELATION_PATH, AUTHORITY_PATH, AUTHORITY_PATH],
      );
      expect(
        fetchStub.calls
          .slice(1)
          .map((call) => new URL(call.url).searchParams.get('q')),
      ).toEqual(['L100002.OE.1', 'L100002.OE.2']);
      expect(authorities).toMatchObject([
        {
          authority: { id: 'L100002.OE.1', name: 'Kundenzentrum Innenstadt' },
          roles: [
            AuthorityRole.ResponsibleAuthority,
            AuthorityRole.ContactPoint,
          ],
        },
        {
          authority: { id: 'L100002.OE.2', name: 'Hotline' },
          roles: [AuthorityRole.ContactPoint],
        },
      ]);
      expect(authorities[0].authority.contacts).toHaveLength(1);
    });

    it('returns an empty list with a single request for an online service without relation', async () => {
      serveRelation({ organisations: [] }, {});

      await expect(
        facade.listOnlineServiceAuthorities('L100002.OD.1'),
      ).resolves.toEqual([]);
      expect(fetchStub.calls).toHaveLength(1);
    });

    it('passes an upstream 404 for an unknown online service through', async () => {
      fetchStub.respondWithJson({ code: 'NOT_FOUND' }, 404);

      await expect(
        facade.listOnlineServiceAuthorities('L100002.OD.gone'),
      ).rejects.toMatchObject({
        status: 404,
      });
      expect(fetchStub.calls).toHaveLength(1);
    });

    it('passes an upstream 404 for an unknown organisation through', async () => {
      serveRelation(
        {
          organisations: [
            {
              oeId: 'L100002.OE.gone',
              roles: [responsibility('COMPETENT_OFFICE')],
            },
          ],
        },
        {},
      );

      await expect(
        facade.listOnlineServiceAuthorities('L100002.OD.1'),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
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
