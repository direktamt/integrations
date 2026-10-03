import {
  AuthorityRole,
  ServiceContextPart,
} from '@direktamt/integrations-contracts';
import { Logger } from '@nestjs/common';
import { FetchStub } from '../../test/FetchStub';
import { testHttpClientDependencies } from '../../test/UpstreamTestSupport';
import { UpstreamHttpException } from './common/exceptions/UpstreamHttpException';
import { FimPortalClient } from './fim/FimPortalClient';
import { PvogAuthorityClient } from './pvog/PvogAuthorityClient';
import { PvogSearchClient } from './pvog/PvogSearchClient';
import { ServiceContextAssembler } from './ServiceContextAssembler';

/**
 * Synthetic payloads shaped like the PVOG and FIM responses documented in
 * docs/INTEGRATIONS.md; values are invented. Requests are routed by path so
 * that every upstream resource can be replaced or broken independently.
 */
const SERVICE_PATH =
  '/suchdienst/api/v6/servicedescriptions/L100002.LB.1/detail';
const UNIT_PATH = '/suchdienst/api/v5/organisationunits/detail';
const ONLINE_SERVICES_PATH = '/suchdienst/api/v1beta2/onlineservices';
const catalogPath = (key: string) => `/api/v0/leistung-steckbriefe/${key}`;
const masterTextPath = (office: string, serviceId: string) =>
  `/api/v0/leistung-stammtexte/${office}/${serviceId}/primary/parsed-xzufi`;

const KEY = '99115005104000';
const OTHER_KEY = '99115005104001';

const SERVICE = {
  id: 'L100002.LB.1',
  name: 'Wohnsitz anmelden',
  leikakeys: [KEY],
  ars: ['053150000000'],
  details: [],
  organisations: [
    {
      id: 'L100002.OE.1',
      title: 'Kundenzentrum Innenstadt',
      role: { code: '02', name: 'Zuständige Stelle' },
    },
  ],
};

const UNIT = {
  id: 'L100002.OE.1',
  title: 'Kundenzentrum Innenstadt',
  lastUpdate: '2026-01-01T00:00:00Z',
  role: { code: '02', name: 'Zuständige Stelle' },
  location: {
    communications: [{ code: '02', name: 'Telefon Festnetz', value: '0221 1' }],
  },
};

const ONLINE_SERVICES = {
  nextPageToken: '',
  hits: 1,
  totalHits: 1,
  onlineservices: [
    {
      id: 'L100002.OD.1',
      name: 'Wohnsitz online anmelden',
      links: [{ uri: 'https://example.test/apply' }],
      serviceDescriptions: [
        { lbId: 'L100002.LB.1', ars: ['053150000000'], leikakeys: [KEY] },
      ],
    },
  ],
};

const catalogItem = (key: string, serviceId: string) => ({
  leistungsschluessel: key,
  redaktion_id: 'B100019',
  leistung_id: serviceId,
  title: 'Wohnsitz Anmeldung',
});

const MASTER_TEXT = { id: 'text-582787', modul_text: [] };

type Route = (url: URL) => Promise<Response>;

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

const notFound = () => json({ code: 'NOT_FOUND' }, 404);

/**
 * Every upstream resource of the happy path; tests override single routes.
 */
