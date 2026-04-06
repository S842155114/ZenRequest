# Phase 4: Reliability And Assertions - Plan

**Phase:** 4
**Date:** 2026-04-06
**Status:** Planned

## Objective

为请求测试、错误诊断和本地数据恢复建立可信基础，在不引入高级测试 DSL 或自动修复系统的前提下，把基础断言、结构化错误反馈和 degraded recovery 路径收敛成可执行、可验证的实现计划。

## Task Breakdown

### Task 1 — 基础断言编辑与执行闭环

<wave>1</wave>
<depends_on>None</depends_on>

<read_first>
- `src/lib/request-workspace.ts`
- `src/types/request.ts`
- `src/lib/tauri-client.ts`
- `src/features/request-compose/`
- `src/features/request-workbench/`
- `src/features/app-shell/state/app-shell-services.ts`
- `.planning/phases/04-reliability-and-assertions/04-CONTEXT.md`
- `.planning/phases/04-reliability-and-assertions/04-RESEARCH.md`
</read_first>

<action>
沿用现有 `RequestTestDefinition`、`AssertionResultSet` 和 `ResponseState.testResults` 数据骨架，补齐“编辑断言 → 发送请求 → 查看断言结果”的最小可行闭环。优先支持高频基础断言（状态码、响应头、响应体文本/结构化字段），不要引入脚本执行器或跨请求编排。

Concrete implementation goals:
- request 编辑态中可以稳定创建、编辑、删除基础断言定义
- 发送请求时通过单一边界编译断言输入并消费 runtime 返回的 `assertionResults`
- 响应面板中可以清楚看到断言通过/失败、预期值与实际值
- 历史回放或重发场景保持断言结果与当前响应一致，不显示陈旧结论
- 不新增超出 Phase 4 的测试能力面
</action>

<acceptance_criteria>
- 断言定义沿用现有请求模型而不是引入新子系统
- 单次请求执行后，响应结果与断言结果在同一边界完成提交
- UI 能区分通过/失败断言，并显示至少预期/实际两类关键信息
- 至少一组自动化测试覆盖断言定义到执行结果映射的主链路
</acceptance_criteria>

### Task 2 — 结构化错误分类与恢复建议映射

<wave>1</wave>
<depends_on>None</depends_on>

<read_first>
- `src/lib/tauri-client.ts`
- `src/features/app-shell/composables/useAppShell.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-dialogs.ts`
- `src-tauri/src/commands/`
- `src-tauri/src/services/`
- `.planning/codebase/CONCERNS.md`
- `.planning/phases/04-reliability-and-assertions/04-RESEARCH.md`
</read_first>

<action>
基于现有 `AppError` / `ApiEnvelope` 扩展稳定错误 taxonomy，把请求执行失败、导入失败、持久化失败、恢复失败、本地数据异常等映射成可区分的错误 code 家族，并在 app-shell service/view-model 层统一转换为用户可理解的提示与建议动作。

Concrete implementation goals:
- 保持 `runtimeClient` 作为前端唯一 bridge，错误归一化在该层集中处理
- 为 execution / import / persistence / recovery 至少建立一层稳定错误 code 分类
- UI 消费侧根据 code 映射 title、summary 和 next-step advice，而不是直接透传原始 message
- 错误信息保持 secret-safe，不暴露 token、cookie、敏感 header 或多余底层路径细节
- 保持与后续 Phase 5 MCP 错误分类可兼容的扩展面
</action>

<acceptance_criteria>
- `src/lib/tauri-client.ts` 中存在清晰可复用的错误分类边界
- app-shell 层能把主要失败类别映射成结构化提示和恢复建议
- 至少一条执行失败和一条导入/持久化/恢复失败路径被自动化测试区分断言
- 诊断文案不泄露 secret 或不必要实现细节
</acceptance_criteria>

### Task 3 — Startup / 恢复 / 本地数据异常的 degraded 流程硬化

<wave>2</wave>
<depends_on>Task 2</depends_on>

<read_first>
- `src/features/app-shell/composables/useAppShell.ts`
- `src/features/app-shell/composables/useAppShellEffects.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/lib/request-workspace.ts`
- `src-tauri/src/services/bootstrap_service.rs`
- `src-tauri/src/services/history_service.rs`
- `src-tauri/src/storage/`
- `.planning/phases/04-reliability-and-assertions/04-CONTEXT.md`
- `.planning/phases/04-reliability-and-assertions/04-RESEARCH.md`
</read_first>

