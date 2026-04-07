# Phase 08: MCP Resources Workbench - Research

**Researched:** 2026-04-07
**Domain:** MCP resources workbench extension inside the existing Vue 3 + Tauri MCP request flow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Claude's Discretion
- 资源列表在 UI 中的具体布局、筛选 affordance、空状态和 skeleton 细节
- 通用 resource 结果展示的具体文案与字段分组
- resource 标识 / URI 输入控件的具体样式与 placement

### Deferred Ideas (OUT OF SCOPE)
- MCP `prompts` — 已在下一 phase 规划，暂不纳入本 phase
- MCP `roots` — 作为会话输入配置单独处理，暂不纳入本 phase
- MCP `sampling` — 延后到未来 milestone，因其涉及模型调用与安全边界
- 多 MCP server 管理 — 延后到未来 milestone，避免本期把工作台管理层复杂度拉高
- resource 专门 viewer（markdown / image / rich preview）— 不是 Phase 08 的范围，后续如有需要再单独规划
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCPR-01 | 开发者可以列出 MCP server 暴露的 resources | Use explicit `resources.list` operation, reuse existing discover/send/history chain, and persist latest resource discovery snapshot for selection and replay context. [VERIFIED: local codebase] |
| MCPR-02 | 开发者可以读取单个 MCP resource，并查看结构化结果与原始协议内容 | Add explicit `resources.read` input and runtime mapping to `resources/read`, then reuse existing `mcpArtifact.protocolRequest` / `protocolResponse` response panel plumbing. [VERIFIED: local codebase] [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts] |
| MCPR-03 | 开发者可以回放 resource 读取请求，并保留足够的上下文用于诊断 | Extend request snapshot, history summary, and replay draft cloning to carry resource selection and latest discovery evidence without mutating current editable state. [VERIFIED: local codebase] |
</phase_requirements>

## Summary

Phase 08 should be implemented as a narrow extension of the existing operation-driven MCP workbench, not as a new subsystem. The repo already has the correct seams: `McpRequestPanel.vue` owns MCP authoring UI, `useAppShellViewModel.ts` owns explicit discovery orchestration, `app-shell-services.ts` owns runtime calls, `app-shell-store.ts` owns response/history persistence, and `request-workspace.ts` owns snapshot/replay cloning. Extending those seams for `resources.list` and `resources.read` matches both the current code shape and the locked Phase 08 decisions. [VERIFIED: local codebase]

The MCP spec supports `resources/list` as a paginated request returning `resources: Resource[]`, and `resources/read` as a request with `params.uri` returning `contents: (TextResourceContents | BlobResourceContents)[]`. Resource links returned from tools are not guaranteed to appear in `resources/list`, which reinforces the locked decision to allow manual URI entry even when discovery has not run. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]

