# DirektAmt Integrations

DirektAmt Integrations is the open-source integration layer extracted from the
broader DirektAmt project.

It provides normalized, typed access to official German public-administration
data sources such as PVOG and FIM. Upstream-specific contracts, naming
conventions and API changes are isolated behind a stable HTTP API and shared
TypeScript models.

This repository contains only the government-data integration boundary and its
developer tooling. The broader DirektAmt application is not part of this
repository.

## Why this exists

Germany already exposes substantial public-administration data through official
APIs. The challenge for consuming applications is that location data, service
descriptions, canonical service identifiers and online-service links come from
different contracts and use administration-specific concepts such as ARS,
LeiKa and XZuFi.

This project provides one normalized boundary over those sources:

- German identifiers and field names are translated once, at the boundary
  (an ARS becomes `regionalKey`, a LeiKa key becomes `serviceCatalogKey`).
- Structured upstream responses used by the normalized API are validated
  against explicit wire models before mapping, so contract drift surfaces as
  a typed error instead of undefined behaviour downstream. The FIM
  `parsed-xzufi` endpoint is the one intentional exception: it is exposed as
  an unvalidated pass-through because its upstream representation is
  explicitly unstable.
- Consumers depend on one HTTP API and one set of TypeScript response models
  rather than on individual upstream endpoints.

## Architecture

```text
developer console (React)
      |
      v
integrations API (NestJS)
      |
      +---- PVOG Suchdienst
      |
      +---- FIM Portal
```

- **NestJS API** (`apps/api`): HTTP layer, request validation and the
  integration adapters.
- **Anti-corruption layer**: one adapter per upstream API behind a single
  `GovDataFacade`; controllers never see an upstream client.
- **Wire-model validation**: structured upstream payloads are transformed
  into declared wire models and validated before mapping (class-transformer
  and class-validator); the FIM master-text pass-through is the documented
  exception.
- **Request validation**: documented upstream limits (page size, page index,
  catalog limit) are validated locally, so invalid input is answered with 400
  before any upstream call.
- **Stable English domain contracts**: the API speaks English identifiers
  only; German appears in upstream query names, URL paths and data content.
- **Shared TypeScript contracts** (`packages/contracts`): the response models
  both the API and the console compile against.
- **React inspection console** (`apps/ui`): a local developer tool for
  exercising the API and inspecting live upstream data.

Runtime integration requests are deterministic and do not depend on LLM
calls.

## The composed service context

The endpoint that shows why this layer exists is
`GET /services/{id}/context?regionalKey=`. A consumer that wants to present
one administrative service completely would otherwise have to call five
upstream resources on two systems and connect them by their identifiers:

```text
PVOG  service detail ─── organisation units ──→ authorities
        │
        └── LeiKa keys ──→ online services (PVOG)
                      └──→ catalog entries (FIM) ──→ master texts (FIM)

PVOG ─────┐
          ├─→ ServiceContext
FIM ──────┘
```

The integration layer loads the service once, follows the published
relations (organisation-unit ids, LeiKa keys, editorial office and service
ids from the catalog), runs the independent lookups in parallel and returns
one `ServiceContext`. The service itself is mandatory (404 when unknown);
each auxiliary part is loaded independently and, when its upstream fails,
comes back as an empty list together with a machine-readable
`status.unavailableParts` entry, so a consumer can distinguish "nothing
published" from "not available right now". Relations are never inferred: a
service without LeiKa keys has no online services, catalog entries or master
texts in its context.

## Upstream isolation in practice

PVOG has announced `/v8beta1/servicedescriptions` as the successor of the
`/v7` service search. Both versions are implemented behind one
`ServiceSearchProvider` interface, each with its own wire models, and both
return the same `ServiceSearchResult` — `GET /services` does not change
when the upstream version does. The adapter is chosen once at startup with
`PVOG_SERVICE_SEARCH_VERSION` (`v7` unless configured otherwise; an unknown
value stops the API), never per request. The v8beta1 hits are a reduced
view, so that adapter completes every hit from the detail endpoint to keep
the contract; `npm run verify:pvog-service-search-compat` runs both
adapters against the live APIs and reports the semantic differences. v7
remains the production default until a separate decision changes it; the
beta adapter comes with no stability promise.

