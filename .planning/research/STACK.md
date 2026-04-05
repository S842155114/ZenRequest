# Technology Stack

**Project:** ZenRequest
**Research type:** Stack
**Researched:** 2026-04-06
**Confidence:** HIGH for desktop/runtime/MCP transport direction, MEDIUM for AI library layer because that space is still moving fast

## Recommended Direction

ZenRequest should stay on its current core direction: `Vue 3 + TypeScript + Vite + Tauri 2 + Rust + SQLite`. That is already aligned with the product goals in `.planning/PROJECT.md`, and the current repo structure in `package.json`, `src-tauri/Cargo.toml`, `src/lib/tauri-client.ts`, `src/features/app-shell/composables/useAppShell.ts`, and `src/lib/request-workspace.ts` is the right foundation to evolve rather than replace.

For 2025, the standard stack for a **local-first desktop API workbench** is not Electron plus a cloud backend. It is a **thin web UI + native runtime + local database + explicit permissions + protocol adapters** architecture. For ZenRequest specifically, the right move is to double down on Tauri-native boundaries, keep request execution and MCP transport in Rust, keep orchestration in Vue composables, and add AI/Agent capability as a bounded subsystem instead of letting it leak into the main request workbench.

If the milestone goal is “local-first desktop API workbench with AI/Agent and MCP ambitions,” the recommended technical direction is:
- Keep the main app **offline-capable by default**.
- Treat AI features as **optional providers** layered on top of local data, not as a required cloud dependency.
- Treat MCP support as a **first-class protocol/runtime concern**, not a one-off feature panel.
- Prefer **Rust-side transport/process/security logic** and **Vue-side interaction/workflow logic**.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `Tauri` | `2.x` | Desktop runtime, permissions, packaging, native APIs | Best fit for ZenRequest’s startup, memory, offline, and security goals; matches current repo in `src-tauri/Cargo.toml` |
| `Rust` | stable `1.8x+` | Execution engine, persistence, MCP/process/runtime boundary | Keeps HTTP, MCP, file/process access, and storage close to the trust boundary |
| `Vue` | `3.5+` | Desktop UI | Current app already uses the right Composition API structure in `src/features/app-shell/composables/useAppShell.ts` |
| `TypeScript` | `5.6+` | Frontend types and DTO safety | Necessary to keep request schema, MCP DTOs, and AI action payloads predictable |
| `Vite` | `7/8 line` | Frontend dev/build | Still the standard companion for Vue desktop frontends; current `package.json` already aligns |

### Local Data

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `SQLite` | current | Primary local persistence | Correct default for workspaces, history, environments, snapshots, agent runs, and MCP session records |
| `rusqlite` | `0.3x` line | Current embedded DB access | Good fit if ZenRequest wants full Rust-side control and minimal abstraction; current `src-tauri/Cargo.toml` already uses it |
| `SQLite WAL mode` | enabled | Concurrency and durability tuning | Important once AI jobs, indexing, history writes, and request execution overlap |

**Recommendation:** stay on `rusqlite` for now. Do **not** migrate to an ORM just to look modern. ZenRequest is a local desktop app, not a CRUD SaaS. Direct SQL plus explicit repositories is still the best fit for the architecture documented in `.planning/codebase/ARCHITECTURE.md`.

### HTTP / Protocol Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `reqwest` | `0.12.x` | HTTP execution engine | Correct default for request execution, auth handling, TLS, streaming, and MCP remote transport |
| `tokio` | current stable line | Async runtime | Required once stdio MCP, streamable HTTP MCP, background indexing, and AI tasks coexist |
| `serde` / `serde_json` | `1.x` | DTOs and persistence payloads | Keep transport contracts stable across Rust/frontend boundary |
| `url` | current | URL parsing/normalization | Worth adding if URL/auth/environment resolution grows more complex |

**Recommendation:** keep all network execution in Rust. Do not move request execution into frontend `fetch`. That would weaken security boundaries and make advanced transport support harder.

### MCP / Agent Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `MCP spec` | 2025 protocol line | Target protocol model | MCP in 2025 standardizes around **`stdio` for local** and **Streamable HTTP for remote** |
| Rust subprocess management | native | Local MCP server execution | Needed for serious MCP support; ZenRequest currently lacks `stdio`, and that should be a top protocol investment |
| Rust stream transport adapter | custom internal module | Streamable HTTP MCP client runtime | Better to own this boundary than couple the app to a rapidly changing JS MCP client layer |
| JSON Schema validation library | current | Tool argument forms and validation | Needed for `tools.call` UX, schema-backed editors, and safe argument generation |

