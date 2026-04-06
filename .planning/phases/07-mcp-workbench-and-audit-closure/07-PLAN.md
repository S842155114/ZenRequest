---
phase: 07
phase_name: MCP Workbench And Audit Closure
plan_type: implementation
status: ready
source_context: .planning/phases/07-mcp-workbench-and-audit-closure/07-CONTEXT.md
source_research: .planning/phases/07-mcp-workbench-and-audit-closure/07-RESEARCH.md
created: 2026-04-06
---

# Phase 7 Plan — MCP Workbench And Audit Closure

## Goal

收敛 MCP tools discovery、schema 生命周期与错误 taxonomy 的最终产品语义，并补齐 Phase 5 缺失的归档工件，让 ZenRequest 的 MCP 工作台在不扩 scope 的前提下通过 v1 milestone audit。

## Must Haves

- `MCP-01`：tools discovery 在非测试应用流中具备清晰、稳定的显式链路
- `MCP-03`：schema/raw 参数输入在发现、调用、回放之间保持一致且生命周期可解释
- `MCP-04`：transport / session / tool-call taxonomy 在 runtime、service、UI 三层命名一致
- 补齐 Phase 5 缺失的 `SUMMARY.md` / `VERIFICATION.md`

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 收拢显式 discovery 主链路与编辑态提示
2. 收拢 schema 生命周期与回放/编辑语义
3. 统一 MCP taxonomy 与类型定义
4. 回填 Phase 5 archive-proof 工件并完成 traceability 准备

## Tasks

### Task 1 — Explicit Discovery Workflow Closure

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `.planning/v1.0-MILESTONE-AUDIT.md`
- `.planning/phases/05-mcp-workbench-hardening/05-UAT.md`
- `src/lib/tauri-client.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/mcp-workbench/components/McpRequestPanel.vue`
- `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
</read_first>

<action>
Make tools discovery a first-class workbench action in the real app flow instead of a brittle or hidden seam.

Concrete goals:
- expose a clear discover/refresh tools action in the MCP editing workflow
- preserve the user decision that discovery is explicit-first, not auto-driven by default
- when the user is in `tools.call` mode without a prior discovery result, show a clear “recommended to discover first” prompt while still allowing manual tool-name entry
- keep the implementation inside existing panel/service/runtime boundaries instead of introducing a new MCP orchestration layer
</action>

<acceptance_criteria>
- tools discovery is user-visible and repeatable in the real MCP workbench flow
- `tools.call` without prior discovery is soft-blocked rather than silently treated as fully trusted
- focused tests cover the explicit discovery action and the soft-block guidance path
- `MCP-01` no longer remains partial because discovery continuity is ambiguous
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts`
</verify>

<done>
- explicit discovery is clearly represented in the product flow
- milestone audit can point to concrete evidence for MCP discovery continuity
</done>

### Task 2 — Schema Lifecycle And Replay/Edit Semantics Closure

<wave>1</wave>
<depends_on>Task 1</depends_on>

<read_first>
- `src/features/mcp-workbench/components/McpRequestPanel.vue`
- `src/lib/request-workspace.ts`
- `src/types/request.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- MCP history/replay related tests under `src/features/app-shell/test/`
</read_first>

<action>
Align schema usage so the current editing truth comes from the latest successful discovery, while history/replay snapshots remain evidence rather than the dominant runtime truth.

Concrete goals:
- ensure current editing state prefers the latest discovered tool schema over stale request/history-carried schema
- preserve old schema snapshots only for replay/reference fidelity
- keep raw JSON fallback behavior intact when discovery data is missing or schema is unsupported
- avoid introducing a separate schema cache subsystem; extend the existing request/artifact/store semantics instead
</action>

<acceptance_criteria>
- current `tools.call` editing prefers the latest discovered schema
- replay/history data still preserves prior schema evidence without dominating current edit semantics
- structured form and raw JSON modes remain consistent after the lifecycle change
- `MCP-03` no longer remains partial due to unclear schema lifecycle semantics
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/test/history.suite.ts`
</verify>

<done>
- schema lifecycle is explainable and test-backed across discover/call/replay flows
- current editing truth no longer depends on stale snapshots by accident
</done>

### Task 3 — Taxonomy Unification At Service Boundary

<wave>2</wave>
<depends_on>Task 1, Task 2</depends_on>

<read_first>
- `src/types/request.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/components/response/ResponsePanel.vue`
- `src/components/response/ResponsePanel.test.ts`
- `src-tauri/src/core/mcp_runtime.rs`
</read_first>

<action>
Make the service layer the sole product-facing error semantics boundary and align runtime/service/UI/type naming around it.

