# External Integrations

**Analysis Date:** 2026-04-06

## APIs & External Services

**User-targeted HTTP APIs:**
- Arbitrary HTTP and HTTPS endpoints - Main request execution target for the API workbench
  - SDK/Client: `reqwest` in `src-tauri/src/core/request_executor.rs`
  - Auth: User-supplied request auth fields serialized from `src/lib/tauri-client.ts` and applied in `src-tauri/src/core/request_executor.rs`
- Arbitrary MCP over HTTP servers - MCP debugging target for `initialize`, `tools.list`, and `tools.call`
  - SDK/Client: `reqwest` in `src-tauri/src/core/mcp_runtime.rs`
  - Auth: User-supplied MCP connection auth fields from `src/features/mcp-workbench/components/McpRequestPanel.vue` and `src-tauri/src/core/mcp_runtime.rs`

**Import/Interchange:**
- cURL command strings - Imported into editable request drafts through Tauri commands exposed in `src/lib/tauri-client.ts` and implemented via `src-tauri/src/core/import_runtime.rs`
  - SDK/Client: Internal parser in `src-tauri/src/core/import_runtime.rs`
  - Auth: Not applicable
- OpenAPI 3.0 documents - Parsed and converted into import candidates through `src-tauri/src/core/import_runtime.rs`
  - SDK/Client: `openapiv3`, `serde_json`, and `serde_yaml` in `src-tauri/Cargo.toml` and `src-tauri/src/core/import_runtime.rs`
  - Auth: Not applicable

## Data Storage

**Databases:**
- SQLite (embedded, local only)
  - Connection: No env var; path is resolved from Tauri app data dir in `src-tauri/src/core/app_state.rs`
  - Client: `rusqlite` in `src-tauri/src/storage/connection.rs` and `src-tauri/src/storage/db.rs`
  - Schema management: In-process migrations in `src-tauri/src/storage/migrations.rs`

**File Storage:**
- Local filesystem only
  - Workspace export/import and text-file save use native filesystem dialogs and file writes through `src/lib/tauri-client.ts` and Tauri commands in `src-tauri/src/lib.rs`
  - App database lives under the Tauri app data directory as `zenrequest.sqlite3` in `src-tauri/src/core/app_state.rs`

**Caching:**
- None as an external service
  - App settings are cached in memory with `RwLock` in `src-tauri/src/core/app_state.rs`
  - MCP tool schemas are cached within execution artifacts in frontend/runtime data models referenced by `src/features/mcp-workbench/components/McpRequestPanel.vue`

## Authentication & Identity

**Auth Provider:**
- Custom per-request authentication only
  - Implementation: Request-level auth supports `none`, bearer token, basic auth, and API key placement in header or query via `src-tauri/src/core/request_executor.rs`
- Custom MCP connection authentication only
  - Implementation: MCP connection auth supports bearer token and API key header auth in `src-tauri/src/core/mcp_runtime.rs`
- Application login/session provider: Not detected

## Monitoring & Observability

**Error Tracking:**
- None detected as an external service

**Logs:**
- No hosted logging integration detected
- Errors are returned as structured application errors across Tauri commands from `src-tauri/src/errors/mod.rs` and consumed by `src/lib/tauri-client.ts`
- Request/history persistence provides local execution traceability in `src-tauri/src/storage/repositories/history_repo.rs`

## CI/CD & Deployment

**Hosting:**
- Desktop distribution via Tauri bundle output configured in `src-tauri/tauri.conf.json`
- Release link points to GitHub Releases in `README.md`

**CI Pipeline:**
- Not detected in the scanned files

## Environment Configuration

**Required env vars:**
- None required for core runtime detected in the scanned repository files
- Optional `TAURI_DEV_HOST` is consumed by `vite.config.ts` to configure dev host/HMR

**Secrets location:**
- No repository-managed secret store detected
- Request credentials and API keys are user-entered at runtime and persisted in local application data through SQLite-backed request/workspace records in `src-tauri/src/storage/repositories/`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- User-triggered outbound HTTP requests to arbitrary API endpoints via `src-tauri/src/core/request_executor.rs`
- User-triggered outbound MCP JSON-RPC over HTTP requests via `src-tauri/src/core/mcp_runtime.rs`

---

*Integration audit: 2026-04-06*
