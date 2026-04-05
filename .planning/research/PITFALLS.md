# Domain Pitfalls

**Domain:** local-first desktop API workbench evolving toward AI / Agent / MCP workbench
**Researched:** 2026-04-06

## Critical Pitfalls

Mistakes here usually force data-model rewrites, runtime boundary rework, or trust-damaging regressions.

### Pitfall 1: Treating AI/Agent actions as "just another request"
**What goes wrong:** The product extends from HTTP debug flows into agent runs, MCP tool calls, prompt-generated requests, and multi-step workflows, but keeps a flat request-centric model. Agent runs then have nowhere clean to store step lineage, tool decisions, intermediate artifacts, approvals, retries, or user overrides.
**Why it happens:** Teams reuse the existing request tab/history model because it is already working. In ZenRequest, current orchestration is intentionally centered around request workbench state in `src/features/app-shell/composables/useAppShell.ts`, workspace persistence in `src/lib/request-workspace.ts`, and history persistence behind `src-tauri/src/services/history_service.rs`.
**Consequences:** Agent features become bolted onto request tabs, history becomes unreadable, replay fidelity drops, and later MCP / tool workflow support requires schema churn across frontend and Rust.
**Warning signs:**
- New AI or agent flows are represented only by adding more optional fields onto request DTOs in `src/types/request.ts`.
- A single history item must describe prompts, tool selection, approvals, outputs, and final HTTP/MCP artifacts at once.
- UI logic in `src/features/app-shell/composables/useAppShell.ts` starts branching heavily by `requestKind` plus ad-hoc agent flags.
**Prevention:** Introduce a first-class execution model early: request execution, MCP interaction, and agent run should share a common envelope but keep distinct artifact payloads and lifecycle states. Preserve the current request workbench UX, but avoid making it the only domain aggregate.
**Detection:** A new feature cannot be replayed without reconstructing hidden UI state, or a new execution type requires changing multiple unrelated request snapshots.
**Phase to address:** Earliest architecture phase before adding multi-step agent workflows or prompt-to-tool features.

### Pitfall 2: Leaking secrets through local persistence and AI context assembly
**What goes wrong:** Local-first products often assume "local = safe" and persist raw headers, auth material, environment values, imported specs, and agent transcripts without proper redaction boundaries. Once AI features assemble context windows or export traces, sensitive data leaks into logs, history, snapshots, or copied prompts.
**Why it happens:** Existing API tool behavior rewards complete replayability, and teams later layer AI summarization over the same data. ZenRequest already stores workspaces/history locally and resolves environment values before execution through Rust runtimes such as `src-tauri/src/core/request_runtime.rs`.
**Consequences:** Privacy promises break, users stop trusting AI features, and sensitive data can be exposed through exports, debugging output, copied prompts, or future MCP tool invocations.
**Warning signs:**
- Persisted history contains fully resolved secrets by default.
- AI prompt assembly reads directly from raw history/workspace records instead of a redacted projection.
- The runtime bridge in `src/lib/tauri-client.ts` returns values that are convenient for UI replay but unsafe for downstream model context.
**Prevention:** Split data into authoring values, resolved execution values, and AI-safe projections. Default to redacted persistence for auth and secret material, and require explicit opt-in to include sensitive content in replay/export/model context.
**Detection:** A bug report or test snapshot contains bearer tokens, API keys, cookies, or internal hostnames.
**Phase to address:** Security/data-model phase before shipping AI summarization, prompt generation, or agent memory features.

### Pitfall 3: Mixing runtime execution policy into the Vue shell
**What goes wrong:** Product logic for retries, timeouts, approval gates, agent step transitions, protocol capability checks, or MCP discovery caching drifts upward into composables and UI components instead of staying in service/domain/runtime layers.
**Why it happens:** The shell is already the easiest place to coordinate interactions. ZenRequest correctly centralizes app orchestration in `src/features/app-shell/composables/useAppShell.ts` and runtime bridging in `src/lib/tauri-client.ts`; extending AI features creates pressure to shortcut this boundary.
**Consequences:** The UI becomes the hidden source of truth, headless execution becomes hard, tests become brittle, and future automation or background execution cannot reuse behavior safely.
**Warning signs:**
- New agent logic is added directly to component event handlers or view-model composables.
- Frontend tests need deep component mounting just to verify execution policy.
- Rust or service-layer code becomes a thin transport wrapper while business rules accumulate in Vue.
**Prevention:** Keep the current split and push new execution policy into service/domain layers first. UI should request actions and render state, not decide workflow correctness.
**Detection:** The same agent or MCP rule must be duplicated in multiple components or cannot be tested without DOM interaction.
**Phase to address:** Every protocol-expansion phase; enforce before agent UX work starts.

