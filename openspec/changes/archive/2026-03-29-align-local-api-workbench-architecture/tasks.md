## 1. Runtime Authority Foundation

- [x] 1.1 Introduce runtime execution pipeline types for `CompiledRequest`, `NormalizedResponse`, `AssertionResultSet`, and `ExecutionArtifact`
- [x] 1.2 Add runtime modules for request compilation, response normalization, and assertion evaluation behind the existing request command path
- [x] 1.3 Expand `AppState` to host runtime infrastructure placeholders for capability, protocol, import, and hook registries without enabling future-stage dynamic behavior

## 2. Canonical Contract Alignment

- [x] 2.1 Align TypeScript request and tab domain types with the target canonical request-definition and session-draft contracts
- [x] 2.2 Extend Rust DTOs so request definitions and session drafts preserve structured body metadata, draft origin, and other canonical fields now missing from the backend contract
- [x] 2.3 Update SQLite persistence and migrations so saved requests and workspace sessions round-trip the same canonical semantics carried by the frontend and Rust DTOs
- [x] 2.4 Keep history as a replay-safe projection of execution artifacts while preserving live/mock provenance and structured request snapshots

## 3. Runtime-owned Execution Flow

- [x] 3.1 Move template and environment resolution from `App.vue` into the runtime request compilation path
- [x] 3.2 Move authoritative response assertion evaluation from frontend helpers into the runtime execution path
- [x] 3.3 Update `send_request` contracts so the frontend consumes runtime-owned compiled execution results and assertion outcomes instead of recomputing them locally

## 4. Import Adapter Architecture

- [x] 4.1 Separate backup restore import/export responsibilities from feature-grade import adapter responsibilities in runtime contracts and command flow
- [x] 4.2 Implement the MVP `curl` import adapter so curl text maps into canonical request drafts instead of a UI-only import helper
- [x] 4.3 Ensure imported curl requests can be reviewed in-session and then saved into canonical workspace collection resources without contract drift
- [x] 4.4 Prepare the canonical mapper and intermediate import model shapes needed for later OpenAPI import without implementing OpenAPI behavior yet

## 5. Capability Seam Scaffolding

- [x] 5.1 Define capability taxonomy and descriptor types for protocol, import adapter, execution hook, tool packaging, and plugin manifest seams
- [x] 5.2 Add runtime-owned protocol, import, and hook registry scaffolds and register the current built-in HTTP and backup import/export capabilities
- [x] 5.3 Keep bootstrap and frontend state compatible with future capability awareness without surfacing v0.3 or v0.4+ features as implemented

## 6. Verification, Gates, and Messaging

- [x] 6.1 Add Rust tests that cover runtime compilation, runtime assertion evaluation, canonical request/session round-trips, and curl import mapping
- [x] 6.2 Add frontend and cross-layer tests for the mainline loop: bootstrap -> edit -> send -> history -> restore
- [x] 6.3 Add regression checks that enforce MVP-before-v0.2 stage discipline for runtime authority, canonical contract freeze, and curl import readiness
- [x] 6.4 Update project-facing messaging and internal docs so the product is described as a local-first API workbench rather than only a fast local API client
