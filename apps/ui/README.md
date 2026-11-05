# DirektAmt Integrations UI

Developer-facing inspection console for the DirektAmt integration layer.

The UI is used to exercise normalized API endpoints, inspect live
public-administration data and diagnose upstream contract behavior.

It is not the end-user DirektAmt application. The UI is local, read-only, and
intended for integration development, contract inspection, data-quality
analysis, and upstream debugging. It provides shareable forms and result views
for live public-administration data without requiring ad-hoc curl or Swagger
sessions.

## Stack

- React 19 and strict TypeScript
- Vite
- Material UI 9 with the DirektAmt UI kit (`@direktamt/ui-kit`)
- TanStack React Query 5
- React Router 7
- Axios through the typed `ApiClient`
- DOMPurify for upstream HTML

Server state belongs to React Query and local drafts belong to components. Do
not add Redux, Zustand, or another global state library without a concrete
cross-page client-state requirement.

Response models come from the shared
`@direktamt/integrations-contracts` workspace package.

## Look and layout

The console uses the public DirektAmt UI kit for its theme, fonts, logo and
favicon, and for the application frame: `AppShell` with a grouped side
navigation (a drawer on small screens), `PageHeader`, `SectionCard`,
`DescriptionList`, `CodeBlock`, `EmptyState` and `LoadingState`. Light and
dark colour schemes follow the system setting and can be switched in the
header; the choice is stored in `localStorage`. Every page header lists the
integrations API endpoints the page calls. The header links to the API's
Swagger UI (`/docs`), and the navigation footer shows the configured API
base URL.

Until `@direktamt/ui-kit` is available on npm, install a local build of the
kit without recording it in the lockfile, from the kit's checkout:

```bash
npm pack --pack-destination /tmp
```

and then in this repository (temporarily remove the `@direktamt/ui-kit`
entry from `apps/ui/package.json` first, so that npm does not look it up in
the registry, and restore it afterwards):

```bash
npm install --no-save /tmp/direktamt-ui-kit-0.1.0.tgz -w @direktamt/integrations-ui
```

## Getting started

Install dependencies and start both applications from the repository root:

```bash
npm install
npm run dev
```

Alternatively, run the API and UI in separate terminals:

```bash
npm run dev:api
npm run dev:ui
```

The default local addresses are:

- UI: `http://localhost:5173`
- API: `http://localhost:3000`

The integrations API must be running for queries to return data.

## Configuration

Create `apps/ui/.env` when the API is not available at the default address.
Vite reads the variable at build/start time.

| Environment variable | Default                 | Purpose                   |
| -------------------- | ----------------------- | ------------------------- |
| `VITE_API_BASE_URL`  | `http://localhost:3000` | Integrations API base URL |

See `.env.example` for the development template. The API's default CORS
configuration already permits `http://localhost:5173`.

## Commands

Run these from the repository root:

```bash
npm run dev:ui
npm run typecheck --workspace @direktamt/integrations-ui
npm run lint --workspace @direktamt/integrations-ui
npm run build --workspace @direktamt/integrations-ui
npm run preview --workspace @direktamt/integrations-ui
```

No UI test runner is currently configured. URL-state behaviour (refresh,
copied deep links, Back/Forward, the boolean defaults) is verified manually in
the browser against the running API.

## Routes and endpoint coverage

| Route                   | Integrations API endpoints                                                              |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `/`                     | Redirects to `/services`                                                                |
| `/locations`            | `GET /locations/suggestions`, `GET /locations`, `GET /locations/{regionalKey}`          |
| `/services`             | `GET /services`                                                                         |
| `/services/:id`         | `GET /services/{id}?regionalKey=`, `GET /services/{id}/authorities?regionalKey=`        |
| `/services/:id/context` | `GET /services/{id}/context?regionalKey=`                                               |
| `/online-services`      | `GET /online-services`, `GET /online-services/{id}/authorities`                         |
| `/catalog`              | `GET /catalog`, `GET /catalog/{serviceCatalogKey}`                                      |
| `/master-texts`         | `GET /master-texts/{editorialOfficeId}/{serviceId}`                                     |
| `/raw`                  | `GET /raw/pvog/services/{id}/jzufi-2-3`, `GET /raw/pvog/online-services/{id}/jzufi-2-3` |