### Pitfall 4: Underestimating MCP as a stateful protocol, not a single RPC flavor
**What goes wrong:** Teams implement `initialize`, `tools.list`, and `tools.call` as isolated buttons but do not model session capabilities, server lifecycle, schema evolution, auth renewal, transport variance, or tool caching invalidation.
**Why it happens:** Early MCP support often starts as request replay parity. ZenRequest already has an MCP runtime boundary in `src-tauri/src/core/mcp_runtime.rs`, MCP UI in `src/features/mcp-workbench/components/McpRequestPanel.vue`, and evidence of cached tool handling in `src/features/app-shell/state/app-shell-services.test.ts`.
**Consequences:** Real servers behave inconsistently, stale tool definitions cause invalid calls, transport/auth edge cases explode, and users conclude MCP support is flaky.
**Warning signs:**
- Tool discovery results are cached without capability/version invalidation.
- MCP history stores only request/response payloads but not negotiated session state.
- Feature planning treats MCP support as complete after adding more tool-call UI affordances.
**Prevention:** Treat MCP as a session-oriented capability surface. Persist enough negotiated metadata to replay safely, but isolate transient session state from durable history. Design explicit invalidation and re-discovery rules.
**Detection:** A successful `tools.call` depends on unseen prior discovery or initialization state that history replay does not capture.
**Phase to address:** Dedicated MCP hardening phase before broader agent/tooling positioning.

### Pitfall 5: Letting imports become the de facto domain model
**What goes wrong:** OpenAPI, cURL, collection import, and future prompt/doc ingestion formats gradually dictate internal request and collection shapes. The app becomes a translation layer for external formats instead of owning a stable internal model.
**Why it happens:** Import wins are visible and easy to prioritize. Current code already has import-specific services like `src-tauri/src/services/import_service.rs` and concern notes indicating an oversized import pipeline in `.planning/codebase/CONCERNS.md`.
**Consequences:** Internal types become bloated with format-specific optional fields, save/load paths get fragile, and every new importer increases maintenance cost.
**Warning signs:**
- A new format requires changing core workspace/request entities instead of only adapter code.
- Import diagnostics and imported model state are tightly coupled.
- Fixing one importer risks regressions in request editing or persistence.
**Prevention:** Keep a narrow internal request/workspace model and push all normalization into import adapters. Imported provenance can be attached as metadata, not embedded into core editing state.
**Detection:** The importer owns business rules that should belong to the domain model, or removing one import format would break core types.
**Phase to address:** Import/export refactor phase before adding doc-to-request or AI-assisted import.

## Moderate Pitfalls

### Pitfall 6: History that optimizes replay but destroys explainability
**What goes wrong:** History captures enough to replay raw requests, but not enough to explain why an execution happened, which environment values were materialized, what user/agent edits occurred, or what branch of a workflow produced the result.
**Prevention:** Separate user-authored snapshot, resolved execution snapshot, and result artifact. Keep each history entry explainable to humans, not just replayable by code.
**Warning signs:** Users can rerun a request but cannot understand why today’s result differs from yesterday’s.
**Phase to address:** History model phase before agent-run or multi-step workflow launch.

### Pitfall 7: Workspace state and runtime state drifting apart
**What goes wrong:** The persisted workspace model says one thing, runtime caches say another, and UI state says a third. This is especially dangerous once MCP discovery caches, environment resolution, and agent memory are introduced.
**Prevention:** Define which state is durable, which is cached, and which is ephemeral. Make transitions explicit across `src/lib/request-workspace.ts`, `src/lib/tauri-client.ts`, and Rust services under `src-tauri/src/services/`.
**Warning signs:** Refreshing the app "fixes" inconsistent behavior; tests require manual cache setup to reproduce bugs.
**Phase to address:** State-boundary cleanup phase before long-lived agent sessions.

