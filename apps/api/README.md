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

| Env var                                           | Default                                 | Purpose                                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                            | `3000`                                  | HTTP port                                                                                                                                                        |
| `CORS_ORIGINS`                                    | `http://localhost:5173`                 | Comma-separated browser origins allowed to call the API                                                                                                          |
| `PVOG_SEARCH_BASE_URL`                            | `https://pvog.fitko.net/suchdienst/api` | PVOG Suchdienst base URL                                                                                                                                         |
| `FIM_PORTAL_BASE_URL`                             | `https://fimportal.de/api`              | FIM Portal base URL                                                                                                                                              |
| `PVOG_SERVICE_SEARCH_VERSION`                     | `v7`                                    | Upstream version of the PVOG service search behind `GET /services`: `v7` (production default) or `v8beta1` (experimental adapter); any other value stops startup |
| `INTEGRATIONS_HTTP_TIMEOUT_MS`                    | `15000`                                 | Budget of one outbound upstream request including retries and the waits between them; the request is aborted at the deadline                                     |
| `INTEGRATIONS_HTTP_MAX_RETRIES`                   | `2`                                     | Retries after the initial attempt for network failures and HTTP 429/502/503/504; `0` disables retrying                                                           |
| `INTEGRATIONS_HTTP_RETRY_BASE_DELAY_MS`           | `200`                                   | First backoff delay; later delays grow exponentially with jitter                                                                                                 |
| `INTEGRATIONS_HTTP_RETRY_MAX_DELAY_MS`            | `2000`                                  | Upper bound of a backoff delay; a valid `Retry-After` on 429/503 replaces the computed delay                                                                     |
| `INTEGRATIONS_BREAKER_ERROR_THRESHOLD_PERCENTAGE` | `50`                                    | Share of availability failures (network failure, timeout, 5xx) within the rolling window above which a provider's circuit opens                                  |
| `INTEGRATIONS_BREAKER_VOLUME_THRESHOLD`           | `5`                                     | Minimum calls within the rolling window before the circuit may open                                                                                              |
| `INTEGRATIONS_BREAKER_ROLLING_WINDOW_MS`          | `10000`                                 | Length of the rolling statistics window                                                                                                                          |
| `INTEGRATIONS_BREAKER_RESET_TIMEOUT_MS`           | `30000`                                 | How long an open circuit rejects calls before one probe call is let through                                                                                      |
| `INTEGRATIONS_CACHE_ENABLED`                      | `true`                                  | Serve opted-in key-based reads (territory, catalog entry, master text, organisation unit) from the in-process cache                                              |
| `INTEGRATIONS_CACHE_MAX_ENTRIES`                  | `1000`                                  | Upper bound of cached entries; least recently used evicted first                                                                                                 |
| `INTEGRATIONS_CACHE_TTL_MS`                       | `300000`                                | Lifetime of a cached entry                                                                                                                                       |

## Source layout

