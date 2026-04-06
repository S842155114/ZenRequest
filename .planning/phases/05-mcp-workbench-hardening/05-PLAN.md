---
phase: 05
phase_name: MCP Workbench Hardening
plan_type: implementation
status: ready
source_context: .planning/phases/05-mcp-workbench-hardening/05-CONTEXT.md
source_research: .planning/phases/05-mcp-workbench-hardening/05-RESEARCH.md
created: 2026-04-06
---

# Phase 5 Plan — MCP Workbench Hardening

## Goal

把现有 MCP 首版能力升级为真正可调试、可回放、可定位错误的工作台，同时严格限制在 MCP over HTTP 与 `initialize` / `tools.list` / `tools.call` 主链路内，不扩展到更大协议面。

## Must Haves

- `MCP-01`：开发者可以把 MCP Server 作为独立目标进行 `initialize`、`tools.list` 与 `tools.call` 调试
- `MCP-02`：开发者可以查看 MCP 调用的结构化结果、原始协议包、历史摘要与回放记录
- `MCP-03`：开发者可以在 schema 驱动表单与 raw JSON 之间切换，完成工具参数输入
- `MCP-04`：开发者在 MCP 调试失败时可以看到 transport、session 或 tool-call 层面的可定位错误上下文

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 收敛 MCP artifact、历史摘要与回放语义
2. 强化 schema form / raw JSON / cached tools 的一致性
3. 建立 MCP transport / session / tool-call 错误分类与诊断提示
4. 补齐 MCP 工作台 focused regression coverage

## Tasks

### Task 1 — MCP Artifact, History Summary, And Replay Hardening

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/features/app-shell/domain/history-replay.ts`
- `src/features/app-shell/domain/request-session.ts`
- `src/types/request.ts`
- `src-tauri/src/core/mcp_runtime.rs`
- `.planning/phases/05-mcp-workbench-hardening/05-CONTEXT.md`
- `.planning/phases/05-mcp-workbench-hardening/05-RESEARCH.md`
</read_first>

<action>
Expand the existing MCP request/result artifact model so one MCP execution can be reliably understood, stored, and replayed later. Do this by extending the current request/history/response model rather than creating a parallel MCP session subsystem.

Concrete implementation goals:
- preserve operation-specific metadata for `initialize`, `tools.list`, and `tools.call`
- keep raw protocol request/response, selected tool schema, and tool cache attached to the same artifact lineage used by history/replay
- improve MCP history summaries so the user can identify what happened without opening raw payloads
- ensure replay restores the relevant MCP operation, selected tool, arguments, and protocol context instead of degrading into a generic request tab
- keep MCP history compatible with existing request snapshot / response snapshot patterns
</action>

<acceptance_criteria>
- MCP history items contain enough summary context to distinguish operation type and outcome
- replay restores MCP request state with operation/tool/arguments fidelity
- raw protocol request/response remain available through existing response/history surfaces
- no parallel “MCP session store” or separate persistence layer is introduced
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/domain/history-replay.test.ts`
</verify>

<done>
- MCP 调试结果不再只是普通 response body，而是可回放、可识别的工作台资产
- 一次 MCP 调试可以在历史中看懂并可靠恢复
</done>

### Task 2 — Schema Form, Raw JSON, And Cached Tool Consistency

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/features/mcp-workbench/components/McpRequestPanel.vue`
- `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
- `src/features/mcp-workbench/lib/mcp-schema-form.ts`
- `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`
- `src/types/request.ts`
- `.planning/phases/05-mcp-workbench-hardening/05-RESEARCH.md`
</read_first>

<action>
Harden the MCP input authoring path so schema-driven forms, raw JSON fallback, and cached tool schemas remain consistent before send, after send, and when reopening/replaying MCP tabs.

Concrete implementation goals:
- keep schema-driven form as the preferred path whenever valid object schema exists
- ensure raw JSON and structured form produce the same final `arguments` semantics
- retain cached tools and selected schema across `tools.list -> tools.call` and replay flows
- prevent tool selection loss or invalid argument drift when protocol responses omit tool lists or when a replayed item depends on cached schema
- avoid rewriting the panel; build on the existing `mcp-schema-form` helper and current panel events
</action>

