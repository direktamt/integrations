# 0006 — Encode read semantics in method verbs, consistently across layers

- **Status:** Accepted
- **Date:** 2026-07-19

## Context

Read methods appeared with mixed verbs for the same operation across layers
(`listOnlineServices` → `findOnlineServices` → `listOnlineServices`), and a
blanket `get*` was considered. `get*` connotes a cheap accessor returning an
entity by identity, which misdescribes remote ranked searches and
normally-empty lookups; verb jumping between layers breaks grep and reading.

## Decision

Verbs carry semantics and stay identical through the controller → facade →
client chain: `get*` single entity by key (absence exceptional), `list*`
enumerate under a key (empty normal), `search*` full-text/ranked, `suggest*`
autocomplete, `resolve*` map user input to canonical identifiers. No blanket
`get*` for lookups/searches; `find*` is not used — `resolve*`/`list*` cover
its niche.

Refinements: the noun's grammatical number follows the operation's
semantics, not the return type's cardinality (`resolveLocation` resolves one
location reference into candidate matches, like DNS resolves one hostname
into several addresses). One entity keeps one name across all layers (no
`Catalog`/`ServiceCatalog` drift). Request DTOs are reified operations named
verb-first after the method (`SearchCatalogQuery`); domain/result models are
entities named as noun phrases (`CatalogSearchResult`) — that asymmetry is
intentional.

## Consequences

Signatures self-describe cost and emptiness semantics; a verb greps through
the whole stack. Cost: contributors must learn a five-verb vocabulary
(table in `apps/api/.agents/AGENTS.md`) instead of defaulting to `get*`.
Reconsider if a read mode appears that fits none of the five verbs.
