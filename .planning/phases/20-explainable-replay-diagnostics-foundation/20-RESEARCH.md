# Phase 20 Research — Explainable Replay & Diagnostics Foundation

**Phase:** 20  
**Date:** 2026-04-24  
**Status:** Ready for planning

## 研究目标

回答一个 planning 前必须先想清楚的问题：**要把 replay/history/diagnostics 从“能重跑”提升到“能解释”，ZenRequest 现有代码与上游 phase 决策已经给了哪些边界、约束、机会与风险？**

本研究聚焦：
- 如何满足 `DX-01`：让 replay/history/diagnostics 足够解释一次 execution 的构成与差异
- 如何继续满足 `AR-01`：不让 execution policy / diagnostics shaping 漂移进 `.vue` 或 app-shell glue
- 如何在 **HTTP explainable replay 优先** 的前提下，为 future MCP session metadata 与 future approval/intervention metadata 预留结构位

## 先记住的 phase 边界

根据 `20-CONTEXT.md`，Phase 20 不是要做：
- 完整 MCP session-aware explainability
- 独立 diagnostics 工作台
- 自然语言总结系统
- 全量逐字段 provenance 时间线
- secret vault 或更激进的持久化模型

本 phase 真正要做的是：
- 先把 **HTTP replay/history** 升级为“最小可解释集”
- 用 **结构化诊断卡片** 而不是自由文本总结来承载解释
- 能说明这次 execution 的构成来源
- 能明确告诉用户：**为什么当前 replay 不一定等价于原始执行**
- 给未来的 MCP session context、approval/intervention metadata 留出扩展位，但不抢先把后续产品面做重

## 上游 phase 已经锁定的基础心智

### 1. Phase 17 已经定义了 explainability 的主轴

Phase 17 的核心不是“request 发出去了”，而是把 execution 拆成三层：
- `authored input`
- `resolved execution snapshot`
- `result artifact`

这直接决定了 Phase 20 不该再把 history item 理解成一个 request/response blob。planning 时要默认：
- explainability 的最小单元不是“请求文本”
- 而是“这次 execution 由什么 authored 输入、什么解析结果、什么结果工件组成”

**结论：** Phase 20 的数据模型和 UI 叙事都应围绕这三层边界组织。

### 2. Phase 19 已经锁定了 secret-safe baseline

Phase 19 的研究与约束已经明确：
- explainability 不能为了“更好解释”而绕开安全默认值
- `safe projection` 与 `resolved execution` 不是一回事
- redacted / excluded / blocked 的信息必须继续保持 guard 语义

这意味着 Phase 20 在设计解释卡片时，必须能表达：
- 某些值来自环境或解析
- 某些值被 redact 了
- 某些 replay 差异正是由 safe projection / guard 造成的

但不能：
- 恢复 secret 原值
- 把原本不该持久化的 resolved secret 塞进 history artifact

**结论：** Explainability 应解释“差异原因”，而不是恢复敏感上下文内容。

### 3. Phase 16 已经证明“replay 应复用现有主路径”

Phase 16 已确认：
- replay draft 通过 `buildHistoryReplayDraft(...)` 统一恢复
- history selection 已集中在 app-shell/view-model 路径
- response / diagnostics 已有“默认紧凑 + 展开细节”的现成 UX 倾向

因此 Phase 20 不适合另起一套 replay 产品模型。更合理的方向是：
- 扩展现有 history item / artifact / detail view 所需元数据
- 让现有 replay path 能消费 explainability 信息
- 在详情区块中渲染结构化 explainable cards

**结论：** 这是一次结构升级，不是一次新工作台建设。

## 已确认的现有实现模式

### 模式 1：history replay 已经有统一恢复入口

代码：`src/features/app-shell/domain/history-replay.ts:1`

`buildHistoryReplayDraft(...)` 当前做的事情：
- 优先从 `HistoryItem.requestSnapshot` 恢复 replay draft
- snapshot 缺失时回退到 collection 中的已保存 request
- 再不行就回退 blank tab
- 标记 `origin.kind = 'replay'`
- 把历史响应恢复到 tab response

这说明 explainable replay 的第一落点不该是“重写 replay 逻辑”，而是：
- 补足 `HistoryItem` 上能够支持解释的元数据
- 让 replay draft 在恢复后能知道“它恢复的是 authored 视角、safe projection 视角，还是带有 replay limitation 的恢复态”