```
../../packages/contracts/            # shared integrations API response models
src/
  Main.ts                            # bootstrap: CORS, validation pipe, exception filter, Swagger
  AppModule.ts
  config.ts                          # the only place that reads process.env
  contractDrift/                     # live contract-drift verification engine (probes, classification, summary)
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
    common/BaseHttpClient.ts         # fetch + wire validation + typed upstream exceptions, via the executor
    common/resilience/               # UpstreamRequestExecutor: cockatiel timeout + retry around one opossum breaker per provider
    common/cache/                    # IntegrationCache interface, lru-cache and no-op implementations
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
  UpstreamTestSupport.ts             # executor and cache for client specs (no retries, no cache)
scripts/
  VerifyUpstreamContracts.ts         # npm run verify:contracts (weekly workflow, manual runs)
  VerifyPvogServiceSearchCompatibility.ts  # npm run verify:pvog-service-search-compat
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

## Upstream resilience

Every upstream request runs through `UpstreamRequestExecutor`
(`integrations/common/resilience/`), one instance shared by all clients, so
that resilience state belongs to the provider and not to a single endpoint.
The executor composes two libraries, `timeout(budget) → retry → breaker →
attempt`, and adds only the domain decisions (which failure is transient,
which one is an outage):

- **Request budget** (cockatiel `timeout`). `INTEGRATIONS_HTTP_TIMEOUT_MS`
  is the overall budget of one upstream request (one page, one detail call)
  including retries and the waits between them; it is not a per-attempt
  timeout. At the deadline the request is aborted whatever it is doing, a
  hanging attempt or a backoff wait, and surfaces as
  `UpstreamTimeoutException` (504). A `Retry-After` that does not fit into
  the remaining budget ends the request with the upstream error at once.
- **Retry** (cockatiel `retry`). Upstream calls are idempotent GETs and are
  retried after network failures and HTTP 429/502/503/504: the initial
  attempt plus `INTEGRATIONS_HTTP_MAX_RETRIES` retries (default 2) with
  exponential backoff and jitter between
  `INTEGRATIONS_HTTP_RETRY_BASE_DELAY_MS` and
  `INTEGRATIONS_HTTP_RETRY_MAX_DELAY_MS`; a valid `Retry-After` header on
  429/503 replaces the computed delay. 4xx answers, other 5xx, timeouts,
  contract violations and unparseable bodies are never retried.
- **Circuit breaker** (opossum). One breaker per provider (PVOG, FIM), never
  per endpoint. Only availability failures count — network failures,
  timeouts and 5xx — through opossum's `errorFilter`; 4xx answers (including
  404 and 429) and contract violations do not, a contract violation is drift
  and not an outage. The circuit opens when, within
  `INTEGRATIONS_BREAKER_ROLLING_WINDOW_MS`, at least
  `INTEGRATIONS_BREAKER_VOLUME_THRESHOLD` calls were made and more than
  `INTEGRATIONS_BREAKER_ERROR_THRESHOLD_PERCENTAGE` of them failed; every
  attempt of a retried request counts. While open, calls are rejected
  without reaching the upstream (`UpstreamCircuitOpenException`, 502) for
  `INTEGRATIONS_BREAKER_RESET_TIMEOUT_MS`; then exactly one probe call is
  let through: its success closes the circuit, its failure reopens it.
- **Cache** (lru-cache behind `IntegrationCache`,
  `integrations/common/cache/`). Clients opt specific key-based, rarely
  changing reads in: the territory lookup by regional key, the FIM catalog
  entry and master text, and the organisation-unit detail behind every
  authority. Searches, suggestions, service details and online-service
  enumerations are never cached. Only a validated result is stored, for
  `INTEGRATIONS_CACHE_TTL_MS`, in a bounded in-process LRU
  (`INTEGRATIONS_CACHE_MAX_ENTRIES`); failures, 404s and contract
  violations never reach the cache, and `INTEGRATIONS_CACHE_ENABLED=false`
  binds a no-op cache. The interface is asynchronous so that a shared store
  could replace the in-memory implementation without touching the clients;
  there is no Redis, no negative caching and no background refresh.

Log lines carry provider, attempt, retry reason, breaker transitions and
cache hit/miss next to the sanitized URL; query values, response bodies and
cache keys are never logged. Consumers only see the generic error responses
of the table below, never breaker state or attempt counts.

## Request validation

Query DTOs in `api/request/` validate the documented upstream limits locally
so that invalid input is answered with 400 before any upstream call: service
search `size` 5–9999 and `page` 0–100, catalog `limit` 1–200, plus the
required-field and type rules. Remaining upstream 4xx responses other than
404 are mapped to 502 because, once the known limits are checked here, they
indicate a contract problem rather than user input.

## Exception handling

`BaseHttpClient` and the request executor convert every failure into a typed `IntegrationException`:

| Exception                            | Raised when                                                                                   | HTTP status returned |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------- |
| `UpstreamHttpException` (status 404) | the upstream answered 404                                                                     | 404                  |
| `UpstreamHttpException` (other)      | the upstream answered another non-2xx status                                                  | 502                  |
| `UpstreamNetworkException`           | no response at all (DNS, connection, TLS)                                                     | 502                  |
| `UpstreamContractViolationException` | a 2xx body did not match the wire model                                                       | 502                  |
| `UpstreamTimeoutException`           | no response within `INTEGRATIONS_HTTP_TIMEOUT_MS`                                             | 504                  |
| `UpstreamCircuitOpenException`       | the provider's circuit is open after repeated availability failures; the request was not sent | 502                  |

`UpstreamExceptionFilter` maps them to generic error bodies; upstream URLs
and response bodies are never returned to the client. Logs and exception
messages carry only the sanitized upstream URL (origin and path); query
values such as search terms, postal codes or regional keys are never logged.

## Tests

`npm run test --workspace @direktamt/integrations-api` runs Jest unit tests
against a stubbed `fetch` (`test/FetchStub.ts`); they never reach the
network. The tests cover `BaseHttpClient` (query building, parsing,
validation, error mapping, request budget, retries over HTTP, cache opt-in and
log hygiene), the failure classification, `Retry-After` parsing and backoff, the
request executor (retry, budget, breaker transitions, provider isolation),
the bounded cache (TTL, LRU eviction), the PVOG and FIM mapping code including
online-service pagination with small synthetic fixtures, the service-to-authorities composition in `GovDataFacade`, the online-service → authorities composition (de-duplication, concurrency cap), the context assembly (identifier following, de-duplication, parallelism and the partial-failure status) in `ServiceContextAssembler`, the concurrency helper, the raw JZuFi pass-through (envelope, unchanged body, path encoding, error mapping, log hygiene), both service-search adapters and their semantic compatibility on equivalent fixtures, the version parsing and adapter selection, the request DTO limits, and the status mapping of
`UpstreamExceptionFilter`.

Live verification of the upstream contracts runs outside the unit tests:
`npm run verify:contracts` probes every implemented endpoint and classifies
drift (the engine in `src/contractDrift/` is itself unit-tested on
fixtures), and the weekly `contract-drift.yml` workflow runs it with a job
summary. See [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md), Verification
procedure, for the policy and the manual procedure.

## Conventions

- File naming is Java-style: PascalCase, file name = class name
  (`PvogSearchClient.ts`, not `pvog-search.client.ts`).
- All naming is in English; German appears only in wire-model `@Expose`
  metadata, external URL/query names and data content.
- Deterministic runtime: no LLM calls in the request path.

See [`.agents/AGENTS.md`](.agents/AGENTS.md) for the full agent-facing
conventions.
