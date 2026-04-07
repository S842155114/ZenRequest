# Phase 10: MCP Roots Support - Research

**Researched:** 2026-04-07
**Domain:** MCP roots 会话输入配置、协议透传与工作台集成
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Claude's Discretion
- roots 区块的具体文案、空状态、折叠方式与密度细节
- roots 行编辑器是 table-like 还是 stacked rows，只要不破坏主区域层级即可
- 历史摘要里 roots 的最小关键信息如何表达得更紧凑

### Deferred Ideas (OUT OF SCOPE)
- stdio、sampling、多 server 管理、roots 自动发现、文件系统浏览器、或超出 MCP workbench 主链路的全局设置体系。
</user_constraints>

## Project Constraints (from CLAUDE.md)

- 必须优先复用现有分层：组件负责展示，composable 负责状态编排，`src/lib/tauri-client.ts` 作为前后端桥接边界。[VERIFIED: `./AGENTS.md`]
- Phase 10 应扩展现有 MCP workbench 主链路，不能新建独立 roots 子系统。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`]
- 不要引入新依赖或超出当前单 server、离线优先、本地优先哲学的复杂设计。[VERIFIED: `./AGENTS.md`]
- 需要覆盖主要交互路径、边界条件和失败路径测试；未跑验证时必须明确说明。[VERIFIED: `./AGENTS.md`]
- `workflow.nyquist_validation` 在 `.planning/config.json` 中显式为 `false`，本研究应省略 Validation Architecture 章节。[VERIFIED: `.planning/config.json`]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCPROOT-01 | 开发者可以为当前 MCP 调试会话配置 roots 输入 | 研究确认应把 roots 放进 `McpRequestDefinition` 的会话级配置，并在 `McpRequestPanel.vue` 中作为独立可折叠配置块编辑。[VERIFIED: `.planning/REQUIREMENTS.md`][VERIFIED: `src/features/mcp-workbench/components/McpRequestPanel.vue`] |
| MCPROOT-02 | 开发者可以在 roots 相关请求中看到 roots 配置已实际传递给 MCP server | 研究确认 roots 在 MCP 中是客户端能力+服务端回调请求模型，应在 initialize 宣告 capability、在运行时响应 `roots/list`，并把协议请求/响应与 history/replay 中的 roots 快照持久化。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx][VERIFIED: `src-tauri/src/core/mcp_runtime.rs`][VERIFIED: `.planning/REQUIREMENTS.md`] |
</phase_requirements>

## Summary

Phase 10 不是给 MCP workbench 再增加一种新 operation，而是给“当前 MCP 调试会话”增加一个稳定的客户端输入面：roots 列表。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`] 这和 Phase 08/09 的 resources、prompts 不同，后两者是客户端主动发起的方法；roots 则是客户端在 `initialize` 中声明支持后，由 server 通过 `roots/list` 反向向客户端索取当前 roots 列表。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx] 因此实现重点不是“新增 roots.list 操作按钮”，而是把 roots 作为会话状态，贯通到 initialize capability、运行时回调处理、协议审计和 history/replay 快照。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`][VERIFIED: `src-tauri/src/core/mcp_runtime.rs`]

现有代码已经具备合适的接入骨架：`McpRequestPanel.vue` 是 MCP 请求编辑主入口，`useAppShellViewModel.ts` 负责编排 discover/send/replay，`app-shell-services.ts` 负责编排 runtime 调用，`src/lib/tauri-client.ts` 负责前端 DTO 映射，`src-tauri/src/core/mcp_runtime.rs` 负责真实协议构造与执行。[VERIFIED: `src/features/mcp-workbench/components/McpRequestPanel.vue`][VERIFIED: `src/features/app-shell/composables/useAppShellViewModel.ts`][VERIFIED: `src/features/app-shell/state/app-shell-services.ts`][VERIFIED: `src/lib/tauri-client.ts`][VERIFIED: `src-tauri/src/core/mcp_runtime.rs`] 现状下 `McpOperationType` 只覆盖 initialize/tools/resources/prompts，没有 roots 作为 operation，这正好符合 phase 约束：roots 不应成为新的 operation 家族。[VERIFIED: `src/types/request.ts:24`][VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`]

