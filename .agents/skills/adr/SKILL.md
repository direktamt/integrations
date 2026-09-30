---
name: adr
description: >
  Write an Architecture Decision Record into docs/decisions/. Use when a
  significant integration architecture decision is made or revisited:
  choosing or rejecting a technology, an architectural pattern, a data-source
  policy, or a naming convention. Trigger phrases: "write an ADR", "document
  this decision", "why did we decide", "let's fix this decision in writing".
---

# Architecture Decision Record

## Procedure

1. Determine the next number: list `docs/decisions/`, take max + 1,
   zero-padded to 4 digits.
2. Create `docs/decisions/NNNN-short-kebab-title.md` from the template below.
3. Keep it under a page. One decision per record. English only.
4. If the decision supersedes an earlier ADR, set its status to
   `Superseded by NNNN` in the old file.

## Template

```markdown
# NNNN — Title (imperative, e.g. "Use facade over direct API clients")

- **Status:** Accepted | Proposed | Superseded by NNNN
- **Date:** YYYY-MM-DD

## Context

What forces are at play; what problem we are solving. 2–5 sentences.

## Decision

What we decided, stated plainly. 1–3 sentences.

## Consequences

What becomes easier, what becomes harder, what we give up.
Include revisit conditions ("reconsider when ...").
```

## Existing decisions to backfill (first use of this skill)

If `docs/decisions/` does not exist yet, seed it with the decisions already
in force: deterministic runtime (no LLM in request path), GovDataFacade as
the only integration entry point, Java-style file naming, English-only
identifiers with German confined to wire DTOs, official data sources only
(no scraping).