All request-defining state is stored in URL search parameters so views survive
refresh, can be shared, and work with browser Back and Forward navigation.
Local state is limited to drafts before submit or debounce; drafts
re-synchronize from the URL whenever it changes (Back, Forward, deep link,
programmatic navigation), so the visible form always matches the committed
request.

### Locations

The `/locations` page contains three independent panels:

- Suggest: 300 ms debounced autocomplete with relevance scores.
- Resolve: `cityName` and `postalCode` inputs; at least one is required.
- Reverse lookup: load one territory by `regionalKey` and render 404 inline.

Location results expose copyable regional keys and can open a pre-filled
service search. Updating one panel must preserve URL parameters owned by the
other panels.

### Services

The service search exposes every `GET /services` parameter: `regionalKey` and
`query` are required; `size`, `page`, `fuzzySearch`,
`useRegionalHierarchy`, `lifeSituationCodes`, and `validDate` are optional.
Defaults match the API: `fuzzySearch` and `useRegionalHierarchy` default to
`true`, an absent URL parameter means `true`, and only an explicit
`fuzzySearch=false` or `useRegionalHierarchy=false` is stored in the URL. The
checkboxes and the outgoing request always reflect the effective value; an
unchecked box sends `false` explicitly.

Results use server-side pagination and show titles with the summary as
plain text, service catalog keys,
section counts, and the publication metadata (target audiences, languages,
federal states) as compact chip groups; empty groups are omitted. Selecting a row opens the deep-linkable
`/services/:id?regionalKey=...` detail page; when the search ran with
`useRegionalHierarchy=false`, the detail link carries that parameter along
and the detail page applies the same absent-means-true semantics. The detail
page renders all sections, links, official keys, sanitized upstream HTML, and
the raw response. Target audiences, languages and federal states are shown
as compact chip groups; a group without values is omitted (the detail
endpoint publishes only the languages).

Below the sections, a "Responsible authorities" region loads
`GET /services/{id}/authorities` with the same `regionalKey` and
`useRegionalHierarchy` values in its own query gate. Each authority shows
its name, normalized role, copyable organisation-unit id, addresses with
their type, contact channels with type and published label (web channels
and websites open in a new tab), and the raw authorities response. An empty
list is an explicit empty state; a 404 stays inline within that region.

The detail page's "Inspect composed context" action opens
`/services/:id/context` with the same URL parameters. That page loads
`GET /services/{id}/context` in one query and renders the status first
(success when complete, otherwise the unavailable parts as chips), then one
region per part: the service (title, catalog keys, metadata, link back to
the detail page), responsible authorities, online services (the shared
online-service table), catalog entries (key, title, editorial office id,
service id, service type) and master texts (one raw JSON block each), plus
the raw context. A part listed as unavailable shows a warning instead of
its empty content; a genuinely empty part says "None".

### Online services

The `/online-services` form requires `regionalKey` and accepts optional
comma-separated `serviceCatalogKeys`. The API collects all upstream pages, so
the list is complete for the territory. Results show name, description,
service catalog keys, external links, and `lastUpdatedAt`. Selecting a row
stores the online-service id in the `selected` URL parameter and opens a
dialog with `GET /online-services/{id}/authorities`: the responsible
organisations as authority cards with their roles, addresses, contacts and
websites, plus the raw response. The list itself never loads authorities.

### Catalog

The `/catalog` form searches by required `term` with optional `limit` and
`offset`. Results use server-side pagination. Selecting a row opens a dialog
with the full catalog entry and a pre-filled link to its master text.

### Master texts

The `/master-texts` form requires `editorialOfficeId` and `serviceId` and
accepts optional `source` with default `primary`. The pass-through response is
shown in `JsonViewer`. A missing pair is an inline empty state, not a global
error.