function happyRoutes(): Record<string, Route> {
  return {
    [SERVICE_PATH]: () => json(SERVICE),
    [UNIT_PATH]: () => json(UNIT),
    [ONLINE_SERVICES_PATH]: () => json(ONLINE_SERVICES),
    [catalogPath(KEY)]: () => json(catalogItem(KEY, '582787')),
    [masterTextPath('B100019', '582787')]: () => json(MASTER_TEXT),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('ServiceContextAssembler', () => {
  const fetchStub = new FetchStub();
  const pvogSearchClient = new PvogSearchClient(
    ...testHttpClientDependencies(),
  );
  const pvogAuthorityClient = new PvogAuthorityClient(
    ...testHttpClientDependencies(),
  );
  const fimPortalClient = new FimPortalClient(...testHttpClientDependencies());
  const assembler = new ServiceContextAssembler(
    pvogSearchClient,
    pvogAuthorityClient,
    fimPortalClient,
  );
  let warnSpy: jest.SpyInstance;

  function serve(routes: Record<string, Route>) {
    fetchStub.respondWith((url) => {
      const parsed = new URL(url);
      const route = routes[parsed.pathname];

      return route ? route(parsed) : notFound();
    });
  }

  const requestedPaths = () =>
    fetchStub.calls.map((call) => new URL(call.url).pathname);

  const assemble = () =>
    assembler.assemble('L100002.LB.1', '053150000000', true);

  beforeAll(() => {
    fetchStub.install();
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('assembles the full context from PVOG and FIM', async () => {
    serve(happyRoutes());

    const context = await assemble();

    expect(context.service.id).toBe('L100002.LB.1');
    expect(context.authorities).toMatchObject([
      {
        authority: { id: 'L100002.OE.1', name: 'Kundenzentrum Innenstadt' },
        role: AuthorityRole.ResponsibleAuthority,
      },
    ]);
    expect(context.onlineServices).toMatchObject([
      { id: 'L100002.OD.1', serviceCatalogKeys: [KEY] },
    ]);
    expect(context.catalogEntries).toMatchObject([
      {
        serviceCatalogKey: KEY,
        editorialOfficeId: 'B100019',
        serviceId: '582787',
      },
    ]);
    expect(context.masterTexts).toEqual([MASTER_TEXT]);
    expect(context.status).toEqual({ complete: true, unavailableParts: [] });

    expect(requestedPaths().sort()).toEqual(
      [
        SERVICE_PATH,
        UNIT_PATH,
        ONLINE_SERVICES_PATH,
        catalogPath(KEY),
        masterTextPath('B100019', '582787'),
      ].sort(),
    );
    const onlineServicesUrl = new URL(
      fetchStub.calls[requestedPaths().indexOf(ONLINE_SERVICES_PATH)].url,
    );
    expect(onlineServicesUrl.searchParams.get('ars')).toBe('053150000000');
    expect(onlineServicesUrl.searchParams.getAll('leikaIds')).toEqual([KEY]);
  });

  it('follows every distinct LeiKa key and de-duplicates master-text identifiers', async () => {
    serve({
      ...happyRoutes(),
      [SERVICE_PATH]: () =>
        json({ ...SERVICE, leikakeys: [KEY, OTHER_KEY, KEY] }),
      [catalogPath(OTHER_KEY)]: () => json(catalogItem(OTHER_KEY, '582787')),
    });

    const context = await assemble();

    expect(
      context.catalogEntries.map((entry) => entry.serviceCatalogKey),
    ).toEqual([KEY, OTHER_KEY]);
    expect(context.masterTexts).toEqual([MASTER_TEXT]);
    expect(context.status.complete).toBe(true);

    const paths = requestedPaths();
    expect(paths.filter((path) => path === catalogPath(KEY))).toHaveLength(1);
    expect(
      paths.filter((path) => path === catalogPath(OTHER_KEY)),
    ).toHaveLength(1);
    expect(
      paths.filter((path) => path === masterTextPath('B100019', '582787')),
    ).toHaveLength(1);
    expect(paths.filter((path) => path === ONLINE_SERVICES_PATH)).toHaveLength(
      1,
    );
    const onlineServicesUrl = new URL(
      fetchStub.calls[paths.indexOf(ONLINE_SERVICES_PATH)].url,
    );
    expect(onlineServicesUrl.searchParams.getAll('leikaIds')).toEqual([
      KEY,
      OTHER_KEY,
    ]);
  });

  it('loads one master text per distinct editorial office and service id', async () => {
    serve({
      ...happyRoutes(),
      [SERVICE_PATH]: () => json({ ...SERVICE, leikakeys: [KEY, OTHER_KEY] }),
      [catalogPath(OTHER_KEY)]: () => json(catalogItem(OTHER_KEY, '900')),
      [masterTextPath('B100019', '900')]: () => json({ id: 'text-900' }),
    });

    const context = await assemble();

    expect(context.masterTexts).toEqual([MASTER_TEXT, { id: 'text-900' }]);
  });

  it('treats no online service as a complete, empty part', async () => {
    serve({
      ...happyRoutes(),
      [ONLINE_SERVICES_PATH]: () =>
        json({ nextPageToken: '', hits: 0, totalHits: 0, onlineservices: [] }),
    });

    const context = await assemble();

    expect(context.onlineServices).toEqual([]);
    expect(context.status).toEqual({ complete: true, unavailableParts: [] });
  });

  it('treats a LeiKa key unknown to the catalog as a complete, empty part', async () => {
    serve({ ...happyRoutes(), [catalogPath(KEY)]: notFound });

    const context = await assemble();

    expect(context.catalogEntries).toEqual([]);
    expect(context.masterTexts).toEqual([]);
    expect(context.status).toEqual({ complete: true, unavailableParts: [] });
    expect(requestedPaths()).not.toContain(masterTextPath('B100019', '582787'));
  });

  it('treats a catalog entry without a master text as a complete, empty part', async () => {
    serve({
      ...happyRoutes(),
      [masterTextPath('B100019', '582787')]: notFound,
    });

    const context = await assemble();

    expect(context.catalogEntries).toHaveLength(1);
    expect(context.masterTexts).toEqual([]);
    expect(context.status.complete).toBe(true);
  });

  it('skips the key-based lookups when the service carries no LeiKa key', async () => {
    serve({
      ...happyRoutes(),
      [SERVICE_PATH]: () => json({ ...SERVICE, leikakeys: [] }),
    });

    const context = await assemble();

    expect(context.onlineServices).toEqual([]);
    expect(context.catalogEntries).toEqual([]);
    expect(context.masterTexts).toEqual([]);
    expect(context.status.complete).toBe(true);
    expect(requestedPaths().sort()).toEqual([SERVICE_PATH, UNIT_PATH].sort());
  });

  it('reports an auxiliary upstream failure instead of failing the context', async () => {
    serve({
      ...happyRoutes(),
      [UNIT_PATH]: () => json({ code: 'INTERNAL' }, 500),
    });

    const context = await assemble();

    expect(context.authorities).toEqual([]);
    expect(context.onlineServices).toHaveLength(1);
    expect(context.catalogEntries).toHaveLength(1);
    expect(context.masterTexts).toHaveLength(1);
    expect(context.status).toEqual({
      complete: false,
      unavailableParts: [ServiceContextPart.Authorities],
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('authorities unavailable'),
    );
  });

  it('marks the master texts unavailable when the catalog entries are', async () => {
    serve({
      ...happyRoutes(),
      [catalogPath(KEY)]: () => Promise.reject(new TypeError('fetch failed')),
    });

    const context = await assemble();

    expect(context.catalogEntries).toEqual([]);
    expect(context.masterTexts).toEqual([]);
    expect(context.status.unavailableParts).toEqual([
      ServiceContextPart.CatalogEntries,
      ServiceContextPart.MasterTexts,
    ]);
    expect(requestedPaths()).not.toContain(masterTextPath('B100019', '582787'));
  });

  it('does not mask a wire-contract violation as an empty result', async () => {
    serve({
      ...happyRoutes(),
      [ONLINE_SERVICES_PATH]: () =>
        json({ nextPageToken: '', onlineservices: 'not a list' }),
    });

    const context = await assemble();

    expect(context.onlineServices).toEqual([]);
    expect(context.status).toEqual({
      complete: false,
      unavailableParts: [ServiceContextPart.OnlineServices],
    });
  });

  it('fails as a whole when the service itself is unavailable', async () => {
    serve({ ...happyRoutes(), [SERVICE_PATH]: notFound });

    const failure = assemble();

    await expect(failure).rejects.toBeInstanceOf(UpstreamHttpException);
    await expect(failure).rejects.toMatchObject({ status: 404 });
    expect(requestedPaths()).toEqual([SERVICE_PATH]);
  });

  it('propagates failures that are not upstream failures', async () => {
    serve(happyRoutes());
    jest
      .spyOn(pvogAuthorityClient, 'listAuthorities')
      .mockRejectedValue(new TypeError('mapping bug'));

    await expect(assemble()).rejects.toThrow(TypeError);
  });

  it('loads the service detail exactly once for the whole context', async () => {
    serve(happyRoutes());

    await assemble();

    expect(
      requestedPaths().filter((path) => path === SERVICE_PATH),
    ).toHaveLength(1);
    expect(requestedPaths()).toHaveLength(5);
  });

  it('issues the independent lookups concurrently once the service is known', async () => {
    const pending: { url: URL; resolve: (response: Response) => void }[] = [];
    const routes = happyRoutes();
    serve({
      ...Object.fromEntries(
        Object.keys(routes).map((path) => [
          path,
          (url: URL) =>
            new Promise<Response>((resolve) => pending.push({ url, resolve })),
        ]),
      ),
      [SERVICE_PATH]: routes[SERVICE_PATH],
    });

    const context = assemble();
    await settle();

    expect(pending.map((request) => request.url.pathname).sort()).toEqual(
      [UNIT_PATH, ONLINE_SERVICES_PATH, catalogPath(KEY)].sort(),
    );

    for (const request of pending.splice(0)) {
      request.resolve(await routes[request.url.pathname](request.url));
    }
    await settle();

    expect(pending.map((request) => request.url.pathname)).toEqual([
      masterTextPath('B100019', '582787'),
    ]);
    for (const request of pending.splice(0)) {
      request.resolve(await routes[request.url.pathname](request.url));
    }

    await expect(context).resolves.toMatchObject({
      status: { complete: true, unavailableParts: [] },
    });
  });
});
