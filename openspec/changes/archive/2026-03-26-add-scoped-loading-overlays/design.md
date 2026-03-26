## Context

The current workbench already has async flows that materially invalidate part of the UI, but feedback is inconsistent. `handleWorkspaceChange` persists session state, switches the active workspace, and then refreshes runtime state for the whole workbench, while `handleSend` marks only the active request tab as `isSending` and disables the send button. In both cases, users can still interact with parts of the affected surface while data is reloading or a request is in flight.

The change is cross-cutting because it spans `App.vue`, shell layout containers, request authoring components, and i18n-visible status copy. The main constraint is keeping unaffected regions usable while clearly masking the region whose state is temporarily unstable.

## Goals / Non-Goals

**Goals:**

- Introduce a consistent region-level busy/loading pattern for async workbench operations.
- Prevent interaction inside the affected region while the operation is running.
- Reuse existing operation state where possible instead of adding unrelated parallel flags.
- Keep the pattern extensible so other scoped async actions can adopt the same overlay behavior later.

**Non-Goals:**

- Replacing every button-level spinner in the app with a full overlay immediately.
- Blocking the entire application for operations that only affect one workbench region.
- Redesigning async task orchestration or backend request/runtime APIs.
- Adding progress percentages or operation queues in this change.

## Decisions

### 1. Busy feedback will be modeled by scope, not by one global loading flag

The shell should distinguish between operations that affect the whole workspace region and operations that affect only the request authoring region. This keeps the UI aligned with actual data invalidation instead of freezing everything for convenience.

Why this decision:

- Matches the user-facing mental model of “what is currently busy”.
- Prevents unnecessary blocking of unaffected surfaces.
- Makes future adoption straightforward for other region-scoped async actions.

Alternative considered:

- A single app-wide loading flag. Rejected because workspace switching and request sending do not impact the same surface area.

### 2. Each busy scope will render through a reusable overlay wrapper

Instead of hand-rolling separate loading markup in every panel, the frontend should use a shared busy-surface wrapper or overlay pattern that can sit around a workbench region and apply a consistent mask, spinner, status copy, and interaction lock while leaving the underlying surface visible for orientation.

Why this decision:

- Keeps visual treatment and accessibility behavior consistent.
- Reduces duplication across workspace and request-builder surfaces.
- Makes later rollout to additional scopes lower-risk.

Alternative considered:

- Inline per-component ad hoc loading layers. Rejected because it would fragment styling, semantics, and future maintenance.

### 3. Existing operation state should drive the first two scopes

The request-builder scope can derive from the active tab’s existing `isSending` state. Workspace refresh needs an explicit shell-level busy flag because workspace switching currently has no state that spans `saveWorkspaceSession`, `setActiveWorkspace`, and `refreshRuntimeState`.

Why this decision:

- Reuses proven request lifecycle state instead of creating redundant send flags.
- Gives workspace switching a single source of truth for overlay lifetime.
- Keeps the implementation near the async control flow that actually owns the operation.

Alternative considered:

- A separate generic async tracker detached from calling code. Rejected for now because it adds coordination overhead before the scope set is large enough to justify it.

### 4. Scoped overlays should include visible status text and hard interaction locking

The overlay should not be decorative only. It should communicate that the region is busy and prevent editing, clicking, switching tabs, or invoking actions inside the masked area until the async operation completes. The implementation should treat this as both a visual and semantic busy state by covering pointer interactions, preventing keyboard-driven edits inside the region, and exposing appropriate busy/status semantics to assistive technology.

Why this decision:

- Prevents accidental edits and duplicate operations.
- Improves UX clarity for actions that may take perceptible time.
- Makes it obvious why controls are temporarily unavailable.

Alternative considered:

- Rely only on disabled controls without a mask. Rejected because affected regions can contain many controls and partial disablement is easy to miss.

## Risks / Trade-offs

- [Busy scope boundaries may be chosen too broadly] -> Start with the concrete user-requested scopes (workspace refresh and request builder) and keep the overlay wrapper reusable for later refinement.
- [Overlays can obscure useful read-only context] -> Mask only the invalidated region and leave unaffected areas visible and interactive.
- [State cleanup bugs could leave a region permanently locked] -> Keep busy-state ownership close to the async `try/finally` control flow and cover success and failure cases in tests.
- [Visual masking may not fully prevent keyboard-driven interaction] -> Pair the overlay with region-level disabled or guarded interaction paths plus explicit busy semantics rather than relying on pointer-events alone.
- [New copy can drift across locales] -> Add overlay status text through the existing i18n structure and verify it in component tests.

## Migration Plan

1. Introduce the shared busy-surface overlay pattern and hook it into the workbench shell.
2. Apply the workspace-level busy state around the workbench area for workspace switching and refresh.
3. Apply the request-builder busy state around the request authoring surface for send operations.
4. Add tests for scope-specific overlay visibility, interaction locking, busy-state semantics, and state cleanup on completion or failure.

Rollback strategy:

- Remove the overlay wrapper usage and the new busy flags while retaining the existing async flows and button-level send spinner behavior.

## Open Questions

- None for proposal scope. Broader rollout to collection creation, import/export, or destructive actions can reuse the same pattern in later changes if needed.
