# Phase 1: Core Flow Hardening - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只聚焦 HTTP 调试主链路的稳定性与日常可用性：请求编辑、发送、响应查看、启动恢复，以及大 payload/高频交互场景下的可靠性。集合管理、环境/secret 边界、断言体系深化和 MCP 工作台增强均属于后续 phase，不在本阶段扩 scope。

</domain>

<decisions>
## Implementation Decisions

### Core flow priority
- **D-01:** 本阶段以“开发者愿意日常打开使用”为首要目标，优先解决主链路流畅性、稳定性和恢复可靠性，而不是新增能力面。
- **D-02:** 允许为提升稳定性重构主链路内部边界，但不引入新的产品能力，不追求对外可见的大功能扩展。

### Startup and recovery behavior
- **D-03:** 启动恢复必须是 Phase 1 的核心交付，而不是附带优化；应用重启后应优先恢复最近工作区、标签页和当前调试上下文。
- **D-04:** 恢复失败时优先保证“可进入可继续使用”的降级体验，必须给出明确状态和错误信息，不能静默失败或把用户丢在不一致状态。

### Large payload and repeated execution behavior
- **D-05:** 大响应体、文件上传和频繁重发场景按真实高频使用场景处理，目标是避免明显卡顿、崩溃、历史污染或 UI 锁死。
- **D-06:** Phase 1 优先保证主链路在压力场景下仍然可预期；若需要取舍，应优先保证稳定和可恢复，而不是追求花哨展示。

### Architecture boundary during hardening
- **D-07:** 延续现有分层：组件负责展示与交互转发，组合式函数负责状态编排，`lib` 负责纯函数与运行时桥接，Rust 侧负责执行与存储。
- **D-08:** 本阶段不接受把更多执行策略、恢复规则或复杂状态判断重新塞进 Vue 组件模板；如需收敛复杂性，应向既有服务层、store 或 Rust 侧边界归拢。

### Error handling and observability
- **D-09:** 用户可见错误信息必须帮助定位“发送失败 / 恢复失败 / 历史写入异常 / 大响应处理异常”等问题来源，不能只显示泛化失败提示。
- **D-10:** 本阶段的可观测性以支撑主链路定位问题为目标，优先补齐启动态、执行态和恢复态的状态表达，而不是扩展为完整 tracing 产品能力。

### the agent's Discretion
- 启动恢复链路的具体拆分方式
- 响应展示层面的局部性能优化手法
- UI 细节、提示文案的具体布局与呈现
- 具体测试分层与验证顺序

</decisions>

<specifics>
## Specific Ideas

- 主链路目标不是“继续加功能”，而是把现有请求调试体验打磨到可日常替代部分 Postman 使用。
- 对本阶段的判断标准偏向体感：打开即用、恢复可信、发送顺畅、不崩不慢。
- 如果大 payload 与恢复可靠性和某些展示细节冲突，优先保证稳定与恢复。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/PROJECT.md` — 项目定位、本地优先原则、当前阶段的核心价值与约束
- `.planning/REQUIREMENTS.md` — `CORE-01` 到 `CORE-04` 的 phase scope 与验收边界
- `.planning/ROADMAP.md` — Phase 1 的目标、成功标准与顺序依据
- `.planning/STATE.md` — 当前工作流状态与后续衔接信息

### Codebase map
- `.planning/codebase/ARCHITECTURE.md` — 当前系统分层、恢复链路和脆弱点概览
- `.planning/codebase/CONCERNS.md` — 本地持久化、状态恢复、大 payload 等风险点
- `.planning/codebase/TESTING.md` — 现有测试结构和推荐验证切入点

### Research
- `.planning/research/SUMMARY.md` — 本阶段的优先级判断与风险聚焦
- `.planning/research/PITFALLS.md` — 应避免的主链路硬化误区

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/app-shell/composables/useAppShell.ts`：当前应用启动、状态编排、toast 与工作区恢复入口，适合梳理 startup / workbench 生命周期
- `src/lib/tauri-client.ts`：前端到 Tauri/Rust 的运行时桥接边界，适合收敛错误包装与调用契约
- `src/lib/request-workspace.ts`：本地工作区快照读写与克隆逻辑，适合审查恢复一致性与历史/响应快照边界

### Established Patterns
- 现有前端明确采用 composable + state/store + service 的分层思路，Phase 1 应顺着该模式减复杂度，而不是回退到组件内堆逻辑
- `request-workspace` 中已经存在默认状态、克隆函数、MCP/HTTP 响应数据复制逻辑，说明当前主链路问题很可能来自状态模型复杂度与恢复边界，而不是缺少基础结构
- `useAppShell` 在一个入口中承担了 startup snapshot、runtime ready、toast、layout state 等多类职责，Phase 1 规划时需要特别留意是否存在继续膨胀风险

### Integration Points
- Phase 1 的实现大概率会连接前端 startup orchestration、workspace snapshot persistence、runtime invoke bridge，以及 Rust 侧请求执行/历史持久化链路
- 与后续 phases 的边界要保持清晰：本阶段可以触及 collection/history 基础行为，只限于保证主链路稳定，不扩展 Phase 2 的资产管理能力
- 与 MCP 共享的部分底层执行或历史模型如果需要调整，应优先做最小且安全的边界修正，避免在 Phase 1 提前吞并 Phase 5 范围

</code_context>

<deferred>
## Deferred Ideas

- collection / folder 管理增强、导入导出增强、资产迁移体验 —— Phase 2
- 环境变量解析与 secret 本地安全边界 —— Phase 3
- 断言系统、恢复诊断 UX 深化 —— Phase 4
- MCP transport/session/tool-call 的更强调试与回放能力 —— Phase 5
- Prompt/docs/spec → request/test generation、agent tool-call replay、混合 HTTP + MCP scenario runner —— v2 / 后续里程碑

</deferred>

---
*Phase: 01-core-flow-hardening*
*Context gathered: 2026-04-06*
