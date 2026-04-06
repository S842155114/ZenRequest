---
phase: 06
phase_name: Workspace, Recovery And Audit Closure
plan_type: implementation
status: ready
source_context: .planning/phases/06-workspace-recovery-and-audit-closure/06-CONTEXT.md
created: 2026-04-06
---

# Phase 6 Plan — Workspace, Recovery And Audit Closure

## Goal

补齐 v1 milestone audit 中关于工作区资产层级、导入导出迁移闭环、恢复诊断闭环与缺失验证工件的剩余缺口，让 ZenRequest 从“已 ship”推进到“可重新审计并可归档”的状态。

## Must Haves

- `WS-01`：collection / folder 结构要么真正补齐稳定闭环，要么明确与当前产品真实能力对齐并提供充分证据
- `WS-03`：导入导出与冲突/迁移结果在主链路中更完整、可理解、可验证
- `TEST-02`：数据库损坏、数据恢复失败或历史记录异常时的诊断/恢复提示闭环更完整
- 补齐 Phase 3 / Phase 4 缺失的 milestone archive-proof 工件

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 补齐 workspace asset hierarchy 与 import/export conflict closure 的产品闭环
2. 补齐 recovery guidance 在 DB/history 异常路径的用户可见闭环
3. 补齐 Phase 3 / Phase 4 缺失的 summary / verification 工件
4. 更新 traceability 并补回归验证，为 milestone re-audit 做准备

## Tasks

### Task 1 — Workspace Asset Hierarchy And Import/Export Closure

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `.planning/v1.0-MILESTONE-AUDIT.md`
- `.planning/phases/02-workspace-assets/02-SUMMARY.md`
- `.planning/phases/02-workspace-assets/02-UAT.md`
- `src/types/request.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/components/layout/AppSidebar.vue`
- `src/components/layout/AppSidebar.test.ts`
- `src-tauri/src/core/import_runtime.rs`
- `src/lib/tauri-client.ts`
</read_first>

<action>
Close the remaining Phase 2 milestone gaps with minimal architectural drift.

Concrete goals:
- inspect whether folder support is partially present and finish the missing closure within the existing request asset model
- if folder support is not realistically finishable with a focused change, align the implemented behavior and surrounding evidence so `WS-01` is no longer ambiguous
- harden import/export conflict result handling and user-facing continuity so the migration path feels complete rather than boundary-only
- keep all changes within existing sidebar / app-shell / Rust import-runtime seams instead of creating a new asset subsystem
</action>

<acceptance_criteria>
- workspace asset hierarchy behavior is no longer partial/ambiguous at milestone level
- import/export conflict handling has clear end-to-end result semantics in the main UX path
- regression tests exist for the specific gap-closure paths that changed
- the milestone audit claim for `WS-01` and `WS-03` can be updated with concrete evidence
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/components/layout/AppSidebar.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/state/app-shell-dialogs.test.ts src/lib/tauri-client.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- `WS-01` and `WS-03` no longer remain “partial because not enough closure exists”
- asset-management / import-export evidence is strong enough for milestone re-audit
</done>

