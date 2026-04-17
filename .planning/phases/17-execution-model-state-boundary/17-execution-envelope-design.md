# Phase 17 — Execution Envelope Design

**Phase:** 17  
**Status:** Drafted for execution  
**Date:** 2026-04-15

## Purpose

Define `execution` as the shared top-level model above the current request-centric structures so ZenRequest can support HTTP, MCP, and future agent-oriented execution without continuing to overload `request`, `history`, and `workspace` shapes.

## Observed Current Model

### Current responsibility spread

The current codebase already distributes execution semantics across multiple structures instead of one clear execution entity:

- `src/types/request.ts` mixes authored request state, execution options, response lifecycle state, history-facing artifacts, MCP operation input, MCP execution artifacts, workspace session snapshots, and bootstrap payloads.
- `src/lib/request-workspace.ts` owns clone/default/sanitize helpers for request authoring state, workspace/session snapshots, browser snapshot persistence helpers, and MCP request/artifact shaping.
- `src/lib/tauri-client.ts` defines frontend-facing transport DTOs for both authoring payloads and executed result shapes, including `SendRequestResult`, `SendMcpRequestResult`, `ExecutionArtifact`, `McpExecutionArtifact`, and bootstrap payloads.
- `src-tauri/src/core/request_runtime.rs` resolves variables, auth, request bodies, and MCP protocol requests into execution-ready data.
- `src-tauri/src/core/request_executor.rs` and `src-tauri/src/core/mcp_runtime.rs` produce execution-time responses, protocol payloads, and diagnostics.
- `src-tauri/src/storage/repositories/request_repo.rs`, `src-tauri/src/storage/repositories/history_repo.rs`, and `src-tauri/src/storage/repositories/workspace_repo.rs` persist authored assets, execution-adjacent JSON blobs, and session/workspace state through loosely typed JSON columns.

### Mapping current code to execution layers

#### Authored input
User-authored intent is primarily represented today in:
- `src/types/request.ts` via `RequestPreset`, `RequestBodySnapshot`, `AuthConfig`, `McpRequestDefinition`, and protocol-specific input snapshots
- `src/lib/request-workspace.ts` via clone/default helpers for request drafts and MCP request definitions
- `src-tauri/src/storage/repositories/request_repo.rs` via persisted request preset rows and JSON columns for params, headers, auth, tests, mock, and execution options

#### Resolved execution snapshot
Execution-ready context is assembled today in:
- `src-tauri/src/core/request_runtime.rs` via variable resolution, auth resolution, body resolution, and compiled request shaping
- `src-tauri/src/core/mcp_runtime.rs` via JSON-RPC request construction, selected MCP operation shaping, resolved headers, and session-aware runtime request assembly
- `src/lib/tauri-client.ts` via runtime DTOs that transport execution-ready payloads across the frontend/backend seam

#### Result artifact
Executed outputs are represented today in:
- `src/types/request.ts` via `ExecutionArtifact`, `McpExecutionArtifact`, normalized response types, assertion results, protocol request/response snapshots, selected/cached MCP entities, and history items
- `src/lib/tauri-client.ts` via `SendRequestResult`, `SendMcpRequestResult`, and returned history items
- `src-tauri/src/storage/repositories/history_repo.rs` via persisted history rows that retain response and execution information for replay and diagnostics

#### UI-only and transient state
UI-only or transient state currently lives in:
- `src/features/app-shell/composables/useAppShell.ts` via panel collapse state, compact layout state, toast state, mobile explorer open state, and startup snapshot handling
- `src/types/request.ts` via workbench activity projections, response lifecycle states, tab execution state, and request tab view-centric flags
- runtime/session handles and short-lived MCP connection context that are used during execution but should not automatically become durable truth

### Concrete request-centric overload examples

1. `src/types/request.ts` holds both authored request definitions and executed artifacts in the same domain surface, so request authoring and execution history semantics are not clearly separated.
2. `src/lib/request-workspace.ts` handles both request cloning/defaults and browser snapshot persistence shaping, which mixes authoring helpers with persistence policy.
3. MCP runtime details such as selected tools, selected prompts, resource contents, protocol request/response payloads, and session-aware execution artifacts are folded into request-adjacent artifact types rather than a first-class execution entity.
4. `history_repo` persists large execution-adjacent JSON snapshots, but the codebase still conceptually treats much of this as request-derived state instead of execution-derived state.

## Execution Envelope v1

`execution` is the top-level entity for any user-triggered or system-triggered run. It is the stable lifecycle frame for authored intent, resolved runtime context, and produced artifacts.

### Design goals

- Make `execution` the primary subject for replay, diagnostics, and future extensibility
- Preserve protocol-specific flexibility for HTTP, MCP, and future agent-oriented execution
- Keep the top-level shared structure small and stable
- Stop adding new semantics by expanding request-centric shapes

