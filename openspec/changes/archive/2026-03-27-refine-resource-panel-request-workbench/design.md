## Context

The current workbench already provides a functioning resource browser and a capable request authoring surface, but the semantic contract between saved resources, open tabs, history replay, and draft state is still too implicit.

Current frontend facts that shape this design:

- `App.vue` is the effective workbench coordinator and owns collections, history, open tabs, active tab, save, send, and reopen decisions.
- `RequestPanel.vue` is a local editing surface, not the source of truth for tab identity.
- `RequestParams.vue` already supports JSON validation, raw content-type, structured form-data editing, and binary file metadata, so body-editor parity is no longer the primary gap.
- `AppSidebar.vue` currently receives only `activeRequestId`, which is too narrow to express open, dirty, running, recovered, or detached workbench state.
- `Send` and `Save` semantics are currently too close together, and background-tab save intent is not explicitly bound to the clicked tab.

This change extends existing capabilities instead of introducing a new product area because the affected behavior remains within the established workbench, saved-request, and history contracts.

## Goals / Non-Goals

**Goals:**
- Define an explicit frontend draft lifecycle contract for saved resource tabs, replay drafts, scratch drafts, and detached drafts
- Separate persistence state from execution state so `Send` no longer implies `Save`
- Provide a shared activity projection that can drive the sidebar, tab strip, and request context surfaces consistently
- Reframe the request command surface around object identity, request-local actions, and send readiness
- Preserve current request body editing capabilities while improving readiness and disclosure

**Non-Goals:**
- Redesign the response inspector in this change
- Change the backend storage format of canonical requests or persisted history items beyond what current specs already require
- Introduce a new top-level navigation mode beyond the existing collections/history explorer split
- Fully redesign the advanced request editor IA beyond the layering needed to support readiness and lifecycle clarity

## Decisions

### Decision: Introduce explicit draft metadata for workbench tabs

Each open request tab will carry explicit frontend metadata for:

- origin kind and source id
- persistence state
- execution state
- canonical request linkage when one exists

This avoids overloading `requestId` and `isDirty` with too many meanings.

Alternatives considered:
- Keep deriving meaning from `requestId`, `isDirty`, and `isSending` ad hoc. Rejected because the current ambiguity already leaks into save, replay, and sidebar behavior.
- Split replay and scratch concepts only in the UI without model changes. Rejected because command routing and activity projection would remain brittle.

### Decision: Use one canonical resource tab per saved request by default

Saved requests will open into a canonical `resource-tab` keyed by saved request id. Clicking the same saved request again will focus that tab instead of silently opening duplicates. Separate working copies remain possible only through explicit actions such as duplicate or open-as-draft.

Alternatives considered:
- Always open a new tab for every click. Rejected because it creates avoidable tab sprawl and weakens the meaning of a saved resource as a canonical object.
- Always collapse all copies by request id, including replay tabs. Rejected because history replay must remain distinguishable from the canonical saved request.

### Decision: Reopen history into replay drafts keyed by `historyItemId`

History reopen will create or focus a `replay-draft` keyed by the originating history item. The request snapshot stored in history remains the authoritative replay source, even if the saved request referenced by `requestId` still exists.

Alternatives considered:
- Always create a fresh replay tab. Rejected because repeated reopens of the same history item would create noisy duplicate tabs.
- Reuse the canonical saved request tab for replay. Rejected because it erases the distinction between "current saved request" and "what was executed then."

### Decision: Separate persistence state from execution state

`Save` will update persistence state only. `Send` will update execution state only. A successful send will not clear unsaved-change semantics.

Alternatives considered:
- Keep the current behavior where send success clears dirty state. Rejected because it falsely suggests persistence and breaks trust in the workbench.

### Decision: Derive a shared activity projection in the workbench shell

`App.vue` will derive a projection layer from open tabs, active tab, canonical request links, and replay sources, then feed that projection into:

- sidebar rows
- request tabs
- request context surfaces

This centralizes lifecycle interpretation instead of letting each component invent its own heuristics.

Alternatives considered:
- Let each component infer its own lifecycle badges. Rejected because it invites drift between sidebar, tab strip, and request header.

### Decision: Split the request command surface into identity, action, and context layers

The request workbench command surface will be structured as:

- object identity row
- request-local action runway
- low-noise context strip

Workspace-global actions such as import/export will move out of the primary request command lane.

Alternatives considered:
- Keep all actions in the current URL bar and only tweak styling. Rejected because the current problem is scope clarity, not just visual density.

### Decision: Preserve current body editors and add readiness aggregation instead

The current `json / raw / formdata / binary` editing surfaces remain the baseline. The change will add a workbench-level readiness summary for blockers and advisories rather than reopen body-editor capability work.

Alternatives considered:
- Rebuild body editing again as the primary deliverable. Rejected because the project has already closed most of that gap.

## Risks / Trade-offs

- [Risk] Adding draft metadata expands the frontend tab model and snapshot compatibility surface. → Mitigation: default missing metadata on load and infer safe fallback values for older snapshots.
- [Risk] Canonical resource-tab reuse may frustrate users who want parallel comparison by default. → Mitigation: keep explicit duplicate/open-as-draft actions available for intentional parallel work.
- [Risk] Moving import/export out of the URL bar could reduce short-term discoverability. → Mitigation: relocate them to a stable overflow surface rather than removing visibility entirely.
- [Risk] A richer activity vocabulary can become visually noisy. → Mitigation: constrain first-class signals to a small shared set and keep the projection centralized.
- [Risk] Replay dedupe by `historyItemId` increases implementation detail in the tab router. → Mitigation: keep the dedupe rule explicit and cover it with integration tests at the `App.vue` level.

## Migration Plan

- Introduce new tab metadata as a frontend-only expansion with backward-compatible defaults when older snapshots or existing in-memory tabs omit the new fields.
- Keep canonical saved request entities and persisted history records intact; this change refines how the frontend reopens and labels them in the workbench.
- Roll out lifecycle contract and activity projection first, then move command-surface actions and readiness messaging on top of that contract.
- If regressions appear, fallback behavior remains available by treating unknown tabs as generic scratch drafts and continuing to open canonical saved requests by `requestId`.

## Open Questions

- Should import/export live in the request panel header overflow or the global app header overflow?
- Should dirty-tab close protection use confirm dialogs, undo toasts, or a hybrid pattern?
- How much of the shared activity projection should remain visible in compact or collapsed layouts before it becomes too noisy?
