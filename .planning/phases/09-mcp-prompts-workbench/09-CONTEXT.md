# Phase 09: MCP Prompts Workbench - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只聚焦把 MCP `prompts` 的发现、选择、参数输入、执行结果查看，以及历史/回放所需上下文接入现有 MCP 工作台主链路。仍然沿用当前单 server MCP workbench 的交互哲学，不扩展到 roots、stdio、sampling、multi-server 或 rich prompt viewer。

同时，本阶段明确纳入一次较完整的 MCP 工作台布局收敛：减少 MCP 模式区与下方工作台的重复配置展示，释放 prompts / 参数输入的可用空间。但这次收敛仅服务于 MCP 工作台主链路，不演变为全应用级视觉重设计。

</domain>

<decisions>
## Implementation Decisions

### Prompt authoring flow
- **D-01:** `prompts` 继续采用显式 operation 驱动模式，与现有 `initialize`、`tools.list`、`tools.call`、`resources.list`、`resources.read` 保持一致。
- **D-02:** prompt authoring 的主路径为“先 `prompts.list`，再选择目标 prompt”，但必须保留手动输入 prompt 名作为兜底，避免 discovery 不可用时把链路硬阻断。
- **D-03:** 不采用“必须先 discovery 才能调用”的强依赖模式；手动 prompt 名输入在 discovery 缺失时仍然是有效路径。

### Prompt arguments behavior
- **D-04:** prompt 参数输入继续沿用“结构化表单 + 原始 JSON”双模式，保持与 `tools.call` 的一致交互模型，降低用户学习成本。
- **D-05:** 参数表单优先基于 discovery 返回的 prompt 参数定义生成；若定义缺失、不完整或不可信，仍允许用户退回原始 JSON 手动补全。
- **D-06:** 不把 prompt 参数交互降级为单一路径；复杂 prompt 仍需保留结构化与原始输入之间的切换自由。

### Result and replay behavior
- **D-07:** prompt 执行结果继续完全复用通用结果 / 协议请求 / 协议响应视图，不引入 prompt 专属 viewer。
- **D-08:** prompt 历史与 replay 必须保留 operation、prompt 名、参数输入快照及相关协议上下文，延续 tools/resources 的可诊断主链路。
- **D-09:** 如果需要展示 prompt 相关摘要，应优先复用现有通用摘要能力，而不是新增 prompt 专属结果面板。

### MCP workbench layout convergence
- **D-10:** 本阶段纳入 MCP 工作台布局收敛，而且不是最小修补，而是一次较完整的 MCP 工作台布局重构，用于去除 MCP 模式区与下方工作台的重复信息展示。
- **D-11:** 布局重构的目标是提高主操作区密度与聚焦度：传输方式、操作、端点等信息应只保留一个主要配置入口，不再在上方/下方重复出现。
- **D-12:** 尽管允许较完整的布局收敛，但范围仍限定在 MCP 工作台内部；不得顺势扩展为 HTTP 工作台通用改版、全局导航调整或设计系统重做。
- **D-13:** 这次布局收敛应兼容 prompts 接入后的更复杂输入场景，同时不破坏 tools/resources 已交付能力。

### Folded todo
- **D-14:** 已折入 pending todo `Refine MCP workbench layout`：本 phase 需要显式处理 MCP 模式区与下方 MCP 工作台之间的重复配置问题，而不是把该问题继续后延。

### Architecture boundary
- **D-15:** 延续既有分层：组件负责展示与事件转发，composable / state 负责请求编排与 discovery 状态，`src/lib/tauri-client.ts` 继续作为前端到 Rust 的唯一桥接边界，Rust 侧负责 DTO 映射、协议请求构造与执行。
- **D-16:** `prompts` 应复用现有 operation-driven 架构演进，不新增独立 prompts 子系统，不把大量 prompt 规则重新堆回 Vue 组件模板。

### the agent's Discretion
- `prompts.list` / `prompts.get` 的具体 operation 命名与内部 DTO 组织
- prompt 参数定义转表单模型的具体映射细节
- MCP 布局重构后各区块的具体视觉层级与信息压缩方式
- 历史摘要文案与 replay 入口的最小可行表达

</decisions>

<specifics>
## Specific Ideas

