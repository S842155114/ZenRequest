# ZenRequest

> 极速启动、本地优先的 API 工作台，专为重视隐私和效率的开发者打造。

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-ffc131.svg)](https://v2.tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

[English](README.en.md) | [下载最新版本](https://github.com/S842155114/ZenRequest/releases/latest)

---

致谢 Linux.do
感谢 Linux.do 佬友们的一切分享。

LinuxDo 地址：https://linux.do/

---

## 为什么选择 ZenRequest？

Postman、Insomnia 等现代 API 工具越来越臃肿——强制登录、云同步、动辄数 GB 内存占用，还有你从未同意过的遥测数据收集。

**ZenRequest** 是另一种选择：一个桌面优先的 API 工作台，毫秒级启动，完全离线运行，数据始终存在你自己的机器上。

- **极速启动** — 基于 Rust + Tauri，而非 Electron
- **极轻量** — 空闲时内存占用低于 50 MB
- **100% 离线 & 私密** — 无账号、无遥测、无云同步
- **本地 SQLite 存储** — 工作区、请求、历史记录和会话均存储在本地

---

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) v18+ 及 [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/)（stable 工具链）
- Tauri 系统依赖 — 参见 [Tauri 前置条件](https://v2.tauri.app/start/prerequisites/)

### 安装与运行

```bash
git clone https://github.com/S842155114/ZenRequest.git
cd ZenRequest
pnpm install
pnpm tauri dev
```

### 生产构建

```bash
pnpm tauri build
```

安装包输出至 `src-tauri/target/release/bundle/`。

---

## 当前主线能力

ZenRequest 当前已经覆盖这些核心能力：

- HTTP 请求调试
- 环境变量与模板解析
- 集合、工作区、历史与回放
- cURL 导入与工作区导入 / 导出
- 请求级 Mock 与基础断言
- MCP 工作台（tools / resources / prompts / roots / stdio）

如果你想先理解产品怎么使用，而不是逐项猜功能入口，建议直接阅读中文手册。

---

## 文档导航

### 仓库入口与应用内帮助

- [应用内帮助落点](#应用内帮助)
- [中文教程手册](docs/zh-CN-manual.md)

### 中文手册重点章节

- [第一次打开后先做什么](docs/zh-CN-manual.md#第一次打开后先做什么)
- [完成第一个 HTTP 请求](docs/zh-CN-manual.md#完成第一个-http-请求)
- [理解响应历史与回放](docs/zh-CN-manual.md#理解响应历史与回放)
- [开始使用 MCP 工作台](docs/zh-CN-manual.md#开始使用-mcp-工作台)
- [通过 stdio 连接本地 MCP Server](docs/zh-CN-manual.md#通过-stdio-连接本地-mcp-server)

---

## 应用内帮助

- 打开应用右上角设置菜单，可直接进入产品内帮助入口
- 在 MCP 工作台切换到 `stdio` 时，界面会展示首次连接引导与 `command` / `args` / `cwd` 字段说明
- 产品内帮助负责把你带到仓库文档入口；完整教程请阅读中文手册

---

## 项目结构

```text
ZenRequest/
├── src/                        # Vue 3 前端
│   ├── features/
│   │   ├── app-shell/          # 应用外壳、工作区、标签页管理
│   │   ├── request-compose/    # 请求编辑器（方法、URL、请求头、请求体）
│   │   └── request-workbench/  # 响应面板与测试结果
│   └── shared/                 # 共享类型、工具函数、UI 基础组件
├── src-tauri/                  # Rust 后端
│   └── src/
│       ├── commands/           # Tauri 命令处理器
│       ├── db/                 # SQLite 表结构与查询
│       └── http_client/        # 基于 reqwest 的 HTTP 引擎
└── docs/                       # 架构与使用文档
```

---

## 参与贡献

欢迎贡献代码。提交较大 PR 之前，请先开 Issue 讨论方案。

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交改动
4. 向 `main` 分支发起 Pull Request

---

## 开源协议

ZenRequest 基于 [GNU General Public License v3.0](LICENSE) 开源。