### Pitfall 8: Chasing parity with Postman instead of doubling down on local-native strengths
**What goes wrong:** Teams add team-cloud patterns, heavy collaboration abstractions, or generic plugin marketplaces too early, while core local workflows remain rough.
**Prevention:** Keep milestone sequencing aligned with `.planning/PROJECT.md`: improve daily request debugging, execution engine quality, and extension boundaries first. Add AI features that amplify local workflows, not features that drag the product into cloud-platform complexity.
**Warning signs:** New roadmap items optimize sharing/admin surface more than single-user execution speed and trust.
**Phase to address:** Roadmap planning phase for every subsequent milestone.

### Pitfall 9: Assuming "tool call success" equals good agent UX
**What goes wrong:** MCP and tool-call plumbing works, but users still cannot inspect inputs, diff outputs, intervene mid-run, or safely approve side effects.
**Prevention:** Design observability and interruption controls as first-class UX, not polish. Agent workbench value comes from inspectability, not just automation.
**Warning signs:** Demos focus on autonomous success paths, while debugging or approval flows are still undefined.
**Phase to address:** First agent UX phase, before autonomy depth increases.

### Pitfall 10: No failure budget for flaky external systems
**What goes wrong:** AI providers, MCP servers, and remote APIs fail in partial and weird ways, but the product treats failures as generic errors without resumability or triage clues.
**Prevention:** Standardize structured error envelopes, retry guidance, partial-result handling, and user-visible failure provenance across frontend and Rust boundaries.
**Warning signs:** Different runtimes return incompatible error shapes or the UI can only show "request failed".
**Phase to address:** Reliability phase before connecting multiple external runtimes in one workflow.

## Minor Pitfalls

### Pitfall 11: Test strategy lagging behind execution complexity
**What goes wrong:** Unit and integration coverage remain request-panel centric while agent/MCP workflows introduce asynchronous orchestration, state transitions, and replay invariants.
**Prevention:** Extend the existing Vitest-heavy strategy documented in `.planning/codebase/TESTING.md` toward service/domain orchestration tests before adding browser/E2E weight. Focus on state-machine and artifact-envelope tests first.
**Warning signs:** Regressions only surface through manual clicking; most new behavior is validated by component tests instead of service/domain tests.
**Phase to address:** Testing phase paired with every execution-model change.

### Pitfall 12: Overbuilding plugin/extensibility before real extension pressure exists
**What goes wrong:** To prepare for AI tools, teams invent plugin contracts, registries, versioning, and sandbox layers long before there are two or three real extension categories to support.
**Prevention:** Keep extension seams internal and narrow until repeated concrete needs emerge from MCP tools, importers, or execution providers.
**Warning signs:** More code exists for plugin metadata and lifecycle than for the actual built-in capabilities.
**Phase to address:** Architecture review checkpoint before any public plugin SDK work.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Request engine hardening | Runtime policy drifts into `src/features/app-shell/composables/useAppShell.ts` | Move execution decisions into service/domain/runtime layers first |
| History/model refactor | One history row tries to represent request, MCP session, and agent run equally | Define separate artifact payloads under a shared execution envelope |
| MCP hardening | Discovery cache becomes stale and replay loses session context | Persist negotiated metadata, add invalidation and rediscovery rules |
| AI prompt generation | Secrets leak from workspace/history into model context | Add AI-safe projection layer rather than reading raw persisted records |
| Agent workflow UI | Success-path demos ship before inspect/approve/intervene flows | Make observability and interruption a core requirement |
| Import/doc-to-request | External format fields pollute internal request model | Keep normalization inside adapters and preserve a stable internal model |
| Local persistence changes | Durable, cached, and ephemeral state mix together | Document state ownership across `src/lib/request-workspace.ts` and `src-tauri/src/services/` |
| Plugin or extension system | Abstract marketplace/SDK work starts before repeated internal use cases exist | Delay public extension contracts until at least 2-3 validated internal seams exist |

## Sources

- Current project direction and constraints: `.planning/PROJECT.md`
- Existing architectural concerns: `.planning/codebase/CONCERNS.md`
- Existing testing patterns and gaps: `.planning/codebase/TESTING.md`
- Frontend orchestration boundary: `src/features/app-shell/composables/useAppShell.ts`
- Runtime bridge boundary: `src/lib/tauri-client.ts`
- Workspace snapshot boundary: `src/lib/request-workspace.ts`
- MCP runtime boundary: `src-tauri/src/core/mcp_runtime.rs`
- Request runtime and environment resolution: `src-tauri/src/core/request_runtime.rs`
- History persistence service: `src-tauri/src/services/history_service.rs`
- Import boundary: `src-tauri/src/services/import_service.rs`
