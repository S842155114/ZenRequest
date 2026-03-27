## Why

The main workbench shell already exposes request authoring and response inspection regions, but the internal behavior of those regions is still uneven. The request editor advertises body modes that do not yet map to matching editors, and the response surface does not clearly distinguish idle, pending, stale, and completed results, which makes the primary send-and-inspect loop harder to trust.

## What Changes

- Clarify the internal zone model of the main workbench so request composition and response inspection have explicit responsibilities and state boundaries.
- Refine the request authoring region so body mode selection maps to matching editing surfaces instead of a single generic text area for every mode.
- Refine the response inspection region so it communicates idle, pending, stale, success, and error states explicitly while preserving access to body, headers, cookies, and tests.
- Define collapse and constrained-width behavior for the request and response panes as layout states with predictable restore behavior instead of purely visual compression.
- Add implementation-facing acceptance criteria and regression coverage expectations for request editor parity, response lifecycle feedback, and pane state transitions.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workbench-ui`: Extend the workbench requirements beyond shell layout so the main request and response regions have explicit editor parity, response lifecycle feedback, and pane layout-state behavior.

## Impact

- Affects `src/App.vue`, `src/components/request/*`, and `src/components/response/*`.
- Builds on the existing workbench shell and complements, but does not replace, the separate in-progress header change.
- Requires i18n-managed copy updates for new status labels, helper text, and empty/pending state messaging.
- Requires frontend regression coverage for body-mode editing, response state transitions, collapse behavior, and constrained-width workbench interactions.
