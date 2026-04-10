# Phase 14: English Manual & Screenshot Pass - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付英文手册与首轮截图组织收口，目标是在不改动产品功能的前提下，让英文读者也能获得与中文手册对应的完整使用说明，并让关键截图开始有组织地落地。

本阶段包含：
- 英文手册内容建设
- 与中文手册结构对应的英文文档导航
- 首轮截图引用与组织整理
- 英文文档中对截图的复用与安放

本阶段不包含：
- 新功能开发
- 大规模重拍截图或单独制作英文界面截图体系
- 重新设计中文手册结构
</domain>

<decisions>
## Implementation Decisions

### English manual structure
- **D-01:** 英文手册必须与中文手册保持严格结构对应，优先一一镜像，而不是为英文重做信息架构。
- **D-02:** 章节顺序、层级和主要分段应尽量与中文手册一致，以降低后续双语维护成本。
- **D-03:** 英文文案可以做正常语言层面的自然表达，但不应改变章节边界或内容覆盖范围。

### Screenshot strategy
- **D-04:** 首轮英文文档直接复用中文截图，不为本 phase 额外要求英文 UI 截图。
- **D-05:** 本 phase 的截图目标是建立“哪些地方需要截图、截图放在哪里、如何引用”的基本组织，而不是追求视觉资产全面完善。
- **D-06:** 若部分章节暂时没有合适截图，优先保留结构与说明，不把截图缺失变成阻塞项。

### Scope and consistency
- **D-07:** 英文手册需要覆盖与中文手册相同的当前主线能力，至少包括 HTTP、MCP、导入、历史/回放、`stdio`。
- **D-08:** README 英文入口与英文手册之间应形成清晰导航，但不额外发明新的帮助层。

### the agent's Discretion
- 英文文件命名、目录组织和 README.en.md 导航块的具体写法
- 截图文件夹与引用路径的具体组织方式
- 哪些章节优先放首轮截图，哪些章节先保留占位或说明
</decisions>

<specifics>
## Specific Ideas

- 用户已明确选择：英文手册采用**严格镜像中文手册**的策略
- 首轮截图以中文截图复用为主，避免因为截图本地化成本拖慢文档落地
- 英文文档应服务“可对应、可维护、可继续演进”三件事，而不是追求一次性完美翻译体验
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase requirements
- `.planning/PROJECT.md` — v1.2 milestone goal and bilingual documentation direction
- `.planning/REQUIREMENTS.md` — `DOCS-03`, `DOCS-04` requirement definitions
- `.planning/ROADMAP.md` — Phase 14 goal and success criteria

### Upstream Chinese docs work
- `.planning/phases/13-chinese-tutorial-manual/13-CONTEXT.md` — structure and scope decisions for the Chinese manual
- `.planning/phases/13-chinese-tutorial-manual/13-SUMMARY.md` — what Phase 13 shipped
- `.planning/phases/13-chinese-tutorial-manual/13-VERIFICATION.md` — verified documentation scope for Chinese docs
- `docs/zh-CN-manual.md` — canonical source structure the English manual should mirror
- `README.md` — Chinese-facing repo entry after Phase 13 refocus

### Existing English entry point
- `README.en.md` — current English repository entry point that may need alignment with the English manual

### Product/code grounding
- `src/components/layout/AppHeader.vue` — in-app help entry mentioned by docs
- `src/components/request/RequestPanel.vue` — HTTP/MCP workflow surface
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — MCP and `stdio` behavior to document accurately
- `src/components/response/ResponsePanel.vue` — response viewing concepts that docs should describe consistently
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/zh-CN-manual.md` is the direct structural source for the English manual
- `README.en.md` already exists and can be aligned instead of recreated from scratch
- Existing Chinese screenshots or future screenshot references can be reused by path in English docs

### Established Patterns
- Phase 13 intentionally made README a navigation hub; the English side should follow the same general pattern
- Current product terminology for MCP and `stdio` already exists in shipped UI and docs, so English manual should stay aligned with those concepts
- Bilingual maintenance is easier when headings and section order remain stable across languages

### Integration Points
- README.en.md should route into the English manual
- English manual should map section-for-section to `docs/zh-CN-manual.md`
- Screenshot references should be organized so later replacement or localization is straightforward
</code_context>

<deferred>
## Deferred Ideas

- 独立英文截图重拍与英文 UI 资源本地化
- 双语文档更细粒度的同步机制或自动化校验
- 更完整的文档站点化建设
</deferred>

---

*Phase: 14-english-manual-screenshot-pass*
*Context gathered: 2026-04-10*
