## 1. Request And History Data Model

- [x] 1.1 Extend frontend request, response, and history types in `src/types/request.ts` plus normalization helpers in `src/lib/request-workspace.ts` to carry request-local mock templates and explicit execution-source state
- [x] 1.2 Extend Tauri request/history DTOs in `src-tauri/src/models/request.rs` and `src-tauri/src/models/app.rs` so saved requests, open tabs, send payloads, and history items can serialize mock-template state and execution provenance
- [x] 1.3 Add additive persistence support in `src-tauri/src/storage/migrations.rs` and `src-tauri/src/storage/db.rs` for request `mock_json` storage and history `execution_source`, with safe defaults for existing rows
- [x] 1.4 Thread the new mock-template and execution-source fields through workspace bootstrap, request save/load, session save/load, and history replay paths on both the frontend and backend

## 2. Shared Code Editor And Request-Side Authoring

- [x] 2.1 Refactor the current response CodeMirror viewer into a reusable code-editor surface that supports both read-only inspection and editable authoring without regressing theme or language handling
- [x] 2.2 Replace the request `json` and `raw` textarea path in `RequestParams.vue` with the shared code-editor surface and add request-side JSON formatting and validation affordances
- [x] 2.3 Add request-side `Mock` configuration UI in `RequestParams.vue` and `RequestPanel.vue` for template enabled state, status, status text, headers, content type, and body editing
- [x] 2.4 Extend i18n copy and any supporting helper logic so the new request editor and mock controls use localized labels, helper text, and confirmation copy

## 3. Response-Driven Template Creation And Mock Execution

- [x] 3.1 Add a response-pane affordance in `ResponsePanel.vue` that creates or refreshes the active request-local mock template from the latest completed response while preserving the response pane’s read-only inspection role
- [x] 3.2 Update `App.vue` orchestration so response-derived templates can be written back into the active request tab, including overwrite confirmation when refreshing an existing template
- [x] 3.3 Extend the send pipeline in `src/lib/tauri-client.ts`, `src-tauri/src/commands/request.rs`, and related helpers so mock-enabled sends short-circuit to template-backed results while preserving the existing `Send` entrypoint
- [x] 3.4 Surface explicit mock-vs-live execution provenance in the response pane, request state, and history presentation so mock results cannot be mistaken for live-network responses

## 4. Verification And Regression Coverage

- [x] 4.1 Add or update component tests for shared code-editor usage, request JSON/raw editing, JSON formatting, mock configuration editing, and response create-template affordances
- [x] 4.2 Add or update app-level and backend tests for mock execution routing, saved-request/session persistence of mock templates, history execution provenance, and replay restoration of mock-capable request snapshots
- [ ] 4.3 Run `pnpm test`, targeted Rust tests covering `send_request` and persistence changes, and manual workbench verification for live vs mock sends, template refresh, save/load, and history labeling
