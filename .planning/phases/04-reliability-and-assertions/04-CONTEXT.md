# Phase 4: Reliability And Assertions - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段聚焦“可信工作流”收敛：为请求增加基础断言能力，并把请求执行、导入导出、历史恢复、本地数据库异常等失败路径整理成结构化、可定位、可恢复的体验。目标是让开发者不只“能发请求”，还能够判断结果是否符合预期，并在本地数据或执行链路出问题时知道发生了什么、该怎么继续。

本阶段不扩展到高级测试框架、复杂脚本断言、云端监控、自动修复系统，也不提前吞并 Phase 5 的 MCP 专项诊断能力。

</domain>

<decisions>
## Implementation Decisions

### Assertion scope and product posture
- **D-01:** 本阶段断言能力以“基础且高频可用”为目标，优先覆盖常见 HTTP 调试验证，而不是把 ZenRequest 做成完整测试平台。
- **D-02:** 断言结果必须与一次请求执行直接关联，开发者在发送请求后应能立即看到断言通过/失败及其原因。
- **D-03:** 基础断言优先围绕状态码、响应头、响应体关键内容或结构化结果展开；复杂脚本、跨请求编排和高级测试 DSL 不在本阶段范围内。

### Result presentation and failure readability
- **D-04:** 断言失败信息必须帮助开发者快速定位“哪个断言失败、预期是什么、实际是什么”，不能只给笼统的失败结论。
- **D-05:** 请求执行失败、导入失败、持久化失败、恢复失败应尽量映射到可区分的错误类别，让用户能判断是网络问题、数据问题、导入数据问题还是本地存储问题。
- **D-06:** 错误反馈优先采用结构化、可行动的信息表达，至少要回答“发生了什么”和“接下来建议做什么”。

### Recovery and diagnostics boundary
- **D-07:** 本阶段要补的是本地恢复与诊断信心，而不是自动修复一切；当数据库损坏、历史异常或恢复失败时，应优先提供清楚提示、可执行建议和安全降级。
- **D-08:** 若遇到无法立即恢复的数据问题，产品应优先保护现有可读数据和继续使用能力，避免因单点异常导致整个应用不可用。
- **D-09:** 诊断信息要服务于本地优先、隐私优先定位：帮助定位问题，但不暴露敏感 secret、内部路径细节或不必要的实现噪声。

### Architecture boundary during reliability hardening
- **D-10:** 延续现有分层：组件负责展示断言结果与错误状态，app-shell / feature composable 负责编排执行与恢复流程，`src/lib/tauri-client.ts` 负责错误 DTO 归一化与前后端边界，Rust 侧负责执行结果、持久化和诊断来源建模。
- **D-11:** 不接受把断言计算、恢复判断和错误分类逻辑散落到多个 Vue 组件中；共享规则应优先沉淀到领域/状态层或 Rust 服务边界。
- **D-12:** 本阶段如需增强响应结果模型或错误返回结构，应优先采用能同时服务 HTTP 主链路与后续 MCP 工作台的稳定边界，而不是临时拼字段。

### Scope guardrails
- **D-13:** Phase 4 的重点是“基础断言 + 可靠诊断 + 可恢复提示”，不是新增更多请求能力面。
- **D-14:** 如果“断言能力更强”与“主链路更稳定、更容易定位问题”冲突，优先稳定性和可解释性，而不是测试能力堆叠。

### the agent's Discretion
- 断言编辑器的最小可行交互形式
- 断言结果在请求面板中的信息层级与布局细节
- 错误类别的具体命名与映射粒度
- 恢复建议采用 inline、toast、banner 还是对话框的具体组合
- 测试分层与验证顺序

</decisions>

<specifics>
## Specific Ideas

