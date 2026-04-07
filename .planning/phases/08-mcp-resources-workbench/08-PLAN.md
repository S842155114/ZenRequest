---
phase: 08
phase_name: MCP Resources Workbench
plan_type: implementation
status: ready
source_context: .planning/phases/08-mcp-resources-workbench/08-CONTEXT.md
source_research: .planning/phases/08-mcp-resources-workbench/08-RESEARCH.md
created: 2026-04-07
---

# Phase 8 Plan — MCP Resources Workbench

## Goal

把 MCP `resources.list` / `resources.read` 以最小增量接入现有 operation-driven workbench，使资源 discovery、读取、历史摘要与 replay 沿用已收口的 MCP tools 交互哲学。

## Must Haves

- `MCPR-01`：开发者可以显式列出 MCP server 暴露的 resources
- `MCPR-02`：开发者可以读取单个 resource，并查看结构化结果与原始协议内容
- `MCPR-03`：开发者可以回放 resource 请求，并保留足够上下文用于诊断

## Plan Summary

本 phase 拆成 3 个可执行任务：
1. 扩展资源 operation/type/runtime 合同
2. 接入 discovery-first 的 resources authoring UI
3. 复用通用结果/历史/replay 链路并完成验证

<objective>
Add minimal MCP resources support to the existing operation-driven workbench by extending the current MCP chain with explicit `resources.list` and `resources.read` behavior only.

Purpose: satisfy `MCPR-01` to `MCPR-03` while preserving the Phase 05/07 workbench philosophy: explicit discovery, generic result display, stable history, and replay-ready protocol artifacts.
Output: one executable MCP resources workbench flow covering list, read, history summary, and replay continuity in the current single-server HTTP MCP path.
</objective>

<execution_context>
@/home/qiang/.codex/get-shit-done/workflows/execute-plan.md
@/home/qiang/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md
@.planning/phases/08-mcp-resources-workbench/08-RESEARCH.md
@.planning/phases/05-mcp-workbench-hardening/05-SUMMARY.md
@.planning/phases/07-mcp-workbench-and-audit-closure/07-PLAN.md
@src/features/mcp-workbench/components/McpRequestPanel.vue
@src/features/app-shell/composables/useAppShellViewModel.ts
@src/features/app-shell/state/app-shell-services.ts
@src/features/app-shell/state/app-shell-store.ts
@src/lib/request-workspace.ts
@src/types/request.ts
@src-tauri/src/core/mcp_runtime.rs

<interfaces>
From `src/types/request.ts`:
```ts
export type McpOperationType = 'initialize' | 'tools.list' | 'tools.call'

export type McpOperationInput =
  | { type: 'initialize'; input: McpInitializeInput }
  | { type: 'tools.list'; input: McpToolsListInput }
  | { type: 'tools.call'; input: McpToolCallInput }

export interface McpExecutionArtifact {
  transport: McpTransportKind
  operation: McpOperationType
  protocolRequest?: Record<string, unknown>
  protocolResponse?: Record<string, unknown>
  selectedTool?: McpToolSchemaSnapshot
  cachedTools?: McpToolSchemaSnapshot[]
  sessionId?: string
  errorCategory?: 'transport' | 'session' | 'tool-call' | 'initialize' | 'tool_execution'
}
```

From `src/features/app-shell/state/app-shell-services.ts`:
```ts
export interface AppShellServices {
  discoverMcpTools: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<McpToolSchemaSnapshot[]>>
  sendRequest: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<{ tabId: string; response: SendRequestResult }>>
}
```

