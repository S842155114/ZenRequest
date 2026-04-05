# Feature Landscape

**Domain:** local-first desktop API workbench with MCP/Agent direction
**Researched:** 2026-04-06

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fast HTTP request composer | Core expectation for any API client; users must be able to build and resend requests quickly | Low | Must keep first-run and repeat-run experience fast to match the product goal in `.planning/PROJECT.md`. Existing foundation already exists in `src/features/request-compose/` and `src-tauri/src/core/request_executor.rs`. |
| Collections, tabs, history, and workspace restore | Modern API tools are judged on whether they preserve flow state and let users jump between requests without losing context | Medium | Already aligned with the current app-shell/workspace model in `src/features/app-shell/composables/useAppShell.ts` and `src/lib/request-workspace.ts`. This remains table stakes, not differentiation. |
| Environment variables and templating | Users expect base URLs, tokens, and reusable variables without manual copy/paste | Medium | Must support layered environments and predictable resolution. Existing environment persistence is part of the validated scope in `.planning/PROJECT.md`; reliability matters because persistence recovery is called out as fragile in `.planning/codebase/ARCHITECTURE.md`. |
| Auth helpers | Bearer, Basic, API key, and common header/query auth are expected for daily work | Low | Useful only if paired with safer secret handling. Current architecture notes a missing secure secret storage path, so this table-stakes feature depends on fixing that gap rather than adding more auth modes blindly. |
| Structured response viewer | JSON prettify, headers, cookies, timing, raw body, and lightweight HTML/text preview are baseline expectations | Low | Existing structured response and HTML preview are already validated in `.planning/PROJECT.md`; the work here is refinement, performance, and large-payload behavior. |
| Import and migration on-ramp | cURL import is mandatory; OpenAPI/Postman/Insomnia import strongly affects adoption because switching cost is high | Medium | cURL import exists, but import breadth is already marked fragile in `.planning/codebase/ARCHITECTURE.md`; avoid expanding formats before tightening fixture coverage in `src-tauri/src/core/import_runtime.rs`. |
| Basic test/assertion flow | Users increasingly expect smoke assertions on status, headers, and JSON fields without leaving the request tool | Medium | In 2025 this is no longer “advanced”; it is the minimum path from manual debugging to repeatable verification. Keep it local, deterministic, and request-centric. |
| Export/shareable artifacts | Export as cURL and a portable local workspace format is expected for handoff and backup | Medium | Prefer file-based portability over cloud sync to stay aligned with the local-first positioning in `.planning/PROJECT.md`. |
| Reliable offline persistence and recovery | A desktop local-first tool must not lose state or silently corrupt user data | High | This is a product promise, not an infra detail. Current codebase explicitly flags startup hydration and JSON-column recovery risks in `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/CONCERNS.md`. |
| Safe handling of large payloads | Large JSON, file uploads, streaming-ish responses, and repeated history entries are common real-world workflows | Medium | Not glamorous, but critical. The architecture audit already flags memory pressure and payload-heavy history persistence around `src-tauri/src/core/request_executor.rs`, `src-tauri/src/core/mcp_runtime.rs`, and `src-tauri/src/storage/repositories/history_repo.rs`. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| First-class MCP server workbench | Moves ZenRequest from “API client with MCP checkbox” to a true debugging tool for agent-era backends | High | Recommendation: treat MCP as a first-class product surface, not a side panel. Beyond current `initialize`, `tools.list`, and `tools.call` support in `.planning/PROJECT.md`, a 2025-grade workbench should cover resources, prompts, transport/session visibility, capability negotiation, and error inspection. MCP spec direction also now emphasizes tools, resources, prompts, roots, sampling, and elicitation. |
| Agent-safe tool-call replay and inspection | Lets developers inspect exactly what an agent would send, what tool schema it saw, and why a call failed | High | This is stronger than generic request history. Store schema snapshots, arguments, normalized outputs, and failure metadata as replayable local artifacts. Best built on the existing local history/workspace model in `src/lib/request-workspace.ts`, but separated from generic HTTP history to avoid model sprawl. |
| Prompt/docs/spec → request/test generation with human review | Speeds up repetitive setup while keeping privacy and control local | High | Valuable only if generated output lands in normal collections/tests that users can inspect and edit. Do not make it a black-box chat surface. Works well with existing import/runtime boundaries if generation outputs domain models instead of bypassing them. |
| Local-first secret hygiene | A strong privacy story becomes a real differentiator if secrets are stored in OS keychain/credential APIs while collections remain portable | Medium | This directly addresses the missing secure secret storage path in `.planning/codebase/ARCHITECTURE.md`. For this product category, secure local secret handling is more differentiating than adding another collaboration feature. |
| Workspace-level execution traces | Show a compact timeline across HTTP request, environment resolution, pre/post processing, MCP handshake, and persistence events | High | Particularly useful for debugging agent/tool workflows. The current architecture already has layered boundaries; exposing a user-facing trace view would leverage that structure rather than fight it. |
| File-backed, git-friendly assets around local DB state | Gives power users a way to version important requests, tests, and MCP tool fixtures while keeping runtime caches/history local | Medium | This is a strong fit for a desktop local-first tool. Prefer explicit export/import or selected “pin to file” flows instead of full live text-file mode if SQLite remains the main store in `src-tauri/src/core/app_state.rs`. |
| Scenario runner for mixed HTTP + MCP flows | Enables quick validation of agent-era integrations where one workflow spans REST endpoints and MCP tools | High | This should be lightweight: named steps, captured variables, assertions, replay. Do not jump straight to a heavyweight CI platform. |
| Corruption diagnostics and self-repair UX | Turns a fragile local app failure mode into a trust-building feature | Medium | Current audits explicitly call out missing repair/diagnostic UX and permissive fallback behavior. For a local desktop product, graceful repair is a meaningful differentiator because data trust is central. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Team-centric cloud workspace and mandatory accounts | Conflicts with the product’s local-first, offline-first, privacy-first positioning in `.planning/PROJECT.md` | Keep collaboration as explicit export/import or optional future sync, not a required control plane |
| “Match Postman feature-for-feature” roadmap | Creates endless scope drag and dilutes the product thesis | Focus on daily local debugging excellence plus MCP/Agent workflows where incumbents are less opinionated |
| General-purpose AI chat pane as the main UX | Easy to build, hard to trust, and usually bypasses structured domain models | Use AI to generate or explain concrete assets: requests, tests, MCP calls, fixtures, and diagnostics |
| Full protocol buffet too early | SOAP, GraphQL, gRPC, WebSocket, SSE, MQTT, and every niche protocol would explode scope and complexity | Deepen HTTP + MCP first; add new protocols only when they unlock clear recurring workflows |
| Heavy plugin ecosystem before stable core boundaries | The project context explicitly warns against speculative plugin ecosystems | First stabilize execution engine, collection model, environment model, and MCP boundaries; expose extension points later |
| Auto-executing agent actions without strong review boundaries | Dangerous for privacy, safety, and debugging reproducibility | Keep explicit review/approval for generated requests, tool calls, and scenario runs |
| Opaque background syncing and telemetry-heavy analytics | Violates user trust and weakens offline guarantees | Prefer local diagnostics, explicit export, and opt-in instrumentation only |
| Bloated visual dashboards over fast workflows | Adds weight to a product whose value starts with speed and focus | Invest in keyboardable flows, dense inspectors, and fast restore instead |