**Recommendation:** build MCP as a dedicated Rust runtime with two official transports:
- **Local:** `stdio`
- **Remote:** **Streamable HTTP**

Keep compatibility fallback for older HTTP+SSE servers only if real users need it. Do not design around deprecated transport first.

### AI / Agent Capability Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Provider abstraction in Rust or TS boundary | internal | Model provider registry | Keeps OpenAI-compatible, Anthropic-compatible, and local model providers optional |
| OpenAI-compatible Responses-style API support | current | Hosted model integration | Most practical default for tool use, structured outputs, and agent loops |
| Local embedding runtime via sidecar/optional service | optional | Semantic search over local history/docs/collections | Useful for AI assistance without forcing cloud dependence |
| Background job queue (lightweight, internal) | internal | Non-blocking agent tasks | Needed for indexing, summarization, document parsing, test generation, and MCP inspection |

**Recommendation:** do **not** hardwire the app around one agent framework. Use a narrow internal abstraction:
- model invocation
- structured output
- tool execution
- prompt/template storage
- run history

That gives ZenRequest room to support hosted APIs and local models without rewriting the product.

## Supporting Libraries

| Library / Tool | Recommendation | Purpose | When to Use |
|----------------|----------------|---------|-------------|
| `@vueuse/core` | Keep | UI/runtime helpers | Continue for small composable helpers |
| `Pinia` | Avoid for now | Global state store | Add only if app-shell state splits into multiple independently owned domains; current composable/store pattern is sufficient |
| `Vue Router` | Avoid unless real multi-route UX appears | Routing | A workbench shell does not need route complexity unless plugin pages/settings grow substantially |
| `Vitest` | Keep | Unit/integration tests | Standard choice with Vite/Vue |
| `Playwright` | Add | Desktop/webview E2E | Use for key flows: request send, env resolution, MCP calls, AI-assisted generation |
| `reka-ui` + `shadcn-vue` style | Keep | UI primitives | Matches current component direction |
| `CodeMirror 6` | Keep | Request/response/code editing | Correct editor choice for JSON, headers, templates, tool args |
| `tauri-plugin-dialog` | Keep | Native file dialogs | Already aligned with import/export flows |
| `tauri-plugin-opener` | Keep with minimal permissions | Open links/files | Fine, but keep capability scope tight |
| `tauri-plugin-updater` | Add when release channel is stable | App updates | Worth adding once packaging and release discipline mature |
| `tauri-plugin-sql` | Do not adopt for primary DB access | Frontend SQL bridge | Wrong direction for ZenRequest because DB ownership should stay in Rust services, not frontend queries |
| `sqlx` / heavy ORM migration stack | Avoid | DB abstraction | Unnecessary complexity for an embedded local app unless async DB contention becomes a proven bottleneck |
| `Electron` / `Neutralino` / browser-only PWA fallback | Do not use | Alternate shell | Conflicts with the product’s lightweight native positioning |

## Prescriptive Architecture Choices

### 1. Keep the current frontend shape

The current repo already points in the right direction:
- `src/App.vue` stays thin.
- `src/features/app-shell/composables/useAppShell.ts` stays the orchestration hub.
- `src/lib/tauri-client.ts` stays the single frontend-native seam.
- `src/lib/request-workspace.ts` stays pure and testable.

That pattern should continue. Do not let AI features bypass it by calling providers directly from random Vue components.

### 2. Make Rust the execution boundary

Put these concerns in Rust, not in the frontend:
- HTTP execution
- auth material application
- secret redaction before persistence
- MCP stdio process management
- MCP remote transport handling
- import/export parsing for large files
- AI tool execution registry
- optional local embedding/indexing jobs

### 3. Add a dedicated Agent runtime, not scattered AI helpers

The next major subsystem should be something like:
- `src-tauri/src/core/agent_runtime.rs`
- `src-tauri/src/services/agent_service.rs`
- `src-tauri/src/commands/agent.rs`

Responsibilities:
- provider selection
- prompt/template execution
- structured output parsing
- tool call loop execution
- run persistence
- cancellation and timeout control

Do not bury agent logic inside request services or Vue composables.

### 4. Treat MCP as product infrastructure

