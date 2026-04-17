# Phase 18: Persistence Reliability & Recovery Paths - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只解决 ZenRequest 在本地快照损坏、persisted JSON malformed、startup hydration conflict 等失败路径上的诊断、恢复和测试问题。

本 phase 包含：
- browser snapshot corruption detection / reporting
- malformed persisted JSON row detection / reporting
- startup hydration precedence clarification 的落地化处理
- safe fallback / repair-guided behavior
- 相关 focused tests

本 phase 不包含：
- 重新定义 execution model
- 改写 Phase 17 已确定的 envelope / ownership / compatibility 边界
- secret-safe persistence 具体策略实现
- explainable replay 模型扩展
- 完整 recovery UX 产品面扩展到通用 debug 面板

</domain>

<decisions>
## Implementation Decisions

### 沿用的上游决策（来自 Phase 17）
- **D-01:** backend durable state 是恢复时的 primary truth source。
- **D-02:** browser local snapshot 是辅助缓存层，不是 durable truth。
- **D-03:** startup restore precedence 固定为 backend durable first，browser snapshot 仅补 cached state。
- **D-04:** 恢复与诊断逻辑不得通过继续扩展 request-centric shape 来实现，后续变更应保持 adapter-first 方向。

### 损坏状态的用户可见方式
- **D-05:** 损坏状态采用“降级可继续 + 明确诊断提示”，而不是 silent fallback，也不是默认强阻断。
- **D-06:** 提示层次采用“全局提示 + 受影响区域内联提示”。
- **D-07:** 默认提示应优先说明“哪些内容受影响 + 系统如何处理了”，而不是先展示底层技术细节。

### 恢复策略力度
- **D-08:** 默认恢复策略采用自动降级恢复优先，只要还能安全继续，就先恢复到可用状态，再提示用户。
- **D-09:** 恢复采用分级策略：cache / snapshot 级问题自动恢复；单条 persisted JSON row 问题自动隔离 + 明确提示；影响 durable truth 主结构的问题升级为更强提示，必要时局部阻断。
- **D-10:** 自动隔离的单位采用“最小受影响单元”，优先隔离单条 request、单条 history row、单个 snapshot 分支，而不是扩大到整个 workspace 或整批数据。

### 诊断信息暴露深度
- **D-11:** 默认诊断信息采用产品化摘要优先，不默认展示底层 JSON row、内部字段名、存储层路径等细节。
- **D-12:** 保留一个次级诊断入口，而不是把技术细节完全隐藏。
- **D-13:** 次级入口采用“诊断详情 + 恢复建议”组合入口。

### 冲突恢复优先级细节
- **D-14:** 当 browser snapshot 与 backend durable state 冲突时，恢复一律以 backend durable truth 为准。
- **D-15:** 仅当冲突影响用户可感知恢复结果时，才需要明确前台提示；如果只影响内部缓存细节，则不主动打扰，但应保留在诊断入口中。
- **D-16:** 冲突提示默认优先强调“系统已按更可信数据恢复”，然后再补充哪些缓存/局部恢复结果被忽略或丢弃。
- **D-17:** 对当前 workspace / 当前 tab / 当前 session 的受影响恢复结果，采用“全局提示 + 当前受影响对象局部提示”的组合粒度。

### the agent's Discretion
- 全局提示与局部提示的具体文案风格、组件样式与信息密度。
- 受影响对象的局部提示采用 banner、inline notice 还是 empty-state variant 的具体呈现方式。
- repair-guided behavior 的具体交互组织，只要不偏离本阶段已锁定的恢复和提示原则。

</decisions>

<specifics>
## Specific Ideas