**Primary recommendation:** Add `resources.list` and `resources.read` as first-class MCP operations end-to-end, reuse the existing discovery/history/replay artifact path, and keep result rendering generic JSON/text/blob only. [VERIFIED: local codebase] [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vue` | `3.5.13` in repo; latest npm `3.5.13` | MCP workbench UI composition | Existing request workbench is already built in Vue 3 composables and components; Phase 08 should extend that surface instead of introducing a new UI layer. [VERIFIED: package.json] [VERIFIED: npm registry] |
| `typescript` | `6.0.2` in repo | Operation/request/history type expansion | Current MCP request, artifact, and replay contracts are defined in TypeScript unions and interfaces, so Phase 08 type changes belong there first. [VERIFIED: package.json] [VERIFIED: local codebase] |
| `@tauri-apps/api` | repo range `^2` | Frontend-to-Rust runtime bridge | Existing MCP runtime calls already flow through the Tauri invoke client, so resources should reuse the same bridge. [VERIFIED: package.json] [VERIFIED: local codebase] |
| `reqwest` | Rust runtime dependency already used by MCP HTTP execution | MCP protocol transport execution | `src-tauri/src/core/mcp_runtime.rs` already posts MCP JSON-RPC over HTTP and captures protocol envelopes; resources should extend this runtime instead of adding a JS-side client. [VERIFIED: local codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `4.1.1` in repo; latest npm `4.1.1` | Request panel, workspace, and client regression tests | Use for operation-union changes, replay fidelity, and UI validation around new resource flows. [VERIFIED: package.json] [VERIFIED: npm registry] |
| `@vue/test-utils` | `2.4.6` in repo; latest npm `2.4.6` | Component-level MCP workbench tests | Use for `McpRequestPanel` and request panel interaction coverage. [VERIFIED: package.json] [VERIFIED: npm registry] |
| `@modelcontextprotocol/sdk` | latest npm `1.29.0` published 2026-03-30 | Spec/package currency check only | Use as a reference point for current MCP surface area; this phase does not need to add the SDK because the app already speaks protocol directly through Rust. [VERIFIED: npm registry] [VERIFIED: local codebase] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing current MCP workbench seams | Separate resources browser subsystem | Conflicts with the repo's operation-driven MCP model and duplicates history/replay logic already present. [VERIFIED: local codebase] |
| Direct Rust JSON-RPC mapping | Add MCP SDK in frontend/runtime | Unnecessary for Phase 08 because HTTP MCP execution is already implemented in `mcp_runtime.rs`; adding the SDK increases scope without addressing a current gap. [VERIFIED: local codebase] |

**Installation:**
```bash
# No new dependency is required for Phase 08.
```

**Version verification:**
```bash
npm view vue version
npm view vitest version
npm view @vue/test-utils version
npm view @modelcontextprotocol/sdk version
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── features/mcp-workbench/components/   # MCP authoring UI extensions for resources.list/read
├── features/app-shell/composables/      # Explicit discovery orchestration and tab updates
├── features/app-shell/state/            # Runtime service + store persistence for MCP artifacts/history
├── lib/                                 # Snapshot/replay cloning and tauri bridge payload mapping
└── types/                               # Request, artifact, history, and discovery type unions

src-tauri/
└── src/core/                            # MCP protocol request/response mapping in Rust
```

### Pattern 1: Operation-Driven MCP Authoring
**What:** MCP requests are modeled as tagged operation unions rather than a freeform command panel. `src/types/request.ts` currently limits `McpOperationType` and `McpOperationInput` to `initialize`, `tools.list`, and `tools.call`, and Rust mirrors that with `McpOperationInputDto`. [VERIFIED: local codebase]
**When to use:** Add `resources.list` and `resources.read` by extending the same discriminated unions in TypeScript and Rust, then thread those through existing payload builders. [VERIFIED: local codebase]
**Example:**
```typescript
export type McpOperationType = 'initialize' | 'tools.list' | 'tools.call'

export type McpOperationInput =
  | { type: 'initialize'; input: McpInitializeInput }
  | { type: 'tools.list'; input: McpToolsListInput }
  | { type: 'tools.call'; input: McpToolCallInput }
```
Source: `src/types/request.ts` [VERIFIED: local codebase]

### Pattern 2: Explicit Discovery Through ViewModel → Service → Runtime
**What:** Tool discovery is explicitly triggered from the view model, validated by app-shell services, then forwarded to the runtime bridge; it is not performed implicitly during send. `useAppShellViewModel.ts` calls `services.discoverMcpTools`, and `app-shell-services.ts` rejects non-MCP payloads before invoking runtime discovery. [VERIFIED: local codebase]
**When to use:** Implement `discoverMcpResources` with the same orchestration shape, or generalize discovery plumbing only if that can be done without widening scope beyond tools/resources. [VERIFIED: local codebase]
**Example:**
```typescript
const result = await deps.services.discoverMcpTools({ payload })
```
Source: `src/features/app-shell/composables/useAppShellViewModel.ts` [VERIFIED: local codebase]

### Pattern 3: Latest-Discovery-First, Replay-Safe State
**What:** Current behavior updates editable MCP state from the latest discovery result, while history snapshots and replay drafts preserve evidence without overwriting the current editor state. The Phase 08 context explicitly locks this semantic in for resources too. [VERIFIED: local codebase] [VERIFIED: .planning context]
**When to use:** Cache latest discovered resources on the active tab or related MCP state for selection assistance, but do not hydrate that cache back from replay/history into the current editing state unless the user explicitly opens a replay draft. [VERIFIED: local codebase] [VERIFIED: .planning context]

### Pattern 4: Protocol Envelope Reuse for Diagnostics
**What:** The response panel already renders `mcpArtifact.operation`, `transport`, `errorCategory`, `protocolRequest`, and `protocolResponse`, independent of tool-specific viewers. [VERIFIED: local codebase]
**When to use:** Preserve generic response rendering for resource reads; attach any resource-specific metadata to `mcpArtifact` only when it improves replay/history fidelity, not to create a custom viewer in this phase. [VERIFIED: local codebase]

### Anti-Patterns to Avoid
- **Implicit list-then-read coupling:** Do not hide `resources.read` behind a selection-only flow; the spec and locked decisions both require manual URI entry to remain possible. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts] [VERIFIED: .planning context]
- **Resource-specific side channel state:** Do not store resources outside the existing MCP request/history/artifact model; that would break replay and duplicate current workbench infrastructure. [VERIFIED: local codebase]
- **Rich preview expansion:** Do not add markdown/image/resource-specialized viewers in Phase 08; the locked scope is generic JSON/text/blob only. [VERIFIED: .planning context]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP request transport | Separate frontend HTTP JSON-RPC client | Existing Rust `execute_mcp_request` path | The runtime already handles headers, session id, SSE payload extraction, protocol envelope capture, and error categorization. [VERIFIED: local codebase] |
| Replay cloning | One-off resource replay copier | Existing `request-workspace.ts` snapshot/replay helpers | The repo already clones MCP request snapshots and response artifacts for replay drafts; extending that path keeps fidelity consistent. [VERIFIED: local codebase] |
| Diagnostics UI | New resource inspector pane | Existing `ResponsePanel.vue` MCP protocol sections | Structured payload plus protocol envelope is already rendered there and matches Phase 08 scope. [VERIFIED: local codebase] |
| History presentation | Parallel resources activity list | Existing history items with `mcpSummary` | Sidebar history already formats MCP operation/transport/error summary for all MCP requests. [VERIFIED: local codebase] |

**Key insight:** The difficult part of Phase 08 is not fetching resources; it is preserving operation identity, discovery continuity, and replay diagnostics through the same artifacts and snapshots the tools workflow already uses. [VERIFIED: local codebase]

## Common Pitfalls

### Pitfall 1: Treating `resources.read` as “just another tools.call`
**What goes wrong:** Resource reads get jammed into tool-call-specific schema fields or labels, which contaminates history summaries and replay semantics. [VERIFIED: local codebase]
**Why it happens:** Current artifact DTOs include `selected_tool`, and current error taxonomy includes `tool-call`; copying that logic verbatim creates naming drift. [VERIFIED: local codebase]
**How to avoid:** Extend artifacts with resource-specific optional fields only where needed, and generalize labels where the UI currently assumes tool-centric wording. [VERIFIED: local codebase]
**Warning signs:** History rows or response badges show `tools.call` semantics for resource operations, or replay drafts lose the target URI. [VERIFIED: local codebase]

### Pitfall 2: Overwriting editable state from history or stale discovery
**What goes wrong:** Opening a replay draft or reusing historical results mutates the current tab's latest resource cache, making it unclear which discovery snapshot is current. [VERIFIED: .planning context] [VERIFIED: local codebase]
**Why it happens:** Replay and discovery both traverse the same request models; without explicit separation, stale evidence can look like live state. [VERIFIED: local codebase]
**How to avoid:** Keep latest discovery attached to current tab state only on explicit discovery success, and keep history snapshots read-only evidence. [VERIFIED: .planning context] [VERIFIED: local codebase]
**Warning signs:** A replayed tab immediately shows resources as “current” without an explicit list action in the new session. [VERIFIED: .planning context]

### Pitfall 3: Assuming listed resources are the only readable resources
**What goes wrong:** The UI blocks manual URI entry or validation because the URI is not in the last list result. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]
**Why it happens:** Discovery-first UX can accidentally become discovery-required UX. [VERIFIED: .planning context]
**How to avoid:** Treat discovery as assistive context only; warn when the URI is undiscovered, but still allow send. [VERIFIED: .planning context]
**Warning signs:** Disabled send button for a valid manual URI, or hard validation that requires a discovered match. [VERIFIED: .planning context]

