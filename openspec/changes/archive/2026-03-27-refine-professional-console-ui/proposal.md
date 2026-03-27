## Why

ZenRequest 现在已经具备完整的工作台分区和核心交互，但整体视觉仍更接近通用 API 工具界面，尚未充分传达“本地、精密、可信赖的接口工程工作台”这一产品定位。随着头部、主工作区和右键作用域等结构调整已经稳定，现在是统一视觉语言、强化区域角色感和品牌辨识度的合适时机。

## What Changes

- 将当前工作台视觉从泛用的 Postman-inspired 风格收敛为更克制、更精密的 professional console 语言。
- 重构全局视觉 token，包括背景、面板、边框、文本、状态色、品牌强调色和阴影材质的使用规则。
- 提升 header、sidebar、request、response 四大区域的角色辨识度，使其分别更像顶层控制条、资源浏览器、请求构造台和结果检视台。
- 统一按钮、tab、badge、input、dropdown、context menu 等共享控件的优先级反馈与运行态表达。
- 保持现有工作台布局和核心交互逻辑不变，优先通过视觉层级、密度和反馈语言完成第一轮产品气质升级。

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workbench-ui`: 调整工作台视觉语言、区域气质和共享交互反馈，使整体界面更符合专业控制台定位。

## Impact

- 主要影响 `src/style.css` 中的全局设计 token、材质层级和共享组件样式。
- 主要影响 `src/components/layout/AppHeader.vue`、`src/components/layout/AppSidebar.vue`、`src/components/request/RequestPanel.vue`、`src/components/response/ResponsePanel.vue` 的视觉结构表达。
- 可能影响共享 UI 组件的样式包装与测试快照/断言，但不应改变请求发送、工作区切换、响应呈现和资源右键等既有交互合同。
- 不引入新依赖，不变更数据模型，不新增后端接口。
