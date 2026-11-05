# @direktamt/integrations-mcp

[Model Context Protocol](https://modelcontextprotocol.io) server for the
DirektAmt integrations API. It exposes every public endpoint of the
normalized API as one read-only MCP tool over stdio, so that an MCP host
(an agent, an IDE, the MCP Inspector) reads official public-administration
data through tools instead of HTTP calls.

The server is a thin adapter over `@direktamt/integrations-client`: each tool
validates its arguments, calls the matching client method and returns the
response contract of `@direktamt/integrations-contracts` unchanged, as JSON
text. It makes no LLM call, holds no state and adds no ranking, trimming or
summarising. All data comes from a running integrations API (`apps/api`).

The package is private and not published yet; inside this monorepo it is a
workspace with the binary `direktamt-integrations-mcp`.

## Run

```bash
npm ci
npm run build                 # builds contracts, client and this package
npm run dev:api               # the server needs a running API
```

```bash
DIREKTAMT_API_BASE_URL=http://localhost:3000 node packages/mcp/dist/Main.js
```

| Variable                 | Default                 | Purpose                                      |
| ------------------------ | ----------------------- | -------------------------------------------- |
| `DIREKTAMT_API_BASE_URL` | `http://localhost:3000` | Origin (and optional path prefix) of the API |

stdout carries the MCP protocol only; a configuration error is printed to
stderr and stops the process.

An MCP host starts the server as a child process, for example:

```json
{
  "mcpServers": {
    "direktamt-integrations": {
      "command": "node",
      "args": ["<repository>/packages/mcp/dist/Main.js"],
      "env": { "DIREKTAMT_API_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

To inspect the tools interactively:

```bash
npx @modelcontextprotocol/inspector node packages/mcp/dist/Main.js
```

## Tools

Every tool is annotated read-only, idempotent and open-world. Tool names are
camelCase and use the verb semantics of the API (`get`, `list`, `search`,
`suggest`, `resolve`); arguments mirror the client requests.

| Tool                           | Endpoint                                            | Returns                                                                  |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `suggestLocations`             | `GET /locations/suggestions`                        | `LocationSuggestion[]`: place names for a partial input                  |
| `resolveLocation`              | `GET /locations`                                    | `Location[]`: territories with their regional key for a city or postcode |
| `getLocation`                  | `GET /locations/{regionalKey}`                      | `Location`                                                               |
| `searchServices`               | `GET /services`                                     | `ServiceSearchResult`: one page of service descriptions in a territory   |
| `getService`                   | `GET /services/{id}`                                | `PublicServiceDescription` with all sections                             |
| `listServiceAuthorities`       | `GET /services/{id}/authorities`                    | `ServiceAuthority[]`                                                     |
| `getServiceContext`            | `GET /services/{id}/context`                        | `ServiceContext`: description, authorities, online services, FIM data    |
| `listOnlineServices`           | `GET /online-services`                              | `OnlineService[]` of a territory, optionally filtered by LeiKa keys      |
| `listOnlineServiceAuthorities` | `GET /online-services/{id}/authorities`             | `OnlineServiceAuthority[]`                                               |
| `searchCatalog`                | `GET /catalog`                                      | `CatalogSearchResult` of the federal LeiKa catalog                       |
| `getCatalogEntry`              | `GET /catalog/{serviceCatalogKey}`                  | `CatalogEntry`                                                           |
| `getMasterText`                | `GET /master-texts/{editorialOfficeId}/{serviceId}` | `ParsedMasterText` (unvalidated pass-through)                            |

The tool descriptions tell a model where required ids come from: the
regional key from `resolveLocation`, a service id from `searchServices`,
LeiKa keys from service descriptions or the catalog, editorial office and
service ids from a catalog entry. The server also sends short usage
instructions in its initialization response.

The two raw provider endpoints `GET /raw/pvog/services/{id}/jzufi-2-3` and
`GET /raw/pvog/online-services/{id}/jzufi-2-3` have no tool: they return the
unnormalized provider document without compatibility guarantee, and the
normalized tools cover their content.

## Errors

Following the MCP specification, failures of the API are tool execution
errors: the result has `isError: true` and one text block whose first word
names the category, so that the model can correct its arguments or choose
another tool. Nothing about upstream hosts or the network cause is exposed.

| Category              | Cause                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| `invalidArguments`    | The API rejected the arguments (HTTP 400); the messages are included   |
| `notFound`            | Unknown id or key (HTTP 404)                                           |
| `upstreamUnavailable` | PVOG or FIM failed or timed out (HTTP 502, 503, 504); retry later      |
| `apiError`            | Any other answer of the API, including a body that is not JSON         |
| `apiUnreachable`      | No response from the API (not running, wrong `DIREKTAMT_API_BASE_URL`) |

Arguments that do not match a tool's input schema (missing, unknown or out
of range) are rejected by the MCP SDK as a tool error before the API is
called. A cancelled request aborts the underlying HTTP call.

## Tool coverage check

```bash
npm run verify:mcp-coverage
```

Reads the routes of the API from its NestJS controller metadata (no server
start, no network) and fails when a public endpoint has neither a tool nor
an entry in `src/tools/ExcludedEndpoints.ts`, when two tools cover one
endpoint, when a tool names an endpoint the API does not have, or when an
exclusion is stale. It runs in `npm run check` and in CI, so a new public
endpoint needs its tool (or a documented exclusion) in the same change as
the client method.

## Development

```bash
npm run test --workspace @direktamt/integrations-mcp       # in-memory MCP client, stubbed fetch
npm run lint --workspace @direktamt/integrations-mcp
npm run typecheck --workspace @direktamt/integrations-mcp
```

Tests connect a real MCP client to the server through the SDK's in-memory
transport and stub `fetch`; they never reach the network. Typecheck, lint
and tests resolve the client from its source, the build from its compiled
package, so `npm run build` builds the client first.
