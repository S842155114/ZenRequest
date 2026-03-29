## Context

ZenRequest 目前已经具备本地优先桌面 API 工作台的基础形态：Vue workbench、Tauri IPC facade、Rust runtime entry 和 SQLite persistence 都已存在，且 HTTP、鉴权、环境、历史、Collection、本地保存等主链路能力大体可用。

但当前实现与《产品定位与架构讨论》仍有结构性偏差：
- 请求执行语义仍分裂在 Vue 与 Rust 之间，前端还负责模板解析和断言求值。
- TypeScript domain types、Rust DTO 和 SQLite schema 还没有围绕同一 canonical contract 收敛。
- 现有导入导出更接近备份恢复，而 MVP 必需的 `curl` import 尚未存在。
- AI/Agent、协议扩展、Hook/Script、Tool Packaging、Plugin Manifest 等未来能力还没有稳定 seam。

这个 change 不是为了直接实现所有高阶段能力，而是为了先把架构秩序纠正过来，使 MVP 收口、v0.2 扩展、v0.3/v0.4+ 演进都能沿着同一 Runtime 主权模型推进。

## Goals / Non-Goals

**Goals:**
- 定义 Rust Runtime-owned execution pipeline，使编译、分发、归一化、断言和 execution artifact 都由 Runtime 统一持有。
- 定义 canonical data contract，使 request definitions、workspace sessions、history projections 和 future execution artifacts 可以在 TS、Rust、SQLite 之间一致 round-trip。
- 把 `curl` import 作为 MVP import adapter 正式纳入架构。
- 把 backup restore import/export 与 feature-grade imports 明确分离。
- 为 protocol drivers、import adapters、execution hooks、tool packaging、plugin manifests 定义 runtime-owned seams。
- 通过阶段 gate 约束 roadmap，防止高阶段能力抢跑。

**Non-Goals:**
- 本 change 不直接实现 SSE / WebSocket / MCP / Tool Call / Plugin runtime。
- 本 change 不直接实现 Hook/Script sandbox 或 AI chat UI。
- 本 change 不要求立即完成所有数据迁移代码，只要求冻结目标 contract 与演进顺序。

## Decisions

### Decision 1: Runtime 成为唯一执行语义权威源

Rust Runtime 将拥有完整执行流水线：
- `RequestDefinition`
- `CompiledRequest`
- `ProtocolDispatch`
- `NormalizedResponse`
- `AssertionResultSet`
- `ExecutionArtifact`
- `HistoryPersistence`

这样可以把当前 Vue 侧 `resolvePayloadTemplates(...)` 和 `evaluateResponseTests(...)` 从正式执行语义中移除。

**Why this over keeping a split model**
- 分裂模型会让 history replay、curl/OpenAPI import、future hooks/scripts 和 protocol drivers 复用不到统一执行语义。
- 继续让前端编译最终 payload，会让 Runtime 永远只是“transport layer”，而不是讨论稿要求的“本地执行引擎”。

### Decision 2: Canonical model 分为资源层、会话层、执行工件层

领域对象被拆成三类：
- 资源定义层：`Workspace`、`Collection`、`RequestDefinition`、`EnvironmentDefinition`
- 会话层：`WorkspaceSession`、`RequestTabDraft`
- 执行工件层：`ExecutionArtifact`、`HistoryItem`

**Why this over one flat snapshot**
- 当前 flat/partial contract 导致 TS 可编辑语义大于 Rust/SQLite 可承载语义。
- 资源、草稿和执行结果不是同一种对象，继续混写会使导入导出、恢复和未来 workflow 全部耦合。

### Decision 3: 外部导入统一走 Import Adapter -> Canonical Mapper

导入分为三类：
- backup restore import
- developer text import (`curl`)
- machine-readable spec import (future OpenAPI / AI doc)

所有导入都必须走：
- `ImportSource`
- `ImportAdapter`
- `ImportIntermediateModel`
- `CanonicalMapper`
- `ImportPlan`
- `PersistenceOrSessionApply`

**Why this over one import/export bucket**
- backup restore 的目标是恢复本地状态，feature import 的目标是映射外部描述。
- 把两者混为一谈，会把 `curl` / OpenAPI / AI import 都错误地拉到 backup package 模式。

### Decision 4: Capability seam 先定义，能力后实现

Runtime 预留以下 seam：
- `ProtocolRegistry`
- `ImportRegistry`
- `HookRegistry`
- `CapabilityRegistry`

能力 taxonomy 最小为：
- `protocol`
- `import_adapter`
- `execution_hook`
- `tool_packaging`
- `plugin_manifest`

**Why this over waiting until later**
- 如果现在不定义 seam，未来能力最容易直接堆进 `App.vue`、前端 helpers 或零散 commands。
- 先定义 seam 可以让 roadmap gate 有可验证的“能力进入方式”。

### Decision 5: 阶段 gate 是架构约束，不是项目管理附属品

MVP 必须先完成：
- HTTP
- 基础鉴权
- 环境变量
- Collection
- 历史记录
- 响应展示
- 本地保存
- `curl` import

只有在 MVP gates 全部满足后，才允许 OpenAPI import、环境分层、请求模板等进入主线。

**Why this over flexible sequencing**
- 当前项目已经出现部分 v0.2 气质能力先于 MVP 闭环进入代码的情况。
- 若不建立硬 gate，架构会继续向 feature parity 漂移。

## Risks / Trade-offs

- [Change surface spans many modules] → Mitigation: 先冻结 contract 和 seam，再按阶段拆 implementation tasks。
- [Current DTO/schema migration may be noisy] → Mitigation: 先统一 canonical model，再逐层补 DTO、DB、import/export mapping。
- [Team may perceive seam design as over-engineering] → Mitigation: 明确当前只做最小 seam，不做动态加载、插件市场、脚本引擎等实现。
- [MVP closure may seem slower because v0.2 ideas already exist] → Mitigation: 用 phase gates 区分“已写代码”与“已完成当前阶段承诺”。

## Migration Plan

1. Freeze target architecture and canonical contracts in specs.
2. Update runtime/bootstrap/session/request/history/import requirements to match the target model.
3. Introduce implementation tasks in MVP-first order:
   - runtime authority closure
   - canonical contract completion
   - curl import
4. After MVP gates pass, plan v0.2 implementation around the same canonical mapper and capability seams.

Rollback is architectural rather than binary: if a sub-step proves too large, keep the spec direction and split the implementation into smaller phases without relaxing Runtime ownership or stage discipline.

## Open Questions

- `ExecutionArtifact` 是否在 v1 直接成为独立持久化资源，还是先由 `HistoryItem` 作为过渡 projection 承担？
- `RequestDefinition` 的 body contract 最终应采用统一 `body_definition_json`，还是在 DB 层保留 `body`/`body_type` 并增加扩展字段？
- `EnvironmentLayer` 在 v0.2 中是否需要以单表 JSON 结构落地，还是提前拆 side table 更稳？
- Bootstrap 是否需要在当前 change 中就暴露 capability descriptors，还是只在 Runtime 内部先建立 registry 占位？