### Raw sources

The `/raw` page loads a provider representation instead of a normalized
model: `resource` (`services` by default, or `online-services`) and the
PVOG `id` live in the URL. The response envelope (`provider`,
`representation`) is shown as chips and the `data` body in `JsonViewer`,
expanded, with the upstream field names untouched. A missing id is an
inline empty state. The service detail page links to its raw
representation ("Raw JZuFi 2.3"). The page renders raw JSON only; it does
not interpret the XZuFi structure.

## API and query layer

`ApiClient` reads `VITE_API_BASE_URL`, sends `Accept: application/json`, and
normalizes failures into `ApiError(status, details)`. Pages and components do
not call axios or `fetch` directly.

All response models are imported from
`@direktamt/integrations-contracts`; the UI never declares mirror response
types. Request-only parameter types stay next to the query hook that owns them.

Each endpoint has a resource-oriented React Query hook:

- `useSuggestLocations`, `useResolveLocation`, `useLocation`
- `useSearchServices`, `useService`, `useServiceAuthorities`,
  `useServiceContext`
- `useOnlineServices`, `useOnlineServiceAuthorities`
- `useSearchCatalog`, `useCatalogEntry`
- `useMasterText`
- `useRawPvogJzufi`

Query keys include every request-defining input. Queries remain disabled until
all required committed URL values are present. Automatic retries and
refetch-on-window-focus are disabled so requests in this inspection tool stay
intentional.

## Loading, empty, and error states

Every query-driven region renders through `QueryStateGate`, which owns the idle
hint, spinner, retry action, not-found handling, and explicit empty state.

| Integrations API status | UI treatment                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `400` validation        | Inline form details through `ValidationErrorAlert`                          |
| `404`                   | Inline empty/not-found state within the owning query region                 |
| `502`                   | Retryable local state and “Government data source is unavailable.” snackbar |
| `504`                   | Retryable local state and “Government data source timed out.” snackbar      |
| Other or network        | Retryable local state and snackbar with the error message                   |

The application mounts one global `ErrorSnackbar`, driven by React Query's
global `QueryCache.onError`. It auto-hides after six seconds. Do not add
page-level global snackbar hosts.

## Source layout

```text
src/
  Main.tsx                 # global providers and query error routing
  App.tsx                  # route table and global snackbar host
  api/
    ApiClient.ts           # typed axios boundary
    ApiError.ts            # normalized API errors
    queries/               # one resource-oriented query-hook file per resource
  components/              # primitives shared by at least two pages
  pages/                   # route folders and page-private components
```

Use one component per PascalCase file. Keep page-private components in the page
folder and move them to `src/components/` after a second page uses them. Pages,
panels, and data-loading dialogs may call query hooks; presentational
components receive data and callbacks through props.

All identifiers and authored UI copy are English. German text may appear as
upstream content or in explanatory labels for official terms such as ARS and
LeiKa. The UI has no i18n layer.

## Security

PVOG service-section `text` is untrusted upstream HTML. Only `HtmlSection` may
render it, and only after DOMPurify sanitization. Render arbitrary pass-through
objects with `JsonViewer`. Open upstream links in a new tab with
`rel="noreferrer"`.

## Non-goals

- Authentication or authorization
- End-user workflows, onboarding, or product UX
- Editing or other write operations
- SEO or server-side rendering
- Offline support or PWA behavior
- Internationalization

## Completion criteria

- All fourteen integrations API endpoints are reachable and inspectable.
- Every display-defining value survives refresh through URL parameters.
- TypeScript remains strict, with no `any` in `src/api/`.
- Loading, empty, `400`, `404`, `502`, `504`, and retry behavior are explicit.
- Shared JSX is extracted after the second page needs it.
- Build and lint succeed when validation is requested.

See [`.agents/AGENTS.md`](.agents/AGENTS.md) for agent-facing implementation
conventions.
