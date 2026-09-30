| PvogSearchClient | `GET /v6/servicedescriptions/{lbid}/detail` | lbid from the search result, `?ars=053150000000` |
---

name: verify-wire-contracts
description: >
Smoke-test the live PVOG Suchdienst and FIM Portal APIs and diff their
actual response shapes against the wire models in wire/ to detect
contract drift.
Use before releases, after any external-API incident, when a client starts
returning unexpected data, or on request. Trigger phrases: "check the wire
contracts", "did the APIs change", "smoke test the integrations",
"контракты не поехали?".
---

# Verify Wire Contracts

External government APIs change without notice. This procedure catches drift
before integration consumers encounter it.

## Endpoint list (extend when clients grow)

| Client           | Endpoint                            | Reference request                                 |
| ---------------- | ----------------------------------- | ------------------------------------------------- |
| PvogSearchClient | `GET /v3/locations/suggestions`     | `?q=Köln`                                         |
| PvogSearchClient | `GET /v3/locations/details`         | `?ort=Köln&distinctBy=ARS&limit=3`                |
| PvogSearchClient | `GET /v7/servicedescriptions/{ars}` | ars `053150000000`, `?q=Wohnsitz anmelden&size=2` |
| PvogSearchClient | `GET /v1beta2/onlineservices`       | `?ars=053150000000`                               |
| FimPortalClient  | `GET /v0/leistung-steckbriefe`      | `?fts_query=Anmeldung&limit=2`                    |

Base URLs: `https://pvog.fitko.net/suchdienst/api`, `https://fimportal.de/api`.

## Procedure

1. Fire each reference request against the live API.
2. For each response, extract the set of observed JSON fields (recursively,
   with types) and compare against the corresponding wire model classes in
   `src/integrations/pvog/wire/` and
   `src/integrations/fim/wire/`. Match observed JSON names against the
   `@Expose({ name })` metadata (falling back to the property name when no
   rename is declared):
   - **missing in wire models** → new fields appeared (usually additive, low risk),
   - **declared but absent** → check optionality; required-field loss is breaking,
   - **type mismatch** → breaking, highest priority.
3. HTTP errors, redirects to new hosts, or auth walls → breaking, report immediately.
4. Produce a drift report: endpoint, finding, severity (breaking / additive /
   cosmetic), affected wire type.
5. On any finding, update `docs/INTEGRATIONS.md` (dates, warnings). Only
   change the wire models + mappers as an explicit follow-up task, never
   silently within the verification run.

## Notes

- `/v1beta2/onlineservices` is beta: treat failures there as expected risk,
  but still report them.
- Check <https://produktportal.pvog.fitko.de/api/deprecations/> and look for
  the `X-Pvog-Deprecated: true` response header; a deprecated endpoint in use
  is a breaking finding even while it still answers 200.
- If run from a sandbox without access to `*.fitko.net` / `fimportal.de`
  (DNS EAI_AGAIN), say so explicitly instead of reporting false failures.
