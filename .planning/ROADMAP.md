# Milestone v2.0: Local Trust & Execution Foundation

**Status:** 🚧 ACTIVE — Phases 17-18 shipped, 19-20 pending
**Phases:** 17-20
**Total Plans:** 4

## Overview

ZenRequest 已完成并归档 v1.3 `MCP Sampling Debugging`。当前 milestone 不直接追求 multi-server MCP、agent workflow 或生成式主入口，而是先补齐这些能力的底层前提：execution envelope、state ownership、local persistence trust、secret-safe projection、explainable replay。

这个 milestone 的核心目标不是“多做几个新功能”，而是让 ZenRequest 在保持本地优先、轻量、可检查、可回放定位的同时，为下一轮 MCP / Agent-era 能力扩展建立稳定边界。

## Phases

### Phase 17: Execution Model & State Boundary Definition

**Goal**: 定义 shared execution envelope 与 state ownership map，避免继续用 request-centric model 硬承载未来 MCP / agent complexity
**Depends on**: None
**Plans**: 1 plan

Plans:

- [x] 17-PLAN: Execution Model & State Boundary Definition

**Details:**
- 定义 authored input / resolved execution snapshot / result artifact 的边界
- 定义 HTTP / MCP / future agent run 的 shared lifecycle frame
- 划清 durable / cached / ephemeral state ownership
- 记录与当前 request/history/workspace model 的兼容约束

### Phase 18: Persistence Reliability & Recovery Paths

**Goal**: 让本地快照损坏、persisted JSON malformed、startup hydration conflict 等失败路径变得可诊断、可恢复、可测试
**Depends on**: Phase 17
**Plans**: 1 plan

Plans:

- [x] 18-PLAN: Persistence Reliability & Recovery Paths

**Details:**
- browser snapshot corruption detection/reporting
- malformed persisted JSON row detection/reporting
- startup hydration precedence clarification
- safe fallback / repair-guided behavior

### Phase 19: Secret Hygiene & Safe Projection

**Goal**: 建立 secret-safe persistence 与 safe projection baseline，避免未来 replay/export/AI context 路径放大当前 secret leakage 风险
**Depends on**: Phase 18
**Plans**: 1 plan

Plans:

- [ ] 19-PLAN: Secret Hygiene & Safe Projection

**Details:**
- sensitive field inventory
- authoring vs resolved vs safe projection boundary
- redact / exclude / isolate policy
- persistence/export/replay safe default behavior

### Phase 20: Explainable Replay & Diagnostics Foundation

**Goal**: 把 replay/history/diagnostics 从“能重跑”提升到“能解释”，并为 future MCP session context 与 future approval/intervention metadata 预留结构
**Depends on**: Phase 19
**Plans**: 1 plan

Plans:

- [ ] 20-PLAN: Explainable Replay & Diagnostics Foundation

**Details:**
- explainable replay metadata contract
- diagnostics boundary/context surfacing
- extensibility for MCP session-aware replay
- extensibility for future agent-safe inspection flows

---

## Milestone Summary

**Decimal Phases:**

- None

**Key Decisions:**
- 先定义 execution model 与 state boundary，再进入 persistence、secret、replay explainability
- v2.0 期间不扩展为 multi-server MCP UI、完整 agent workflow UX 或通用 AI chat pane
- foundation 优先于表层 feature 扩展，避免继续 patch request-centric model

**Issues Resolved So Far:**
- execution/data model 边界不再继续停留在未定义状态
- startup restore precedence 与 persistence recovery path 已完成第一轮可信化收口

**Issues Still Being Addressed:**
- execution/data model 边界不清
- startup restore precedence 脆弱
- persistence corruption / malformed JSON 可诊断性不足
- secret leakage 风险与 replay explainability 不足

**Issues Deferred:**
- 完整 multi-server MCP management UI
- 完整 agent workflow UX / product surface
- 插件生态 / SDK

**Technical Debt Being Managed:**
- 当前 request/history/workspace 仍承担过多职责，v2.0 采用 adapter-first 渐进迁移而非一次性重写

_Previous milestone archive: `.planning/milestones/v1.3-ROADMAP.md`_