### Pitfall 4: Under-modeling `resources/read` result contents
**What goes wrong:** The implementation assumes a single text payload and drops binary or multi-part contents. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]
**Why it happens:** Tool-call results today often appear as generic JSON, but resource reads return `contents[]` with text/blob variants. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]
**How to avoid:** Preserve raw `protocolResponse`, and if adding convenience fields, keep them array-shaped and variant-aware. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]
**Warning signs:** Only the first content item is shown, or blob payloads are silently dropped. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]

## Code Examples

Verified patterns from official and local sources:

### Local Pattern: Extend operation union rather than branching on strings everywhere
```typescript
export type McpOperationInput =
  | { type: 'initialize'; input: McpInitializeInput }
  | { type: 'tools.list'; input: McpToolsListInput }
  | { type: 'tools.call'; input: McpToolCallInput }
```
Source: `src/types/request.ts` [VERIFIED: local codebase]

### Local Pattern: MCP response panel already reads generic protocol envelopes
```typescript
const mcpProtocolContent = computed(() => JSON.stringify({
  request: props.mcpArtifact?.protocolRequest ?? null,
  response: props.mcpArtifact?.protocolResponse ?? null,
}, null, 2))
```
Source: `src/components/response/ResponsePanel.vue` [VERIFIED: local codebase]

