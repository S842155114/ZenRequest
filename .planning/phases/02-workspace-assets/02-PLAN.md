---
phase: 02
phase_name: Workspace Assets
plan_type: implementation
status: ready
source_context: .planning/phases/02-workspace-assets/02-CONTEXT.md
source_research: .planning/phases/02-workspace-assets/02-RESEARCH.md
created: 2026-04-06
---

# Phase 2 Plan — Workspace Assets

## Goal

把请求资产层打磨到稳定、可整理、可重发、可迁移：collection / folder 结构可靠，历史记录查看与重发可信，导入导出与 cURL 导入形成可日常依赖的本地资产工作流。

## Must Haves

- `WS-01`：开发者可以保存请求到 collection，并在 folder / collection 结构中管理常用请求资产
- `WS-02`：开发者可以查看、筛选并重新发送历史请求记录
- `WS-03`：开发者可以导出与导入本地工作区或关键请求资产，用于备份和迁移
- `WS-04`：开发者可以从 cURL 导入请求草稿并继续编辑

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 收敛 collection / folder 资产模型与保存链路
2. 加固历史查看、筛选与重发工作流
3. 加固导入导出与 cURL import 迁移链路
4. 补齐资产链路回归验证与迁移保护

## Tasks

### Task 1 — Collection And Folder Asset Model Hardening

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/types/request.ts`
- `src/lib/request-workspace.ts`
- `src/features/app-shell/state/app-shell-dialogs.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/lib/tauri-client.ts`
- `src-tauri/src/services/collection_service.rs`
- `src-tauri/src/storage/db.rs`
- `.planning/phases/02-workspace-assets/02-CONTEXT.md`
- `.planning/phases/02-workspace-assets/02-RESEARCH.md`
</read_first>

<action>
Refine the request asset model so requests can be stably saved, organized, renamed, deleted, and moved within the intended collection / folder structure for Phase 2 without over-expanding into a future collaboration or cloud asset model.

Keep the resulting implementation aligned with the existing app-shell / runtime bridge / Rust service boundaries. If folder support requires schema or DTO changes, keep them minimal and deterministic instead of introducing a generic tree system for hypothetical future needs.

Concrete implementation goals:
- preserve a clear saved-request identity separate from transient tabs and scratch requests
- support reliable collection-centric organization and the minimum folder structure required by `WS-01`
- keep save / rename / delete / move flows deterministic across frontend state and persistent storage
- ensure collection or folder destructive actions do not silently lose request assets
- avoid leaking asset-organization rules into Vue presentation components
</action>

<acceptance_criteria>
- request asset state distinguishes saved requests from transient tab state through existing type/store boundaries
- collection / folder structure needed for Phase 2 is represented consistently in frontend and Rust DTO/storage layers
- save / rename / delete / move operations update visible UI state and persistent state through one deterministic boundary
- destructive operations produce explicit user-visible confirmation or error outcomes instead of silent loss
- targeted tests for collection/request organization flows exit 0
</acceptance_criteria>

### Task 2 — History View, Filter, And Replay Hardening

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/types/request.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-dialogs.ts`
- `src/features/app-shell/domain/history-replay.ts`
- `src/lib/request-workspace.ts`
- `src-tauri/src/services/history_service.rs`
- `.planning/codebase/CONCERNS.md`
- `.planning/phases/02-workspace-assets/02-RESEARCH.md`
</read_first>

<action>
Harden the history workflow so developers can view, minimally filter, and replay previous HTTP requests without the history list drifting away from editable request state or confusing history records with live execution state.

Concrete implementation goals:
- make history list rendering and empty/error states trustworthy for normal daily usage
- add the minimum filter capability needed for `WS-02` without expanding into a heavy audit/search product
- ensure replaying a history item rehydrates a usable editable request context rather than binding the UI directly to immutable history data
- keep destructive history actions like remove / clear explicit and reversible in user understanding, even if not technically undoable
- preserve the Phase 1 invariant that visible response state and history provenance remain consistent
</action>

<acceptance_criteria>
- history UI/state supports viewing, basic filtering, and replay from existing app-shell boundaries
- replayed history items open as editable request context with correct request fields populated
- history list actions remain consistent with persisted history state after remove / clear / replay operations
- error and empty states for history operations are user-visible and specific enough to diagnose the failing action
- targeted tests for history filter/replay/remove behavior exit 0
</acceptance_criteria>

### Task 3 — Import, Export, And cURL Draft Workflow Hardening

<wave>2</wave>
<depends_on>Task 1, Task 2</depends_on>

