---
date: 2026-04-05
sequence: 001
status: active
topic: feat-mcp-server-testing-workbench
source_requirements: docs/brainstorms/2026-04-05-mcp-server-testing-requirements.md
---

# MCP Server Testing Workbench Plan

## Overview

本计划定义如何在 ZenRequest 中新增一条面向 MCP Server 的调试与测试工作流，使用户可以把 MCP Server 当作被测目标完成 `initialize`、`tools/list`、`tools/call` 的结构化调试、结果查看、保存回放和基础断言。首版以 HTTP 类传输为优先目标，但类型模型、运行时边界和执行服务设计必须为后续 `stdio` 扩展预留明确落点。

核心实现策略不是把 MCP 特有字段继续硬塞进现有 HTTP 请求编辑器，而是在现有工作台骨架之内引入一套并行的 MCP 请求模式，复用工作区、标签页、历史、响应展示和测试执行主流程，同时将 MCP 请求定义、连接上下文、协议响应语义和 schema 驱动表单保持为独立模型。

## Problem Frame

ZenRequest 当前请求工作台从类型、编辑器到 Tauri 执行链都以 HTTP 请求为中心：`method/url/body/auth/executionOptions` 是第一等公民，发送入口最终落到 `send_request`，Rust 侧执行器也只支持 `protocol_key = http` 的 `reqwest` 请求执行。这套结构适合传统 API 调试，但不适合承担 MCP Tool Server 的初始化会话、工具发现、工具 schema 解释和结构化工具调用。

如果把 MCP 强行折叠进现有 HTTP 模型，会带来三类问题：

- 请求模型会被 `operationType`、`serverSession`、`toolSchema`、`toolArguments` 等非 HTTP 语义污染，导致现有编辑器与存储层复杂度快速上升。
- 用户体验会退化成“在 HTTP body 里手写 JSON-RPC”，违背 requirements 中对专用表单和结构化输入的要求。
- 后续引入 `stdio` 时，若仍以 URL/body 为中心建模，会让 transport 抽象与会话生命周期被迫绕 HTTP 语义兜底。

因此首版应采用“共享工作台壳层，分离请求协议模型”的架构：现有工作区、标签页、历史、响应区域与执行服务仍是一条统一产品路径，但在请求定义、运行时入口和协议结果解释层为 MCP 建立明确边界。

## Requirements Trace

- R1-R4: 通过独立 MCP 请求模式、MCP 执行链和可保存回放的请求资产满足“被测目标调试与测试工作台”定位。
- R5-R8: 连接目标抽象分为 transport 配置与请求操作定义，首版交付 HTTP 类 transport，并为 stdio 预留并行 transport adapter 接口。
- R9-R15: 新增 MCP 专用请求编辑器，优先提供 `initialize`、`tools/list`、`tools/call` 的结构化表单，同时保留原始协议包可视化视图。
- R16-R19: 响应区新增协议级分段视图、MCP 错误分层和基础断言支持，并接入现有历史与回放工作流。
- R20-R22: 首版范围严格限制在 tool server 调试与基础测试，不扩展 resources/prompts/conformance/multi-server orchestration。

## Scope Boundaries

### In Scope

- MCP 请求模式首版支持 `initialize`、`tools/list`、`tools/call`
- HTTP 类 MCP 连接配置，包括 URL、headers、认证和必要请求上下文
- 工具 schema 获取后的结构化表单渲染与回退策略
- MCP 响应的结构化展示、原始协议包查看、基础断言、保存与回放
- Tauri/Rust 侧首版 MCP HTTP transport executor 和会话状态管理

### Out of Scope

- `resources/*`、`prompts/*`、notifications、sampling、roots 全面支持
- 完整 stdio transport 交付
- 自动探索、批量场景编排、conformance test suite
- 独立的 MCP 多服务编排和跨服务共享上下文能力

## Context And Research

### Existing Patterns To Reuse

