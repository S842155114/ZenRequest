## Context

当前请求工作台已经固定了顶部请求 tab 条和 `RequestUrlBar`，但请求构建主体的滚动实现仍然是分散的：`params`、`headers`、`tests`、`env`、`formdata` 等内容分别包裹自己的 `ScrollArea`。这会导致请求构建区没有一个统一的滚动语义，用户感知上仍像是局部区域在各自滚动，而不是整个 compose body 作为独立工作区滚动。

这次修复只处理请求工作台滚动容器的归属问题，不调整启动主题逻辑，也不改变请求编辑、发送或持久化行为。

## Goals / Non-Goals

**Goals:**
- 让 `RequestParams` 主体只保留一个共享纵向滚动边界。
- 保持请求 tab 条和 `RequestUrlBar` 固定不动。
- 让各个 request section 在同一个滚动容器中自然撑开，而不是每个 section 自己再套一层滚动区。

**Non-Goals:**
- 不重构请求 section 的信息架构。
- 不改变请求体编辑器、响应面板或启动体验。

## Decisions

### Decision: 在 `RequestParams` 内容层设置唯一共享的 `ScrollArea`

保留 `Tabs` 作为 section 切换骨架，但将 active `TabsContent` 统一放入一个共享的 `ScrollArea` 中。这样 `RequestParams` 主体只存在一个纵向滚动边界，section 内部内容按自然高度渲染，不再各自维护嵌套滚动区。

Rationale:
- 这才符合最初“请求构建主体独立滚动”的交互目标。
- 单一滚动边界比多层滚动更容易理解，也更不容易让用户误判内容是否被下方响应区挤压。

Alternatives considered:
- 保留当前多层 `ScrollArea`，只调整样式。Rejected，因为问题不是视觉样式，而是滚动边界归属错误。

### Decision: 保留需要自身滚动语义的输入控件

像 `textarea` 这类天然带内部滚动语义的控件继续保留自身编辑行为，但 section 级容器不再额外套本地滚动区。

Rationale:
- 文本输入控件的内部滚动是编辑器自身行为，不等同于 section 级滚动边界。
- 这样可以在不破坏输入体验的前提下消除多层 section 滚动。

## Risks / Trade-offs

- [Risk] 去掉 section 内部 `ScrollArea` 后，部分 section 的内容高度会变长。 → Mitigation: 由统一 compose scroll area 承担滚动，并为 body/editor 类区域保留合理最小高度。
- [Risk] 某些 section 先前依赖 `flex-1` 高度分配。 → Mitigation: 调整为自然高度布局，并用测试约束统一滚动容器的存在。
