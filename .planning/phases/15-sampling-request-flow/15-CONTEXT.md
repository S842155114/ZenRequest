# Phase 15: Sampling Request Flow - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把 `sampling` 接入现有单 server MCP 工作台主链路，让用户能够在现有 workbench 中发起 `sampling` 请求，并查看结构化输入/输出与基础错误信息。

本阶段包含：
- 在现有 MCP workbench 中增加 `sampling` 操作类型
- 为 `sampling` 提供结构化输入表单
- 提供以关键信息可读为主的结果展示
- 明确呈现 `sampling` 的能力边界、依赖条件与常见失败原因

本阶段不包含：
- history / replay 的完整接入
- 多 MCP server 管理
- 更高层 agent workflow 编排
- 为 `sampling` 额外新建独立平行工作台
</domain>

<decisions>
## Implementation Decisions

### Sampling 入口形态
- **D-01:** `sampling` 作为现有 MCP workbench 的一个新增操作类型出现。
- **D-02:** 不为 `sampling` 新建平行入口或独立工作流页面。

### 输入编辑方式
- **D-03:** `sampling` 输入采用结构化表单优先，而不是原始 JSON / 协议体优先。
- **D-04:** 第一版目标是降低首次调试成本，优先让用户能看懂和填对关键输入。

### 结果展示重点
- **D-05:** `sampling` 结果展示以关键信息可读优先，而不是完整协议可见优先。
- **D-06:** 第一版优先突出采样结果、诊断信息和错误原因；原始协议内容不是主展示重心。

### 安全边界呈现
- **D-07:** 第一版就应明确提示 `sampling` 的限制、风险、依赖条件与可能失败原因。
- **D-08:** 这些提示不只在错误时出现，也应在正常使用路径中帮助用户建立正确预期。

### the agent's Discretion
- 结构化表单的具体字段布局
- 可读结果卡片与诊断区域的具体视觉组织方式
- 边界提示是以内联说明、提示块还是空状态文案承载
</decisions>

<specifics>
## Specific Ideas

- `sampling` 应让人感觉是在“现有 MCP workbench 里多了一个自然操作类型”，而不是切到另一套系统。
- 第一版优先服务“能成功发起一次并读懂结果”的主链路，而不是优先暴露全部底层协议细节。
- 即便结果展示偏可读，也要让用户理解：`sampling` 依赖 server 支持，并且可能受模型/权限/运行边界影响。
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase requirements
- `.planning/PROJECT.md` — 当前 milestone 目标、产品原则和已锁定方向
- `.planning/REQUIREMENTS.md` — `MCPS-01`, `MCPS-02`, `WBIN-01` requirement definitions
- `.planning/ROADMAP.md` — Phase 15 goal and success criteria

### Existing MCP workbench grounding
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — MCP workbench 主交互面，`sampling` 应复用其结构与模式
- `src/components/request/RequestPanel.vue` — 请求工作台主入口与模式切换上下文
- `src/components/response/ResponsePanel.vue` — 结果查看区域及可复用展示思路
- `src/lib/i18n.ts` — 文案与术语需与现有 UI 保持一致

### Prior validated context
- `.planning/milestones/v1.1-ROADMAP.md` — `resources/prompts/roots/stdio` 里程碑背景
- `.planning/milestones/v1.2-ROADMAP.md` — 最近一轮帮助与文档体系交付背景
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `McpRequestPanel.vue` 已承载 MCP 操作类型与 transport 相关交互，是 `sampling` 最直接的复用落点。
- `ResponsePanel.vue` 已经承载结构化结果查看逻辑，可作为 `sampling` 结果展示的参考边界。
- `src/lib/i18n.ts` 已集中管理中英文文案，适合承接新增 `sampling` 文案。

### Established Patterns
- ZenRequest 一直优先沿现有工作台扩展，而不是为新能力快速分叉出第二套入口。
- 近期 phase 明确强调“降低首次成功门槛”，因此 `sampling` 第一版也应偏可读、可用，而非底层协议导向。
- MCP 能力扩展遵循单 server、逐步补协议面的路径，Phase 15 不应把范围扩展到多 server 或 agent orchestration。

### Integration Points
- `sampling` 的操作选择应接入现有 MCP request flow。
- 输入区需要新增结构化字段编辑，但不能破坏现有 MCP workbench 的主链路。
- 输出区需要容纳 `sampling` 结果与错误/边界说明，并与后续 Phase 16 的 replay / diagnostics 接入兼容。
</code_context>

<deferred>
## Deferred Ideas

- `sampling` history / replay 完整接入 — Phase 16
- 多 MCP server 管理层 — future milestone
- 更高层 agent workflow 编排 UI — future milestone
- 原始协议视图作为主入口或双模式复杂切换 — future enhancement if needed
</deferred>

---

*Phase: 15-sampling-request-flow*
*Context gathered: 2026-04-10*
