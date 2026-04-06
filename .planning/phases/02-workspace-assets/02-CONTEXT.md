# Phase 2: Workspace Assets - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段聚焦请求资产层的“可依赖”能力：collection / folder 结构管理、历史记录查看与重发、本地导入导出、以及 cURL 导入后继续编辑。目标是在不破坏 Phase 1 主链路稳定性的前提下，把请求资产从“临时工作态”提升到“可保存、可迁移、可复用”的日常工作流。

本阶段不扩展到变量与 secret 边界、断言系统深化、MCP 工作台能力增强，也不把导入体系扩展到超出既有 cURL / OpenAPI / backup 范围的新协议能力。

</domain>

<decisions>
## Implementation Decisions

### Asset model priority
- **D-01:** 本阶段优先让 collection、history、导入导出形成稳定闭环，而不是继续扩展新的调试能力面。
- **D-02:** 资产链路必须服务于“本地优先、快速、可控”的产品定位；导入导出与迁移都应首先围绕本地可恢复、可备份、可移动展开。

### Collection and folder behavior
- **D-03:** collection / folder 管理以“常用请求资产稳定保存和整理”为优先目标；交互应尽量直接，不为了未来协作场景增加复杂抽象。
- **D-04:** 本阶段可以补齐 folder / collection 结构中的保存、重命名、删除、移动等关键链路，但不引入与 Phase 2 无关的复杂共享/同步模型。

### History behavior
- **D-05:** 历史记录必须与 HTTP 主链路保持一致，查看、筛选和重发体验不能与其他执行模型混淆。
- **D-06:** 历史重发应优先强调“从历史快速回到可编辑请求态”，而不是增加新的回放系统或审计产品能力。

### Import / export behavior
- **D-07:** 导入导出优先保证可靠备份与迁移，默认采用明确、可预期的本地文件行为，而不是隐式云端或复杂同步策略。
- **D-08:** cURL 导入的落点应是“生成可继续编辑的请求草稿”，保持与当前请求编辑体验一致，而不是生成一个难以修改的只读导入结果。
- **D-09:** 本阶段可以沿用现有 import adapter 与 workspace package 边界，优先补齐稳定性、一致性和关键 UX，而不是重新设计整套导入框架。

### Architecture boundary
- **D-10:** 延续既有分层：组件负责展示和交互转发，composable / state 负责资产工作流编排，`src/lib/tauri-client.ts` 继续作为前端到 Rust 的唯一桥接边界，Rust service / storage 负责持久化与导入导出落盘。
- **D-11:** 不把 collection / history / import-export 规则重新堆回 Vue 组件；如需复杂状态协调，应归拢到现有 app-shell / feature state 边界或 Rust service / repository 层。

### Error handling and trust
- **D-12:** 资产操作的错误信息必须帮助定位是保存失败、导入失败、导出失败、迁移冲突还是历史操作异常，不能只呈现泛化失败提示。
- **D-13:** 与本地资产相关的 destructive 操作（删除、覆盖、冲突处理）必须行为可预期，避免静默丢失用户请求资产。

### the agent's Discretion
- folder / collection 面板的具体信息密度与布局呈现
- 历史筛选的最小可行交互形式
- 导入导出入口在现有 shell 中的挂载位置
- 针对迁移/冲突提示的具体文案与测试分层

</decisions>

<specifics>
## Specific Ideas

- Phase 1 已把“打开即用、发送稳定、恢复可信”打底；Phase 2 要解决的是“这些请求资产能否放心保存和迁移”。
- collection、history、导入导出都应尽量围绕一个统一心智：请求先是可编辑资产，其次才是历史记录或导入结果。
- 如果 collection 组织能力与复杂 UI 交互冲突，优先保证请求资产保存/移动/恢复可靠，而不是追求花哨树形体验。
- 如果导入导出便利性与数据安全/可预期冲突，优先保证用户明确知道会导入/导出什么、覆盖什么、保留什么。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/PROJECT.md` — 项目定位、本地优先与隐私优先约束
- `.planning/REQUIREMENTS.md` — `WS-01` 到 `WS-04` 的验收边界
- `.planning/ROADMAP.md` — Phase 2 的目标、成功标准与顺序依据
- `.planning/STATE.md` — 当前工作流状态与 phase 衔接信息

### Prior phase decisions
- `.planning/phases/01-core-flow-hardening/01-CONTEXT.md` — 已锁定的主链路稳定性与分层约束
- `.planning/phases/01-core-flow-hardening/01-SUMMARY.md` — Phase 1 已交付的启动恢复/历史一致性基线
- `.planning/phases/01-core-flow-hardening/01-UAT.md` — Phase 1 已验收通过的可用性边界

### Codebase map
- `.planning/codebase/ARCHITECTURE.md` — 前后端分层与 collection/history/import 相关入口
- `.planning/codebase/CONCERNS.md` — 本地持久化、历史漂移、导入迁移等风险点
- `.planning/codebase/TESTING.md` — 现有测试结构和推荐验证切入点
- `.planning/codebase/STRUCTURE.md` — 相关模块的落位建议

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/tauri-client.ts`：已经暴露 collection、history、workspace export/import、cURL/OpenAPI import 等运行时接口，是前端资产链路的统一桥接点。
- `src/lib/request-workspace.ts`：已经承载 workspace snapshot、collection/history 数据复制与默认状态，是前端资产投影与本地会话组织的重要纯逻辑层。
- `src-tauri/src/services/collection_service.rs`：已具备列出、创建、重命名、删除 collection 与保存/删除 request 的服务边界。
- `src-tauri/src/services/history_service.rs`：已具备历史记录列出、清空、单项删除等基础服务。
- `src-tauri/src/services/import_service.rs` 与 `src-tauri/src/services/workspace_service.rs`：已具备 cURL/OpenAPI 导入和 workspace/application package 导入导出边界。

### Established Patterns
- 现有 app-shell 已经形成 composable + state/store/service 的编排方式；Phase 2 应顺着这个模式组织资产工作流，而不是在侧边栏或面板组件里直接堆叠持久化逻辑。
- 前端通过 `runtimeClient` 访问所有持久化和导入导出行为，说明 Phase 2 应继续集中错误归一化和 DTO 映射，而不是散落调用 `invoke`。
- Rust 侧 collection / history / import 服务已分成独立 service 文件，说明资产链路可以优先沿用现有 service/repository 切分逐步补强。

### Integration Points
- Phase 2 很可能同时触达前端资产面板、app-shell 工作区状态、runtime bridge、Rust service、SQLite repository 等多层边界。
- 与 Phase 1 的边界要保持清晰：Phase 2 可以建立在已稳定的历史/恢复基线上，但不要回头扩大主链路范围或引入新的执行模型复杂性。
- 与 Phase 3 的边界也需保持清晰：导入导出与迁移可触及请求资产结构，但不应在本阶段提前吞并变量/secret 安全模型。

</code_context>

<deferred>
## Deferred Ideas

- 变量解析、环境覆盖优先级、secret 导出脱敏策略深化 —— Phase 3
- 断言系统、恢复诊断与更强错误引导 —— Phase 4
- MCP 专用历史、回放和 schema 表单增强 —— Phase 5
- OpenAPI 之外更多导入格式、团队共享与云同步能力 —— 后续里程碑

</deferred>

---
*Phase: 02-workspace-assets*
*Context gathered: 2026-04-06*
