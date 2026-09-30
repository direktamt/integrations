# DirektAmt Integrations API

NestJS anti-corruption layer over official German public-administration APIs.
It resolves cities to official territory keys, searches public services and
exposes stable English response contracts independently of upstream JSON
conventions. It owns the complete runtime boundary between the upstream
sources and consumers of the normalized API.

## Stack

- Node.js + NestJS 11, TypeScript
- No HTTP client dependency: native `fetch` via a shared `BaseHttpClient`
- Wire-model validation with class-transformer and class-validator
- OpenAPI document and Swagger UI at `/docs` (`@nestjs/swagger`)
- External data: PVOG Suchdienst API, FIM Portal API
  (see [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md))

## Getting started

```bash
# from the repository root
npm ci
npm run dev:api                                       # http://localhost:3000, Swagger UI at /docs
npm run build --workspace @direktamt/integrations-api
npm run test --workspace @direktamt/integrations-api
npm run lint --workspace @direktamt/integrations-api
```

## Configuration

All configuration is read once at startup by `src/config.ts` (the `CONFIG`
object) from the environment; in development, variables come from
`apps/api/.env` (gitignored, template in `.env.example`). Application code
never touches `process.env` directly; always go through `CONFIG`.

| Env var                        | Default                                 | Purpose                                                                                                                                                          |
| ------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                         | `3000`                                  | HTTP port                                                                                                                                                        |
| `CORS_ORIGINS`                 | `http://localhost:5173`                 | Comma-separated browser origins allowed to call the API                                                                                                          |
| `PVOG_SEARCH_BASE_URL`         | `https://pvog.fitko.net/suchdienst/api` | PVOG Suchdienst base URL                                                                                                                                         |
| `FIM_PORTAL_BASE_URL`          | `https://fimportal.de/api`              | FIM Portal base URL                                                                                                                                              |
| `PVOG_SERVICE_SEARCH_VERSION`  | `v7`                                    | Upstream version of the PVOG service search behind `GET /services`: `v7` (production default) or `v8beta1` (experimental adapter); any other value stops startup |
| `INTEGRATIONS_HTTP_TIMEOUT_MS` | `15000`                                 | Timeout for outbound requests to the upstream APIs                                                                                                               |

## Source layout

```
../../packages/contracts/            # shared integrations API response models
src/
  Main.ts                            # bootstrap: CORS, validation pipe, exception filter, Swagger
  AppModule.ts
  config.ts                          # the only place that reads process.env
  api/                               # HTTP layer
    ApiModule.ts
    controller/                      # one controller per resource
                                     #   RawPvogController: /raw/pvog, static whitelist of provider representations
    request/                         # validated query DTOs
    filter/UpstreamExceptionFilter.ts  # integration failures -> 404 / 502 / 504
  integrations/                      # upstream adapters
    IntegrationsModule.ts
    GovDataFacade.ts                 # the ONLY integration entry point for app code
    ServiceContextAssembler.ts       # composes GET /services/{id}/context from PVOG and FIM
    common/BaseHttpClient.ts         # fetch + timeout + wire validation + typed upstream exceptions
    common/UrlSanitizer.ts           # strips query values from URLs before they reach logs
    common/exceptions/               # IntegrationException hierarchy
    pvog/                            # PVOG Suchdienst adapter
      PvogSearchClient.ts            # locations, service detail, online services
      ServiceDescriptionMapper.ts    # shared wire → PublicServiceDescription mapping
      serviceSearch/                 # versioned service-search adapters behind one interface
        ServiceSearchProvider.ts     #   interface + injection token
        PvogServiceSearchVersion.ts  #   PVOG_SERVICE_SEARCH_VERSION parsing (v7 default)
        v7/                          #   production adapter and its wire models
        v8beta1/                     #   experimental adapter and its wire models
      PvogAuthorityClient.ts         # responsible organisation units (authorities)
      PvogRawClient.ts               # JZuFi 2.3 pass-through of a service description or online service
      model/ServiceSearchOptions.ts  # integration-only input options
      wire/                          # validated upstream JSON contracts
    fim/                             # FIM Portal adapter
      FimPortalClient.ts
      wire/                          # validated upstream JSON contracts
test/
  FetchStub.ts                       # fetch stand-in for unit tests
```