- [src/features/app-shell/composables/useAppShell.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/composables/useAppShell.ts)
  负责应用级状态编排、标签页交互、发送流程和用户反馈，是新增 MCP 请求工作流应接入的主编排层。
- [src/features/app-shell/state/app-shell-store.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/state/app-shell-store.ts)
  已集中管理 `openTabs`、`historyItems`、`response`、`isSending` 与工作区 session，是复用标签页/历史骨架的最佳落点。
- [src/features/app-shell/state/app-shell-services.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/state/app-shell-services.ts)
  定义了前端到 runtime 的统一 service 边界。MCP 首版应在这里并列新增 `sendMcpRequest`/`discoverMcpTools` 等服务，而不是让组件直接碰 `tauri-client`。
- [src/lib/tauri-client.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/lib/tauri-client.ts)
  已是前端 runtime bridge。MCP 运行时命令、类型 DTO 和错误 envelope 应先落在这里。
- [src/lib/request-workspace.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/lib/request-workspace.ts)
  提供 tab/preset/response 的 clone、normalize、默认值和转换辅助，可复用公共工作区能力，但需要避免继续假定所有请求都等同 HTTP。
- [src/components/response/ResponsePanel.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponsePanel.vue)
  响应区现有 body/headers/assertion 展示与 toast 行为相对通用，可作为 MCP 结果展示的宿主，但要增加协议语义分区。

### Constraints Observed In Current Model

- [src/types/request.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/types/request.ts)
  现有 `RequestPreset`、`RequestTabState`、`SendRequestPayload`、`CompiledRequest` 都以 HTTP method/url/body/auth 为中心，不适合直接承载 MCP 会话、operation 和 schema。
- [src/components/request/RequestPanel.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/request/RequestPanel.vue)
  与 [src/components/request/RequestUrlBar.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/request/RequestUrlBar.vue)、[src/components/request/RequestParams.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/request/RequestParams.vue) 共同形成完整 HTTP 请求构造器，UI 结构天然绑定 method/url/params/headers/body/auth/tests/mock/execution。
- [src/features/request-workbench/composables/useRequestPanelState.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/request-workbench/composables/useRequestPanelState.ts)
  直接产出 `SendRequestPayload`，并用 HTTP 校验逻辑判定发送 readiness，因此不能简单复用为 MCP 编辑器状态层。
- [src-tauri/src/services/request_service.rs](/media/qiang/DataDisk/D/MyProject/ZenRequest/src-tauri/src/services/request_service.rs)
  发送逻辑围绕 `compile_request -> execute_request -> evaluate_assertions -> insert_history_item`，适合抽取成“协议无关的执行编排壳 + 协议特定 executor”。
- [src-tauri/src/core/request_executor.rs](/media/qiang/DataDisk/D/MyProject/ZenRequest/src-tauri/src/core/request_executor.rs)
  明确只支持 `protocol_key = http` 且由 `reqwest` 执行。MCP 需要并行 executor，而不是挤入该文件做条件分支膨胀。

### Planning Resolutions For Deferred Questions

- HTTP 类传输边界: 首版以 request-response 型 MCP over HTTP 为主，支持 `initialize`、`tools/list`、`tools/call` 所需的 HTTP 请求/响应闭环；SSE/streamable HTTP 先限定为“若服务端以单次请求可完成上述操作则可兼容”，不在首版承诺持续流会话 UI。
- Schema 覆盖边界: 首版优先覆盖常见 JSON Schema 标量、对象、数组、enum、boolean、number、nested object；`oneOf`/`anyOf`/深层递归/复杂组合 schema 提供结构化回退提示并允许切换原始 JSON 参数编辑。
- 原始协议包共存方式: 结构化表单是主编辑入口，但执行后必须在响应区提供“Structured / Raw Protocol”双视图；原始请求包由前端根据 MCP 操作定义和 transport 配置生成展示，真实传输包以 Rust executor 产出的 artifact 为准。
- 持久化边界: MCP 请求资产与 HTTP 请求资产共享 tab/history/collection/workspace 容器，但在 payload/preset 层使用判别式请求类型，避免把 MCP 状态塞进现有 HTTP body/auth 字段。
- 错误分层: 首版将错误明确分为 `transport`、`initialize`、`protocol`、`tool_execution` 四层，并映射到统一前端错误视图和历史记录摘要。

