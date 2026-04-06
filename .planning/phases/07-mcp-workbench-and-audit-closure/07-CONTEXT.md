# Phase 7: MCP Workbench And Audit Closure - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段聚焦收敛 MCP tools discovery 主链路、schema 生命周期与错误 taxonomy 的最终产品语义，并补齐 Phase 5 缺失的归档工件，让 MCP 工作台通过 v1 milestone audit。范围限于 MCP over HTTP、`initialize` / `tools.list` / `tools.call` 三类操作、现有 schema form / raw JSON 工作流、错误分类一致性与审计证据补齐；`stdio`、更多协议面、多 server 编排与 conformance suite 均不在本阶段范围内。

</domain>

<decisions>
## Implementation Decisions

### Discovery 主链路
- **D-01:** Phase 7 采用**显式发现优先**；tools discovery 必须是用户可见、可重复触发的明确动作，而不是隐式副作用主导。
- **D-02:** `tools.list` 不是隐藏实现细节，而是 MCP 工作台主链路的一部分，用户应能明确感知“已发现 / 需刷新”的状态。
- **D-03:** `tools.call` 在未完成 discovery 时采用**软阻断**：允许手填工具名并尝试发送，但界面必须明确提示“建议先发现工具”，不能暗示当前 schema/工具列表一定可靠。

### Schema 生命周期
- **D-04:** 当前编辑态的 schema 生命周期以**最新一次成功的 discovery** 为准；`tools.list` 成功后，当前编辑态优先使用最新发现的工具 schema。
- **D-05:** 历史快照、回放记录或请求内携带的旧 schema 主要用于**回放复现与参考**，不是当前编辑态的最终真相来源。
- **D-06:** 当历史回放中的旧 schema 与当前最新 discovery 不一致时，当前编辑态**静默切换到最新 schema**；旧 schema 仍作为历史证据保留，但不优先支配当前编辑行为。

### 错误 taxonomy 收口
- **D-07:** 错误分类以 **service 层归一化结果** 为唯一产品语义来源；runtime 提供原始分类，service 负责归一化，UI 只展示不再自行改名。
- **D-08:** Phase 7 的 taxonomy 收口目标仍是 `transport` / `session` / `tool-call` 等用户可理解类别一致贯通，不再允许 runtime / service / UI 各自漂移。

### Scope and archive guardrails
- **D-09:** Phase 7 是 MCP 审计收口 phase，不是新增 MCP 能力 phase；只解决 milestone audit 已点名的 discovery continuity、schema lifecycle、taxonomy drift 与 Phase 5 工件缺失。
- **D-10:** Phase 5 缺失的 `SUMMARY.md` / `VERIFICATION.md` 必须基于已 ship 的代码、测试与用户验证回填，不得虚构未交付能力。

### the agent's Discretion
- discovery 按钮/状态提示在界面中的具体位置与文案
- “建议先发现工具”的具体提示样式、强度与展示时机
- schema 刷新后的局部交互细节与测试分层顺序
- service 层内部错误归一化实现细节与 DTO 映射方式

</decisions>

<specifics>
## Specific Ideas

- 本阶段的核心不是“再扩 MCP 面”，而是让现有 `initialize → tools.list → tools.call` 主链路在产品语义上闭环、在审计上可证明。
- 当前代码已经有 `discoverMcpTools` seam 和请求快照里的 schema/selectedTool 信息，所以更适合做“主链路收口”而不是重做一套 MCP 架构。
- discovery 应该像工作台里的一个明确步骤，而不是只在代码内部存在。
- 当前编辑态优先相信“刚发现到的真实工具定义”，历史快照更多服务回放，不应反向污染当前编辑语义。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and milestone scope
- `.planning/PROJECT.md` — 产品定位、本地优先原则与 MCP 工作台的长期方向
- `.planning/REQUIREMENTS.md` — `MCP-01`、`MCP-03`、`MCP-04` 的当前验收边界
- `.planning/ROADMAP.md` — Phase 7 的目标、成功标准与 phase 边界
- `.planning/STATE.md` — 当前 Phase 6 已完成、Phase 7 待规划的流程状态
- `.planning/v1.0-MILESTONE-AUDIT.md` — Phase 7 要收口的具体审计缺口与证据要求

### Prior MCP context and shipped behavior
- `.planning/phases/05-mcp-workbench-hardening/05-CONTEXT.md` — Phase 5 已锁定的 MCP 产品/架构决策
- `.planning/phases/05-mcp-workbench-hardening/05-PLAN.md` — Phase 5 原计划范围，便于区分已交付与本 phase gap closure
- `.planning/phases/05-mcp-workbench-hardening/05-GAPS-PLAN.md` — Phase 5 gap 视角与剩余问题
- `.planning/phases/05-mcp-workbench-hardening/05-UAT.md` — 已验证 MCP 主链路与用户测试证据

### Code seams
- `src/lib/tauri-client.ts` — `discoverMcpTools` / `sendMcpRequest` runtime seam 与 DTO 边界
- `src/features/app-shell/state/app-shell-services.ts` — MCP discovery/send/history/error 的 service 编排入口
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — tools.list/tools.call 编辑、schema form/raw JSON 切换与工具选择 UI
- `src/lib/request-workspace.ts` — MCP request/history snapshot 的 schema 与 selectedTool 复制语义
- `src/types/request.ts` — MCP request/response/history/error category 类型定义
- `src-tauri/src/core/mcp_runtime.rs` — runtime 侧协议执行与原始错误分类来源

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/tauri-client.ts` 已暴露 `discoverMcpTools`，说明显式 discovery seam 已存在，Phase 7 更像把它接回主链路而不是新建能力。
- `src/features/mcp-workbench/components/McpRequestPanel.vue` 已经根据 schema / selected tool 构建表单，是 schema 生命周期收口的直接 UI 落点。
- `src/features/app-shell/state/app-shell-services.ts` 已承担 runtime 结果归一化职责，适合作为 taxonomy 唯一产品语义来源。
- `src/lib/request-workspace.ts` 已复制 `selectedTool` 与 `schema` 快照，是区分“历史证据”与“当前编辑真相”的关键边界。

### Established Patterns
- 当前项目已形成 component → state/service → lib/runtime DTO → Rust runtime 的清晰分层；Phase 7 应继续在这些边界内收口 MCP 语义。
- 历史与回放模型已经存在，适合补“当前编辑态 vs 历史快照”的语义优先级，而不是新增独立缓存系统。
- Phase 6 已把错误 taxonomy 的一部分 UI 标题收拢到 `session` / `tool-call`，Phase 7 需要把它提升为三层一致规则。

### Integration Points
- 需要联动 `McpRequestPanel`、app-shell services、request/history snapshot、`tauri-client` 和 Rust runtime，才能真正关闭 MCP-01 / MCP-03 / MCP-04。
- 需补齐 Phase 5 的 `SUMMARY.md` / `VERIFICATION.md`，让 milestone audit 可以把已验证行为与本 phase 收口证据连起来。
- 不能破坏现有用户已验证通过的 initialize/tools.list/tools.call 主链路，应以最小改动强化“显式 discovery + 最新 schema + service 归一化 taxonomy”。

</code_context>

<deferred>
## Deferred Ideas

- MCP over `stdio`
- resources / prompts / roots / sampling / notifications 等更完整协议面
- 多 server 管理与编排
- conformance test suite
- 更复杂的 schema 版本对比或显式 schema diff UI

</deferred>

---
*Phase: 07-mcp-workbench-and-audit-closure*
*Context gathered: 2026-04-06*
