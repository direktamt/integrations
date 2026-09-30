# Integrations handbook

Reference for the external, government-operated APIs that DirektAmt
Integrations depends on. Every endpoint marked ✅ was verified with a live
request on **2026-09-30**. Endpoints without that mark were not exercised and
are listed for reference only.

## Contents

1. [Overview](#overview)
2. [PVOG Suchdienst API](#1-pvog-suchdienst-api-public)
3. [FIM Portal API](#2-fim-portal-api-public)
4. [PVOG Bereitstelldienst](#3-pvog-bereitstelldienst-access-on-request)
5. [Verification procedure](#verification-procedure)
6. [Glossary](#glossary)
7. [Changelog](#changelog)

## Overview

| API                    | Base URL                                | Auth                 | Integration role                                                                                                                  |
| ---------------------- | --------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| PVOG Suchdienst        | `https://pvog.fitko.net/suchdienst/api` | none                 | Implemented: location autocomplete and resolution, service search, service details, responsible authorities, online-service links |
| FIM Portal             | `https://fimportal.de/api`              | none                 | Implemented: LeiKa service catalog, federal master texts                                                                          |
| PVOG Bereitstelldienst | issued after approval                   | application required | Reference / not implemented: bulk access to the PVOG data set                                                                     |

Status labels used in this document:

```text
Implemented   called by a client in apps/api/src/integrations
Reference     documented upstream capability, not called by this project
Deprecated    announced for removal by the operator
```

> The legacy Suchdienst API host under `pvog.fitko.de` was replaced by the
> production API at `pvog.fitko.net`. According to the API description the
> legacy production endpoints were switched off on 2026-08-01; on 2026-09-30
> they answered 404. The `pvog.fitko.de` domain itself remains in use for the
> PVOG Product Portal and its documentation.

---

## 1. PVOG Suchdienst API (public)

**Base URL:** `https://pvog.fitko.net/suchdienst/api`
**OpenAPI document:** `GET /v3/api-docs` ✅ (OpenAPI 3; the document declares
CC BY-SA 4.0 for itself)
**Operator:** FITKO (Föderale IT-Kooperation); the service is run by Dataport
**Documentation:** <https://produktportal.pvog.fitko.de/docs/suchdienst/doku/>
**Deprecations:** <https://produktportal.pvog.fitko.de/api/deprecations/>
**Release notes:** <https://produktportal.pvog.fitko.de/release-notes/>

The PVOG (Portalverbund-Onlinegateway) aggregates official service
descriptions, responsibilities (Zuständigkeiten) and online-service links
from the 16 state editorial systems and the federal editorial office. The
Suchdienst is its public, unauthenticated search interface.

**Versioning.** Every endpoint carries a version segment in its path (`v3`,
`v7`, …). A new version is published alongside the old one, the old one is
marked deprecated, and deprecated endpoints are removed after a transition
period of at least three months on 1 February, 1 May, 1 August or
1 November. Deprecated endpoints answer with the HTTP header
`X-Pvog-Deprecated: true`.

**Client ID.** PVOG offers an optional Client ID (UUID) for Suchdienst
consumers, sent in the `pvog-sud-api-client-id` request header, so that the
operator can contact consumers about API changes. It is optional and not used
by this project. See
<https://produktportal.pvog.fitko.de/docs/ressourcen/client-id/>.

**Error format.** 4xx responses are JSON objects with `code`, `codeNumber`,
`message`, `requestId` and `timestamp`; parameter validation errors add a
`fields` object, e.g. `{"code":"BAD_REQUEST","codeNumber":1901,"fields":{"size":"must be greater than or equal to 5"},…}`.

### 1.1 Location autocomplete ✅ (implemented)

```
GET /v3/locations/suggestions?q={prefix}&limit={1..25}
```

Prefix search over city names, districts and postal codes.

Request:

```
GET https://pvog.fitko.net/suchdienst/api/v3/locations/suggestions?q=Köln
```

Response:

```json
[
  { "name": "Köln", "weight": 1.889993 },
  { "name": "51107 Köln - Eil", "weight": 1.8624566 }
]
```

Wire model: `WireLocationSuggestion` (`weight` → `relevance`).
Used by `GET /locations/suggestions`.

### 1.2 Resolve city name or postal code to ARS ✅ (implemented)

ARS (Amtlicher Regionalschlüssel) is the 12-digit territory key every other
call is based on. Location data comes from the BKG (Federal Agency for
Cartography and Geodesy).

```
GET /v3/locations/details?ort={name}          # by city name
GET /v3/locations/details?plz={postalCode}    # by postal code
GET /v3/locations/ars?ars={ars}               # reverse: ARS → location data ✅
```

At least one of `ort` or `plz` is required. Optional parameters: `strasse`,
`hausnummer`, `limit` (1–25, default 10), `filterBy`, `distinctBy` (for
example `ARS`), `ortsteil` (default `true`).

Request:

```
GET https://pvog.fitko.net/suchdienst/api/v3/locations/details?ort=Köln&distinctBy=ARS&limit=3
```

Response:

```json
[
  {
    "ars": "053150000000",
    "arsFederalstate": "05",
    "name": "Köln 'Altstadt-Nord'",
    "gemeinde": "Köln",
    "plz": "50667",
    "koordinaten": ["6.953969", "50.938681"]
  }
]
```

`/v3/locations/ars` returns the same shape; an unknown ARS yields `200 []`.

Wire model: `WireLocationDetails`. Used by `GET /locations` and
`GET /locations/{regionalKey}`. The client requests `distinctBy=ARS` and caps
`limit` at 10.

### 1.3 Search services for a territory ✅ (implemented)

```
GET /v7/servicedescriptions/{ars}?q={query}
```

| Param                | Default | Meaning                                                                |
| -------------------- | ------- | ---------------------------------------------------------------------- |
| `q`                  | —       | search term(s), free text; repeatable                                  |
| `size` / `page`      | 10 / 0  | pagination (size 5–9999, page 0–100)                                   |
| `fuzzysearch`        | false   | tolerate typos                                                         |
| `useArsHierarchy`    | true    | also return state/federal descriptions that apply to this municipality |
| `personalMatters`    | —       | filter by life-situation codes (Lebenslagen)                           |
| `facades`            | false   | additionally return an aggregation of matching life situations         |
| `validDate`          | —       | validity date `yyyy-MM-dd`                                             |
| `ignoreLeikaTypes`   | `[]`    | exclude LeiKa typisation codes                                         |
| `applyDynamicParams` | false   | extend online-service links with dynamic query parameters (XZuFi)      |

A `size` below 5 is rejected with 400. The integrations API validates `size`
(5–9999) and `page` (0–100) locally and answers 400 before calling upstream.

Request:

```
GET https://pvog.fitko.net/suchdienst/api/v7/servicedescriptions/053150000000?q=Wohnsitz anmelden&size=5
```

Response shape (about 70 KB for this query on 2026-09-30; trimmed):

```json
{
  "facades": { "personalMatters": [] },
  "serviceDescriptions": {
    "content": [
      {
        "id": "L100002.LB.121407320",
        "name": "Wohnsitz anmelden",
        "description": "...",
        "leikakeys": ["99115005104000"],
        "ars": ["053150000000"],
        "arsFederalstate": ["05"],
        "addressees": [],
        "availableLanguages": ["de", "en"],
        "details": [
          {
            "@type": "_module",
            "code": "14",
            "title": "Erforderliche Unterlagen",
            "text": "<p>...</p>",
            "xZufiCategory": "TEXT_MODUL",
            "links": [{ "uri": "https://...", "title": "..." }],
            "filled": true,
            "placeholder": false
          }
        ]
      }
    ],
    "totalElements": "...",
    "totalPages": "..."
  }
}
```

Content items also carry fields this project does not consume (`teaser`,
`onlineServiceLinks`, `sdgInformation`, `sourcePortals`, `synonyms`,
`typing`, validity periods, timestamps); the wire model drops them.

Each service is delivered as a list of `details` sections. Section titles
observed in live data: `Kurzinfo`, `Leistungsbezeichnung`, `Beschreibung`,
`Voraussetzungen`, `Erforderliche Unterlagen`, `Formulare`,
`Kosten & Gebühren` (`xZufiCategory: KOSTEN`), `Fristen` (`FRIST`),
`Verfahrensablauf`, `Bearbeitungsdauer`, `Rechtsbehelf`,
`Rechtsgrundlage(n)`, `Zuständige Stelle`, `Ansprechpunkt`,
`weiterführende Informationen`, `Urheber`. The client maps known titles to
`ServiceSectionType` and everything else to `OTHER`.

> ⚠️ Section `text` values are **HTML free text** as published by the
> authority. Treat them as untrusted content and sanitize before rendering.

Wire models: `WireServiceSearchResponse`, `WireServiceDescriptionPage`,
`WireServiceDescription`, `WireServiceSection`, `WireLink`.
Used by `GET /services`.

### 1.4 Service detail by id ✅ (implemented)

```
GET /v6/servicedescriptions/{lbid}/detail?ars={ars}&useArsHierarchy={bool}
```

`ars` is required (400 without it). Returns one object shaped like a 1.3
`content[]` item (`id`, `name`, `leikakeys`, `ars`, `details[]`) plus
`organisations[]` — the responsible organisation units with their roles,
consumed by 1.5 — and `forms`, `onlineServiceLinks`, `personalMatters` and
validity data that this project does not consume. An unknown `lbid`, or a
known `lbid` with an `ars` the description does not apply to, yields 404,
which the integrations API passes on as 404.

Wire model: `WireServiceDescription` (with `WireAuthorityReference` for
`organisations[]`). Used by `GET /services/{id}` and, for the
`organisations[]` list, by `GET /services/{id}/authorities` (1.5).

### 1.5 Responsible authorities (Organisationseinheiten) ✅ (implemented)

`GET /services/{id}/authorities` composes two upstream calls:

```
GET /v6/servicedescriptions/{lbid}/detail?ars={ars}&useArsHierarchy={bool}   # organisations[] (1.4)
GET /v5/organisationunits/detail?q={organisationUnitId}                     # one call per listed unit
```

The service detail lists the responsible organisation units in
`organisations[]` as a reduced view: `id`, `title`, `role` (XZuFi code list
`xzufi.zustaendigkeitsrolle`) and `criteria`. The role is already resolved
for the requested territory and hierarchy setting. The organisation-unit
detail then supplies addresses, contact channels and web addresses.

Request (first unit of the Köln reference service):

```
GET https://pvog.fitko.net/suchdienst/api/v5/organisationunits/detail?q=L100002.OE.146016735
```

Response (trimmed):

```json
{
  "id": "L100002.OE.146016735",
  "title": "Kundenzentrum Chorweiler",
  "lastUpdate": "2026-09-30T09:55:34Z",
  "languages": ["de"],
  "role": {
    "name": "Zuständige Stelle",
    "code": "02",
    "uri": "urn:xoev-de:fim:codeliste:xzufi.zustaendigkeitsrolle",
    "version": "1"
  },
  "location": {
    "addresses": [
      {
        "code": "001",
        "type": "Hausanschrift",
        "street": "Pariser Platz",
        "houseNumber": "1 (1. Etage)",
        "zip": "50765",
        "city": "Köln, Stadt",
        "geo": {
          "longitude": "6.899202",
          "latitude": "51.022305",
          "system": "EPSG:4326"
        }
      }
    ],
    "communications": [
      {
        "code": "01",
        "name": "E-Mail",
        "value": "kundenzentrum-chorweiler@stadt-koeln.de",
        "additional": ""
      },
      {
        "code": "02",
        "name": "Telefon Festnetz",
        "value": "0221 / 221-0",
        "additional": ""
      },
      {
        "code": "04",
        "name": "Fax",
        "value": "0221 / 221-96343",
        "additional": ""
      }
    ],
    "information": [],
    "urls": []
  },
  "internetAddresses": [],
  "additionalInformation": [
    { "type": "INFO_TIMES", "title": "Öffnungszeiten", "text": "..." }
  ],
  "communicationSystems": [],
  "employees": [],
  "nestedForms": [],
  "bankAccounts": []
}
```

Code lists (published versions checked in the XRepository on 2026-09-30;
codes marked "live" were observed in 43 units across six territories):

| Field                   | Code list                                   | Mapping to the domain contract                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `organisations[].role`  | `xzufi.zustaendigkeitsrolle` v1             | `01` Zuständige Stelle und Ansprechpunkt (live; not part of v1 any more, still published) → `RESPONSIBLE_AUTHORITY_AND_CONTACT_POINT`, `02` (live) → `RESPONSIBLE_AUTHORITY`, `03` (live) → `CONTACT_POINT`, `11` → `SINGLE_POINT_OF_CONTACT`, `19` → `OTHER_SINGLE_POINT_OF_CONTACT`, anything else → `OTHER`                       |
| `addresses[].code`      | `xzufi.anschrifttyp` v4                     | `001` Hausanschrift (live) → `VISITING`, `005` Lieferanschrift → `DELIVERY`, `006` Postanschrift (live, carries `postbox`) → `POSTAL`, anything else → `OTHER`                                                                                                                                                                       |
| `communications[].code` | `urn:de:xoev:codeliste:erreichbarkeit` v4.1 | `01` E-Mail (live) → `EMAIL`, `02` Telefon Festnetz (live) and `03` Telefon mobil → `PHONE`, `04` Fax (live) → `FAX`, `09` Web and `10` Web sicher → `WEB`; `05`–`08` and `11`–`15` (messenger, pager, Sonstiges, De-Mail, Kontaktformular sicher, social networks; `07` and `11` live) → `OTHER` with the published `name` as label |

Notes:

- `ars` and `lbId` on the unit detail only concretize the role and filter
  contact persons and forms, none of which this project consumes; the unit is
  requested by `q` alone and the role is taken from the service detail. With
  an `ars` the unit is not responsible for, the unit detail still answers 200
  but reports the role "Ansprechpunkt", so the service-detail role is the
  authoritative one.
- An unknown unit id yields 404 with the same body as an unknown service; the
  integrations API passes it on as 404.
- `GET /v2/organisationunits/titles?ars=&lbId=` ✅ returns the same reduced
  list as `organisations[]` but answers `200 []` for an unknown service and
  has no hierarchy switch; it is therefore not used.
- Not consumed: `employees` (contact persons), `nestedForms`, `bankAccounts`,
  `additionalInformation` (opening hours as free text), `communicationSystems`
  (empty in every sampled unit), `geo`, `publisher`.
- One request per listed unit, issued in parallel: the Köln reference service
  names 9 units, so the public endpoint costs 10 upstream calls.

Wire models: `WireServiceDescription` → `WireAuthorityReference`,
`WireAuthorityRole`; `WireAuthority` → `WireAuthorityLocation`,
`WireAuthorityAddress`, `WireAuthorityContact`, `WireLink`.
Used by `GET /services/{id}/authorities`.

### 1.6 Online-application links (Onlinedienste) ✅ (implemented; beta upstream)

```
GET /v1beta2/onlineservices?ars={ars}&leikaIds={leikaKey}&nextPageToken={token}
```

Filters along the ARS hierarchy upwards and downwards. Paginated envelope
with a page size of 1000 and a cursor in `nextPageToken` (empty string on
the last page).

Request:

```
GET https://pvog.fitko.net/suchdienst/api/v1beta2/onlineservices?ars=053150000000&leikaIds=99115005104000
```

Response:

```json
{
  "nextPageToken": "",
  "hits": 1,
  "totalHits": 1,
  "onlineservices": [
    {
      "id": "L100002.OD.121797650",
      "name": "Wohnsitz anmelden",
      "links": [{ "uri": "https://...", "title": "Wohnsitz anmelden" }],
      "externalLastUpdate": "2024-10-12T12:26:05.831Z",
      "serviceDescriptions": [
        {
          "lbId": "L100002.LB.121407320",
          "ars": ["053150000000"],
          "leikakeys": ["99115005104000"]
        }
      ]
    }
  ]
}
```

Notes: links use `uri`; LeiKa keys live in `serviceDescriptions[].leikakeys`;
`description` is optional. Without `leikaIds` the same territory returned
roughly 2,000 online services (about 760 KB) on 2026-09-30, so filter by
LeiKa key where possible.

> ⚠️ Beta endpoint: the operator states that data model and behaviour may
> still change. The shape above already replaced an older flat-array
> contract once. Watch the PVOG release notes.

Wire models: `WireOnlineServicesResponse`, `WireOnlineService`,
`WireOnlineServiceLink`, `WireOnlineServiceDescriptionRef`.
Used by `GET /online-services`, which follows `nextPageToken` with the same
filters until the last page and returns the complete set (a repeated token or
more than 100 pages is treated as a contract violation).

### 1.7 Deprecated endpoints

Listed on the official deprecations page (state of 2026-09-30). All were
deprecated with release 9.17.4 (May 2026) and are scheduled for removal in
November 2026. Do not build on them.

| Endpoint                                             | Replacement                                            | Live check 2026-09-30                                                   |
| ---------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET /v5/servicedescriptions/{ars}/detail?q={lbid}`  | `GET /v6/servicedescriptions/{lbid}/detail?ars=` (1.4) | ✅ still answers 200, with `X-Pvog-Deprecated: true`                    |
| `GET /v3/relations/{ars}/jzufi?lbids=`               | `GET /v1/relations/jzufi-2-3?ars=&lbids=` ✅           | 400 without the XZuFi version header; shutdown announced for 2026-11-26 |
| `GET /v3/servicedescriptions/jzufi`                  | `GET /v1/servicedescriptions/{id}/jzufi-2-3`           | not exercised                                                           |
| `GET /v2/organisationunits/jzufi`                    | `GET /v1/organisationunits/{id}/jzufi-2-3`             | not exercised                                                           |
| `GET /v2/locations`, `GET /v2/locations/suggestions` | `/v3/locations/*` (1.1, 1.2)                           | not exercised                                                           |

None of them is used by this project.

### 1.8 Watch items

- `GET /v8beta1/servicedescriptions?ars={ars}&q={query}` ✅ is a new beta
  search endpoint (release 9.21, August 2026) with a reduced request and
  response model and reworked pagination. The operator states that it will
  eventually replace `/v7/servicedescriptions/{ars}` but is not yet
  productive. `/v7` remains supported and is what this project uses; no
  migration until `/v8` leaves beta.
- `GET /v1beta2/onlineservices` is beta, see 1.6.
- `GET /v1beta2/onlineservices/{odId}/organisations` (beta, not exercised)
  lists the organisation units responsible for an online service with a
  richer role enumeration than the service detail; a candidate once it
  leaves beta.

### 1.9 Auxiliary endpoints (reference, not implemented)

Verified with a live request on 2026-09-30 unless noted:

```
GET /v3/servicedescriptions/leikaid?leikaIds={key}&ars={ars}          # services by LeiKa key, paginated ✅
GET /v2/servicedescriptions/leikahierarchy?leikaIds={key}&ars={ars}   # LeiKa hierarchy search ✅
GET /v1/servicedescriptions/suggestions/{ars}?q={prefix}              # service-name autocomplete, 5 results ✅
GET /v1/personalmatters/{ars}                                         # life situations with services in a territory ✅
GET /v2/client-stats                                                  # object counts per federal state with timestamps ✅
GET /v5/servicedescriptions/csv?ars={ars}                             # CSV export of all services of a territory ✅
GET /v1/relations/jzufi-2-3?ars={ars}&lbids={lbid}                    # responsibilities as JZuFi 2.3.1 ✅
GET /v2/organisationunits/titles?ars={ars}&lbId={lbid}                # responsible units, reduced view (see 1.5) ✅
GET /v1/organisationunits/{id}/jzufi-2-3                              # organisation unit as JZuFi 2.3.1 ✅
```

The CSV export answers 401 when `Accept: application/json` is sent; request it
without an `Accept` header.

---

## 2. FIM Portal API (public)

**Base URL:** `https://fimportal.de/api`
(the older host `schema.fim.fitko.net` serves the same API; the operator
states there is no plan to deprecate it)
**Swagger UI:** <https://fimportal.de/docs> · **OpenAPI document:**
<https://fimportal.de/openapi.json> ✅
**Operator:** FITKO; source code and contact on OpenCoDE:
<https://gitlab.opencode.de/fitko/fim/portal>
**Rate limiting:** IP-based; exceeding it yields HTTP 429.

FIM (Föderales Informationsmanagement) is the standardization framework
behind the service descriptions: LeiKa keys, master texts (Stammtexte) and
form data schemas (XDatenfelder). Attribute names in the API intentionally
stay close to the German terms of the underlying standards.

### 2.1 LeiKa service catalog ✅ (implemented)

```
GET /v0/leistung-steckbriefe?fts_query={term}&limit={1..200}&offset={n}
GET /v0/leistung-steckbriefe/{leistungsschluessel}
```

Full-text search uses `fts_query`. A `search` parameter is not defined by the
API and is silently ignored; the response is then the unfiltered list in
default order. Further filters: `leistungsschluessel` (partial key), `title`,
`leistungstyp`, `typisierung`, `freigabe_status`, `updated_since`, `sdg`,
`order_by` and others, see the OpenAPI document. `limit` defaults to 200 and
is capped at 200; the integrations API validates its own `limit` (1–200)
locally and answers 400 before calling upstream.

Request:

```
GET https://fimportal.de/api/v0/leistung-steckbriefe?fts_query=Anmeldung&limit=2
```

Response (trimmed):

```json
{
  "items": [
    {
      "leistungsschluessel": "99101002104007",
      "redaktion_id": "B100019",
      "leistung_id": "...",
      "title": "Bestattung Anmeldung Tuchbestattung",
      "leistungsbezeichnung": "...",
      "leistungsbezeichnung_2": null,
      "freigabe_status": 6,
      "erstellt_datum_zeit": "...",
      "geaendert_datum_zeit": "...",
      "typisierung": ["1"],
      "leistungstyp": "lov",
      "rechtsgrundlagen": "...",
      "sdg_informationsbereiche": [],
      "fts_match": "..."
    }
  ],
  "offset": 0,
  "limit": 2,
  "count": 2,
  "total_count": 303
}
```

The catalog contained 15k+ entries on 2026-09-30 (`total_count` without a
filter). `rechtsgrundlagen` and `leistungsbezeichnung_2` may be `null`. An
unknown key on the single-entry endpoint yields 404 with
`{"detail": "Could not find Leistungsteckbrief …"}`.

Use `leistungsschluessel` (LeiKa key) as the canonical service identifier
across sources; PVOG exposes the same keys as `leikakeys`.

Wire models: `WireCatalogSearchResponse`, `WireCatalogEntry`.
Used by `GET /catalog` and `GET /catalog/{serviceCatalogKey}`.

A `/v1/leistung-steckbriefe` endpoint with the same parameters exists ✅;
`v0` is not marked deprecated. Watch item.

### 2.2 Federal master texts (Stammtexte)

```
GET /v0/leistung-stammtexte?limit=&offset=                                       # list ✅ (reference)
GET /v0/leistung-stammtexte/{redaktion_id}/{leistung_id}/{source}                # metadata ✅ (reference)
GET /v0/leistung-stammtexte/{redaktion_id}/{leistung_id}/{source}/xzufi          # raw XZuFi XML (reference)
GET /v0/leistung-stammtexte/{redaktion_id}/{leistung_id}/{source}/parsed-xzufi   # parsed JSON ✅ (implemented)
GET /v0/leistung-stammtexte/{redaktion_id}/{leistung_id}/{source}/{lang}/pdf     # rendered PDF (reference)
```

`redaktion_id` and `leistung_id` come from a catalog entry; `source` is
usually `primary`. Live example used for verification:
`/v0/leistung-stammtexte/L100039/10268781/primary/parsed-xzufi`.

> ⚠️ The operator marks `parsed-xzufi` as **unstable**: the parsed
> representation is an internal one that may change without notice, and its
> use for live products is not recommended. This project therefore exposes it
> as an unvalidated pass-through (`GET /master-texts/...`) and builds no typed
> contract on it.

The list endpoint reported 46k+ master texts on 2026-09-30.

Wire model: none (raw JSON). Used by
`GET /master-texts/{editorialOfficeId}/{serviceId}`.

### 2.3 Form data schemas (reference, not implemented)

```
GET /v1/schemas ✅                        # XDatenfelder data schemas
GET /v1/schemas/{fim_id}/{fim_version}/xdf
GET /v1/fields ✅                         # individual form fields
GET /v1/groups ✅                         # field groups
GET /v0/processclasses ✅                 # process models (XProzess)
GET /v0/processes ✅
```

Standardized field-level definitions of official forms as published by the
FIM Portal. Not used by this project.

### 2.4 Registries (reference, not implemented)

```
GET /v0/online-service ✅                 # registry of online services
GET /v0/organizational-unit ✅            # authorities (organizational units)
```

---

## 3. PVOG Bereitstelldienst (access on request)

**Documentation:** <https://produktportal.pvog.fitko.de/docs/bereitstelldienst/doku/>

The Bereitstelldienst provides bulk access to PVOG data and incremental
updates: the complete, reference-consistent data set of the Portalverbund
(services, specializations, organisational units, online services, forms and
responsibilities) as XZuFi transfer messages, optionally restricted by ARS or
patterns. Unlike the public Suchdienst, access is application-based: the API
is not public and requires authorization against the central PVOG user
management. The connection guide (Anbindungsanleitung) on the product portal
describes the process; the PVOG helpdesk handles requests.

It is currently not implemented by DirektAmt Integrations.

Deprecation note from the official page: `v2/verwaltungsobjekte` is
deprecated in favour of `v3/verwaltungsobjekte/xzufi-2-3-1`.

---

## Verification procedure

Unit tests never call these APIs. Before a release, or whenever an upstream
change is announced, re-verify the implemented endpoints manually:

1. Enumerate the endpoints used in `apps/api/src/integrations/*/*Client.ts`
   and compare them with the ✅ entries above; any drift is a finding.
2. Fire the reference requests (Köln, ARS `053150000000`,
   `Wohnsitz anmelden`, catalog term `Anmeldung`) against the live APIs.
3. Compare the observed JSON fields with the wire models in
   `apps/api/src/integrations/*/wire/` (`@Expose({ name })` metadata, or
   the property name when no rename is declared).
4. Check the PVOG deprecations page and release notes for affected endpoints.
5. Update the verification date at the top, mark endpoints that fail, and
   record breaking changes in the changelog below. Do not change client code
   as part of the verification run.

The `update-integrations-handbook` skill in `.agents/skills/` describes this
checklist for coding agents.

## Glossary

| Term                 | Meaning                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| ARS                  | Amtlicher Regionalschlüssel: 12-digit official territory key (state → district → municipality)          |
| LeiKa                | Leistungskatalog: federal catalog of administrative services; `leistungsschluessel` is its 14-digit key |
| FIM                  | Föderales Informationsmanagement: standardization framework (Leistungen / Datenfelder / Prozesse)       |
| XZuFi                | XÖV exchange standard for service descriptions and responsibilities                                     |
| JZuFi                | JSON representation of XZuFi                                                                            |
| XDatenfelder         | XÖV standard for form data schemas, groups and fields                                                   |
| PVOG                 | Portalverbund-Onlinegateway: central aggregator of state and federal service data                       |
| Zuständigkeit        | Responsibility: which authority handles a service in a given territory                                  |
| Organisationseinheit | Organisation unit: an authority or office that is responsible for a service (`PublicAuthority`)         |
| Onlinedienst         | Online application service (direct submission link)                                                     |
| Lebenslage           | Life situation category (for example moving house)                                                      |
| Stammtext            | Federal master text of a service description, supplemented locally                                      |
| BKG                  | Federal Agency for Cartography and Geodesy (location data source)                                       |
| FITKO                | Föderale IT-Kooperation: operator of PVOG and the FIM Portal                                            |

## Changelog

- **2026-09-30** (responsible authorities): `/v5/organisationunits/detail`
  moved from the auxiliary list to implemented (1.5), requested by `q` only;
  `organisations[]` of the service detail (1.4) is now consumed. Code lists
  `xzufi.zustaendigkeitsrolle` (PVOG still publishes the retired code `01`),
  `xzufi.anschrifttyp` and `urn:de:xoev:codeliste:erreichbarkeit` recorded
  with their domain mapping. `/v2/organisationunits/titles` and
  `/v1/organisationunits/{id}/jzufi-2-3` verified as reference endpoints.
- **2026-09-30**: full re-verification. Legacy host `pvog.fitko.de` switched
  off upstream (404). `/v5/servicedescriptions/{ars}/detail` and
  `/v3/relations/{ars}/jzufi` moved to the deprecated list with their
  replacements; `/v8beta1/servicedescriptions` recorded as a watch item.
  FIM catalog search corrected to `fts_query` (the previously used `search`
  parameter was ignored upstream). `parsed-xzufi` documented as unstable per
  the FIM OpenAPI document.
- **2026-07-19**: initial verification of the implemented endpoints.
