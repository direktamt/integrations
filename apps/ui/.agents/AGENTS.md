# DirektAmt Integrations UI: Agent Instructions

React 19 + Vite internal inspector for the integrations API. Read the root
`.agents/AGENTS.md` and `README.md` before changing this application. The root
rules still apply; the rules below are UI-specific.

## Purpose and boundary

This application exists to exercise, inspect, and debug every normalized
integrations API endpoint. It is a local development tool, not an end-user
application. Keep it read-only: no product workflows, authentication, persistence,
editing, SEO, SSR, PWA, or i18n unless the documented boundary is explicitly
changed.

All identifiers and authored UI copy are English. German text may appear only
as upstream data content or in explanatory labels for official terms such as
ARS and LeiKa.

## Build and run

Run commands from the repository root:

```bash
npm run dev:ui
npm run build --workspace @direktamt/integrations-ui
npm run typecheck --workspace @direktamt/integrations-ui
npm run lint --workspace @direktamt/integrations-ui
```

No UI test runner is configured. Do not claim test coverage that does not
exist.

## Conventions

1. **Treat `README.md` as the behavioral contract.** Preserve the endpoint
   coverage, routes, URL-state requirements, error treatment, and explicit
   non-goals. Update the README in the same change when the supported
   UI surface or behavior changes.

2. **Use Java-style file naming.** Keep one main React component per file and
   name the file after it in PascalCase (`CatalogPage.tsx`,
   `QueryStateGate.tsx`). Keep small non-component helpers in focused
   PascalCase files such as `ServiceTitle.ts`; do not introduce catch-all
   `utils.ts`, `types.ts`, or barrel files.

3. **Keep the API boundary typed and centralized.**
   - Import every integrations API response model from
     `@direktamt/integrations-contracts`; never create a UI mirror type.
   - Keep request-only parameter types next to the owning query hook.
   - Send HTTP only through `src/api/ApiClient.ts`. Pages and components never
     call axios or `fetch` directly.
   - Add resource hooks to `src/api/queries/use<Resource>Queries.ts`. Include
     every request-defining input in the query key, omit absent optional
     parameters with `undefined`, encode path segments, and disable the query
     until all required inputs are present.

4. **Keep displayed state in the URL.** Search criteria, filters, pagination,
   selected records, and detail context must survive refresh and be shareable.
   Local component state is only a draft before submit or debounce. Read the
   committed request values from `useSearchParams`; reset dependent pagination
   or selection when its inputs change. On pages with multiple independent
   panels, preserve parameters owned by the other panels.

5. **Separate orchestration from presentation.** Pages, panels, and
   data-loading dialogs may call query hooks. Presentational components receive
   data and callbacks through props. Keep page-private components in their page
   folder. Move a component to `src/components/` once it is used by at least two
   pages. Extract repeated JSX instead of copying it.

6. **Use the shared query-state surfaces.** Wrap every query-driven region in
   `QueryStateGate`; provide an idle message for disabled queries and an
   explicit `isEmpty` predicate for list/search results. Render API 400 details
   next to the owning form with `ValidationErrorAlert`. Render 404 as a local
   not-found or empty state. Let the global handler in `Main.tsx` map 502, 504,
   network, and unexpected errors to `ErrorSnackbar`; do not mount additional
   global snackbar hosts.

7. **Compose with the UI kit and the inspector primitives.** Theme, fonts,
   logo, favicon and the application frame come from `@direktamt/ui-kit`
   (`AppShell`, `PageHeader`, `SectionCard`, `DescriptionList`,
   `CodeBlock`, `EmptyState`, `LoadingState`); do not add a local theme,
   hard-coded colours or shadows, use palette keys such as `text.secondary`
   and `border.subtle`. Every page header lists its endpoints with
   `EndpointList`; forms go into a `SectionCard` with `FormRow`. Prefer
   `DataTable`, `KeyChip`, `JsonViewer`, and `QueryStateGate` before adding
   a new abstraction. Put layout props into `sx`; Material UI 9 has no
   system props on `Box`, `Stack` and `Typography`. Keep server-side pagination controlled by URL parameters.
   Use `KeyChip` for official identifiers and keep raw-response access through
   `JsonViewer` when it helps inspection.

8. **Render upstream content safely.** `HtmlSection` is the only component
   allowed to use `dangerouslySetInnerHTML`, and it must sanitize with
   DOMPurify. Render arbitrary pass-through objects with `JsonViewer`. Open
   upstream links in a new tab with `rel="noreferrer"` and do not infer missing
   official data.

9. **Wire complete navigation flows.** A new top-level resource requires its
   query hook, page folder, route in `App.tsx`, navigation entry in
   `AppLayout.tsx`, URL-backed inputs, query/error states, and a corresponding
   `README.md` update. Prefer a panel or dialog on an existing resource page when
   a new endpoint does not justify another route.

## Stack-specific gotchas

- Import routing APIs from `react-router`, matching the installed React Router
  v7 setup.
- React Query v5 uses `isPending`; a disabled initial query is identified by
  `isPending && fetchStatus === 'idle'` in `QueryStateGate`.
- Automatic retries and refetch-on-window-focus are disabled intentionally.
  Requests in this debugging tool should be explicit; the gate's Retry action
  calls `refetch()` manually.
- `VITE_API_BASE_URL` is a build-time variable. Keep the local default in
  `ApiClient` aligned with `.env.example`.
- Row-level controls must stop propagation when the row itself is clickable;
  `KeyChip` already does this for copy actions.
