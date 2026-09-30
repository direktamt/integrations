import {
  AuthorityAddressType,
  AuthorityContactType,
  AuthorityRole,
} from '@direktamt/integrations-contracts';
import { Logger } from '@nestjs/common';
import { FetchStub } from '../../../test/FetchStub';
import { UpstreamContractViolationException } from '../common/exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../common/exceptions/UpstreamHttpException';
import { PvogAuthorityClient } from './PvogAuthorityClient';

/**
 * Minimal synthetic payloads shaped like the PVOG Suchdienst responses
 * documented in docs/INTEGRATIONS.md (sections 1.4 and 1.5). Values are
 * invented.
 */
const SERVICE_PATH =
  '/suchdienst/api/v6/servicedescriptions/L100002.LB.1/detail';
const AUTHORITY_PATH = '/suchdienst/api/v5/organisationunits/detail';

const ROLE = {
  name: 'Zuständige Stelle',
  code: '02',
  uri: 'urn:xoev-de:fim:codeliste:xzufi.zustaendigkeitsrolle',
  version: '1',
};

const REFERENCE = {
  id: 'L100002.OE.1',
  title: 'Kundenzentrum Innenstadt',
  role: ROLE,
  criteria: [],
};

const AUTHORITY = {
  id: 'L100002.OE.1',
  title: 'Kundenzentrum Innenstadt',
  lastUpdate: '2026-01-01T00:00:00Z',
  languages: ['de'],
  role: ROLE,
  location: {
    addresses: [
      {
        code: '001',
        type: 'Hausanschrift',
        street: 'Laurenzplatz',
        houseNumber: '1-3',
        zip: '50667',
        city: 'Köln, Stadt',
        geo: { longitude: '6.95', latitude: '50.93', system: 'EPSG:4326' },
      },
    ],
    communications: [
      { code: '01', name: 'E-Mail', value: 'innenstadt@example.test' },
      { code: '02', name: 'Telefon Festnetz', value: '0221 / 221-0' },
      { code: '04', name: 'Fax', value: '0221 / 221-1', additional: '' },
    ],
    information: [],
    urls: [{ uri: 'https://example.test/office', title: 'Standort' }],
  },
  internetAddresses: [{ uri: 'https://example.test', title: 'Website' }],
  additionalInformation: [],
  employees: [],
  nestedForms: [],
  extraneous: 'dropped',
};

