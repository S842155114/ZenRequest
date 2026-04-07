# Roadmap: ZenRequest

**Current milestone:** `v1.1 MCP Expansion`
**Previous milestone archive:** `v1.0` → `.planning/milestones/v1.0-ROADMAP.md`
**Phases:** 4
**v1.1 Requirements:** 11
**Coverage:** 100%

## Overview

本路线图聚焦把 ZenRequest 从“已有 MCP tools 工作台”扩展为“单 server MCP 协议工作台”。优先顺序遵循先协议能力、再会话输入、后传输收口：先把 resources / prompts 做成可检查、可回放的主链路，再补 roots 这种会话输入能力，最后用 stdio 传输把 MCP 从 HTTP-only 扩展到更接近真实开发场景的传输面。

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 08 | MCP Resources Workbench | 把 resources 查询与读取接入现有 MCP 工作台主链路 | MCPR-01, MCPR-02, MCPR-03 | 3 |
| 09 | MCP Prompts Workbench | 把 prompts 列表、参数输入和结果查看纳入 MCP 工作台 | MCPP-01, MCPP-02, MCPP-03 | 3 |
| 10 | MCP Roots Support | 让 roots 成为当前 MCP 调试会话的一等输入配置 | MCPROOT-01, MCPROOT-02 | 2 |
| 11 | MCP Stdio Transport | 为单 server MCP 工作台补齐 stdio 传输与错误诊断 | MCPT-01, MCPT-02, MCPT-03 | 3 |

## Phase Details

### Phase 08: MCP Resources Workbench

**Goal:** 把 resources 查询与读取接入现有 MCP 工作台主链路。

**Requirements:** `MCPR-01`, `MCPR-02`, `MCPR-03`

**Success Criteria:**
1. 开发者可以在 MCP 工作台中列出并选择 resources
2. resource 读取结果同时保留结构化内容与原始协议上下文
3. resources 历史与回放保留足够上下文供后续诊断

**UI hint**: yes

### Phase 09: MCP Prompts Workbench

**Goal:** 把 prompts 列表、参数输入和结果查看纳入 MCP 工作台。

**Requirements:** `MCPP-01`, `MCPP-02`, `MCPP-03`

**Success Criteria:**
1. 开发者可以列出 prompts 并选择目标 prompt
2. prompt 参数输入与执行结果查看形成稳定主链路
3. prompt 调试结果支持结构化查看、原始协议检查与历史回放

**UI hint**: yes

### Phase 10: MCP Roots Support

**Goal:** 让 roots 成为当前 MCP 调试会话的一等输入配置。

**Requirements:** `MCPROOT-01`, `MCPROOT-02`

**Success Criteria:**
1. 开发者可以在工作台中配置当前会话 roots
2. roots 配置会随相关 MCP 请求实际传递并可被检查

**UI hint**: yes

### Phase 11: MCP Stdio Transport

**Goal:** 为单 server MCP 工作台补齐 stdio 传输与错误诊断。

**Requirements:** `MCPT-01`, `MCPT-02`, `MCPT-03`

**Success Criteria:**
1. 开发者可以配置并连接单个本地 stdio MCP server
2. stdio 与 HTTP 两种传输方式在工作台主链路上保持一致体验
3. stdio 失败时可看到结构化、可定位的诊断上下文

**UI hint**: yes

## Sequencing Rationale

- 先做 Phase 08，因为 resources 是 MCP 协议扩展里最直接的“列出 → 读取 → 检查”工作流，最适合沿用现有 workbench 模式
- 再做 Phase 09，把 prompts 作为第二类可交互协议能力接入，复用列表、参数输入与结果展示经验
- Phase 10 单独收 roots，是为了把“会话输入配置”与“协议能力面”拆开，降低耦合
- 最后做 Phase 11，把 stdio 作为传输层收口；这样前面 resources/prompts/roots 的 UI 与语义模型可以先基于现有 workbench 定型

## Next Command

推荐下一步：`$gsd-discuss-phase 08`

---
*Last updated: 2026-04-07 after v1.1 roadmap creation*