### Official Pattern: `resources/list`
```typescript
export interface ListResourcesRequest extends PaginatedRequest {
  method: "resources/list";
}

export interface ListResourcesResult extends PaginatedResult {
  resources: Resource[];
}
```
Source: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]

### Official Pattern: `resources/read`
```typescript
export interface ReadResourceRequest extends Request {
  method: "resources/read";
  params: { uri: string };
}

export interface ReadResourceResult extends Result {
  contents: (TextResourceContents | BlobResourceContents)[];
}
```
Source: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool-only MCP workbench | Operation-driven workbench with explicit discovery, protocol artifacts, and replay fidelity | Present in Phases 05 and 07 artifacts and current code | Phase 08 should plug into the established chain instead of inventing a resource-specific flow. [VERIFIED: local codebase] [VERIFIED: .planning docs] |
| Implicit or auto-refreshed capability assumptions | Latest-discovery-first, explicit discovery semantics | Locked by Phase 07 planning/context and reflected in current tool discovery flow | Resources should use explicit list actions and warning-not-blocking behavior. [VERIFIED: .planning context] [VERIFIED: local codebase] |

**Deprecated/outdated:**
- Tool-centric naming as a universal MCP model is outdated for this phase; `selected_tool` and `tool-call`-specific labels are acceptable for tools but should not drive the design of resource operations. [VERIFIED: local codebase]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `reqwest` remains the Rust dependency used for MCP HTTP runtime in the current Cargo manifest, even though this research relied primarily on runtime source rather than re-parsing the full manifest. [ASSUMED] | Standard Stack | Low — implementation still reuses the existing Rust runtime path regardless of manifest wording. |

## Open Questions

1. **Should resource discovery be a dedicated service method or a generalized discovery primitive?**
   - What we know: The current app-shell uses `discoverMcpTools` with explicit UI wiring and success handling. [VERIFIED: local codebase]
   - What's unclear: Whether the planner prefers a second parallel method (`discoverMcpResources`) or a narrower generalization (`discoverMcpCapabilities`) for tools/resources only. [VERIFIED: local codebase]
   - Recommendation: Prefer a dedicated `discoverMcpResources` method unless a tiny shared abstraction falls out naturally during implementation; avoid a broad capability framework in this phase. [VERIFIED: local codebase]

