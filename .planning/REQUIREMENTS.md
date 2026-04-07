# Requirements: ZenRequest

**Defined:** 2026-04-07
**Core Value:** 让开发者以本地优先、快速、可控的方式完成高频 API 调试与工作流操作，而不被臃肿云平台和账号绑定打断。

## v1.1 Requirements

### MCP Resources

- [ ] **MCPR-01**: 开发者可以列出 MCP server 暴露的 resources
- [ ] **MCPR-02**: 开发者可以读取单个 MCP resource，并查看结构化结果与原始协议内容
- [ ] **MCPR-03**: 开发者可以回放 resource 读取请求，并保留足够的上下文用于诊断

### MCP Prompts

- [ ] **MCPP-01**: 开发者可以列出 MCP server 暴露的 prompts
- [ ] **MCPP-02**: 开发者可以为 prompt 输入参数并执行 prompt 获取结果
- [ ] **MCPP-03**: 开发者可以在 prompt 调试过程中查看结构化结果、原始协议包与历史摘要

### MCP Roots

- [ ] **MCPROOT-01**: 开发者可以为当前 MCP 调试会话配置 roots 输入
- [ ] **MCPROOT-02**: 开发者可以在 roots 相关请求中看到 roots 配置已实际传递给 MCP server

### MCP Transport

- [ ] **MCPT-01**: 开发者可以通过 `stdio` 连接并调试单个本地 MCP server
- [ ] **MCPT-02**: 开发者可以在 HTTP 与 `stdio` 两种传输方式下获得一致的工作台主链路体验
- [ ] **MCPT-03**: 开发者在 `stdio` MCP 调试失败时可以看到结构化且可定位的错误信息

## v2 Requirements

### MCP Expansion

- **MCPS-01**: 开发者可以调试 MCP `sampling` 能力，并检查其输入输出与安全边界
- **MCPS-02**: 开发者可以管理多个本地或远端 MCP server，并在它们之间切换、隔离历史和会话

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
| MCP `sampling` | 涉及模型调用与宿主安全边界，超出本 milestone 的单 server MCP 协议扩展重点 |
| 多 MCP server 管理 | 会显著扩大工作台管理复杂度，晚于单 server MCP 扩展收口 |
| 团队协同、云同步、账号体系 | 与本地优先、离线优先、隐私优先定位冲突 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MCPR-01 | Phase 08 | Pending |
| MCPR-02 | Phase 08 | Pending |
| MCPR-03 | Phase 08 | Pending |
| MCPP-01 | Phase 09 | Pending |
| MCPP-02 | Phase 09 | Pending |
| MCPP-03 | Phase 09 | Pending |
| MCPROOT-01 | Phase 10 | Pending |
| MCPROOT-02 | Phase 10 | Pending |
| MCPT-01 | Phase 11 | Pending |
| MCPT-02 | Phase 11 | Pending |
| MCPT-03 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after v1.1 definition*
