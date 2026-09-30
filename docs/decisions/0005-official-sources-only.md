# 0005 — Use official government data sources only, no scraping

- **Status:** Accepted
- **Date:** 2026-07-19 (backfilled; in force since project start)

## Context

Service details (documents, fees, deadlines) could also be scraped from
municipal websites, which are sometimes fresher but unstable, legally murky
and unverifiable at scale.

## Decision

All government data comes from the documented official APIs (see
`apps/api/docs/INTEGRATIONS.md`). No scraping of municipal websites; no
invented document lists or legal requirements.

## Consequences

Data provenance is defensible and shapes are contract-verifiable. Cost:
coverage and freshness are capped by what PVOG/FIM publish; gaps stay gaps
until upstream fixes them. Reconsider per-source only if an authority offers
a documented, stable feed outside these APIs.