Current repo state already has early MCP work. The next technical direction should be:
- unify MCP request model with a proper runtime contract
- add `stdio` local transport
- upgrade remote transport toward Streamable HTTP
- maintain backward compatibility shims only where needed
- persist MCP session metadata and tool schemas locally

### 5. Tighten Tauri permissions now, before plugins expand

Tauri 2’s capabilities/permissions model is one of the main reasons to stay on this stack. Use it aggressively:
- explicit plugin permissions
- no blanket shell execution
- path scopes for import/export
- URL allowlists where practical
- separate dangerous capabilities from the default app shell

This matters more once ZenRequest starts launching MCP servers or agent-related subprocesses.

## What to Add Next

### Near-term recommended additions

| Add | Why |
|-----|-----|
| `tokio`-based MCP stdio runtime | Highest-value protocol gap for local agent tooling |
| `Playwright` E2E coverage | Needed for desktop-critical flows and regression confidence |
| structured settings for AI providers | Needed before any serious AI feature ships |
| secure local secret storage strategy | API keys should not live as plain config rows forever |
| lightweight search/index subsystem | Enables AI-assisted history/doc/request retrieval |
| updater plugin later | Good operational improvement, but not before core workflows stabilize |

### Optional later additions

| Add | Use only when |
|-----|---------------|
| local embedding model or sidecar | users need semantic search without cloud APIs |
| WASM-based parsers | import or schema workloads become CPU-heavy in frontend |
| plugin/extension API | at least 2-3 real extension use cases exist |
| CRDT/sync layer | only if the product direction expands beyond single-machine local-first |

## What Not to Use

Be opinionated here:

- **Do not switch to Electron.** It directly weakens ZenRequest’s core product identity.
- **Do not move DB access into the frontend** via `tauri-plugin-sql` for core app data.
- **Do not add Pinia just because Vue apps often do.** Current app-shell orchestration is already coherent.
- **Do not adopt a heavyweight JS agent framework as the product backbone.** They change too fast and will leak abstractions into the core workbench.
- **Do not build AI features as always-online features.** Local-first must remain true.
- **Do not over-invest in deprecated MCP HTTP+SSE transport.** Support it only as fallback.
- **Do not introduce cloud sync, auth, or telemetry infrastructure** into the core architecture of this milestone.
- **Do not replace repository-style Rust storage with ORM-heavy abstraction** without a proven scaling problem.

## Recommended 2025 Baseline Stack for ZenRequest

If starting the next milestone today, the practical baseline is:

### Frontend
- `Vue 3`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `reka-ui` / `shadcn-vue` style primitives
- `CodeMirror 6`
- `Vitest`
- `Playwright`

### Native/Desktop
- `Tauri 2`
- capability-based permissions
- dialog/opener plugins with minimal scope
- updater plugin later, not immediately

### Backend / Runtime
- `Rust`
- `tokio`
- `reqwest`
- `serde` / `serde_json`
- `rusqlite`
- `uuid`
- `chrono`

### Protocol / AI
- MCP local transport: `stdio`
- MCP remote transport: `streamable-http`
- internal provider abstraction for AI
- structured output + tool-calling support
- optional local embeddings/search later

## Migration Guidance from Current Repo State

Relative to current files:
- `package.json` is directionally correct and should be extended, not replaced.
- `src-tauri/Cargo.toml` should likely add async/runtime and process support before adding more UI-layer AI code.
- `src/lib/tauri-client.ts` should remain the only invoke boundary.
- `src/features/app-shell/composables/useAppShell.ts` should continue orchestrating app state, but AI and MCP runtime details should live below it.
- `src/lib/request-workspace.ts` should stay pure and should not absorb transport or provider logic.

## Sources

### High confidence
- Tauri 2 docs: official plugin permissions, updater, SQL plugin, and security guidance
- Vue official docs: Composition API, composables, and Pinia recommendation for apps that truly need a store
- MCP specification docs: 2025 transport guidance around `stdio` and Streamable HTTP
- Vite official docs
- Vitest official docs

### Confidence notes
- **HIGH:** Tauri 2 as the desktop/runtime choice
- **HIGH:** Vue 3 Composition API + composables as frontend direction
- **HIGH:** MCP `stdio` + Streamable HTTP as the correct protocol target
- **HIGH:** SQLite as local persistence baseline
- **MEDIUM:** exact AI provider/tooling layer because vendor APIs are still evolving quickly; keep that layer internal and replaceable