## Key Technical Decisions

### 1. 引入判别式请求模型，而不是扩展 HTTP 专有字段

新增统一的请求资源顶层 discriminant，例如 `requestKind: 'http' | 'mcp'`，并将 HTTP 与 MCP 的可编辑定义拆分为并行 payload：

- HTTP 继续使用现有 method/url/body/auth/executionOptions 模型
- MCP 新增 `McpRequestDefinition`，内部再区分 `operation: 'initialize' | 'tools.list' | 'tools.call'`

理由：这能保留工作区骨架与历史容器的一致性，同时把协议差异压缩在类型边界内，避免现有 HTTP 组件和工具链持续被 MCP 语义侵入。

### 2. 复用统一工作台壳层，但为请求构造器建立独立 MCP rail

请求编辑区域采用“按 request kind 切换编辑器”的策略：

- HTTP 继续走现有 `RequestPanel -> RequestUrlBar/RequestParams`
- MCP 新增独立编辑器组件树，例如 `McpRequestPanel`、`McpOperationRail`、`McpInitializeForm`、`McpToolsListForm`、`McpToolCallForm`

理由：当前 HTTP 请求面板强依赖 method/url/body/auth/testing 布局，直接改造成双协议通吃组件会显著增加模板与状态复杂度，并降低后续维护性。

### 3. 连接配置与操作定义拆分为两层

MCP 请求模型拆成两块：

- `McpConnectionConfig`: transport、baseUrl、headers、auth、session policy 等连接上下文
- `McpOperationInput`: initialize/tools.list/tools.call 的操作选择与结构化参数

理由：连接信息应可在同一服务器目标下被多个 MCP 请求复用，同时这也是未来接入 `stdio` transport 的必要抽象。

### 4. 在 Tauri runtime 中新增 MCP executor facade，首版只落 HTTP adapter

Rust 侧不修改现有 `send_request` 执行器逻辑来兼容 MCP，而是新增并行 command/service，例如：

- `send_mcp_request`
- `discover_mcp_capabilities` 或在 `send_mcp_request` 中内聚 initialize/tools/list/tool-call 生命周期

内部通过 `mcp_runtime` facade 路由到 transport adapter：

- `http_transport_adapter` 首版实现
- `stdio_transport_adapter` 仅定义 trait/接口和占位能力描述，不实现完整行为

理由：这能保证现有 HTTP 请求链稳定，同时让后续 stdio 不被 `reqwest` 路径裹挟。

### 5. schema 驱动表单采用“结构化优先 + 原始 JSON 回退”的分层策略

前端新增 schema-to-form translator：

- 能识别的 schema 映射为表单控件
- 局部无法识别时在字段级回退为 JSON 片段输入
- 整体复杂度超出首版覆盖时，回退到 raw JSON editor，但保留 schema 摘要与错误提示

理由：这满足 R13-R15，同时避免为了覆盖所有 JSON Schema 组合而让首版 scope 失控。

### 6. 响应语义增加 MCP 协议视图，但沿用现有 ResponsePanel 宿主

响应模型新增 MCP 专用 execution artifact，包括：

- transport request summary
- protocol request envelope
- protocol response envelope
- mcp lifecycle stage
- tool result summary
- typed error classification

前端在 `ResponsePanel` 中按响应 kind 渲染 HTTP 或 MCP 视图。这样可以保留下载、复制、历史回放、断言结果等现有行为，只在正文和元信息区增加 MCP 语义层。

### 7. 断言首版沿用现有基础能力，但扩展 JSON 路径目标与 MCP 结果源

首版不单独设计 MCP DSL，而是在现有断言结构上增加 MCP 可选 source/target：

