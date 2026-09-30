# 0004 — Translate German domain terms at the integration boundary

- **Status:** Accepted
- **Date:** 2026-07-19 (backfilled; in force since project start)

## Context

Upstream government APIs speak German (ARS, Leistungsschlüssel, Erforderliche
Unterlagen). Mixed-language identifiers make the codebase inconsistent and
hard to work on for non-German speakers.

## Decision

All identifiers, file names, comments and docs are English camelCase/
PascalCase. Wire models declare English properties and keep the original
JSON contract name only in `@Expose({ name: '...' })` metadata. German
survives only in query parameters, URL paths and data content.

## Consequences

One vocabulary across the codebase; the canonical translation table lives in
`apps/api/.agents/AGENTS.md`. Cost: a mandatory mapping layer per
upstream field, and contract names are only visible in decorator metadata —
the verify-wire-contracts skill exists to catch drift.
