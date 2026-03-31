# ZenRequest

> 极速启动、本地优先的 API 工作台，专为重视隐私和效率的开发者打造。

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-ffc131.svg)](https://v2.tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

[English](README.en.md) | [下载最新版本](https://github.com/S842155114/ZenRequest/releases/latest)

---

## 为什么选择 ZenRequest？

Postman、Insomnia 等现代 API 工具越来越臃肿——强制登录、云同步、动辄数 GB 内存占用，还有你从未同意过的遥测数据收集。

**ZenRequest** 是另一种选择：一个桌面优先的 API 工作台，毫秒级启动，完全离线运行，数据始终存在你自己的机器上。

- **极速启动** — 基于 Rust + Tauri，而非 Electron
- **极轻量** — 空闲时内存占用低于 50 MB
- **100% 离线 & 私密** — 无账号、无遥测、无云同步
- **本地 SQLite 存储** — 工作区、请求、历史记录和会话均存储在本地

---

## 功能特性

- 多工作区，会话持久化
- 集合与已保存请求管理
- 环境变量与模板解析
- 请求执行与断言测试
- 历史记录回放
- 工作区导入 / 导出
- cURL 导入为可编辑请求草稿
- 请求级 Mock 模板
- 响应 HTML 预览

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面运行时 | [Tauri v2](https://v2.tauri.app/) + [Rust](https://www.rust-lang.org/) |
| HTTP 引擎 | `reqwest`（异步） |
| 本地存储 | SQLite（via `rusqlite`） |
| 前端 | [Vue 3](https://vuejs.org/) + TypeScript + [Vite](https://vitejs.dev/) |
| UI 组件 | [Tailwind CSS](https://tailwindcss.com/) + [shadcn-vue](https://www.shadcn-vue.com/) |

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

## 项目结构

```
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
└── docs/                       # 架构与设计文档
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