## Top-Level Shared Fields

The top-level execution envelope should stay minimal and contain only shared semantics required by every execution:

- `execution_id` — stable identity for one execution record
- `execution_type` — `http`, `mcp`, or `agent` (future-facing first-class type)
- `origin` — where the execution came from, such as authored draft, replay, or system-triggered flow
- `workspace_id` — durable linkage to owning workspace scope
- `request_ref` / `source_ref` — optional compatibility reference to authored asset(s) that originated the run
- `status` — idle/pending/success/failure/cancelled style lifecycle outcome
- `started_at` / `finished_at` — execution timing fields
- `authored_input` — user-authored intent container
- `resolved_snapshot` — execution-ready resolved context container
- `result_artifact` — produced result and diagnostics container
- `diagnostic_refs` — lightweight linkage to structured diagnostics when stored separately or summarized elsewhere

Top-level fields should **not** absorb protocol-specific request options, MCP session internals, or future agent control metadata unless those concepts become truly shared across all execution types.

## Three-Layer Boundary

### Authored input

`authored_input` stores what the user explicitly expressed or configured.

Examples:
- HTTP request draft fields: method, URL template, params, headers, auth references, tests, body draft
- MCP operation intent: selected operation, prompt/tool/resource intent, transport configuration, authored arguments
- Future agent-oriented execution: user instruction, selected tools/policies, authored constraints

This layer answers: **What did the user intend to run?**

### Resolved execution snapshot

`resolved_snapshot` stores the execution-ready context actually used at runtime.

Examples:
- resolved variables and environment values
- resolved auth values and execution options
- compiled request payload and normalized transport-ready request
- resolved MCP session context, selected capability context, actual JSON-RPC payloads
- future agent-oriented resolved tool graph, policy set, or intervention-ready context

This layer answers: **What did the system actually execute with?**

### Result artifact

`result_artifact` stores the outputs and explainability surfaces produced by the run.

Examples:
- normalized HTTP response
- MCP protocol response, resource contents, selected tool outputs, prompt outputs
- assertion results and diagnostics
- replay metadata and summarized explainability details
- future agent-oriented output trace summaries, intervention events, or approval metadata

This layer answers: **What happened when the execution ran?**

## Protocol-Specific Sections

Shared lifecycle does not mean forced flattening. Each layer may contain protocol-specific sections.

### HTTP

- `authored_input.http` — user-authored method, URL template, headers, body draft, auth references, tests
- `resolved_snapshot.http` — compiled request, resolved headers/auth/body, execution options, final URL
- `result_artifact.http` — normalized response, assertion results, transport diagnostics

### MCP

- `authored_input.mcp` — transport choice, selected operation, authored args, authored prompt/tool/resource intent
- `resolved_snapshot.mcp` — resolved session ID, actual JSON-RPC request, resolved headers/auth, selected schema/resource/prompt snapshots used at execution time
- `result_artifact.mcp` — protocol response, cached or selected MCP entities captured as execution output, diagnostics, explainability hints

### Future agent-oriented execution

- `authored_input.agent` — user instruction, constraints, authored policy/tool preferences
- `resolved_snapshot.agent` — resolved tool set, resolved policy context, resolved plan/run context
- `result_artifact.agent` — result summary, tool outcomes, intervention/approval trace metadata, diagnostics

Agent-oriented execution is first-class in the model, but this phase only reserves its structural position. It does **not** require shipping a user-facing agent workflow.

## Replay Model

Replay uses dual-track retention.

- `authored_input` remains the human-readable editing and intent source
- `resolved execution snapshot` is the trusted replay anchor

This means replay should not depend solely on the original authored request-like draft. Instead, replay semantics should preserve both:
- the user’s original intent
- the resolved execution-ready context that explains why the prior run behaved as it did

## Relationship to Current Structures

The execution envelope does **not** immediately replace all current DTOs and repository rows. In Phase 17, it serves as the architecture contract above current request/history/workspace shapes.

Immediate implications:
- `request` remains an authored asset surface, not the default host for all future execution semantics
- history/replay should be reinterpreted as execution-derived records
- workspace/session persistence should be evaluated against execution/state ownership boundaries rather than treated as one undifferentiated snapshot

## Guardrails

- Do not expand top-level execution fields just to avoid protocol-specific sections
- Do not treat browser snapshot state as execution truth
- Do not continue storing new execution semantics by extending request-centric authored types alone
- Do not collapse result artifact and resolved snapshot into one blob; they serve different explainability purposes

## Outputs This Design Enables

This document provides the contract basis for:
- `17-state-ownership-map.md`
- `17-compatibility-constraints.md`
- `17-summary.md`
- Phase 18 persistence/recovery planning
- Phase 19 secret-safe projection planning
- Phase 20 explainable replay and diagnostics planning
