## Context

The current workbench already separates request authoring from response inspection, but the implementation is uneven across those two surfaces. Request `json` and `raw` bodies still use a plain textarea in `RequestParams`, while the response pane already uses a read-only CodeMirror viewer with payload-aware formatting.

The same workbench also has no request-local mock workflow today. `App.vue` routes every send through `runtimeClient.sendRequest`, and the Rust `send_request` command both performs the network call and records history. Request presets, open tabs, workspace sessions, and history snapshots persist request body/auth/tests data, but they do not persist request-scoped mock templates or execution provenance beyond HTTP status.

This change therefore crosses multiple layers:

- request-side authoring UI
- response-side inspection UI
- frontend request/history state
- Rust transport DTOs and persistence
- history recording and replay semantics

The main implementation constraints are:

- preserve the current request-authoring vs response-inspection boundary
- keep one send entrypoint instead of inventing a separate mock-only execution button
- keep history persistence and replay semantics coherent for both live and mock executions
- preserve the current i18n and component-test patterns already used by the workbench

## Goals / Non-Goals

**Goals:**

- Replace request `json` and `raw` textareas with a code-editor surface.
- Reuse one code-editor foundation across editable request/mock bodies and the read-only response viewer.
- Add one optional request-local mock template per request and persist it with saved requests, open tabs, and request snapshots.
- Let the response pane create or refresh that template from the latest completed response without becoming an editing surface itself.
- Keep the existing `Send` action as the single execution entrypoint for both live and mock runs.
- Persist execution provenance so response surfaces and history can distinguish live-network results from mock results.

**Non-Goals:**

- Supporting multiple templates, template matching rules, or environment-wide interception.
- Turning the response pane into a general-purpose editor.
- Introducing a new top-level resource type or resource browser for mock templates.
- Building browser-grade response replay tooling, binary-response authoring, or advanced mock routing in this change.

## Decisions

### 1. Introduce one reusable CodeMirror surface with explicit read-only and editable modes

The current `ResponseCodeViewer` already encapsulates the language-aware CodeMirror setup needed for JSON, HTML, XML, and plain text. This change should extract or evolve that implementation into a reusable editor surface that can run in two modes:

- read-only inspection for the response pane
- editable authoring for request `json` / `raw` bodies and mock-template bodies

Request-side JSON editing will add format and validation affordances on top of that shared surface, while raw/mock text editing can stay simpler in v1.

Why:

- Keeps syntax highlighting, language resolution, and theme handling in one place.
- Improves request authoring without compromising the response pane’s read-only contract.
- Avoids maintaining two unrelated text-editing implementations for nearly identical content classes.

Alternatives considered:

- Leave request text modes on textarea and only improve validation. Rejected because it does not close the authoring gap materially.
- Duplicate a second CodeMirror wrapper for request editing. Rejected because it creates avoidable drift with the response viewer.

The request body model should also preserve isolated per-mode drafts. Editing `json`, `formdata`, `raw`, or `binary` must not auto-convert content into another body mode when the user switches tabs. Validation and send blocking should apply only to the currently active body mode, with body-specific validation rendered inside the payload surface itself.

### 2. Model the mock template as optional request-owned state, not as a separate resource

The new request-local mock template will be represented as one optional nested object attached to request drafts, saved requests, workspace session tabs, and history request snapshots.

The model should capture:

- manual enabled state
- HTTP status
- status text
- content type
- body
- editable response headers with enabled-state support

Using request-owned state keeps the feature aligned with the approved scope: one template per request, edited from the request workbench, with no separate browser or sharing model.

Why:

- Matches the user goal directly.
- Keeps save/load semantics compatible with the current request-centric workbench.
- Avoids inventing a new resource lifecycle before the single-template flow is proven.

Alternatives considered:

- Create a separate mock-template resource tree. Rejected because it adds unnecessary information architecture and cross-resource linking for v1.
- Keep the template only in transient tab state. Rejected because the feature is explicitly meant to survive request save/load and replay workflows.

