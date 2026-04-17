# Phase 17 Research — Execution Model & State Boundary Definition

**Phase:** 17  
**Date:** 2026-04-15  
**Status:** Ready for planning

## Research Goal

为 Phase 17 提供可直接进入 planning 的技术与架构研究基础，围绕以下问题收敛：
- 如何把 `execution` 定义为高于 `request` 的统一顶层实体
- 如何在不破坏现有分层的前提下切分 `authored input` / `resolved execution snapshot` / `result artifact`
- 如何为 durable / cached / ephemeral state 建立现实可落地的 ownership map
- 如何在保留兼容性的同时，停止继续膨胀 `request-centric shape`

## Inputs Reviewed

- `.planning/phases/17-execution-model-state-boundary/17-CONTEXT.md`
- `.planning/phases/17-execution-model-state-boundary/17-PLAN.md`
- `.planning/phases/17-execution-model-state-boundary/17-REVIEWS.md`
- `.planning/v2.0-REQUIREMENTS.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/FEATURES.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONVENTIONS.md`

## Key Findings

### 1. 当前代码现实已经要求引入 execution 顶层主语

现有代码与 milestone 目标都表明，继续把 HTTP、MCP、history、replay、diagnostics、future agent metadata 叠加到 `request` 形态上，只会加剧当前职责混装：

- `src/lib/request-workspace.ts` 已同时承担 request snapshot shaping、clone、sanitization、ID 生成、MCP snapshot shaping、browser persistence 等职责
- startup hydration 当前横跨 browser local snapshot 与 SQLite bootstrap payload，truth boundary 不清
- history / request / environment repository 依赖 loosely typed JSON columns，并通过 permissive fallback 吞掉部分坏数据
- v1.3 已让 MCP `sampling` 进入 history / replay / diagnostics 主链路，进一步暴露 request-centric shape 的解释力不足

**结论：** `execution` 作为顶层实体不是“未来设计偏好”，而是当前 request/history/workspace 继续膨胀前必须补上的结构边界。

### 2. Shared envelope 必须是“最小共享顶层 + protocol-specific sections”

从 codebase concern、phase context 和 v2.0 requirements 综合看，真正需要统一的是 lifecycle frame，而不是把所有协议压成一个看似统一的超大 DTO。

合理的 shared frame 应至少覆盖：
- execution identity / linkage
- execution type
- authored input container
- resolved execution snapshot container
- result artifact container
- lifecycle status / timing / diagnostics linkage

而以下内容不应一开始就上升为超宽顶层字段：
- HTTP 特定配置细节
- MCP session/runtime 特定上下文
- future agent-specific action payload
- replay explainability 细项的完整展开

**结论：** 顶层保持最小共享语义，协议差异留在各自 section 中，才能既贴近当前代码现实，又避免再次形成新的“万能 DTO”。

### 3. Replay 的可信主语必须从 request 草稿转向 resolved snapshot

ZenRequest 当前已不只是“发送请求工具”，而是在向可回放、可解释、本地可信的 workbench 演进。对于这种产品方向：

- 只保留 authored request intent，不足以解释一次 execution 真正发生了什么
- 特别是 MCP 与 future agent-oriented execution，会依赖运行期 context、session、resolved values、capability boundary
- 如果 replay 仍只围绕原始 authored input，replay fidelity 和 explainability 都会继续不足

**结论：** replay 必须采用双轨保存：
- `authored input` 作为用户可读意图与编辑来源
- `resolved execution snapshot` 作为可信 replay 与 explainability 主语

### 4. State ownership 的关键不是“存多少”，而是“谁是 truth”

来自 `.planning/codebase/CONCERNS.md` 与现有 app-shell / bootstrap 结构的共同信号是：

- browser snapshot 可以帮助 UX，但不能再作为 durable truth
- backend / SQLite 更适合作为 authoring assets 与 execution records 的 durable truth
- runtime cache 与临时 UI / session internals 需要被明确地从 durable state 中分离出去

建议的 ownership 落点：
- **durable**：authoring assets、核心 execution/history/replay records、必要 diagnostics metadata
- **cached**：browser convenience snapshot、可重建 discovery/cache surfaces、部分 UI convenience state
- **ephemeral**：UI 瞬时态、runtime handles、连接态、临时 MCP session internals、未定义稳定语义的临时上下文

