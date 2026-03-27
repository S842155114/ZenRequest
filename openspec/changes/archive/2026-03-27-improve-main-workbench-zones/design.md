## Context

The current workbench shell already separates explorer, request authoring, and response inspection at the outer layout level. However, the main request and response regions still contain behavior gaps that matter to the primary user loop:

- the request body mode selector advertises `json`, `raw`, `formdata`, and `binary`, but the editor surface still behaves like one generic text editor
- the response surface shows detailed results, but it does not make idle, pending, stale, and completed result states explicit enough
- request and response pane collapse already exists visually, but collapse is not yet defined as a layout state with restore semantics

This change extends the `workbench-ui` capability without introducing a new capability because the affected behavior remains within the existing main workbench contract.

## Goals / Non-Goals

**Goals:**
- Define a stable zone and state contract for the main request and response workbench panes
- Align request body-mode UI with the runtime data model that already distinguishes body types
- Make response lifecycle feedback explicit so users can distinguish idle, pending, stale, success, and error outcomes
- Define predictable collapse and constrained-width behavior for request and response panes

**Non-Goals:**
- Redesign the top header or explorer regions
- Introduce new backend APIs or storage formats
- Fully redesign request tests, environments, or history beyond the behavior required to keep the main workbench coherent

## Decisions

### Decision: Treat request authoring and response inspection as explicit sub-zones

The request pane will be treated as a composition of:
- request shell header
- request context bar
- request editor surface

The response pane will be treated as a composition of:
- response status bar
- response toolbar
- response content surface

This keeps shell-level layout concerns in `App.vue` and pane-level interaction concerns inside request and response components. The alternative was to continue evolving each pane as one large component, but that would make future capability additions harder to reason about and test.

### Decision: Align body-mode UI with the existing runtime model instead of flattening the model

The project already models multiple body types in `src/types/request.ts` and `src/lib/request-workspace.ts`. The design will preserve that model and raise the UI up to the model, rather than removing the distinctions and forcing all request bodies through one text shape.

Alternatives considered:
- Collapse all body modes back into generic text editing. Rejected because it hides capability differences that the runtime model already preserves.
- Add only cosmetic hints for non-text modes. Rejected because it would keep the mismatch between what the UI promises and what the user can actually do.

### Decision: Introduce explicit response lifecycle semantics in the response pane

The response pane will distinguish at least:
- idle
- pending
- success
- http-error
- transport-error

`stale` is treated as an annotation on previously completed content while a new request is pending, rather than as a standalone terminal state.

The alternative was to keep the current implicit model and only refine colors, but that would not solve the trust problem when old results remain visible during a new send flow.

### Decision: Promote collapse from a visual toggle to a layout state

Request and response collapse behavior will include:
- compact summary presentation
- explicit restore behavior
- remembered last expanded size where feasible

The alternative was to keep collapse as simple content substitution inside a pane. Rejected because the current workbench already uses resizable panels, so users expect pane size behavior to remain predictable across collapse and restore.

## Risks / Trade-offs

- [Risk] More explicit state modeling may require modest expansion of the frontend response view model. → Mitigation: keep the state contract focused on UI lifecycle semantics and reuse existing response payload fields where possible.
- [Risk] Body-mode editor parity increases scope for request editing components. → Mitigation: implement parity in slices, starting with the highest-mismatch modes (`formdata`, `binary`) first.
- [Risk] Pane-size persistence can become brittle across breakpoints. → Mitigation: define desktop and constrained-width restore behavior separately and prefer safe defaults when persisted sizes become invalid.
- [Risk] Moving or demoting workspace-global actions from the request pane may create temporary discoverability questions. → Mitigation: treat action placement as a follow-up unless it blocks the primary send-and-inspect loop.
