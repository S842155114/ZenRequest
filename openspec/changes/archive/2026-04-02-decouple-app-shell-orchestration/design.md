## Context

The current app shell implementation in `src/features/app-shell/composables/useAppShell.ts` owns too many responsibilities at once: bootstrap handoff, workspace/session refresh, request send/save flows, import flows, dialog submit branching, browser effects, and component-facing bindings. The codebase already contains useful pure helpers in `src/lib/request-workspace.ts` and a reasonably stable runtime boundary in `src/lib/tauri-client.ts`, but the main shell composable still acts as the place where every layer is composed and mutated together.

This is a cross-cutting refactor because it touches app-shell structure, tests, and the way runtime-backed flows are represented in the frontend. The design must preserve current user-visible behavior and current runtime contracts while reducing coupling inside the shell. The existing Vitest app-shell suites provide a strong regression baseline and should be used to freeze behavior before substantial extraction.

Constraints:

- Preserve current workbench behavior for bootstrap, workspace switching, request send/save, history replay, import/export, and OpenAPI import.
- Do not introduce a new global state library such as Pinia for this refactor.
- Keep `src/lib/tauri-client.ts` as the runtime boundary instead of embedding UI-specific semantics into it.
- Keep toast presentation, DOM-only side effects, and file-input/download behavior outside framework-neutral service modules.
- Extract incrementally so the existing `useAppShell()` outward contract can remain stable while internals move.

## Goals / Non-Goals

**Goals:**

- Split app-shell orchestration into explicit layers: store, services, dialogs, effects, and view-model adapter.
- Make state transitions and use-case orchestration easier to test without Vue lifecycle hooks.
- Keep services framework-neutral, able to mutate store state directly, and able to return structured results for outer adapters.
- Preserve the current component-facing workbench shell API while shrinking the responsibility of `useAppShell.ts`.
- Reduce future change risk for AI-, agent-, and MCP-oriented features by clarifying where orchestration logic lives.

**Non-Goals:**

- Rewriting the workbench UI or changing current user flows.
- Replacing the runtime API or changing Tauri command contracts.
- Migrating the frontend from Vue to another framework.
- Solving every large-frontend structural concern outside the app-shell hotspot in this change.

## Decisions

### Decision: Introduce a plain app-shell store instead of adopting a new store framework

The refactor will introduce an app-shell store module with plain state, selectors, and semantic mutations rather than introducing Pinia or another store framework.

Rationale:

- The current repo does not already use a dedicated global store pattern.
- The app-shell problem is responsibility overlap, not lack of a store library.
- Plain modules keep the extraction small, local, and reusable by both tests and future framework adapters.

Alternative considered:

- Introduce Pinia as part of the refactor. Rejected because it increases migration scope without addressing the core ownership problem.

### Decision: Services mutate store state directly and return structured results

App-shell services will read from selectors, call `runtimeClient`, apply semantic mutations directly, and return structured success or failure results instead of dispatching UI notifications themselves.

Rationale:

- Direct store mutation keeps service orchestration concise and avoids introducing another action-dispatch layer.
- Structured results let the outer adapter decide whether to show toast feedback, close dialogs, trigger downloads, or keep a dialog open.
- This matches the agreed direction to keep browser/UI feedback outside framework-neutral services.

Alternative considered:

- Require services to return patch objects and let the adapter update store state. Rejected because it duplicates mutation logic and re-couples orchestration to the adapter.

### Decision: Keep dialog workflow state outside the core store

Dialog-specific transient state such as pending import payloads and close-after-save intent will live in a dedicated dialog workflow module instead of the main business-state store.

Rationale:

- These values are workflow-local and do not represent canonical business state.
- Keeping them separate prevents the core store from growing UI-flow-specific branches.
- Dialog extraction removes the current large `handleDialogSubmit` switch from the main composable without pushing that complexity into store state.

Alternative considered:

- Fold dialog transient state into the core store. Rejected because it mixes workflow-local UI state with canonical workspace/request state.

### Decision: Keep Vue/browser effects and view-model assembly in dedicated adapters

Lifecycle hooks, watchers, DOM event listeners, file-input refs, downloads, and component-binding assembly will be moved into dedicated Vue-facing modules rather than embedded in store or services.

Rationale:

- These concerns are inherently framework- or browser-specific.
- Separating them clarifies what would be reusable in future framework discussions and what would not.
- A thin adapter layer allows `useAppShell.ts` to remain the stable outward entry point while becoming mostly composition glue.

Alternative considered:

- Leave effects and bindings in `useAppShell.ts` while extracting only some helpers. Rejected because it leaves the main hotspot largely intact and weakens the value of the refactor.

### Decision: Execute the extraction behind the current composable API in incremental phases

The work will proceed by freezing behavior, extracting state/service boundaries first, then extracting dialogs and adapters, while preserving the current public `useAppShell()` surface during the refactor.

Rationale:

- The current shell has broad test coverage and many behavior paths.
- Incremental extraction keeps regressions localized and easier to bisect.
- Maintaining the public adapter surface allows components to stay stable while internals change.

Alternative considered:

- Rewrite `useAppShell.ts` wholesale into a new architecture in one step. Rejected because the file touches too many user-critical flows for a single large rewrite to be low-risk.

## Risks / Trade-offs

- [Intermediate duplication between old composable logic and new store/service modules] -> Mitigation: move behavior in narrow slices and delete replaced logic immediately after each extraction step.
- [Regression risk in send, save, workspace switch, and OpenAPI import flows] -> Mitigation: freeze behavior with focused tests first and keep service extraction aligned to existing flow order.
- [Semantic mutation surface becomes too large or too low-level] -> Mitigation: prefer business-meaningful mutations such as `applySendSuccess` and `applySavedRequest` over many primitive setters.
- [Dialog workflow extraction accidentally leaks toast or DOM concerns into services] -> Mitigation: require service results to be structured and keep all presentation mapping in the adapter/effect layer.

## Migration Plan

1. Add or strengthen focused regression coverage around bootstrap, workspace switching, send, save, and OpenAPI import flows.
2. Introduce the app-shell store module with initial state creation, selectors, and semantic mutations for bootstrap/session/send/save flows.
3. Introduce service commands for bootstrap, workspace switching, send, save, OpenAPI analyze/apply, and other runtime-backed workbench flows.
4. Extract dialog workflow state and submit branching into a dedicated dialog module that delegates business actions to services.
5. Extract Vue/browser-only effects and view-model assembly into dedicated adapter modules.
6. Thin `useAppShell.ts` into a composition entry point that wires store, services, dialogs, effects, and view-model bindings together.
7. Run the full frontend test suite and a production build, then manually verify the highest-risk workbench flows.

Rollback strategy:

- Revert the feature branch or the merge commit if the extraction introduces unacceptable regressions.
- Because the change is frontend-structural and does not intentionally change runtime storage contracts, rollback remains code-only.

## Open Questions

- None at proposal time. The layering direction, service/store ownership model, and toast boundary have all been explicitly decided.
