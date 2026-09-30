---
name: nest-scaffold
description: >
  Create NestJS artifacts (module, controller, service, provider) with
  Java-style PascalCase file naming instead of the Nest CLI kebab-case
  default. Use whenever a new Nest module/controller/service/guard/pipe is
  needed in the integrations API. Trigger phrases: "add a controller", "new module",
  "generate a service", "создай модуль/контроллер".
---

# Nest Scaffold (Java-style naming)

The Nest CLI generates `foo-bar.controller.ts` — that violates this repo's
convention. File name = class name, PascalCase, one main class per file.

## Procedure

1. **Do not run `nest generate` directly.** Write the files by hand (they are
   short) or, if you did generate, rename immediately and fix all imports.

2. Naming scheme:

   | Artifact         | Class              | File                       |
   | ---------------- | ------------------ | -------------------------- |
   | Module           | `SearchModule`     | `SearchModule.ts`          |
   | Controller       | `SearchController` | `SearchController.ts`      |
   | Service/use case | `SearchService`    | `SearchService.ts`         |
   | Facade           | `GovDataFacade`    | `GovDataFacade.ts`         |
   | Request DTO      | `SearchQuery`      | `SearchQuery.ts`           |
   | Spec             | —                  | `SearchController.spec.ts` |

3. Placement: feature folders under `src/<feature>/`, integration adapters
   under `src/integrations/<name>/` (see the new-integration-client skill).

4. Wire the module into `AppModule` (or the owning feature module) in the
   same change.

5. Remember repo specifics:
   - entry file is `Main.ts` (`nest-cli.json` → `"entryFile": "Main"`),
   - controllers depend on `GovDataFacade`, never on integration clients,
   - English-only identifiers.

6. Verify from the repository root:
   `npm run build --workspace @direktamt/integrations-api` and
   `npm run lint --workspace @direktamt/integrations-api` must pass.
