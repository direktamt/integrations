---
name: handle-query-states
description: >
  Implement consistent React Query lifecycle and integrations API error
  surfaces in apps/ui using QueryStateGate, ValidationErrorAlert, ApiError,
  and the global ErrorSnackbar. Use when adding a query-driven region, handling
  loading/idle/empty/not-found/retry behavior, mapping HTTP status codes, or
  fixing duplicate, missing, or misplaced error feedback. Trigger phrases
  include "handle query errors", "add loading and empty states", "404 should be
  inline", "snackbar fires twice", and "обработай состояния запроса".
---

# Handle Query States

Keep transport errors typed as `ApiError` and give each status exactly the
surface defined by `apps/ui/README.md`.

## Status routing

| Condition                    | Local query region                     | Global snackbar                          |
| ---------------------------- | -------------------------------------- | ---------------------------------------- |
| Required inputs missing      | Idle message or no output              | No                                       |
| Pending request              | Spinner                                | No                                       |
| Successful empty list/search | Explicit empty message                 | No                                       |
| 400 validation               | `ValidationErrorAlert` beside the form | No                                       |
| 404                          | Inline not-found/empty state           | No                                       |
| 502                          | Retryable error state                  | “Government data source is unavailable.” |
| 504                          | Retryable error state                  | “Government data source timed out.”      |
| Network/other                | Retryable error state with message     | Error message                            |

## Procedure

1. **Preserve the typed error boundary.** Let `ApiClient` normalize axios
   failures into `ApiError(status, details)`. Do not catch and replace those
   errors with strings or generic objects in query hooks or pages.

2. **Disable incomplete requests.** Set the hook's `enabled` condition from all
   required committed URL inputs. Pass an `idleMessage` to `QueryStateGate`
   when the user needs guidance. A disabled query is pending with idle fetch
   status in React Query v5; do not show a spinner for it.

3. **Wrap every loaded region.** Pass the complete query result to
   `QueryStateGate`. Render presentational content only in its child function.
   For list/search responses, provide an `isEmpty` predicate based on the
   actual collection rather than truthiness.

4. **Place validation errors with the form.** Perform simple client-side
   required/cross-field checks before committing the URL. After a request,
   render `ValidationErrorAlert` with `query.error`; `QueryStateGate`
   intentionally renders nothing for API 400.

5. **Customize not-found semantics.** Let the default inline warning represent
   ordinary missing resources. Supply `renderNotFound` for a domain-specific
   state such as “No master text for this pair.” Never send 404 to the global
   snackbar.

6. **Keep one global error host.** Leave the status-to-message mapping in
   `Main.tsx` and mount `ErrorSnackbar` once in `App.tsx`. Do not add page-level
   snackbar state or duplicate 502/504 mapping. The local gate still provides
   the visible Retry action while the snackbar announces the upstream class.

7. **Keep retries explicit.** Global automatic retries are disabled for this
   inspection tool. Use the gate's Retry action, which calls `query.refetch()`;
   do not create a second retry button around the same region.

8. **Handle nested surfaces independently.** Put a dialog's detail query gate
   inside the dialog so its lifecycle does not replace the parent search
   results. Keep independent panels on the same page in separate gates.

## Avoid

- Rendering `query.data` before the gate establishes success
- Treating a disabled query as loading
- Treating an empty successful array as 404
- Showing API 400 or 404 in a snackbar
- Catching an `ApiError` only to discard its `status` or `details`
- Mounting spinners, alerts, or retry controls that duplicate `QueryStateGate`
- Enabling automatic refetch-on-window-focus for inspector requests
