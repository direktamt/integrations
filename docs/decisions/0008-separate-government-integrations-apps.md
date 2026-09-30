# 0008 — Separate government integrations into dedicated applications

- **Status:** Superseded by 0009
- **Date:** 2026-07-19

## Context

The existing NestJS application integrates official government data, while
its generic `backend` name does not communicate that responsibility. The
React UI is a developer-facing integration inspection tool and needs the
same explicit ownership vocabulary.

## Decision

Place deployable applications under `apps/`: name the NestJS anti-corruption
layer `integrations-api` and its inspection console `integrations-ui`. Scope their shared response package as
`@direktamt/integrations-contracts`.

## Consequences

Repository names communicate integration ownership. The integrations API must
remain a normalized boundary rather than a raw proxy, and the UI remains a
read-only developer tool. This naming was superseded when the repository itself
became integration-specific and shorter internal paths became unambiguous.
