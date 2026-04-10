---
phase: 11-mcp-stdio-transport
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/request.ts
  - src/lib/request-workspace.ts
  - src/lib/tauri-client.ts
  - src/lib/tauri-client.test.ts
  - src/lib/i18n.ts
  - src/features/mcp-workbench/components/McpRequestPanel.vue
  - src/features/mcp-workbench/components/McpRequestPanel.test.ts
  - src/components/request/RequestPanel.vue
  - src/components/request/RequestPanel.test.ts
  - src/features/app-shell/composables/useAppShellViewModel.ts
  - src/features/app-shell/state/app-shell-services.ts
  - src/features/app-shell/state/app-shell-services.test.ts
  - src/features/app-shell/state/app-shell-store.ts
  - src/features/app-shell/test/history.suite.ts
  - src/stage-gate.test.ts
  - src-tauri/src/models/request.rs
  - src-tauri/src/models/mod.rs
  - src-tauri/src/core/mcp_runtime.rs
  - src-tauri/src/commands/request.rs
  - src-tauri/tests/mcp_runtime_stdio.rs
autonomous: true
requirements:
  - MCPT-01
  - MCPT-02
  - MCPT-03
must_haves:
  truths:
    - 开发者可以在现有 MCP Workbench 内切换到 stdio，并用 `command + args` 调试单个本地 MCP server
    - HTTP 与 stdio 共用同一 MCP 主链路，仍然支持 initialize、discover、send、inspect、history 与 replay
    - stdio initialize 成功后复用已有会话/进程，失效或退出后可重建并将状态暴露为诊断证据
    - stdio 失败时可以看到结构化失败阶段、错误分类与 stderr 摘要，而不是只有模糊提示
  artifacts:
    - path: src/types/request.ts
      provides: stdio transport 配置、会话与诊断类型合同
    - path: src/features/mcp-workbench/components/McpRequestPanel.vue
      provides: MCP Workbench 中的 stdio 配置输入与 transport 切换 UI
    - path: src/features/app-shell/state/app-shell-services.ts
      provides: stdio 请求编排、错误归一化与历史/回放接线
    - path: src-tauri/src/core/mcp_runtime.rs
      provides: stdio runtime、会话复用/重建与结构化诊断映射
    - path: src-tauri/tests/mcp_runtime_stdio.rs
      provides: stdio runtime 回归测试
  key_links:
    - from: src/features/mcp-workbench/components/McpRequestPanel.vue
      to: src/features/app-shell/state/app-shell-services.ts
      via: update:mcp / discover-* / send events
      pattern: transport.*stdio|command|args
    - from: src/features/app-shell/state/app-shell-services.ts
      to: src-tauri/src/core/mcp_runtime.rs
      via: runtimeClient.sendMcpRequest
      pattern: stdio|session|stderr|phase
    - from: src-tauri/src/core/mcp_runtime.rs
      to: src/features/app-shell/state/app-shell-store.ts
      via: artifact / history / replay payload
      pattern: diagnostics|sessionState|stderrSummary
---

<objective>
在现有单 server MCP Workbench 主链路内补齐 stdio transport，让本地命令启动的 MCP server 可被初始化、调用、检查、回放，并在失败时暴露结构化、可定位的诊断信息。

Purpose: 完成 `MCPT-01`、`MCPT-02`、`MCPT-03`，把 MCP 调试从 HTTP-only 扩展到真实本地开发常见的 stdio 场景，同时保持既有 workbench 心智与诊断能力。
Output: 一条可执行的 stdio MCP 主链路，包含前端 transport 配置、前后端 DTO/服务扩展、Rust stdio runtime、会话复用/重建、history/replay 证据与结构化错误展示。
</objective>

<execution_context>
@/home/qiang/.codex/get-shit-done/workflows/execute-plan.md
@/home/qiang/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/11-mcp-stdio-transport/11-CONTEXT.md
@.planning/phases/10-mcp-roots-support/10-SUMMARY.md
@.planning/codebase/ARCHITECTURE.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/TESTING.md
@src/features/mcp-workbench/components/McpRequestPanel.vue
@src/components/request/RequestPanel.vue
@src/features/app-shell/state/app-shell-services.ts
@src/features/app-shell/state/app-shell-store.ts
@src/types/request.ts
@src-tauri/src/core/mcp_runtime.rs
@src-tauri/src/models/request.rs

<interfaces>
From `src/types/request.ts`:
```ts
export type McpTransportKind = 'http' | 'stdio'

export interface McpConnectionConfig {
  transport: McpTransportKind
  baseUrl: string
  headers: KeyValueItem[]
  auth: AuthConfig
  sessionId?: string
}
```

From `src/features/app-shell/state/app-shell-services.ts`:
```ts
discoverMcpTools: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<McpToolSchemaSnapshot[]>>
discoverMcpResources: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<McpResourceSnapshot[]>>
discoverMcpPrompts: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<McpPromptSnapshot[]>>
sendRequest: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<{ tabId: string; response: SendRequestResult }>>
```