**Primary recommendation:** 把 roots 实现为 `McpRequestDefinition.connection` 或其平级会话配置的一部分，由 initialize 自动声明 `capabilities.roots.listChanged`，由 Rust runtime 在收到 server 的 `roots/list` 请求时返回当前 roots，并把 roots 快照写入 protocol inspection 与 history/replay。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx][VERIFIED: `src-tauri/src/core/mcp_runtime.rs`]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | 3.5.32 | Phase 10 前端交互、roots 编辑 UI、面板状态绑定 | 仓库现有前端主框架；MCP workbench UI 已全部建立在 Vue 组合式模式上。[VERIFIED: npm registry][VERIFIED: `package.json`] |
| @tauri-apps/api | 2.10.1 | 前端调用 Tauri 命令，把 roots 会话配置传到 Rust runtime | 仓库已使用 Tauri 2 作为唯一桌面桥接层，roots 应继续走同一桥接边界。[VERIFIED: npm registry][VERIFIED: `package.json`] |
| Rust + reqwest | reqwest 0.12 / Rust 1.93.1 toolchain available | 在 runtime 中构造 initialize / JSON-RPC 请求、处理 session header 与 roots/list 回调 | 现有 MCP HTTP runtime 已建立在 `reqwest` 上，roots 最小改动路径就是扩展现有 runtime。[VERIFIED: `src-tauri/Cargo.toml`][VERIFIED: local toolchain] |
| rusqlite | 0.32 | 本地 history/workspace 快照持久化 roots 最小上下文 | 仓库本地持久化标准库，history/replay 已依赖现有快照管道。[VERIFIED: `src-tauri/Cargo.toml`][VERIFIED: `src/lib/request-workspace.ts`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.2 | 覆盖前端 roots 编辑器、view model 编排、DTO 映射测试 | 变更 `McpRequestPanel`、`request-workspace`、`tauri-client` 时必用。[VERIFIED: npm registry][VERIFIED: `package.json`] |
| @vue/test-utils | 2.4.6 | 组件级测试 roots 行编辑、折叠态与事件冒泡 | 新增 `McpRequestPanel` roots UI 时使用。[VERIFIED: npm registry][VERIFIED: `package.json`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 在现有 `McpRequestPanel` 增加 roots 配置块 | 新建独立 Roots 子面板/子系统 | 违背 D-14/D-15，也会复制现有 MCP 编辑链路。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`] |
| 会话级 roots 状态 | 每次请求单独填写 roots | 违背 D-01/D-02/D-03，且无法自然匹配 `roots/list` 的服务端拉取语义。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx][VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`] |
| runtime 内响应 `roots/list` | 前端伪造 inspection 结果、但不进入真实协议流 | 无法满足 MCPROOT-02 的“实际传递并可检查”。[VERIFIED: `.planning/REQUIREMENTS.md`] |

**Installation:**
```bash
pnpm install
cargo check --manifest-path src-tauri/Cargo.toml
```

**Version verification:**
- `vue@3.5.32`，registry 修改时间 `2026-04-03T05:41:40.006Z`。[VERIFIED: npm registry]
- `vitest@4.1.2`，registry 修改时间 `2026-03-26T14:36:51.783Z`。[VERIFIED: npm registry]
- `@tauri-apps/api@2.10.1`，registry 修改时间 `2026-02-03T00:17:27.147Z`。[VERIFIED: npm registry]
- `@vue/test-utils@2.4.6`，registry 修改时间 `2024-05-07T00:07:49.169Z`。[VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── features/mcp-workbench/components/   # MCP 编辑 UI，新增 roots 配置块
├── features/app-shell/composables/      # roots 更新、发送、回放编排
├── features/app-shell/state/            # runtime 服务调用与结果归类
├── lib/                                 # DTO 映射、workspace/history 快照序列化
└── types/                               # McpRequestDefinition / artifact / snapshot 类型边界

src-tauri/
└── src/core/                            # MCP HTTP runtime、session 头、协议包构造与回调处理
```
[VERIFIED: `./AGENTS.md`][VERIFIED: `src/features/mcp-workbench/components/McpRequestPanel.vue`][VERIFIED: `src/features/app-shell/composables/useAppShellViewModel.ts`][VERIFIED: `src/features/app-shell/state/app-shell-services.ts`][VERIFIED: `src/lib/tauri-client.ts`][VERIFIED: `src-tauri/src/core/mcp_runtime.rs`]

### Pattern 1: 会话配置与 operation 解耦
**What:** roots 作为会话输入配置存在于 `McpRequestDefinition` 中，但不加入 `McpOperationType`。当前类型里 operation 仅有 initialize/tools/resources/prompts，这个边界应被保留。[VERIFIED: `src/types/request.ts:24`]
**When to use:** 当数据会影响多个 MCP 请求，且属于会话上下文而非某次命令参数时。
**Example:**
```typescript
export type McpOperationType =
  | 'initialize'
  | 'tools.list'
  | 'tools.call'
  | 'resources.list'
  | 'resources.read'
  | 'prompts.list'
  | 'prompts.get'
```
Source: `src/types/request.ts:24`

### Pattern 2: UI 只发事件，状态由外层编排
**What:** `McpRequestPanel.vue` 只做 `update:mcp`、discover、send、save 等事件转发，不直接掌管全局会话状态。[VERIFIED: `src/features/mcp-workbench/components/McpRequestPanel.vue:54`]
**When to use:** roots 行编辑、折叠状态、添加/删除动作接入现有面板时。
**Example:**
```typescript
const emit = defineEmits<{
  (e: 'update:mcp', value: McpRequestDefinition): void
  (e: 'discover-tools'): void
  (e: 'discover-resources'): void
  (e: 'discover-prompts'): void
  (e: 'update:request-kind', value: 'http' | 'mcp'): void
  (e: 'send'): void
  (e: 'save'): void
}>()
```
Source: `src/features/mcp-workbench/components/McpRequestPanel.vue:54`

### Pattern 3: runtime 负责真实协议包与 session 语义
**What:** Rust runtime 已统一处理 header 注入、`mcp-session-id`、JSON-RPC body 构造与 SSE 解析；roots 应沿用同一层处理。[VERIFIED: `src-tauri/src/core/mcp_runtime.rs`]
**When to use:** initialize capability 注入、`roots/list` 回调响应、inspection request/response 归档时。
**Example:**
```rust
if !matches!(payload.mcp.operation, McpOperationInputDto::Initialize { .. }) {
    if let Some(session_id) = &payload.mcp.connection.session_id {
        if !session_id.trim().is_empty() {
            headers.insert(HeaderName::from_static("mcp-session-id"), value);
        }
    }
}
```
Source: `src-tauri/src/core/mcp_runtime.rs:151`

### Pattern 4: history/replay 走统一 snapshot 管道
**What:** 现有 request workspace 会把 `mcp` 定义与 `mcpArtifact` 统一纳入历史与回放快照；roots 不应另起存储模型。[VERIFIED: `src/types/request.ts:256`][VERIFIED: `src/lib/request-workspace.ts`]
**When to use:** 保存 roots 最小上下文、历史摘要与 replay 恢复时。
**Example:**
```typescript
export type HistoryRequestSnapshot = Omit<SendRequestPayload, 'body' | 'bodyType'> & {
  body: string | RequestBodySnapshot
  mcp?: McpRequestDefinition
}
```
Source: `src/types/request.ts:256`

### Anti-Patterns to Avoid
- **把 roots 做成新 operation：** 会破坏“会话输入配置”和“协议能力面”的边界。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`]
- **只在前端保存 roots，不进 runtime：** 无法满足“实际传递并可检查”。[VERIFIED: `.planning/REQUIREMENTS.md`]
- **为 roots 单独做专属 viewer 或专属历史系统：** 当前 tools/resources/prompts 都走统一 artifact 流，roots 也应复用。[VERIFIED: `.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md`][VERIFIED: `.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md`]
- **把本地文件浏览器塞进本 phase：** 明确超出 D-09 和 scope。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| roots 协议语义 | 自定义“roots 上传”或额外 HTTP 端点 | 按 MCP 官方 `capabilities.roots` + `roots/list` + `notifications/roots/list_changed` 语义实现 | 这已经是协议标准，手搓私有语义会破坏互操作性。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx] |
| session 持久化 | 新建 roots 专属存储表或独立工作流 | 复用现有 `McpRequestDefinition` / `HistoryRequestSnapshot` / `McpExecutionArtifact` 管道 | 现有工作台已围绕统一 snapshot 与 artifact 架构构建。[VERIFIED: `src/types/request.ts`][VERIFIED: `src/lib/request-workspace.ts`] |
| 表单状态机 | 新引入复杂 schema 驱动表单系统 | 仓库现有 Vue 组合式 + 行编辑模式 | roots 字段只有 `uri` 和可选 `name`，需求简单，过度抽象无益。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`] |
| 协议检查视图 | roots 专属 inspect 面板 | 复用现有 protocol request/response display | Phase 08/09 已锁定 generic result / generic inspection 路线。[VERIFIED: `.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md`][VERIFIED: `.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md`] |

**Key insight:** roots 的复杂度不在 UI 字段数量，而在它是“客户端会话能力 + 服务端反向请求”的语义；真正要复用的是现有 runtime、artifact、history 管道，而不是手写一套新概念。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx][VERIFIED: `src-tauri/src/core/mcp_runtime.rs`]

## Common Pitfalls

### Pitfall 1: 把 roots 当成客户端主动操作
**What goes wrong:** 规划出一个 `roots.list` 按钮或 operation，用户点击后主动请求 server。
**Why it happens:** 误把 roots 当成 resources/prompts 那类 capability，而忽略它的客户端性质。
**How to avoid:** 在 plan 中明确：initialize 声明 capability；真正的 roots 传递发生在 server 发出 `roots/list` 请求时，由客户端 runtime 响应。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx]
**Warning signs:** PR 里出现 `McpOperationType += 'roots.list'` 或 UI 上新增独立 send action。

### Pitfall 2: initialize 不声明 roots capability
**What goes wrong:** UI 能编辑 roots，但 server 从不知道客户端支持 roots，于是从不发 `roots/list`。
**Why it happens:** 只关注 payload 持久化，没把 capability negotiation 视为功能入口。
**How to avoid:** 发送 initialize 时自动在 capabilities 中加入 `roots`，并根据实现决定 `listChanged` 值；第一版可固定 `true` 或 `false`，但必须与实际行为一致。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx]
**Warning signs:** 协议 request 里没有 `capabilities.roots`。

### Pitfall 3: 只保存编辑态，不保存审计态
**What goes wrong:** roots 在 UI 里存在，但历史记录或协议检查看不到实际返回给 server 的 roots。
**Why it happens:** 把 roots 当成本地表单状态，而没纳入 protocol request/response / history 快照。
**How to avoid:** 至少保存三处：当前 `mcp` 定义中的 roots、protocol inspection 中的 `roots/list` request/response、history/replay 的最小 roots 快照。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`][VERIFIED: `src/types/request.ts`]
**Warning signs:** replay 后 roots 丢失，history 摘要无法判断 roots 是否参与过请求。

