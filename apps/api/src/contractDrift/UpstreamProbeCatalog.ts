import { CONFIG } from '../config';
import { WireCatalogEntry } from '../integrations/fim/wire/WireCatalogEntry';
import { WireCatalogSearchResponse } from '../integrations/fim/wire/WireCatalogSearchResponse';
import { WireV7ServiceSearchResponse } from '../integrations/pvog/serviceSearch/v7/wire/WireV7ServiceSearchResponse';
import { WireV8ServiceSearchResponse } from '../integrations/pvog/serviceSearch/v8beta1/wire/WireV8ServiceSearchResponse';
import { WireAuthority } from '../integrations/pvog/wire/WireAuthority';
import { WireLocationDetails } from '../integrations/pvog/wire/WireLocationDetails';
import { WireLocationSuggestion } from '../integrations/pvog/wire/WireLocationSuggestion';
import { WireOnlineServiceAuthoritiesResponse } from '../integrations/pvog/wire/WireOnlineServiceAuthoritiesResponse';
import { WireOnlineServicesResponse } from '../integrations/pvog/wire/WireOnlineServicesResponse';
import { WireServiceDescription } from '../integrations/pvog/wire/WireServiceDescription';
import { ProbeKind, UpstreamProbe } from './UpstreamProbe';

/**
 * Stable, public reference identifiers used by the handbook: the city of
 * Köln, its "Wohnsitz anmelden" service, one of its customer centres and the
 * federal catalog entry of the same service. No personal data, read-only.
 */
const KOELN_ARS = '053150000000';
const KOELN_SERVICE_ID = 'L100002.LB.121407320';
const KOELN_ONLINE_SERVICE_ID = 'L100002.OD.121797650';
const KOELN_ORGANISATION_UNIT_ID = 'L100002.OE.146016735';
const LEIKA_KEY = '99115005104000';
const FIM_EDITORIAL_OFFICE_ID = 'B100019';
const FIM_SERVICE_ID = '582787';

function url(
  base: string,
  path: string,
  params: Record<string, string> = {},
): string {
  const target = new URL(base + path);

  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }

  return target.toString();
}

/**
 * One probe per implemented upstream endpoint — the surface documented as
 * "implemented" in apps/api/docs/INTEGRATIONS.md. Keep this list in step
 * with the clients; the handbook section is the cross-reference.
 * `knownUndeclaredFields` is the baseline of upstream fields the wire models
 * deliberately ignore (state of 2026-09-30); a field that is neither
 * declared nor listed here is reported as ADDITIVE drift, so extend the
 * baseline or the wire model deliberately, never silently.
 */
