# Phase 11: MCP Stdio Transport - Research

**Researched:** 2026-04-09  
**Domain:** MCP 单 server stdio 传输、会话初始化与错误诊断  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 延续单 server MCP 工作台范围，不扩展到多 server 管理。  
- 继续复用当前 MCP workbench 主链路（request panel / response panel / history / replay），不要为 stdio 单独造一套新工作流。  
- 本 phase 目标是补齐 stdio 传输与错误诊断，而不是扩展新的 MCP 能力面。  

### Claude's Discretion
- stdio 连接配置的具体输入形态（字段拆分、默认值、提示文案）  
- Rust 侧 stdio transport 的实现方式（自管子进程/流，或引入成熟 Rust MCP SDK）  
- 错误诊断信息的结构化字段设计与 UI 呈现深度  

### Deferred Ideas (OUT OF SCOPE)
- 多 MCP server 列表、切换、隔离管理  
- sampling 或其他新增协议能力  
- 云同步、远程托管、团队协作能力
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCPT-01 | 开发者可以通过 `stdio` 连接并调试单个本地 MCP server | 需要新增 stdio 连接配置模型、Rust 子进程 transport、初始化握手与会话持有 |
| MCPT-02 | 开发者可以在 HTTP 与 `stdio` 两种传输方式下获得一致的工作台主链路体验 | 现有 `send_mcp_request` / history / artifact 模型可复用，计划应以 transport 分支而非新链路实现 |
| MCPT-03 | 开发者在 `stdio` MCP 调试失败时可以看到结构化且可定位的错误信息 | 需要分层错误模型：spawn / stdin / stdout / protocol / initialize / operation，并把诊断上下文写入 `mcpArtifact` |
</phase_requirements>

## Summary

当前仓库已经为 MCP 预留了 `stdio` 传输枚举与 capability descriptor，但真实执行链路仍然只有 HTTP。[VERIFIED: codebase grep] `src/types/request.ts` 已定义 `McpTransportKind = 'http' | 'stdio'`，`src-tauri/src/core/runtime_capabilities.rs` 也暴露了 `mcp.stdio`，但其 `availability` 仍是 `reserved`。[VERIFIED: codebase grep]

现有架构对本 phase 很友好：前端通过统一的 `McpRequestDefinition`、`send_mcp_request` 和 `McpExecutionArtifact` 驱动 request panel、response panel、history/replay；`discoverMcpTools/Resources/Prompts` 也是在 `send_mcp_request` 上做 operation 覆盖，而不是独立 transport 通道。[VERIFIED: codebase grep] 因此 Phase 11 应该在“同一 MCP 主链路下补 transport 分支”，而不是再造第二套 stdio workbench。

MCP 官方当前文档明确规定：stdio 场景下由客户端启动子进程，双方通过 stdin/stdout 交换换行分隔的 JSON-RPC 消息；stdout 不能输出非协议内容，stderr 可用于 UTF-8 日志；`initialize` 必须是首个请求，成功后客户端还要发送 `notifications/initialized` 才进入正常请求阶段。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/transports.mdx] [CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/lifecycle.mdx]

**Primary recommendation:** 用现有 `send_mcp_request` 作为统一入口，在 Rust 侧为 `transport=stdio` 增加“短生命周期子进程 + initialize + initialized + operation”的执行分支，并把 spawn/IO/protocol/init 诊断统一回填到 `mcpArtifact`。

## Project Constraints (from CLAUDE.md)

