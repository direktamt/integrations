---
name: update-integrations-handbook
description: >
  Re-verify and update apps/api/docs/INTEGRATIONS.md, the handbook of the
  external public-administration APIs (PVOG Suchdienst, FIM Portal;
  Bereitstelldienst as reference). Use when the user asks to refresh/verify
  the integrations handbook, when an external endpoint changed or broke, when
  a new endpoint is added to any client, or before a release. Trigger
  phrases: "update the handbook", "verify the gov APIs", "check if the
  endpoints still work", "INTEGRATIONS.md is stale".
---

# Update Integrations Handbook

Keep `apps/api/docs/INTEGRATIONS.md` truthful: every endpoint marked ✅ must
have been verified against the live API, with a current verification date.
Never mark an endpoint ✅ that was not exercised in this run.

## Procedure

1. **Enumerate implemented endpoints.** Collect every URL used in
   `apps/api/src/integrations/*/[A-Z]*Client.ts`.

2. **Compare with the handbook.** Every implemented endpoint must appear as
   `implemented` in `INTEGRATIONS.md`, and every `implemented` entry must be
   used by a client. Any drift is a finding.

3. **Fire live requests** against each implemented endpoint (PVOG
   Suchdienst, FIM Portal). Use the reference requests from the handbook
   (Köln / ARS `053150000000` / query `Wohnsitz anmelden` / catalog term
   `Anmeldung`) so responses stay comparable over time. Record the HTTP
   status and the `X-Pvog-Deprecated` header. Bereitstelldienst is
   access-gated: verify its documentation links only, not the API.

4. **Compare response shapes** field by field against the wire model classes
   in `apps/api/src/integrations/*/wire/` (observed JSON names correspond to
   `@Expose({ name })` metadata, or to the property name when no rename is
   declared). Classify each difference as breaking (type change, required
   field missing), additive (new field) or cosmetic.

5. **Update the handbook:** refresh the verification date at the top, refresh
   trimmed example responses if fields changed, move endpoints that the
   operator deprecated into the deprecated table with their replacement,
   remove ✅ from endpoints that failed and add a warning with the error, and
   add a dated entry to the changelog section. Keep dynamic numbers (counts,
   sizes) rounded or dated.

6. **Report contract drift.** List exactly which wire model fields are
   affected and how. Do not change client or wire-model code as part of the
   verification run; that is a separate change with its own review.

## Watch list

- `/v1beta2/onlineservices` is beta and the most likely to break.
- `/v8beta1/servicedescriptions` is the announced successor of
  `/v7/servicedescriptions/{ars}`; note its status, do not migrate while it
  is beta.
- Official deprecations: <https://produktportal.pvog.fitko.de/api/deprecations/>;
  release notes: <https://produktportal.pvog.fitko.de/release-notes/>.
- The legacy API host `pvog.fitko.de` is switched off; only `pvog.fitko.net`
  serves the Suchdienst API.
- FIM: `/v1/leistung-steckbriefe` exists next to `/v0`; `parsed-xzufi` is
  declared unstable by the operator.
