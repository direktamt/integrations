import {
  AuthorityAddressType,
  AuthorityContactType,
  AuthorityRole,
} from '@direktamt/integrations-contracts';
import { Logger } from '@nestjs/common';
import { FetchStub } from '../../../test/FetchStub';
import { testHttpClientDependencies } from '../../../test/UpstreamTestSupport';
import { UpstreamContractViolationException } from '../common/exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../common/exceptions/UpstreamHttpException';
import { AuthorityReference } from './model/AuthorityReference';
import { PvogAuthorityClient } from './PvogAuthorityClient';

/**
 * Minimal synthetic payloads shaped like the PVOG organisation-unit detail
 * and the online-service organisations relation documented in
 * docs/INTEGRATIONS.md (sections 1.5 and 1.7). Values are invented.
 */
const AUTHORITY_PATH = '/suchdienst/api/v5/organisationunits/detail';
const RELATION_PATH =
  '/suchdienst/api/v1beta2/onlineservices/L100002.OD.1/organisations';

const REFERENCE: AuthorityReference = {
  id: 'L100002.OE.1',
  name: 'Kundenzentrum Innenstadt',
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

const responsibility = (role: string, serviceId = 'L100002.LB.1') => ({
  role,
  lbId: serviceId,
  leikakeys: ['99115005104000'],
  ars: ['053150000000'],
});

const RELATION = {
  organisations: [
    {
      oeId: 'L100002.OE.1',
      name: 'Kundenzentrum Innenstadt',
      addresses: [{ type: 'ADDRESS', city: 'Köln', zip: '50667' }],
      roles: [responsibility('COMPETENT_OFFICE')],
    },
  ],
  externalLastUpdate: '2026-01-01T00:00:00Z',
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
  const client = new PvogAuthorityClient(...testHttpClientDependencies());

  /**
   * Answers the organisation-unit detail by id; an id without a configured
   * payload answers 404 like the upstream.
   */
  function serveUnits(authoritiesById: Record<string, unknown>) {
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

  describe('listAuthorities', () => {
    it('requests the service-specific view of a unit when given a scope', async () => {
      serveUnits({ 'L100002.OE.1': AUTHORITY });

      await client.listAuthorities([REFERENCE], {
        serviceId: 'L100002.LB.1',
        regionalKey: '053150000000',
      });

      const url = fetchStub.lastUrl();
      expect(url.searchParams.get('q')).toBe('L100002.OE.1');
      expect(url.searchParams.get('lbId')).toBe('L100002.LB.1');
      expect(url.searchParams.get('ars')).toBe('053150000000');
    });

    it('maps one authority with addresses, contacts and websites', async () => {
      serveUnits({ 'L100002.OE.1': AUTHORITY });

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

    it('loads multiple authorities in reference order', async () => {
      const references = ['L100002.OE.1', 'L100002.OE.2', 'L100002.OE.3'].map(
        (id) => ({ id }),
      );
      serveUnits(
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
    });

    it('limits the number of detail requests in flight', async () => {
      const references = Array.from({ length: 20 }, (_, i) => ({
        id: `L100002.OE.${i}`,
      }));
      let inFlight = 0;
      let peak = 0;
      fetchStub.respondWith((url) => {
        inFlight++;
        peak = Math.max(peak, inFlight);

        return new Promise((resolve) =>
          setTimeout(() => {
            inFlight--;
            resolve(
              new Response(
                JSON.stringify({
                  ...AUTHORITY,
                  id: new URL(url).searchParams.get('q'),
                }),
                {
                  status: 200,
                  headers: { 'content-type': 'application/json' },
                },
              ),
            );
          }, 2),
        );
      });

      const authorities = await client.listAuthorities(references);

      expect(authorities).toHaveLength(20);
      expect(fetchStub.calls).toHaveLength(20);
      expect(peak).toBeLessThanOrEqual(8);
      expect(peak).toBeGreaterThan(1);
    });

    it('returns an empty list without a request when nothing is referenced', async () => {
      serveUnits({});

      await expect(client.listAuthorities([])).resolves.toEqual([]);
      expect(fetchStub.calls).toHaveLength(0);
    });

    it('maps an authority without optional contact data', async () => {
      serveUnits({
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
          addresses: [],
          contacts: [],
          websites: [],
        },
      ]);
    });

    it('maps address types by code and drops empty address fields', async () => {
      serveUnits({
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
      serveUnits({
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
      serveUnits({ 'L100002.OE.1': unit });

      await expect(client.listAuthorities([REFERENCE])).rejects.toBeInstanceOf(
        UpstreamContractViolationException,
      );
    });

    it('passes an upstream 404 for a dangling reference through', async () => {
      serveUnits({ 'L100002.OE.1': AUTHORITY });

      await expect(
        client.listAuthorities([REFERENCE, { id: 'L100002.OE.gone' }]),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('listOnlineServiceAuthorityReferences', () => {
    it('maps one relation with its role', async () => {
      fetchStub.respondWithJson(RELATION);

      const references =
        await client.listOnlineServiceAuthorityReferences('L100002.OD.1');

      expect(fetchStub.lastUrl().pathname).toBe(RELATION_PATH);
      expect(references).toEqual([
        {
          id: 'L100002.OE.1',
          name: 'Kundenzentrum Innenstadt',
          roles: [AuthorityRole.ResponsibleAuthority],
        },
      ]);
    });

    it('encodes the online-service id in the path', async () => {
      fetchStub.respondWithJson({ organisations: [] });

      await client.listOnlineServiceAuthorityReferences('L100002.OD.1/x?y');

      expect(fetchStub.lastUrl().pathname).toBe(
        '/suchdienst/api/v1beta2/onlineservices/L100002.OD.1%2Fx%3Fy/organisations',
      );
    });

    it('maps multiple organisations with multiple, de-duplicated roles', async () => {
      fetchStub.respondWithJson({
        organisations: [
          {
            oeId: 'L100002.OE.1',
            name: 'Amt',
            roles: [
              responsibility('COMPETENT_OFFICE', 'L100002.LB.1'),
              responsibility('CONTACT_POINT', 'L100002.LB.1'),
              responsibility('COMPETENT_OFFICE', 'L100002.LB.2'),
            ],
          },
          {
            oeId: 'L100002.OE.2',
            name: 'Hotline',
            roles: [
              responsibility('SINGLE_POINT_OF_CONTACT'),
              responsibility('OTHER_SINGLE_POINT_OF_CONTACT'),
              responsibility('PROFESSIONAL_POINT_OF_CONTACT'),
              responsibility('TECHNICAL_POINT_OF_CONTACT'),
              responsibility('TECHNICAL_CONTACT_FOR_THE_OPERATING_PLATFORM'),
              responsibility('UNKNOWN'),
              responsibility('SOMETHING_NEW'),
            ],
          },
          { oeId: 'L100002.OE.3', name: '' },
        ],
      });

      const references =
        await client.listOnlineServiceAuthorityReferences('L100002.OD.1');

      expect(references).toEqual([
        {
          id: 'L100002.OE.1',
          name: 'Amt',
          roles: [
            AuthorityRole.ResponsibleAuthority,
            AuthorityRole.ContactPoint,
          ],
        },
        {
          id: 'L100002.OE.2',
          name: 'Hotline',
          roles: [
            AuthorityRole.SinglePointOfContact,
            AuthorityRole.OtherSinglePointOfContact,
            AuthorityRole.ProfessionalPointOfContact,
            AuthorityRole.TechnicalPointOfContact,
            AuthorityRole.TechnicalContactForOperatingPlatform,
            AuthorityRole.Other,
          ],
        },
        { id: 'L100002.OE.3', name: undefined, roles: [] },
      ]);
    });

    it('merges an organisation listed more than once into one reference', async () => {
      fetchStub.respondWithJson({
        organisations: [
          { oeId: 'L100002.OE.1', roles: [responsibility('COMPETENT_OFFICE')] },
          {
            oeId: 'L100002.OE.2',
            name: 'Andere',
            roles: [responsibility('CONTACT_POINT')],
          },
          {
            oeId: 'L100002.OE.1',
            name: 'Amt',
            roles: [
              responsibility('CONTACT_POINT'),
              responsibility('COMPETENT_OFFICE'),
            ],
          },
        ],
      });

      const references =
        await client.listOnlineServiceAuthorityReferences('L100002.OD.1');

      expect(references).toEqual([
        {
          id: 'L100002.OE.1',
          name: 'Amt',
          roles: [
            AuthorityRole.ResponsibleAuthority,
            AuthorityRole.ContactPoint,
          ],
        },
        {
          id: 'L100002.OE.2',
          name: 'Andere',
          roles: [AuthorityRole.ContactPoint],
        },
      ]);
    });

    it.each([
      ['an empty relation', { organisations: [] }],
      ['no relation at all', {}],
    ])('returns an empty list for %s', async (_label, body) => {
      fetchStub.respondWithJson(body);

      await expect(
        client.listOnlineServiceAuthorityReferences('L100002.OD.1'),
      ).resolves.toEqual([]);
    });

    it('passes an upstream 404 for an unknown online service through', async () => {
      fetchStub.respondWithJson({ code: 'NOT_FOUND' }, 404);

      const failure =
        client.listOnlineServiceAuthorityReferences('L100002.OD.gone');

      await expect(failure).rejects.toBeInstanceOf(UpstreamHttpException);
      await expect(failure).rejects.toMatchObject({ status: 404 });
    });

    it.each([
      ['organisations that are not a list', { organisations: 'Amt' }],
      ['an organisation without an id', { organisations: [{ name: 'Amt' }] }],
      [
        'roles that are not a list',
        {
          organisations: [{ oeId: 'L100002.OE.1', roles: 'COMPETENT_OFFICE' }],
        },
      ],
      [
        'a role that is not a string',
        { organisations: [{ oeId: 'L100002.OE.1', roles: [{ role: 2 }] }] },
      ],
      ['a top-level list', [RELATION]],
    ])('rejects a malformed relation contract: %s', async (_label, body) => {
      fetchStub.respondWithJson(body);

      await expect(
        client.listOnlineServiceAuthorityReferences('L100002.OD.1'),
      ).rejects.toBeInstanceOf(UpstreamContractViolationException);
    });
  });
});
