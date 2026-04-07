# Phase 09 Research — MCP Prompts Workbench

## Research Question

如何在不破坏现有 MCP workbench 交互哲学的前提下，把 `prompts` 的发现、参数输入、执行、历史与回放接入现有单 server HTTP MCP 主链路，并同步完成一次较完整但范围受控的 MCP 工作台布局收敛？

## Existing Pattern Findings

### 1. Current MCP workbench is already operation-driven
- `src/features/mcp-workbench/components/McpRequestPanel.vue` 已围绕 `operation.type` 渲染不同 MCP 行为分支
- `src/types/request.ts` 已形成统一的 `McpOperationType` / `McpOperationInput` / `McpExecutionArtifact` 合同
- `src/features/app-shell/composables/useAppShellViewModel.ts` 已集中处理 discover / send / history / replay 的状态编排

**Implication:** prompts 最稳妥的接入方式是继续扩展现有 operation union，而不是新建 prompt 专属子系统。

### 2. Tools/resources already define the product philosophy
- tools 与 resources 都采用“显式 discovery + 显式 operation + 通用结果展示 + replay continuity”
- resources phase 已确认“discovery-first but not discovery-required”是有效模型
- 当前结果链路强调 raw protocol request/response 可见，而不是 domain-specific viewer

**Implication:** prompts 应尽量复用 resources 的交互哲学：先列 prompt，再选 prompt；但保留手动输入作为 fallback；结果仍走 generic protocol/result/history pipeline。

### 3. Existing UI pressure is real
- `McpRequestPanel.vue` 已同时承担传输方式、端点、operation、tools/resources 特定输入、协议辅助信息等职责
- 用户已明确指出 MCP 模式区与下方 MCP 工作台存在重复信息展示
- prompts 接入后，如果继续在既有布局上加区块，会进一步挤压主要操作区与参数编辑区

**Implication:** Phase 09 不能只叠加 prompts UI；必须同步收敛布局，把重复的 transport / operation / endpoint 信息压缩到单一主要入口。

## Prompt-Specific Design Constraints

### Prompt discovery and invocation shape
典型 MCP prompt workflow 更接近：
1. `prompts/list`
2. 选择 prompt
3. 根据 prompt 的 arguments/schema 组织输入
4. 发起 prompt 获取/执行（具体协议命名可在实现时确定）
5. 查看结果与原始协议包

**Planning consequence:** 需要把 prompts 拆成至少两类 operation：
- prompt discovery (`prompts.list`)
- prompt execution/get (`prompts.get` 或协议等价形式)

### Prompt arguments are similar to tool arguments, but not identical
prompts 也可能带结构化参数，但其 schema/argument 定义形式与 tools 不一定完全一致。

**Planning consequence:**
- 优先复用 `tools.call` 的“结构化表单 + 原始 JSON”交互外形
- 但要预留 prompt argument definition → form model 的独立转换逻辑，避免硬把 prompt argument shape 当成 tool input schema

### Result viewing should remain boring
prompt 返回内容可能更接近文本片段、消息数组或结构化片段，容易诱导出“做个 prompt 预览器”的冲动。

**Planning consequence:** 明确禁止 rich prompt viewer；Phase 09 只允许沿用 generic response/protocol display。

## Recommended Implementation Shape

### Track 1: Extend prompt contracts and runtime first
先在 TS / Rust 两侧补齐：
- `prompts.list`
- `prompts.get`（或最终决定的执行 operation）
- prompt snapshot / selected prompt / cached prompts / prompt argument snapshot
- history/replay 所需 artifact 字段

这样 UI 层才能在统一 contract 上接 prompts，而不是先写临时界面。

### Track 2: Reuse discovery-first authoring with prompt-specific conversion
在 `McpRequestPanel.vue` 中：
- 增加 prompt discovery action
- 增加 prompt selection + manual name fallback
- 增加 prompt arguments editor
- 最大化复用现有 schema/raw 切换交互

但 prompt 参数定义转表单时，应有单独的小型转换层，而不是污染 tools 的 schema 逻辑。

### Track 3: Fold layout convergence into the same pass
因为 prompts 会明显扩大 authoring UI 复杂度，布局收敛必须与 prompts authoring 同步做，否则会出现：
- 先加 prompts 让 UI 更挤
- 再二次改 layout

这会让计划和测试都更碎。

**Recommended boundary:**
- 只收敛 MCP 工作台内部层级
- 允许调整 `RequestPanel.vue` / `WorkbenchShell.vue` / `McpRequestPanel.vue` 的信息组织
- 不扩大为 HTTP 面板通用改版

## Risks and Pitfalls

### Risk 1: Prompt 参数模型被错误硬套到 tool schema
如果直接把 prompts 当成 tools schema 复用，可能导致：
- 表单字段映射不准确
- replay snapshot 不完整
- future prompts/roots phase 更难扩展

**Mitigation:** 单独引入 prompt argument definition → form model 的小转换层，复用 UI 形态但不强绑同一内部结构。

### Risk 2: Layout refactor scope drifts
用户允许较完整布局收敛，但这很容易滑向“顺手改整个 request workbench”。

**Mitigation:** 在计划里明确 layout work 只服务于 MCP 工作台：去重 transport / endpoint / operation 信息，提升参数编辑区空间，不动 HTTP 主链路。

### Risk 3: Replay/history loses prompt context
如果只保存 prompt 结果，不保存 prompt 名、参数与发现快照，history replay 会退化。

**Mitigation:** 把 prompts 纳入现有 artifact/history contract，确保 replay 仍保留 operation + prompt name + arguments snapshot。

### Risk 4: Discovery missing blocks prompt usage
如果 UI 强依赖 discovery，服务不稳定时 prompt 调试就不可用。

**Mitigation:** 保持手动 prompt 名 fallback，并允许缺少 definition 时直接用 raw JSON 参数输入。

## Suggested Task Breakdown

1. 扩展 prompts operation / snapshot / runtime contracts
2. 接入 prompts discovery + authoring UI + argument conversion
3. 在同一轮内完成 MCP workbench layout convergence
4. 复用 generic result/history/replay 并补验证

## Validation Focus

优先验证四条主链路：
1. `prompts.list` 可执行并缓存 discovery 结果
2. `prompts.get` 可在 discovery 有/无两种情况下工作
3. prompt 参数支持 structured/raw 双模式
4. history/replay 保留 prompt 名、参数与协议上下文

## Conclusion

Phase 09 最合理的实现方式是：
- 在现有 operation-driven MCP architecture 上增量扩展 prompts
- 沿用 resources 的 discovery-first but not required 模式
- 继续保持 generic result / protocol / replay philosophy
- 把 MCP 布局收敛与 prompts 接入作为一个整体交付，而不是拆成两个互相干扰的阶段内任务
