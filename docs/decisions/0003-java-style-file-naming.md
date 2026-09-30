# 0003 — Use Java-style file naming instead of NestJS kebab-case

- **Status:** Accepted
- **Date:** 2026-07-19 (backfilled; in force since project start)

## Context

The Nest CLI generates `foo-bar.controller.ts`. The team prefers one main
class per file with the file named after the class, as in Java, for direct
class↔file mapping and simpler navigation.

## Decision

File name equals the main class name in PascalCase (`GovDataFacade.ts`,
`PvogModule.ts`, `Main.ts`); one main class/interface per file; no aggregate
`*Models.ts`/`*Types.ts` files. `nest generate` output must be renamed.

## Consequences

Navigation and imports are predictable; grep by class name finds the file.
Cost: Nest CLI generators and most Nest tutorials disagree with our layout,
and defaults (e.g. swagger plugin file suffixes, `entryFile`) need explicit
configuration. Reconsider only if tooling friction becomes recurring.
