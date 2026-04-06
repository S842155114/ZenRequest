# Roadmap: ZenRequest

**Created:** 2026-04-06
**Project:** ZenRequest
**Phases:** 7
**v1 Requirements:** 19
**Coverage:** 100%

## Overview

本路线图以“先把开发者每天真会用的主链路打透，再强化 MCP 工作台”的顺序展开。阶段划分遵循 coarse granularity：每个 phase 聚焦一个清晰目标，避免并行引入过多变化点。

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Core Flow Hardening | 把 HTTP 调试主链路与状态恢复打磨到稳定可日用 | CORE-01, CORE-02, CORE-03, CORE-04 | 4 |
| 2 | Workspace Assets | 让集合、历史、导入导出与迁移链路稳定可依赖 | WS-01, WS-02, WS-03, WS-04 | 4 |
| 3 | Variables And Secrets | 稳定环境解析与鉴权能力，并补齐本地 secret 边界 | VAR-01, VAR-02, AUTH-01, AUTH-02 | 4 |
| 4 | Reliability And Assertions | 把测试、诊断与错误处理收敛成可信工作流 | TEST-01, TEST-02, TEST-03 | 3 |
| 5 | MCP Workbench Hardening | 把 MCP 首版能力升级为可诊断、可回放的工作台 | MCP-01, MCP-02, MCP-03, MCP-04 | 4 |

## Phase Details

### Phase 1: Core Flow Hardening

**Goal:** 把请求编辑、响应查看、会话恢复和大 payload 稳定性打磨到“开发者愿意日常打开使用”的基线。

**Requirements:** `CORE-01`, `CORE-02`, `CORE-03`, `CORE-04`

**Success Criteria:**
1. 开发者可以稳定创建、编辑并重复发送 HTTP 请求，且高频交互保持流畅
2. 响应面板可以可靠展示状态码、耗时、响应头、原始内容和格式化内容
3. 应用重启后，最近工作区、标签页和调试上下文可以正确恢复
4. 大响应体、文件上传和历史写入不会导致明显卡顿、崩溃或数据损坏

**UI hint**: yes

### Phase 2: Workspace Assets

**Goal:** 让 collection、history、导入导出和迁移路径从“可用”提升到“可依赖”。

**Requirements:** `WS-01`, `WS-02`, `WS-03`, `WS-04`

**Success Criteria:**
1. 开发者可以在 collection 结构中稳定保存和管理请求
2. 历史记录支持查看、重发与基本筛选，且不会与其他执行模型混淆
3. 工作区或关键请求资产可以完成可靠导入导出，用于备份与迁移
4. cURL 导入生成的请求草稿在主要字段上可编辑且行为稳定

**UI hint**: yes

### Phase 3: Variables And Secrets

**Goal:** 收敛变量解析、鉴权配置和 secret 边界，让本地优先与隐私优先承诺成立。

**Requirements:** `VAR-01`, `VAR-02`, `AUTH-01`, `AUTH-02`

**Success Criteria:**
1. 开发者可以配置并复用环境变量，且解析结果在不同入口保持一致
2. 变量优先级和覆盖行为可预测，不会因状态恢复或切换导致错乱
3. 常见鉴权方式可以完整覆盖主流 API 调试场景
4. 导出、迁移或分享流程默认避免 secret 明文泄露

**UI hint**: yes

### Phase 4: Reliability And Assertions

**Goal:** 为请求测试、错误诊断和本地数据恢复建立可信基础。

**Requirements:** `TEST-01`, `TEST-02`, `TEST-03`

**Success Criteria:**
1. 开发者可以给请求添加基础断言，并在执行后获得清晰结果
2. 当持久化、恢复或导入链路失败时，界面提供结构化、可行动的错误信息
3. 本地数据库或历史记录异常时，应用能提供诊断与恢复建议，而不是静默降级

**UI hint**: yes

### Phase 5: MCP Workbench Hardening

**Goal:** 把现有 MCP 首版能力升级为真正可调试、可回放、可定位错误的工作台。

**Requirements:** `MCP-01`, `MCP-02`, `MCP-03`, `MCP-04`

**Success Criteria:**
1. 开发者可以稳定调试 `initialize`、`tools.list` 与 `tools.call` 全流程
2. MCP 历史与回放保留足够的协议上下文，便于重复分析问题
3. 工具参数输入支持 schema 驱动表单与 raw JSON 双模式，并保持一致行为
4. MCP 调试失败时可以区分 transport、session 和 tool-call 层面的错误来源

**UI hint**: yes


### Phase 6: Workspace, Recovery And Audit Closure

**Goal:** 补齐工作区资产层级、恢复闭环与缺失验证工件，让 v1 进入可归档状态。

**Requirements:** `WS-01`, `WS-03`, `TEST-02`

**Success Criteria:**
1. collection / folder 结构具备可验证的稳定管理闭环，`WS-01` 不再停留在部分实现
2. 导入导出/迁移冲突与数据库或历史异常恢复路径具备更完整的用户可见闭环
3. Phase 3 和 Phase 4 缺失的 `SUMMARY.md` / `VERIFICATION.md` 归档工件补齐
4. `REQUIREMENTS.md` 的 traceability 与实际交付状态重新对齐，为 milestone re-audit 做好准备

**UI hint**: yes

### Phase 7: MCP Workbench And Audit Closure

**Goal:** 收敛 MCP tools discovery、错误 taxonomy 与缺失工件，让 MCP 工作台通过 milestone 归档审计。

**Requirements:** `MCP-01`, `MCP-03`, `MCP-04`

**Success Criteria:**
1. MCP tools discovery 在非测试应用流中具备清晰、稳定的显式链路
2. schema/raw 参数输入与 tools cache 生命周期在发现、调用、回放之间保持一致
3. transport / session / tool-call taxonomy 在 runtime、service、UI 三层命名一致
4. Phase 5 缺失的 `SUMMARY.md` / `VERIFICATION.md` 归档工件补齐，并支撑 milestone re-audit

**UI hint**: yes

## Sequencing Rationale

- 先做 Phase 1，因为“快、稳、可恢复”是产品核心价值的直接体现
- Phase 2 和 Phase 3 分别收敛资产模型与变量/secret 边界，避免后续 MCP 与 AI 能力建立在脆弱基础上
- Phase 4 在进入更复杂工作台前先补足断言、诊断和恢复能力
- Phase 5 再集中打磨 MCP 工作台，避免 MCP 扩展与底层不稳定问题相互叠加
- Phase 6 和 Phase 7 作为 milestone audit gap closure phases，分别收敛工作区/恢复闭环与 MCP/归档闭环

## Next Command

推荐下一步：`$gsd-plan-phase 6`

---
*Last updated: 2026-04-06 after milestone gap planning*