未发现 `./CLAUDE.md` 文件。[VERIFIED: local repo check]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `reqwest` | repo existing | HTTP MCP transport 现有实现 | 已在仓库中承载 MCP HTTP，stdio 需保持并行分支而非替换。[VERIFIED: codebase grep] |
| `tokio::process` | std from Tokio ecosystem | 启动本地 MCP server 子进程并管理 stdin/stdout/stderr | MCP stdio 的标准实现模型就是客户端拉起子进程并经标准流传输。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/transports.mdx] |
| `serde_json` | repo existing | JSON-RPC 编解码 | 当前协议请求/响应构造已建立在 `serde_json::Value` 上，最小改动。[VERIFIED: codebase grep] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `rmcp` | `1.3.0` | Rust MCP SDK，含 `client` 与 `transport-child-process` feature | 如果团队希望减少自管 framing / lifecycle 细节，可考虑引入。[VERIFIED: crates.io via `cargo info rmcp`] |
| `@modelcontextprotocol/sdk` | `1.29.0` | 参考官方 TypeScript client/stdio 行为与字段形态 | 仅作协议/体验参考，不建议为 Tauri 主链路引入 Node 依赖。[VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 手写 stdio 子进程 transport | `rmcp` Rust SDK | SDK 可减少协议细节风险，但会增加依赖接入、抽象适配与学习成本。[VERIFIED: crates.io via `cargo info rmcp`] |
| 统一长连接会话管理 | 每次请求短启一个子进程 | 短启实现更简单、利于 Phase 11 收口，但跨请求 session 不能天然复用，需显式设计历史/重放行为。[ASSUMED] |

**Installation:**
```bash
# 仅当选择引入 Rust MCP SDK 时
cargo add rmcp --features client,transport-child-process
```

**Version verification:**
- `rmcp` `1.3.0`。[VERIFIED: crates.io via `cargo info rmcp`]
- `@modelcontextprotocol/sdk` `1.29.0`，npm 最新发布时间 `2026-03-30`。[VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── features/mcp-workbench/         # MCP request/response UI 与交互
├── lib/tauri-client.ts             # 前端统一 runtime 边界
└── types/request.ts                # MCP transport/config/artifact 类型

src-tauri/
├── src/core/mcp_runtime.rs         # MCP 协议构造与 transport 执行
├── src/services/request_service.rs # send_mcp_request 统一入口
└── src/models/request.rs           # MCP DTO
```

### Pattern 1: 单入口、按 transport 分支
**What:** 保持 `send_mcp_request` 为唯一 MCP 执行入口，在 Rust 侧按 `payload.mcp.connection.transport` 分到 `http` 或 `stdio`。  
**When to use:** Phase 11 全部执行与 discovery 链路。  
**Why:** 当前前端、history、replay、response panel 都已围绕统一入口设计。[VERIFIED: codebase grep]

### Pattern 2: 协议 artifact 优先于 UI 特判
**What:** 把 stdio 诊断写入 `McpExecutionArtifact`，让 response/history/sidebar 继续消费通用 artifact。  
**When to use:** 错误分类、sessionId、protocol request/response、stderr 摘要。  
**Why:** 当前 `ResponsePanel`、`AppSidebar`、history summary 已读取 `mcpArtifact` / `mcpSummary.transport`。[VERIFIED: codebase grep]

### Pattern 3: 初始化握手内聚在 transport executor
**What:** `stdio` executor 内部负责 `initialize` → `notifications/initialized` → 业务 operation，不把生命周期负担泄漏给 Vue 层。  
**When to use:** tools/resources/prompts/roots 所有 stdio 请求。  
**Why:** MCP 官方要求初始化是首请求，成功后还要发 `initialized` 通知。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/lifecycle.mdx]

### Anti-Patterns to Avoid
- **为 stdio 新建独立工作台:** 会破坏 MCPT-02 的“一致主链路”目标。[VERIFIED: requirements + codebase]
- **把 stderr 当协议响应源:** 官方仅允许 stdout 承载 MCP 消息，stderr 仅用于日志。[CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/transports.mdx]
- **跳过 `initialized` 通知:** 某些 server 可能在此后才接受正常请求。[CITED: lifecycle docs]
- **沿用 HTTP `baseUrl` 作为 stdio 唯一配置:** stdio 实际需要 command / args / cwd / env 等进程配置，不能只靠 URL。[ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP 生命周期规则 | 分散在前端按钮逻辑里手动拼流程 | Rust transport executor 内聚处理 | 更符合当前分层，也避免 UI/协议耦合。[VERIFIED: project pattern + official lifecycle] |
| 错误展示字符串 | 零散 `message` 拼接 | 结构化错误层级 + artifact | MCPT-03 需要“可定位”，不是只显示失败文案。[VERIFIED: requirements] |
| 协议字段猜测 | 自造非标准 initialized/stdio 语义 | 跟随 MCP 官方 transport/lifecycle 文档 | 协议兼容性风险高。[CITED: official MCP docs] |

**Key insight:** 本 phase 的核心不是“能启动子进程”而已，而是“把 stdio 纳入现有 MCP 主链路且保留足够诊断上下文”。

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | 已持久化的 `RequestPreset` / `HistoryItem` / `RequestTabState` 都可能存有 `mcp.connection.transport` 与 MCP 配置快照。[VERIFIED: `src/types/request.ts`] | 代码编辑：新增 stdio 配置字段时需保证序列化兼容；若字段新增为 optional，可避免数据迁移。[ASSUMED] |
| Live service config | None — 本 phase 为本地 Tauri 应用内 transport，不涉及外部服务 UI 配置。[VERIFIED: project scope] | 无 |
| OS-registered state | None — 没有发现 OS 注册型服务名或计划任务依赖此 phase。[VERIFIED: project scope] | 无 |
| Secrets/env vars | stdio server 启动若支持 env 注入，将涉及本地环境变量/敏感值传递；仓库当前 MCP 配置模型尚未包含 env 字段。[VERIFIED: `src/types/request.ts`] | 代码编辑：若本 phase 加 env 配置，要明确脱敏与持久化策略；否则先不做。[ASSUMED] |
| Build artifacts | None — 未发现与 stdio transport 绑定的已安装产物。[VERIFIED: repo inspection] | 无 |

## Common Pitfalls

### Pitfall 1: 把 stdio 当成“无状态 HTTP 替身”
**What goes wrong:** 仅发送目标 operation，不做初始化握手。  
**Why it happens:** 复用 HTTP 分支思路过多。  
**How to avoid:** 在 Rust 侧封装完整 `initialize` / `initialized` 流程。  
**Warning signs:** `tools.list` / `resources.list` 立即报 session/initialize 相关错误。

### Pitfall 2: stdout 被日志污染
**What goes wrong:** server 在 stdout 打普通日志，导致 JSON-RPC 解析失败。  
**Why it happens:** 很多本地脚本服务默认 `console.log` 到 stdout。  
**How to avoid:** 诊断中明确区分“非协议 stdout”；引导用户检查 server 日志输出位置。  
**Warning signs:** 首包不是 JSON，或出现多余文本前缀。[CITED: official transport docs]

### Pitfall 3: 诊断只保留最终 message
**What goes wrong:** 用户只看到“stdio failed”，不知道是 spawn、权限、路径、协议、还是初始化失败。  
**Why it happens:** 现有错误模型更偏 HTTP/通用请求。  
**How to avoid:** 为 stdio 引入阶段化 error category / diagnostics payload。  
**Warning signs:** 同一报错无法指导用户修路径、命令、参数或 server 代码。

## Code Examples

### MCP stdio 规则要点
```text
Client launches server subprocess.
Client writes newline-delimited JSON-RPC to stdin.
Server writes newline-delimited JSON-RPC to stdout.
Server may log UTF-8 text to stderr.
Client sends initialize first, then notifications/initialized, then normal operations.
```
Source: official MCP specification transport + lifecycle docs. [CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/transports.mdx] [CITED: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/lifecycle.mdx]

### Current repo integration seam
```ts
sendMcpRequest: (workspaceId, activeEnvironmentId, payload) =>
  activeAdapter.sendMcpRequest(toSendMcpRequestPayloadDto(workspaceId, activeEnvironmentId, payload))

discoverMcpTools: async (payload) => {
  const result = await invokeEnvelope('send_mcp_request', {
    payload: {
      ...payload,
      mcp: {
        ...payload.mcp,
        operation: { type: 'tools.list', input: { cursor: '' } },
      },
    },
  })
}
```
Source: `src/lib/tauri-client.ts`.[VERIFIED: codebase grep]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MCP 先从 HTTP-only 工作台收口 | 官方已把 stdio 作为基础 transport 一等公民 | MCP 近年协议演进中持续明确 | 对本 phase 来说，stdio 不是“实验特性”，而是标准 transport 之一。[CITED: official MCP docs] |

**Deprecated/outdated:**
- “stdio 可跳过 initialize 直接发 tools/list”——未见官方支持，视为错误做法。[CITED: lifecycle docs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 11 适合先采用“每次请求短启一个 stdio 子进程”而不是跨请求长驻 session | Standard Stack / Architecture | 若后续必须跨请求复用 session，需追加会话管理与关闭策略 |
| A2 | 新增 stdio 配置字段可设计为 optional，从而避免历史数据迁移 | Runtime State Inventory | 若现有反序列化/默认值策略不足，旧快照可能恢复失败 |
| A3 | 本 phase 不应引入 env 注入配置，除非用户明确要求 | Runtime State Inventory | 若目标 server 强依赖 env，Phase 11 可能只能覆盖部分本地 server |
| A4 | stdio 配置至少需要 command/args，可能还需要 cwd | Anti-Patterns | 若现有产品希望更极简，UI/存储模型需要再确认 |

## Open Questions

1. **stdio 配置最小字段集是什么？**
   - What we know: `baseUrl` 明显不足以表达 stdio 进程启动。[VERIFIED: codebase + protocol model]
   - What's unclear: 是否要在 Phase 11 就支持 `command + args + cwd + env` 全套。
   - Recommendation: 规划时至少锁定 `command`、`args`、可选 `cwd`；`env` 单列为待确认。

2. **是否引入 `rmcp`？**
   - What we know: `rmcp 1.3.0` 已支持 `client` 与 `transport-child-process` feature。[VERIFIED: crates.io]
   - What's unclear: 与现有自定义 DTO / artifact 模型的接合成本。
   - Recommendation: Plan 里先安排一个技术决策子任务；默认优先“自管最小实现”，若 framing/lifecycle 测试复杂再切 SDK。

3. **stdio session 是否跨请求复用？**
   - What we know: 当前 `send_mcp_request` 是单次调用模型。[VERIFIED: `request_service.rs`]
   - What's unclear: 是否需要让 initialize 产生的 session 持续影响后续 tools/resources/prompts 请求。
   - Recommendation: 计划中明确决定；若不复用，就把 initialize 当内部步骤而不是用户必须先手动运行一次。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 可能用于启动本地 JS MCP server / 前端工具链 | ✓ | `v25.7.0` | — |
| `pnpm` | 前端测试/构建 | ✓ | `10.33.0` | `npm`（有限） |
| `cargo` | Rust 构建与可能新增 crate | ✓ | `1.93.1` | — |
| `rustc` | Rust 编译 | ✓ | `1.93.1` | — |

**Missing dependencies with no fallback:**
- None identified for planning phase.

**Missing dependencies with fallback:**
- None identified for planning phase.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 本 phase 主要是本地进程 transport |
| V3 Session Management | yes | MCP initialize/initialized 生命周期约束 |
| V4 Access Control | no | 单机本地调试场景为主 |
| V5 Input Validation | yes | `command` / `args` / 路径 / JSON-RPC 解析校验 |
| V6 Cryptography | no | stdio 本身不涉及加密，HTTP 分支沿用现状 |

### Known Threat Patterns for MCP stdio

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 启动错误命令或恶意路径 | Elevation of Privilege | 明确显示可执行命令、参数、cwd；避免隐式 shell 包装。[ASSUMED] |
| stdout 注入非协议文本 | Tampering | 严格按 JSON-RPC 解码；解析失败时保留原始 stdout 片段用于诊断。[CITED: official transport docs] |
| stderr 泄漏敏感日志 | Information Disclosure | UI 显示前做截断/脱敏，不默认回显整段敏感环境内容。[ASSUMED] |

## Sources

### Primary (HIGH confidence)
- `/modelcontextprotocol/modelcontextprotocol` - stdio transport、initialize lifecycle、initialized 通知。[VERIFIED: Context7]
- `https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/transports.mdx` - stdio transport 规则。[CITED: official docs]
- `https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/lifecycle.mdx` - initialize / initialized 生命周期。[CITED: official docs]
- `src/types/request.ts` - 现有 MCP transport / artifact / history 类型。[VERIFIED: codebase grep]
- `src/lib/tauri-client.ts` - 统一 `send_mcp_request` 和 discovery 复用方式。[VERIFIED: codebase grep]
- `src-tauri/src/core/runtime_capabilities.rs` - `mcp.stdio` 当前为 `reserved`。[VERIFIED: codebase grep]
- `src-tauri/src/services/request_service.rs` - `send_mcp_request` 当前单入口与 history 写入方式。[VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)
- `cargo info rmcp` - Rust MCP SDK 能力与 feature 集。[VERIFIED: crates.io]
- `npm view @modelcontextprotocol/sdk version time repository.url homepage dist-tags --json` - 官方 TS SDK 最新版本与仓库来源。[VERIFIED: npm registry]

### Tertiary (LOW confidence)
- 无。

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - 协议规则与生态可验证，但本仓库最终选自研还是 `rmcp` 仍待决策
- Architecture: HIGH - 现有代码边界很清晰，统一入口与 artifact 模式已较稳定
- Pitfalls: MEDIUM - 官方协议可验证，但本地 server 真实行为差异仍需实现期验证

**Research date:** 2026-04-09  
**Valid until:** 2026-05-09