**结论：** startup restore 必须采用 backend durable 优先，browser snapshot 仅补 cached state 的 precedence。

### 5. 兼容策略必须是 adapter-first，而不是一次性替换

虽然 `execution` 应成为顶层主语，但当前代码库已经围绕 request/history/workspace 形成大量稳定路径：
- 前端状态组织
- Tauri command DTO
- Rust services / repositories
- replay/history persistence

直接切换到“全面替换”为时过早，且与本 phase “定义边界，不做大规模迁移”的范围冲突。

更现实的做法是：
- 将当前 `request/history/workspace` 整体视为“兼容层 + 可迁移资产”
- 明确写下红线：禁止继续给 `request-centric shape` 新增 execution / replay / diagnostics / persistence policy 语义
- 通过 adapter 与 compatibility note 把旧结构暂时保住
- 将真正的数据模型收缩和 contract change 留给后续 phase 逐步消化

**结论：** adapter-first 渐进迁移与当前 repo 现实、风险约束和 v2.0 sequencing 最一致。

## Risks to Carry into Planning

### Risk 1 — 规划文档继续停留在抽象层
如果 planner 只写概念，不把 envelope / ownership / compatibility 映射到具体代码触点，后续 phases 仍然无法执行。

### Risk 2 — 计划偷渡实现范围
如果 planner 在 Phase 17 中引入 schema migration、secret storage implementation、recovery UX implementation、replay structure rewrite，会直接越界。

### Risk 3 — 兼容约束不够硬
如果计划没有把“禁止继续扩展 request-centric shape”写成硬约束，Phase 18/19/20 很可能再次回到 optional-field patching。

## Planning Implications

Planner 应至少产出一个可执行的文档化 phase 计划，覆盖这些工作包：

1. **Request-centric 现状盘点**
   - 识别当前 request/history/workspace 混装职责
   - 标记 authored / resolved / result / UI-only state 的错位点

2. **Startup / persistence ownership 盘点**
   - 梳理 browser snapshot / SQLite durable / runtime cache 现状边界
   - 写出 precedence rule v1

3. **Execution envelope v1 设计文档**
   - 顶层字段最小集合
   - protocol-specific sections 的容纳方式
   - HTTP / MCP / future agent execution 的 shared lifecycle frame

4. **State ownership map v1**
   - durable / cached / ephemeral 分类
   - startup restore precedence
   - 不得持久化的 state inventory（至少是类别级）

5. **Compatibility & migration constraints note**
   - 当前结构中哪些是长期资产，哪些是 adapter-only
   - 明确红线：禁止继续扩展 request-centric shape
   - 后续 phase 可消化的 dependency edges

6. **Handoff summary for phases 18-20**
   - 给 Phase 18：persistence / corruption / restore 输入
   - 给 Phase 19：secret-safe projection 输入
   - 给 Phase 20：replay / diagnostics explainability 输入

## Recommended Output Shape for Planning

本 phase 更适合产出 **1 个主执行计划 + 4 个设计文档交付物**，而不是拆成多个并行代码实现计划。理由：
- 这是 foundation definition phase，不是 feature implementation phase
- 多 plan 并行价值低，反而容易造成文档边界不一致
- 更重要的是顺序：先盘点 → 再设计 envelope / ownership → 再写 compatibility/handoff

建议 planner 生成：
- `17-PLAN.md` — 主计划，串联整个 definition workflow
- 并在任务中要求产出：
  - `17-execution-envelope-design.md`
  - `17-state-ownership-map.md`
  - `17-compatibility-constraints.md`
  - `17-summary.md`

## Recommendation

进入 planning 时，应把 Phase 17 视为一个 **文档化架构收敛 phase**：
- 输出必须足够具体，能约束后续实现
- 但不能偷渡到 Phase 18/19/20 的实现范围
- 成功标准不是“代码已重构”，而是“边界、ownership、compatibility、handoff 已经被写清且可执行”

---

*Research completed for Phase 17 on 2026-04-15.*
