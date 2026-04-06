# Phase 5 Research — MCP Workbench Hardening

**Date:** 2026-04-06  
**Status:** Ready for planning

## Goal

基于仓库现有 MCP 首版实现，明确本 phase 最值得优先打透的工作台化方向：独立操作调试、历史/回放上下文、schema/raw 参数一致性，以及 transport/session/tool-call 分层诊断。

## Current Baseline

### Frontend
- `src/features/mcp-workbench/components/McpRequestPanel.vue` 已具备：
  - 独立 MCP request 面板
  - `initialize` / `tools.list` / `tools.call` 三类 operation 选择
  - 工具 schema 驱动结构化表单
  - raw JSON fallback
- `src/features/mcp-workbench/lib/mcp-schema-form.ts` 已具备 object-schema → form fields 转换与结构化参数反解析。
- `src/features/app-shell/state/app-shell-services.ts` 已具备 MCP send、cached tools 保留、history item 写入和基础错误处理。

### Runtime
- `src-tauri/src/core/mcp_runtime.rs` 已具备：
  - MCP over HTTP POST 执行
  - `initialize` / `tools.list` / `tools.call` 的 protocol request 构建
  - `protocol_request` / `protocol_response` / `selected_tool` 返回
  - HTTP status>=400 时设置 `error_category = transport`
- 当前缺口：
  - 没有显式 session 层语义
  - `tools.call` 的 tool-level failure 仍缺少更强分类
  - 回放依赖现有 history 模型，但协议上下文摘要与可诊断标签仍偏弱

## Key Gaps Against Requirements

### MCP-01 — 独立目标调试
现状：发送能力已经有，但“稳定调试”仍缺少更清晰的操作态、错误分层与独立可观察反馈。  
结论：应补齐操作级语义，而不是新增更多 operation。

### MCP-02 — 结构化结果、原始协议包、历史摘要与回放
现状：已有 artifact 基础字段，但 history/replay 视角下摘要仍偏薄。  
结论：应把 history snapshot / artifact summary / replay 恢复串起来，保证一次 MCP 调试可以被可靠复看与重放。

### MCP-03 — schema form / raw JSON 双模式
现状：编辑器层已有双模式；风险在于执行前后的参数语义可能漂移，或工具缓存/切换导致 form 状态失真。  
结论：应把 schema/raw 的一致性与缓存恢复纳入 phase，而不是重写输入组件。

### MCP-04 — transport / session / tool-call 错误上下文
现状：Rust 侧只有 transport 粗分类；前端 service 侧仍多半把 MCP 失败当成普通 request send failure。  
结论：这是 Phase 5 的核心增量，需在 DTO / artifact / UI advice 三处一起落地。

## Recommended Technical Direction

### 1. 扩展现有 MCP artifact，而不是新增平行模型
继续以现有 `McpExecutionArtifact` 为核心，补充：
- 更稳定的 operation summary
- session context（例如 initialize 成功后的能力/协商摘要，或 session-not-established）
- tool invocation result summary
- error layer (`transport` / `session` / `tool-call`)

原因：当前前后端已共享 artifact 模型，扩展它的成本和风险最低。

### 2. 在 app-shell service 统一 MCP 历史与错误归一化
`app-shell-services.ts` 已是 HTTP/MCP send 编排中心，适合：
- 统一 MCP 成功后的 history snapshot 写入
- 保留/继承 cached tools 与 selected tool schema
- 在 runtime error + protocol-level error 两侧生成一致的结构化失败信息

原因：符合当前架构边界，也避免把工作台语义分散到组件。

### 3. Rust runtime 负责协议层最小真相
`mcp_runtime.rs` 应继续只负责：
- 协议请求构建
- HTTP 发送
- protocol response 解析
- 基于响应模式提炼基础错误层级与结果摘要

不建议在 Rust 侧引入复杂 session manager 或持久会话层；Phase 5 目标是工作台可诊断，而不是完整多会话运行时。

### 4. UI 重点是“看懂”和“重放”，不是“更复杂”
已有 `McpRequestPanel` 和响应区域基础可复用。UI 上更有价值的增强是：
- 明确显示当前 operation 和错误层级
- 更可靠地展示 raw protocol request/response
- 历史回放时恢复 operation / selected tool / args / artifact summary
- schema/raw 切换与缓存工具列表在回放后仍成立

## Execution Risks

- 若直接为 MCP 新增独立 store/workbench，会破坏现有 request/workbench 统一模型。
- 若把 tool/session 错误只做成 UI 文案，不补 runtime/service 结构化边界，后续测试与回放会继续脆弱。
- 若把 raw protocol 包完整暴露而不做 secret-safe 处理，可能泄露鉴权 header 或 token。
- 若一口气扩展到 stdio / resources / prompts，会稀释本 phase 的主链路目标。

## Planning Recommendations

Phase 5 适合拆成 4 个任务：
1. 强化 MCP operation / history / replay artifact 语义
2. 收敛 schema form / raw JSON / cached tools 的一致性
3. 建立 transport / session / tool-call 错误分类与 advice
4. 用 focused tests 覆盖 MCP request panel、app-shell services、history replay 和 runtime DTO

## Verification Focus

- `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
- `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`
- `src/features/app-shell/state/app-shell-services.test.ts`
- `src/features/app-shell/domain/history-replay.test.ts`
- 相关 request-flow / startup / response panel suite
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Conclusion

Phase 5 最重要的不是“支持更多 MCP 功能”，而是把现有 MCP 首版能力收敛成一个可靠、可复盘、可诊断的工作台。最佳路径是扩展现有 artifact / history / error taxonomy，而不是起新架构。
