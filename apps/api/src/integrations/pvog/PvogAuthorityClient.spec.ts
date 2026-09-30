import {
  AuthorityAddressType,
  AuthorityContactType,
  AuthorityRole,
} from '@direktamt/integrations-contracts';
import { Logger } from '@nestjs/common';
import { FetchStub } from '../../../test/FetchStub';
import { UpstreamContractViolationException } from '../common/exceptions/UpstreamContractViolationException';
import { AuthorityReference } from './model/AuthorityReference';
import { PvogAuthorityClient } from './PvogAuthorityClient';

/**
 * Minimal synthetic payload shaped like the PVOG organisation-unit detail
 * documented in docs/INTEGRATIONS.md, section 1.5. Values are invented.
 */
const AUTHORITY_PATH = '/suchdienst/api/v5/organisationunits/detail';

const REFERENCE: AuthorityReference = {
  id: 'L100002.OE.1',
  name: 'Kundenzentrum Innenstadt',
  role: AuthorityRole.ResponsibleAuthority,
};

const AUTHORITY = {
  id: 'L100002.OE.1',
  title: 'Kundenzentrum Innenstadt',
  lastUpdate: '2026-01-01T00:00:00Z',
  languages: ['de'],
  role: { name: 'Zuständige Stelle', code: '02' },
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

  /**
   * Answers the organisation-unit detail by id; an id without a configured
   * payload answers 404 like the upstream.
   */
  function serve(authoritiesById: Record<string, unknown>) {
    fetchStub.respondWith((url) => {
      const { pathname, searchParams } = new URL(url);
      const authority =
        pathname === AUTHORITY_PATH
          ? authoritiesById[searchParams.get('q') ?? '']
          : undefined;

      return authority ? json(authority) : json({ code: 'NOT_FOUND' }, 404);
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
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps one authority with addresses, contacts and websites', async () => {
    serve({ 'L100002.OE.1': AUTHORITY });

    const authorities = await client.listAuthorities([REFERENCE]);

    expect(fetchStub.calls).toHaveLength(1);
    const url = fetchStub.lastUrl();
    expect(url.pathname).toBe(AUTHORITY_PATH);
    expect(url.searchParams.get('q')).toBe('L100002.OE.1');
    expect(url.searchParams.has('ars')).toBe(false);
    expect(url.searchParams.has('lbId')).toBe(false);

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

  it('loads multiple authorities in reference order and keeps their roles', async () => {
    const references: AuthorityReference[] = [
      { id: 'L100002.OE.1', role: AuthorityRole.ContactPoint },
      { id: 'L100002.OE.2', role: AuthorityRole.SinglePointOfContact },
      { id: 'L100002.OE.3', role: AuthorityRole.Other },
    ];
    serve(
      Object.fromEntries(
        references.map((reference) => [
          reference.id,
          { ...AUTHORITY, id: reference.id },
        ]),
      ),
    );

    const authorities = await client.listAuthorities(references);

    expect(fetchStub.calls).toHaveLength(3);
    expect(authorities.map((authority) => authority.id)).toEqual([
      'L100002.OE.1',
      'L100002.OE.2',
      'L100002.OE.3',
    ]);
    expect(authorities.map((authority) => authority.role)).toEqual([
      AuthorityRole.ContactPoint,
      AuthorityRole.SinglePointOfContact,
      AuthorityRole.Other,
    ]);
  });

  it('returns an empty list without a request when nothing is referenced', async () => {
    serve({});

    await expect(client.listAuthorities([])).resolves.toEqual([]);
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('maps an authority without optional contact data', async () => {
    serve({
      'L100002.OE.1': {
        id: 'L100002.OE.1',
        lastUpdate: '2026-01-01T00:00:00Z',
        role: { code: '02', name: 'Zuständige Stelle' },
        location: {},
      },
    });

    const authorities = await client.listAuthorities([REFERENCE]);

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
    serve({
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

    const [authority] = await client.listAuthorities([REFERENCE]);

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
    serve({
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

    const [authority] = await client.listAuthorities([REFERENCE]);

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
    serve({ 'L100002.OE.1': unit });

    await expect(client.listAuthorities([REFERENCE])).rejects.toBeInstanceOf(
      UpstreamContractViolationException,
    );
  });

  it('passes an upstream 404 for a dangling reference through', async () => {
    serve({ 'L100002.OE.1': AUTHORITY });

    await expect(
      client.listAuthorities([
        REFERENCE,
        { ...REFERENCE, id: 'L100002.OE.gone' },
      ]),
    ).rejects.toMatchObject({ status: 404 });
  });
});
