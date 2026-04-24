# Phase 19 Research — Secret Hygiene & Safe Projection

**Phase:** 19  
**Date:** 2026-04-20  
**Status:** Ready for planning

## Research Goal

为 Phase 19 提供可直接进入 planning 的技术与实现研究基础，围绕以下问题收敛：
- 当前 secret-bearing 数据在 ZenRequest 中经过哪些 authoring / resolved / persistence / replay 路径
- 现有代码里哪些地方已经具备 redaction / safe projection 的局部能力
- 应该把 secret-safe baseline 落在哪些边界层，才能不破坏既有架构
- 计划阶段应如何切分任务，既补齐 baseline，又不把 scope 扩到 vault / explainability / 新产品面

## Inputs Reviewed

- `.planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md`
- `.planning/v2.0-REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/phases/17-execution-model-state-boundary/17-CONTEXT.md`
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md`
- `src/lib/request-workspace.ts`
- `src/features/app-shell/composables/useAppShell.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/lib/tauri-client.ts`
- `src-tauri/src/core/request_runtime.rs`
- `src-tauri/src/commands/request.rs`
- `src-tauri/src/storage/repositories/request_repo.rs`
- `src-tauri/src/storage/repositories/history_repo.rs`
- `src-tauri/src/storage/repositories/workspace_repo.rs`

## Key Findings

### 1. 当前 secret 风险并不集中在“发送”本身，而是集中在 projection / persistence path

现有代码已经在 runtime send 边界上具备一部分 secret 保护：
- `src-tauri/src/commands/request.rs` 中已有对 `Authorization`、`Cookie`、`Set-Cookie`、`bearer_token`、`password`、`api_key_value` 的 redaction 测试模式
- `src-tauri/src/core/request_runtime.rs` 已在 send 前拒绝 `[REDACTED]` 值进入真实执行

但真正的风险主要集中在这些路径：
- `src/lib/request-workspace.ts` 中的 workspace/session/browser snapshot shaping 与 clone 逻辑，当前会保留完整 request / environment / history 结构
- `workspace_repo.rs` 的 bootstrap/export shaping 虽然已经有部分 `redact_*` helpers，但仍需要统一成清晰的 safe projection policy，而不是局部兜底
- history / replay / export path 仍缺少统一的 authoring vs resolved vs safe projection contract

**结论：** Phase 19 的主战场不是 request send pipeline，而是“哪些对象会被持久化、恢复、导出、回放、展示”为主的 projection 边界。

### 2. 现有代码已经具备“redacted 可见但不可直接重发”的关键模式

`request_runtime.rs` 已把 `[REDACTED]` 视为阻断发送的占位值，这与 Phase 19 讨论中锁定的方向高度一致：
- safe projection 可以保留结构和占位
- 但安全投影不能被误当成真实 authoring 输入继续发送

这意味着 Phase 19 不需要重新发明交互心智，只需要把这一规则扩展为跨 persistence / replay / export 的统一默认策略。

**结论：** 现有 redacted-placeholder runtime guard 是 Phase 19 可以复用的行为基础。

### 3. secret inventory 不能只靠显式 auth 字段，环境变量和 resolved values 也是主要泄漏面

从 `request_runtime.rs` 的 `resolve_template` / `resolve_auth` / `resolve_items` 可见：
- environment variables 会在运行前被解析进 header、auth、body、tests 等结构
- 即使 authoring 层没有直接填入真实值，resolved execution 层也可能得到真实 token / key / password

结合 `request-workspace.ts` 默认环境预置和 workspace snapshot shaping，说明风险至少覆盖：
- auth config 字段
- 敏感 header 值
- 名称像 secret 的环境变量值
- 模板展开后的 resolved 值

**结论：** sensitive field inventory 必须覆盖 authoring 字段、environment variables、resolved values 三类来源，而不是只覆盖显式 auth DTO 字段。

### 4. 最适合的落点是“统一 safe projection helper + repository/service 收口”，而不是把 secret policy 散落到组件层

项目架构约束已经很清楚：
`UI → composables/state → domain helpers → tauri-client → commands → services → core/runtime → storage`

结合当前代码触点，最合理的实现方向是：
- 在共享 DTO / helper 层建立 secret inventory 与 safe projection helper
- 在 workspace/history/request 相关 repository / service 路径统一调用这些 helpers
- 在 app-shell / frontend 侧只消费已经被 safe projection 处理过的对象
- 避免在 `.vue` 组件里根据字段名临时打码或排除

**结论：** Phase 19 应把 policy 收敛在 runtime/service/storage/DTO helper 边界，而不是前台临时判断。

### 5. 当前最像“统一出口”的位置是 workspace export/bootstrap shaping 与 request-workspace snapshot path

从已读代码看，Phase 19 最关键的链路有两组：

1. **前端 browser snapshot / workspace clone path**
- `src/lib/request-workspace.ts`
- 这里决定哪些 authoring assets / environment / history shape 会进入 browser local snapshot 或前端恢复链路

2. **后端 durable bootstrap / export / repository path**
- `src-tauri/src/storage/repositories/workspace_repo.rs`
- `src-tauri/src/storage/repositories/request_repo.rs`
- `src-tauri/src/storage/repositories/history_repo.rs`
- 这里决定哪些结构被 durable 保存、恢复、导出或重建给前端

**结论：** planner 应优先围绕这两大出口组织任务，而不是从 UI 层切入。

### 6. 最现实的 baseline 是“redact 优先，exclude 少量补位，isolate 留作 future extension”

结合当前代码现实：
- redaction 已有局部基础，可自然扩展
- exclude 可用于极少数高风险字段或没有保留意义的 payload 片段
- isolate 如果在本 phase 作为主路径，会迅速把问题升级成 secret vault / encrypted storage / dedicated lifecycle 设计，明显超出 scope

**结论：** 本 phase 最适合把 `redact` 做成默认主策略，把 `exclude` 作为补充规则，把 `isolate` 明确记录为非本 phase 主路径。

### 7. Phase 19 和 Phase 20 的边界必须严格区分

Phase 19 关注：
- secret-safe persistence
- safe projection baseline
- replay/export/recovery 的安全默认值

Phase 20 才关注：
- explainable replay metadata
- diagnostics boundary/context surfacing
- future MCP session / approval metadata extensibility

如果 Phase 19 在 planning 时开始设计完整 explainability artifact，很容易重新把 scope 撑大。

**结论：** Phase 19 只需要保证 replay/export/history 默认不泄漏 secret，并为 Phase 20 保留干净基础，不需要现在扩展 explainability model。

## Risks to Carry into Planning

### Risk 1 — 只做局部 redaction，不形成统一策略
如果 planner 只是给几个已知字段补打码，而没有统一 authoring / resolved / safe projection contract，Phase 19 会变成补丁式修复，后续 export / AI context 仍会再次漏。

### Risk 2 — 把 secret policy 写进 UI 组件或 app-shell 条件分支
如果 planner 让组件自己根据 key 名判断是否敏感，会违反 AR-01，也会让 secret 行为在不同路径失去一致性。

### Risk 3 — 误把 resolved execution 也当成可安全持久化对象
resolved values 恰恰是最容易包含真实 secret 的层，如果 planning 没把这一层和 safe projection 明确分开，风险会继续存在。

### Risk 4 — 为了“以后可能需要”提前引入 isolate/vault 体系
这会显著扩大实现面，偏离本 phase 只做 baseline 的目标。

## Planning Implications

Planner 至少应组织这些工作包：

1. **Define secret inventory and projection contract**
- 明确哪些字段/值被视为 sensitive
- 明确 `authoring`、`resolved execution`、`safe projection` 三层边界
- 明确 `redact` / `exclude` 的默认规则

2. **Implement shared safe projection helpers**
- 建立可复用的 field classification / redaction helper
- 避免 request / history / workspace 各自维护不同 secret 规则

3. **Apply safe projection to persistence and recovery paths**
- browser snapshot shaping
- workspace bootstrap/export shaping
- history / request durable read-write path
- replay draft / recovery object path

4. **Protect send / replay transitions**
- 确保 safe projection 产物不能被误当成真实执行输入
- 保持 redacted placeholder 的阻断语义在 HTTP / replay path 一致

5. **Add focused tests**
- secret inventory classification tests
- persistence/export/replay safe default tests
- regression tests proving secret-bearing values do not enter unsafe paths by default

## Recommended Output Shape for Planning

本 phase 最适合产出 **1 个主执行计划**，覆盖：
- secret inventory / projection contract 文档或内联 contract 说明
- shared redaction / safe projection helpers
- workspace/history/request persistence path updates
- focused redaction / export / replay safety tests

## Recommendation

进入 planning 时，应把 Phase 19 视为一个 **跨前后端边界、以 shared policy 为中心的 baseline phase**：
- 不重开 execution/state ownership 决策
- 不偷渡 explainable replay 或 vault 系统
- 优先建立统一 safe projection contract，并把它接到 persistence / replay / export 主路径上

---

*Research completed for Phase 19 on 2026-04-20.*
