# Phase 20: Explainable Replay & Diagnostics Foundation - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只把 replay/history/diagnostics 从“能重跑”提升到“能解释”，优先建立 HTTP replay/history 的 explainable replay 基础，补齐最小可解释集、结构化诊断卡片数据与内联详情呈现入口，并为 future MCP session context 与 future approval/intervention metadata 预留扩展位。

本 phase 不要求一次完成 MCP explainability、完整独立 diagnostics 工作台、自然语言总结系统、secret vault，或更重的跨协议统一 inspection UX。

</domain>

<decisions>
## Implementation Decisions

### Explainable replay 的最小目标
- **D-01:** Phase 20 采用“最小可解释集”策略，不追求第一轮就把所有上下文与诊断信息完整展开。
- **D-02:** Phase 20 的解释主轴是“执行构成”，优先回答这次 replay/history 对应的 execution 最终是怎么被构造出来的，而不是先做结果归因大全。
- **D-03:** Explainable replay 应帮助用户区分 authored input、resolved execution、result/diagnostic artifact，延续 Phase 17 的 execution boundary 心智，而不是继续把 replay 看成 request blob 重放。

### 解释内容范围
- **D-04:** 最小可解释集应优先覆盖 HTTP replay/history 路径，不要求本 phase 同步完成 MCP session-aware explainability。
- **D-05:** 解释中应展示“来源类别”，至少能说明某部分值或行为来自 authored input、环境变量、模板解析、默认值或安全阻断。
- **D-06:** 本 phase 不要求做完整逐字段追踪链或时间线；来源类别应足以帮助用户理解 execution 是如何形成的。
- **D-07:** 解释中必须明确提示“为什么当前 replay 不能等价复现原始执行”，包括但不限于 redaction、环境变化、解析来源变化、runtime guard 阻断等原因。
- **D-08:** Explainable replay 不只是展示最终 resolved execution，也要解释“当前 replay 与原始执行为何可能存在语义差异”。

### 呈现方式
- **D-09:** 第一落点放在 history/replay 详情视图的内联区块，而不是优先建设独立 diagnostics 面板。
- **D-10:** 解释信息应以结构化诊断卡片为主，而不是先做自然语言摘要。
- **D-11:** 详情区块采用“默认简洁 + 可展开细节”的密度策略：默认先给简洁稳定的解释卡片，需要时再展开更细节。
- **D-12:** 结构化卡片应优先服务 replay/history 当前主路径，便于后续 planner 复用到 diagnostics surfacing，而不要求本 phase 一次把所有面板统一起来。

### 安全与扩展边界
- **D-13:** 如果 explainability 与 secret hygiene 冲突，继续坚持 Phase 19 的安全默认优先，不因为解释便利而恢复或暴露更多 secret-bearing context。
- **D-14:** Phase 20 可以为 future MCP session context 与 future approval/intervention metadata 预留扩展位，但本 phase 不要求把这些 future metadata fully implement 出来。
- **D-15:** planner / researcher 应把 HTTP explainable replay 视为当前主交付，把 MCP session-aware explainability 和更重的 approval/intervention inspection 视为后续扩展目标。

### the agent's Discretion
- 结构化诊断卡片的字段命名、分组形式和展开层级。
- 详情视图中卡片的排版、图标、层级标题与展开交互细节。
- 哪些“来源类别”在 UI 中合并展示、哪些在展开后细分。
- 诊断卡片与现有 history/replay 详情结构如何对齐而不引入过重视觉噪音。

</decisions>

<specifics>
## Specific Ideas