**planning implication：** 重点应放在 `HistoryItem` / artifact contract，而不是 replay tab 新类型。

### 模式 2：history service / command 边界目前很薄

代码：`src-tauri/src/services/history_service.rs:1`、`src-tauri/src/commands/history.rs`、`src/lib/tauri-client.ts:1`

现状很符合 `AR-01`：
- frontend 统一经由 `tauri-client`
- commands/service 是 thin boundary
- repository 负责 history row 的读写与映射

这很重要，因为 Phase 20 若要新增 explainability metadata，最自然的分层仍应是：
- DTO / typed contract 放前后端共享边界
- explainability shaping 放 service/core/repository helper
- UI 只消费结构化结果

**planning implication：** 不要把“来源分类”“差异原因拼接”“诊断优先级”写进 Vue 组件。

### 模式 3：`history_repo` 已在做 summary derivation，但 explainability 仍偏薄

代码：`src-tauri/src/storage/repositories/history_repo.rs:1`

已经存在的能力：
- history row 持久化 `request_snapshot_json`
- row 映射时可推导 MCP summary
- 已有 `execution_source`、`executed_at_epoch_ms` 等执行维度字段

当前不足：
- 仍主要围绕 request snapshot + response preview
- explainability 维度不足以回答“这次 execution 怎么形成”
- 缺少对 replay limitation / projection loss / source category 的稳定表达

**planning implication：** Phase 20 更像是给 history artifact 增加一层 explainability envelope 或 explainability section，而不是替换现有 history row 主体。

### 模式 4：`request-workspace.ts` 已经有 safe projection 与 clone 体系

代码：`src/lib/request-workspace.ts:1`

这里已经具备几个关键基础：
- safe projection helper 已存在
- history snapshot / workspace snapshot / tab clone 都集中在这里
- MCP artifact clone 已经为 `sessionId` 等字段做了保留

这意味着：
- explainability 若需要前端纯函数辅助，应优先落在这里或相邻 domain helper
- 可以复用 Phase 19 的 safe projection 结果，生成“可解释但不泄密”的 projection-aware metadata

**planning implication：** 解释模型可以建立在 `safe projection` 之后，而不是绕开它。

### 模式 5：response diagnostics 已有结构化呈现 precedent

代码：`src/components/response/ResponsePanel.vue:373`、`src/components/response/ResponsePanel.test.ts:291`

现有 MCP 路径已经体现两个重要 UI 原则：
- 诊断不是自由文本，而是结构化区域
- diagnostics ordering 可以做 boundary-first，而不是把 raw protocol dump 放第一屏

这与 `20-CONTEXT.md` 的决策高度一致。

**planning implication：** Phase 20 的 HTTP explainability 不需要重新发明展示哲学，应沿用：
- 默认简洁
- 内联详情
- 卡片化结构
- 需要时展开更细节

### 模式 6：测试已经偏向 contract + path behavior，而不是视觉细节

代码：`src/features/app-shell/domain/history-replay.test.ts:1`、`src/lib/tauri-client.test.ts:1`、`src/features/app-shell/state/app-shell-services.test.ts:1626`

现有测试风格表明本 phase 最适合补的不是快照式 UI 大测试，而是：
- history/replay contract tests
- explainability shaping tests
- replay limitation tests
- UI 对结构化卡片的存在与排序断言

**planning implication：** 验证主题应以 contract、差异原因、边界保持为主。

## 当前代码对 Phase 20 的真正缺口

### 缺口 1：history item 仍不足以解释 execution composition

当前 history 更擅长回答：
- 请求是什么
- 返回了什么
- 部分 MCP 操作属于什么 summary

但还不够回答：
- 哪些值来自 authored input
- 哪些值来自环境/模板解析/默认值
- 哪些上下文在 replay 时已经不可得
- 为什么这次 replay 只能近似恢复原始执行

**要点：** `DX-01` 要的不是更完整 payload，而是更完整的“构成与差异”元数据。

### 缺口 2：缺少稳定的 replay limitation model

`20-CONTEXT.md` 明确要求解释“为什么 replay 不能等价复现原始执行”。

现有系统虽然已经有 redaction/guard 行为，但 planning 角度看还缺一个统一、可持久化、可测试的结构来表达：
- secret 被 redact
- 原始环境变量值当前不可恢复
- 当前 active environment 与原始解析环境不一致
- 某些 resolved 值来自 runtime default 或模板展开
- guard 阻止了直接再次执行

