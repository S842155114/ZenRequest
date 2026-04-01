## 1. Runtime Analyze Contract

- [x] 1.1 Select and integrate Rust-native OpenAPI/YAML parsing dependencies for the runtime import path, keeping Node-based CLI tooling out of the desktop runtime critical path
- [x] 1.2 Add OpenAPI analyze/apply payload and result DTOs with explicit `workspaceId`, a versioned analysis snapshot contract, stable `OPENAPI_*` diagnostic codes, and deterministic apply summary counters
- [x] 1.3 Extend `src-tauri/src/core/import_runtime.rs` with JSON/YAML OpenAPI 3.0 parsing, in-document `#/...` reference handling only, and deterministic mapping rules for server selection, placeholders, naming, auth, and request-body precedence
- [x] 1.4 Add Rust unit coverage for valid OpenAPI analysis, fatal parse failures, snapshot/workspace mismatch rejection, supported field mapping, reference handling boundaries, and deterministic warning/skipped/count classification

## 2. Workspace Apply And Capability Exposure

- [x] 2.1 Implement append-only OpenAPI apply materialization that creates or reuses derived collections while never merging into or overwriting existing saved requests
- [x] 2.2 Add Tauri command handlers and frontend runtime bindings for the explicit analyze -> summary -> confirm/cancel -> apply flow using versioned analysis snapshots
- [x] 2.3 Register `import.openapi` in runtime capability descriptors and bootstrap payloads, then update runtime capability tests for the new active adapter

## 3. Frontend Import Entry And Result Handling

- [x] 3.1 Add an `Import OpenAPI` entry, file-input flow, and localized copy alongside the existing import actions in the request workbench
- [x] 3.2 Wire the app-shell import flow to submit OpenAPI analyze requests, render the returned summary/diagnostics, allow cancel, and apply the versioned snapshot to the current workspace only after explicit confirmation
- [x] 3.3 Add frontend tests for capability-aware OpenAPI entry visibility, fatal-analysis blocking, warning-tolerant confirmation flow, cancel behavior, and imported/skipped/warning summary handling

## 4. Stage Gate And Verification

- [x] 4.1 Update stage-gate coverage so unimplemented future capabilities remain non-active while implemented OpenAPI import is permitted as active
- [x] 4.2 Build a corpus-first fixture matrix covering invalid input, JSON/YAML parity, in-document refs, external/unresolved refs, partial imports, grouping fallbacks, append-only reapply behavior, naming/media-type/auth determinism, analyze/apply snapshot consistency, and backup-boundary separation
- [x] 4.3 Run targeted Rust and Vitest suites covering OpenAPI import, capability exposure, explicit confirmation flow, canonical request materialization, import/export boundary regressions, and fixture-corpus snapshots
- [x] 4.4 Run the full frontend build/test verification and manually validate representative JSON and YAML OpenAPI imports, cancel-before-apply behavior, and repeated append-only imports into the active workspace
