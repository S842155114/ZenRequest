## Why

ZenRequest 现在的资源面板与请求工作台已经具备完整的基础功能，但“资源对象、打开中的 tab、历史重开副本、未保存草稿、发送状态”之间仍缺少清晰的语义契约。结果是用户能完成操作，却不总能一眼看懂自己当前处理的是哪一种请求对象、发送是否等于保存、以及侧栏与工作台为什么会出现不同步的状态表达。

## What Changes

- 明确资源请求、历史重开副本、临时草稿和脱链草稿之间的生命周期模型，区分来源、持久化状态和执行状态。
- 调整资源面板，使其从静态资源目录升级为带活动信号的工作浏览器，可表达打开、激活、未保存、发送中和恢复副本等高价值状态。
- 重构请求工作台顶部命令面，分离 request-local 动作与 workspace-global 动作，并显式展示当前请求对象的来源、保存状态和发送前 readiness。
- 在不回退现有 body editor 能力的前提下，补充统一的发送前 readiness 反馈和更清晰的编辑层级。
- 修正 tab 级保存和历史重开相关的行为契约，使后台 tab 保存目标、历史 replay 去重/聚焦和删除后脱链草稿的语义可预测。

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workbench-ui`: 调整资源面板与请求工作台的状态表达、命令层级和 readiness 反馈，使侧栏、tab strip 与请求上下文条共享一致的工作台语义。
- `collections-requests`: 扩展已保存请求与草稿 tab 的关系定义，明确规范资源 tab、未保存草稿和脱链草稿的保存/聚焦/删除行为。
- `history`: 扩展历史项重开到工作台时的语义，明确 replay 副本与原始已保存请求之间的关系和去重/聚焦规则。

## Impact

- 主要影响 `src/App.vue` 中资源选择、历史重开、tab 生命周期、保存和发送的工作台编排逻辑。
- 主要影响 `src/components/layout/AppSidebar.vue`、`src/components/request/RequestPanel.vue`、`src/components/request/RequestUrlBar.vue`、`src/components/request/RequestParams.vue` 的状态展示与命令层级。
- 需要更新 `src/types/request.ts` 和相关工作台辅助逻辑，以承载 tab 来源、持久化状态和执行状态的更明确语义。
- 需要补充或调整前端测试，覆盖资源到工作台的 handoff、后台 tab 保存、history replay、副本状态信号和发送前 readiness。