**要点：** 这类信息不能只靠临时字符串提示，最好形成枚举化或结构化 reason model。

### 缺口 3：缺少“来源类别”而非“字段全量追踪”模型

Phase 20 不要求逐字段 provenance timeline，但至少需要来源类别。也就是说 planner 要想清楚：
- source category 的最小集合是什么
- 它在 authored/resolved/result 三层里分别怎么表达

基于当前范围，最小可行集合可考虑：
- `authored`
- `environment_resolved`
- `template_resolved`
- `defaulted`
- `safe_projected`
- `runtime_blocked`
- `replay_only_recovered`

这不是最终字段名建议，而是 planning 时必须明确：**解释粒度要落在来源类别，不是落在自由文案。**

### 缺口 4：future metadata 还没有正式 extension slots

`DX-01` 明确要求给 future MCP session metadata、future approval/intervention metadata 留扩展位。

当前代码里：
- MCP artifact 已有 `sessionId` 等散点字段
- 但 history/replay explainability 侧还没有“future diagnostics context section”或“reserved metadata bag”这类稳定挂点

**要点：** planner 不必把 future 功能做出来，但要避免这次的数据结构做成只能解释 HTTP 的死胡同。

## Phase 20 planning 时最重要的设计问题

### 1. explainability 要挂在哪一层 contract 上？

这是本 phase 最关键的 planning 问题。

候选方向大致有三种：
- 挂在 `HistoryItem` 顶层
- 挂在 `ExecutionArtifact` / result artifact 相邻结构
- 采用共享的 `execution diagnostics / explainability envelope`

结合 Phase 17/19/20 的边界，较合理的方向是：
- **保留现有 request snapshot / result artifact 主体不变**
- **新增一个轻量 explainability section / envelope**
- 让它既能被 history detail 消费，也能被 replay 恢复路径和 diagnostics view 复用

为什么不建议只挂在 UI 层：
- UI 无法稳定知道原始 persistence / projection / recovery 差异
- 会违反 `AR-01`
- 很难为未来 MCP session / approval metadata 复用

**结论：** planning 应优先探索“共享 explainability envelope”，而不是零散字段拼接。

### 2. explainability 应记录“原始执行事实”还是“当前恢复解释”？

答案应是两者分层并存：
- 一部分是持久化的 **execution-time facts**
- 一部分是读取/恢复时计算出来的 **replay-time interpretation**

例如：
- execution source、是否用了 environment/template/default、当时 snapshot 类型，这些更像 execution-time facts
- 当前 replay 因 safe projection 无法恢复某值、当前环境已变化，这些更像 replay-time interpretation

**结论：** 如果 planning 只设计持久化模型，解释会不够；只设计前端临时推导，事实基底又不稳。Phase 20 更适合“少量持久化事实 + 恢复时派生说明”。

### 3. 解释卡片的最小内容应该是什么？

基于 `20-CONTEXT.md` 的“最小可解释集”，planning 至少要覆盖三类卡片：

1. **Execution Composition**
- 说明此次 execution 的组成：authored / resolved / result
- 说明关键值来自何种来源类别

2. **Replay Limitations**
- 说明当前 replay 为什么不能等价复现
- 列出 redaction、environment drift、runtime guard、projection loss 等原因

3. **Diagnostics Context**
- 说明当前可用于诊断的执行边界信息
- 为 future MCP session / approval/intervention metadata 预留挂点

**结论：** 这三类卡片足以支撑 planning，不需要第一轮就上更复杂的 narrative。

### 4. HTTP 与 future MCP/approval 扩展如何共存？

较安全的规划方式不是抽象出一个超大统一模型，而是：
- 先定义跨协议共享的 explainability shell
- 再允许 artifact-specific sections 挂载扩展数据

例如 planner 应考虑：
- 一个共享的 top-level explainability summary
- 一个按 artifact kind 扩展的 details section
- 一个保留字段给 future session / approval metadata

这样可以避免：
- HTTP 先做完后结构无法扩展
- 或反过来，为了未来抽象把本 phase 做得过重

**结论：** 共享外壳 + 协议特定明细，比一次性“完美统一抽象”更符合本仓库风格。

## 推荐的 planning 方向

### 方向 1：先定义 explainability contract，再做 UI

最应该先规划的是 contract，而不是卡片样式。建议先明确：
- explainability section 的宿主是谁
- 哪些字段属于持久化事实
- 哪些字段属于读取/恢复时派生结果
- replay limitation reason 的枚举或稳定类型
- future metadata extension slot 如何命名和挂载

