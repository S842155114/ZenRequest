# Phase 12: In-App Help & Stdio Onboarding - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Source:** Roadmap + codebase pattern review

<domain>
## Phase Boundary

本阶段只处理产品内帮助入口与 `stdio` 首次使用引导，不扩展新的 MCP 协议能力，不重做整套文档体系。

目标是：
- 在现有设置入口中提供稳定可见的帮助入口
- 在 MCP `stdio` 场景缺少配置或首次使用时提供清晰的空状态/引导
- 为 `command` / `args` / `cwd` 等关键字段提供就地说明
- 让产品内帮助与后续 README / docs 体系形成可跳转的入口关系

明确不包含：
- 新增 `sampling`、多 server、或其他 MCP 新能力
- 完整中文/英文手册正文编写
- 大规模 UI 重构或信息架构重做
</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- 帮助入口放在现有 `AppHeader` 设置面板内，而不是新增独立导航层
- `stdio` 引导应复用现有 MCP workbench 与请求面板结构，不创建平行编辑器体验
- 字段说明应尽量贴近输入位置，优先使用已有视觉语言（hint / empty state / supporting copy）
- 用户应能从产品内帮助跳转到仓库文档入口，但本阶段只建立入口与链接骨架，不承担完整文档交付
- 优先覆盖首次成功路径：选择 `stdio`、填写 command、理解 args/cwd、知道常见失败方向

### the agent's Discretion
- 具体帮助入口文案与按钮样式
- `stdio` 空状态是卡片式、提示块式，还是分段 hint 组合
- 字段说明是常驻文案、tooltip，还是折叠帮助块
- 产品内帮助链接的具体目标文件/锚点如何组织，以最小成本对接 Phase 13
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and requirements
- `.planning/ROADMAP.md` — defines Phase 12 goal, requirements, and success criteria
- `.planning/REQUIREMENTS.md` — canonical requirement IDs `GUIDE-01`, `GUIDE-02`, `GUIDE-03`, `IA-01`
- `.planning/PROJECT.md` — milestone intent and product constraints for v1.2

### Existing UI entry points
- `src/components/layout/AppHeader.vue` — existing settings trigger and settings sheet host
- `src/components/layout/AppHeader.test.ts` — current expectations for settings sheet structure and controls

### Existing MCP workbench patterns
- `src/components/request/RequestPanel.vue` — request kind switching and MCP panel mounting
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — current MCP authoring surface including `stdio` fields
- `src/components/request/RequestPanel.test.ts` — existing MCP transport hint assertions
- `src/lib/i18n.ts` — canonical message organization and localization keys

### Runtime boundary
- `src/lib/tauri-client.ts` — Tauri/runtime bridge; Phase 12 should avoid transport-layer feature creep
</canonical_refs>

<specifics>
## Specific Ideas

- 在设置面板内增加 “Help / 帮助” 区块，包含快速入口与简要说明
- 在 `stdio` transport 选中且关键字段为空时显示 onboarding card
- 为 `command`、`args`、`cwd` 提供示例文案，例如本地 server 启动命令、参数分隔说明、工作目录用途
- 引导内容应覆盖“如何完成第一次成功连接”与“出错先检查什么”两类信息
</specifics>

<deferred>
## Deferred Ideas

- 完整教程页面正文
- 英文镜像和截图收口
- 更高级的 `stdio` 诊断向导或自动探测
</deferred>

---

*Phase: 12-in-app-help-stdio-onboarding*
*Context gathered: 2026-04-10 via roadmap and codebase review*
