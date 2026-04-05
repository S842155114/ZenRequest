---
phase: 01
phase_name: Core Flow Hardening
plan_type: implementation
status: ready
source_context: .planning/phases/01-core-flow-hardening/01-CONTEXT.md
source_research: .planning/phases/01-core-flow-hardening/01-RESEARCH.md
created: 2026-04-06
---

# Phase 1 Plan — Core Flow Hardening

## Goal

把 HTTP 调试主链路打磨到稳定、可恢复、可日常使用：请求编辑与发送顺畅、响应查看可靠、应用启动恢复可信、大 payload / 高频重发场景不出现明显卡顿、崩溃或历史损坏。

## Must Haves

- `CORE-01`：单个工作区中的请求创建、编辑和重复发送稳定可用
- `CORE-02`：响应状态码、耗时、响应头、原始内容和格式化内容稳定显示
- `CORE-03`：应用重启后恢复最近工作区、标签页和当前调试上下文
- `CORE-04`：大响应体、文件上传、频繁重发下保持稳定，不出现明显卡顿、崩溃或历史损坏

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 梳理并收敛 startup / recovery 状态机
2. 加固执行结果与历史持久化的边界
3. 优化响应与快照的重量级数据路径
4. 补齐针对主链路和压力场景的验证

## Tasks

### Task 1 — Startup And Recovery Hardening

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/features/app-shell/composables/useAppShell.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/composables/useAppShellEffects.ts`
- `src/lib/request-workspace.ts`
- `.planning/phases/01-core-flow-hardening/01-CONTEXT.md`
- `.planning/phases/01-core-flow-hardening/01-RESEARCH.md`
</read_first>

<action>
Refactor startup and recovery orchestration so the app-shell has explicit startup phases for snapshot load, validation, hydration, and ready/degraded completion instead of a single opaque restore step. Keep orchestration in the app-shell composable/store/service boundary; do not move recovery rules into Vue templates.

Ensure the resulting flow does all of the following with concrete behavior:
- if a legacy or persisted workspace snapshot is present, attempt load and validation before marking runtime ready
- if snapshot recovery fails, set a degraded startup state and preserve enough error detail for user-visible messaging
- if recovery partially succeeds, always choose a deterministic active workspace and active tab fallback
- if no valid snapshot exists, initialize a clean but usable workspace state without crashing or leaving startup pending forever
- expose startup state transitions through existing app-shell state so UI can distinguish loading, ready, and degraded/error conditions
</action>

<acceptance_criteria>
- `src/features/app-shell/composables/useAppShell.ts` contains explicit startup-state handling for load / validate / hydrate / ready-or-degraded transitions
- `src/features/app-shell/state/` contains recovery logic moved out of monolithic inline branches when applicable
- startup failure path sets a user-facing error source instead of only logging a generic failure
- app startup with missing or invalid snapshot can still reach a usable state
- related tests covering successful restore and degraded fallback exit 0
</acceptance_criteria>

### Task 2 — Execution Result And History Boundary Hardening

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/lib/tauri-client.ts`
- `src/lib/request-workspace.ts`
- `src/types/request.ts`
- `src-tauri/src/core/request_executor.rs`
- `src-tauri/src/services/history_service.rs`
- `src-tauri/src/storage/db.rs`
- `.planning/codebase/CONCERNS.md`
- `.planning/phases/01-core-flow-hardening/01-RESEARCH.md`
</read_first>

<action>
Normalize the request execution → response projection → history persistence boundary so repeated sends and failure cases cannot leave visible response state and persisted history out of sync. Keep frontend↔Rust error transport normalized in `src/lib/tauri-client.ts` and avoid ad-hoc per-call parsing.

Implement concrete protections:
- assign or preserve a single execution provenance for each live request result before history write
- only persist history from a normalized successful result boundary, not from partially transformed UI state
- keep stale/live/execution-source flags consistent with the actual execution lifecycle
- ensure send failure, decode failure, and history write failure produce distinct user-facing error contexts
- avoid mixing MCP artifact behavior into HTTP-only hardening unless required for shared invariants
</action>

<acceptance_criteria>
- `src/lib/tauri-client.ts` centralizes runtime error normalization for the hardened execution path
- HTTP execution result handling updates response state and history through one deterministic boundary
- repeated send scenarios do not produce duplicate or mismatched visible-vs-persisted response records in tests
- error cases for send failure and persistence failure are distinguishable in state or returned messages
- targeted tests for repeated send / history boundary behavior exit 0
</acceptance_criteria>