### Pitfall 4: 让 roots UI 重新挤爆 MCP 面板
**What goes wrong:** roots 新增一大块固定展开表单，破坏 Phase 09 的布局收敛。
**Why it happens:** 没把 D-04/D-05/D-06/D-17 当成硬约束。
**How to avoid:** 采用可折叠、低 chrome、列表式编辑；不要复制一层额外标题条或命令栏。[VERIFIED: `.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md`][VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`]
**Warning signs:** MCP 面板重新出现重复的状态摘要或大块永久展开区域。

## Code Examples

Verified patterns from official sources and repository code:

### MCP roots capability declaration
```json
{
  "capabilities": {
    "roots": {
      "listChanged": true
    }
  }
}
```
Source: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx

### MCP `roots/list` response shape
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "roots": [
      {
        "uri": "file:///home/user/projects/myproject",
        "name": "My Project"
      }
    ]
  }
}
```
Source: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx

### Vue event-upward update pattern for MCP editor
```typescript
const updateMcp = (updater: (current: McpRequestDefinition) => McpRequestDefinition) => {
  emit('update:mcp', updater(ensureMcpDefinition()))
}
```
Source: `src/features/mcp-workbench/components/McpRequestPanel.vue`

### Existing history snapshot hook for MCP state
```typescript
export type HistoryRequestSnapshot = Omit<SendRequestPayload, 'body' | 'bodyType'> & {
  body: string | RequestBodySnapshot
  mcp?: McpRequestDefinition
}
```
Source: `src/types/request.ts:256`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MCP workbench 只支持 initialize/tools | resources、prompts 已接入统一 discovery / result / history / replay 主链路 | Phases 08-09 | roots 应沿同一主链路扩展，而不是另立系统。[VERIFIED: `.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md`][VERIFIED: `.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md`] |
| 把协议能力理解为“都由客户端主动发送” | roots 在官方规范中是客户端能力、服务端通过 `roots/list` 请求来拉取 | 至少在 MCP 2025-11-25 规范中明确如此 | 直接影响 Phase 10 的任务拆分：需要 runtime 回调支持，不只是面板字段。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx] |

