# Phase 18 Research — Persistence Reliability & Recovery Paths

**Phase:** 18  
**Date:** 2026-04-15  
**Status:** Ready for planning

## Research Goal

为 Phase 18 提供可直接进入 planning 的技术和架构研究基础，围绕以下问题收敛：
- 如何在不改变 Phase 17 基础边界的前提下，让 local snapshot corruption、persisted JSON malformed、startup hydration conflict 变得可诊断、可恢复、可测试
- 如何把恢复优先级、自动隔离、提示层次和 repair-guided behavior 落到现有 app-shell / runtime / repository 结构上
- 如何避免继续依赖 permissive fallback 和 silent reset

## Inputs Reviewed

- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md`
- `.planning/phases/17-execution-model-state-boundary/17-summary.md`
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md`
- `.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/research/ARCHITECTURE.md`
- `src/lib/request-workspace.ts`
- `src/features/app-shell/composables/useAppShell.ts`
- `src-tauri/src/services/bootstrap_service.rs`
- `src-tauri/src/storage/repositories/request_repo.rs`
- `src-tauri/src/storage/repositories/history_repo.rs`
- `src-tauri/src/storage/repositories/workspace_repo.rs`

## Key Findings

### 1. 当前问题不是“没有 fallback”，而是 fallback 太静默

现有代码已经有一些降级与 fallback 行为，但缺乏可解释性与可诊断性：

- `src/lib/request-workspace.ts` 中的 local snapshot 读取在 malformed 或结构不合法时会回退到空 / null 类结果
- repository 层的 JSON 列持久化依赖 permissive fallback，使坏数据更像“合法空状态”而不是可诊断异常
- `useAppShell.ts` 已经具备 `startupState = degraded` 和 `startupErrorMessage` 这样的前台表达入口，但现阶段还不足以承载系统化恢复信息

**结论：** Phase 18 的核心不是重新发明 fallback，而是把 fallback 从“静默吞掉”升级成“显式检测、最小隔离、可见提示、可测试”。

### 2. Phase 17 已经决定了恢复 truth model

上游 Phase 17 已锁定几个对 Phase 18 至关重要的前提：

- backend durable state 是 primary truth source
- browser local snapshot 是 cache，不是 truth
- startup restore precedence 固定为 backend durable first
- request-centric shape 不允许继续承载新的恢复/persistence policy 语义

**结论：** Phase 18 不需要再讨论“该信谁”，而是需要把已有 truth model 落地成恢复规则和异常处理路径。

### 3. 恢复策略最适合做成“分级 + 最小隔离”

从 `.planning/codebase/CONCERNS.md` 和当前代码触点综合看，最合适的恢复模型不是单一策略，而是分级处理：

- browser snapshot corruption：属于 cache 层，适合自动降级恢复
- 单条 persisted JSON row malformed：适合按最小受影响单元隔离，并明确提示受影响范围
- 如果 durable truth 主结构失去可信性：需要升级为更强提示，甚至局部阻断相关路径

**结论：** 分级恢复 + 最小受影响单元隔离，既能保住 UX，又能避免“为了救一条坏数据伤及整批数据”。

### 4. 前台提示需要建立在现有 app shell degraded 路径上

`useAppShell.ts` 已经具备 degraded startup 的表达起点，这意味着：
- 全局提示可以通过 app shell startup / runtime 状态通道承接
- 受影响区域的局部提示可以在 workspace / tab / history 相关 view-model 或 selector 路径里注入

Phase 18 不需要新建一套完全独立的恢复系统 UI，而应优先利用现有 app shell 状态表达路径。

**结论：** 前台提示最适合沿用 app shell runtime/startup 表达能力，再补局部上下文提示，而不是新建重型 debug UI。

### 5. Repository / service 层是 malformed persisted JSON 处理的主战场

malformed persisted JSON 的问题不能只在 UI 层兜底。原因是：
- repository 层才知道是哪一类 row / 字段坏了
- service 层最适合决定是自动隔离、忽略、还是升级为更强提示
- UI 层只适合消费“受影响范围 + 处理结果 + 诊断入口”这样的结果摘要

**结论：** Phase 18 需要让 repository / service 层返回更显式的恢复诊断结果，而不是继续把坏行直接吞成默认值。

### 6. 默认用户信息应是产品化摘要，技术细节进入二级入口

Phase 18 的讨论已经锁定：
- 第一层信息必须是产品化摘要
- 第二层保留“诊断详情 + 恢复建议”入口

结合当前产品定位，这意味着：
- 默认文案应说明哪些内容受影响、系统如何处理、用户还能继续做什么
- 不应默认展示 JSON 列、内部字段名、路径级信息
- 但系统仍应保留足够结构化的内部诊断结果，供二级入口或后续 phase 使用

**结论：** 需要把“用户可读摘要”和“结构化诊断数据”分离建模，而不是只返回一个字符串错误。

## Risks to Carry into Planning

### Risk 1 — 恢复逻辑写散到 UI 条件分支
如果 planner 让大量恢复逻辑漂进 Vue 组件或 app shell glue 层，会违反 AR-01 分层边界。

### Risk 2 — 继续沿用 permissive fallback 而不补诊断结构
如果 planner 只是在 fallback 前后加几条提示文案，而不让 repository/service 产出结构化诊断结果，Phase 18 的问题不会真正解决。

### Risk 3 — 恢复路径做得过重
如果 planner 直接设计重型 repair center / 大型调试面板，容易超出本 phase 范围。

## Planning Implications

Planner 至少应组织这些工作包：

1. **Map current corruption/fallback paths**
   - local snapshot corruption path
   - request/history/workspace persisted JSON malformed path
   - startup hydration conflict path

2. **Define recovery classification and isolation rules**
   - cache-level auto recovery
   - row-level isolation rules
   - durable truth escalation rules

3. **Define structured recovery diagnostics contract**
   - 给 service/UI 的用户摘要字段
   - 给诊断入口的 detail 字段
   - 不默认暴露底层细节，但要有二级入口可用数据

4. **Wire degraded + inline notice behavior through existing boundaries**
   - app shell startup/global notice path
   - affected-object inline notice path
   - conflict restoration wording path

5. **Add focused tests**
   - corrupted local snapshot tests
   - malformed persisted JSON row tests
   - startup restore precedence conflict tests

## Recommended Output Shape for Planning

本 phase 既有文档/contract 工作，也有明确代码与测试执行面，因此更适合产出 **1 个主执行计划**，覆盖：
- repository/service-level diagnostics and isolation changes
- app-shell/global + inline notice integration
- focused tests for corruption/recovery paths
- summary artifact recording what was changed and any deferred repair UX

## Recommendation

进入 planning 时，应把 Phase 18 视为一个 **有明确代码与测试落点的 reliability phase**：
- 不重开模型边界
- 不偷渡 secret hygiene 或 replay explainability
- 专注把“静默 fallback”升级成“分级恢复 + 最小隔离 + 可见诊断 + focused tests”

---

*Research completed for Phase 18 on 2026-04-15.*
