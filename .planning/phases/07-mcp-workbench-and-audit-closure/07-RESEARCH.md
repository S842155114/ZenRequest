# Phase 7 Research: MCP Workbench And Audit Closure

**Gathered:** 2026-04-06
**Status:** Ready for planning

## Research Question

要把 Phase 7 计划好，最需要先知道什么，才能稳定关闭 `MCP-01`、`MCP-03`、`MCP-04`，并补齐 MCP milestone audit 缺口？

## Executive Summary

Phase 7 不是“继续做 MCP 功能”，而是一次 **MCP 工作台主链路收口 + 审计归档闭环** 的阶段。当前系统已经具备 `initialize` / `tools.list` / `tools.call`、schema form / raw JSON、错误分层、历史快照与回放等基础能力；真正没有关闭的是三件事：

- **显式 discovery lifecycle 没有被产品化表达清楚**：`discoverMcpTools` seam 已存在，但在真实 app flow 里仍显得弱，审计认为 `tools.list` 作为显式动作和状态连续性不足。
- **当前编辑态的 schema truth source 不够清晰**：历史 snapshot、cached tools、selected tool、请求内 schema 都存在，但没有彻底把“最新一次成功 discovery”确立为当前 authoring 的唯一优先真相。
- **错误 taxonomy 仍有 vocabulary drift**：runtime、service、UI、历史数据兼容值之间仍混有 `protocol` / `initialize` / `tool_execution` 等 legacy 分类，尚未完全收敛到产品可感知的统一术语。

因此，Phase 7 的规划重点不应是重做 MCP 架构，而应是：

1. 明确 discovery 的显式步骤、状态模型、失效/刷新规则。
2. 明确 schema lifecycle 的 ownership：当前编辑态永远优先用最新 discovery，历史 schema 只作为回放证据。
3. 明确 canonical taxonomy 与 legacy category 的兼容/归一化策略，并锁定 service 为唯一产品语义来源。
4. 同步规划代码验证和文档归档，补齐 Phase 5 缺失的 `SUMMARY.md` / `VERIFICATION.md`。

如果只修代码，不补 Phase 5 工件，audit 不会真正关闭；如果只补文档，不收口 discovery/schema/taxonomy，requirement 也不会真正关闭。

## 1. Scope Reality

### 1.1 本阶段实际边界

根据 `.planning/phases/07-mcp-workbench-and-audit-closure/07-CONTEXT.md`：

- 范围限定在 MCP over HTTP。
- 仅聚焦 `initialize` / `tools.list` / `tools.call`。
- 仅聚焦现有 schema form / raw JSON 工作流。
- 聚焦 discovery continuity、schema lifecycle、error taxonomy、审计工件补齐。
- 明确排除 `stdio`、更多协议面、多 server 编排、conformance suite。

### 1.2 计划时最重要的 guardrail

这是一个 **closure phase**，不是能力扩张 phase。

因此计划里不应混入：

- MCP over `stdio`
- resources / prompts / roots / sampling
- 多 server 管理
- schema diff UI
- 更大的 MCP runtime 重构
- 为未来抽象做预埋层

**Planning implication:** 任何偏离 discovery、schema、taxonomy、artifact closure 的任务都会稀释 phase 成果，增加审计失败概率。

## 2. Audit Gap Breakdown

### 2.1 `MCP-01` 目前为什么是 partial

来自 `.planning/REQUIREMENTS.md`：

- `MCP-01`: 开发者可以把 MCP Server 作为独立目标进行 `initialize`、`tools.list` 与 `tools.call` 调试。

来自 `.planning/v1.0-MILESTONE-AUDIT.md`：

- 用户 UAT 已证明主链路能跑通。
- 但 audit 指出 `discoverMcpTools` seam 在非测试 wiring 中显得 weak/orphaned。
- flow 级问题是 “Explicit MCP tools discovery lifecycle” 仍是 `partial`。

**结论：** `MCP-01` 的 gap 不是协议请求发不出去，而是产品没有把 discovery 作为明确步骤表达出来，也没有让用户稳定感知“已发现 / 需刷新 / 未发现”的状态。

### 2.2 `MCP-03` 目前为什么是 partial

来自 `.planning/REQUIREMENTS.md`：

- `MCP-03`: 开发者可以在 schema 驱动表单与 raw JSON 之间切换，完成工具参数输入。

来自 audit：

- schema/raw authoring 已在测试和 UAT 中成立。
- 但 integration review 认为 authoring 仍偏依赖 cached tool metadata，而不是显式 discovery lifecycle。

