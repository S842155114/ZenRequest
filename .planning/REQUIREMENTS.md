# Requirements: ZenRequest

**Defined:** 2026-04-06
**Core Value:** 让开发者以本地优先、快速、可控的方式完成高频 API 调试与工作流操作，而不被臃肿云平台和账号绑定打断。

## v1 Requirements

### Core Request Flow

- [ ] **CORE-01**: 开发者可以在单个工作区中快速创建、编辑并重复发送 HTTP 请求
- [ ] **CORE-02**: 开发者可以查看响应状态码、耗时、响应头、原始响应和格式化响应内容
- [ ] **CORE-03**: 开发者在重启应用后可以恢复最近工作区、标签页和当前调试上下文
- [ ] **CORE-04**: 开发者在处理大响应体、文件上传和频繁重发时不会遇到明显卡顿、崩溃或历史损坏

### Workspace And Assets

- [ ] **WS-01**: 开发者可以保存请求到 collection，并在 folder / collection 结构中管理常用请求资产
- [ ] **WS-02**: 开发者可以查看、筛选并重新发送历史请求记录
- [ ] **WS-03**: 开发者可以导出与导入本地工作区或关键请求资产，用于备份和迁移
- [ ] **WS-04**: 开发者可以从 cURL 导入请求草稿并继续编辑

### Variables And Auth

- [ ] **VAR-01**: 开发者可以定义并使用环境变量与模板值来复用 base URL、token 和其他参数
- [ ] **VAR-02**: 开发者可以明确理解变量解析优先级，并获得稳定一致的解析结果
- [ ] **AUTH-01**: 开发者可以对请求配置 No Auth、Basic Auth、Bearer Token 与 API Key
- [ ] **AUTH-02**: 开发者在导出、分享或迁移工作区时不会意外泄露敏感 secret 值

### Testing And Reliability

- [ ] **TEST-01**: 开发者可以为请求添加基础断言测试，并在请求执行后查看断言结果
- [ ] **TEST-02**: 开发者在本地数据库损坏、数据恢复失败或历史记录异常时可以得到明确诊断与可执行恢复提示
- [ ] **TEST-03**: 开发者在请求执行、导入或持久化失败时可以看到结构化且可定位的错误信息

### MCP Workbench

- [ ] **MCP-01**: 开发者可以把 MCP Server 作为独立目标进行 `initialize`、`tools.list` 与 `tools.call` 调试
- [ ] **MCP-02**: 开发者可以查看 MCP 调用的结构化结果、原始协议包、历史摘要与回放记录
- [ ] **MCP-03**: 开发者可以在 schema 驱动表单与 raw JSON 之间切换，完成工具参数输入
- [ ] **MCP-04**: 开发者在 MCP 调试失败时可以看到 transport、session 或 tool-call 层面的可定位错误上下文

## v2 Requirements

### MCP Expansion

- **MCPX-01**: 开发者可以调试 MCP resources、prompts、roots、sampling 和更多协议能力
- **MCPX-02**: 开发者可以调试 MCP over stdio，并管理多个本地或远端 MCP server

### AI / Agent Workflows

- **AGNT-01**: 开发者可以基于文档、说明或历史请求生成可编辑请求与测试草稿
- **AGNT-02**: 开发者可以回放和检查 agent tool-call 轨迹，包括输入、schema 快照和输出差异
- **AGNT-03**: 开发者可以运行轻量的混合 HTTP + MCP 场景流，并在本地查看执行轨迹

### Import And Protocols

- **IMPT-01**: 开发者可以从 OpenAPI 导入请求集合并保持较高可编辑性
- **IMPT-02**: 开发者可以导入更多主流 API 工具格式并完成迁移
- **PROT-01**: 开发者可以调试 SSE / WebSocket 等新增协议能力

## Out of Scope

| Feature | Reason |
|---------|--------|
| 强制登录、云同步中心、团队协同平台化能力 | 与本地优先、离线优先、隐私优先定位冲突 |
| 以“对标 Postman 全家桶”为目标的功能追赶 | 会拉高复杂度并削弱产品差异化 |
| 以通用聊天面板为中心的 AI 交互 | 不利于可检查、可编辑、可回放的结构化工作流 |
| 在核心模型稳定前建设大型插件生态或协议全家桶 | 当前阶段应优先夯实主链路、执行引擎与 MCP 工作台 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| WS-01 | Phase 6 | In Progress |
| WS-02 | Phase 2 | Pending |
| WS-03 | Phase 6 | In Progress |
| WS-04 | Phase 2 | Pending |
| VAR-01 | Phase 3 | Completed |
| VAR-02 | Phase 3 | Completed |
| AUTH-01 | Phase 3 | Completed |
| AUTH-02 | Phase 3 | Completed |
| TEST-01 | Phase 4 | Completed |
| TEST-02 | Phase 6 | In Progress |
| TEST-03 | Phase 4 | Completed |
| MCP-01 | Phase 7 | Pending |
| MCP-02 | Phase 5 | Pending |
| MCP-03 | Phase 7 | Pending |
| MCP-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 during Phase 6 execution*
