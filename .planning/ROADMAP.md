# Roadmap: ZenRequest

**Current milestone:** `v1.3 MCP Sampling Debugging`
**Previous milestone archive:** `v1.2` → `.planning/milestones/v1.2-ROADMAP.md`
**Phases:** 2
**v1.3 Requirements:** 5
**Coverage:** 100%

## Overview

本路线图聚焦在现有单 server MCP 工作台基础上补齐 `sampling` 调试能力，并确保它不是一个割裂的新入口，而是自然融入现有请求构造、结果查看、history / replay / diagnostics 体系中的一部分。

优先顺序遵循：先让 `sampling` 主链路可发起、可查看、可调试，再补齐回放、诊断和状态流一致性。当前 milestone 明确不扩展到多 server 管理，也不同时展开更高层的 agent workflow 产品面。

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 15 | Sampling Request Flow | 把 `sampling` 接入现有单 server MCP 工作台主链路 | MCPS-01, MCPS-02, WBIN-01 | 3 |
| 16 | Replay, Diagnostics, and Fit | 让 `sampling` 融入现有 history / replay / diagnostics 与状态流 | MCPS-03, WBIN-02 | 3 |

## Phase Details

### Phase 15: Sampling Request Flow

**Goal:** 把 `sampling` 接入现有单 server MCP 工作台主链路。

**Requirements:** `MCPS-01`, `MCPS-02`, `WBIN-01`

**Success Criteria:**
1. 用户可以在现有 MCP workbench 中发起 `sampling` 请求
2. 工作台可以展示结构化输入/输出与基础错误信息
3. `sampling` 复用现有 MCP workbench，而不是引入独立平行界面

**UI hint**: yes

### Phase 16: Replay, Diagnostics, and Fit

**Goal:** 让 `sampling` 融入现有 history / replay / diagnostics 与状态流。

**Requirements:** `MCPS-03`, `WBIN-02`

**Success Criteria:**
1. `sampling` 结果可以进入 history / replay
2. 诊断与错误展示沿用现有 MCP 模式
3. `sampling` 的状态与交互模式和现有 MCP workbench 保持一致

**UI hint**: no

## Sequencing Rationale

- 先做 Phase 15，因为如果 `sampling` 还不能稳定发起和查看，就没有意义先做 replay / diagnostics 整合
- 再做 Phase 16，把已跑通的 `sampling` 主链路接入 history / replay / diagnostics，确保体验闭环
- 整个 milestone 保持单 server 范围收敛，避免被多 server 状态管理复杂度拖慢

## Next Command

推荐下一步：`$gsd-plan-phase 15`

---
*Last updated: 2026-04-10 after v1.3 roadmap creation*
