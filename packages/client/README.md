# @direktamt/integrations-client

Typed TypeScript client for the DirektAmt integrations API. It speaks to
the normalized HTTP API with the native `fetch`, returns the shared response
models of `@direktamt/integrations-contracts` and throws a typed error for
every non-2xx answer. No runtime dependencies besides the contracts package;
works in browsers and in Node.js 18+ (any runtime with a global `fetch`).

The package is private until a separate release decision; inside this
monorepo it is linked as a workspace.

## Usage

```ts
import {
  DirektAmtClient,
  DirektAmtApiError,
} from '@direktamt/integrations-client';

const client = new DirektAmtClient({ baseUrl: 'http://localhost:3000' });

const [bonn] = await client.locations.resolve({ cityName: 'Bonn' });

const result = await client.services.search({
  regionalKey: bonn.regionalKey,
  query: 'Wohnsitz anmelden',
  fuzzySearch: false, // sent as fuzzySearch=false; the API defaults to true
});

const context = await client.services.getContext({
  id: result.services[0].id!,
  regionalKey: bonn.regionalKey,
});

if (!context.status.complete) {
  console.warn('parts not loaded:', context.status.unavailableParts);
}
```

Every method takes a request object and optional per-request options
(`signal`, `headers`):

```ts
const controller = new AbortController();

const entries = await client.catalog.search(
  { term: 'Anmeldung', limit: 20 },
  { signal: controller.signal, headers: { 'X-Correlation-Id': 'abc' } },
);
```

## API groups

| Group                   | Methods                                    | Endpoints                                                                                       |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `client.locations`      | `suggest`, `resolve`, `get`                | `GET /locations/suggestions`, `GET /locations`, `GET /locations/{regionalKey}`                  |
| `client.services`       | `search`, `get`, `getContext`              | `GET /services`, `GET /services/{id}`, `GET /services/{id}/context`                             |
| `client.authorities`    | `listForService`, `listForOnlineService`   | `GET /services/{id}/authorities`, `GET /online-services/{id}/authorities`                       |
| `client.onlineServices` | `list`                                     | `GET /online-services`                                                                          |
| `client.catalog`        | `search`, `get`, `listServices`            | `GET /catalog`, `GET /catalog/{serviceCatalogKey}`, `GET /catalog/{serviceCatalogKey}/services` |
| `client.masterTexts`    | `get`                                      | `GET /master-texts/{editorialOfficeId}/{serviceId}`                                             |
| `client.raw.pvog`       | `getServiceJzufi`, `getOnlineServiceJzufi` | `GET /raw/pvog/services/{id}/jzufi-2-3`, `GET /raw/pvog/online-services/{id}/jzufi-2-3`         |

Everything under `client.raw` returns provider representations inside the
`RawSourceResponse` envelope: `data` follows the provider's own contract and
receives no DirektAmt compatibility guarantee, unlike the normalized groups.

Response and request models are exported from the package; the response
models are re-exported from `@direktamt/integrations-contracts`, not copied.

## Options

```ts
new DirektAmtClient({
  baseUrl: 'https://integrations.example', // origin plus optional path prefix
  fetch: myFetch, // optional: custom fetch (tests, tracing, polyfills)
  headers: { 'X-Correlation-Id': 'abc' }, // optional: sent with every request
});
```

The custom `fetch` receives `(url, { method: 'GET', headers, signal })` and
must return a `Response`.

## Errors

Non-2xx answers reject with `DirektAmtApiError`:

```ts
try {
  await client.locations.get({ regionalKey: '999999999999' });
} catch (error) {
  if (error instanceof DirektAmtApiError) {
    error.status; // 404
    error.code; // 'UpstreamHttpException' (the API's error field) or 'MALFORMED_RESPONSE'
    error.message; // human-readable, details joined
    error.details; // string[]; several entries for 400 validation errors
    error.responseBody; // parsed JSON body, or the raw text when it was not JSON
  }
}
```

| Status | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| 400    | request validation failed; `details` lists every message  |
| 404    | the resource does not exist in the government data source |
| 502    | upstream unavailable or its contract violated             |
| 504    | upstream timed out                                        |

A 2xx answer whose body is not JSON rejects with `code: 'MALFORMED_RESPONSE'`.
Transport failures and aborts are not wrapped: they reject with the error of
the fetch implementation (for example `AbortError`). The client has no
retry logic; the API already handles upstream resilience. The error never
carries request or response headers.

## Query serialization

One serializer handles every request object: `undefined` and `null` are
omitted, `false` and `0` are sent literally (the API defaults `fuzzySearch`
and `useRegionalHierarchy` to `true`, so `false` matters), arrays become
repeated keys (`lifeSituationCodes=a&lifeSituationCodes=b`), dates are sent
as ISO 8601 timestamps.

## Development

```bash
npm run build --workspace @direktamt/integrations-client      # CJS + ESM with .d.ts and source maps
npm run test --workspace @direktamt/integrations-client       # unit tests against a stub fetch
npm run lint --workspace @direktamt/integrations-client
npm run typecheck --workspace @direktamt/integrations-client
```