- Phase 1 解决“主链路能稳定发送和恢复”，Phase 2 解决“资产能稳定保存和迁移”，Phase 3 解决“变量和 secret 边界可信”，Phase 4 则要解决“结果能不能被验证、失败能不能被理解”。
- 断言的价值不在于炫技，而在于让开发者把高频人工检查变成更可重复的结构化判断。
- 对诊断体验的要求是“出现问题时不要只会失败”，而是给出下一步行动路径，例如重试、检查导入文件、重建工作区、查看历史是否受影响等。
- 如果 UI 复杂度与可靠反馈冲突，优先把失败原因和恢复建议说清楚，而不是追求复杂交互。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/PROJECT.md` — 本地优先、隐私优先、桌面原生体验约束
- `.planning/REQUIREMENTS.md` — `TEST-01`、`TEST-02`、`TEST-03` 的验收边界
- `.planning/ROADMAP.md` — Phase 4 的目标、成功标准与顺序依据
- `.planning/STATE.md` — 当前工作流状态与 phase 衔接信息

### Prior phase decisions
- `.planning/phases/01-core-flow-hardening/01-CONTEXT.md` — 主链路稳定性、恢复失败降级与错误表达边界
- `.planning/phases/02-workspace-assets/02-CONTEXT.md` — 资产导入导出、历史重发与 destructive 操作可预期性约束
- `.planning/phases/03-variables-and-secrets/03-CONTEXT.md` — 变量解析、鉴权和 secret-safe 输出边界，避免诊断泄露敏感值

### Codebase map
- `.planning/codebase/ARCHITECTURE.md` — 当前前后端分层、执行链路与持久化边界
- `.planning/codebase/CONCERNS.md` — 执行失败、恢复异常、本地数据损坏等风险点
- `.planning/codebase/TESTING.md` — 现有测试结构和推荐验证切入点
- `.planning/codebase/STRUCTURE.md` — 断言、执行结果、错误处理相关模块落位

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/app-shell/composables/useAppShell.ts`：当前已集中编排请求执行、工作区状态、toast 和部分错误反馈，是收敛断言结果与恢复提示编排的现有入口。
- `src/lib/tauri-client.ts`：当前前端统一通过该桥接层调用 Rust 命令，适合补齐结构化错误对象、错误分类与恢复建议 DTO。
- `src/lib/request-workspace.ts`：已承载请求/响应/工作区快照等纯逻辑，适合收敛断言配置快照、执行结果复制与历史回放所需的基础结构。
- `src-tauri/` 下现有 request/history/workspace 相关 service：适合承接断言执行结果归档、数据库异常探测和导入/恢复失败的错误源建模。

### Established Patterns
- 当前项目延续 composable + state/service + lib pure helpers + Rust services 的分层，Phase 4 应继续沿用该模式把断言与诊断逻辑收敛在共享层。
- 历史、导入导出、恢复和执行链路已经横跨前后端边界，说明本阶段更像是“把失败路径说清楚、把结果模型补完整”，而不是新增孤立模块。
- 先前 phases 已反复强调“默认安全、失败可定位、边界清晰”，因此 Phase 4 的错误与诊断增强必须兼容这些既有原则，不能为了调试信息而破坏隐私边界。

### Integration Points
- Phase 4 很可能会同时触达请求编辑/执行 UI、响应/结果展示、历史记录模型、runtime bridge、Rust service、以及本地数据库异常处理路径。
- 与 Phase 3 的边界要保持清晰：可以复用 secret redaction 规则进入诊断/错误展示，但不要重新定义变量/secret 模型。
- 与 Phase 5 的边界也要保持清晰：本阶段建立的断言结果模型和错误分类可以成为 MCP 后续复用基础，但不要提前扩展为 MCP 专项协议调试体系。

</code_context>

<deferred>
## Deferred Ideas

- 高级脚本断言、跨请求场景编排、测试套件管理 —— 后续里程碑
- 自动修复数据库、自动恢复损坏历史、后台健康守护进程 —— 后续单独评估
- MCP transport/session/tool-call 的专项诊断面板与协议级断言 —— Phase 5
- 面向团队共享或 CI 的测试报告与云同步能力 —— 与产品定位相关，后续单独评估

</deferred>

---
*Phase: 04-reliability-and-assertions*
*Context gathered: 2026-04-06*
