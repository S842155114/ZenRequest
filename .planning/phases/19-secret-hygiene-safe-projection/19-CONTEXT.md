# Phase 19: Secret Hygiene & Safe Projection - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责建立 ZenRequest 的 secret-safe persistence 与 safe projection baseline，确保敏感值不会默认流入不安全的持久化、回放、导出或未来 AI context 路径。

本阶段包含：
- 定义 sensitive field inventory 的判定范围
- 明确 `authoring`、`resolved execution`、`safe projection` 三层边界
- 锁定 `redact / exclude / isolate` 的默认策略
- 规定 persistence / replay / export / recovery 的安全默认行为

本阶段不包含：
- 完整 secret vault 或独立加密密钥管理系统
- 新的多层权限系统或账号体系
- explainable replay 元数据扩展（留给 Phase 20）
- 超出当前 HTTP + MCP 单工作台主链路的大范围产品面改造
</domain>

<decisions>
## Implementation Decisions

### 敏感字段范围
- **D-01:** Phase 19 采用保守范围定义 sensitive field inventory；只要“像 secret”就默认按敏感值处理，而不是仅保护最小的一组显式 auth 字段。
- **D-02:** 明确鉴权值属于敏感范围，包括 `bearerToken`、`password`、`apiKeyValue`，以及 `Authorization`、`Cookie`、`Set-Cookie` 等 header 值。
- **D-03:** 环境变量中名称明显带有 `token`、`secret`、`key`、`password`、`cookie` 等语义的值，默认按敏感值处理。
- **D-04:** 模板展开后的 resolved auth / header / variable values 也属于敏感范围；不能因为它们只存在于运行时就绕过 secret hygiene 规则。

### 三层边界
- **D-05:** Phase 19 明确区分 `authoring`、`resolved execution`、`safe projection` 三层边界，并要求后续 research / planning 以此为主线组织 secret handling。
- **D-06:** `authoring` 层允许存在真实 secret，目标是支撑用户编辑、补录和继续发送。
- **D-07:** `resolved execution` 层允许在单次执行期间短暂持有真实 secret，但这些值不应默认进入普通持久化、导出、历史或展示路径。
- **D-08:** `safe projection` 采用强安全原则：默认只保留结构、字段位置和占位信息，不保留真实 secret 值。

### 处理策略
- **D-09:** 默认策略以 `redact` 为主，而不是 `exclude` 或 `isolate` 为主。
- **D-10:** `redact` 的目标是保留结构可理解性，让用户明确知道“这里原本有一个敏感值”，但看不到真实内容。
- **D-11:** `exclude` 只用于特别高风险或几乎没有保留解释价值的内容，不作为本阶段默认策略。
- **D-12:** `isolate` 不是本阶段的主路径；可以保留为未来扩展位，但本阶段不要求引入独立 secret 隔离存储产品面。

### 安全默认行为
- **D-13:** 历史、回放、导出、恢复相关投影默认统一基于 `safe projection`，而不是分别采用不同的 secret policy。
- **D-14:** 用户在这些路径中应看到可解释结构与 `[REDACTED]` 占位，而不是看到真实 secret。
- **D-15:** 当安全投影对象要被再次发送时，系统应要求回到 `authoring` 层补回真实 secret，而不是把 redacted 值当作可直接复用的真实输入。
- **D-16:** 本阶段优先建立“统一安全默认值”，即使会牺牲一部分本地便利性，也要先避免未来 replay / export / AI context 放大泄漏风险。

### the agent's Discretion
- 具体 sensitive name heuristic 的实现形式与命名表组织方式。
- `[REDACTED]` 之外是否需要更细粒度占位文案，只要不破坏统一安全默认。
- 哪些字段应在极端情况下走 `exclude` 而不是 `redact` 的细则。
- 前端提示文案、交互反馈和测试分层的具体组织方式。
</decisions>

<specifics>
## Specific Ideas

