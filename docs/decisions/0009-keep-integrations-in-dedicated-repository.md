# 0009 — Keep integrations in a dedicated repository

- **Status:** Accepted
- **Date:** 2026-07-19

## Context

ADR 0008 introduced explicit integration names while the repository still had
a generic scope. Repeating that scope in every internal path adds noise to
instructions and agent context.

## Decision

Use `direktamt/integrations` exclusively for integration-domain components.
Its deployable applications are `apps/api` and `apps/ui`, with shared response
models in `packages/contracts`. Product-facing concerns live outside this
integration boundary. Adding a third deployable application requires a new
ADR demonstrating that it belongs to the integration domain.

## Consequences

Repository instructions, releases and ownership stay focused on government
integrations, while the API and its inspection UI can still change atomically.
External consumers cannot use workspace source directly and need an explicitly
versioned HTTP contract or client. Reconsider this boundary if the integration
deployables no longer share ownership or release cadence.
