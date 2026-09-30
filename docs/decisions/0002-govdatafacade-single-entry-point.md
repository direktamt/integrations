# 0002 — Use GovDataFacade as the only integration entry point

- **Status:** Accepted
- **Date:** 2026-07-19 (backfilled; in force since project start)

## Context

The integrations API aggregates several external government APIs (PVOG
Suchdienst, FIM Portal). Consumers should remain independent of individual
upstream providers and of whether data is obtained live, cached or
persisted.

## Decision

Application code (controllers, use cases) depends only on `GovDataFacade`.
Integration clients are never injected outside `integrations/`.

## Consequences

Switching between live, cached or persisted data changes one class's
internals; upstream API swaps stay invisible to app code. Cost: the facade
grows with every new capability and some methods are thin pass-throughs.
Reconsider if the facade exceeds roughly a dozen methods; then split into
per-domain facades.
