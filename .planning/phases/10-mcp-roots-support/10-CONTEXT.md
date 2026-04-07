# Phase 10: MCP Roots Support - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只聚焦把 MCP `roots` 作为当前单 server MCP 调试会话的一等输入配置接入现有工作台主链路。范围包括 roots 的会话级配置、请求实际携带、协议检查可见性，以及历史/回放所需的最小上下文保留。

本阶段不扩展到 `stdio`、`sampling`、多 server 管理、roots 自动发现、文件系统浏览器、或超出 MCP workbench 主链路的全局设置体系。

</domain>

<decisions>
## Implementation Decisions

### Roots ownership model
- **D-01:** Phase 10 采用“当前 MCP 调试会话维护一个 roots 列表”的模型，而不是“每次请求单独临时输入 roots”。
- **D-02:** roots 是会话级输入配置，应服务于当前 MCP workbench 会话中的相关请求，而不是只绑定某一次单独发送动作。
- **D-03:** roots 配置应允许在当前请求编辑态中增删改，并作为当前会话真相持续存在，直到用户再次修改。

### UI placement and density
- **D-04:** roots 配置放在现有 `MCP Workbench` 主区域内，作为独立配置块，而不是新开上层摘要面板或全局设置入口。
- **D-05:** roots 区块应保持“独立但可折叠/可压缩”的倾向，目标是避免继续挤压 operation / endpoint / send 的主命令区域。
- **D-06:** roots 的 UI 不应破坏 Phase 09 已完成的 MCP/HTTP 对齐与 MCP 面板收敛结果；roots 是新增配置块，不应把重复 chrome 再带回来。

### Roots data shape
- **D-07:** 第一版 roots 只支持最小必要字段：`uri` + 可选 `name`。
- **D-08:** 不在本 phase 提前暴露更完整或 speculative 的扩展字段；若协议后续需要更多字段，再由后续 phase 增量演进。
- **D-09:** roots 输入应保持显式、可编辑、易检查，不引入文件选择器、目录浏览器或本地路径推断等更重交互。

### Transmission and inspection semantics
- **D-10:** Phase 10 的核心验收是 roots 配置会随相关 MCP 请求实际传递给 server，而不是只停留在前端编辑态。
- **D-11:** roots 必须能在协议检查中被看到，确保开发者能够确认“这次请求到底带了哪些 roots”。
- **D-12:** history / replay 需要保留 roots 的最小必要上下文，保证后续诊断时能看出 roots 曾被配置并参与请求。
- **D-13:** 历史摘要只保留最小关键信息，不在摘要层塞入大块 roots 内容；详细内容仍以协议请求/响应与回放态为准。

### Workbench philosophy continuity
- **D-14:** roots phase 继续沿用现有 MCP workbench 的单 server、可检查、可回放、可诊断哲学，不新增独立 roots 子系统。
- **D-15:** roots 作为“会话输入配置”独立成 phase，是为了与 `tools/resources/prompts` 这些协议能力面解耦；实现时也应保持这种边界，不把 roots 混成新的 operation 家族。
- **D-16:** 组件负责展示与事件转发，composable / state 负责编排与持久态，`src/lib/tauri-client.ts` 继续作为前端到 Rust 的桥接边界，Rust 侧负责 DTO 映射与实际协议请求构造。

### Folded todo
- **D-17:** pending todo `Refine MCP workbench layout` 在本 phase 只作为约束参考：roots 新增 UI 必须尊重当前 MCP workbench 的收敛布局，不把已去掉的重复信息重新引回界面。

### the agent's Discretion
- roots 区块的具体文案、空状态、折叠方式与密度细节
- roots 行编辑器是 table-like 还是 stacked rows，只要不破坏主区域层级即可
- 历史摘要里 roots 的最小关键信息如何表达得更紧凑

</decisions>

<specifics>
## Specific Ideas

