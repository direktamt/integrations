# DirektAmt Integrations: Agent Instructions

## What this project is

This repository owns DirektAmt Integrations: the open-source integration layer
of the DirektAmt project, a normalized gateway to official German
public-administration APIs (PVOG, FIM) plus a developer console for
inspecting it. All code and documentation stay within this integration
boundary; the broader DirektAmt application is not part of this repository.

Monorepo: `apps/api/` (NestJS anti-corruption layer), `apps/ui/` (developer
console), and `packages/contracts/` (shared response models). API-specific
instructions: `apps/api/.agents/AGENTS.md`.

## Hard conventions (apply everywhere)

1. **English-only naming, no exceptions in models.** All identifiers, file
   names, comments and docs are in English camelCase/PascalCase. German terms
   from external APIs are translated at the boundary: ARS → `regionalKey`,
   Leistungsschlüssel (LeiKa key) → `serviceCatalogKey`, Erforderliche
   Unterlagen → `RequiredDocuments`, and so on. No model — including wire DTOs
   in `wire/` — may declare German or snake_case properties: wire
   models carry the original JSON contract name only in class-transformer
   `@Expose({ name: '...' })` metadata. German/snake_case strings remain
   allowed in HTTP query parameters, URL paths and upstream data content.

2. **Java-style file naming.** One main class/interface per file, file name
   equals the class name in PascalCase: `PvogSearchClient.ts`, `AppModule.ts`,
   `Main.ts`. Do NOT use the NestJS kebab-case convention
   (`app.module.ts`, `pvog-search.client.ts`).

3. **Determinism at runtime.** Integration requests use structured data and
   classic search/filters. Runtime integration requests are deterministic and
   do not depend on LLM calls.

4. **Official sources only.** All public-administration data comes from the
   documented official APIs (see `apps/api/docs/INTEGRATIONS.md`). Do not scrape
   municipal websites; do not invent document lists or legal requirements.

5. **Skills live in `.agents/skills/` per layer** (repo root and individual
   applications such as `apps/api/`). Agent-specific directories
   only symlink to them
   (`.claude/skills → ../.agents/skills`). Never create a skill directly in
   an agent-specific directory.

6. **One source for integrations API response contracts.** Models returned by
   the integrations API and consumed by its clients live in
   `packages/contracts/`. Producers and consumers import
   `@direktamt/integrations-contracts`; they never keep local mirror copies.
   Upstream wire models, request DTOs and integration-only option models stay
   in the layer that owns them.

7. **Integration scope only.** Add code only when it integrates, normalizes,
   verifies or inspects official upstream data. The deployable applications
   remain `apps/api` and `apps/ui`; any additional deployable requires an ADR
   demonstrating integration-domain ownership.

## Key documents

- `apps/api/docs/INTEGRATIONS.md`: handbook of the external
  public-administration APIs (PVOG Suchdienst, FIM Portal; Bereitstelldienst
  as reference), with verified endpoints, deprecations and request/response
  examples.
- `DATA-LICENSING.md`: code license versus upstream documentation and data
  licensing.
