---
phase: 05
phase_name: MCP Workbench Hardening
plan_type: gap_closure
status: ready
source_uat: .planning/phases/05-mcp-workbench-hardening/05-UAT.md
created: 2026-04-06
---

# Phase 5 Gap Closure Plan

## Goal

仅修复本轮 UAT 暴露的两类 major gap：
1. 兼容返回 `text/event-stream` 的 MCP over HTTP initialize 响应
2. 将“server not initialized”这类错误从 `transport` 误分类收敛到 `session/initialize`

本计划不扩展到 `stdio`、多 server、全协议面，也不重做 MCP 工作台架构。

## Gaps Addressed

### Gap 1 — SSE / text-event-stream initialize response compatibility
- Truth: ZenRequest can interoperate with MCP over HTTP servers that return `text/event-stream` initialize responses while preserving schema-driven tool workflows.
- Source: `.planning/phases/05-mcp-workbench-hardening/05-UAT.md`
- Severity: major

### Gap 2 — Session/initialize failures misclassified as transport
- Truth: ZenRequest classifies MCP failures according to the real failure layer, so a server-not-initialized response is surfaced as session/initialize context rather than transport.
- Source: `.planning/phases/05-mcp-workbench-hardening/05-UAT.md`
- Severity: major

## Plan Summary

本次 gap closure 拆成 3 个小任务：
1. 在 Rust MCP runtime 增加对 SSE-style MCP HTTP 响应的最小解析与 session header 保留
2. 收敛 session/initialize 错误分类规则，避免把协议语义错误误记为 transport
3. 补齐针对本地 HTTP MCP server 形态的 focused regression tests

## Tasks

### Task G1 — Parse SSE-style MCP responses and preserve session context

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src-tauri/src/core/mcp_runtime.rs`
- `src-tauri/src/models/request.rs`
- `src/lib/tauri-client.ts`
- `src/types/request.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-store.ts`
</read_first>

<action>
Add minimal compatibility for MCP over HTTP servers that respond with `content-type: text/event-stream` and wrap JSON-RPC payloads inside `event:` / `data:` lines.

Concrete implementation goals:
- keep the current HTTP transport model; do not introduce a long-lived SSE client
- when the response content type is `text/event-stream`, extract the meaningful `data:` payload and parse the JSON-RPC result from it
- preserve the raw response text for diagnostics while also surfacing the parsed JSON payload as `protocolResponse`
- capture `mcp-session-id` response header into MCP artifact / request context when present so later operations can reuse it
- keep fallback behavior safe when SSE payload parsing fails: structured failure, no panic
</action>

<acceptance_criteria>
- initialize against an SSE-style MCP HTTP server no longer stalls on raw event-stream text
- parsed JSON-RPC payload is available through existing MCP artifact fields
- session header is available to later `tools.list` / `tools.call` context
- no new runtime transport abstraction is introduced
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/domain/history-replay.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

### Task G2 — Reclassify server-not-initialized and similar protocol failures as session errors

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/features/app-shell/state/app-shell-services.ts`
- `src/components/response/ResponsePanel.vue`
- `src/components/response/ResponsePanel.test.ts`
- `src-tauri/src/core/mcp_runtime.rs`
- `.planning/phases/05-mcp-workbench-hardening/05-UAT.md`
</read_first>

<action>
Tighten MCP error classification so the app does not equate every HTTP 4xx response with a transport failure. If the server was reached and the payload indicates missing initialize/session state, surface that as a session-level problem.

Concrete implementation goals:
- distinguish network/connectivity failure from HTTP-level protocol error returned by a reachable MCP server
- treat messages like `server not initialized`, missing session, initialize required, or equivalent MCP protocol semantics as `session`
- keep tool-execution/protocol failures separate from session failures
- update user-facing guidance so session errors tell the user to initialize or re-establish session first
</action>

<acceptance_criteria>
- a reachable server returning “not initialized” is no longer shown as `transport`
- response panel and structured error payload carry the corrected layer/category
- automated tests cover at least one session-misclassified-as-transport regression case
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/components/response/ResponsePanel.test.ts`
</verify>

### Task G3 — Regression coverage for the two UAT gaps

<wave>2</wave>
<depends_on>Task G1, Task G2</depends_on>

<read_first>
- `src/features/app-shell/state/app-shell-services.test.ts`
- `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
- `src/components/response/ResponsePanel.test.ts`
- `src-tauri/src/core/mcp_runtime.rs`
</read_first>

<action>
Add focused regression coverage that proves the two reported gaps remain closed.

Concrete validation scope:
- one SSE-style initialize response path is parsed and exposed as usable MCP artifact data
- one “server not initialized” response path surfaces as `session` rather than `transport`
- existing MCP panel/history tests continue to pass alongside the new compatibility behavior
</action>

<acceptance_criteria>
- targeted tests cover both reported UAT failures
- broader MCP-related focused test suite exits 0
- Rust compile/check exits 0 after runtime changes
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/app-shell/domain/history-replay.test.ts src/features/mcp-workbench/lib/mcp-schema-form.test.ts src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/components/response/ResponsePanel.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task G1, Task G2 | 直接闭合两个 UAT gap，本质上是并列修复点 |
| 2 | Task G3 | 在修复完成后补统一回归验证 |

## Notes For Executor

- 这是 gap closure，不是新一轮扩 scope。
- 优先以最小改动兼容现有本地 MCP HTTP server 形态。
- 如果需要引入 SSE 解析，只做“单次响应体解析”级别，不做持续流会话系统。
- session header / initialize 语义修复应兼容已有 MCP artifact 与历史回放模型。