### 方向 2：把来源分类与差异原因收口在 domain/runtime 层

应优先放置的层级：
- `src-tauri/src/core/*` 或 storage/service helper：生成 execution-time facts
- `src/lib/request-workspace.ts` / domain helper：生成 replay-time interpretation
- `src/lib/tauri-client.ts`：承载 DTO contract
- `.vue`：只渲染结构化卡片

不建议：
- 在组件里根据字段名推断来源
- 在 app-shell composable 里拼接 explainability 文案

### 方向 3：以 HTTP history/replay 为主交付，保留 MCP/approval 扩展槽

planning 应显式区分：
- **本 phase 必交付：** HTTP history/replay explainability foundation
- **本 phase 只预留：** MCP session context、approval/intervention metadata

这样能避免 scope 膨胀。

### 方向 4：验证以 contract tests 为主，不以大 UI 为主

建议 planner 将验证组织为：
- explainability contract mapping tests
- history persistence / hydration tests
- replay limitation derivation tests
- response/detail card rendering tests
- architecture-boundary review，确认没有 runtime logic 漂进 `.vue`

## 需要特别防止的风险

### 风险 1：把 explainability 做成自由文本总结

后果：
- 不稳定
- 难测试
- 难国际化
- 难扩展到 future metadata

**应对：** 坚持结构化卡片与 typed fields。

### 风险 2：把差异解释建立在 secret 恢复上

后果：
- 破坏 Phase 19 安全基线
- replay explainability 反而变成泄漏通道

**应对：** 解释“被阻断/被打码/不可恢复”，不要恢复原值。

### 风险 3：把规则散落到 UI 或 app shell

后果：
- 违反 `AR-01`
- 行为难复用到 history export、future diagnostics、MCP context

**应对：** 来源分类、差异原因、解释 shaping 收口到 domain/runtime/helper。

### 风险 4：过度为 future MCP / approval 提前抽象

后果：
- Phase 20 scope 失控
- 本 phase 用户价值变弱

**应对：** 只留 extension slots，不做重产品面。

### 风险 5：只保存更多 payload，却没有更好解释

后果：
- 数据更多但用户仍不理解“为什么这次 replay 不一样”
- 偏离 `DX-01`

**应对：** planning 时强制把“来源类别”和“差异原因”作为一等产物，而不是附件。

## 给 planner 的直接结论

如果要把 Phase 20 规划好，最需要知道的是：

1. **这不是 replay UX 小修，而是 execution explainability contract 的第一轮落地。**
2. **Phase 17 的三层边界是解释主轴：** `authored input` / `resolved execution` / `result artifact`。
3. **Phase 19 的安全默认值不可回退：** explainability 解释差异，不恢复 secret。
4. **现有 replay/history 主路径已经足够好，应该扩展 contract，而不是另建模型。**
5. **本 phase 最缺的是结构化的“来源类别 + replay limitation + diagnostics context”模型。**
6. **最合理的实现落点是共享 explainability envelope：少量持久化事实 + 恢复时派生说明。**
7. **UI 应只消费结构化卡片；规则与推导必须停留在 tauri/client/domain/helper 边界内。**
8. **本 phase 的主交付是 HTTP explainable replay foundation；MCP session 与 approval/intervention 只预留扩展槽。**

## 推荐的 planning 工作包

进入 `20-PLAN.md` 时，建议至少按以下工作包拆分：

1. **Define explainability envelope contract**
- 明确 shared shell、HTTP 最小字段、future extension slots

2. **Capture execution-time explainability facts**
- 在 runtime/service/storage 路径补充最小可持久化事实

3. **Derive replay-time limitation and context**
- 在 domain/helper 路径生成 replay limitation 与当前恢复解释

4. **Render structured history/replay detail cards**
- 在现有 detail/response 路径中渲染简洁可展开的 explainability cards

5. **Protect with focused contract and boundary tests**
- 验证 history/replay/explainability contract 与 AR-01 边界

## 结语

Phase 20 最重要的 planning 认知不是“要显示更多信息”，而是：

**要把 execution 的构成、恢复时的差异、以及当前可诊断上下文，收敛成一套安全、可测试、可扩展的结构化说明模型。**

只要 planner 把这三件事想清楚，Phase 20 就能既满足 `DX-01`，又不破坏 `AR-01`，并为后续 MCP session context 与 approval/intervention metadata 留出自然演进空间。
