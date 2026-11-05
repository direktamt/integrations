---
name: add-inspector-flow
description: >
  Add an integrations API operation to the internal React inspector end to
  end: shared contract consumption, React Query hook, URL-backed inputs,
  page/panel/dialog rendering, error states, route/navigation wiring, and
  README.md coverage. Use when exposing a new or changed integrations API
  endpoint in apps/ui, adding an inspector page or panel, or completing a UI
  flow for an existing endpoint. Trigger phrases include "add this endpoint to
  the UI", "new inspector page", "expose the API operation", and "добавь
  endpoint в integrations ui".
---

# Add an Inspector Flow

## Procedure

1. **Establish the contract.** Read `apps/ui/README.md`, the relevant controller
   and request DTO under `apps/api/src/api/`, and the exported response model
   under `packages/contracts/src/`. Use the actual controller path and query
   names. If the response model is not exported by
   `@direktamt/integrations-contracts`, add or request that shared contract
   change instead of declaring a UI copy.

2. **Choose the smallest surface.** Extend an existing resource page and its
   `use<Resource>Queries.ts` file when the operation belongs to that resource.
   Use a page-private panel for an independent search/lookup and a dialog for a
   selected-record detail. Add a top-level route only for a distinct resource
   that needs its own shareable location.

3. **Add the query hook.**
   - Import the response with `import type` from
     `@direktamt/integrations-contracts`.
   - Keep request-only parameter interfaces in the query file.
   - Name the hook by operation semantics and existing UI vocabulary:
     `useSearch*`, `useSuggest*`, `useResolve*`, or `use<Resource>` for a
     direct resource read.
   - Call `apiClient.get<T>()`; never call axios or `fetch` from the page.
   - Start the query key with the resource and operation, then include every
     value that can change the response.
   - Encode dynamic path segments with `encodeURIComponent`.
   - Convert absent optional parameters to `undefined` and set `enabled` from
     all required committed inputs.

4. **Make the flow deep-linkable.** Read request-defining values from URL
   search parameters. Keep only unsubmitted form drafts in local state. Apply
   the `url-backed-query-state` skill for forms, debounced inputs, pagination,
   selected dialogs, and detail links.

5. **Compose the UI.** Let the page or a page-private orchestration component
   call the hook. Pass loaded data and callbacks into presentational
   components. Reuse `PageHeader` and `SectionCard` from `@direktamt/ui-kit`,
   `EndpointList`, `FormRow`, `DataTable`, `KeyChip`, `JsonViewer`, and
   existing resource components. Move a component to `src/components/` only
   after a second page uses it.

6. **Cover the full query lifecycle.** Apply the `handle-query-states` skill.
   Wrap the loaded region in `QueryStateGate`, render API 400 details by the
   form with `ValidationErrorAlert`, customize 404 when the resource needs a
   specific not-found message, and define empty results explicitly.

7. **Render data according to its trust boundary.** Use `HtmlSection` for
   upstream HTML and `JsonViewer` for arbitrary pass-through JSON. Use
   `KeyChip` for official identifiers. Treat absent upstream values as absent;
   do not synthesize official requirements or content.

8. **Wire navigation only when needed.** For a new top-level resource, add the
   route in `src/App.tsx` and a matching entry in
   `src/components/AppLayout.tsx`. Build query strings with
   `URLSearchParams`; keep required context such as `regionalKey` in detail
   links.

9. **Update the specification.** Keep the route table, endpoint coverage,
   relevant page section, error behavior, and completion criteria in
   `apps/ui/README.md` accurate.

## Scoped validation

When validation is requested, run from the repository root:

```bash
npm run typecheck --workspace @direktamt/integrations-ui
npm run lint --workspace @direktamt/integrations-ui
npm run build --workspace @direktamt/integrations-ui
```

There is no UI test runner. Verify refresh, copied deep links, browser
back/forward, loading, empty, 400, 404, and retry behavior manually for the
new flow when interactive validation is in scope.

## Completion checklist

- Shared response contract imported; no UI mirror model added
- Query hook owns request types, full query key, path encoding, and `enabled`
- Display-defining state survives refresh through the URL
- Existing inspector primitives and error surfaces reused
- Route and navigation added only if the operation needs a new resource page
- `README.md` endpoint coverage and behavior updated
