# Phase 11: MCP Stdio Transport - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只聚焦为当前单 server MCP workbench 补齐 `stdio` 传输能力，让开发者可以通过本地命令启动并调试一个 MCP server，并在失败时看到结构化、可定位的诊断信息。

本阶段不扩展到 multi-server 管理、sampling、全局 server 注册表、roots 自动发现、文件浏览器、远端托管 transport，或超出当前 MCP workbench 主链路之外的新配置体系。

</domain>

<decisions>
## Implementation Decisions

### Stdio server invocation shape
- **D-01:** `stdio` server 的连接目标采用 `command + args` 结构，作为第一版唯一必选输入形态。
- **D-02:** 第一版不做“单行命令字符串”和 shell 解析兼容，避免把 quoting / escaping / shell 差异带入主链路。

### Workbench placement
- **D-03:** `stdio` 配置继续放在当前 `MCP Workbench` 主配置区内，与现有 HTTP MCP 配置保持同一主链路入口。
- **D-04:** 不新增独立的 stdio 专属页面、弹窗或全局设置区；仍然保持 HTTP / MCP 主工作台的统一结构。

### Error visibility
- **D-05:** `stdio` 调试失败时，需要提供结构化错误信息，并明确标出失败阶段（如启动、握手、请求发送、响应解析、会话失效）。
- **D-06:** 除结构化错误外，还应保留可用于定位问题的原始 stderr 摘要，但不以“只展示原始 stderr”为主要交互。
- **D-07:** 错误信息要延续当前 workbench 的“可检查、可诊断”风格，而不是只给模糊失败提示。

### Session and process lifecycle
- **D-08:** `initialize` 成功后，当前 stdio MCP 会话应尽量复用已有进程 / 会话，而不是每次请求都重新启动进程。
- **D-09:** 当 stdio 会话失效、子进程退出或 transport 断开时，允许自动重建，但需要把“会话重建 / 已失效”作为可诊断状态暴露出来。
- **D-10:** 第一版以“initialize 后复用，失效后重建”为目标体验，而不是只做每次请求独立短生命周期进程。

### UX consistency with HTTP transport
- **D-11:** HTTP 与 stdio 两种 transport 在 MCP workbench 上应尽量保持一致的主链路体验：同样的 mode、operation、发送、检查、历史、回放入口。
- **D-12:** transport 差异主要体现在连接配置字段和错误诊断细节上，不改变用户对 MCP 工作台主流程的认知。

### the agent's Discretion
- transport 切换控件的具体排版与视觉细节
- stdio 参数输入区的字段顺序与提示文案微调
- stderr 摘要的截断策略与展示长度
- 会话重建时的具体提示文案与 badge 表达

</decisions>

<specifics>
## Specific Ideas

- `stdio` 第一版更偏“本地开发调试工具”而不是通用进程编排器，因此优先保证稳定、直接、容易理解。
- 用户已经明确希望 Phase 执行保持单一主工作台结构，不要把新的 MCP transport 再拆成平行子系统。
- 延续前序 Phase 的 MCP workbench 收敛方向：配置区紧凑、主操作区优先、协议检查与历史回放可复用。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` — 定义 Phase 11 goal、requirements 与 phase sequencing
- `.planning/REQUIREMENTS.md` — 定义 `MCPT-01`、`MCPT-02`、`MCPT-03`
- `.planning/STATE.md` — 当前 milestone 状态与分支策略

### Prior MCP workbench decisions
- `.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md` — MCP workbench 已收敛的布局与主链路决策
- `.planning/phases/10-mcp-roots-support/10-CONTEXT.md` — roots 作为会话输入的边界，以及对 stdio 留到 Phase 11 的明确切分
- `.planning/phases/10-mcp-roots-support/10-SUMMARY.md` — roots 已经接入 request / artifact / history / replay 主链路的结果

### Existing implementation anchors
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — 当前 MCP workbench 配置区与操作区结构
- `src/components/request/RequestPanel.vue` — HTTP / MCP 请求面板总入口与模式切换
- `src/features/app-shell/state/app-shell-services.ts` — MCP 请求主服务编排
- `src/features/app-shell/state/app-shell-store.ts` — 历史、回放、artifact 状态接续
- `src/types/request.ts` — MCP request / artifact / transport 类型合同
- `src-tauri/src/core/mcp_runtime.rs` — 当前 HTTP MCP runtime、session header 与错误分类处理锚点
- `src-tauri/src/models/request.rs` — 前后端 MCP DTO 边界

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/mcp-workbench/components/McpRequestPanel.vue`: 已有 MCP workbench 主配置区，可直接承接 `stdio` transport 字段与 transport 切换 UI。
- `src/features/app-shell/state/app-shell-services.ts`: 已有 MCP 请求发送编排，可扩展 transport 分支而不必新开独立调用链。
- `src-tauri/src/core/mcp_runtime.rs`: 已承接 HTTP MCP JSON-RPC 请求、session header、协议包与错误分类，是 stdio runtime 的自然收口点。
- `src/features/app-shell/state/app-shell-store.ts`: 已具备 artifact / history / replay continuity，可继续复用到 stdio。

### Established Patterns
- MCP workbench 已收敛为单一主区域，不再接受把 transport / operation / endpoint 重复拆成多个平行面板。
- MCP phases 一直沿用“请求定义 → runtime artifact → response inspection → history/replay”同一主链路；stdio 应沿用该模式。
- 错误表现已形成 `transport` / `session` / `initialize` / `tool-call` 等分类语义，stdio 应复用而不是另造一套孤立错误模型。

### Integration Points
- 前端需要在 MCP request 定义中扩展 stdio 连接输入合同。
- Rust runtime 需要新增 stdio transport 执行分支、进程生命周期管理与结构化错误映射。
- response / history / replay 需要继续沿用现有 artifact 通道承接 stdio 执行结果与错误证据。

</code_context>

<deferred>
## Deferred Ideas

- 多 MCP server 管理与切换 —— 后续 milestone
- MCP sampling —— v2 范围
- 全局 server 注册表 / server presets —— 暂不纳入本 phase
- 单行 shell 命令解析、复杂 quoting 兼容、环境变量模板系统 —— 如有必要单独评估
- roots 自动发现、文件浏览器、工作目录浏览 UI —— 不属于本 phase

</deferred>

---

*Phase: 11-mcp-stdio-transport*
*Context gathered: 2026-04-09*
