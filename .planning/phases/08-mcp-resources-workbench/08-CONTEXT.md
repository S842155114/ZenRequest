# Phase 08: MCP Resources Workbench - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

把 MCP `resources` 查询与读取接入现有 MCP 工作台主链路。该 phase 只解决单 server 场景下的 `resources.list` / `resources.read` 工作流、结果检查、历史与回放，不扩展到 `prompts`、`roots`、`sampling`、多 server 管理或专门的 rich content viewer。

</domain>

<decisions>
## Implementation Decisions

### Resources operation model
- **D-01:** Phase 08 采用双 operation 方案，把 resources 按现有 MCP workbench 模型拆成明确的 `resources.list` / `resources.read`。
- **D-02:** 不采用“单一 resources 面板里隐式混合 list + read”的模型；history、replay 与协议上下文都应基于明确 operation 记录。

### Read entry semantics
- **D-03:** `resources.read` 采用“显式发现优先，但允许手动输入”的模型。
- **D-04:** 用户默认应先执行 `resources.list` 再选择 resource，但如果已经知道 resource 标识 / URI，仍然允许手动输入并直接读取。
- **D-05:** 未 discover 时仅做明确提示，不做硬阻断；这应与 Phase 07 对 `tools.call` 的 workbench 哲学一致。

### Result presentation scope
- **D-06:** Phase 08 采用通用展示优先：聚焦结构化结果、原始协议包、历史摘要与回放。
- **D-07:** resource 内容先按通用 JSON / text / blob 信息展示，不在本 phase 内引入 markdown / image / rich preview 等专门 viewer。

### Discovery and cache semantics
- **D-08:** `resources` 沿用 Phase 07 已收口的“显式发现优先、latest discovery 为当前真相”的语义。
- **D-09:** 历史快照 / replay 数据只作为证据与回放上下文，不应反向污染当前编辑态。
- **D-10:** `resources` 不应走与 `tools` 不一致的自动发现 / 自动刷新模型；目标是让 `tools` / `resources` / 后续 `prompts` 在 workbench 中共享统一交互哲学。

### the agent's Discretion
- 资源列表在 UI 中的具体布局、筛选 affordance、空状态和 skeleton 细节
- 通用 resource 结果展示的具体文案与字段分组
- resource 标识 / URI 输入控件的具体样式与 placement

</decisions>

<specifics>
## Specific Ideas

- 当前 milestone 只做单 server MCP 工作台扩展，不把多 server 管理层一起拉进来。
- `resources` 这一期要尽量复用现有 MCP workbench 资产，而不是重新设计另一套资源浏览产品。
- downstream research / planning 应优先关注如何复用 `tools` 的 discovery、history、replay、artifact 和 response display 路径。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — v1.1 目标、范围边界、当前 milestone 决策
- `.planning/REQUIREMENTS.md` — `MCPR-01` / `MCPR-02` / `MCPR-03` 的正式 requirements
- `.planning/ROADMAP.md` — Phase 08 目标、成功标准与 sequencing rationale

### Existing MCP workbench baseline
- `.planning/phases/05-mcp-workbench-hardening/05-SUMMARY.md` — v1 MCP workbench 已交付的 tools/history/replay/diagnostics 基线
- `.planning/phases/05-mcp-workbench-hardening/05-VERIFICATION.md` — Phase 5 已验证范围与边界
- `.planning/phases/07-mcp-workbench-and-audit-closure/07-SUMMARY.md` — 显式 discovery、schema 生命周期、taxonomy 收口的现有行为
- `.planning/phases/07-mcp-workbench-and-audit-closure/07-PLAN.md` — Phase 07 对 discovery continuity 与 workbench semantics 的约束

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/mcp-workbench/components/McpRequestPanel.vue` — 已有 MCP operation 切换、显式 discover action、`tools.call` 参数编辑与缓存工具列表逻辑，是扩展 `resources.list` / `resources.read` 的首要复用入口。
- `src/features/app-shell/composables/useAppShellViewModel.ts` — 已有从 request panel → workbench shell → app-shell handler 的 MCP discover 接线，可作为 resources discovery action 的编排参考。
- `src/features/app-shell/state/app-shell-services.ts` — 已有 `discoverMcpTools` 与 `sendRequest` 的 MCP service 边界，说明 resources 能力应继续落在现有 runtime/service seam，而不是新建平行 subsystem。
- `src/features/app-shell/state/app-shell-store.ts` — 已有 MCP response artifact、history summary、cached tools 与 replay continuity 的写入逻辑，可作为 resources artifact/history 模型的扩展点。
- `src/lib/request-workspace.ts` — 已有 MCP artifact / history clone 与 replay 数据复制路径，是 resources replay fidelity 的重要基础。
- `src/features/app-shell/domain/history-replay.test.ts` — 现有 MCP history replay 测试说明 protocol context、selected tool、cached tools 都已进入 replay 语义，resources 应沿用这条 lineage。

### Established Patterns
- MCP workbench 当前采用 operation-driven 模型，而不是“一个大面板里隐式切换行为”；Phase 08 必须延续这种模型。
- Phase 07 已把“显式发现优先，但不硬阻断”作为 workbench 哲学锁定，resources 应继承这一点。
- 当前 MCP artifacts 以 `mcpArtifact` / `mcpSummary` / `requestSnapshot` 进入 response、history 与 replay；resources 应在现有模型上扩展，而不是旁路存储。
- 当前产品面 taxonomy 已收敛在 transport / session / tool-call 语义；Phase 08 不应重新引入 vocabulary drift。

### Integration Points
- `McpRequestPanel` 中 operation selector 与 request payload 结构需要扩展到 `resources.list` / `resources.read`。
- `types/request.ts` 中 MCP operation / input / artifact 类型需要扩展 resources 语义。
- `runtimeClient` 与 `src-tauri/src/core/mcp_runtime.rs` 需要提供与现有 MCP send path 一致的 resources protocol handling。
- `ResponsePanel` 与 history/replay 需要能在不引入富内容 viewer 的前提下展示 resources 结果与原始协议包。

</code_context>

<deferred>
## Deferred Ideas

- MCP `prompts` — 已在 Phase 09 规划，暂不纳入本 phase
- MCP `roots` — 已在 Phase 10 规划，暂不纳入本 phase
- MCP `sampling` — 延后到未来 milestone，因其涉及模型调用与安全边界
- 多 MCP server 管理 — 延后到未来 milestone，避免本期把工作台管理层复杂度拉高
- resource 专门 viewer（markdown / image / rich preview）— 不是 Phase 08 的范围，后续如有需要再单独规划

</deferred>

---

*Phase: 08-mcp-resources-workbench*
*Context gathered: 2026-04-07*
