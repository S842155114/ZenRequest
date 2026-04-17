# Phase 17: Execution Model & State Boundary Definition - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只定义 ZenRequest 的 execution/data model 边界、state ownership、兼容约束与 Phase 18/19/20 的输入，不做实现、多 server MCP 管理、agent workflow UX、schema migration 或 replay/history 结构重写。

</domain>

<decisions>
## Implementation Decisions

### Execution 主体形态
- **D-01:** Phase 17 明确引入独立于 `request DTO` 的 `execution` domain object`，不再继续把后续扩展默认挂载到 `request` 结构上。
- **D-02:** `execution` 在 v1 中是统一顶层实体，后续 researcher / planner 应以它作为主语组织 authored input、resolved execution snapshot、result artifact、history、replay 与 diagnostics。
- **D-03:** `request` 不再被视为未来扩展的默认宿主，而只是某类 execution input 的一种 protocol-specific payload。

### Future agent-oriented execution
- **D-04:** future agent-oriented action 在模型中作为 first-class execution type 预留，而不是仅作为 envelope metadata extension。
- **D-05:** 本 phase 只要求为 agent-oriented execution 预留结构位与边界约束，不要求实现完整 agent workflow、agent UX 或相关产品面。

### Envelope 三层边界
- **D-06:** `execution` 的共享 envelope 采用三层结构：`authored input`、`resolved execution snapshot`、`result artifact`。
- **D-07:** replay 采用双轨保存：保留 `authored input` 作为人类可读意图与编辑来源，但可信 replay 主语以 `resolved execution snapshot` 为主。
- **D-08:** protocol-specific payload 可以同时存在于三层中：`authored input` 承载用户表达的协议意图，`resolved execution snapshot` 承载执行时真实生效的协议上下文，`result artifact` 承载协议执行结果、错误与诊断。
- **D-09:** shared envelope 顶层只保留最小核心共享字段，其余细节优先下沉到 protocol-specific sections，避免重演 request DTO 持续膨胀的问题。

### State ownership 与恢复优先级
- **D-10:** browser local snapshot 在 v2.0 foundation 中定义为辅助缓存层，不是 durable truth。
- **D-11:** durable state 采用“资产 + 可信执行记录”模型：至少覆盖 authored request/workspace/environment 资产、history/replay 所需核心 execution records、必要 diagnostics metadata。
- **D-12:** startup restore 采用 `backend durable state 优先，browser snapshot 仅补充 cached state` 的 precedence；若两者冲突，默认以 backend / SQLite 为准。
- **D-13:** ephemeral state 至少包括 UI 瞬时态，以及 runtime handles、连接态、临时 MCP session internals、未定义稳定语义的临时上下文，不应默认进入 durable persistence。

### 兼容与迁移策略
- **D-14:** 当前 `request/history/workspace` 结构整体被视为“现有兼容层 + 可迁移资产”，其中部分字段/路径仍可作为长期资产保留，但整体不再是未来扩展的默认主语。
- **D-15:** Phase 17 必须明确写下红线：禁止继续扩展 `request-centric shape`；新增 execution/replay/agent/diagnostics/persistence policy 相关语义时，不得再默认塞进 `request` 主结构。
- **D-16:** 兼容迁移策略采用 adapter-first 渐进迁移：先保留现有持久化、DTO、repository shape 的兼容性，通过 adapter 与边界说明过渡，再由后续 phases 逐步收缩旧结构。

### the agent's Discretion
- `execution` 的具体字段命名与分层命名可以在 research / planning 阶段细化。
- protocol-specific payload 的精确分层方式由 researcher / planner 基于代码现实进一步收敛。
- shared envelope 顶层最小核心字段的最终命名与关联关系由 researcher / planner 结合现有代码触点细化，但不得偏离“最小共享语义”原则。

</decisions>

<specifics>
## Specific Ideas

- 用户明确接受“先定义 execution 为顶层主语，再由后续 phase 决定落地迁移路径”的方式。
- 用户偏好在本 phase 钉清边界，而不是继续沿用 request-centric 模型做温和修补。
- 对 future agent-oriented action 的态度是：模型上提前纳入，但产品面和实现面严格延后，不在本 phase 扩 scope。
- 对 replay/history 的态度是：既保留用户原始 authored intent，也把 resolved snapshot 作为可信 replay 与 explainability 的主要依据。
- 对 shared envelope 的态度是：接受“最小共享顶层 + 协议分层承载差异”的结构，而不是追求表面统一的超大通用 DTO。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase definition
- `.planning/PROJECT.md` — 项目定位、本地优先约束、当前 milestone intent 与非目标
- `.planning/STATE.md` — 当前 milestone / phase 状态与 workflow 定位
- `.planning/ROADMAP.md` — 当前 roadmap 入口与 milestone 关联
- `.planning/v2.0-REQUIREMENTS.md` — v2.0 foundation 的 active requirements 与 phase mapping
- `.planning/phases/17-execution-model-state-boundary.md` — Phase 17 的边界、交付物、关键问题、风险与后续 handoff 要求
- `.planning/phases/17-REVIEWS.md` — 当前 cross-AI review 结果与已发现的流程/结构问题

### Code touchpoints named by the phase
- `src/types/request.ts` — 当前 request-centric 类型定义与长期资产边界候选
- `src/lib/request-workspace.ts` — 当前 request snapshot shaping、clone、sanitization、browser persistence 等职责混装点
- `src/lib/tauri-client.ts` — 前端到 Tauri command 的边界
- `src/features/app-shell/composables/useAppShell.ts` — app shell 状态编排与 startup hydration 入口
- `src/features/app-shell/state/` — 前端状态组织与潜在 ownership 边界
- `src-tauri/src/core/request_runtime.rs` — Rust 侧 request runtime 边界
- `src-tauri/src/core/request_executor.rs` — Rust 侧 execution/request 执行入口
- `src-tauri/src/core/mcp_runtime.rs` — MCP runtime 边界与 session artifacts 来源
- `src-tauri/src/services/workspace_service.rs` — workspace 服务层与 durable state 关联
- `src-tauri/src/services/history_service.rs` — history 服务层与 replay/diagnostics 关联
- `src-tauri/src/storage/repositories/request_repo.rs` — request persistence shape
- `src-tauri/src/storage/repositories/history_repo.rs` — history persistence shape
- `src-tauri/src/storage/repositories/workspace_repo.rs` — workspace persistence 与 startup restore 相关边界

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/request-workspace.ts` 已集中承载 request snapshot shaping、clone、sanitization、ID 生成与 browser persistence 相关逻辑，是识别职责混装的高价值入口。
- `src/features/app-shell/composables/useAppShell.ts` 是 startup hydration 与 app-level orchestration 的主要观察点。
- Rust 侧 `services/*` 与 `storage/repositories/*` 已形成 service → repository 的边界，适合作为 future execution envelope 落地时的约束参考。

### Established Patterns
- 当前项目倾向于：Vue 组件负责展示，composable 负责状态编排，`lib` 负责纯逻辑 / bridge，Tauri command 与 Rust service/core 负责运行时与持久化边界。
- 当前主线仍明显带有 request-centric shape，后续 Phase 17 需要在不破坏既有边界的前提下定义更上层的 execution 主语。

### Integration Points
- 新的 execution model 讨论必须与 `request`、`history`、`workspace` 三条现有线对齐，而不是只从未来理想模型出发。
- startup restore precedence 与 state ownership 需要同时覆盖 browser local snapshot、SQLite durable state 与 runtime cache。

</code_context>

<deferred>
## Deferred Ideas

- multi-server MCP management UI — 属于后续 milestone，不在 Phase 17 内展开
- 完整 agent workflow UX / product surface — 本 phase 仅预留模型位置，不讨论产品面
- secret storage 具体机制 — 留给 Phase 19
- corruption recovery 具体实现路径 — 留给 Phase 18
- replay/history schema migration 具体方案 — 留给后续 planning / execution 阶段决定

</deferred>

---

*Phase: 17-execution-model-state-boundary*
*Context gathered: 2026-04-15*