- `protocol.status`
- `protocol.error.code`
- `result.content[*]`
- `result.structuredContent.xxx`

理由：能最大化复用现有测试资产设计与 UI，避免首版把问题扩大成完整测试引擎重构。

## Progress Update

### Current Status

- Unit 1: completed
- Unit 2: completed
- Unit 3: completed for flat object schemas and raw JSON fallback; complex array / nested object coverage remains intentionally limited for v1
- Unit 4: completed for MCP send path and runtime bridge; dedicated discover service is not implemented as a separate API yet
- Unit 5: completed for MCP over HTTP; stdio remains planned / reserved only
- Unit 6: completed for MCP response rendering, history summary, replay, and basic sidebar integration
- Unit 7: completed for MCP i18n, capability messaging, README scope notes, and discoverability coverage

### Verified So Far

- Frontend: request kind typing, MCP panel rendering, readiness blockers, send path, history replay, sidebar MCP summary, TypeScript compile
- Rust: MCP request DTOs, request service persistence, history summary recovery, runtime capability descriptors, cargo check
- Product boundary: MCP over HTTP is active; MCP over stdio is explicitly marked planned / reserved

### Remaining Gaps

- No full end-to-end automated integration test that drives initialize -> tools.list -> tools.call through one browser-visible scenario
- discoverMcpTools currently remains a lightweight read-only bridge over `send_mcp_request`, not a dedicated backend command

## Implementation Units

### Unit 1. 引入统一请求种类模型与 MCP 类型骨架

**Goal**

在前端类型、工作区默认值和持久化转换层中引入 `requestKind` 判别，并新增 MCP 请求定义与响应 artifact 类型，不破坏现有 HTTP 路径。

**Primary files**

- `src/types/request.ts`
- `src/lib/request-workspace.ts`
- `src/data/request-presets.ts`
- `src/features/app-shell/state/app-shell-store.ts`

**Test files**

- `src/lib/request-workspace.test.ts`
- `src/features/app-shell/state/app-shell-store.test.ts`

**Tasks**

- 为 request preset/tab/history/response 引入判别式请求种类
- 定义 `McpConnectionConfig`、`McpOperationInput`、`McpToolSchemaSnapshot`、`McpExecutionArtifact`
- 更新默认 tab/preset 构造逻辑，保证 HTTP 默认行为不变
- 明确 collection/history/session 中如何序列化 MCP 请求资产

**Test scenarios**

- HTTP tab/preset 经过新类型归一化后行为保持不变
- MCP tab 可以被创建、clone、持久化并恢复
- history/request snapshot 对 HTTP 与 MCP 均能保留各自必要字段
- 未显式带 `requestKind` 的旧数据能被兼容归一为 HTTP

### Unit 2. 新增 MCP 请求面板与请求模式切换

**Goal**

在现有工作台中支持在 HTTP 与 MCP 请求模式之间切换，并提供 MCP 专用构造器 UI。

**Primary files**

- `src/components/request/RequestPanel.vue`
- `src/components/request/RequestUrlBar.vue`
- `src/components/request/RequestParams.vue`
- `src/features/request-workbench/composables/useRequestPanelState.ts`
- `src/features/mcp-workbench/components/McpRequestPanel.vue`
- `src/features/mcp-workbench/components/McpOperationRail.vue`
- `src/features/mcp-workbench/components/McpInitializeForm.vue`
- `src/features/mcp-workbench/components/McpToolsListForm.vue`
- `src/features/mcp-workbench/components/McpToolCallForm.vue`
- `src/features/mcp-workbench/composables/useMcpRequestPanelState.ts`

**Test files**

