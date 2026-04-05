# Codebase Concerns

**Analysis Date:** 2026-04-06

## Tech Debt

**Oversized import pipeline:**
- Issue: The OpenAPI/cURL import runtime concentrates parsing, normalization, schema mapping, collection planning, and test fixtures in one very large module.
- Files: `src-tauri/src/core/import_runtime.rs`
- Impact: Small changes to import behavior are high-risk, review cost is high, and defects are harder to isolate because parsing and persistence concerns are tightly coupled.
- Fix approach: Split `src-tauri/src/core/import_runtime.rs` into focused modules for tokenizing/parsing, OpenAPI schema adaptation, request normalization, and persistence orchestration; keep the public entrypoints stable.

**Workspace repository carries too many responsibilities:**
- Issue: The workspace repository handles bootstrap, workspace lifecycle, snapshot hydration, import/export persistence, and a large amount of mapping logic in one file.
- Files: `src-tauri/src/storage/repositories/workspace_repo.rs`, `src-tauri/src/services/workspace_service.rs`
- Impact: Changes around startup, import/export, or workspace deletion are coupled together, increasing regression risk across unrelated flows.
- Fix approach: Extract snapshot serialization, bootstrap seed data, and workspace CRUD into separate repository/service units while preserving the current storage boundary.

**Frontend snapshot/state utility has become a mini state engine:**
- Issue: `src/lib/request-workspace.ts` mixes defaults, cloning, sanitization, ID generation, response normalization, MCP snapshot shaping, and localStorage persistence in one long file.
- Files: `src/lib/request-workspace.ts`
- Impact: Snapshot changes are easy to miss, state migration rules are buried, and future persistence changes must touch a large shared utility.
- Fix approach: Separate pure snapshot schema/defaults, clone helpers, migration/sanitization, and browser persistence adapters into smaller modules with focused tests.

**Tauri client is a broad RPC facade:**
- Issue: `src/lib/tauri-client.ts` contains a large collection of command wrappers, payload shaping, validation, and result normalization for unrelated domains.
- Files: `src/lib/tauri-client.ts`
- Impact: Frontend-to-Tauri contract changes are easy to entangle, and test maintenance grows with each added command.
- Fix approach: Group command wrappers by domain (`workspace`, `request`, `settings`, `importing`) and centralize shared invoke/result handling.

## Known Bugs

**Malformed persisted JSON silently resets local snapshot state:**
- Symptoms: If the browser-side workspace snapshot in local storage becomes invalid JSON or structurally invalid, the app falls back to `null` and loses the cached local UI state without surfacing recovery information.
- Files: `src/lib/request-workspace.ts`
- Trigger: Corrupt `zenrequest.workspace` contents in `localStorage` or partial writes during development/test scenarios.
- Workaround: Clear local storage and let the app rebuild state from persisted backend data.

**Database row JSON corruption is hidden by default fallbacks:**
- Symptoms: Saved request, environment, and history rows with malformed JSON fields load with empty/default values instead of failing loudly, which can make data loss appear as valid empty state.
- Files: `src-tauri/src/storage/repositories/request_repo.rs`, `src-tauri/src/storage/repositories/history_repo.rs`, `src-tauri/src/storage/repositories/environment_repo.rs`
- Trigger: Legacy rows, manual DB edits, interrupted migrations, or serialization bugs that write invalid JSON blobs.
- Workaround: Inspect the SQLite database directly and repair bad JSON rows; there is no in-app diagnostic path for these cases.

**Unsupported MCP transport remains user-visible:**
- Symptoms: The product exposes MCP workbench UI while `stdio` transport is still not executable in the current release.
- Files: `README.md`, `src/components/request/RequestPanel.test.ts`, `src/features/mcp-workbench/components/McpRequestPanel.vue`, `src-tauri/src/core/mcp_runtime.rs`
- Trigger: Selecting or expecting MCP `stdio` behavior from the workbench.
- Workaround: Use HTTP-only MCP targets; `stdio` remains planned rather than implemented.

## Security Considerations

