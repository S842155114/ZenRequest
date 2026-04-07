---
phase: 09
phase_name: MCP Prompts Workbench
plan_type: implementation
status: ready
source_context: .planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md
source_research: .planning/phases/09-mcp-prompts-workbench/09-RESEARCH.md
created: 2026-04-07
---

# Phase 09 Plan — MCP Prompts Workbench

## Goal

把 MCP `prompts` 的列表、参数输入和结果查看接入现有 MCP 工作台，同时完成一次受控但较完整的 MCP 工作台布局收敛，保证 prompts 与 tools/resources 共享一致的 discovery、执行、结果查看、历史与回放体验。

## Must Haves

- `MCPP-01`：开发者可以列出 prompts 并选择目标 prompt
- `MCPP-02`：开发者可以输入 prompt 参数并稳定查看执行结果
- `MCPP-03`：prompt 调试结果支持结构化查看、原始协议检查与历史回放

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 扩展 prompts operation/type/runtime 合同
2. 接入 prompts discovery 与参数编辑 UI
3. 收敛 MCP 工作台布局，去掉重复配置展示
4. 复用通用结果/历史/replay 链路并完成验证

<objective>
Add MCP prompts support to the existing single-server HTTP MCP workbench by extending the current operation-driven chain with explicit prompt discovery and prompt execution behavior, while also consolidating the MCP authoring layout so repeated transport/endpoint/operation configuration stops consuming the primary editing area.

Purpose: satisfy `MCPP-01` to `MCPP-03` without creating a new prompts subsystem or a prompt-specific result viewer.
Output: one executable MCP prompts workbench flow covering list, select, parameter editing, execution, generic result display, history continuity, replay continuity, and MCP layout convergence.
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
@.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md
@.planning/phases/09-mcp-prompts-workbench/09-RESEARCH.md
@.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md
@.planning/phases/08-mcp-resources-workbench/08-SUMMARY.md
@src/features/mcp-workbench/components/McpRequestPanel.vue
@src/features/app-shell/composables/useAppShellViewModel.ts
@src/features/app-shell/state/app-shell-services.ts
@src/features/app-shell/state/app-shell-store.ts
@src/lib/request-workspace.ts
@src/lib/tauri-client.ts
@src/types/request.ts
@src-tauri/src/core/mcp_runtime.rs

<interfaces>
From `src/types/request.ts`:
```ts
export type McpOperationType =
  | 'initialize'
  | 'tools.list'
  | 'tools.call'
  | 'resources.list'
  | 'resources.read'

export interface McpExecutionArtifact {
  transport: McpTransportKind
  operation: McpOperationType
  protocolRequest?: Record<string, unknown>
  protocolResponse?: Record<string, unknown>
  selectedTool?: McpToolSchemaSnapshot
  cachedTools?: McpToolSchemaSnapshot[]
  selectedResource?: McpResourceSnapshot
  cachedResources?: McpResourceSnapshot[]
  resourceContents?: McpResourceContentSnapshot[]
  sessionId?: string
  errorCategory?: 'transport' | 'session' | 'tool-call' | 'initialize' | 'tool_execution'
}
```

