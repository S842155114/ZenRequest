# ZenRequest

## What This Is

ZenRequest 是一个面向开发者的本地优先桌面 API 工作台，强调极速启动、轻量运行、离线可用和隐私可控。它不是“开源版 Postman”的功能追赶者，而是围绕 AI / Agent 时代重新设计的 API 工作台，兼顾日常请求调试效率与未来 MCP、Tool Call、Agent Workflow 扩展能力。

## Core Value

让开发者以本地优先、快速、可控的方式完成高频 API 调试与工作流操作，而不被臃肿云平台和账号绑定打断。

## Requirements

### Validated

- ✓ 开发者可以在本地桌面环境中发送和调试 HTTP 请求 — existing
- ✓ 开发者可以使用工作区、集合、历史记录和会话持久化组织调试资产 — existing
- ✓ 开发者可以使用环境变量、模板解析、基础鉴权和请求级 Mock 完成常见接口调试 — existing
- ✓ 开发者可以导入 cURL、回放历史请求，并查看结构化响应与 HTML 预览 — existing
- ✓ 开发者可以将 MCP Server 作为被测目标，完成 `initialize`、`tools.list`、`tools.call` 的基础调试与回放 — existing

### Active

- [ ] 将现有 API 调试主链路进一步打磨到“开发者愿意日常替代一部分 Postman 使用”的可用程度
- [ ] 围绕请求执行引擎、环境体系、集合模型和插件边界持续收敛清晰分层，保证后续协议扩展可持续演进
- [ ] 逐步建设 AI / Agent 时代能力，包括更完整的 MCP 调试、工具调用工作台、文档到请求生成与测试辅助能力

### Out of Scope

- 做成以团队协同、云同步和账号体系为中心的大而全平台 — 与本地优先、隐私优先定位冲突
- 为追求“像 Postman 一样全”而提前引入复杂协议全家桶实现 — 当前应优先打透高频主链路与清晰扩展边界
- 在没有真实使用场景前过早设计重量级抽象或插件生态 — 需要先由真实需求验证

## Context

ZenRequest 当前是一个 brownfield 项目，仓库已有可运行实现与初步产品定位。README 与现有 AGENTS.md 明确了项目目标：以 Tauri 2 + Rust + Vue 3 + TypeScript 为基础，构建一个本地优先、轻量、离线优先、隐私优先的 API 工作台。

已有代码库地图位于 `.planning/codebase/`，显示当前系统已具备前端应用壳层、请求工作区、Tauri 桥接、本地持久化、HTTP 执行、MCP HTTP 调试首版等结构。产品定位文档 `docs/产品定位与架构讨论.docx` 进一步确认：ZenRequest 的差异化不应停留在“另一个 Postman”，而应建立在本地优先体验、优雅执行引擎设计，以及 AI / Agent / MCP 演进潜力之上。

当前产品路线更像是“从已可用 MVP 向更强工作台演进”，而不是从零开始。已有能力可以视为已验证基础，后续规划应在不破坏本地优先与桌面原生体验的前提下，分阶段增强集合管理、导入导出、测试断言、协议扩展和 AI 能力。

## Constraints

- **Tech stack**: 基于 `Vue 3 + TypeScript + Vite + Tauri 2 + Rust + SQLite` — 需要延续当前实现与运行模型，避免无必要技术迁移
- **Product direction**: 必须坚持本地优先、离线优先、隐私优先、轻量快速 — 这是产品核心差异化来源
- **Architecture**: 需要保持展示层、应用层、领域模型层、执行引擎层、存储层的清晰边界 — 避免把逻辑重新塞回 UI 或散落在壳层
- **Pragmatism**: 当前阶段优先打透高频主链路与真实扩展点，不为假设中的未来需求预铺过度抽象 — 以降低复杂度与维护成本
- **Desktop native**: 既然采用 Tauri + Rust，就应优先利用其轻量与本地能力优势，而非走向 Electron 风格的大型前端壳应用

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 将 ZenRequest 定义为“面向 AI / Agent 时代的本地优先 API 工作台” | 避免陷入功能追赶式“开源版 Postman”叙事，建立更清晰的长期定位 | — Pending |
| 把当前代码库已有能力视为已验证基础，而不是重新定义成 greenfield | 仓库已具备请求调试、环境变量、持久化、MCP 首版等真实功能，应以演进式规划替代从零假设 | — Pending |
| 优先把请求执行引擎、环境体系、集合模型和扩展边界设计好 | 长期竞争力更取决于底层可扩展性，而不是单纯 UI 堆功能 | — Pending |
| 当前阶段以高频主链路可用性与本地体验为第一优先级 | 只有做到“开发者愿意每天打开”，后续差异化能力才有真实承载基础 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after initialization*
