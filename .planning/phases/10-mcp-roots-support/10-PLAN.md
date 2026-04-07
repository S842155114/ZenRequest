---
phase: 10
phase_name: MCP Roots Support
plan_type: implementation
status: ready
source_context: .planning/phases/10-mcp-roots-support/10-CONTEXT.md
source_research: .planning/phases/10-mcp-roots-support/10-RESEARCH.md
created: 2026-04-07
---

# Phase 10 Plan — MCP Roots Support

## Goal

把 MCP `roots` 作为当前单 server MCP 调试会话的一等输入配置接入现有工作台主链路，保证开发者能配置 roots、server 能实际拉取 roots、协议检查能看到 roots 交互，并保留最小的历史与回放诊断上下文。

## Must Haves

- `MCPROOT-01`：开发者可以为当前 MCP 调试会话配置 roots 输入
- `MCPROOT-02`：开发者可以在 roots 相关请求中看到 roots 配置已实际传递给 MCP server

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 扩展 roots 会话合同与 initialize capability/runtime 语义
2. 在 MCP Workbench 中接入会话级 roots 配置 UI
3. 响应 `roots/list` 并把 request/response 纳入 inspection
4. 复用 history / replay 链路并完成验证

<objective>
Add minimal MCP roots support to the existing single-server MCP workbench by treating roots as client-side session context rather than a new operation family.

Purpose: satisfy `MCPROOT-01` and `MCPROOT-02` while preserving the existing workbench philosophy: compact authoring, explicit inspectability, stable history/replay continuity, and no new subsystem beyond the current request/service/runtime chain.
Output: one executable MCP roots flow covering session-level roots editing, initialize capability declaration, runtime handling of `roots/list`, protocol inspection, and replay continuity in the current MCP over HTTP path.
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
@.planning/phases/10-mcp-roots-support/10-CONTEXT.md
@.planning/phases/10-mcp-roots-support/10-RESEARCH.md
@.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md
@.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md
@.planning/phases/09-mcp-prompts-workbench/09-SUMMARY.md
@src/features/mcp-workbench/components/McpRequestPanel.vue
@src/components/request/RequestPanel.vue
@src/features/app-shell/composables/useAppShellViewModel.ts
@src/features/app-shell/state/app-shell-services.ts
@src/features/app-shell/state/app-shell-store.ts
@src/lib/request-workspace.ts
@src/lib/tauri-client.ts
@src/types/request.ts
@src-tauri/src/core/mcp_runtime.rs
@src-tauri/src/models/request.rs

<interfaces>
From `src/types/request.ts`:
```ts
export interface McpRequestDefinition {
  connection: McpConnectionInput
  operation: McpOperationInput
}

export interface McpExecutionArtifact {
  transport: McpTransportKind
  operation: McpOperationType
  protocolRequest?: Record<string, unknown>
  protocolResponse?: Record<string, unknown>
  sessionId?: string
}
```