From `src/features/app-shell/state/app-shell-services.ts`:
```ts
export interface AppShellServices {
  discoverMcpTools: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<McpToolSchemaSnapshot[]>>
  discoverMcpResources: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<McpResourceSnapshot[]>>
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
  <name>Task 1: Extend MCP prompt contracts and runtime mapping</name>
  <files>src/types/request.ts, src/lib/request-workspace.ts, src/lib/tauri-client.ts, src/features/app-shell/state/app-shell-services.ts, src/features/app-shell/state/app-shell-services.test.ts, src/features/app-shell/state/app-shell-store.ts, src/features/app-shell/test/history.suite.ts, src-tauri/src/core/mcp_runtime.rs, src-tauri/src/models/request.rs</files>
  <behavior>
    - Test 1: `prompts.list` request payload maps to MCP prompt listing method and preserves protocol envelopes for later authoring reuse.
    - Test 2: prompt execution/get accepts a prompt name plus arguments, preserves protocol request/response, and allows manual prompt fallback when discovery is absent.
    - Test 3: history and replay preserve operation type, prompt name, prompt arguments, and latest prompt discovery evidence without replacing current editable discovery truth.
  </behavior>
  <action>Expand the existing MCP operation union with explicit prompt discovery and prompt execution operations. Add the minimum new TypeScript and Rust shapes required for discovered prompts, selected prompt context, prompt arguments, and replay evidence. Reuse the existing artifact-centered history/replay lineage instead of building a prompt-specific storage model. In `app-shell-services.ts`, add a dedicated prompt discovery seam if needed, following the tools/resources pattern. In `mcp_runtime.rs`, extend the existing operation switch to emit prompt list and prompt execution protocol requests over the same single-server HTTP MCP path, keeping manual prompt invocation valid when discovery metadata is unavailable.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/lib/request-workspace.test.ts && cargo check --manifest-path src-tauri/Cargo.toml</automated>
  </verify>
  <done>Prompt discovery and execution contracts exist across TS and Rust, with protocol mapping, artifact persistence, history continuity, and replay continuity aligned to the current MCP model.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add prompts discovery and parameter authoring UI</name>
  <files>src/features/mcp-workbench/components/McpRequestPanel.vue, src/features/mcp-workbench/components/McpRequestPanel.test.ts, src/features/app-shell/composables/useAppShellViewModel.ts, src/lib/i18n.ts</files>
  <behavior>
    - Test 1: the MCP operation selector exposes prompt discovery and prompt execution alongside existing operations.
    - Test 2: prompt execution prefers discovered prompt selection when available, but still allows manual prompt name entry when discovery is missing.
    - Test 3: prompt arguments support both structured editing and raw JSON fallback, with guidance but no hard discovery dependency.
  </behavior>
  <action>Extend `McpRequestPanel.vue` within the existing operation-driven layout to support prompt discovery and execution. Reuse the current discover-action pattern and the tools/resources interaction model, but introduce a prompt-specific argument conversion layer if prompt definitions differ from tool schemas. Keep the UI compact, generic, and aligned with prior MCP phases: discovered selection when available, manual fallback when not, structured/raw input switching, and no prompt-specialized result viewer. Update `useAppShellViewModel.ts` only where needed to wire the new discovery and request-editing actions through the existing handler paths.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts</automated>
  </verify>
  <done>The MCP request panel supports prompt discovery, selection, manual fallback, and structured/raw argument authoring in a way that matches existing MCP interaction patterns.</done>
</task>

<task type="auto">
  <name>Task 3: Consolidate MCP workbench layout around the primary authoring surface</name>
  <files>src/components/request/RequestPanel.vue, src/features/app-shell/components/WorkbenchShell.vue, src/features/mcp-workbench/components/McpRequestPanel.vue, src/features/request-workbench/composables/useRequestPanelState.ts</files>
  <action>Refactor the MCP authoring layout so transport, endpoint, and operation information no longer appears in duplicated locations between the MCP mode shell and the MCP workbench panel. Create one primary configuration surface, reclaim space for prompt arguments and operation-specific inputs, and keep the scope limited to the MCP workbench experience. Ensure the layout still supports tools/resources flows already delivered in prior phases and does not spill into a broader HTTP workbench redesign.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/stage-gate.test.ts</automated>
  </verify>
  <done>The MCP workbench presents a more compact, non-duplicative authoring layout, with prompts integrated cleanly and prior tools/resources flows preserved.</done>
</task>

<task type="auto">
  <name>Task 4: Reuse generic result display and validate the prompt flow end to end</name>
  <files>src/features/app-shell/state/app-shell-store.ts, src/features/app-shell/test/history.suite.ts, src/features/app-shell/state/app-shell-services.test.ts, src/features/mcp-workbench/components/McpRequestPanel.test.ts</files>
  <action>Keep prompt result presentation intentionally generic. Reuse the existing response panel protocol envelope display and structured result plumbing so prompt executions show raw protocol request/response plus generic JSON/text content only. If any summary or store logic is still tool/resource specific, minimally generalize it so prompt list/get history items remain distinguishable and replayable without introducing prompt-specific viewers. Add or update focused tests proving prompt discovery, execution, layout continuity, history summary, and replay continuity together.</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/stage-gate.test.ts && pnpm build && cargo check --manifest-path src-tauri/Cargo.toml</automated>
  </verify>
  <done>Prompt results flow through the existing generic response, history, and replay paths with clear prompt-level diagnostic context and no prompt-specific viewer expansion.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| MCP workbench UI → service layer | user-provided MCP base URL, headers, manual prompt name, and raw prompt arguments are untrusted input |
| service layer → Rust runtime | prompt operations and prompt arguments cross into protocol execution and must remain explicit and bounded |
| runtime → MCP server | remote prompt definitions and prompt results are untrusted and may be malformed, partial, or misleading |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-01 | T | `src-tauri/src/core/mcp_runtime.rs` | mitigate | Validate required prompt fields per operation and reject empty manual prompt names before protocol emission. |
| T-09-02 | I | response / result display path | mitigate | Reuse generic inert rendering only; avoid prompt-specific rendering logic that interprets returned content. |
| T-09-03 | R | history/replay store path | mitigate | Persist operation type, prompt name, prompt arguments, and protocol envelopes so prompt executions remain diagnosable. |
| T-09-04 | D | MCP authoring layout | accept | Layout consolidation may temporarily compress some low-priority metadata visibility; accept this to reclaim space for the main authoring flow. |
| T-09-05 | E | prompt argument conversion path | mitigate | Keep prompt argument conversion small and explicit; do not let prompt definitions mutate broader tool schema logic or widen execution semantics. |
</threat_model>

<verification>
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/stage-gate.test.ts`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verification>

<success_criteria>
- `prompts.list` and prompt execution are explicit first-class MCP workbench operations.
- Prompt authoring supports discovered prompt selection plus manual fallback and structured/raw parameter editing.
- MCP workbench layout removes redundant configuration presentation and gives more space to operation-specific authoring.
- Prompt results remain in the generic response/history/replay pipeline with raw protocol visibility and no prompt-specific viewer expansion.
- All three Phase 09 requirements (`MCPP-01`, `MCPP-02`, `MCPP-03`) are fully covered without adding roots/stdio/sampling/multi-server scope.
</success_criteria>

<output>
After completion, create `.planning/phases/09-mcp-prompts-workbench/09-SUMMARY.md`
</output>