**Secrets are persisted in browser local storage:**
- Risk: Workspace snapshots stored in `localStorage` can contain tokens, passwords, API keys, and request payloads, making secrets accessible to any script running in the webview context and leaving sensitive values on disk in plaintext browser storage.
- Files: `src/lib/request-workspace.ts`, `src/features/request-compose/components/RequestAuthSection.vue`
- Current mitigation: None beyond local-only execution and Tauri desktop packaging.
- Recommendations: Stop persisting secret-bearing auth fields into browser storage, or redact/encrypt sensitive fields before `localStorage` writes; prefer SQLite/Tauri-side secure persistence for durable state.

**TLS verification can be disabled per request:**
- Risk: Request execution explicitly supports `danger_accept_invalid_certs`, enabling man-in-the-middle exposure if users disable SSL verification and forget the request setting.
- Files: `src-tauri/src/core/request_executor.rs`, `src/features/request-compose/components/RequestExecutionSection.vue`, `src/types/request.ts`
- Current mitigation: The setting is explicit in the UI and defaults to verification enabled.
- Recommendations: Add stronger warning copy, per-request danger indicators in the UI, and audit logging/history markers when `verify_ssl` is false.

**Arbitrary file writes are user-path driven:**
- Risk: Export/save commands create directories and write files to caller-selected paths. This is expected desktop behavior, but it raises overwrite and unsafe-path concerns if path validation remains minimal.
- Files: `src-tauri/src/commands/workspace.rs`
- Current mitigation: Writes appear to follow explicit user-chosen paths through dialog-driven flows.
- Recommendations: Keep writes bound to explicit chooser results, reject empty/relative surprise paths, and surface overwrite confirmation consistently.

## Performance Bottlenecks

**Large response handling is memory-heavy:**
- Problem: Request execution and MCP runtime read full response bodies into memory and then derive preview/state artifacts, even though the UI only needs bounded previews in many paths.
- Files: `src-tauri/src/core/request_executor.rs`, `src-tauri/src/core/mcp_runtime.rs`, `src/components/response/ResponsePanel.vue`
- Cause: Response normalization is built around full text/body materialization before truncation and display shaping.
- Improvement path: Stream large responses to bounded buffers or temp files, keep preview extraction incremental, and only materialize full payloads on explicit user demand.

**History and request payload duplication increases storage and load cost:**
- Problem: Full request snapshots and response metadata are stored repeatedly in history rows, growing the database quickly for active workspaces.
- Files: `src-tauri/src/storage/repositories/history_repo.rs`, `src-tauri/src/storage/repositories/request_repo.rs`, `src-tauri/src/models/request.rs`
- Cause: Each execution persists a substantial JSON snapshot instead of a lean reference-plus-delta model.
- Improvement path: Introduce bounded retention, optional payload pruning, or snapshot compaction so history keeps enough replay data without duplicating all request structure forever.

**Frontend state cloning relies on repeated deep copies:**
- Problem: State and MCP artifacts are cloned via repeated object copying and JSON stringify/parse for plain data sections.
- Files: `src/lib/request-workspace.ts`
- Cause: Defensive copying is implemented with broad deep-clone helpers over large request/response objects.
- Improvement path: Narrow cloning to mutable branches, avoid repeated whole-object cloning on hot paths, and isolate immutable snapshot fragments.

## Fragile Areas

**Startup state spans two persistence systems:**
- Files: `src/features/app-shell/composables/useAppShell.ts`, `src/lib/request-workspace.ts`, `src-tauri/src/services/bootstrap_service.rs`, `src-tauri/src/storage/repositories/workspace_repo.rs`
- Why fragile: App startup merges browser `localStorage` state with SQLite-backed bootstrap data, so mismatch or corruption in either layer can produce subtle restore behavior and hard-to-reason precedence rules.
- Safe modification: Change startup hydration through integration tests that cover clean boot, corrupted local snapshot, backend-only restore, and mixed-version state.
- Test coverage: There is meaningful startup coverage in `src/features/app-shell/test/startup-layout.suite.ts` and `src/stage-gate.test.ts`, but the dual-persistence precedence rules remain sensitive to regression.

**Importing is broad and protocol-sensitive:**
- Files: `src-tauri/src/core/import_runtime.rs`, `src-tauri/src/commands/importing.rs`, `src/components/import/*.vue`
- Why fragile: Import behavior depends on many schema shapes and command syntaxes, and current logic centralizes numerous assumptions in one path.
- Safe modification: Add fixture-driven tests before refactoring; isolate curl parsing and OpenAPI adaptation so changes do not ripple across all import cases.
- Test coverage: `src-tauri/src/core/import_runtime.rs` contains tests, but file size and feature breadth indicate high regression surface.