From `src-tauri/src/core/mcp_runtime.rs`:
```rust
fn build_protocol_request(payload: &SendMcpRequestPayloadDto) -> Result<Value, AppError>
pub async fn execute_mcp_request(payload: &SendMcpRequestPayloadDto) -> Result<SendMcpRequestResultDto, AppError>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend roots session contracts and initialize/runtime semantics</name>
  <files>src/types/request.ts, src/lib/request-workspace.ts, src/lib/tauri-client.ts, src/lib/tauri-client.test.ts, src/features/app-shell/state/app-shell-services.ts, src/features/app-shell/state/app-shell-services.test.ts, src/features/app-shell/state/app-shell-store.ts, src/features/app-shell/test/history.suite.ts, src-tauri/src/core/mcp_runtime.rs, src-tauri/src/models/request.rs, src-tauri/src/storage/repositories/history_repo.rs</files>
  <behavior>
    - Test 1: MCP request/editor state can carry a session-level roots list with minimal fields (`uri`, optional `name`) without introducing a new operation type.
    - Test 2: `initialize` protocol requests declare roots capability so the server can discover that the client supports roots.
    - Test 3: history and replay preserve roots snapshot context without replacing the current editable roots list outside replay evidence.
  </behavior>
  <action>Extend the existing MCP request definition, request snapshot, artifact, and bridge DTOs with the minimum roots model needed for this phase: a session-level list of roots with `uri` and optional `name`. Keep roots as session/context payload, not as a new MCP operation family. Update the runtime request mapping so `initialize` automatically declares roots capability, while the current request/history lineage continues to carry roots editing truth and replay evidence.</action>
  <verify>
    <automated>pnpm exec vitest run src/lib/tauri-client.test.ts src/features/app-shell/test/history.suite.ts src/features/app-shell/state/app-shell-services.test.ts && cargo check --manifest-path src-tauri/Cargo.toml</automated>
  </verify>
  <done>The MCP request model, initialize capability handshake, and replay/history lineage all understand session-level roots data without adding a new operation family.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add session-level roots authoring UI to the MCP workbench</name>
  <files>src/features/mcp-workbench/components/McpRequestPanel.vue, src/features/mcp-workbench/components/McpRequestPanel.test.ts, src/components/request/RequestPanel.vue, src/lib/i18n.ts</files>
  <behavior>
    - Test 1: the MCP panel exposes a roots configuration block within the main workbench area without reintroducing duplicate summary chrome.
    - Test 2: users can add, edit, and remove multiple roots rows, with each row supporting `uri` and optional `name`.
    - Test 3: the roots block stays visually secondary to the main command bar and does not displace the send/operation/endpoint row from the layout settled in Phase 09.
  </behavior>
  <action>Add a compact roots configuration block to `McpRequestPanel.vue`, scoped to MCP mode and aligned with the Phase 09 layout convergence. Keep the block in the main MCP workbench area, but visually secondary and compressible. Support explicit editing of a roots list with minimal fields only (`uri`, optional `name`) and do not add a file picker, local path browser, auto-discovery, or global settings entry. Reuse existing component and styling patterns so HTTP/MCP alignment remains intact.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/components/request/RequestPanel.test.ts</automated>
  </verify>
  <done>The MCP workbench provides a compact session-level roots editor that fits the existing layout and supports add/edit/remove flows.</done>
</task>

<task type="auto">
  <name>Task 3: Respond to `roots/list` and expose roots traffic in protocol inspection</name>
  <files>src/features/app-shell/composables/useAppShellViewModel.ts, src/features/app-shell/state/app-shell-services.ts, src/components/response/ResponsePanel.vue, src/features/app-shell/state/app-shell-store.ts, src/features/app-shell/types.ts, src-tauri/src/core/mcp_runtime.rs</files>
  <action>Implement the runtime path that answers server-initiated `roots/list` requests using the currently configured roots, and route the resulting protocol request/response envelopes into the existing MCP artifact inspection path. Reuse the generic protocol request/response display and existing MCP artifact plumbing so developers can confirm which roots were returned, without introducing a roots-specific result viewer or a user-triggered `roots.list` operation.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/stage-gate.test.ts && cargo check --manifest-path src-tauri/Cargo.toml</automated>
  </verify>
  <done>When the server asks for roots, the runtime returns the configured roots and the developer can inspect that exchange through the existing protocol inspection path.</done>
</task>

<task type="auto">
  <name>Task 4: Preserve roots continuity in history/replay and validate the phase end to end</name>
  <files>src/lib/request-workspace.ts, src/features/app-shell/test/history.suite.ts, src/features/mcp-workbench/components/McpRequestPanel.test.ts, src/features/app-shell/state/app-shell-services.test.ts, src/stage-gate.test.ts</files>
  <action>Keep roots continuity aligned with prior MCP phases: current editing state remains mutable, while history and replay persist the executed roots snapshot and any observed `roots/list` inspection evidence. Add or update focused tests proving roots configuration, initialize capability declaration, `roots/list` visibility, history continuity, and replay continuity together. Keep summary-level roots information intentionally minimal, with detail living in protocol artifacts and replay state rather than a new roots summary surface.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/lib/request-workspace.test.ts src/lib/tauri-client.test.ts src/stage-gate.test.ts && cargo check --manifest-path src-tauri/Cargo.toml</automated>
  </verify>
  <done>Roots flow through the existing history, replay, and diagnostic chain with minimal but sufficient visibility, satisfying both Phase 10 requirements without widening scope.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| MCP workbench UI → service layer | user-provided roots `uri` and optional `name` are untrusted input |
| service layer → Rust runtime | roots cross the front-end/runtime boundary and must remain explicit, minimal, and serializable |
| runtime → MCP server | transmitted roots are part of protocol context and may influence server behavior, so they must stay inspectable and attributable |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-01 | T | request/runtime payload mapping | mitigate | Keep roots schema minimal and explicit (`uri`, optional `name`) and reject empty required values before request emission. |
| T-10-02 | I | protocol/result display path | mitigate | Reuse inert generic protocol inspection only; show transmitted roots through raw protocol artifacts rather than a richer interpreted viewer. |
| T-10-03 | R | history/replay lineage | mitigate | Persist executed roots snapshot and observed roots inspection evidence so later diagnosis can prove what roots were configured and returned. |
| T-10-04 | D | MCP workbench layout | accept | Adding a roots block increases MCP panel density somewhat; accept this within the existing converged layout rather than create a separate settings subsystem. |
| T-10-05 | E | architecture scope | mitigate | Keep roots as session input in the existing MCP workbench chain and avoid promoting it into multi-server settings, file browsing, or a new operation family. |
</threat_model>

<verification>
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/components/request/RequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/lib/request-workspace.test.ts src/lib/tauri-client.test.ts src/stage-gate.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verification>

<success_criteria>
- MCP workbench exposes a session-level roots editor with add/edit/remove support.
- `initialize` declares roots capability and the runtime can answer `roots/list` using configured roots.
- Roots traffic is visible in protocol inspection.
- History and replay preserve executed roots context with minimal but sufficient diagnostic fidelity.
- Both Phase 10 requirements (`MCPROOT-01`, `MCPROOT-02`) are fully covered without adding stdio/sampling/multi-server/file-browser scope.
</success_criteria>

<output>
After completion, create `.planning/phases/10-mcp-roots-support/10-SUMMARY.md`
</output>