- `src/components/request/RequestPanel.test.ts`
- `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
- `src/features/mcp-workbench/composables/useMcpRequestPanelState.test.ts`

**Tasks**

- 在请求工作台顶层增加 request mode 切换器
- 保持 HTTP 现有组件路径不受回归影响
- 为 MCP 提供连接配置、操作类型选择和基础输入校验
- 将发送事件改为根据 request kind 产出 HTTP 或 MCP payload

**Test scenarios**

- 用户切换到 MCP 模式后显示 MCP rail，且不会渗出 HTTP body/auth/mock 配置区
- 切回 HTTP 模式时现有 tab 内容保持不丢失
- MCP `initialize` 缺少必要连接信息时被阻止发送并展示明确 blocker
- `tools.call` 在未选中工具或缺少必填参数时阻止发送

### Unit 3. 实现 schema 驱动工具参数表单与回退策略

**Goal**

把 `tools/list` 返回的 tool schema 转换为可编辑表单，使 `tools.call` 首版能尽量覆盖结构化输入，同时在复杂 schema 下优雅回退。

**Primary files**

- `src/features/mcp-workbench/lib/mcp-schema-form.ts`
- `src/features/mcp-workbench/lib/mcp-schema-normalizer.ts`
- `src/features/mcp-workbench/components/McpToolArgumentField.vue`
- `src/features/mcp-workbench/components/McpToolCallForm.vue`
- `src/features/mcp-workbench/composables/useMcpToolSchemaForm.ts`

**Test files**

- `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`
- `src/features/mcp-workbench/lib/mcp-schema-normalizer.test.ts`
- `src/features/mcp-workbench/composables/useMcpToolSchemaForm.test.ts`

**Tasks**

- 建立 JSON Schema 到表单字段定义的转换器
- 覆盖标量、对象、数组、enum、嵌套 object 等首版目标 schema
- 定义字段级和整体级回退策略
- 生成 `tools.call` 最终 arguments JSON 与 schema 验证错误提示

**Test scenarios**

- 简单 object schema 正确渲染为对应字段并生成合法 arguments
- enum/boolean/number 字段显示正确控件并完成值转换
- 数组与嵌套对象 schema 可生成结构化 payload
- `oneOf` 或无法识别 schema 时回退为 raw JSON 输入，并保留回退原因提示

### Unit 4. 扩展前端服务边界与 runtime bridge，新增 MCP 命令 DTO

**Goal**

在前端应用服务层新增 MCP 执行能力，并把 MCP payload/result 的 bridge 收拢在 `tauri-client`。

**Primary files**

- `src/lib/tauri-client.ts`
- `src/lib/tauri-client.test.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/composables/useAppShell.ts`

**Test files**

- `src/lib/tauri-client.test.ts`
- `src/features/app-shell/state/app-shell-services.test.ts`
- `src/features/app-shell/composables/useAppShell.test.ts`

**Tasks**

- 新增 MCP 请求/响应 DTO、错误 envelope 与 runtime 调用方法
- 在 app shell services 中并列新增 MCP send/discover 服务
- 在 `useAppShell` 中把 MCP 发送、成功、失败和历史更新接入统一工作流
- 确保现有 HTTP send path 不受影响

**Test scenarios**

- MCP send 在 runtime 成功时正确更新 tab response/history/loading 状态
- MCP send 失败时正确分类并展示错误文案
- HTTP send 相关测试继续通过，未因类型扩展回归
- runtime 未实现 MCP 命令时返回明确 not-implemented 错误

### Unit 5. 在 Rust 侧新增 MCP runtime facade 与 HTTP transport adapter

**Goal**

在 Tauri/Rust 层建立独立 MCP 执行链，支持首版 HTTP 类 MCP 请求生命周期，并为未来 stdio adapter 预留接口。

**Primary files**

- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/mcp.rs`
- `src-tauri/src/services/mcp_service.rs`
- `src-tauri/src/core/mcp_runtime.rs`
- `src-tauri/src/core/mcp_http_transport.rs`
- `src-tauri/src/models/mcp.rs`
- `src-tauri/src/models/mod.rs`

**Test files**

- `src-tauri/src/commands/mcp.rs`
- `src-tauri/src/services/mcp_service.rs`
- `src-tauri/src/core/mcp_runtime.rs`
- `src-tauri/src/core/mcp_http_transport.rs`

