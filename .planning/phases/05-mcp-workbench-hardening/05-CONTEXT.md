# Phase 5: MCP Workbench Hardening - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段聚焦把现有 MCP 首版能力从“可基础调试”提升到“可诊断、可回放、可定位问题的工作台”。范围限于当前已存在的 MCP over HTTP 工作流、`initialize` / `tools.list` / `tools.call` 三类操作、schema 驱动参数输入、原始协议查看、历史回放与错误分层。`stdio`、resources/prompts/roots/sampling、多 server 编排、conformance suite 不在本阶段范围内。

</domain>

<decisions>
## Implementation Decisions

### Product and scope guardrails
- **D-01:** Phase 5 不是把 MCP 面铺大，而是把现有 HTTP MCP 主链路打磨到开发者可以日常排查问题的程度。
- **D-02:** 继续遵守“先做透一个开发者每天真会用的主链路，再谈全家桶”的产品原则；优先提升可观测性、回放与错误定位，而不是新增更多协议面。
- **D-03:** 当前 phase 只针对 MCP over HTTP；`stdio` 和协议扩展能力明确 deferred。

### Workbench behavior expectations
- **D-04:** `initialize`、`tools.list`、`tools.call` 三条链路必须都能作为独立可调试目标，而不是只有发送能力。
- **D-05:** MCP 历史与回放必须保留足够协议上下文，包括结构化摘要、raw request/response、所选工具与关键输入，而不是只保留一个普通响应 body。
- **D-06:** 工具参数输入必须以 schema form 为主、raw JSON 为兜底，并保持两种模式的结果语义一致。
- **D-07:** MCP 失败诊断至少要区分 transport、session、tool-call 三层语义；UI 不应继续把所有失败都压成同一种请求错误。

### Architecture boundaries
- **D-08:** 继续沿用现有边界：Vue 组件负责输入与展示，`app-shell` service/store 负责执行编排与历史落盘，`src/features/mcp-workbench/lib/` 负责 schema/参数纯逻辑，`src/lib/tauri-client.ts` 负责前后端 DTO 边界，Rust `mcp_runtime` 负责协议请求拼装与执行。
- **D-09:** 不把 MCP 诊断逻辑塞回多个组件。错误分类、历史摘要归一化、回放数据结构应优先收敛在 state/service 或 Rust DTO 边界。
- **D-10:** Phase 4 已建立的结构化错误与恢复建议能力应向 MCP 复用，而不是再造一套平行错误系统。

### Data and privacy boundaries
- **D-11:** 协议包、历史记录和错误详情要服务排错，但仍须遵守本地优先和 secret-safe 原则；不要在 raw 包或错误提示中无保护泄露鉴权信息。
- **D-12:** 回放应基于已有历史模型与 request snapshot 扩展，不新增独立“录制系统”或复杂会话存储层。

### the agent's Discretion
- schema form / raw JSON 的切换交互细节
- MCP 历史列表与响应面板中的信息层级与标签文案
- 错误分类 code 的具体命名与展示颗粒度
- 验证顺序与测试分层安排

</decisions>

<specifics>
## Specific Ideas

- README 和 PROJECT 都明确指出 MCP 已经有首版能力，但差距主要在“工作台化”而不是“有没有 send”。
- 现有 `McpRequestPanel.vue` 已支持 schema form + raw fallback，这说明 Phase 5 更适合补齐执行闭环、历史语义和错误分类，而不是重写编辑器。
- Rust `mcp_runtime.rs` 已能构建协议包并返回 `protocol_request` / `protocol_response` / `selected_tool` / `error_category`，说明当前已有可扩展骨架，Phase 5 应在此基础上把 session/tool-call 语义与回放数据补完整。
- 产品文档强调 ZenRequest 不是另一个 Postman，而是面向 AI / Agent 时代的 API 工作台；MCP 工作台是这个定位最直接的产品证明之一。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/PROJECT.md` — 产品定位与 MCP 首版能力边界
- `.planning/REQUIREMENTS.md` — `MCP-01`、`MCP-02`、`MCP-03`、`MCP-04` 验收边界
- `.planning/ROADMAP.md` — Phase 5 目标、成功标准与排序依据
- `.planning/STATE.md` — 当前阶段衔接状态
- `README.md` — 当前对外 MCP 首版能力声明
- `docs/产品定位与架构讨论.docx` — “面向 AI / Agent 时代、本地优先 API 工作台”的产品方向

### Prior phase decisions
- `.planning/phases/01-core-flow-hardening/01-CONTEXT.md` — 主链路稳定性与恢复边界
- `.planning/phases/02-workspace-assets/02-CONTEXT.md` — 历史、导入导出和回放的资产模型约束
- `.planning/phases/03-variables-and-secrets/03-CONTEXT.md` — secret-safe、鉴权和导出边界
- `.planning/phases/04-reliability-and-assertions/04-CONTEXT.md` — 结构化错误分类与 degraded/diagnostic 边界

### Codebase map
- `.planning/codebase/ARCHITECTURE.md` — 前后端分层与 bridge/runtime 责任边界
- `.planning/codebase/CONCERNS.md` — 历史、协议和执行失败风险点
- `.planning/codebase/TESTING.md` — 现有测试结构和推荐验证切入点
- `.planning/codebase/STRUCTURE.md` — MCP 与 app-shell 相关模块落位

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/mcp-workbench/components/McpRequestPanel.vue`：已有 `initialize` / `tools.list` / `tools.call` 编辑入口、schema form 与 raw JSON fallback。
- `src/features/mcp-workbench/lib/mcp-schema-form.ts`：已有 schema → structured form 的纯逻辑转换，可继续作为参数编辑主边界。
- `src/features/app-shell/state/app-shell-services.ts`：当前统一编排 HTTP/MCP send、history item 写入与错误处理，是补 MCP 历史/回放/错误分类的既有入口。
- `src-tauri/src/core/mcp_runtime.rs`：已负责 MCP over HTTP 执行、协议包拼装、raw protocol request/response 与基础 `error_category`。

### Established Patterns
- 当前项目已形成 component → composable/state → lib → Rust services 的清晰分层；Phase 5 应继续遵守。
- HTTP 与 MCP 共享一套 app-shell 请求发送通道，说明 Phase 5 最好通过扩展现有 request/history/response 模型来落地，而不是分叉一套工作台架构。
- Phase 4 已将结构化错误 advice 引入 service/store 边界，MCP 错误建模应尽量沿用这条路径。

### Integration Points
- Phase 5 很可能同时影响 `McpRequestPanel`、app-shell send/history 服务、response/history 展示、`tauri-client` DTO、Rust `mcp_runtime` 与测试用例。
- 需特别关注 MCP 历史回放与 `tools.list → tools.call` 工具缓存/选中 schema 的状态衔接。
- 需要在不破坏现有 HTTP 主链路的前提下扩展 request/history/response 类型中的 MCP artifact 语义。

</code_context>

<deferred>
## Deferred Ideas

- MCP over `stdio`
- resources / prompts / roots / sampling / notifications 等全协议面
- 多 server 管理与编排
- conformance test suite
- Agent workflow orchestration / 插件系统

</deferred>

---
*Phase: 05-mcp-workbench-hardening*
*Context gathered: 2026-04-06*