From `src-tauri/src/core/mcp_runtime.rs`:
```rust
fn build_protocol_request(payload: &SendMcpRequestPayloadDto) -> Result<Value, AppError>
fn build_headers(payload: &SendMcpRequestPayloadDto) -> Result<HeaderMap, AppError>
```

Executor should extend these existing contracts instead of opening a parallel stdio-only pipeline. Per D-03, D-04, D-11, and D-12, stdio lives inside the same workbench and reuses the same request/history/replay lineage.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 定义 stdio transport 合同与工作台输入</name>
  <files>src/types/request.ts, src/lib/request-workspace.ts, src/lib/tauri-client.ts, src/lib/tauri-client.test.ts, src/features/mcp-workbench/components/McpRequestPanel.vue, src/features/mcp-workbench/components/McpRequestPanel.test.ts, src/components/request/RequestPanel.vue, src/components/request/RequestPanel.test.ts, src/features/app-shell/composables/useAppShellViewModel.ts, src/lib/i18n.ts</files>
  <behavior>
    - Test 1: MCP 请求定义可在 `http` 与 `stdio` 间切换，`stdio` 配置使用 `command + args` 结构，且不接受单行 shell 命令输入（per D-01, D-02）
    - Test 2: `McpRequestPanel` 在 stdio 模式下显示 command/args/状态提示，在 HTTP 模式下继续显示 baseUrl/auth/headers，不新增独立页面（per D-03, D-04）
    - Test 3: replay / clone / history snapshot 保留 transport 与 stdio 配置快照，不把 stdio 信息丢失为默认 HTTP
  </behavior>
  <action>先扩展前后端共享合同：在 `src/types/request.ts` 为 `McpConnectionConfig` 增加 `stdio` 所需字段，采用 `command + args` 作为唯一输入形态；不要实现单行 shell 命令字符串解析，不要引入 multi-server、全局 presets 或新的配置子系统。同步更新 `src/lib/request-workspace.ts` 和 `src/lib/tauri-client.ts` 的 clone / DTO 映射，确保历史与回放保留这些快照。随后修改 `McpRequestPanel.vue`、`RequestPanel.vue` 和必要的 view-model/文案接线，在 MCP 主配置区内加入 transport 切换后的 stdio 输入区，保持与既有 initialize/discovery/send 主流程一致（per D-01 to D-04, D-11, D-12）。补齐前端组件与 DTO 测试。</action>
  <verify>
    <automated>pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/components/request/RequestPanel.test.ts src/lib/tauri-client.test.ts src/lib/request-workspace.test.ts</automated>
  </verify>
  <done>请求定义、DTO 映射、MCP 面板和 replay 快照都能表达 stdio transport，且 UI 明确遵循 `command + args` 形态，不引入独立子系统或 deferred ideas。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 实现 stdio runtime、会话复用与结构化诊断</name>
  <files>src/features/app-shell/state/app-shell-services.ts, src/features/app-shell/state/app-shell-services.test.ts, src/features/app-shell/state/app-shell-store.ts, src/features/app-shell/test/history.suite.ts, src/stage-gate.test.ts, src-tauri/src/models/request.rs, src-tauri/src/models/mod.rs, src-tauri/src/core/mcp_runtime.rs, src-tauri/src/commands/request.rs, src-tauri/tests/mcp_runtime_stdio.rs</files>
  <behavior>
    - Test 1: stdio `initialize` 成功后，后续 `tools/resources/prompts` 请求复用已有会话/进程，而不是每次重启子进程（per D-08, D-10）
    - Test 2: 当进程退出、transport 断开或 session 失效时，请求路径会尝试重建，并把 `restarted` / `stale` / `disconnected` 之类诊断状态写回 artifact（per D-09）
    - Test 3: 启动失败、握手失败、请求发送失败、响应解析失败时，都返回结构化错误层级与 stderr 摘要，而不是仅有通用失败字符串（per D-05, D-06, D-07）
    - Test 4: history / replay 保留 stdio transport、诊断字段与失败证据，继续走统一 artifact 管道（per D-11, D-12）
  </behavior>
  <action>在 Rust 侧为 `SendMcpRequestPayloadDto` 与相关 artifact DTO 增加 stdio 配置和诊断字段，并在 `src-tauri/src/core/mcp_runtime.rs` 中沿现有 single-server runtime 增量扩展：新增 stdio transport 分支，根据 `command + args` 启动子进程、完成 JSON-RPC initialize 与后续调用；为单会话维护可复用的进程/会话状态；当进程退出、I/O 断开、session 无效时允许自动重建，但必须把失败阶段和重建结果写回 artifact。错误分类至少覆盖启动、握手/initialize、request send、response parse、session invalidation 五类，并输出结构化 `phase`、`category/layer`、`message`、`stderrSummary`。在 TS service 层统一把 runtime 错误归一为现有 MCP taxonomy，避免 UI 直接猜测 Rust 错误字符串；同时更新 store/history/replay 以保留这些 artifact 证据。不要引入 shell parser、roots 自动发现、sampling 或全局配置体系。</action>
  <verify>
    <automated>pnpm exec vitest run src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/stage-gate.test.ts && cargo test --manifest-path src-tauri/Cargo.toml mcp_runtime_stdio -- --nocapture</automated>
  </verify>
  <done>stdio MCP 请求可通过现有发送主链路完成 initialize/discovery/send，成功路径复用会话，失败路径返回结构化诊断与 stderr 摘要，history/replay 保留同一份证据。</done>