**Tasks**

- 新增 Tauri command 与 DTO，用于接收 MCP 请求并返回统一 envelope
- 实现 MCP HTTP transport adapter，负责 initialize/tools.list/tools.call 的协议组装与执行
- 把会话级元数据、错误分类、原始协议包和结构化结果封装为 execution artifact
- 为未来 stdio transport 定义 trait/enum 扩展点，但不实现具体执行

**Test scenarios**

- initialize 成功时返回服务端能力摘要和后续会话上下文
- tools/list 成功时返回工具列表与 schema 快照
- tools/call 成功时返回结构化结果、原始协议响应和 tool result summary
- transport 失败、协议错误和工具执行错误被映射到不同 error code/classification

### Unit 6. 统一响应展示、历史回放与断言支持 MCP 语义

**Goal**

让 MCP 请求结果在现有 ResponsePanel 与历史系统中呈现为自然扩展，而不是孤立新页面。

**Primary files**

- `src/components/response/ResponsePanel.vue`
- `src/components/response/ResponsePanel.test.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/lib/request-workspace.ts`
- `src/lib/response-code-viewer.ts`

**Test files**

- `src/components/response/ResponsePanel.test.ts`
- `src/lib/response-code-viewer.test.ts`
- `src/features/app-shell/state/app-shell-store.test.ts`

**Tasks**

- 在 response state 中增加响应 kind 和 MCP artifact 引用
- ResponsePanel 增加 structured/raw protocol/error classification 视图
- history item 支持记录 MCP 操作名、连接目标摘要和错误类别摘要
- 扩展断言目标映射，使 MCP 结果可使用 JSON 字段存在和值匹配断言

**Test scenarios**

- MCP 响应可切换查看结构化结果与原始协议包
- MCP 错误时可清晰看到 transport/initialize/protocol/tool_execution 分类
- 从历史记录回放 MCP 请求时可恢复请求定义并再次执行
- 现有 HTTP 响应复制、下载、代码高亮和错误展示行为无回归

### Unit 7. 本地化文案、能力描述与兼容性清理

**Goal**

补齐 MCP 首版涉及的文案、runtime capability 声明、兼容数据迁移和说明文档，使工作台在产品层可被完整发现和使用。

**Primary files**

- `src/lib/i18n.ts`
- `src/lib/tauri-client.ts`
- `README.md`
- `docs/brainstorms/2026-04-05-mcp-server-testing-requirements.md`

**Test files**

- `src/lib/i18n.test.ts`

**Tasks**

- 增补中英文 MCP 工作台文案与错误提示
- 在 runtime capabilities 中声明 MCP transport 支持状态，尤其是 HTTP active / stdio planned
- 更新 README 或相关文档，说明 MCP 首版范围与使用方式
- 审查旧数据兼容路径和 feature discoverability

**Test scenarios**

- MCP 文案在中英文环境下均可正确展示
- runtime capability 为 inactive 或 planned 时，前端能给出正确提示
- 文档中首版范围与实际实现边界一致，不误导为完整 MCP 客户端

## Sequencing

1. Unit 1 先落类型与工作区骨架，这是后续所有 UI、服务和持久化改动的前置条件。
2. Unit 2 与 Unit 4 可在 Unit 1 后并行推进，但最终都依赖统一类型边界。
3. Unit 3 依赖 Unit 2 的 MCP tool call 表单骨架，同时依赖 Unit 5 提供稳定 schema 快照来源。
4. Unit 5 可以在 Unit 1 完成后独立推进，并为 Unit 4/6 提供结果模型。
5. Unit 6 需要在 Unit 4 与 Unit 5 基本成型后整合。
6. Unit 7 作为收尾，但 capability 声明应尽早随 Unit 4/5 同步。

## System-Wide Impact

