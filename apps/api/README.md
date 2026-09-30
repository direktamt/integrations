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

| Env var                        | Default                                 | Purpose                                                 |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------- |
| `PORT`                         | `3000`                                  | HTTP port                                               |
| `CORS_ORIGINS`                 | `http://localhost:5173`                 | Comma-separated browser origins allowed to call the API |
| `PVOG_SEARCH_BASE_URL`         | `https://pvog.fitko.net/suchdienst/api` | PVOG Suchdienst base URL                                |
| `FIM_PORTAL_BASE_URL`          | `https://fimportal.de/api`              | FIM Portal base URL                                     |
| `INTEGRATIONS_HTTP_TIMEOUT_MS` | `15000`                                 | Timeout for outbound requests to the upstream APIs      |

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
    request/                         # validated query DTOs
    filter/UpstreamExceptionFilter.ts  # integration failures -> 404 / 502 / 504
  integrations/                      # upstream adapters
    IntegrationsModule.ts
    GovDataFacade.ts                 # the ONLY integration entry point for app code
    common/BaseHttpClient.ts         # fetch + timeout + wire validation + typed upstream exceptions
    common/UrlSanitizer.ts           # strips query values from URLs before they reach logs
    common/exceptions/               # IntegrationException hierarchy
    pvog/                            # PVOG Suchdienst adapter
      PvogSearchClient.ts
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

Each upstream response is transformed into a wire model
(`integrations/*/wire/`) with `excludeExtraneousValues` and validated before
it is mapped to a response contract. A wire field without `@Expose` metadata
is silently dropped, so every consumed field must carry it.

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
validation, error mapping, timeout), the PVOG and FIM mapping code with small
synthetic fixtures, and the status mapping of `UpstreamExceptionFilter`.

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