From `src-tauri/src/core/mcp_runtime.rs`:
```rust
fn operation_name(operation: &McpOperationInputDto) -> &'static str
fn build_protocol_request(payload: &SendMcpRequestPayloadDto) -> Result<Value, AppError>
pub async fn execute_mcp_request(payload: &SendMcpRequestPayloadDto) -> Result<SendMcpRequestResultDto, AppError>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend MCP resource contracts and runtime mapping</name>
  <files>src/types/request.ts, src/lib/request-workspace.ts, src/lib/tauri-client.ts, src/features/app-shell/state/app-shell-services.ts, src/features/app-shell/state/app-shell-services.test.ts, src/features/app-shell/state/app-shell-store.ts, src/features/app-shell/test/history.suite.ts, src-tauri/src/core/mcp_runtime.rs</files>
  <behavior>
    - Test 1: `resources.list` request payload maps to MCP method `resources/list` and preserves protocol envelopes per D-01.
    - Test 2: `resources.read` accepts a URI, maps to MCP method `resources/read`, and keeps generic result artifacts per D-03 and D-06.
    - Test 3: history and replay preserve operation type, selected resource URI, and latest resource discovery evidence without replacing current editable discovery truth per D-08 and D-09.
  </behavior>
  <action>Expand the existing MCP operation union with explicit `resources.list` and `resources.read` operations per D-01 and D-02. Add the minimum new TypeScript shapes required for discovered resources and selected resource context, reusing the existing artifact-centered history/replay lineage instead of building a new resource subsystem. In `app-shell-services.ts`, add a dedicated `discoverMcpResources` seam or equally small resource-specific extension of the current discovery service if it naturally shares code with `discoverMcpTools`; do not generalize into a broad capability registry. Persist latest discovered resources as the current editing truth for authoring convenience per D-08, but preserve replay snapshots as evidence only per D-09. In `mcp_runtime.rs`, extend the existing operation switch to emit `resources/list` and `resources/read` requests over the same single-server HTTP path, with manual URI allowed for reads and no prompts/roots/stdio/sampling/multi-server behavior added.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts</automated>
  </verify>
  <done>Resource operations exist end-to-end in types, service orchestration, runtime request mapping, and history/replay persistence, with explicit discovery-first semantics and manual URI fallback fully modeled.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add minimal MCP resources authoring UI</name>
  <files>src/features/mcp-workbench/components/McpRequestPanel.vue, src/features/mcp-workbench/components/McpRequestPanel.test.ts, src/features/app-shell/composables/useAppShellViewModel.ts</files>
  <behavior>
    - Test 1: the MCP operation selector exposes `resources.list` and `resources.read` alongside existing operations per D-01.
    - Test 2: `resources.read` prefers explicit discovery, offers discovered resource selection when present, and still allows manual URI entry when discovery is missing per D-03 to D-05.
    - Test 3: the panel shows guidance when no discovery has been run, but does not block send for a manually entered URI per D-05.
  </behavior>
  <action>Extend `McpRequestPanel.vue` within the existing operation-driven layout rather than introducing a separate resources browser. Reuse the current discover-action pattern and add a resource-specific explicit discovery action that feels parallel to tools discovery per D-08 and D-10. For `resources.read`, provide a minimal discovered-resource selection control plus a manual URI input; the control should prefer discovery results but must not hard-block a valid manual URI per D-03 to D-05. Keep the UI generic and compact: no rich preview viewer, no special markdown/image rendering, no new navigation surface, and no multi-server affordances. Update `useAppShellViewModel.ts` only where needed to wire the new discover action through the existing request-panel handler path.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts</automated>
  </verify>
  <done>The MCP request panel supports explicit `resources.list` and `resources.read` authoring with minimal new UI, discovery-first guidance, and manual URI fallback, all aligned with the current workbench interaction model.</done>
</task>

<task type="auto">
  <name>Task 3: Reuse generic result display and validate the full resource flow</name>
  <files>src/components/response/ResponsePanel.vue, src/features/app-shell/state/app-shell-store.ts, src/features/app-shell/test/history.suite.ts, src/features/mcp-workbench/components/McpRequestPanel.test.ts, src/features/app-shell/state/app-shell-services.test.ts</files>
  <action>Keep result presentation intentionally generic per D-06 and D-07. Reuse the existing response panel protocol envelope display and current structured response plumbing so resource reads show raw protocol request/response and generic JSON/text/blob-related information only. If any summary or store logic is tool-specific, minimally generalize it so resource list/read history items remain distinguishable and replayable without introducing resource-specific viewers or taxonomy drift. Add or update focused tests to prove list, read, history summary, and replay continuity together.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts && cargo check --manifest-path src-tauri/Cargo.toml</automated>
  </verify>
  <done>Resource results flow through the existing generic response, history, and replay paths with no rich preview expansion and with clear operation-level diagnostic context.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| workbench UI → service layer | user-provided MCP base URL, headers, and manual resource URI are untrusted input |
| service layer → Rust runtime | typed resource operations cross into protocol execution and must remain explicit and bounded |
| runtime → MCP server | remote server responses and resource payload metadata are untrusted and may be malformed or misleading |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01 | T | `src-tauri/src/core/mcp_runtime.rs` | mitigate | Validate operation-specific required fields and only map explicit `resources/list` and `resources/read` methods; reject empty read URI before request emission. |
| T-08-02 | I | `src/components/response/ResponsePanel.vue` | mitigate | Reuse generic protocol/result rendering only, avoid executing or richly rendering returned resource content, and keep blob/text payloads as inert display data. |
| T-08-03 | R | `src/features/app-shell/state/app-shell-store.ts` | mitigate | Persist operation type, request snapshot, and protocol envelopes for history/replay so resource actions remain diagnosable after execution. |
| T-08-04 | D | `src/features/mcp-workbench/components/McpRequestPanel.vue` | accept | Large discovery payloads can make the selector verbose in this phase; accept minimal UX cost rather than add filtering subsystems outside scope. |
| T-08-05 | E | `src/features/app-shell/state/app-shell-services.ts` | mitigate | Keep single-server existing service seam and avoid adding prompts/roots/stdio/multi-server switching paths that would widen the execution surface beyond locked scope. |
</threat_model>

<verification>
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verification>

<success_criteria>
- `resources.list` and `resources.read` are explicit first-class MCP workbench operations.
- `resources.read` supports discovered selection plus manual URI fallback with warning-not-blocking behavior.
- Resource results remain in the generic response/history/replay pipeline with raw protocol visibility and no rich viewer expansion.
- All three Phase 08 requirements (`MCPR-01`, `MCPR-02`, `MCPR-03`) are fully covered without adding deferred scope.
</success_criteria>

<output>
After completion, create `.planning/phases/08-mcp-resources-workbench/08-SUMMARY.md`
</output>