**结论：** `MCP-03` 的 gap 不是表单不能用，而是表单当前依赖的 schema 语义不够可信，尤其在 history replay、cached tools 和最新 discovery 之间没有完全收口。

### 2.3 `MCP-04` 目前为什么是 partial

来自 `.planning/REQUIREMENTS.md`：

- `MCP-04`: 开发者在 MCP 调试失败时可以看到 transport、session 或 tool-call 层面的可定位错误上下文。

来自 audit：

- runtime 和 service 已基本支持 session/tool-call 分类。
- 但 UI-facing vocabulary 仍有 legacy labels，taxonomy drift 仍存在。

**结论：** `MCP-04` 的 gap 不是没有错误处理，而是产品层对错误类别还不够单一、稳定、可审计。

### 2.4 Phase 5 artifact gap 是显式交付物缺口

audit 还明确标记：

- `PHASE-ARTIFACT-05` orphaned
- 缺 `05-SUMMARY.md`
- 缺 `05-VERIFICATION.md`

**结论：** Phase 7 规划里必须把“回填 Phase 5 归档工件”作为明确 workstream，而不是收尾时顺便补。

## 3. What Already Exists In Code

### 3.1 显式 discovery seam 已存在

在 `src/lib/tauri-client.ts` 中，runtime adapter 已暴露：

- `discoverMcpTools(payload: SendMcpRequestPayloadDto)`

在 `src/features/app-shell/state/app-shell-services.ts` 中，service 已有：

- `discoverMcpTools: async ({ payload }) => { ... }`

这说明 discovery 不是缺 backend 能力，而是缺少：

- 更明确的 app-shell wiring
- 更明确的状态语义
- 更明确的用户入口和提示

**Planning implication:** Phase 7 应以“接回主链路”为主，而非新建 discovery 基础设施。

### 3.2 服务层已具备 taxonomy normalization 入口

`src/features/app-shell/state/app-shell-services.ts` 已存在：

- `classifyMcpErrorLayer(...)`
- `buildMcpErrorAdvice(...)`
- `normalizeMcpErrorCategory(...)`
- `formatStructuredMcpErrorMessage(...)`

这与 `07-CONTEXT.md` 的决策完全一致：

- runtime 提供原始分类或原始错误
- service 负责归一化
- UI 只消费 service 产物

**Planning implication:** taxonomy closure 应围绕 service 层收口，而不是在 UI 再做一层重命名。

### 3.3 schema / selectedTool / cachedTools 的快照结构已完整

从 `src/types/request.ts` 和 `src/lib/request-workspace.ts` 可见：

- `McpToolCallInput.schema?: McpToolSchemaSnapshot`
- `McpExecutionArtifact.selectedTool?: McpToolSchemaSnapshot`
- `McpExecutionArtifact.cachedTools?: McpToolSchemaSnapshot[]`
- `cloneMcpExecutionArtifact(...)`
- `cloneMcpRequestDefinition(...)`

这些结构已经把 schema 的三个角色区分开：

- 当前请求编辑态所带 schema
- 当前执行结果里的 selected tool
- 历史 artifacts/cached tools 里的证据性 schema

**Planning implication:** Phase 7 的关键不在于新增 schema 存储，而在于定义这些来源的优先级。

### 3.4 MCP authoring UI 已具备主体能力

`src/features/mcp-workbench/components/McpRequestPanel.vue` 已有：

- `tools.call` 参数编辑区
- schema/raw mode 切换
- structured field 渲染
- raw JSON fallback
- schema 名称显示

**Planning implication:** 不需要重做 schema form 引擎；需要明确它在 discovery stale / missing / refreshed 时如何工作。

## 4. Existing Semantics That Still Need Closure

### 4.1 discovery 还没有形成“用户可见的生命周期”

`07-CONTEXT.md` 已明确：

- discovery 必须显式、可重复触发
- `tools.list` 是 MCP 工作台主链路的一部分
- 未 discovery 的 `tools.call` 只能软阻断，不可暗示 schema 一定可靠

当前 audit 说明这个决策还没有完全落到产品体验上。

**To plan well, you need to define:**

- discovery 状态模型有哪些状态
- discovery 入口放在哪里
- 什么时候显示“建议先发现工具”
- 哪些配置变化会把 discovery 标成“需刷新”

### 4.2 schema lifecycle 的 truth source 还没有完全定死

`07-CONTEXT.md` 的 D-04 / D-05 / D-06 已给出 Phase 7 的目标语义：