- 本阶段优先保证“不要默认泄漏”，而不是优先保证“历史/回放拿来就能无缝重发”。
- 用户可以知道哪里存在 secret、它属于哪类结构，但不应在普通投影路径直接看到真实值。
- replay / export / future AI context 应尽量共享一套 secret-safe projection 心智，避免不同路径各自发明不同规则。
- 当前运行时已经接受 redacted placeholder 并在发送前阻止继续执行，这与本阶段锁定的“安全投影可见但不可直接重发”方向一致。
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase requirements
- `.planning/ROADMAP.md` — Phase 19 的目标、边界与 primary outputs
- `.planning/v2.0-REQUIREMENTS.md` — `LT-02` 对 secret-safe persistence baseline 的要求
- `.planning/PROJECT.md` — 本地优先、隐私优先、轻量可检查的产品方向
- `.planning/STATE.md` — 当前 milestone 进度与下一步上下文

### Upstream foundation context
- `.planning/phases/17-execution-model-state-boundary/17-CONTEXT.md` — execution/state 边界的上游锁定决策
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md` — persistence / recovery path 的上游决策，避免与 Phase 19 冲突
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-VERIFICATION.md` — 已验证的恢复与持久化行为边界

### Secret and safety concerns
- `.planning/codebase/CONCERNS.md` — 当前 secrets 进入 browser local storage 的风险提示
- `.planning/research/PITFALLS.md` — local-first 产品在 persistence / AI context 上放大 secret leakage 的典型失败模式
- `.planning/research/ARCHITECTURE.md` — 分层边界与实现落点约束

### Existing code touchpoints
- `src/lib/request-workspace.ts` — browser snapshot / workspace session 相关持久化与恢复入口
- `src/features/app-shell/composables/useAppShell.ts` — app shell startup / restore / replay 的前端编排入口
- `src/features/app-shell/state/app-shell-services.ts` — 运行时与工作台状态编排服务
- `src/lib/tauri-client.ts` — 前端到 Tauri 的 DTO / adapter 边界
- `src-tauri/src/core/request_runtime.rs` — resolved execution 阶段的 auth/template 处理与 redacted send blocking
- `src-tauri/src/commands/request.rs` — 现有 request redaction 测试与 payload shaping 参考
- `src-tauri/src/storage/repositories/request_repo.rs` — request 持久化路径
- `src-tauri/src/storage/repositories/history_repo.rs` — history 持久化路径
- `src-tauri/src/storage/repositories/workspace_repo.rs` — workspace/session 持久化路径
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/src/commands/request.rs` 已存在针对敏感 header 和 auth 字段的 redaction 测试，可作为 Phase 19 扩展 secret inventory 与 safe projection 的起点。
- `src-tauri/src/core/request_runtime.rs` 已能识别 `[REDACTED]` 并在发送前阻断，这为“安全投影可见但不可直接执行”提供了现有行为基础。
- `src/lib/request-workspace.ts` 持有 browser snapshot / workspace clone 逻辑，是排查 secret 是否流入前端持久化的关键入口。

### Established Patterns
- 当前项目已经形成 `UI → composables/state → tauri-client → commands/services/core/storage` 的分层，secret policy 不应回塞进 `.vue` 组件条件分支中。
- Phase 17-18 已锁定 durable/cached/ephemeral 与 restore precedence 的边界，Phase 19 应在这些边界上继续细化 secret-safe projection，而不是重新定义 ownership。
- 项目当前已有 redaction 心智，但范围还偏局部；Phase 19 要把它提升为跨 persistence / replay / export 的统一默认策略。

### Integration Points
- secret-safe projection 需要同时覆盖前端 browser snapshot、Rust storage repositories、history/replay shaping 与 export 相关路径。
- `authoring → resolved execution → safe projection` 的边界需要同时映射到 DTO、持久化模型和 replay/recovery 入口。
- 后续 planner 应特别检查环境变量解析、auth 编译、history item 写入、workspace session 保存这几条链路是否共享同一套 safe projection 规则。
</code_context>

<deferred>
## Deferred Ideas

- 独立 secret vault、加密存储层或更重的本地凭据管理系统
- 面向团队/云同步场景的 secret sharing policy
- future AI context assembly 的更细粒度 approval / intervention metadata（留给 Phase 20 或后续 phase）
- 更丰富的 explainable replay 元数据与 inspection UX（留给 Phase 20）
</deferred>

---

*Phase: 19-secret-hygiene-safe-projection*
*Context gathered: 2026-04-17*
