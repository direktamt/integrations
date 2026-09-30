# 0001 — Keep the request path deterministic (no LLM calls at runtime)

- **Status:** Accepted
- **Date:** 2026-07-19 (backfilled; in force since project start)

## Context

The integrations API exposes official data that downstream consumers rely
on. Per-request LLM calls would add latency, cost and non-reproducibility,
and generated content cannot be verified against the upstream contracts the
integration layer exists to enforce.

## Decision

The integration request path is deterministic: structured data plus classic
search and filters. Runtime integration requests do not depend on LLM calls.

## Consequences

Responses are reproducible, fast and cheap; correctness issues are traceable
to upstream data or mapping code, not to sampling. Unstructured upstream
content such as HTML sections is passed through as published rather than
interpreted at request time. Reconsider only if a use case appears that
provably cannot be served deterministically.