## Supported data sources

| Source                 | Operator | Status                      | Used for                                                                                                                                |
| ---------------------- | -------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PVOG Suchdienst        | FITKO    | Implemented                 | Location autocomplete and resolution, service search, service details, responsible authorities and their contacts, online-service links |
| FIM Portal             | FITKO    | Implemented                 | LeiKa service catalog, federal master texts                                                                                             |
| PVOG Bereitstelldienst | FITKO    | Reference / not implemented | Bulk access to PVOG data; application-based access                                                                                      |

Endpoints, parameters, verified response shapes, deprecations and known quirks
are documented in the handbook:
[`apps/api/docs/INTEGRATIONS.md`](apps/api/docs/INTEGRATIONS.md).

## Current capabilities

The integrations API exposes twelve normalized read-only endpoints and two raw provider endpoints:

| Endpoint                                            | Upstream        | Purpose                                                                                                           |
| --------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /locations/suggestions?query=`                 | PVOG Suchdienst | Autocomplete for city, district or postal code                                                                    |
| `GET /locations?cityName=&postalCode=`              | PVOG Suchdienst | Resolve a city name or postal code to territories                                                                 |
| `GET /locations/{regionalKey}`                      | PVOG Suchdienst | Reverse lookup of a regional key (ARS)                                                                            |
| `GET /services?regionalKey=&query=`                 | PVOG Suchdienst | Plain-language service search within a territory                                                                  |
| `GET /services/{id}?regionalKey=`                   | PVOG Suchdienst | One service description with all content sections and publication metadata                                        |
| `GET /services/{id}/authorities?regionalKey=`       | PVOG Suchdienst | Authorities responsible for the service, with their role, addresses and contacts                                  |
| `GET /services/{id}/context?regionalKey=`           | PVOG + FIM      | Composed context of one service: description, authorities, online services, catalog entries, master texts, status |
| `GET /online-services?regionalKey=`                 | PVOG Suchdienst | Online-application links for a territory (all upstream pages are collected)                                       |
| `GET /online-services/{id}/authorities`             | PVOG Suchdienst | Authorities responsible for an online service, with their roles and contacts                                      |
| `GET /catalog?term=`                                | FIM Portal      | Full-text search over the LeiKa service catalog                                                                   |
| `GET /catalog/{serviceCatalogKey}`                  | FIM Portal      | One catalog entry                                                                                                 |
| `GET /master-texts/{editorialOfficeId}/{serviceId}` | FIM Portal      | Parsed federal master text (unvalidated pass-through)                                                             |
| `GET /raw/pvog/services/{id}/jzufi-2-3`             | PVOG Suchdienst | Raw JZuFi 2.3 body of a service description (provider contract)                                                   |
| `GET /raw/pvog/online-services/{id}/jzufi-2-3`      | PVOG Suchdienst | Raw JZuFi 2.3 body of an online service (provider contract)                                                       |

The API serves an OpenAPI document and Swagger UI at `/docs`.

### Normalized API and raw provider representations

Everything outside `/raw` is the normalized API: English identifiers,
validated wire models, stable shared contracts, and the compatibility
promise of this project. The `/raw/{provider}` namespace is different by
design. It returns the provider's own JSON representation — currently the
JZuFi 2.3 form of a PVOG service description or online service — wrapped in
a small envelope (`provider`, `representation`, `data`) and otherwise
untouched, for consumers that need the canonical XZuFi structure rather
than a normalized model.

> Raw endpoints intentionally expose provider-specific contracts and do not
> receive DirektAmt compatibility guarantees.

The set of raw resources is a static whitelist inside the integration
layer: callers pass an object id, never a host, path or header, and the
request still goes through the same HTTP client, timeout and error mapping
as every normalized call. Only a successful status and a parseable JSON body
are checked; there is no wire model and no normalization.

## Repository structure

| Path                  | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `apps/api/`           | NestJS anti-corruption layer over the upstream APIs ([README](apps/api/README.md)) |
| `apps/api/docs/`      | Handbook of the upstream APIs ([INTEGRATIONS.md](apps/api/docs/INTEGRATIONS.md))   |
| `apps/ui/`            | React inspection console for the integrations API ([README](apps/ui/README.md))    |
| `packages/contracts/` | Shared TypeScript response models (`@direktamt/integrations-contracts`)            |
| `.agents/`            | Conventions and skills for coding agents working in this repository                |

## Quick start

Requirements: Node.js 24 (the version used in CI; any recent release with a
native `fetch` implementation should work) and npm 10 or newer.

```bash
npm ci
npm run dev
```

`npm ci` installs all workspaces and builds the shared contracts package.
`npm run dev` starts the API on `http://localhost:3000` (Swagger UI at
`http://localhost:3000/docs`) and the console on `http://localhost:5173`.

