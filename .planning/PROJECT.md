# ZenRequest

## What This Is

ZenRequest 是一个面向开发者的本地优先桌面 API 工作台，强调极速启动、轻量运行、离线可用和隐私可控。v1.0 已完成 HTTP 主链路、工作区资产、变量与鉴权、断言与恢复、以及 MCP over HTTP 基础工作台；v1.1 则把 MCP 能力扩展到 `resources`、`prompts`、`roots` 与 `stdio`，让单 server MCP 调试工作台更加完整可用。

## Core Value

让开发者以本地优先、快速、可控的方式完成高频 API 调试与工作流操作，而不被臃肿云平台和账号绑定打断。

## Current State

- ✅ v1.0 已归档
- ✅ 已交付 phases 1-7，对应 archive 见 `.planning/milestones/v1.0-ROADMAP.md`
- ✅ 已交付 phases 8-11，对应 archive 见 `.planning/milestones/v1.1-ROADMAP.md`
- ✅ 当前主线能力覆盖：HTTP 请求调试、响应查看、历史与回放、导入导出、变量与鉴权、基础断言、恢复指导、MCP 单 server 工作台（tools / resources / prompts / roots / stdio）
- ➡️ 下一步应通过新 milestone 定义后续扩展方向

## Current Milestone: v1.2 Usage Guidance & Product Manual

**Goal:** 为 ZenRequest 建立完整的产品使用说明体系：产品内在设置中提供帮助入口，并在关键场景提供空状态引导；仓库中同时建设中英双语的教程型系统手册，并配套截图。

**Target features:**
- `README` 提供快速上手入口与文档导航
- `docs/` 建立中英双语完整产品手册
- 手册风格以教程式为主
- 文档包含关键流程截图
- 产品内在设置中提供帮助入口
- MCP `stdio` 等关键场景加入空状态卡片式引导
- 首轮采用中文截图优先，英文先复用，后续再补英文截图

## Requirements

### Validated

- ✓ 开发者可以在本地桌面环境中发送和调试 HTTP 请求 — v1.0
- ✓ 开发者可以使用工作区、集合、历史记录和会话持久化组织调试资产 — v1.0
- ✓ 开发者可以使用环境变量、模板解析、基础鉴权和请求级 Mock 完成常见接口调试 — v1.0
- ✓ 开发者可以导入 cURL、回放历史请求，并查看结构化响应与 HTML 预览 — v1.0
- ✓ 开发者可以将 MCP Server 作为被测目标，完成 `initialize`、`tools.list`、`tools.call` 的基础调试与回放 — v1.0
- ✓ 开发者在请求测试、恢复指导与结构化错误反馈方面获得可信主链路体验 — v1.0
- ✓ 开发者可以调试 MCP `resources`、`prompts`、`roots` 并保留统一 history / replay / diagnostics 体验 — v1.1
- ✓ 开发者可以通过 `stdio` 连接单个本地 MCP server，并获得结构化诊断反馈 — v1.1

### Active

- [ ] 为产品建立可持续维护的使用说明与引导体系
- [ ] 优先降低 MCP `stdio` 首次使用门槛
- [ ] 建立中英双语教程型文档基础设施与内容结构

### Out of Scope

- 做成以团队协同、云同步和账号体系为中心的大而全平台 — 与本地优先、隐私优先定位冲突
- 为追求“像 Postman 一样全”而提前引入复杂协议全家桶实现 — 当前应优先沿真实需求扩展，而非超前铺陈
- 在没有真实使用场景前过早设计重量级抽象或插件生态 — 需要先由真实需求验证
- 在 `v1.1` 内引入 MCP `sampling` — 需要额外模型调用、安全确认与交互边界，暂不纳入本 milestone
- 在 `v1.1` 内引入多 MCP server 管理层 — 会显著扩大工作台管理复杂度，晚于单 server MCP 扩展收口

## Context

ZenRequest 当前已经从 brownfield 可运行项目推进到一个 archive-clean 的 v1.0 里程碑。技术栈仍保持 `Vue 3 + TypeScript + Vite + Tauri 2 + Rust + SQLite`，并在本地优先、离线优先和隐私优先的约束下完成了主链路加固与 MCP 首版工作台落地。

v1.0 的经验表明，项目最有价值的方向不是功能堆叠，而是：
- 把高频 API 调试主链路做得足够稳定、轻量、可恢复
- 把结构化回放、诊断和调试上下文做成可检查的工作台体验
- 在此基础上，再逐步扩展 MCP 与 AI / Agent 场景

## Constraints

- **Tech stack**: 基于 `Vue 3 + TypeScript + Vite + Tauri 2 + Rust + SQLite`，继续避免无必要技术迁移
- **Product direction**: 继续坚持本地优先、离线优先、隐私优先、轻量快速
- **Architecture**: 保持展示层、应用层、领域模型层、执行引擎层、存储层边界清晰
- **Pragmatism**: 继续优先真实高频场景，不为假设中的未来需求预铺过度抽象
- **Main-based delivery**: `main` 作为唯一长期分支，特性通过短生命周期分支 + PR 合并回主线

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 将 ZenRequest 定义为“面向 AI / Agent 时代的本地优先 API 工作台” | 建立长期差异化，而非落入功能追赶 | ✓ Good |
| 把当前代码库已有能力视为已验证基础，而不是重新定义成 greenfield | 以演进式规划降低重写成本与风险 | ✓ Good |
| 优先把请求执行引擎、环境体系、集合模型和扩展边界设计好 | 长期竞争力更多来自可扩展性与可维护性 | ✓ Good |
| 当前阶段以高频主链路可用性与本地体验为第一优先级 | 先做到“开发者愿意每天打开” | ✓ Good |
| 使用 Phase 6 / 7 收敛 milestone audit gaps，而不是把 gap 混入新功能 phase | 降低审计噪音，确保 archive-clean | ✓ Good |
| 使用 main-based delivery，PR 直接合入 `main` | 简化分支治理，贴合当前项目节奏 | ✓ Good |
| `v1.1` 先做 `resources/prompts/roots + stdio`，暂不引入 `sampling` 与多 server | 优先把单 server MCP 工作台协议面与传输面打透，避免同时扩展过多维度 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone:**
1. 审核已验证能力并迁移到 `Validated`
2. 收敛下一里程碑的 `Active` 候选范围
3. 复核 Out of Scope 是否仍然成立
4. 更新当前技术、交付与分支策略上下文

---
*Last updated: 2026-04-10 after v1.2 milestone kickoff*
