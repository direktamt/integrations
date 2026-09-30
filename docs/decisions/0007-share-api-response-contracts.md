# 0007 — Share API response contracts through a workspace package

- **Status:** Accepted
- **Date:** 2026-07-19

## Context

The integrations API and its internal UI declared separate copies of the same
response models. Those mirrors could drift while still compiling
independently, making an API change fail only at runtime. The repository
already builds both applications from one checkout, so it can share
source-level contracts directly.

## Decision

Use npm workspaces at the repository root and keep all API response models in
`packages/contracts`, published inside the workspace as
`@direktamt/integrations-contracts`. Upstream wire models, request DTOs and
integration-only inputs remain local to the layer that owns them.

## Consequences

The integrations API and its consumers compile against one response vocabulary
and contract changes become visible to every consumer immediately. The
contracts package must be built before applications that use its runtime
exports, and it must remain free of framework-specific code. Reconsider if the
API and UI stop sharing a release lifecycle or contracts require independent
versioning.