- 本 phase 的恢复体验不应给用户“系统崩了”的感觉，而应更像“系统已切换到可信状态，同时把异常清楚告诉你”。
- 对用户的第一层信息应始终优先说明：哪些内容受影响、系统如何处理了、现在你还能继续做什么。
- 技术细节是有价值的，但应放在次级入口里，不应成为默认第一屏信息。
- 冲突恢复提示不应先把焦点放在“你丢了东西”，而应先建立“系统已按更可信数据恢复”的信任感。
- 自动隔离必须尽量缩小影响面，避免为了修一条坏数据而让整个 workspace 降级。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Upstream foundation decisions
- `.planning/phases/17-execution-model-state-boundary/17-CONTEXT.md` — Phase 17 锁定的 execution / ownership / migration 决策
- `.planning/phases/17-execution-model-state-boundary/17-summary.md` — Phase 18 明确可假设内容与不可重开边界
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md` — durable/cached/ephemeral 定义与 startup restore precedence
- `.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md` — request-centric red lines 与 adapter-first 约束

### Milestone and requirement context
- `.planning/ROADMAP.md` — Phase 18 的目标、依赖与范围
- `.planning/v2.0-REQUIREMENTS.md` — `EX-02`、`LT-01`、`AR-01` 等与恢复/诊断相关的基础要求
- `.planning/PROJECT.md` — 本地优先、轻量、可检查、可回放的产品定位

### Existing code and concerns
- `.planning/codebase/CONCERNS.md` — startup state 双持久层、malformed JSON fallback、silent reset 风险
- `.planning/research/ARCHITECTURE.md` — 分层约束与 runtime/service/storage 边界
- `src/lib/request-workspace.ts` — browser snapshot 读取、workspace/session shaping 与 fallback 风险高点
- `src/features/app-shell/composables/useAppShell.ts` — startup hydration 入口与 degraded startup handling
- `src-tauri/src/services/bootstrap_service.rs` — backend bootstrap payload 入口
- `src-tauri/src/storage/repositories/request_repo.rs` — request JSON 列持久化路径
- `src-tauri/src/storage/repositories/history_repo.rs` — history JSON 列持久化路径
- `src-tauri/src/storage/repositories/workspace_repo.rs` — workspace/session 持久化路径

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/request-workspace.ts` 已经承担 browser snapshot 读取与 workspace/session snapshot 处理，是识别 local snapshot corruption 与 fallback 行为的核心入口。
- `src/features/app-shell/composables/useAppShell.ts` 已经具备 `startupState = degraded` 与 `startupErrorMessage` 这样的表达入口，可作为 Phase 18 的前端降级呈现基础。
- Rust 侧 `bootstrap_service.rs` 与 repository 层已构成 durable bootstrap truth 的现有主链路，适合作为恢复优先级的核心支点。

### Established Patterns
- 当前项目遵循 `UI → composables/state → tauri-client → commands/services/core/storage` 的分层，恢复与诊断逻辑应继续落在 runtime/service/storage 侧，而不是扩散到 Vue 组件条件分支中。
- request/history/workspace 当前仍带有 JSON-column + permissive fallback 特征，Phase 18 需要围绕“检测 + 隔离 + 说明”来改进，而不是继续 silent swallow。

### Integration Points
- startup hydration 冲突处理必须同时覆盖 browser local snapshot 与 backend bootstrap payload。
- malformed persisted JSON 的诊断与隔离必须落到 repository / service 路径，而不是只在 UI 层兜底。
- 前台提示需要与 app shell 现有 startup/degraded 状态整合，而不是另起一套恢复通道。

</code_context>

<deferred>
## Deferred Ideas

- secret-safe persistence / projection 策略与字段级红线 — 留给 Phase 19
- replay/history explainability 扩展 — 留给 Phase 20
- 通用 recovery center / 完整 debug 面板产品面扩展 — 可作为后续增强，不要求在本 phase 完整实现
- 更重的导出/修复工具或人工修复向导 — 若需要，可作为后续 phase/backlog 讨论

</deferred>

---

*Phase: 18-persistence-reliability-and-recovery-paths*
*Context gathered: 2026-04-15*
