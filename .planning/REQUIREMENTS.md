# Requirements: ZenRequest

**Defined:** 2026-04-10
**Core Value:** 让开发者以本地优先、快速、可控的方式完成高频 API 调试与工作流操作，而不被臃肿云平台和账号绑定打断。

## v1.3 Requirements

### MCP Sampling

- [ ] **MCPS-01**: 开发者可以调试 MCP `sampling` 能力，并检查其输入输出与安全边界
- [ ] **MCPS-02**: 开发者可以在工作台中查看 `sampling` 请求的结构化结果与诊断信息
- [ ] **MCPS-03**: 开发者可以像其他 MCP 操作一样保留 `sampling` 的 history / replay 体验

### Workbench Integration

- [ ] **WBIN-01**: `sampling` 应集成到现有单 server MCP 工作台，而不是引入独立工作流界面
- [ ] **WBIN-02**: `sampling` 交互应遵循当前 MCP 工作台的状态、错误处理与展示模式

## v2 Requirements

### Multi-Server MCP

- **MCPS-04**: 开发者可以管理多个本地或远端 MCP server，并在它们之间切换、隔离历史和会话

### AI / Agent Workflows

- **AGNT-01**: 开发者可以基于文档、说明或历史请求生成可编辑请求与测试草稿
- **AGNT-02**: 开发者可以回放和检查 agent tool-call 轨迹，包括输入、schema 快照和输出差异
- **AGNT-03**: 开发者可以运行轻量的混合 HTTP + MCP 场景流，并在本地查看执行轨迹

## Out of Scope

| Feature | Reason |
|---------|--------|
| 多 MCP server 管理层 | 当前 milestone 优先把单 server `sampling` 调试打透，避免同时扩大状态管理复杂度 |
| 大范围 agent workflow 编排 UI | 当前优先解决 MCP `sampling` 工作台能力，而非同时建设更高层工作流产品面 |
| 为 `sampling` 单独新建一套平行工作台 | 应优先复用已有 MCP workbench 的交互、诊断与回放模式 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MCPS-01 | Phase 15 | Pending |
| MCPS-02 | Phase 15 | Pending |
| MCPS-03 | Phase 16 | Pending |
| WBIN-01 | Phase 15 | Pending |
| WBIN-02 | Phase 16 | Pending |

**Coverage:**
- v1.3 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after v1.3 initial definition*
