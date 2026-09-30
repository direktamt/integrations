---
name: new-integration-client
description: >
  Scaffold a new external government API adapter in src/integrations/
  following the house pattern (Module + Client + shared response contracts +
  wire models + facade wiring + handbook entry). Use when adding any new external API to the
  integrations API, e.g. the PVOG Bereitstelldienst.
  Trigger phrases: "add a client for", "integrate the X API",
  "new integration", "новый клиент для".
---

# New Integration Client

Every external API gets the same shape. No exceptions, no shortcuts.

## Files to create (Name = PascalCase API name, e.g. `Bereitstelldienst`)

```
apps/api/src/integrations/<name>/
  <Name>Module.ts            # @Module providing + exporting the client
  <Name>Client.ts            # @Injectable extends BaseHttpClient
  wire/Wire<X>.ts            # wire models, ONE class per file; English
                             # camelCase properties, original JSON names only
                             # in @Expose({ name }) metadata
  model/<Model>.ts           # integration-only inputs/options, when needed

packages/contracts/src/
  <Model>.ts                 # exposed API response models, ONE per file
```

## Rules

1. **Client extends `BaseHttpClient`** (`src/integrations/common/`). Base URL
   comes from `CONFIG.integrations.<name>BaseUrl` (`src/config.ts`), backed by
   the `<NAME>_BASE_URL` env var with a production default. Never read
   `process.env` outside `src/config.ts`. Add the variable to `.env.example`
   and to the `apps/api/README.md` configuration table.
2. **Wire models never leak.** Every public client method returns response
   contracts from `@direktamt/integrations-contracts`; mapping happens in private
   `to<Model>()` methods inside the
   client. German/snake_case names exist only inside `@Expose({ name })`
   metadata in `wire/`; wire responses are fetched via
   `getModel`/`getModelArray` so they are transformed and validated.
3. **Translate at the boundary.** Reuse the canonical dictionary in
   `.agents/AGENTS.md` (regionalKey, serviceCatalogKey, ...). New German
   terms → add the translation to that table in the same commit.
4. **Wire through the facade.** Add the client to `IntegrationsModule`
   imports (via its module) and expose use-case-level methods on
   `GovDataFacade`. Controllers never see the client.
5. **Document.** Add a section to `docs/INTEGRATIONS.md`: base URL, auth,
   endpoints per process, at least one verified request/response example.
6. **Verify.** Run the root `npm run build`; add the new endpoints to the
   verify-wire-contracts skill's endpoint list.

## Checklist (paste into the final report)

- [ ] Module / Client / shared response contracts / wire models created, Java-style file names
- [ ] Env var + README config table updated
- [ ] No German or snake_case identifiers anywhere (only @Expose metadata)
- [ ] AGENTS.md translation table extended (if new terms)
- [ ] GovDataFacade + IntegrationsModule wired
- [ ] INTEGRATIONS.md section added with verified example
- [ ] Build green