- prompt 工作流应延续 resources 的“discovery-first but not discovery-required”原则。
- 如果 prompt 参数较复杂，优先保证“能编辑、能回退到原始 JSON、能重放”，而不是追求花哨渲染。
- MCP 面板在接入 prompts 后会继续增重，因此这次应把重复信息真正收掉，而不是继续叠加新区域。
- 布局重构虽然允许更完整一些，但目的仍是让 MCP 调试更顺手，而不是做视觉 showcase。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/PROJECT.md` — 项目定位、本地优先与 MCP 扩展阶段约束
- `.planning/REQUIREMENTS.md` — `MCPP-01` 到 `MCPP-03` 的验收边界
- `.planning/ROADMAP.md` — Phase 09 的目标、成功标准与顺序依据
- `.planning/STATE.md` — 当前 milestone 与 phase 衔接状态

### Prior phase decisions
- `.planning/phases/05-mcp-workbench-hardening/05-SUMMARY.md` — MCP 工作台既有加固与交互哲学
- `.planning/phases/07-mcp-workbench-and-audit-closure/07-PLAN.md` — MCP 工作台后续收口方向
- `.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md` — resources phase 已锁定的 discovery-first、generic result、history/replay 原则
- `.planning/phases/08-mcp-resources-workbench/08-SUMMARY.md` — resources 已交付主链路与范围边界
- `.planning/phases/08-mcp-resources-workbench/08-UAT.md` — 已验收通过的 resources 行为基线

### Code and integration points
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — MCP authoring UI 当前主入口，prompts 与布局收敛的核心落点
- `src/features/app-shell/composables/useAppShellViewModel.ts` — MCP discovery / send / replay 编排入口
- `src/features/app-shell/state/app-shell-services.ts` — prompts discovery 与执行服务扩展边界
- `src/features/app-shell/state/app-shell-store.ts` — history / replay / artifact 投影边界
- `src/lib/request-workspace.ts` — MCP 请求与历史快照模型
- `src/lib/tauri-client.ts` — 前端到 Rust 的 MCP runtime bridge
- `src/types/request.ts` — prompts operation / artifact / snapshot 的类型边界
- `src-tauri/src/core/mcp_runtime.rs` — MCP 协议请求构造与执行主入口

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `McpRequestPanel.vue` 已具备 operation selector、discovery action、结构化 schema 表单与 raw JSON 双模式，适合直接扩成 prompts authoring，而不是新起一套 prompts UI。
- `useAppShellViewModel.ts` 已负责 tools/resources 的 discover + send + replay 编排，prompts 也应沿这条路径接入。
- `src/types/request.ts` 已形成 `McpOperationType` / `McpExecutionArtifact` / request snapshot 的统一模型，可继续增量扩展。
- `src-tauri/src/core/mcp_runtime.rs` 已有 initialize/tools/resources 请求构造和 header/session 处理逻辑，prompts 可沿同一 HTTP MCP runtime 进入。

### Established Patterns
- 现有 MCP 工作台已确定为 explicit operation-driven，而不是隐式智能面板；Phase 09 必须延续这一模式。
- tools 与 resources 都采用 discovery-first、manual fallback、generic result display 的策略；prompts 应尽量保持一致的用户心智。
- 结果展示、history、replay 当前走的是统一 artifact 管道，因此不应为 prompts 提前分叉出专属 viewer 或专属 replay 子系统。

### Integration Points
- Phase 09 很可能同时触达 MCP 请求面板、view model、service/store、TS contract 与 Rust runtime，是典型前后端并行的小范围扩展。
- 因为本 phase 同时纳入 MCP 布局收敛，`RequestPanel.vue`、`WorkbenchShell.vue`、相关 composable 也可能成为落点，但调整范围应局限在 MCP 工作台主链路。
- 已存在的 UI todo 与 prompts 接入强相关，可以作为本 phase 的一部分统一处理，而不是拆成无关后续任务。

</code_context>

<deferred>
## Deferred Ideas

- roots 作为会话级输入配置 —— Phase 10
- stdio transport、连接诊断与进程生命周期 —— Phase 11
- sampling、multi-server、rich prompt viewers、prompt 模板市场/收藏等新能力 —— future phases / backlog
- 若布局收敛需求溢出到 HTTP 工作台整体重构，应单独立 phase，而不是在 Phase 09 内继续扩 scope

</deferred>