Both applications run with an empty environment; see Configuration for the
optional overrides.

## Configuration

Copy the templates and adjust them when the defaults do not fit:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/ui/.env.example apps/ui/.env
```

| Variable                       | Default                                 | Purpose                                                                                                                   |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                         | `3000`                                  | HTTP port of the API                                                                                                      |
| `CORS_ORIGINS`                 | `http://localhost:5173`                 | Comma-separated browser origins allowed to call the API                                                                   |
| `PVOG_SEARCH_BASE_URL`         | `https://pvog.fitko.net/suchdienst/api` | PVOG Suchdienst base URL                                                                                                  |
| `FIM_PORTAL_BASE_URL`          | `https://fimportal.de/api`              | FIM Portal base URL                                                                                                       |
| `PVOG_SERVICE_SEARCH_VERSION`  | `v7`                                    | Upstream version of the PVOG service search behind `GET /services`: `v7` (production default) or `v8beta1` (experimental) |
| `INTEGRATIONS_HTTP_TIMEOUT_MS` | `15000`                                 | Timeout for outbound upstream requests                                                                                    |
| `VITE_API_BASE_URL`            | `http://localhost:3000`                 | API base URL used by the console (read at build time)                                                                     |

No secrets are required: both upstream APIs are public and unauthenticated.

## Development

```bash
npm run dev          # API and console with file watching
npm run dev:api      # API only
npm run dev:ui       # console only

npm run lint         # ESLint in all workspaces, read-only
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # tsc --noEmit in all workspaces
npm run test         # API unit tests (stubbed fetch, no network)
npm run build        # contracts, API and console
npm run check        # lint, typecheck, test, build
```

CI runs `npm ci` followed by lint, typecheck, test and build on every push and
pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Unit
tests never call the upstream APIs. Live contract verification against PVOG
and FIM is a separate manual procedure described in the handbook.

No UI test runner is currently configured; the console is checked through
TypeScript, ESLint and a production build.

Conventions such as Java-style file naming, English-only identifiers and wire
models with `@Expose` metadata are documented in [`AGENTS.md`](AGENTS.md).

## Project status

The project is pre-1.0.

The current implementation provides live read-only integrations with PVOG
Suchdienst and FIM Portal together with a local developer console for
inspecting the normalized API.

The public API should be considered experimental until a stable 1.0 contract is
declared. Upstream endpoints are listed with their verification dates and
deprecation status in the handbook.

## Data and licensing

The source code of this repository is licensed under the Apache License 2.0
([`LICENSE`](LICENSE)).

That license covers the code and the original documentation only. Data
obtained through PVOG, FIM or any other upstream system remains subject to the
terms of the respective provider; see [`DATA-LICENSING.md`](DATA-LICENSING.md).

## Disclaimer

DirektAmt is an independent project and is not affiliated with or endorsed by
FITKO, the IT Planning Council, or any German public authority.

Administrative data exposed by this project originates from the respective
official upstream systems. Availability, correctness and licensing of upstream
data remain subject to the corresponding providers.