<read_first>
- `src/lib/tauri-client.ts`
- `src/features/app-shell/state/app-shell-dialogs.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src-tauri/src/services/import_service.rs`
- `src-tauri/src/services/workspace_service.rs`
- `src-tauri/src/core/import_runtime.rs`
- `src-tauri/src/models/app.rs`
- `.planning/phases/02-workspace-assets/02-CONTEXT.md`
- `.planning/phases/02-workspace-assets/02-RESEARCH.md`
</read_first>

<action>
Stabilize workspace import/export and cURL import flows so local backup, migration, and draft creation feel reliable and predictable. Keep the current runtime adapter and service seams; improve workflow correctness, conflict handling clarity, and editable-result behavior instead of redesigning the import architecture.

Concrete implementation goals:
- preserve explicit scope handling for workspace vs application export/import
- make conflict strategy outcomes understandable and deterministic for rename / skip / overwrite flows
- ensure import failures distinguish invalid package, parse failure, conflict failure, and partial import conditions where applicable
- ensure cURL import always lands as a normal editable request draft compatible with existing request editing surfaces
- avoid pulling Phase 3 secret / variable hardening into this phase beyond what is strictly needed to preserve existing package correctness
</action>

<acceptance_criteria>
- export/import flows preserve scope and conflict strategy behavior through one clear runtime boundary
- import/export user-visible results and errors distinguish the major failure categories relevant to migration
- cURL import creates an editable request draft compatible with the existing request editor
- import/export behavior does not silently destroy or overwrite request assets outside the chosen strategy
- targeted tests for export/import/cURL draft flows exit 0
</acceptance_criteria>

### Task 4 — Asset Workflow Regression Guardrails

<wave>3</wave>
<depends_on>Task 1, Task 2, Task 3</depends_on>

<read_first>
- `.planning/codebase/TESTING.md`
- `src/lib/tauri-client.test.ts`
- `src/features/app-shell/**/*.test.ts`
- `src/features/app-shell/test/*.ts`
- `src-tauri/Cargo.toml`
- `.planning/phases/02-workspace-assets/02-RESEARCH.md`
</read_first>

<action>
Add or update focused regression coverage for saved request organization, history replay/filter behavior, workspace import/export conflict flows, and cURL draft import. Prefer the existing Vitest seam tests and app-shell scenario suites. Add Rust-side validation when the phase materially changes DTO/storage/service behavior.

Concrete validation scope:
- request can be saved into collection / folder structure and remains stable after subsequent asset mutations
- history replay produces editable request state and filtering does not corrupt list behavior
- workspace export/import preserves chosen scope and surfaces conflict outcomes clearly
- cURL import creates a usable draft that can continue through the normal request edit/save flow
- user-visible error mapping is asserted for at least one asset operation failure path
</action>

<acceptance_criteria>
- Phase 2 adds or updates frontend tests for collection/history/import workflows under existing test structure
- at least one regression test covers cURL import into editable draft flow
- at least one regression test covers import/export conflict or destructive-action handling
- `pnpm test` exits 0 after changes
- if Rust logic changes materially, `cargo check --manifest-path src-tauri/Cargo.toml` exits 0
</acceptance_criteria>

<threat_model>
## Threat Model

### In-Scope Risks
- request assets becoming inconsistent between UI state and persistent storage during collection/folder mutations
- history replay drifting away from editable request semantics or mixing history and live execution state
- import/export conflict handling silently overwriting or dropping local assets
- cURL import producing drafts that are not actually compatible with the normal request editing workflow

### Mitigations Required In Plan
- deterministic asset save / rename / delete / move boundaries across frontend and Rust storage seams
- replay flow that converts history snapshots into editable request state instead of binding directly to immutable history data
- explicit scope and conflict handling for import/export with user-visible failure categories
- seam-oriented tests covering destructive actions, replay flows, and migration paths

### Blockers
- Any plan change that introduces implicit cloud sync, hidden destructive overwrite behavior, or secret-sharing expansion is blocked
- Any plan change that expands into variable/secret security architecture or MCP workbench scope without explicit need is blocked
</threat_model>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task 1, Task 2 | Asset model and history workflow can be hardened in parallel once shared boundaries are understood |
| 2 | Task 3 | Import/export hardening depends on the asset model and replay semantics being clarified |
| 3 | Task 4 | Regression coverage should validate the final Phase 2 workflow shape |

## Verification Commands

- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes For Executor

- Keep Phase 2 scoped to asset reliability; do not absorb variables/secrets, assertions, or MCP-specific product work.
- Prefer evolving existing app-shell dialog/service/store and Rust service/storage seams over inventing a new asset orchestration layer.
- Where folder support is required, choose the smallest model that satisfies `WS-01` and preserves migration simplicity.
- Any destructive asset action should favor explicitness and recoverability in user understanding over silent convenience.