- roots 应被视为“当前会话给 MCP server 的上下文输入”，而不是又一种独立 discover/call/read 操作。
- 第一版优先保证“能配、能传、能查、能回放”，而不是追求更花哨的 roots 管理体验。
- 因为 Phase 09 刚完成布局收敛，本阶段应尽量复用当前 MCP 面板结构，把 roots 作为一个新增配置块平滑接入。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/PROJECT.md` — v1.1 目标、单 server MCP 扩展方向与本地优先约束
- `.planning/REQUIREMENTS.md` — `MCPROOT-01` / `MCPROOT-02` 的正式 requirement 边界
- `.planning/ROADMAP.md` — Phase 10 目标、成功标准与 sequencing rationale
- `.planning/STATE.md` — 当前 milestone、分支规则与 workflow 衔接状态

### Prior phase decisions
- `.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md` — discovery-first、generic result、history/replay 语义基线
- `.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md` — MCP 面板布局收敛、主区域信息密度与 workbench 边界约束
- `.planning/phases/09-mcp-prompts-workbench/09-SUMMARY.md` — prompts 已交付主链路与布局收口结果
- `.planning/phases/09-mcp-prompts-workbench/09-VERIFICATION.md` — Phase 09 当前验证通过的 MCP UI / flow 基线

### Code and integration points
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — roots 配置 UI 的首要落点
- `src/components/request/RequestPanel.vue` — MCP workbench 宿主接线边界
- `src/features/app-shell/composables/useAppShellViewModel.ts` — MCP 编辑态、发送、回放编排主入口
- `src/features/app-shell/state/app-shell-services.ts` — roots 进入发送请求与结果投影的 service seam
- `src/lib/request-workspace.ts` — 请求快照、历史与回放 clone 语义
- `src/lib/tauri-client.ts` — roots 从前端进入 Rust runtime 的桥接边界
- `src/types/request.ts` — MCP roots 输入、artifact、snapshot 的 TS 合同落点
- `src-tauri/src/core/mcp_runtime.rs` — MCP roots 实际协议请求构造与发送落点

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `McpRequestPanel.vue` 已经承载 MCP operation 切换、工作台布局收敛和多类 MCP 输入面板，是新增 roots 配置块的首选位置。
- `useAppShellViewModel.ts` 与 `app-shell-services.ts` 已承接 MCP 编辑态到发送态的编排，roots 应继续沿这条链路进入发送请求。
- `request-workspace.ts`、`types/request.ts`、`history` 相关路径已经形成 MCP snapshot / replay 的统一模型，roots 应在现有模型上增量扩展。
- `mcp_runtime.rs` 已处理 initialize/tools/resources/prompts 的请求构造，Phase 10 应在同一 single-server runtime 中增加 roots 透传，而不是开新执行通道。

### Established Patterns
- MCP workbench 当前不是 capability registry，也不是 settings hub；新增 roots 时应保持“主链路调试面板”的产品心智。
- 已有 phases 均强调 latest editing truth 与 replay evidence 分离；roots 也应保持这一点：当前编辑态可变，历史与回放是证据快照。
- MCP 结果展示继续优先复用通用协议/结果/历史面板，不为 roots 单独创建 viewer。

### Integration Points
- Phase 10 预计同时触达 MCP 面板、请求模型、发送 payload、Rust runtime 与历史/回放链路，但范围应局限在 roots 输入配置本身。
- roots 很可能不是独立 operation，而是挂在相关 MCP 请求的 session/context payload 上，因此 planner/researcher 需要优先确认当前 MCP runtime 与协议映射的最小改动路径。
- 现有 pending todo 指向 MCP workbench UI 收敛，因此任何 roots UI 设计都要先验证不会破坏现有主区域密度。

</code_context>

<deferred>
## Deferred Ideas

- stdio transport、连接诊断与本地进程生命周期 —— Phase 11
- sampling、多 server 管理、roots 自动发现或文件系统浏览器 —— future phases / backlog
- 若后续要把 roots 上升为更通用的 workspace/session settings 体系，应单独立 phase，而不是在 Phase 10 内扩 scope

</deferred>