</task>

<task type="auto">
  <name>Task 3: 回归主链路并完成跨层验证</name>
  <files>src/features/mcp-workbench/components/McpRequestPanel.vue, src/features/app-shell/state/app-shell-services.ts, src/features/app-shell/state/app-shell-store.ts, src-tauri/src/core/mcp_runtime.rs, src-tauri/tests/mcp_runtime_stdio.rs</files>
  <action>以“同一 MCP workbench 主链路”做收口验证：确认 initialize、tools.list、resources.list/read、prompts.list/get 在 HTTP 与 stdio 下的配置入口、发送入口、结果检查、历史回放都保持一致心智；必要时只做最小回归修补，不追加新功能。补一条可执行的验证命令组合，确保前端类型、前端相关测试和 Rust 编译/测试都覆盖本 phase 改动。若运行中暴露与既有 HTTP 路径共享的耦合问题，只修 Phase 11 引入的回归，不展开 unrelated cleanup。</action>
  <verify>
    <automated>pnpm exec vue-tsc --noEmit && pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/components/request/RequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/lib/request-workspace.test.ts src/lib/tauri-client.test.ts src/stage-gate.test.ts && cargo check --manifest-path src-tauri/Cargo.toml</automated>
  </verify>
  <done>Phase 11 的前后端改动通过类型检查、重点测试和 Rust 编译验证；HTTP 主链路未被 stdio 扩展破坏，stdio 主链路满足要求且无额外 scope creep。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Workbench UI → TS service | 用户输入的 `command`、`args`、operation 和 prompt/tool 参数从前端进入发送编排 |
| TS service → Tauri command | 未信任的 transport 配置和 MCP payload 跨越桌面桥接进入 Rust 执行层 |
| Rust runtime → local stdio process | 本地子进程可能输出恶意/畸形 JSON-RPC、超长 stderr 或异常退出 |
| Rust runtime → history/artifact persistence | 诊断信息会被持久化并回放，若不过滤可能泄漏敏感路径或污染 UI |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-11-01 | E | `src-tauri/src/core/mcp_runtime.rs` stdio launcher | mitigate | 仅按 `command + args` 直接启动进程，不经 shell，不实现单行命令解析；在运行前校验 `command` 非空并拒绝无效配置（per D-01, D-02） |
| T-11-02 | T | stdio protocol parser | mitigate | 对 stdout 仅按 MCP/JSON-RPC 预期格式解析；将解析失败单独映射为 `response-parse` 阶段错误，避免把脏输出当成功结果 |
| T-11-03 | D | child process stderr/stdout handling | mitigate | 截断 `stderrSummary` 长度并限制缓存窗口，避免超长输出拖垮 UI / history；完整原始 stderr 不直接作为主展示 |
| T-11-04 | I | artifact/history diagnostics | mitigate | 结构化诊断中只持久化必要的 `stderrSummary`、phase、sessionState；避免把完整环境变量、敏感路径或凭证拼进错误消息 |
| T-11-05 | R | session rebuild lifecycle | mitigate | 在 artifact 中记录会话状态、是否重建和失败阶段，确保重建后的请求有可审计证据，避免“悄悄重启”导致无法诊断 |
| T-11-06 | S | UI transport mode switching | accept | 本 phase 为本地开发单用户桌面场景，transport 切换本身不引入额外身份伪造面；保持现有单工作台模型即可 |

</threat_model>

<verification>
- 先跑前端针对性测试，确认 stdio 配置输入、DTO 映射和错误展示不破坏 MCP 面板交互。
- 再跑 service/history 测试，确认结构化错误和 replay 证据贯通。
- 最后跑 Rust stdio runtime 测试与 `cargo check`，确认会话复用/重建与编译稳定。
</verification>

<success_criteria>
- `MCPT-01`: 可以在单一 MCP Workbench 中配置 `stdio` 的 `command + args` 并连接本地 server 执行 MCP 请求。
- `MCPT-02`: HTTP 与 stdio 共用同一 MCP 主链路，包括 operation、send、result inspection、history 与 replay。
- `MCPT-03`: stdio 失败时返回结构化错误、失败阶段与 stderr 摘要，且这些信息能进入 artifact/history 供后续诊断。
- 全阶段不实现任何 deferred ideas，尤其是不引入 multi-server、sampling、shell 命令字符串解析或独立 stdio 页面。
</success_criteria>

<output>
After completion, create `.planning/phases/11-mcp-stdio-transport/11-01-SUMMARY.md`
</output>