### Task 3 — Large Payload And Response Projection Performance Hardening

<wave>2</wave>
<depends_on>Task 1, Task 2</depends_on>

<read_first>
- `src/lib/request-workspace.ts`
- `src/types/request.ts`
- `src/features/request-workbench/`
- `src/features/request-compose/`
- `src/features/app-shell/composables/useAppShell.ts`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/phases/01-core-flow-hardening/01-RESEARCH.md`
</read_first>

<action>
Reduce unnecessary deep-reactive churn and heavyweight cloning on the hot path for large responses, replayed responses, and high-frequency re-send flows while preserving the existing request/response model shape. Keep heavy payload ownership in centralized snapshot/projection helpers instead of duplicating copy logic across components.

Concrete implementation goals:
- isolate heavyweight response body and artifact replacement from fine-grained edit-state reactivity
- avoid redundant whole-response deep clones during repeated live updates when replacement semantics are sufficient
- preserve response viewer requirements: status, timing, headers, raw body, formatted body, and execution source remain available
- ensure history snapshot and UI response projection remain correct for large payload scenarios
- do not introduce a new product feature such as advanced trace view or streaming protocol work in this phase
</action>

<acceptance_criteria>
- `src/lib/request-workspace.ts` or related hot-path helpers show reduced redundant clone/projection work for large payload state
- response projection still preserves status, headers, raw/formatted body, and timing fields required by `CORE-02`
- tests cover at least one large-response or high-frequency resend scenario without state corruption
- no new Phase 2/3/5 product scope appears in changed files
</acceptance_criteria>

### Task 4 — Reliability Test Coverage And Regression Guardrails

<wave>3</wave>
<depends_on>Task 1, Task 2, Task 3</depends_on>

<read_first>
- `.planning/codebase/TESTING.md`
- `src/**/*.test.ts`
- `src/features/app-shell/**/*.test.ts`
- `src/lib/**/*.test.ts`
- `src-tauri/Cargo.toml`
- `.planning/phases/01-core-flow-hardening/01-RESEARCH.md`
</read_first>

<action>
Add or update focused tests around startup recovery, degraded fallback, repeated send/history consistency, and large-payload handling. Prefer the existing Vitest + app-shell/lib seam tests already used by the repo. Only add Rust-side validation if the hardened logic materially moves into Rust execution/persistence boundaries.

Concrete validation scope:
- successful restore of previous workspace/tab state
- invalid or partial snapshot fallback to usable state
- repeated send keeps response and history consistent
- large response path preserves required response data and avoids corruption
- user-visible error mapping for startup or persistence failure is asserted, not only console behavior
</action>

<acceptance_criteria>
- Phase 1 adds or updates tests under existing frontend test structure for startup recovery and degraded fallback
- repeated send/history consistency is asserted by automated tests
- at least one large-response or pressure-path regression test exists
- relevant frontend test command exits 0 after changes
- if Rust logic changes materially, `cargo check --manifest-path src-tauri/Cargo.toml` exits 0
</acceptance_criteria>

<threat_model>
## Threat Model

### In-Scope Risks
- local snapshot corruption causing inconsistent startup state
- error handling that hides persistence/runtime failure provenance from the user
- large payload paths causing memory pressure, UI lockups, or silent state truncation
- history persistence drift leading to incorrect local audit trail of executed requests

### Mitigations Required In Plan
- deterministic startup state machine with degraded fallback
- normalized runtime error envelope at the Tauri bridge boundary
- centralized response/history commit boundary for HTTP execution
- pressure-path tests for large payload and repeated send scenarios

### Blockers
- Any plan change that introduces secret leakage, unsafe cloud sync, or silent destructive fallback is blocked
- Any plan change that expands into MCP workbench scope without explicit need is blocked
</threat_model>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task 1, Task 2 | Recovery and execution/history boundaries can be hardened in parallel once shared invariants are understood |
| 2 | Task 3 | Depends on clarified startup/execution boundaries before optimizing heavy payload paths |
| 3 | Task 4 | Tests should validate the final shape of the hardened flow |

## Verification Commands

- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes For Executor

- Keep changes scoped to Phase 1 must-haves; defer collection expansion, variables/secret work, assertions deepening, and MCP enhancements.
- Prefer extracting or simplifying within existing app-shell/store/service/lib boundaries over introducing new abstraction layers.
- Any user-visible fallback should preserve the product promise: local-first, fast, and controllable even in degraded mode.