2. **How much resource metadata should be normalized into first-class fields?**
   - What we know: The MCP spec exposes `Resource` fields like `uri`, `name`, `description`, `mimeType`, `size`, and `_meta`, while `resources/read` returns `contents[]`. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]
   - What's unclear: Whether the planner wants a new `selectedResource` artifact snapshot mirroring `selected_tool`, or whether raw protocol plus request snapshot is sufficient. [VERIFIED: local codebase]
   - Recommendation: Normalize only the minimum fields needed for authoring/replay convenience, likely URI plus the last selected/discovered resource summary; leave full fidelity in `protocolResponse`. [VERIFIED: local codebase] [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | Frontend tests/build and npm registry verification | ✓ | `v25.7.0` | — |
| `pnpm` | Repo test/build commands | ✓ | `10.33.0` | `npm` for registry lookup only, not recommended for repo workflow |
| `cargo` | Rust-side validation | ✓ | `1.93.1` | — |

**Missing dependencies with no fallback:**
- None. [VERIFIED: local environment]

**Missing dependencies with fallback:**
- None. [VERIFIED: local environment]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Reuse existing MCP auth/header config paths; do not introduce new credential storage or auth model in Phase 08. [VERIFIED: local codebase] |
| V3 Session Management | yes | Reuse existing MCP session id passthrough in request headers and artifact capture. [VERIFIED: local codebase] |
| V4 Access Control | no | Phase 08 is a local single-user desktop workbench feature, not a multi-user authorization boundary. [VERIFIED: project scope] |
| V5 Input Validation | yes | Continue validating header/auth/url/operation payloads in TypeScript and Rust, especially URI presence for `resources.read`. [VERIFIED: local codebase] [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts] |
| V6 Cryptography | no | No new crypto is introduced in this phase; continue using transport/auth primitives already present. [VERIFIED: local codebase] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed URI or missing read target | Tampering | Validate `resources.read` URI before send and return clear user-facing errors without leaking internals. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts] [VERIFIED: local codebase] |
| Sensitive data echoed in protocol payloads | Information Disclosure | Reuse current response/history handling and avoid adding extra persistence beyond existing request snapshot and protocol envelope fields. [VERIFIED: local codebase] |
| Session confusion after replay | Spoofing | Keep replay as draft evidence and avoid automatically treating historical resource discoveries as current session truth. [VERIFIED: .planning context] |

## Sources

### Primary (HIGH confidence)
- Local codebase — MCP request/workbench seams in `src/features/mcp-workbench/components/McpRequestPanel.vue`, `src/features/app-shell/composables/useAppShellViewModel.ts`, `src/features/app-shell/state/app-shell-services.ts`, `src/features/app-shell/state/app-shell-store.ts`, `src/lib/request-workspace.ts`, `src/types/request.ts`, `src-tauri/src/core/mcp_runtime.rs`, `src-tauri/src/models/request.rs`, `src-tauri/src/models/app.rs`. [VERIFIED: local codebase]
- MCP official schema — `resources/list`, `resources/read`, `Resource`, `TextResourceContents`, `BlobResourceContents`, and resource-link caveat. [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]
- npm registry — current versions for `vue`, `vitest`, `@vue/test-utils`, and `@modelcontextprotocol/sdk`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/phases/08-mcp-resources-workbench/08-CONTEXT.md` for phase scope and locked decisions. [VERIFIED: .planning docs]
- `.planning/phases/05-mcp-workbench-hardening/05-SUMMARY.md`, `.planning/phases/05-mcp-workbench-hardening/05-VERIFICATION.md`, `.planning/phases/07-mcp-workbench-and-audit-closure/07-SUMMARY.md`, and `.planning/phases/07-mcp-workbench-and-audit-closure/07-PLAN.md` for baseline and continuity constraints. [VERIFIED: .planning docs]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - The phase reuses the existing repo stack, and npm package versions were verified directly. [VERIFIED: local codebase] [VERIFIED: npm registry]
- Architecture: HIGH - The required seams and current MCP flow are present in the local codebase and align with the locked Phase 08 context. [VERIFIED: local codebase] [VERIFIED: .planning docs]
- Pitfalls: HIGH - Risks follow directly from current tool-centric structures plus official MCP resources semantics. [VERIFIED: local codebase] [CITED: https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-06-18/schema.ts]

**Research date:** 2026-04-07
**Valid until:** 2026-05-07

## Minimum Validation Commands

- `pnpm test -- src/lib/request-workspace.test.ts src/lib/tauri-client.test.ts src/components/request/RequestPanel.test.ts src/components/response/ResponsePanel.test.ts src/components/layout/AppSidebar.test.ts` — minimum focused frontend regression set for operation unions, payload forwarding, replay fidelity, MCP response rendering, and history summary behavior. [VERIFIED: local codebase] [VERIFIED: package.json]
- `cargo check --manifest-path src-tauri/Cargo.toml` — minimum Rust validation for DTO and runtime changes. [VERIFIED: AGENTS.md] [VERIFIED: local environment]
- `pnpm build` — minimum integration build for TypeScript union changes across the app shell and request workbench. [VERIFIED: package.json] [VERIFIED: AGENTS.md]
