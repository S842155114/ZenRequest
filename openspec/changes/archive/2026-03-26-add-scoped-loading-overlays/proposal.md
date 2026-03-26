## Why

The workbench currently runs several async operations without a consistent region-level loading state, so users can keep interacting with UI that is about to refresh or is already processing. Adding scoped loading overlays improves feedback and prevents accidental edits by making the affected surface visibly busy until the operation completes.

## What Changes

- Add scoped loading overlays for async workbench actions so only the impacted region is masked and temporarily non-interactive.
- Show workspace-level busy feedback when actions such as switching workspaces trigger a full workspace data refresh.
- Show request-builder busy feedback when sending a request so the active request editor cannot be modified while the in-flight request is being built and executed.
- Pair each scoped overlay with clear loading/status messaging so users understand why that region is temporarily unavailable.
- Define a reusable busy-state pattern that can be applied to similar async operations later without falling back to a full-screen global blocker.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workbench-ui`: Add region-scoped busy overlays and interaction locking for async operations that temporarily invalidate part of the workbench.

## Impact

- Affects the main workbench shell in `src/App.vue`, especially workspace switching and request sending flows.
- Affects the request authoring region and any shell regions that need an overlay container and non-interactive state while loading.
- Requires i18n-managed busy/loading copy and accessible busy-state semantics for any visible status treatment.
- Requires frontend regression coverage for busy-state visibility, interaction locking, and scope isolation between unaffected and affected regions.