**Deprecated/outdated:**
- 把 roots 规划成和 `resources.list` 平级的主动 operation：不符合当前 MCP 规范语义。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 现有 MCP server 测试目标会在看到 `capabilities.roots` 后实际发出 `roots/list`，从而能在本地工作台中完成端到端检查。 | Summary / Common Pitfalls | 若目标 server 不会主动请求 roots，则需要额外测试夹具或 mock server 才能验证 MCPROOT-02。 [ASSUMED] |
| A2 | 第一版可以不实现 `notifications/roots/list_changed` 主动推送，只要 initialize capability 与实际行为保持一致，仍可先完成本 phase 核心目标。 | Common Pitfalls | 若产品把 listChanged 视为必须行为，则计划需追加通知发送与 runtime 事件机制。 [ASSUMED] |

## Open Questions

1. **Phase 10 的“相关 MCP 请求”具体验收口径是什么？**
   - What we know: requirement 写的是“在 roots 相关请求中看到 roots 配置已实际传递给 MCP server”。[VERIFIED: `.planning/REQUIREMENTS.md`]
   - What's unclear: 是必须真实观察到 server 发起的 `roots/list`，还是允许通过本地 mock/runtime 单测证明。
   - Recommendation: 规划时把“真实协议 inspection 能看到 `roots/list`”定为主验收，同时准备 runtime 单测和前端快照测试作为兜底。

