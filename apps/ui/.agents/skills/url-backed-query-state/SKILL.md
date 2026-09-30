---
name: url-backed-query-state
description: >
  Implement and repair URL-backed display state in the integrations inspector:
  submitted filters, debounced search, pagination, selected dialogs, and detail
  context. Use when adding or changing forms and search parameters, making a
  view refresh-safe/shareable, fixing browser back or forward behavior, or
  preventing one panel from overwriting another panel's parameters. Trigger
  phrases include "keep filters in the URL", "deep-link this view", "pagination
  resets", "back button is broken", and "сохрани состояние в query params".
---

# URL-backed Query State

Use the URL as the source of truth for everything that determines the displayed
request or selected result. Use local state only for a draft that has not yet
been submitted or whose debounce has not elapsed.

## Procedure

1. **Inventory the state.** List every value that changes the request or
   visible selection: search terms, official keys, booleans, page/offset,
   page size, selected record, and detail context. Give each a stable search
   parameter. Mirror API names unless several panels on one route need a prefix
   to avoid collisions, as on the locations page.

2. **Read committed values from `useSearchParams`.** Derive query-hook inputs
   from the current URL on every render. Parse numbers only when the parameter
   exists, reject non-finite/out-of-range values, and fall back to the documented
   default. Parse booleans explicitly (`value === 'true'`); do not rely on
   JavaScript truthiness for URL strings.

3. **Separate drafts deliberately.** Bind simple instant controls directly to
   URL state. For submit-based or debounced inputs, initialize a draft from the
   committed value and synchronize it when that committed value changes through
   browser navigation or an incoming deep link. Never let a stale draft silently
   overwrite a newer URL state.

4. **Preserve ownership boundaries.** On a page with independent panels, call
   the functional `setSearchParams(previous => ...)`, clone `previous`, and
   change only parameters owned by that panel. A standalone page may construct
   a clean parameter set on form submission, but it must intentionally preserve
   or clear selection and pagination state.

5. **Keep URLs canonical.** Delete empty optional values and values equal to
   documented defaults. Store only valid committed input. Use `replace: true`
   for debounced/high-frequency updates so typing does not create one browser
   history entry per keystroke. Let meaningful submits, page changes, and
   selected-record changes create history when Back should undo them.

6. **Reset dependent state.** Reset page/offset to the first page when any
   search criterion or page size changes. Clear a selected record when a new
   search makes that selection stale. Do not reset parameters owned by an
   unrelated panel.

7. **Validate before committing.** Enforce simple cross-field requirements
   locally, such as “city name or postal code,” and leave the current committed
   results visible until a valid submit. Keep server-side 400 details in
   `ValidationErrorAlert` after the request is committed.

8. **Drive queries from committed state only.** Pass URL-derived values to the
   query hook, include all of them in its query key, and use `enabled` for
   required inputs. Typing in a submit-based draft must not fire a request.

9. **Build deep links safely.** Encode dynamic path segments. Build search
   strings with `URLSearchParams` rather than string concatenation, especially
   when values can contain spaces, commas, umlauts, ampersands, or `#`.

## Behavioral checks

When interactive validation is in scope, check all of these cases:

- Refresh reproduces the same form values, request, page, and selected detail.
- A copied URL opens the same view in a new tab.
- Back and Forward update both the displayed results and any local drafts.
- Changing filters resets only their dependent pagination/selection.
- Debounced typing replaces history instead of flooding it.
- Updating one locations panel preserves the other panels' parameters.
- Missing, malformed, and out-of-range numeric parameters fall back safely.