- 当前编辑态以最新成功 discovery 为准
- 历史 snapshot / replay schema 仅供回放和参考
- replay 旧 schema 时，当前编辑态静默切到最新 schema

当前代码虽已保存 schema 快照，但这条优先级规则还需要进一步产品化。

**To plan well, you need to define:**

- 最新 discovery 结果存放在哪里
- tab 当前 schema 怎样从 discovered tools 派生
- replay / history restore 时怎样避免旧 schema 反向污染当前编辑态
- schema refresh 后 structured/raw 输入内容如何迁移或降级

### 4.3 taxonomy 仍处在兼容态，而非闭环态

`src/types/request.ts` 当前的 `errorCategory` 仍允许：

- `transport`
- `session`
- `protocol`
- `tool-call`
- `initialize`
- `tool_execution`

`app-shell-services.ts` 中又有 `normalizeMcpErrorCategory(...)` 将部分旧值映射到新值。

这说明当前系统仍处于“旧值兼容中”的过渡态。

**To plan well, you need to define:**

- canonical taxonomy 是否最终只保留 `transport` / `session` / `tool-call`
- `protocol` 是否保留为内部兼容值还是彻底退出产品层
- 历史记录中的旧值由谁 normalize
- UI 是否彻底停止使用 legacy labels

## 5. Prior Phase Evidence You Must Preserve

来自 `.planning/phases/05-mcp-workbench-hardening/05-UAT.md` 和现有测试，至少已有这些已证实能力：

- 本地 MCP HTTP server 的 `initialize` / `tools.list` / `tools.call` 已端到端通过。
- `text/event-stream` initialize response 已支持。
- “not initialized” 风格错误已能更偏向 session 语义处理。
- schema/raw 双模式 authoring 已可工作。
- 部分 cached tools continuity 已有测试保护。

**Planning implication:**

- Phase 7 不应破坏已经通过 UAT 的主链路。
- cached tools 不应被粗暴删除；它们更适合作为历史证据/回放辅助，而不是当前 authoring truth。
- 计划中应强调“最小化改动 + 语义收口”，而不是“重做”。

## 6. MCP Spec Facts That Matter For Planning

基于 MCP 官方文档（Context7，`/modelcontextprotocol/modelcontextprotocol`）可确认：

### 6.1 `initialize` 是生命周期首步

官方语义：

- `initialize` 是 client/server 的第一步交互
- 用于协议版本与 capability 协商

**Planning implication:** “未 initialize / session 丢失”类问题归入 `session`，是合理且符合规范的产品语义。

### 6.2 `tools/list` 是正式协议动作

官方语义：

- `tools/list` 返回 tool definitions 与 `inputSchema`
- 它不是内部缓存细节，而是客户端获取工具定义的正式动作

**Planning implication:** 把 discovery 设计成显式用户动作完全符合协议，不需要担心“太产品化”。

### 6.3 `tools/call` authoring 天然依赖 discovery 结果

官方语义：

- `tools/call` 主要提交 tool name + arguments
- schema 本身来自 `tools/list`

**Planning implication:** 当前编辑态不应把历史 schema 当作最终权威，最新 discovery 作为 authoring truth 更符合协议本意。

## 7. Planning Questions That Must Be Answered First

如果要把计划做稳，建议优先回答下面这些问题：

### 7.1 discovery state model 是什么

至少建议定义：

- 未 discovery
- discovery 成功且当前 fresh
- discovery 失败
- 已有历史 schema 但当前 stale
- 配置变化后需刷新

### 7.2 什么变化会导致 discovery stale

至少需要评估这些变更：

- `baseUrl` 变化
- auth 变化
- headers 变化
- environment/workspace 切换
- session 变化 / initialize 重新执行

不一定都要清空 discovered tools，但至少要决定：

- 标 `needs refresh`
- 或立即失效
- 或仅弱提示

### 7.3 soft-blocking 具体长什么样

根据 phase 决策：

- 未 discovery 时，`tools.call` 仍允许发送
- 但必须明确提醒 schema/tool list 可能不可靠

需要计划明确：

- 提示出现位置
- 提示强度
- 是否影响发送按钮
- 是否自动降级到 raw 模式

### 7.4 schema refresh 如何处理正在编辑的数据

这是实现里最容易反复的点。至少要决定：

- raw JSON 是否原文保留
- structured fields 是否重建
- 旧字段如何处理
- 当前 toolName 不再存在怎么办

### 7.5 canonical taxonomy 最终是哪三类还是更多

当前 phase 目标最明确的版本是：

- `transport`
- `session`
- `tool-call`

但需要在计划中明确 legacy 值的命运。