2. **`listChanged` 首版设为 `true` 还是 `false`？**
   - What we know: 规范要求若客户端支持 roots，应声明 `roots` capability，`listChanged` 表示是否会发送变化通知。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx]
   - What's unclear: 当前 workbench 是否已有“会话 roots 被修改时通知 server”的 runtime 通道。
   - Recommendation: 若本 phase 不做主动通知，initialize 中应把 `listChanged` 设为 `false`；若设为 `true`，计划必须补通知发送机制并验证。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 前端构建、Vitest、npm registry 核验 | ✓ | 25.7.0 | — |
| npm | registry 版本核验、依赖安装 | ✓ | 11.10.1 | `pnpm` |
| pnpm | 项目脚本、测试与构建 | ✓ | 10.33.0 | `npm` 理论可装依赖，但与仓库习惯不一致 [ASSUMED] |
| cargo | Rust runtime 编译检查 | ✓ | 1.93.1 | — |
| rustc | Tauri / Rust 编译 | ✓ | 1.93.1 | — |
| Tauri CLI | 桌面联调与命令桥验证 | ✓ | 2.10.1 | 仅运行前端单测，无法替代桌面联调 |

**Missing dependencies with no fallback:**
- None.[VERIFIED: local environment]

**Missing dependencies with fallback:**
- None.[VERIFIED: local environment]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | roots 本身不引入认证模型；继续复用现有 MCP connection auth 配置。[VERIFIED: `src/features/mcp-workbench/components/McpRequestPanel.vue`] |
| V3 Session Management | yes | 继续使用现有 `mcp-session-id` session 头处理，并把 roots 绑定到当前 MCP 调试会话。[VERIFIED: `src-tauri/src/core/mcp_runtime.rs:151`][VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`] |
| V4 Access Control | yes | roots 只作为客户端显式声明的可见边界，禁止自动推断或隐式暴露本地路径。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx][VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`] |
| V5 Input Validation | yes | 校验 roots `uri` 非空、建议限制为合法 `file://` URI，`name` 可选且不参与协议关键判断。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx] |
| V6 Cryptography | no | 本 phase 不新增密码学能力。 |