## Integration boundary

Controllers depend on `GovDataFacade` only. The individual clients are
implementation details; caching or persistence may change behind the facade
without changing its consumers. Response models exposed by the API live in
`packages/contracts`; do not copy them into the application or a consumer.

Each structured upstream response is transformed into a wire model
(`integrations/*/wire/`) with `excludeExtraneousValues` and validated before
it is mapped to a response contract. A wire field without `@Expose` metadata
is silently dropped, so every consumed field must carry it. The FIM
`parsed-xzufi` master text is the intentional exception: `getRawJson` passes
it through unvalidated because the upstream declares that representation
unstable.

`GET /online-services` follows PVOG's `nextPageToken` pagination internally
(same `ars` and `leikaIds` filters on every page, repeated tokens and runaway
page counts rejected as contract violations) and returns the complete set;
the public contract stays `OnlineService[]`.

`GET /services/{id}/authorities` composes two PVOG resources inside
`PvogAuthorityClient`: the service detail names the responsible organisation
units with their roles, then one organisation-unit detail per unit is loaded
in parallel and mapped to `PublicAuthority` (normalized role, address type
and contact type derived from the XZuFi/XÖV code lists documented in the
handbook). Consumers never see organisation-unit ids or code-list codes as
part of the request; an unknown service or unit is answered with 404. The
role of an authority is a property of the relation it was resolved through
(`ServiceAuthority.role`); the `PublicAuthority` itself is the contact
card.