Concrete goals:
- normalize MCP error categories to a stable user-facing vocabulary (`transport`, `session`, `tool-call`, plus any still-necessary protocol semantics if truly required)
- remove or fence off legacy labels that let runtime/service/UI drift apart
- ensure UI titles and badges no longer invent their own category names
- keep runtime free to emit raw details, but make service-layer normalization authoritative for product behavior
</action>

<acceptance_criteria>
- type definitions, service normalization, and response UI use the same category vocabulary
- legacy MCP error labels no longer leak into user-visible paths by accident
- focused tests cover at least one normalized category path per major MCP error class
- `MCP-04` no longer remains partial because naming drift persists across layers
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/components/response/ResponsePanel.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- service boundary owns final MCP error semantics
- audit evidence for taxonomy consistency is concrete and easy to cite
</done>

### Task 4 — Phase 5 Archive-Proof Backfill And Re-Audit Readiness

<wave>3</wave>
<depends_on>Task 1, Task 2, Task 3</depends_on>

<read_first>
- `.planning/phases/05-mcp-workbench-hardening/05-PLAN.md`
- `.planning/phases/05-mcp-workbench-hardening/05-GAPS-PLAN.md`
- `.planning/phases/05-mcp-workbench-hardening/05-UAT.md`
- `.planning/v1.0-MILESTONE-AUDIT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
</read_first>

<action>
Backfill the missing Phase 5 archive-proof artifacts from shipped reality and leave the milestone ready for re-audit.

Concrete goals:
- write `05-SUMMARY.md` from the actual Phase 5 + gaps-only shipped behavior
- write `05-VERIFICATION.md` from real tests, UAT evidence, and observable post-gap state
- keep all claims faithful to what shipped; do not rewrite Phase 5 into a broader capability phase
- align planning/status docs so Phase 7 completion makes milestone re-audit straightforward
</action>

<acceptance_criteria>
- `05-SUMMARY.md` exists and accurately reflects shipped MCP workbench scope
- `05-VERIFICATION.md` exists and provides audit-usable evidence
- Phase 7 leaves the milestone with MCP gaps concentrated into shipped evidence instead of missing documentation
- no unshipped MCP capability is implied in the backfilled artifacts
</acceptance_criteria>

<verify>
- `test -f .planning/phases/05-mcp-workbench-hardening/05-SUMMARY.md`
- `test -f .planning/phases/05-mcp-workbench-hardening/05-VERIFICATION.md`
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/components/response/ResponsePanel.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- Phase 5 archive-proof gap is closed
- Phase 7 leaves the project ready for milestone re-audit
</done>

<threat_model>
## Threat Model

### In-Scope Risks
- 为了通过审计而把 discovery 做成隐式自动行为，破坏已锁定的显式主链路决策
- 让历史/replay 携带的旧 schema 继续污染当前编辑态，导致 `MCP-03` 仍然语义不稳
- 只改 UI 标题而不统一 service/type/runtime 词汇，导致 taxonomy drift 换壳不换根
- 回填 Phase 5 工件时过度拔高已 ship 能力，造成 archive proof 与实际交付不一致

### Mitigations Required In Plan
- discovery 以现有显式 seam 为核心，只补主链路动作和提示，不做强自动主导
- schema 生命周期收口优先在 panel/store/service 边界完成，明确“当前编辑态 vs 历史证据”优先级
- taxonomy 以 service 层为单一产品语义边界，并同步 type/UI/Rust evidence
- 所有 Phase 5 文档回填必须基于已有 UAT、代码与测试证据

### Blockers
- 任何把本 phase 扩大成 MCP 协议扩张或 stdio 支持的方案都应阻止
- 任何新增独立 MCP registry / server manager / 持久化 cache 子系统的方案都应阻止
- 任何为审计而虚构未交付功能的文档回填都应阻止
</threat_model>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task 1, Task 2 | 先关闭 discovery 与 schema lifecycle 这两个直接影响 MCP-01 / MCP-03 的主链路问题 |
| 2 | Task 3 | 在主链路稳定后统一 taxonomy，避免边改边漂移 |
| 3 | Task 4 | 最后回填 Phase 5 证据并准备 re-audit |

## Verification Commands

- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/components/response/ResponsePanel.test.ts src/features/app-shell/test/history.suite.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes For Executor

- 这是 MCP audit closure，不是新一轮 MCP 扩 scope。
- 优先把已有 capability 收敛成稳定、可解释、可审计的主链路。
- 若 discovery / schema 语义与现有快照模型冲突，默认优先“当前编辑态以最新 discovery 为真相”。
- 文档回填必须忠于已 ship 事实，不能为通过审计而改写历史。
