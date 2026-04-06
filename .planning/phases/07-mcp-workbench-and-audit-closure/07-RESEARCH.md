---
phase: 07
phase_name: MCP Workbench And Audit Closure
research_type: implementation
status: complete
created: 2026-04-06
---

# Phase 7 Research

## Research Question

如何在不扩 scope、不重做 MCP 架构的前提下，收敛 ZenRequest 当前 MCP 工作台剩余的 discovery continuity、schema lifecycle、taxonomy drift 与 archive-proof gap，使 `MCP-01`、`MCP-03`、`MCP-04` 达到 milestone audit 可归档状态？

## Findings

### 1. 显式 discovery seam 已存在，但主链路语义还不够清晰
- `src/lib/tauri-client.ts` 已暴露 `discoverMcpTools(...)`，且实现方式是以 `send_mcp_request` 包装一次 `tools.list` 请求并提取返回的 tools。
- `src/features/app-shell/state/app-shell-services.ts` 已提供 `discoverMcpTools` service，说明“显式发现”在架构上已有预留，不需要新建系统。
- 目前审计之所以仍认为 `MCP-01` 部分闭合，核心不是缺少 capability，而是非测试主链路里“发现工具”不是一个足够明确的产品步骤。

**Planning implication:** Phase 7 应优先把 discovery 接回编辑/发送主链路，形成用户可见的“发现/刷新工具”语义，而不是继续堆 runtime 能力。

### 2. 当前 panel 仍然把 schema 真相部分建立在历史 artifact / request snapshot 上
- `src/features/mcp-workbench/components/McpRequestPanel.vue` 中 `availableTools` 优先取 `mcpArtifact.cachedTools`，否则退回 `protocolResponse.result.tools`。
- `selectedToolSchema` 又优先取 `props.mcp.operation.input.schema`，否则再从 `availableTools` 中查找。
- `src/lib/request-workspace.ts` 会复制 request 内的 `schema` 与 response artifact 内的 `selectedTool` / `cachedTools`，说明“历史快照携带 schema”已被编码进当前模型。

**Risk:** 如果不明确“当前编辑态以最新 discovery 为准”，回放打开旧 tab 时很容易继续沿用旧 schema，导致 `MCP-03` 虽可用但生命周期语义不稳定。

**Planning implication:** Phase 7 应把“最新 discovery 为当前编辑真相，历史 schema 仅用于回放/参考”的规则落到 panel + service/store 协作上。

### 3. taxonomy 漂移的最佳收口点仍是 service 层
- Rust `src-tauri/src/core/mcp_runtime.rs` 当前会根据 HTTP 状态码与协议包内容给出 `error_category`，但类型仍包含旧值：`initialize`、`tool_execution` 等。
- `src/types/request.ts` 中 `McpExecutionArtifact.errorCategory` 也还保留旧 union：`'transport' | 'session' | 'protocol' | 'tool-call' | 'initialize' | 'tool_execution'`。
- `src/features/app-shell/state/app-shell-services.ts` 已在 send success 路径中做 `normalizeMcpErrorCategory(...)`，Phase 6 也已经在 UI 标题侧把 `session` / `tool-call` 收拢了一部分。

**Planning implication:** Phase 7 不应把“最终错误语义”下放给 UI 或完全交给 runtime；最稳妥方案是 service 层成为唯一产品语义归一化点，并把类型定义、store 数据、UI 文案同步到同一词汇表。

### 4. runtime 侧 discovery 不需要新 transport，只需要沿用现有请求模型
- `src-tauri/src/core/mcp_runtime.rs` 已支持 HTTP MCP 请求、SSE-style 单次响应解析、session header 透传与基础 error 分类。
- 当前 Phase 7 范围内并不需要引入长连接 discovery、tool registry 或持久化 cache 系统。

**Planning implication:** discovery continuity 应尽量建立在既有 `tools.list`、`sessionId`、artifact/cachedTools 结构之上，只做最小状态编排与语义补齐。

### 5. Phase 5 archive-proof gap 是文档/证据缺失，不是要重做 Phase 5
- 审计明确指出 `.planning/phases/05-mcp-workbench-hardening/` 缺少 `05-SUMMARY.md` 和 `05-VERIFICATION.md`。
- `05-UAT.md`、`05-CONTEXT.md`、`05-PLAN.md`、`05-GAPS-PLAN.md` 已存在，可作为回填依据。

**Planning implication:** Phase 7 必须包含一个“忠于已 ship 事实”的 artifact backfill 任务，但不能把它写成新的 MCP 能力交付。

## Recommended Planning Shape

建议将 Phase 7 拆成 4 个任务：
1. **显式 discovery 主链路闭环**：让 `tools.list` 成为 MCP workbench 中清晰、可重复触发的产品动作，并补齐相关测试。
2. **schema 生命周期收口**：确保当前编辑态以最新 discovery 为准，历史/回放 schema 只作参考，不再反向主导当前编辑语义。
3. **taxonomy 统一**：把 runtime/service/UI/类型定义统一到 `transport` / `session` / `tool-call` 等稳定词汇，service 层为最终产品语义来源。
4. **Phase 5 archive-proof 回填与 traceability 准备**：补 `05-SUMMARY.md` / `05-VERIFICATION.md`，并让后续 re-audit 容易引用证据。

## Verification Implications

建议验证组合：
- focused Vitest：
  - `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
  - `src/features/app-shell/state/app-shell-services.test.ts`
  - `src/components/response/ResponsePanel.test.ts`
  - 与 MCP history/replay 相关的 suite（若当前已有）
- `cargo check --manifest-path src-tauri/Cargo.toml`
- 如 Phase 7 改动涉及前端主链路较多，最后再跑一次更宽的 MCP/workbench focused suite，而不必一上来跑全量

## Non-Goals

- 不扩到 `stdio`
- 不新增 resources/prompts/roots/sampling
- 不引入新的 MCP registry / server manager / 持久化 cache 子系统
- 不重做整个 MCP panel 或请求模型

## Research Conclusion

Phase 7 的最佳实现路线不是“继续做更多 MCP 能力”，而是把**已有 capability 变成稳定、可解释、可审计的工作台主链路**：
- discovery 变成显式产品步骤
- 当前编辑态以最新 discovery schema 为真相
- service 层成为 taxonomy 唯一产品语义来源
- 用最小、忠于事实的方式补齐 Phase 5 归档证据

## RESEARCH COMPLETE