### 3. Keep one `send_request` backend command and let it short-circuit to mock execution when mock is enabled

The existing Rust `send_request` command already owns two critical responsibilities:

- execute the transport request
- insert the resulting history item

Instead of duplicating history insertion logic in the frontend, the send payload should gain an optional mock execution block. When present and enabled, the Rust command will bypass the network executor, materialize a `SendRequestResultDto` from the stored template, and persist a history item using the same preview-truncation and storage pipeline as live responses.

Why:

- Preserves one send entrypoint from the UI through to persistence.
- Keeps history insertion, preview truncation, and response DTO shaping in one backend path.
- Avoids divergence between live and mock history semantics.

Alternatives considered:

- Materialize mock responses entirely in the frontend and add a separate history-recording command. Rejected because it duplicates result-shaping and persistence responsibilities across layers.
- Add a second UI command dedicated to mock execution. Rejected because the approved UX keeps `Send` as the only primary execution action.

### 4. Add explicit execution-source state to responses and history

The workbench currently infers response meaning mostly from lifecycle state and status code. That is insufficient once a request can succeed locally without touching the network.

This change should add an explicit execution-source enum across the relevant frontend and backend models:

- `live`
- `mock`

That source should be persisted in history records, carried through response state, and surfaced in the response pane and history UI through clear badges or labels.

Why:

- Prevents mock results from being mistaken for live-network results.
- Keeps replay and provenance understandable after mixed live/mock runs.
- Avoids brittle heuristics such as inferring mock source from zero latency or synthetic headers.

Alternatives considered:

- Infer mock source from response shape or timing. Rejected because it is ambiguous and fragile.
- Only mark source in the request pane. Rejected because users inspect completed outcomes primarily in the response pane and history.

### 5. Use additive persistence changes with safe defaults

The persistence model should evolve additively:

- requests table gains a `mock_json` payload column
- history_items table gains an `execution_source` column
- request DTOs and workspace-session tab JSON gain optional mock fields with defaults

Existing requests, sessions, and history rows should default to:

- no mock template
- `live` execution source

Why:

- Keeps migration risk low for existing user data.
- Aligns with the current JSON-heavy storage style already used for request/session state.
- Lets archived or older snapshots load without breaking normalize/sanitize logic.

Alternatives considered:

- Encode mock templates inside existing body/auth fields. Rejected because it obscures intent and makes future evolution harder.
- Store execution provenance only in memory. Rejected because history and replay must remain stable across restarts.

## Risks / Trade-offs

- [Shared editor extraction could destabilize the current response viewer] -> Keep the response-pane contract unchanged at the component boundary and add regression tests before switching request editors to the shared surface.
- [Request-local mock state increases model width across TypeScript, Rust DTOs, and SQLite] -> Keep the v1 schema narrow and optional, with additive defaults and explicit normalization helpers.
- [Mock execution may be confused with live execution] -> Surface execution source in both the response pane and history rows instead of relying on lifecycle state alone.
- [Refreshing a stored template can overwrite user edits unexpectedly] -> Require explicit confirmation whenever an existing template is being regenerated from the latest response.
- [History replay semantics can drift if mock configuration is not included in request snapshots] -> Carry the mock configuration through the send payload snapshot so replay drafts reconstruct the original mock-capable request state.

## Migration Plan

1. Add additive DTO and storage fields for request-local mock templates and history execution source, with defaults for pre-existing rows and snapshots.
2. Introduce the shared code-editor surface and switch the response pane to the reusable read-only path before moving request `json` and `raw` authoring onto it.
3. Add request-side mock-template editing and response-side template-creation entrypoints in the workbench.
4. Extend `send_request` to short-circuit live transport when mock execution is enabled while preserving history insertion and preview truncation.
5. Add or update frontend and backend tests covering migration defaults, request editing, mock execution, response-source cues, and history provenance.

Rollback strategy:

- Revert the mock fields and UI affordances together.
- If needed, keep additive DB columns unused rather than attempting destructive schema rollback.

## Open Questions

- None for the approved v1 scope.