export function buildUpstreamProbes(): UpstreamProbe[] {
  const pvog = CONFIG.integrations.pvogSearchBaseUrl;
  const fim = CONFIG.integrations.fimPortalBaseUrl;

  return [
    {
      provider: 'PVOG',
      endpoint: 'GET /v3/locations/suggestions',
      handbookSection: '1.1',
      url: url(pvog, '/v3/locations/suggestions', { q: 'Köln', limit: '5' }),
      kind: ProbeKind.Wire,
      wireModel: WireLocationSuggestion,
      expectsArray: true,
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v3/locations/details',
      handbookSection: '1.2',
      url: url(pvog, '/v3/locations/details', {
        ort: 'Köln',
        distinctBy: 'ARS',
        limit: '3',
      }),
      kind: ProbeKind.Wire,
      wireModel: WireLocationDetails,
      expectsArray: true,
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v3/locations/ars',
      handbookSection: '1.2',
      url: url(pvog, '/v3/locations/ars', { ars: KOELN_ARS }),
      kind: ProbeKind.Wire,
      wireModel: WireLocationDetails,
      expectsArray: true,
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v7/servicedescriptions/{ars}',
      handbookSection: '1.3',
      url: url(pvog, `/v7/servicedescriptions/${KOELN_ARS}`, {
        q: 'Wohnsitz anmelden',
        size: '5',
      }),
      kind: ProbeKind.Wire,
      wireModel: WireV7ServiceSearchResponse,
      knownUndeclaredFields: [
        'serviceDescriptions.content[].details[].additionalInformation',
        'serviceDescriptions.content[].details[].replace',
        'serviceDescriptions.content[].externalLastUpdate',
        'serviceDescriptions.content[].languageCode',
        'serviceDescriptions.content[].languageComplete',
        'serviceDescriptions.content[].lastUpdate',
        'serviceDescriptions.content[].onlineServiceLinks',
        'serviceDescriptions.content[].organisationIds',
        'serviceDescriptions.content[].sdgInformation',
        'serviceDescriptions.content[].sourcePortals',
        'serviceDescriptions.content[].suggest',
        'serviceDescriptions.content[].synonyms',
        'serviceDescriptions.content[].teaser',
        'serviceDescriptions.content[].timestamp',
        'serviceDescriptions.content[].typing',
        'serviceDescriptions.content[].validFrom',
        'serviceDescriptions.content[].validTo',
        'serviceDescriptions.content[].validityPeriods',
        'serviceDescriptions.empty',
        'serviceDescriptions.first',
        'serviceDescriptions.last',
        'serviceDescriptions.numberOfElements',
        'serviceDescriptions.pageable',
      ],
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v8beta1/servicedescriptions',
      handbookSection: '1.3.1',
      url: url(pvog, '/v8beta1/servicedescriptions', {
        ars: KOELN_ARS,
        q: 'Wohnsitz anmelden',
        size: '5',
      }),
      kind: ProbeKind.Wire,
      wireModel: WireV8ServiceSearchResponse,
      knownUndeclaredFields: [
        'serviceDescriptions.content[].name',
        'serviceDescriptions.content[].teaser',
        'serviceDescriptions.content[].languageComplete',
        'serviceDescriptions.content[].onlineServiceLinks',
      ],
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v6/servicedescriptions/{lbid}/detail',
      handbookSection: '1.4',
      url: url(pvog, `/v6/servicedescriptions/${KOELN_SERVICE_ID}/detail`, {
        ars: KOELN_ARS,
      }),
      kind: ProbeKind.Wire,
      wireModel: WireServiceDescription,
      knownUndeclaredFields: [
        'details[].additionalInformation',
        'details[].accessChannel',
        'externalLastUpdate',
        'forms',
        'languageCode',
        'languageComplete',
        'lastUpdate',
        'onlineServiceLinks',
        'organisations[].role.uri',
        'organisations[].role.version',
        'organisations[].criteria',
        'personalMatters',
        'validityPeriods',
      ],
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v5/organisationunits/detail',
      handbookSection: '1.5',
      url: url(pvog, '/v5/organisationunits/detail', {
        q: KOELN_ORGANISATION_UNIT_ID,
      }),
      kind: ProbeKind.Wire,
      wireModel: WireAuthority,
      knownUndeclaredFields: [
        'additionalInformation',
        'bankAccounts',
        'communicationSystems',
        'employees',
        'languageComplete',
        'languages',
        'lastUpdate',
        'location.addresses[].geo',
        'location.communications[].additional',
        'location.information',
        'nestedForms',
        'role',
      ],
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v1beta2/onlineservices',
      handbookSection: '1.6',
      url: url(pvog, '/v1beta2/onlineservices', {
        ars: KOELN_ARS,
        leikaIds: LEIKA_KEY,
      }),
      kind: ProbeKind.Wire,
      wireModel: WireOnlineServicesResponse,
      pagination: {
        tokenField: 'nextPageToken',
        tokenParameter: 'nextPageToken',
        maxPages: 3,
      },
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v1beta2/onlineservices/{odId}/organisations',
      handbookSection: '1.7',
      url: url(
        pvog,
        `/v1beta2/onlineservices/${KOELN_ONLINE_SERVICE_ID}/organisations`,
      ),
      kind: ProbeKind.Wire,
      wireModel: WireOnlineServiceAuthoritiesResponse,
      knownUndeclaredFields: [
        'organisations[].addresses',
        'organisations[].roles[].lbId',
        'organisations[].roles[].leikakeys',
        'organisations[].roles[].ars',
      ],
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v1/servicedescriptions/{id}/jzufi-2-3',
      handbookSection: '1.8',
      url: url(pvog, `/v1/servicedescriptions/${KOELN_SERVICE_ID}/jzufi-2-3`),
      kind: ProbeKind.Raw,
      instability:
        'provider representation (JZuFi 2.3), passed through without a wire model',
    },
    {
      provider: 'PVOG',
      endpoint: 'GET /v1/onlineservices/{id}/jzufi-2-3',
      handbookSection: '1.8',
      url: url(pvog, `/v1/onlineservices/${KOELN_ONLINE_SERVICE_ID}/jzufi-2-3`),
      kind: ProbeKind.Raw,
      instability:
        'provider representation (JZuFi 2.3), passed through without a wire model',
    },
    {
      provider: 'FIM',
      endpoint: 'GET /v0/leistung-steckbriefe',
      handbookSection: '2.1',
      url: url(fim, '/v0/leistung-steckbriefe', {
        fts_query: 'Anmeldung',
        limit: '2',
      }),
      kind: ProbeKind.Wire,
      wireModel: WireCatalogSearchResponse,
      knownUndeclaredFields: [
        'items[].leistungsadressat',
        'items[].klassifizierung',
        'items[].leistung_stammtexte',
        'items[].ozg',
        'items[].fts_match',
      ],
    },
    {
      provider: 'FIM',
      endpoint: 'GET /v0/leistung-steckbriefe/{leistungsschluessel}',
      handbookSection: '2.1',
      url: url(fim, `/v0/leistung-steckbriefe/${LEIKA_KEY}`),
      kind: ProbeKind.Wire,
      wireModel: WireCatalogEntry,
      knownUndeclaredFields: [
        'leistungsadressat',
        'klassifizierung',
        'leistung_stammtexte',
        'prozessklasse',
        'ozg',
        'replacements',
      ],
    },
    {
      provider: 'FIM',
      endpoint:
        'GET /v0/leistung-stammtexte/{redaktion_id}/{leistung_id}/{source}/parsed-xzufi',
      handbookSection: '2.2',
      url: url(
        fim,
        `/v0/leistung-stammtexte/${FIM_EDITORIAL_OFFICE_ID}/${FIM_SERVICE_ID}/primary/parsed-xzufi`,
      ),
      kind: ProbeKind.Raw,
      instability:
        'declared unstable by the operator, not recommended for live products',
    },
  ];
}