<action>
沿用现有 `startupState` / `startupErrorMessage` 机制，把 snapshot 读取失败、历史异常、数据库损坏或恢复链路失败统一收敛为 deterministic degraded flow。目标是“用户仍能进入、知道问题、知道下一步”，而不是自动修复所有问题。

Concrete implementation goals:
- 明确 startup / restore 失败时的状态迁移，不让不同入口各自决定降级行为
- 对本地数据库或历史异常提供至少一条安全继续使用路径
- 恢复建议要可执行，例如重试、重新导入、重建工作区、忽略受损历史等
- 在 degraded 场景下保护当前可读数据，不用破坏性清空作为默认兜底
- 与 Phase 3 secret redaction 规则兼容，避免诊断信息泄露敏感值
</action>

<acceptance_criteria>
- 启动/恢复失败路径在 state/composable 层有统一状态表达
- 至少一类 snapshot/recovery 异常会进入明确 degraded 状态并附带建议
- 默认降级不依赖 destructive reset
- 自动化测试覆盖至少一个 degraded startup 或恢复失败场景
</acceptance_criteria>

### Task 4 — Phase 4 回归测试与验证护栏

<wave>3</wave>
<depends_on>Task 1, Task 2, Task 3</depends_on>

<read_first>
- `.planning/codebase/TESTING.md`
- `src/**/*.test.ts`
- `src/features/app-shell/**/*.test.ts`
- `src/lib/**/*.test.ts`
- `src-tauri/Cargo.toml`
- `.planning/phases/04-reliability-and-assertions/04-RESEARCH.md`
</read_first>

<action>
补齐围绕断言闭环、结构化错误分类、startup degraded fallback 和本地数据异常提示的 focused regression coverage。优先使用现有 Vitest seam tests 和 app-shell 场景测试；若 Rust 侧错误 DTO 或恢复服务改动明显，再补 `cargo check` / Rust-side validation。

Concrete validation scope:
- 基础断言定义可被执行并生成可见结果
- execution / import / persistence / recovery 至少两类错误被区分断言
- degraded startup / 恢复失败存在自动化回归测试
- 用户可见 advice mapping 被断言，而不只是检查 console 或内部状态
- 保持 Phase 4 范围内验证，不扩展到 Phase 5 MCP 专项测试
</action>

<acceptance_criteria>
- 前端测试覆盖断言结果映射和错误 advice mapping
- 至少一个测试覆盖 startup degraded 或恢复失败场景
- `pnpm test` 在相关改动后退出 0
- 若 Rust 错误边界或服务有实质改动，`cargo check --manifest-path src-tauri/Cargo.toml` 退出 0
</acceptance_criteria>

<threat_model>
## Threat Model

### In-Scope Risks
- 断言结果与真实响应不同步，导致错误判断
- 执行/导入/持久化/恢复失败被抹平成一种错误，用户无法定位问题
- startup 或数据库异常导致整个应用不可用或默认清空本地数据
- 为提高诊断可见性而泄露 secret、header 或内部路径噪声

### Mitigations Required In Plan
- 单一断言结果提交边界
- `AppError.code` 级别的错误分类与 UI advice mapping
- deterministic degraded startup / restore flow
- 针对断言、错误分类、degraded fallback 的回归测试

### Blockers
- 任何引入脚本断言引擎、自动修复系统或 CI/云端测试平台的计划都应阻止
- 任何通过暴露敏感值换取诊断信息的方案都应阻止
- 任何把诊断与断言逻辑重新塞回多个 Vue 组件的方案都应阻止
</threat_model>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task 1, Task 2 | 断言闭环和错误 taxonomy 可以并行推进，且都是 Phase 4 的基础边界 |
| 2 | Task 3 | degraded recovery 依赖前一波错误分类和 advice mapping 基础 |
| 3 | Task 4 | 回归测试应验证最终工作流形态，而不是中间状态 |

## Verification Commands

- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes For Executor

- Phase 4 重点是可信工作流，不是把 ZenRequest 升级成完整测试平台。
- 继续沿用 composable + state/service + lib + Rust services 边界，不新增平行架构。
- 任何用户可见错误都应回答两件事：发生了什么、下一步建议做什么。
- 诊断增强必须兼容 Phase 3 的 secret-safe 原则，并为 Phase 5 MCP 错误模型留下稳定扩展面。
