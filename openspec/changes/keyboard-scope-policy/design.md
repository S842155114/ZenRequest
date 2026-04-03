## Context

ZenRequest already contains multiple keyboard-relevant surfaces inside one frontend shell: native inputs in the sidebar and dialogs, widget-owned code editing surfaces in request composition, readonly code viewers in response inspection, ordinary readonly tables for headers/cookies/tests, and iframe-based HTML preview. Those surfaces have different interaction semantics, but the application does not yet define one explicit keyboard ownership model for deciding when shell-level behavior must yield.

The current `Ctrl/Cmd+A` issue is a symptom of that missing contract. When focus is not resolved as belonging to a local surface, browser or WebView page-level selection behavior leaks through and selects the whole page. The same ownership gap can later affect copy, deletion, confirmation, and escape behavior, especially as the app grows more readonly diagnostic surfaces for AI-assisted debugging, traces, or logs.

The codebase already has a closely related precedent in resource context-menu handling: the shell owns the top-level behavior, but editable targets and resource-specific surfaces can bypass that shell handling. This change extends the same design approach to keyboard interaction.

## Goals / Non-Goals

**Goals:**
- Define one explicit keyboard scope model for the workbench.
- Ensure native editing, widget-owned editor/viewer, selectable readonly, embedded preview, and shell surfaces have clear ownership boundaries.
- Make `Ctrl/Cmd+A` local to the active input, editor, viewer, or readonly table scope instead of allowing page-wide selection leakage.
- Keep `Ctrl/Cmd+F` on browser-default behavior in this phase.
- Require IME composition state and embedded previews to force shell-level keyboard handlers to yield.
- Keep the implementation lightweight enough that frequent focus churn does not create meaningful performance cost.

**Non-Goals:**
- This design does not introduce a full global-shortcut product layer.
- This design does not add app-owned find-in-page behavior.
- This design does not turn readonly tables into spreadsheet-style editors or cell-navigation systems.
- This design does not define every possible keybinding in one phase; it only establishes the first-wave ownership rules.

## Decisions

### Decision: Resolve keyboard ownership through explicit surface scopes

The frontend will resolve keyboard ownership through five scope classes:

- `native-editing`
- `widget-editing`
- `selectable-readonly`
- `embedded`
- `shell`

Every shell-level keyboard handler must determine whether the event target belongs to one of the local scopes before it decides to run any shell behavior.

Rationale:

- This creates one reusable decision point instead of patching individual shortcuts ad hoc.
- It matches the codebase's existing context-menu bypass pattern.
- It scales to future readonly viewer surfaces without rewriting shortcut logic per feature.

Alternative considered:

- Fix only `Ctrl/Cmd+A` locally. Rejected because the same ownership bug would remain for copy, delete, confirm, and escape behavior.

### Decision: Ordinary readonly tables are first-class selectable-readonly scopes

The system will treat ordinary readonly tables and result grids as `selectable-readonly` surfaces, not only readonly code viewers. To support local `Ctrl/Cmd+A` and copy semantics, those surfaces must expose one focusable scope root that owns local selection behavior.

Rationale:

- Users read readonly result tables as one local content area, just like a code viewer.
- Limiting local scope to code viewers would make the response panel inconsistent within the same inspection region.

Alternative considered:

- Restrict local selection ownership to code viewers only. Rejected because readonly tables would still fall back to whole-page selection.

### Decision: Use one lightweight global keyboard entry point plus target ancestry checks

The shell will use at most one global keyboard listener for shortcut arbitration. Scope detection will be based on constant-cost target ancestry checks such as `closest(...)` against explicit surface markers and native element selectors.

The implementation will not:

- register per-row or per-cell listeners for readonly tables
- maintain a high-frequency global reactive focus graph
- precompute large selection state for readonly surfaces before a shortcut is pressed

Rationale:

- Focus changes happen often in the workbench and should remain cheap.
- The performance risk is not focus churn itself, but an overbuilt tracking architecture.

Alternative considered:

- Model current keyboard scope as a globally reactive store kept in sync by focus listeners across the tree. Rejected because it adds complexity and unnecessary update traffic.

### Decision: Browser-default find remains untouched

`Ctrl/Cmd+F` will remain browser-owned in this phase. The app will not intercept it for global or local custom find behavior.

Rationale:

- The current problem is shortcut ownership, not lack of find UI.
- Browser default find is predictable, cheap, and avoids introducing new product and performance scope.

Alternative considered:

- Add local viewer find behavior at the same time. Rejected because it expands the change beyond keyboard-scope ownership.

### Decision: IME composition and embedded preview always force yield

Shell-level keyboard behavior must yield when either of the following is true:

- the event is in IME composition
- the event target is inside an embedded preview surface such as an iframe host

Rationale:

- IME composition cannot be interrupted safely by shell actions such as send, confirm, or escape.
- Embedded previews are browser-owned documents and should not be treated like shell-owned layout chrome.

Alternative considered:

- Treat iframe preview and composition state as normal shell contexts unless a specific bug appears. Rejected because both are known ownership boundaries, not optional refinements.

## Risks / Trade-offs

- [Readonly tables need explicit focus-root contracts to own local selection] -> Mitigation: assign one focusable scope root per readonly surface instead of adding listeners to individual cells.
- [Large readonly surfaces could create expensive DOM-range selection if the feature is generalized carelessly] -> Mitigation: keep first-wave support bounded to current result tables and viewers; future very-large surfaces can adopt copy/export fallbacks instead of full DOM selection.
- [Adding shell shortcuts later could bypass the policy if implemented ad hoc] -> Mitigation: require all new shell shortcuts to pass through the shared keyboard-scope utility.
- [Different surface classes can look similar to users while behaving differently] -> Mitigation: define scope markers by interaction semantics, not by visual style, and test each class explicitly.

## Migration Plan

1. Add the new `keyboard-interaction-scope` spec and the related deltas for `workbench-ui` and `response-html-preview`.
2. Introduce a shared keyboard-scope utility near the existing interaction-scope helpers used for context-menu bypass.
3. Mark native editing, widget-editing, selectable-readonly, and embedded-preview surfaces with stable scope-detection contracts.
4. Implement first-wave shortcut arbitration for `Ctrl/Cmd+A`, copy, delete, enter, and escape while preserving browser-default `Ctrl/Cmd+F`.
5. Add focused tests for inputs, editors, readonly viewers, readonly tables, embedded preview, shell blank areas, and IME composition scenarios.

Rollback strategy:

- If any shortcut arbitration regresses local behavior, remove the shell keyboard-scope utility integration and fall back to current browser/local defaults while keeping the spec change un-applied in implementation branches.

## Open Questions

- Should future log/trace/result viewers reuse the same `selectable-readonly` scope markers directly, or should there be a narrower opt-in subtype once those surfaces exist?