`GET /online-services/{id}/authorities` follows the beta PVOG relation
`/v1beta2/onlineservices/{odId}/organisations` and then loads every distinct
organisation unit once (`OnlineServiceAuthority`: contact card plus the
unit's distinct roles). `GET /online-services` never resolves authorities,
so the list stays one paginated upstream call; organisation-unit details
are requested with at most 8 calls in flight (`mapConcurrently`).

`GET /services/{id}/context` is composed by `ServiceContextAssembler` behind
the facade: the service detail is loaded once and is mandatory (404 when
unknown); its organisation-unit references, LeiKa keys and the catalog's
editorial-office/service ids drive the authorities, online services, catalog
entries and master texts, which run in parallel where no data dependency
exists (master texts follow the catalog entries). Partial-failure policy: an
auxiliary part whose upstream raises an `IntegrationException` (no
response, timeout, error status, contract violation) is returned as an empty
list and listed in `status.unavailableParts` with `status.complete = false`;
master texts are unavailable whenever the catalog entries are. A genuinely
empty relation — no LeiKa key, a key the catalog does not know (404), a
catalog entry without a master text (404) — is a complete result. Errors
that are not upstream failures propagate as 500. Adapters never orchestrate
across resources.

## Versioned service-search adapters

`GET /services` is served by a `ServiceSearchProvider`; the implementation
is selected once at startup from `PVOG_SERVICE_SEARCH_VERSION` and injected
into `GovDataFacade` through the `SERVICE_SEARCH_PROVIDER` token. Nothing
selects an adapter per request, and the response never says which version
answered.

| Adapter                           | Upstream                            | Status                              |
| --------------------------------- | ----------------------------------- | ----------------------------------- |
| `PvogV7ServiceSearchProvider`     | `GET /v7/servicedescriptions/{ars}` | production, default                 |
| `PvogV8BetaServiceSearchProvider` | `GET /v8beta1/servicedescriptions`  | supported experimental, opt-in only |

Each adapter has its own wire models under `serviceSearch/{version}/wire`.
The v8beta1 hits are a reduced view without LeiKa keys, regional keys or
sections, so that adapter loads every hit's full description from the detail
endpoint (one search call plus one detail call per hit, at most 8 in flight)
and maps it with the same `ServiceDescriptionMapper` the detail endpoint
uses. Absorbed differences: the page totals sit in a separate `page`
object; the search is always fuzzy and always evaluated at request time, so
`fuzzySearch` and `validDate` have no effect; `summary` and
`targetAudiences` are not published by v8beta1 or the detail endpoint and
stay empty; the detail endpoint publishes a different section set than the
v7 search hit (see the handbook). `ServiceSearchCompatibility.spec.ts`
maps equivalent v7 and v8beta1 fixtures and asserts the same normalized
result; `npm run verify:pvog-service-search-compat` does the same against
the live APIs (see the handbook for the last run).

## Raw provider representations

`/raw/pvog/services/{id}/jzufi-2-3` and
`/raw/pvog/online-services/{id}/jzufi-2-3` return the upstream JZuFi 2.3
body inside a `RawSourceResponse` envelope (`provider`, `representation`,
`data`). `data` is typed as `JsonValue` and is the parsed upstream body
without any mapping; it follows the provider's contract and receives no
compatibility guarantee, unlike every model outside `/raw`. The upstream
paths are fixed in `PvogRawClient`; the caller supplies an object id that
is URL-encoded into its path segment, so no host, path, query or header is
caller-controlled. Validation is limited to what `BaseHttpClient` always
does: a non-2xx status or a body that is not JSON becomes an upstream
exception (404 → 404, other statuses → 502, unparseable body → 502).

## Request validation

Query DTOs in `api/request/` validate the documented upstream limits locally
so that invalid input is answered with 400 before any upstream call: service
search `size` 5–9999 and `page` 0–100, catalog `limit` 1–200, plus the
required-field and type rules. Remaining upstream 4xx responses other than
404 are mapped to 502 because, once the known limits are checked here, they
indicate a contract problem rather than user input.

## Exception handling

`BaseHttpClient` converts every failure into a typed `IntegrationException`:

| Exception                            | Raised when                                       | HTTP status returned |
| ------------------------------------ | ------------------------------------------------- | -------------------- |
| `UpstreamHttpException` (status 404) | the upstream answered 404                         | 404                  |
| `UpstreamHttpException` (other)      | the upstream answered another non-2xx status      | 502                  |
| `UpstreamNetworkException`           | no response at all (DNS, connection, TLS)         | 502                  |
| `UpstreamContractViolationException` | a 2xx body did not match the wire model           | 502                  |
| `UpstreamTimeoutException`           | no response within `INTEGRATIONS_HTTP_TIMEOUT_MS` | 504                  |

`UpstreamExceptionFilter` maps them to generic error bodies; upstream URLs
and response bodies are never returned to the client. Logs and exception
messages carry only the sanitized upstream URL (origin and path); query
values such as search terms, postal codes or regional keys are never logged.

## Tests

`npm run test --workspace @direktamt/integrations-api` runs Jest unit tests
against a stubbed `fetch` (`test/FetchStub.ts`); they never reach the
network. The tests cover `BaseHttpClient` (query building, parsing,
validation, error mapping, timeout), the PVOG and FIM mapping code including
online-service pagination with small synthetic fixtures, the service-to-authorities composition in `GovDataFacade`, the online-service → authorities composition (de-duplication, concurrency cap), the context assembly (identifier following, de-duplication, parallelism and the partial-failure status) in `ServiceContextAssembler`, the concurrency helper, the raw JZuFi pass-through (envelope, unchanged body, path encoding, error mapping, log hygiene), both service-search adapters and their semantic compatibility on equivalent fixtures, the version parsing and adapter selection, the request DTO limits, and the status mapping of
`UpstreamExceptionFilter`.

Live verification of the upstream contracts is a manual procedure, see
[`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

## Conventions

- File naming is Java-style: PascalCase, file name = class name
  (`PvogSearchClient.ts`, not `pvog-search.client.ts`).
- All naming is in English; German appears only in wire-model `@Expose`
  metadata, external URL/query names and data content.
- Deterministic runtime: no LLM calls in the request path.

See [`.agents/AGENTS.md`](.agents/AGENTS.md) for the full agent-facing
conventions.
