# DirektAmt Integrations API: Agent Instructions

NestJS 11 API. Read the root `.agents/AGENTS.md` first; rules below are
specific to the integrations API.

## Build & run

```bash
npm run dev:api
npm run build --workspace @direktamt/integrations-api
npm run test --workspace @direktamt/integrations-api
npm run lint --workspace @direktamt/integrations-api
```

## Conventions

1. **File naming: Java-style.** PascalCase, file name = main class name
   (`GovDataFacade.ts`, `PvogModule.ts`, `Main.ts`). Never NestJS kebab-case.
   The Nest CLI generators produce kebab-case — do not use `nest generate`
   without renaming the output, including updating `nest-cli.json`
   `entryFile` if relevant (currently `Main`).

2. **English-only identifiers.** Translate German domain terms at the
   boundary. Canonical translations already in use:

   | German (wire)                                                                | English (domain)           |
   | ---------------------------------------------------------------------------- | -------------------------- |
   | ARS / Amtlicher Regionalschlüssel                                            | `regionalKey`              |
   | Leistungsschlüssel (LeiKa)                                                   | `serviceCatalogKey`        |
   | Leistungsbeschreibung                                                        | `PublicServiceDescription` |
   | Erforderliche Unterlagen                                                     | `RequiredDocuments`        |
   | Voraussetzungen                                                              | `Requirements`             |
   | Kosten & Gebühren                                                            | `Fees`                     |
   | Fristen                                                                      | `Deadlines`                |
   | Zuständige Stelle                                                            | `ResponsibleAuthority`     |
   | Onlinedienst                                                                 | `OnlineService`            |
   | German or snake_case property names are forbidden in ALL models, including   |
   | wire models in `wire/`: wire models declare English camelCase properties and |
   | keep the original JSON contract name only in `@Expose({ name: '...' })`      |
   | metadata (class-transformer). BaseHttpClient transforms responses with       |
   | `excludeExtraneousValues: true`, so a wire field without `@Expose` is        |
   | silently dropped — every consumed field must carry it. German strings stay   |
   | only in query parameters, URL paths and data content.                        |

3. **Integration architecture.**
   - `integrations/` contains one adapter per external API
     (`PvogSearchClient`, `FimPortalClient`), each in its own module.
   - App code depends only on `GovDataFacade`. Never inject clients directly
     into controllers/use cases.
   - New external API → new subfolder with `{Name}Module`, `{Name}Client`,
     wire models in `wire/`, one class per file. API response models exposed to
     consumers go in `../../packages/contracts/`, one
     interface/enum per file;
     integration-only inputs may stay in the integration's `model/` folder.
     No `*Models.ts` / `*Types.ts` aggregate files.
   - All HTTP goes through `BaseHttpClient` (timeout, typed errors). Do not
     add axios or other HTTP dependencies without discussion.

4. **Read-method verbs encode semantics** (same verb through the whole
   controller → facade → client chain, no verb jumping between layers):

   | Verb                                                                             | Semantics                                                | Example              |
   | -------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------- |
   | `get*`                                                                           | single entity by identity/key; absence is exceptional    | `getCatalogEntry`    |
   | `list*`                                                                          | enumerate everything under a key; empty result is normal | `listOnlineServices` |
   | `search*`                                                                        | full-text/ranked search over a query string              | `searchServices`     |
   | `suggest*`                                                                       | autocomplete: ranked suggestions for a partial input     | `suggestLocations`   |
   | `resolve*`                                                                       | map user input to canonical identifiers                  | `resolveLocation`    |
   | Do NOT use a blanket `get*` for remote lookups and searches, and do not          |
   | introduce `find*` — its niche is covered by `resolve*`/`list*` here.             |
   | The noun's number follows the OPERATION's semantics, not the return              |
   | type's cardinality: `resolveLocation` takes one location reference and           |
   | returns candidate matches (like DNS "resolve a hostname"), while                 |
   | `suggestLocations` is inherently plural. The same entity keeps the same          |
   | name across all layers — no `Catalog` in one layer and `ServiceCatalog`          |
   | in another.                                                                      |
   | Controllers use the bare verb (`LocationController.suggest`) since the           |
   | class name carries the noun; facade and clients keep verb+noun                   |
   | (`suggestLocations`). URL paths stay resource-nouns, never verbs                 |
   | (`GET /locations/suggestions`, not `/locations/suggest`).                        |
   | Request DTOs in `api/request/` are reified operations and mirror the             |
   | method verb-first (`SearchCatalogQuery` ↔ `searchCatalog`); domain/result        |
   | models are entities and stay noun phrases (`CatalogSearchResult`) — this         |
   | asymmetry is intentional.                                                        |
   | See `../../docs/decisions/0006-read-method-verb-semantics.md` for the rationale. |

5. **External API reference.** `docs/INTEGRATIONS.md` is the source of truth
   for endpoints, parameters and verified response shapes. Update it when the
   integration surface changes.

6. **Runtime determinism.** Runtime integration requests are deterministic and
   do not depend on LLM calls.

7. **Logging hygiene.** Never log full upstream URLs or request inputs.
   `BaseHttpClient` reduces URLs to origin and path (`UrlSanitizer`) before
   they reach logs or exception messages; error responses never contain
   upstream URLs or bodies.

8. **Tests.** Unit tests live next to the code as `*.spec.ts` and stub
   `fetch` through `test/FetchStub.ts`; they must never reach the network.
   Fixtures are small and synthetic.

## Gotchas

- Section `text` values from PVOG are raw HTML — render safely, never parse
  ad hoc at runtime.
- `/v1beta2/onlineservices` is a beta endpoint; expect breaking changes.
- The legacy Suchdienst API host `pvog.fitko.de` was switched off; the API
  lives at `pvog.fitko.net` (the `.de` host serves the product portal).
- FIM catalog full-text search uses `fts_query`; a `search` parameter is
  silently ignored upstream.
- FIM `parsed-xzufi` is declared unstable by the operator; it stays an
  unvalidated pass-through.