## Feature Dependencies

```text
Reliable offline persistence and recovery → Collections, history, workspace restore
Reliable offline persistence and recovery → Environment variables and templating
Local-first secret hygiene → Auth helpers
Fast HTTP request composer → Basic test/assertion flow
Collections and history → Export/shareable artifacts
Structured response viewer → Basic test/assertion flow
First-class MCP server workbench → Agent-safe tool-call replay and inspection
First-class MCP server workbench → Scenario runner for mixed HTTP + MCP flows
Prompt/docs/spec → request/test generation with human review → Basic test/assertion flow
Workspace-level execution traces → Corruption diagnostics and self-repair UX
```

## MVP Recommendation

Prioritize:
1. Reliable offline persistence and recovery
2. Fast HTTP request composer + collections/history/environment polish
3. First-class MCP server workbench for real debugging, not just `tools.call`

Defer: Prompt/docs/spec → request/test generation: valuable, but only after the core HTTP/MCP asset model is stable enough that generated output lands in trusted, editable flows.

## Sources

- Project positioning and validated/current scope: `./.planning/PROJECT.md` — HIGH confidence
- Current architecture boundaries, fragile areas, and missing features: `./.planning/codebase/ARCHITECTURE.md` — HIGH confidence
- Current codebase concern audit referenced by architecture work: `./.planning/codebase/CONCERNS.md` — HIGH confidence
- Model Context Protocol specification/docs for current client/server primitives and lifecycle (`initialize`, tools, resources, prompts, roots, sampling, elicitation): https://github.com/modelcontextprotocol/modelcontextprotocol and https://modelcontextprotocol.io/ — HIGH confidence
- Market/ecosystem signal from current API client product positioning (Postman, Insomnia, Bruno public product pages, checked 2026-04-06). These support the categorization of “table stakes” vs “differentiators”, but the recommendations above remain opinionated for ZenRequest’s local-first strategy — MEDIUM confidence