**Persistence mapping depends on loosely typed JSON columns:**
- Files: `src-tauri/src/storage/repositories/request_repo.rs`, `src-tauri/src/storage/repositories/history_repo.rs`, `src-tauri/src/storage/repositories/environment_repo.rs`, `src-tauri/src/storage/connection.rs`
- Why fragile: Many repository mappers deserialize JSON text columns into nested DTOs with permissive fallbacks, which masks bad data and makes schema evolution harder.
- Safe modification: Add explicit validation/migration steps for JSON columns and fail with repairable diagnostics instead of silently defaulting.
- Test coverage: Repository-level tests exist, but they mainly confirm happy-path persistence rather than corrupted-row recovery.

## Scaling Limits

**Local history retention is capped but still payload-heavy:**
- Current capacity: Browser snapshot history is capped in `src/lib/request-workspace.ts`, and SQLite history persists per-execution snapshots locally.
- Limit: Frequent large-response workflows will still grow local storage and SQLite size quickly because each history item stores rich JSON content.
- Scaling path: Add user-configurable retention/pruning and lighter-weight persisted history summaries.

**Single local SQLite database is the main durability boundary:**
- Current capacity: The app uses one SQLite file under app data via `src-tauri/src/core/app_state.rs`.
- Limit: As request collections, histories, and imported specs grow, startup and repository operations become more sensitive to large-table scans and blob-heavy rows.
- Scaling path: Add indexing reviews, archival/pruning, and payload size limits for stored snapshots and previews.

## Dependencies at Risk

**Tauri command surface is broad and tightly coupled to frontend models:**
- Risk: The invoke handler in `src-tauri/src/lib.rs` exposes many domain-specific commands whose DTO contracts mirror frontend state closely.
- Impact: Model drift causes breakage across the app shell, request composition, import/export, and settings flows.
- Migration plan: Stabilize DTO boundaries per domain and version high-churn payloads before adding more command breadth.

## Missing Critical Features

**No secure secret storage path:**
- Problem: The current persistence model stores auth-related fields in regular app state rather than a dedicated secret store.
- Blocks: Strong privacy guarantees for long-lived API tokens, passwords, and sensitive workspace snapshots.

**No repair/diagnostic UX for corrupted persisted state:**
- Problem: Corrupted local snapshot or malformed JSON rows collapse into defaults or empty state without actionable diagnostics.
- Blocks: Safe recovery from partial writes, migration mistakes, and manual DB damage.

## Test Coverage Gaps

**Corrupted persistence recovery paths:**
- What's not tested: Recovery behavior for malformed JSON in SQLite columns and browser snapshot corruption beyond a generic null fallback.
- Files: `src/lib/request-workspace.ts`, `src-tauri/src/storage/repositories/request_repo.rs`, `src-tauri/src/storage/repositories/history_repo.rs`, `src-tauri/src/storage/repositories/environment_repo.rs`
- Risk: Data loss or silent reset behavior can ship unnoticed because permissive fallbacks hide bad persistence.
- Priority: High

**Large payload and memory pressure scenarios:**
- What's not tested: Request and MCP execution behavior with very large bodies, large multipart uploads, and repeated high-volume history persistence.
- Files: `src-tauri/src/core/request_executor.rs`, `src-tauri/src/core/mcp_runtime.rs`, `src-tauri/src/storage/repositories/history_repo.rs`
- Risk: Performance regressions and memory spikes remain hard to catch before release.
- Priority: Medium

**Dangerous request execution options:**
- What's not tested: UX and persistence signaling around disabled SSL verification, proxy misconfiguration, and redirect policy edge cases.
- Files: `src-tauri/src/core/request_executor.rs`, `src/features/request-compose/components/RequestExecutionSection.vue`, `src/features/app-shell/state/app-shell-services.ts`
- Risk: Security-sensitive request behavior may regress without obvious failures in standard happy-path tests.
- Priority: Medium

---

*Concerns audit: 2026-04-06*