## 8. Recommended Planning Structure

建议不要按文件列计划，而按行为闭环拆 workstreams：

### Workstream A: Explicit discovery continuity

建议覆盖：

- discovery 入口和提示
- discovery state/freshness model
- discoverMcpTools 在 app flow 中的真实 wiring
- stale/refresh 规则和测试

### Workstream B: Schema lifecycle ownership

建议覆盖：

- latest discovery 作为当前 schema truth
- history/replay schema 的证据属性
- refresh 后 structured/raw 行为规则
- replay 与当前编辑态优先级测试

### Workstream C: Taxonomy normalization closure

建议覆盖：

- canonical category 定义
- service normalization 收口
- UI 停止暴露 legacy labels
- 历史兼容与 normalize 测试

### Workstream D: Phase 5 archive backfill

建议覆盖：

- `05-SUMMARY.md`
- `05-VERIFICATION.md`
- 证据来源列举：测试、UAT、命令、已知限制

## 9. Verification Strategy To Plan Up Front

按项目规范，这一阶段建议预先把验证分层写进计划：

### 9.1 测试重点

优先建议：

- `src/features/app-shell/state/app-shell-services.test.ts`
- `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
- 如有必要，补 store/domain replay 相关测试

### 9.2 建议覆盖的关键场景

- 未 discovery 的 `tools.call` 软阻断提示
- discovery 成功后 schema 立即切换为最新结果
- 历史 replay 不覆盖当前 latest discovery schema
- legacy error category 被 service 统一 normalize
- UI 仅展示 canonical taxonomy
- connection/auth/baseUrl 变化触发 stale/refresh 语义

### 9.3 最终验证命令

建议在 Phase 7 完成后至少执行：

- `pnpm test`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

如果当轮没有改 Rust，也应在计划中说明是否执行 `cargo check`。

## 10. Practical Risks

### 10.1 discovery state 可能缺少现成容器

如果当前 store 还没有专门表达 latest discovery/freshness 的状态，Phase 7 可能需要先补一个轻量状态契约。

### 10.2 历史兼容值会拖慢 taxonomy closure

旧值已经进入类型和历史数据模型，意味着：

- 不能只改 UI 文案
- 也不能假设历史数据天然干净

### 10.3 schema 静默刷新可能影响编辑体验

一旦最新 discovery 覆盖当前 schema，就必须处理 structured/raw 已输入数据的保留或降级，否则容易引发体验回退。

### 10.4 文档 closure 与代码 closure 缺一不可

本 phase 同时承担 requirement closure 与 audit closure，计划里必须把两类交付物都写进去。

## 11. Dependency / Environment Snapshot

本地工具环境：

- Node `v25.7.0`
- pnpm `10.33.0`
- cargo `1.93.1`
- rustc `1.93.1`

仓库关键依赖现状：

- `vue` 当前 `^3.5.13`，npm 最新 `3.5.32`
- `vitest` 当前 `^4.1.1`，npm 最新 `4.1.2`
- `@tauri-apps/api` 当前 `^2`，npm 最新 `2.10.1`
- `@tauri-apps/cli` 当前 `^2`，npm 最新 `2.10.1`
- Rust 侧使用 `reqwest = "0.12"`、`rusqlite = "0.32"`

**Planning implication:** Phase 7 不需要引入依赖升级。当前最小闭环路径是基于现有技术栈收口行为与证据。

## 12. What You Need To Know To Plan This Phase Well

如果只提炼成最关键的 planning facts，就是下面这些：

1. **这不是新功能 phase，而是 MCP 主链路语义收口 phase。** 重点是 discovery continuity、schema ownership、taxonomy closure、Phase 5 artifact backfill。
2. **现有代码已经有完成本 phase 所需的大部分 seam。** `discoverMcpTools`、schema snapshot、history artifact、service normalization、schema/raw UI 都已存在；规划要围绕这些 seam 收口，而非重造架构。
3. **真正要先设计的是状态语义，不是协议执行。** discovery 的 state model、stale 规则、schema truth source、history precedence、soft-blocking UX、legacy taxonomy compatibility 都要先定清楚。
4. **canonical 产品术语需要在计划里明确锁定。** 最自然的目标是 `transport / session / tool-call`，其余 legacy 值只作为兼容输入，不应继续作为 UI 输出。
5. **要通过 milestone audit，必须同时交付实现、测试证据和归档文档。** 少任一项，`MCP-01` / `MCP-03` / `MCP-04` 或 `PHASE-ARTIFACT-05` 都无法真正关闭。