- 请求模型将从单一 HTTP 语义升级为多协议请求工作台，这是一次类型层面的系统性变化。
- 前端发送流程、历史回放和响应展示会从“默认 HTTP”变为“按 request kind 分发”，需要严格做兼容测试。
- Tauri runtime 将首次拥有独立于 `send_request` 的第二条协议执行链，后续若再支持 stdio 或更多 MCP surface，维护成本取决于本次 facade 抽象是否克制。

## Risks And Dependencies

### Primary Risks

- 类型扩展若直接侵入现有 HTTP 组件，容易造成大面积回归。
- schema 驱动表单若覆盖范围过大，首版会被复杂 JSON Schema corner cases 拖慢。
- MCP HTTP 服务端实现差异较大，若首版不明确边界，容易把 SSE/streaming session 支持误纳入承诺。
- 历史与持久化结构若设计不稳，后续再加 stdio 会出现迁移成本。

### Mitigations

- 用判别式类型和独立组件树隔离 HTTP/MCP 差异。
- 明确 schema 覆盖优先级，先做 80% 高频结构，保留 JSON 回退口。
- 在 capability 文案和 README 中明确首版 HTTP 优先且不承诺完整 streaming UX。
- 所有旧数据兼容默认回退到 HTTP，避免破坏现有用户资产。

### Dependencies

- 前端需依赖 Rust 侧返回稳定的 tool schema snapshot 与错误分类
- Rust 侧需确认目标 MCP HTTP server 的最小协议兼容面
- 响应展示与断言扩展需要与现有 request-history 数据结构对齐

## Execution Posture

- 建议以 characterization-first 方式保护现有 HTTP 请求工作流，先补足类型与 store 层回归测试，再开始 MCP 新能力实现。
- MCP 首版应以集成测试优先验证 `initialize -> tools/list -> tools/call` 闭环，而不是先堆叠复杂 UI 细节。

## Open Questions Deferred To Implementation

- 是否需要在首版就缓存工具 schema 到 workspace/session，以减少重复 `tools/list` 请求。
- `initialize` 响应中的 capability/version 字段在不同 server 变体上的兼容清洗策略，需要结合样本服务进一步细化。
- `result.content` 中多模态内容块的首版 UI 呈现深度应做到哪一层，目前计划只保证结构化可见和原始 JSON 可查。

## Verification Strategy

- 前端单测覆盖类型归一化、MCP 请求面板状态机、schema 表单转换、ResponsePanel MCP 渲染。
- Rust 单测覆盖 transport 请求构造、协议包解析、错误分类和 artifact 组装。
- 增加至少一条端到端的前后端集成验证，确认 MCP 请求能进入统一 tab/history/response 工作流。
- 所有现有 HTTP 请求与响应测试必须继续通过，作为本计划的回归护栏。

## Sources And References

- [2026-04-05-mcp-server-testing-requirements.md](/media/qiang/DataDisk/D/MyProject/ZenRequest/docs/brainstorms/2026-04-05-mcp-server-testing-requirements.md)
- [request.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/types/request.ts)
- [request-workspace.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/lib/request-workspace.ts)
- [useAppShell.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/composables/useAppShell.ts)
- [app-shell-store.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/state/app-shell-store.ts)
- [app-shell-services.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/state/app-shell-services.ts)
- [RequestPanel.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/request/RequestPanel.vue)
- [RequestUrlBar.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/request/RequestUrlBar.vue)
- [RequestParams.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/request/RequestParams.vue)
- [useRequestPanelState.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/request-workbench/composables/useRequestPanelState.ts)
- [ResponsePanel.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponsePanel.vue)
- [request.rs](/media/qiang/DataDisk/D/MyProject/ZenRequest/src-tauri/src/commands/request.rs)
- [request_service.rs](/media/qiang/DataDisk/D/MyProject/ZenRequest/src-tauri/src/services/request_service.rs)
- [request_executor.rs](/media/qiang/DataDisk/D/MyProject/ZenRequest/src-tauri/src/core/request_executor.rs)
