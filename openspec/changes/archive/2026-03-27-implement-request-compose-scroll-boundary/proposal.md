## Why

上一轮实现把请求构建区做成了多个 section 内部各自滚动，而不是一个统一的请求 compose 主体滚动边界，因此实际体验仍然没有达到“请求主体独立滚动、响应区稳定不受挤压”的目标。

## What Changes

- 将请求构建区的滚动边界收敛到 `RequestParams` 主体这一层，而不是分散在 `params`、`headers`、`tests`、`env` 等子区块内部。
- 调整请求参数各 section 的布局，让 active section 内容在统一滚动容器中自然展开，由同一个 compose scroll area 承担纵向滚动。
- 更新测试，确保请求构建区只有一个主滚动边界，并覆盖长内容场景下的结构约束。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workbench-ui`: 明确请求 compose body 的独立滚动边界必须是统一的主容器，而不是多个 section 的局部嵌套滚动区。

## Impact

- 请求工作台相关前端组件与样式，主要是 `RequestParams`、`RequestPanel` 和相关测试。
- 不涉及后端接口、启动流程或持久化数据结构。