- Phase 20 不追求“解释一切”，而是优先让用户回答：这次 execution 是怎么构成的、为什么它和原始那次执行不一定等价。
- 解释信息应该先长成稳定的结构化诊断卡片，而不是一段会漂移、难测试的自然语言总结。
- 用户默认先看到简洁解释，只有在需要 deeper inspection 时才展开更细节。
- history/replay 详情是最自然的第一落点，因为它最贴近用户回看一次执行记录时的心智路径。
- 即使是 explainable replay，也不能打破 Phase 19 的 secret-safe baseline；解释越多，不代表可以泄漏越多。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` — Phase 20 的目标、边界与上游 milestone 约束
- `.planning/v2.0-REQUIREMENTS.md` — `DX-01` explainable replay 要求，以及 `AR-01` 的分层约束
- `.planning/STATE.md` — 当前 milestone 进度与下一步上下文
- `.planning/PROJECT.md` — 本地优先、可检查、轻量与隐私优先的产品方向

### Upstream phase decisions
- `.planning/phases/17-execution-model-state-boundary/17-CONTEXT.md` — authored input / resolved execution / result artifact 的边界心智
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md` — persistence / recovery / degraded path 的上游恢复边界
- `.planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md` — safe projection、安全默认值与 redacted replay blocking 的锁定决策
- `.planning/phases/19-secret-hygiene-safe-projection/19-VERIFICATION.md` — 已验证的 safe projection / replay guard 行为

### Likely implementation touchpoints
- `src/features/app-shell/state/app-shell-services.ts` — replay / app-shell 编排入口
- `src/features/app-shell/composables/useAppShell.ts` — 当前 history/replay/workbench 主编排
- `src/lib/request-workspace.ts` — request/history/workspace snapshot shaping 与上游边界
- `src/lib/tauri-client.ts` — 前端 DTO / bridge 边界
- `src-tauri/src/core/request_runtime.rs` — resolved execution 与 runtime blocking 行为
- `src-tauri/src/commands/request.rs` — request/history/diagnostics 相关 payload shaping 触点
- `src-tauri/src/storage/repositories/history_repo.rs` — history artifact 与 replay 上游数据来源
- `src-tauri/src/storage/repositories/workspace_repo.rs` — workspace/bootstrap/replay 相关结构来源

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 17 已定义 execution envelope 与 authored/resolved/result 边界，Phase 20 可以直接复用这一套语言来组织 explainable replay。
- Phase 19 已把 safe projection、redacted placeholder blocking 和 replay 安全默认值落到主链路，可直接作为“为何不能等价 replay”的解释来源。
- 当前 history/replay 相关状态编排集中在 app-shell state/composable 与 request workspace 相关 helper，中间层已经具备承载 explainable card data 的位置。

### Established Patterns
- 当前架构强调 `UI → composables/state → domain helpers → tauri-client → commands → services/core/storage`，Phase 20 的解释 contract 与 diagnostics 数据不应散落进 `.vue` 组件自行拼装。
- 上游 phase 已经强调 adapter-first 渐进迁移，因此本 phase 更适合在现有 history/replay 详情路径上增量补解释 contract，而不是一次性重构整套 history model。
- secret-safe baseline 已锁定为高优先级约束，因此任何 explainability contract 都必须默认兼容 safe projection，而不是绕开它。

### Integration Points
- history item / replay detail 需要接入 explainable card data 或等价 diagnostics contract。
- replay 入口需要能够标明“这次 replay 为什么与原始执行不等价”，并把原因映射到结构化来源类别。
- 详情视图需要承接“默认简洁 + 可展开细节”的卡片呈现，而不要求本 phase 新建独立 diagnostics 面板。
- planner 需要特别检查 HTTP history detail、replay handoff、runtime guard reason surfacing、safe projection reason surfacing 这几条链路如何汇合成一个可复用 explainability contract。

</code_context>

<deferred>
## Deferred Ideas

- MCP session-aware explainable replay 的完整落地
- future approval/intervention metadata 的完整产品面与 inspection UX
- 独立 diagnostics workspace / drawer / panel 体系
- 自然语言 explanations / AI-generated summaries
- 更细粒度的字段级追踪链、时间线或 provenance graph

</deferred>

---

*Phase: 20-explainable-replay-diagnostics-foundation*
*Context gathered: 2026-04-24*