### Known Threat Patterns for MCP roots session config

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 隐式暴露本地文件路径 | Information Disclosure | 仅发送用户显式配置的 roots；不做自动发现、默认填充或目录扫描。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`] |
| 非法 URI 注入协议包 | Tampering | 前端/后端双重校验 `uri` 非空且符合 `file://` 预期，再进入 `roots/list` 响应。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx] |
| roots 与 session 脱节导致错误服务器上下文 | Repudiation / Integrity | 把 roots 绑定到当前 MCP request snapshot 与 protocol inspection，history/replay 一并保留最小快照。[VERIFIED: `src/types/request.ts`][VERIFIED: `src/lib/request-workspace.ts`] |

## Sources

### Primary (HIGH confidence)
- `/modelcontextprotocol/modelcontextprotocol` - 查询了 roots capability、`roots/list`、`notifications/roots/list_changed`、Root object 字段与客户端/服务端语义。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/client/roots.mdx]
- `./AGENTS.md` - 提取项目架构约束、测试要求与分层规范。[VERIFIED: `./AGENTS.md`]
- `.planning/phases/10-mcp-roots-support/10-CONTEXT.md` - 提取 Phase 10 锁定决策与范围。[VERIFIED: `.planning/phases/10-mcp-roots-support/10-CONTEXT.md`]
- `src/types/request.ts` - 确认当前类型边界与 history/replay 快照入口。[VERIFIED: `src/types/request.ts`]
- `src/features/mcp-workbench/components/McpRequestPanel.vue` - 确认 UI 主入口与事件传递模式。[VERIFIED: `src/features/mcp-workbench/components/McpRequestPanel.vue`]
- `src/features/app-shell/composables/useAppShellViewModel.ts` / `src/features/app-shell/state/app-shell-services.ts` - 确认 discover/send/replay 编排边界。[VERIFIED: `src/features/app-shell/composables/useAppShellViewModel.ts`][VERIFIED: `src/features/app-shell/state/app-shell-services.ts`]
- `src-tauri/src/core/mcp_runtime.rs` - 确认现有 session header、协议包构造和 inspection 归档入口。[VERIFIED: `src-tauri/src/core/mcp_runtime.rs`]
- npm registry - 核验 Vue/Vitest/Tauri API 版本与更新时间。[VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 完全基于仓库现有技术栈与 registry 核验结果。
- Architecture: HIGH - 前后端接线点、类型边界和 prior phase 决策都已直接验证。
- Pitfalls: MEDIUM - 大部分来自官方 roots 语义与现有架构交叉推断，端到端 server 行为仍需实现期验证。

**Research date:** 2026-04-07
**Valid until:** 2026-05-07
