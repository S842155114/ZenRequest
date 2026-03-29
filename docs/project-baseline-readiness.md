# Project Baseline Readiness

Snapshot date: 2026-03-29

## Summary

ZenRequest already has a broad desktop baseline in place. The current repository state indicates that the project is not blocked by missing core desktop workbench capabilities. The remaining issues are primarily documentation alignment, release-readiness follow-up, and scope clarification.

This summary is the canonical baseline record for contributors who need to know what is already shipped, what still needs cleanup, and what is intentionally outside the current desktop release scope.

## Shipped Desktop Capabilities

### Workspace Runtime

- Multiple user workspaces with runtime bootstrap and active-workspace restoration
- Demo workspace seeding on first run and legacy snapshot migration into runtime-owned data
- Separately persisted workspace session state for open tabs, active tab, and active environment

### Request Authoring

- Saved collections and requests with stable identities
- Canonical resource-tab behavior for saved requests
- Detached draft preservation when backing requests or collections are deleted
- Request body editors for `json`, `formdata`, `raw`, and `binary`
- Request-local mock template editing
- Request-side response test authoring

### Runtime Execution

- Rust-owned request compilation from canonical request definitions and active environment data
- Live HTTP execution through the runtime
- Request-local mock execution through the same send flow
- Runtime-side assertion evaluation and execution artifact creation
- Persisted workspace history with replay-safe request snapshots
- Redaction of sensitive request and response header/auth data in persisted history

### Import / Export

- Workspace export and full-application export as versioned JSON packages
- Workspace and application import with `skip`, `rename`, and `overwrite` conflict handling
- Curl import into editable request drafts mapped into the canonical request model

### Response Inspection and UI

- Response source viewer with format-aware code surfaces
- HTML preview in an isolated embedded iframe
- Professional desktop workbench shell with connected explorer, request, and response regions
- Startup loading and theme handoff flow

## Verification Evidence

- `pnpm test` passed on 2026-03-29: 14 test files, 119 tests
- `cargo test --manifest-path src-tauri/Cargo.toml` passed on 2026-03-29: 19 Rust tests
- `pnpm build` passed on 2026-03-29

## Classification Of Current Findings

### Documentation Drift

- `README.md` previously described local persistence as plain text or JSON files, while the implemented desktop runtime persists data in a local SQLite database managed by Rust
- Multiple archived OpenSpec capability documents still used placeholder `Purpose` text even though the capabilities are already stable and implemented

### Readiness Gaps

- Frontend production build currently emits a large bundle warning for the main client chunk
- The warning does not block the current desktop baseline, but it should remain tracked as release-readiness follow-up

### Explicit Scope Boundaries

- The product baseline is desktop-first and Tauri-first
- The non-Tauri mock adapter exists to support tests and local component development, but it is not feature-complete for live request sending or curl import
- Future runtime capability seams for execution hooks, tool packaging, and plugin manifests are intentionally reserved rather than implemented in the current baseline

### Not Missing Core Desktop Capabilities

- The current audit did not find evidence that the major desktop baseline areas are still unimplemented
- Remaining work is better described as documentation alignment, release-readiness follow-up, and future-scope decisions

## Follow-Up Guidance

- Treat bundle-size optimization as a dedicated readiness improvement, not proof of missing core functionality
- Treat browser-mode parity as a separate roadmap decision; do not backfill it implicitly into the desktop baseline
- When proposing new changes, reference this summary first to avoid restating already shipped capability work as if it were missing
