# Research Summary

**Domain:** local-first desktop API workbench with MCP/Agent direction  
**Summarized:** 2026-04-06

## Stack

ZenRequest 继续沿用当前 `Tauri 2 + Rust + Vue 3 + TypeScript + SQLite` 路线是正确的。对这个产品方向而言，重点不在换技术栈，而在把执行引擎、存储边界、状态恢复、MCP 运行时和本地密钥处理打磨成稳定基础设施。

推荐保持“前端编排 + Rust 执行/存储”的分层，避免把更多运行时策略塞回 `src/features/app-shell/composables/useAppShell.ts` 或零散 UI 组件中。短期不建议引入云同步中心、重量级插件框架或以聊天框为中心的 AI 交互模式。

## Table Stakes

当前研究认为，ZenRequest 所属品类的 2025/2026 基础能力包括：
- 快速 HTTP 请求编排与重发
- Collections / tabs / history / workspace restore
- 环境变量与模板解析
- 常见鉴权方式
- 结构化响应查看
- cURL / OpenAPI / 常见集合导入迁移能力
- 基础断言测试
- 本地导出与恢复
- 离线持久化可靠性
- 大 payload 场景稳定性

其中最关键的不是继续堆表层功能，而是补强离线持久化恢复、环境解析可靠性、历史模型与大响应稳定性。

## Differentiators

最适合 ZenRequest 的差异化方向有：
- First-class MCP server workbench
- Agent-safe tool-call replay and inspection
- Prompt/docs/spec → request/test generation with human review
- Local-first secret hygiene
- Workspace-level execution traces
- File-backed, git-friendly export flows
- Lightweight mixed HTTP + MCP scenario runner
- Corruption diagnostics and self-repair UX

这些方向都建立在一个前提上：先把内部资产模型、执行链路和状态边界稳定下来，再往 AI / Agent 能力扩展。

## Watch Out For

最重要的风险点包括：
- UI 状态编排继续膨胀，侵蚀清晰分层
- 把 HTTP 请求历史、MCP 调试记录、Agent 运行轨迹混成一个模型
- 环境变量、密钥与导出边界不清导致隐私泄露
- 在核心稳定前过早扩展 OpenAPI / Postman / 多协议全家桶
- MCP 调试只做 happy path，缺少 transport/session/错误可观测性
- 追求“像 Postman 一样全”而削弱本地优先与 AI 工作台定位

## Recommendation

建议路线应优先围绕三件事展开：
1. 加固本地持久化、状态恢复和大 payload 处理，确保本地优先承诺可信
2. 把 HTTP 调试主链路与集合/环境/历史体验打磨到日常可替代级别
3. 把 MCP 从“已支持基础调用”升级到真正的调试工作台，再逐步进入 Agent-era 工作流能力

## Sources

- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