function service(organisations?: unknown[]) {
  return {
    id: 'L100002.LB.1',
    name: 'Wohnsitz anmelden',
    leikakeys: ['99115005104000'],
    ars: ['053150000000'],
    details: [],
    ...(organisations === undefined ? {} : { organisations }),
  };
}

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('PvogAuthorityClient', () => {
  const fetchStub = new FetchStub();
  const client = new PvogAuthorityClient();
  let errorSpy: jest.SpyInstance;

  /**
   * Routes the service detail and the organisation-unit detail by path; a
   * unit id without a configured payload answers 404 like the upstream.
   */
  function serve(
    serviceBody: unknown,
    authoritiesById: Record<string, unknown>,
  ) {
    fetchStub.respondWith((url) => {
      const { pathname, searchParams } = new URL(url);

      if (pathname === SERVICE_PATH) return json(serviceBody);
      if (pathname === AUTHORITY_PATH) {
        const authority = authoritiesById[searchParams.get('q') ?? ''];

        return authority ? json(authority) : json({ code: 'NOT_FOUND' }, 404);
      }
      return json({ code: 'NOT_FOUND' }, 404);
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
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists one authority with addresses, contacts and websites', async () => {
    serve(service([REFERENCE]), { 'L100002.OE.1': AUTHORITY });

    const authorities = await client.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    expect(fetchStub.calls).toHaveLength(2);
    const serviceUrl = new URL(fetchStub.calls[0].url);
    expect(serviceUrl.pathname).toBe(SERVICE_PATH);
    expect(serviceUrl.searchParams.get('ars')).toBe('053150000000');
    expect(serviceUrl.searchParams.get('useArsHierarchy')).toBe('true');
    const authorityUrl = new URL(fetchStub.calls[1].url);
    expect(authorityUrl.pathname).toBe(AUTHORITY_PATH);
    expect(authorityUrl.searchParams.get('q')).toBe('L100002.OE.1');
    expect(authorityUrl.searchParams.has('ars')).toBe(false);
    expect(authorityUrl.searchParams.has('lbId')).toBe(false);

    expect(authorities).toEqual([
      {
        id: 'L100002.OE.1',
        name: 'Kundenzentrum Innenstadt',
        role: AuthorityRole.ResponsibleAuthority,
        addresses: [
          {
            type: AuthorityAddressType.Visiting,
            street: 'Laurenzplatz',
            houseNumber: '1-3',
            postalCode: '50667',
            city: 'Köln, Stadt',
            postBox: undefined,
          },
        ],
        contacts: [
          {
            type: AuthorityContactType.Email,
            value: 'innenstadt@example.test',
            label: 'E-Mail',
            description: undefined,
          },
          {
            type: AuthorityContactType.Phone,
            value: '0221 / 221-0',
            label: 'Telefon Festnetz',
            description: undefined,
          },
          {
            type: AuthorityContactType.Fax,
            value: '0221 / 221-1',
            label: 'Fax',
            description: undefined,
          },
        ],
        websites: ['https://example.test/office', 'https://example.test'],
      },
    ]);
  });

  it('lists multiple authorities in upstream order with their roles', async () => {
    const references = [
      { ...REFERENCE, id: 'L100002.OE.1', role: { ...ROLE, code: '01' } },
      { ...REFERENCE, id: 'L100002.OE.2', role: { ...ROLE, code: '03' } },
      { ...REFERENCE, id: 'L100002.OE.3', role: { ...ROLE, code: '11' } },
      { ...REFERENCE, id: 'L100002.OE.4', role: { ...ROLE, code: '19' } },
      { ...REFERENCE, id: 'L100002.OE.5', role: { ...ROLE, code: '99' } },
      { ...REFERENCE, id: 'L100002.OE.6', role: undefined },
    ];
    serve(
      service(references),
      Object.fromEntries(
        references.map((reference) => [
          reference.id,
          { ...AUTHORITY, id: reference.id },
        ]),
      ),
    );

    const authorities = await client.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      false,
    );

    expect(fetchStub.calls).toHaveLength(7);
    expect(
      new URL(fetchStub.calls[0].url).searchParams.get('useArsHierarchy'),
    ).toBe('false');
    expect(authorities.map((authority) => authority.id)).toEqual([
      'L100002.OE.1',
      'L100002.OE.2',
      'L100002.OE.3',
      'L100002.OE.4',
      'L100002.OE.5',
      'L100002.OE.6',
    ]);
    expect(authorities.map((authority) => authority.role)).toEqual([
      AuthorityRole.ResponsibleAuthorityAndContactPoint,
      AuthorityRole.ContactPoint,
      AuthorityRole.SinglePointOfContact,
      AuthorityRole.OtherSinglePointOfContact,
      AuthorityRole.Other,
      AuthorityRole.Other,
    ]);
  });

  it('maps an authority without optional contact data', async () => {
    serve(service([REFERENCE]), {
      'L100002.OE.1': {
        id: 'L100002.OE.1',
        lastUpdate: '2026-01-01T00:00:00Z',
        role: ROLE,
        location: {},
      },
    });

    const authorities = await client.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    expect(authorities).toEqual([
      {
        id: 'L100002.OE.1',
        name: 'Kundenzentrum Innenstadt',
        role: AuthorityRole.ResponsibleAuthority,
        addresses: [],
        contacts: [],
        websites: [],
      },
    ]);
  });

  it('maps address types by code and drops empty address fields', async () => {
    serve(service([REFERENCE]), {
      'L100002.OE.1': {
        ...AUTHORITY,
        location: {
          addresses: [
            {
              code: '001',
              type: 'Hausanschrift',
              street: 'Laurenzplatz',
              houseNumber: '1',
              zip: '50667',
              city: 'Köln',
            },
            {
              code: '006',
              type: 'Postanschrift',
              postbox: 'Postfach 1',
              zip: '50601',
              city: 'Köln',
              street: '',
            },
            {
              code: '005',
              type: 'Lieferanschrift',
              street: 'Am Hof',
              city: 'Köln',
            },
            { code: '999', type: 'Unbekannt', city: 'Köln' },
          ],
        },
      },
    });

    const [authority] = await client.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    expect(authority.addresses).toEqual([
      {
        type: AuthorityAddressType.Visiting,
        street: 'Laurenzplatz',
        houseNumber: '1',
        postalCode: '50667',
        city: 'Köln',
        postBox: undefined,
      },
      {
        type: AuthorityAddressType.Postal,
        street: undefined,
        houseNumber: undefined,
        postalCode: '50601',
        city: 'Köln',
        postBox: 'Postfach 1',
      },
      {
        type: AuthorityAddressType.Delivery,
        street: 'Am Hof',
        houseNumber: undefined,
        postalCode: undefined,
        city: 'Köln',
        postBox: undefined,
      },
      {
        type: AuthorityAddressType.Other,
        street: undefined,
        houseNumber: undefined,
        postalCode: undefined,
        city: 'Köln',
        postBox: undefined,
      },
    ]);
  });

  it('maps contact channels by code and de-duplicates websites', async () => {
    serve(service([REFERENCE]), {
      'L100002.OE.1': {
        ...AUTHORITY,
        location: {
          communications: [
            { code: '03', name: 'Telefon mobil', value: '0151 1' },
            { code: '09', name: 'Web', value: 'https://example.test' },
            {
              code: '10',
              name: 'Web sicher',
              value: 'https://secure.example.test',
            },
            {
              code: '11',
              name: 'Kontaktformular sicher',
              value: 'https://forms.example.test',
              valueAdditional: 'Sicheres Kontaktformular',
            },
            { code: '07', name: 'Sonstiges', value: '  ' },
            { code: '01', name: 'E-Mail' },
          ],
          urls: [
            { uri: 'https://example.test/office' },
            { uri: 'https://example.test/office', title: 'again' },
            { title: 'no uri' },
            { uri: '' },
          ],
        },
        internetAddresses: [
          { uri: 'https://example.test/office' },
          { uri: 'https://example.test/other' },
        ],
      },
    });

    const [authority] = await client.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    expect(authority.contacts).toEqual([
      {
        type: AuthorityContactType.Phone,
        value: '0151 1',
        label: 'Telefon mobil',
        description: undefined,
      },
      {
        type: AuthorityContactType.Web,
        value: 'https://example.test',
        label: 'Web',
        description: undefined,
      },
      {
        type: AuthorityContactType.Web,
        value: 'https://secure.example.test',
        label: 'Web sicher',
        description: undefined,
      },
      {
        type: AuthorityContactType.Other,
        value: 'https://forms.example.test',
        label: 'Kontaktformular sicher',
        description: 'Sicheres Kontaktformular',
      },
    ]);
    expect(authority.websites).toEqual([
      'https://example.test/office',
      'https://example.test/other',
    ]);
  });

  it.each([
    ['an empty relation', service([])],
    ['no relation at all', service()],
  ])(
    'returns an empty list for %s without further calls',
    async (_label, body) => {
      serve(body, {});

      await expect(
        client.listServiceAuthorities('L100002.LB.1', '053150000000', true),
      ).resolves.toEqual([]);
      expect(fetchStub.calls).toHaveLength(1);
    },
  );

  it('rejects an authority reference without an id before loading details', async () => {
    serve(service([{ title: 'Kundenzentrum ohne Id', role: ROLE }]), {});

    await expect(
      client.listServiceAuthorities('L100002.LB.1', '053150000000', true),
    ).rejects.toBeInstanceOf(UpstreamContractViolationException);
    expect(fetchStub.calls).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it.each([
    ['a unit without an id', { ...AUTHORITY, id: undefined }],
    [
      'addresses that are not a list',
      { ...AUTHORITY, location: { addresses: 'Laurenzplatz 1' } },
    ],
    [
      'a contact value that is not a string',
      {
        ...AUTHORITY,
        location: { communications: [{ code: '02', value: 2210 }] },
      },
    ],
  ])('rejects a malformed unit contract: %s', async (_label, unit) => {
    serve(service([REFERENCE]), { 'L100002.OE.1': unit });

    await expect(
      client.listServiceAuthorities('L100002.LB.1', '053150000000', true),
    ).rejects.toBeInstanceOf(UpstreamContractViolationException);
  });

  it('passes an upstream 404 for an unknown service through', async () => {
    fetchStub.respondWithJson({ code: 'NOT_FOUND' }, 404);

    const failure = client.listServiceAuthorities(
      'L100002.LB.1',
      '053150000000',
      true,
    );

    await expect(failure).rejects.toBeInstanceOf(UpstreamHttpException);
    await expect(failure).rejects.toMatchObject({ status: 404 });
    expect(fetchStub.calls).toHaveLength(1);
  });

  it('passes an upstream 404 for a dangling authority reference through', async () => {
    serve(service([REFERENCE, { ...REFERENCE, id: 'L100002.OE.gone' }]), {
      'L100002.OE.1': AUTHORITY,
    });

    await expect(
      client.listServiceAuthorities('L100002.LB.1', '053150000000', true),
    ).rejects.toMatchObject({ status: 404 });
  });
});
