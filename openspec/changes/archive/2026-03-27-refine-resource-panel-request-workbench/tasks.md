## 1. Draft Lifecycle Contract

- [x] 1.1 Extend the frontend request-tab model to carry explicit origin, persistence, and execution state instead of overloading `requestId` and `isDirty`
- [x] 1.2 Update `App.vue` tab-routing rules so saved requests reuse one canonical resource tab while history items reopen into replay drafts keyed by `historyItemId`
- [x] 1.3 Fix save intent routing so save actions triggered from a specific tab persist that tab instead of defaulting to the current active tab
- [x] 1.4 Preserve open work items as detached drafts when their backing saved request or collection is deleted

## 2. Shared Activity Projection

- [x] 2.1 Add a shared workbench activity projection derived from open tabs, active tab, and replay sources for `active`, `open`, `dirty`, `running`, `result`, and `recovered` signals
- [x] 2.2 Update `AppSidebar` to render activity-aware request and history rows plus a lightweight workset summary without adding a new top-level explorer mode
- [x] 2.3 Update `RequestPanel` tab rendering and collapsed summaries so canonical tabs, replay drafts, scratch drafts, and detached drafts remain distinguishable
- [x] 2.4 Separate request origin wording from persistence wording so canonical resource drafts do not simultaneously read as both saved and unsaved

## 3. Request Command Surface And Readiness

- [x] 3.1 Refactor `RequestUrlBar` and surrounding request-shell chrome into identity, request-action, and low-noise context layers
- [x] 3.2 Move workspace-global import/export actions out of the primary request command runway into an appropriate overflow surface
- [x] 3.3 Separate send status from save status in the request workbench so successful sends no longer clear unsaved-change semantics
- [x] 3.4 Add a request-local readiness surface that aggregates blockers and advisories such as empty URL, unresolved variables, invalid JSON, and missing binary payload while preserving current body-mode editors
- [x] 3.5 Re-layer advanced request configuration so `Auth`, `Tests`, and `Env` read as secondary to the main compose-and-send path

## 4. Verification And Regression Coverage

- [x] 4.1 Add or update integration tests for canonical saved-request focusing, replay-draft reopening, detached-draft preservation, and tab-scoped save behavior
- [x] 4.2 Add component tests for sidebar activity signals, request-tab lifecycle badges, command-surface readiness states, and collapsed-summary provenance cues
- [x] 4.3 Regress existing request body-mode behavior so JSON validation, raw content-type, structured form-data editing, and binary metadata remain intact after the lifecycle refactor
- [x] 4.4 Guard dirty request-tab closure with save-or-discard confirmation so unsaved work is not discarded implicitly
- [x] 4.5 Run `pnpm test` and targeted manual verification for collection request selection, history replay, dirty/save/send semantics, detached drafts, and request-workbench command hierarchy
