# Phase 13: Chinese Tutorial Manual - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付中文教程型手册与 README 快速入口，目标是让用户能从仓库首页进入一份适合连续阅读的中文产品使用说明，并覆盖 ZenRequest 当前主线能力。

本阶段包含：
- README 的快速上手入口与文档导航
- `docs/` 下中文主手册结构与内容
- 对 HTTP、MCP、导入、历史/回放、`stdio` 的主线能力覆盖

本阶段不包含：
- 英文镜像手册
- 截图全面收口与截图资产管理
- 新功能开发或 UI 行为改动
</domain>

<decisions>
## Implementation Decisions

### Manual structure
- **D-01:** 中文手册采用混合式结构：前半段按首次使用与主线任务流程组织，后半段按能力模块组织。
- **D-02:** 文档应优先帮助新用户完成第一次成功使用，而不是作为碎片化功能索引。
- **D-03:** 流程段应覆盖“第一次打开 → 创建/编辑请求 → 查看响应 → MCP 基础 → `stdio` 上手”这样的连续路径。

### README role
- **D-04:** `README` 只承担快速入口、能力概览和文档导航，不承载完整教程正文。
- **D-05:** `README` 应把用户明确导向中文主手册，而不是在首页堆叠过长说明。

### Scope and depth
- **D-06:** 中文手册必须覆盖 `HTTP`、`MCP`、导入、历史/回放、`stdio` 当前主线能力，对应 `IA-02`。
- **D-07:** `stdio` 文档应承接 Phase 12 的产品内引导，但不重复抄写 UI 文案，而是解释完整使用路径和常见理解点。
- **D-08:** 本 phase 不强制要求截图齐全；若提及截图，仅预留结构或说明位置，不把截图准备变成阻塞项。

### the agent's Discretion
- 具体文档拆分是单一中文主手册还是“索引页 + 主教程页”两层结构，只要保持教程式阅读体验
- 各章节标题命名与排序细节
- 模块章节里每一节的篇幅分配
- README 文案风格与导航块样式
</decisions>

<specifics>
## Specific Ideas

- 用户已明确选择“混合式”结构：前半快速上手按流程，后半能力章节按模块
- 文档应体现本项目“本地优先、轻量、离线优先”的产品定位，而不是写成通用 API 工具介绍
- 中文主手册应优先帮助读者理解现有能力如何串成真实工作流，而不只是枚举功能点
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase requirements
- `.planning/PROJECT.md` — v1.2 milestone goal and product constraints
- `.planning/REQUIREMENTS.md` — `DOCS-01`, `DOCS-02`, `IA-02` requirement definitions
- `.planning/ROADMAP.md` — Phase 13 goal and success criteria

### Upstream phase context
- `.planning/phases/12-in-app-help-stdio-onboarding/12-CONTEXT.md` — Phase 12 decisions about in-app help and `stdio` onboarding positioning
- `.planning/phases/12-in-app-help-stdio-onboarding/12-SUMMARY.md` — what shipped in Phase 12 that documentation should reflect
- `.planning/phases/12-in-app-help-stdio-onboarding/12-VERIFICATION.md` — verified product behavior relevant to docs wording

### Product/code entry points for documentation grounding
- `README.md` — repository entry point that will be refocused as navigation + quick start
- `src/components/layout/AppHeader.vue` — settings/help entry now present in the UI
- `src/components/request/RequestPanel.vue` — request workspace shell and HTTP/MCP mode switching
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — MCP and `stdio` authoring surface
- `src/components/response/ResponsePanel.vue` — response/result viewing surface
- `src/features/app-shell/composables/useAppShell.ts` — app-shell level orchestration and feature framing

### Existing docs and plans
- `docs/fullstack-runtime-plan.md` — broader architecture/runtime framing that may inform terminology
- `docs/project-baseline-readiness.md` — current project state context
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `README.md`: already acts as repo landing page and can host a concise doc navigation section
- `AppHeader` help entry: can be referenced in docs as the in-product help access point
- `McpRequestPanel`: exposes current `stdio` workflow and terminology the docs should match

### Established Patterns
- UI and copy already distinguish HTTP mode and MCP mode clearly
- `stdio` guidance now exists in-product, so the docs should extend that guidance rather than introduce a conflicting explanation
- Product architecture emphasizes a single workbench with multiple flows, which supports a mixed tutorial + reference narrative

### Integration Points
- README should link into the Chinese docs structure
- Chinese tutorial manual should reference the in-app help/settings entry where appropriate
- Manual sections should align with currently shipped UI surfaces, not planned future capabilities
</code_context>

<deferred>
## Deferred Ideas

- 英文镜像手册结构与翻译细节 — Phase 14
- 系统化截图整理与多语言截图策略 — Phase 14
- 更完整的 FAQ / 故障排查百科型内容 — 可在后续补充
</deferred>

---

*Phase: 13-chinese-tutorial-manual*
*Context gathered: 2026-04-10*
