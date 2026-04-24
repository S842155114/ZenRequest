# Phase 20 Summary — Explainable Replay & Diagnostics Foundation

## What shipped

- Added a minimal explainability contract for HTTP history/replay artifacts with structured `summary`, `sources`, and `limitations` fields.
- Extended frontend history and response types so explainability can travel with history items and replayed response state.
- Added frontend explainability shaping for replay flows, including safe-projection-aware limitation handling and replay recovery reasons.
- Rendered inline explainability cards in the existing response detail view with concise summary, source badges, limitation blocks, and expandable details.
- Added Rust-side explainability DTOs so bootstrap/history APIs can return explainability metadata directly instead of relying only on frontend inference.
- Derived explainability for persisted HTTP history from real request snapshot evidence, including authored request basis, unresolved template markers, and safe-projected secret placeholders.
- Kept bootstrap redaction and explainability aligned by recomputing explainability from redacted history snapshots before returning bootstrap payloads.
- Added targeted frontend and Rust regression coverage for explainability rendering, replay limitation derivation, history repository explainability derivation, and bootstrap safe-projection consistency.

## Files changed

- `src/types/request.ts`
- `src/lib/request-workspace.ts`
- `src/features/app-shell/domain/history-replay.ts`
- `src/features/app-shell/composables/useAppShellViewModel.ts`
- `src/features/app-shell/types.ts`
- `src/features/app-shell/test/harness.ts`
- `src/components/response/ResponsePanel.vue`
- `src/components/response/ResponsePanel.test.ts`
- `src/features/app-shell/domain/history-replay.test.ts`
- `src-tauri/src/models/app.rs`
- `src-tauri/src/storage/repositories/history_repo.rs`
- `src-tauri/src/storage/repositories/workspace_repo.rs`

## Verification completed

Frontend-focused verification completed:

- `pnpm test -- src/features/app-shell/domain/history-replay.test.ts`
- `pnpm test -- src/components/response/ResponsePanel.test.ts`
- `pnpm test -- src/features/app-shell/domain/history-replay.test.ts src/components/response/ResponsePanel.test.ts`

Rust-focused verification completed:

- `cargo test --manifest-path src-tauri/Cargo.toml history_repo -- --nocapture`
- `cargo test --manifest-path src-tauri/Cargo.toml workspace_repo -- --nocapture`

Result:

- targeted frontend and Rust verification passed for the explainable replay baseline and bootstrap safe-projection consistency.

## Deviations

- This phase delivers an HTTP history/replay explainability baseline, not a complete execution provenance system.
- The current implementation does not yet fully model authored input vs resolved execution vs result artifact using persisted runtime facts such as `executionArtifact.compiledRequest`.
- MCP-specific explainability semantics remain deferred; this phase only preserves extension space for future MCP/session-aware metadata.
- Richer backend-sourced runtime-blocked or environment-mismatch explainability categories were not added in this slice.
- Verification is targeted rather than product-wide.

## Self-Check

PASSED FOR BASELINE SCOPE

- HTTP history/replay now exposes structured explainability instead of only opaque rerunnable payloads.
- Replay detail shows inline diagnostics without introducing a separate diagnostics workspace.
- Explainability remains compatible with Phase 19 safe-projection guarantees.
- Bootstrap/history API paths now carry explainability metadata directly for HTTP history items.
- Ship messaging should describe this phase as an explainability foundation/baseline, not a fully complete execution-trace system.
