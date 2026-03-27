## Context

ZenRequest 的主工作台结构最近已经完成几轮关键梳理：顶部 header 被收敛为品牌、上下文和工具三分区；左侧 explorer 明确承担资源浏览职责；中部 request / response 工作区也具备稳定的职责边界。当前剩下的核心问题不再是“结构是否成立”，而是“整体看起来是否像我们的产品”。

现状中的视觉问题主要有四类：

1. 全局视觉 token 虽然统一，但仍带有较强的通用 API 工具感，品牌气质更偏“好用”而不是“专业控制台”。
2. header、sidebar、request、response 四大区域已经逻辑分化，但视觉上还没有形成足够清晰的角色差异。
3. 操作优先级、运行态、状态反馈和结果判读在不同控件上使用的材质与色彩语言还不够制度化。
4. 页面已经存在一套暖橙品牌点缀，但其使用范围还没有收敛到“关键动作、激活状态、焦点与反馈”，导致品牌识别和工程控制感之间的平衡不够稳定。

这次改造的约束同样明确：

- 第一轮只做视觉语言和表现层升级，不推翻现有布局合同。
- 不改请求、工作区、响应或右键的业务逻辑。
- 延续项目当前的 Vue + Tailwind + 设计 token 方式，不引入新的设计系统依赖。
- 保持 light / dark 两套主题都可用，但语气要统一为“专业控制台”，而不是一套亮色、一套暗色各说各话。

## Goals / Non-Goals

**Goals:**
- 将整体工作台统一为更克制、精密、工程化的 professional console 视觉语言。
- 用 token-first 的方式统一背景、面板、边框、文字、状态和品牌强调规则。
- 为 header、sidebar、request、response 四大区域建立更明确的角色气质，而不是只靠标题文案区分。
- 统一共享控件的反馈语言，让主操作、次操作、激活态、hover、busy 和错误态表达更一致。
- 在不改变布局逻辑的前提下，提高产品辨识度与专业可信感。

**Non-Goals:**
- 不重新设计整套工作台布局或交互流程。
- 不引入新的品牌命名、Logo 系统或营销型视觉元素。
- 不新增动画系统或复杂转场编排。
- 不改动数据模型、接口协议或运行时状态管理。
- 不试图在这一轮解决全部视觉细节，重点是先建立稳定的主视觉语法。

## Decisions

### Adopt a professional-console visual language instead of a generic productivity-tool skin
界面会从“通用 API 工具”收敛为“本地接口工程工作台”。整体依赖中性色建立专业感，只让品牌暖橙服务于关键动作、激活态、焦点和反馈。

Alternatives considered:
- 继续沿用当前偏 Postman-inspired 的通用视觉。Rejected，因为它已足够可用，但不足以体现产品定位。
- 走更强品牌化、创作工具式的表达。Rejected，因为会削弱后端开发者需要的稳定感和判断效率。

### Use token-first theming as the primary implementation path
第一轮以 `src/style.css` 中的全局 token 和共享材质规则为主入口，再局部强化主区域组件，避免在每个组件里零散堆砌样式。

Alternatives considered:
- 逐组件局部美化。Rejected，因为容易得到局部好看但整体失衡的结果。
- 大规模重做所有 UI primitive。Rejected，因为现有组件能力已经足够，问题主要在视觉规则而非组件缺失。

### Give each major workbench zone a distinct visual role without changing topology
header 要像顶层控制条，sidebar 要像资源浏览器，request 要像构造台，response 要像检视台。角色差异将通过材质、标题节奏、边界、密度和局部强调建立，而不是重新换布局。

Alternatives considered:
- 仅修改色板，不强调区域角色。Rejected，因为视觉问题并非只有配色，而是区域语义不够鲜明。
- 连带改动布局比例和面板结构。Rejected，因为超出第一轮改造范围，也会引入不必要回归风险。

### Institutionalize state and action feedback
按钮、tab、badge、status、menu 和 context menu 会统一采用更制度化的反馈语言，让“主操作 / 激活 / 运行中 / 成功 / 警告 / 错误”这几个核心状态在全局上是同一套语法。

Alternatives considered:
- 保持当前组件各自表达。Rejected，因为会继续放大不同区域反馈不一致的问题。
- 用更强烈的大面积颜色区分状态。Rejected，因为会削弱控制台的克制感和可读性。

### Keep motion minimal and instrument-like
只保留对状态切换有帮助的细微动效，例如 tab 切换、hover / focus、资源展开和 busy 反馈，整体节奏短、硬、利落。

Alternatives considered:
- 增加更丰富的微交互和转场。Rejected，因为会让界面更像演示型 SaaS，而不是专业工作台。
- 完全取消动效。Rejected，因为适度过渡仍然有助于状态理解和层级感建立。

## Risks / Trade-offs

- [视觉过度收敛导致品牌辨识度下降] → 通过保留暖橙强调色在主操作、焦点和状态反馈中的稳定出现来平衡。
- [大量 token 调整引发局部组件表现不一致] → 先统一共享材质和状态规则，再在四大主区域做定向校准。
- [控制台风格过重导致界面显得压抑] → 用更清晰的层级、留白和局部高光保持可读性与呼吸感。
- [light / dark 两套主题分叉过大] → 先定义同一套角色关系和对比规则，再分别映射到亮暗主题。
- [第一轮只改视觉，个别结构问题仍会显露] → 明确本次目标是建立主视觉语法，为后续局部结构优化提供稳定基线。

## Migration Plan

1. 梳理并更新全局视觉 token，确定背景、面板、文本、边框、状态和品牌强调的统一语法。
2. 强化 header 与 sidebar 的控制条 / 资源浏览器气质，建立更明确的导航与上下文识别。
3. 强化 request 与 response 的构造台 / 检视台角色，统一主操作与结果判读的层级表达。
4. 收敛共享控件的反馈规则，确保按钮、tab、badge、dropdown 和 context menu 的优先级一致。
5. 通过组件测试与手动验证检查亮暗主题、桌面与紧凑布局、主操作反馈和结果状态表达是否一致。

Rollback strategy: 视觉层改造可以通过回退 token 和相关组件样式恢复，不涉及运行时数据迁移或状态格式变更。

## Open Questions

- 第一轮是否需要同步强化启动页与空状态的视觉语言，还是先聚焦工作台主界面。
- 响应区是否需要在后续迭代引入更强的诊断型可视结构，例如更明确的状态摘要行或测试结果概览区。
