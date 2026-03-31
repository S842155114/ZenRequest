# ZenRequest

[简体中文](./README.md) | [English](./README.en.md)

ZenRequest 是一个桌面优先、本地优先、隐私优先的 API Workbench。  
它的目标不是做另一个“重云端、强登录、常驻同步”的 API 工具，而是提供一个响应快、运行轻、数据留在本机、运行时边界清晰的本地开发工作台。

## 项目定位

ZenRequest 面向以下场景：

- 需要在本地稳定管理工作区、请求集合、环境变量和历史记录
- 希望请求执行、导入导出、测试断言与持久化由本地运行时统一掌控
- 不接受被强制绑定账号、云同步或遥测追踪
- 希望桌面端 API 工具具备明确的架构演进路线，而不是功能越堆越乱

当前项目的产品边界是：

- 桌面优先，基于 Tauri 构建
- 本地 Rust Runtime 是权威执行层
- 本地 SQLite 是当前实现的持久化主路径
- 浏览器侧 mock adapter 仅用于测试和局部开发，不代表桌面运行时等价能力

## 当前已实现基线

根据仓库中的基线文档与 OpenSpec 规格，ZenRequest 当前已经具备完整的桌面工作台基础能力：

### 工作区与会话

- 多工作区
- 活动工作区切换与恢复
- 工作区会话独立持久化
- 打开标签、活动标签、活动环境恢复
- 草稿标签、回放标签、detached draft 语义保留

### 请求编排

- 请求集合与已保存请求
- 请求参数、请求头、环境变量编辑
- `json`、`formdata`、`raw`、`binary` 四种 body 模式
- 请求级 mock 模板编辑
- 请求级响应测试定义

### 运行时执行

- Rust 运行时负责编译请求
- 环境变量解析与鉴权整合
- 本地 HTTP 执行
- mock 请求通过同一发送链路执行
- 运行时侧断言评估与执行结果产物生成
- 历史记录写入与历史回放恢复

### 导入导出与恢复

- 工作区导出
- 全应用导出
- 工作区/应用导入
- `skip` / `rename` / `overwrite` 冲突处理
- `curl` 导入为可继续编辑的请求草稿

### 响应与界面

- 响应代码视图
- HTML 预览
- Explorer / Request / Response 三段式桌面工作台
- 启动引导、主题接力与本地工作台 UI

更完整的基线说明见：

- [Project Baseline Readiness](./docs/project-baseline-readiness.md)
- [workbench-ui OpenSpec](./openspec/specs/workbench-ui/spec.md)

## 核心架构

ZenRequest 当前与后续演进都围绕这条三层结构展开：

1. Vue Frontend  
   负责界面渲染、编辑态、主题、国际化、局部交互状态

2. Tauri IPC Facade  
   负责前后端协议边界、DTO 映射与前端调用封装

3. Rust Core Runtime  
   负责请求执行、会话持久化、工作区数据、导入导出、历史与性能敏感逻辑

这条路线的关键原则是：

- 前端不是最终真相源
- 运行时而非浏览器执行层拥有请求编译与断言评估权
- 工作区业务数据与工作区会话数据分离
- 未来能力通过 runtime seams 扩展，而不是临时堆到前端分支逻辑里

相关文档：

- [全栈运行时规划](./docs/fullstack-runtime-plan.md)
- [runtime-bootstrap](./openspec/specs/runtime-bootstrap/spec.md)
- [runtime-execution-pipeline](./openspec/specs/runtime-execution-pipeline/spec.md)
- [runtime-capability-seams](./openspec/specs/runtime-capability-seams/spec.md)
- [workspace-sessions](./openspec/specs/workspace-sessions/spec.md)

## 架构路线图

项目当前不是“从零起步”，而是在已有桌面基线之上继续收敛架构与发布准备。

### 已完成方向

- 本地工作台基线能力已具备
- Rust Runtime 已不再是空壳
- 本地 SQLite 持久化已经落地
- 请求执行、历史、导入导出、环境与工作区语义已有明确 OpenSpec 契约
- 前端页面结构已完成一次 feature-aligned 拆分，降低了 `App.vue` 与 request workbench 的职责耦合

### 近期重点

- 继续强化“Runtime Authority”，避免前端重新成为权威数据源
- 巩固桌面端主流程的稳定性与回归覆盖
- 清理文档漂移，让 README / docs / OpenSpec 与当前实现保持一致
- 处理发布准备问题，例如前端主包体积告警

### 中期方向

- 进一步打磨 Rust Runtime 与 IPC 契约
- 提升导入导出、工作区恢复、执行结果与大响应处理的稳定性
- 强化自动化验证，覆盖桌面主路径

### 预留但未启用的能力

以下方向已经在架构 seams 中被预留，但不应被误认为当前已实现：

- 更多协议支持
- 额外导入适配器，例如 OpenAPI
- 执行 hooks
- tool packaging
- plugin manifests

这类能力属于后续阶段，不应混淆为当前桌面版本的既有功能。

## 仓库结构

README 只列出最关键的入口：

```text
.
├─ src/                     # Vue 前端、界面组件、feature 模块
├─ src-tauri/               # Rust runtime 与 Tauri 桌面壳
├─ openspec/specs/          # 当前有效的能力规格
├─ openspec/changes/archive/# 已归档的变更记录
├─ docs/                    # 项目基线、规划、设计记录
└─ README.md / README.en.md
```

其中最近一轮前端结构重构后，`src/features/` 下已经按 app shell、request compose、request workbench 等边界进行组织。

## 开发环境

### 前置依赖

你至少需要：

- Node.js 18+
- `pnpm`
- Rust toolchain（推荐通过 `rustup` 安装）
- Tauri 2 对应的系统依赖

官方依赖说明：

- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 安装

```bash
git clone git@github.com:S842155114/ZenRequest.git
cd ZenRequest
pnpm install
```

### 常用命令

前端开发：

```bash
pnpm dev
```

桌面开发：

```bash
pnpm tauri dev
```

运行测试：

```bash
pnpm test
```

前端构建：

```bash
pnpm build
```

桌面打包：

```bash
pnpm tauri build
```

## 技术栈

- Frontend: Vue 3 + TypeScript + Vite
- Desktop Shell: Tauri v2
- Runtime: Rust
- HTTP: `reqwest`
- Persistence: SQLite via `rusqlite`
- UI / Styling: Tailwind CSS 4 + reka-ui/shadcn-vue 风格组件
- Testing: Vitest

## 文档入口

如果你要快速理解项目，建议按这个顺序阅读：

1. [Project Baseline Readiness](./docs/project-baseline-readiness.md)
2. [全栈运行时规划](./docs/fullstack-runtime-plan.md)
3. [project-baseline-readiness OpenSpec](./openspec/specs/project-baseline-readiness/spec.md)
4. [workbench-ui OpenSpec](./openspec/specs/workbench-ui/spec.md)
5. [import-export OpenSpec](./openspec/specs/import-export/spec.md)
6. [frontend-page-structure OpenSpec](./openspec/specs/frontend-page-structure/spec.md)

## 当前状态说明

从仓库现状看，ZenRequest 已经不是概念验证，而是已经具备桌面工作台主路径的项目。  
当前剩余工作更接近：

- 发布准备
- 文档对齐
- 架构继续收口
- 后续阶段能力的审慎扩展

而不是“核心能力尚未具备”。

## English

This repository defaults to Simplified Chinese documentation.  
For the English version of the README, use:

- [README.en.md](./README.en.md)

## 开源协议

本项目基于 [GNU General Public License v3.0](./LICENSE) 开源。