### Task 2 — Recovery Guidance Closure For DB And History Anomalies

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `.planning/v1.0-MILESTONE-AUDIT.md`
- `.planning/phases/04-reliability-and-assertions/04-SUMMARY.md`
- `.planning/phases/04-reliability-and-assertions/04-UAT.md`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/components/response/ResponsePanel.vue`
- `src/lib/request-workspace.ts`
- `src-tauri/src/storage/repositories/workspace_repo.rs`
</read_first>

<action>
Extend the existing reliability baseline so recovery guidance covers the DB/history anomaly cases that remain weak in the milestone audit.

Concrete goals:
- identify the already-supported failure classes around snapshot recovery, history anomalies, workspace persistence, or DB corruption hints
- normalize those failures into structured user-facing guidance that matches the existing Phase 4 error model
- keep the solution lightweight: enrich diagnostics and suggested next actions rather than building a large repair product surface
- ensure recovery guidance is visible in the actual UI path users already use
</action>

<acceptance_criteria>
- at least one DB/history anomaly path beyond startup degraded recovery is covered by automated tests
- guidance includes actionable next steps rather than opaque backend-only messages
- the solution stays consistent with existing request/startup error semantics
- `TEST-02` has milestone-grade evidence instead of only startup-only proof
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/startup-layout.suite.ts src/components/response/ResponsePanel.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- recovery guidance closure is no longer limited to startup-only scenarios
- milestone re-audit has concrete evidence for `TEST-02`
</done>

### Task 3 — Backfill Missing Phase 3 And Phase 4 Archive-Proof Artifacts

<wave>2</wave>
<depends_on>Task 1, Task 2</depends_on>

<read_first>
- `.planning/phases/03-variables-and-secrets/03-PLAN.md`
- `.planning/phases/03-variables-and-secrets/03-UAT.md`
- `.planning/phases/04-reliability-and-assertions/04-PLAN.md`
- `.planning/phases/04-reliability-and-assertions/04-SUMMARY.md`
- `.planning/phases/04-reliability-and-assertions/04-UAT.md`
- `src/features/app-shell/domain/url-resolution.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src-tauri/src/core/request_runtime.rs`
- `src-tauri/src/storage/repositories/workspace_repo.rs`
</read_first>

<action>
Create the missing planning artifacts required by the milestone audit without rewriting history or inventing work that did not ship.

Concrete goals:
- write `03-SUMMARY.md` from the actual implemented Phase 3 outcomes
- write `03-VERIFICATION.md` from the executed Phase 3 planning and currently observable evidence
- write `04-VERIFICATION.md` so Phase 4 has a complete verification chain
- keep each artifact faithful to what actually shipped, what UAT validated, and what still remained out of scope at the time
</action>

<acceptance_criteria>
- `03-SUMMARY.md` exists and accurately reflects shipped Phase 3 work
- `03-VERIFICATION.md` exists and provides milestone-audit-usable evidence
- `04-VERIFICATION.md` exists and matches actual Phase 4 scope
- artifacts do not over-claim unshipped work
</acceptance_criteria>

<verify>
- `test -f .planning/phases/03-variables-and-secrets/03-SUMMARY.md`
- `test -f .planning/phases/03-variables-and-secrets/03-VERIFICATION.md`
- `test -f .planning/phases/04-reliability-and-assertions/04-VERIFICATION.md`
</verify>

<done>
- Phase 3 and Phase 4 archive-proof gaps are closed
- milestone audit can stop failing on missing artifacts for these phases
</done>

### Task 4 — Traceability Realignment And Re-Audit Readiness

<wave>3</wave>
<depends_on>Task 1, Task 2, Task 3</depends_on>

<read_first>
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/v1.0-MILESTONE-AUDIT.md`
- all newly updated Phase 6 / Phase 3 / Phase 4 artifacts
</read_first>

<action>
Finish the documentation and verification alignment required so milestone re-audit can be run with minimal ambiguity.

Concrete goals:
- update requirement traceability / status language where Phase 6 work changes the audit picture
- ensure the new evidence paths are easy to find from planning docs
- add or update focused regression coverage for all changed user-facing closures
- keep this task as audit-readiness alignment, not milestone completion itself
</action>

<acceptance_criteria>
- requirement traceability and phase evidence paths align with the gap-closure work completed in this phase
- tests executed in this phase cover the specific closures made by Tasks 1-3
- the project is ready to proceed to `Phase 7` and then re-run milestone audit
- no unrelated roadmap or milestone archive changes are mixed into this phase
</acceptance_criteria>

<verify>
- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- Phase 6 leaves the project in a clear state for Phase 7 and milestone re-audit
- remaining milestone blockers are concentrated in Phase 7 scope only
</done>

<threat_model>
## Threat Model

### In-Scope Risks
- 为了通过审计而补写不准确的 phase artifacts，导致文档与实际交付脱节
- 用大规模 asset model 重写来解决 `WS-01`，反而引入新的数据与恢复风险
- 为了补 `TEST-02` 而引入复杂恢复机制，超出当前产品阶段
- traceability 更新与实际实现脱节，导致 re-audit 仍然失败

### Mitigations Required In Plan
- 缺失工件必须基于已实现代码、已有 UAT、已有 phase 文档回填
- product gap closure 优先局部补齐和现有边界内收敛
- recovery closure 优先结构化诊断和可执行建议，而不是新增重型系统
- 每个 gap 都要有对应验证命令和证据路径

### Blockers
- 任何把本 phase 扩大为重构整体 workspace storage architecture 的方案都应阻止
- 任何为“看起来通过审计”而过度改写历史文档的方案都应阻止
- 任何把 MCP gap 混入本 phase 的方案都应阻止（应留给 Phase 7）
</threat_model>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task 1, Task 2 | 先关闭真实产品缺口：workspace/import-export/recovery |
| 2 | Task 3 | 基于已确认的实现与证据补齐缺失工件 |
| 3 | Task 4 | 最后统一做 traceability 与 re-audit readiness 收口 |

## Verification Commands

- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes For Executor

- 这是 milestone gap-closure phase，不是新功能扩张 phase。
- 优先解决 audit 中真实点名的缺口，不要借机做大范围整理。
- 如果 `WS-01` 的最优 closure 是“补齐小缺口 + 对齐证据”，就不要演变成大规模模型重构。
- 所有新增 planning artifacts 必须忠于已交付事实。
- 本 phase 完成后，剩余 milestone blockers 应主要收敛到 Phase 7 的 MCP gap closure。