<acceptance_criteria>
- schema form and raw JSON modes round-trip into the same effective tool arguments
- cached tools survive the key MCP flows that currently depend on prior discovery
- replayed/opened MCP tabs keep usable tool selection behavior
- focused component/lib tests cover at least one schema mode and one raw fallback path
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/mcp-workbench/lib/mcp-schema-form.test.ts src/features/mcp-workbench/components/McpRequestPanel.test.ts`
</verify>

<done>
- MCP 参数输入双模式在发送、回放和恢复后仍保持一致心智
- tool cache 不再轻易丢失导致工作台退化
</done>

### Task 3 — Transport / Session / Tool-Call Error Taxonomy For MCP

<wave>2</wave>
<depends_on>Task 1, Task 2</depends_on>

<read_first>
- `src/lib/tauri-client.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/components/response/ResponsePanel.vue`
- `src-tauri/src/core/mcp_runtime.rs`
- `.planning/phases/04-reliability-and-assertions/04-CONTEXT.md`
- `.planning/phases/05-mcp-workbench-hardening/05-RESEARCH.md`
</read_first>

<action>
Build a structured MCP-specific failure taxonomy that extends the Phase 4 reliability baseline. The goal is to help users distinguish “transport could not reach the server”, “session/handshake state is invalid”, and “tool invocation failed even though transport worked”.

Concrete implementation goals:
- retain `runtimeClient` / service-layer centralization for normalized errors
- extend Rust MCP runtime and/or frontend mapping so failures can surface stable error layers: `transport`, `session`, `tool-call`
- map each layer to actionable UI-facing guidance without leaking secrets or noisy internals
- ensure MCP failures preserve structured payloads in response/history state just like Phase 4 HTTP reliability work
- avoid overfitting to one server implementation; focus on generic MCP debugging semantics
</action>

<acceptance_criteria>
- at least one transport failure and one protocol/session-or-tool failure are distinguished in tests
- MCP response state contains structured error metadata usable by UI and history/replay
- visible failure copy tells the user what failed and what to try next
- existing HTTP error handling remains unaffected
</acceptance_criteria>

<verify>
- `pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/components/response/ResponsePanel.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- MCP 失败不再只是“send_mcp_request failed”
- transport/session/tool-call 至少三层中的主要路径可被区分与解释
</done>

### Task 4 — Phase 5 Regression And Integration Guardrails

<wave>3</wave>
<depends_on>Task 1, Task 2, Task 3</depends_on>

<read_first>
- `.planning/codebase/TESTING.md`
- `src/features/mcp-workbench/**/*.test.ts`
- `src/features/app-shell/**/*.test.ts`
- `src/components/response/*.test.ts`
- `src-tauri/Cargo.toml`
- `.planning/phases/05-mcp-workbench-hardening/05-RESEARCH.md`
</read_first>

<action>
Add focused regression coverage proving that MCP workbench behavior survives the main workflows: operation authoring, tools discovery, tool execution, structured failure diagnosis, and replay.

Concrete validation scope:
- `initialize`, `tools.list`, `tools.call` each retain a stable executable representation
- schema/raw argument authoring remains consistent in at least one realistic tool-call path
- history/replay preserves MCP context needed for follow-up debugging
- transport vs protocol/tool failure diagnostics are distinguishable in automated tests
- validation remains scoped to Phase 5 hardening and does not expand to deferred MCP protocols
</action>

<acceptance_criteria>
- focused frontend tests cover MCP panel behavior, service orchestration, and replay/error mapping
- validation includes at least one MCP history/replay assertion and one MCP failure taxonomy assertion
- `pnpm test` exits 0 for affected suites
- `cargo check --manifest-path src-tauri/Cargo.toml` exits 0 if Rust runtime DTO/boundaries changed
</acceptance_criteria>

<verify>
- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- Phase 5 MCP 工作台关键链路有回归护栏
- 后续扩展 MCP 能力时不容易打碎当前主链路
</done>

<threat_model>
## Threat Model

### In-Scope Risks
- MCP 历史与回放只保留普通响应文本，导致问题无法复盘
- schema form / raw JSON / cached tools 状态漂移，导致工具调用参数不可信
- 所有 MCP 失败被压平成一种错误，用户无法区分 transport、session 或 tool 层问题
- raw protocol 包或错误消息泄露鉴权信息或其他敏感值

### Mitigations Required In Plan
- 单一 MCP artifact / history / replay 数据边界
- schema/raw 一致性测试与 cached tools 恢复护栏
- transport / session / tool-call 稳定错误 taxonomy
- secret-safe protocol / error display discipline

### Blockers
- 任何把 Phase 5 扩展到 `stdio` 或全协议面的大计划都应阻止
- 任何引入独立 MCP store / session manager / 插件式 runtime 的方案都应阻止
- 任何通过暴露敏感鉴权内容换取“更详细调试”的方案都应阻止
</threat_model>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task 1, Task 2 | 先打牢 artifact/history 与参数输入一致性，这两者是工作台主链路基础 |
| 2 | Task 3 | 错误分类依赖前一波更稳定的 MCP artifact 与执行语义 |
| 3 | Task 4 | 回归测试应验证最终工作台形态，而不是中间状态 |

## Verification Commands

- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes For Executor

- 优先“把当前 MCP 首版做透”，不要借机扩大协议范围。
- 继续沿用 component → composable/state → lib → Rust runtime 的边界，不新增平行架构。
- 每一个 MCP 失败都应回答两件事：失败发生在哪一层、用户下一步该做什么。
- MCP 工作台增强必须兼容本地优先与 secret-safe 原则，也要与 Phase 4 的结构化错误模型保持连续性。
