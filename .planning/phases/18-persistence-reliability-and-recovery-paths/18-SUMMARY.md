# Phase 18 Summary — Persistence Reliability and Recovery Paths

## Delivered

Phase 18 now converts several previously silent persistence recovery paths into explicit, degraded-but-usable behavior aligned with Phase 17 boundaries.

Completed improvements:

- Corrupted browser snapshot input is no longer treated like a normal empty restore path.
- Browser snapshot validation now distinguishes:
  - missing snapshot
  - invalid snapshot structure
  - parse failure
- Invalid or unparsable browser snapshots now produce a diagnosable degraded message and are explicitly ignored in favor of more trustworthy persisted state.
- App startup only enters degraded mode for true degraded recovery cases, not for ordinary “missing cache” cases.
- Frontend now surfaces corrupted browser snapshot recovery through user-visible recovery toast messaging instead of leaving the signal buried only in transient startup state.
- Backend bootstrap now tolerates corrupted persisted workspace session payloads by isolating the broken session payload and continuing startup.
- Backend bootstrap emits structured recovery notices when persisted workspace session data is ignored during recovery.
- Request repository row mapping no longer silently defaults malformed persisted JSON fields; corrupted rows now fail mapping explicitly.
- History repository row mapping no longer silently defaults malformed persisted JSON fields; corrupted rows now fail mapping explicitly.
- History export mapping also stops silently swallowing malformed persisted JSON.

## User-visible behavior

The current user-visible recovery behavior is:

- If browser snapshot cache is malformed or unparsable, ZenRequest restores without blocking startup.
- The corrupted browser snapshot is ignored.
- A recovery notice is surfaced explaining that the browser snapshot was ignored and persisted state is preferred.
- If durable workspace session state is corrupted during bootstrap, startup continues with fallback session shaping and a structured backend recovery notice is emitted for UI surfacing.

This matches the Phase 18 decision to prefer degraded-but-usable recovery over silent fallback and over broad hard blocking.

## Verification completed

Frontend-focused verification completed:

- `pnpm test -- --run src/lib/request-workspace.test.ts src/features/app-shell/test/startup-layout.test.ts`
- Result: Phase 18-related snapshot/startup assertions now pass.
- Remaining failures in the broader Vitest run were unrelated baseline issues in MCP history summary expectations and request panel spacing tests.

Rust-focused verification completed:

- `cargo test --manifest-path src-tauri/Cargo.toml storage::repositories::workspace_repo::tests -- --nocapture`
- `cargo test --manifest-path src-tauri/Cargo.toml storage::repositories::request_repo::tests -- --nocapture && cargo test --manifest-path src-tauri/Cargo.toml storage::repositories::history_repo::tests -- --nocapture`
- Result: all targeted repository/bootstrap recovery tests pass.

Added coverage includes:

- corrupted browser snapshot result classification
- corrupted workspace session degradation with recovery notice
- corrupted request persisted JSON row fails explicitly
- corrupted history persisted JSON row fails explicitly

## Scope intentionally not expanded

The following were intentionally left out of Phase 18 to preserve scope:

- a dedicated diagnostics center or repair console
- broad multi-surface inline recovery UI beyond the current startup/toast path
- automatic row-by-row salvage for corrupted request/history collections
- heavier migration or repair tooling for already-corrupted durable tables
- reopening Phase 17 execution/state ownership decisions

## Remaining follow-up opportunities

Potential follow-up work for later phases:

- isolate malformed durable request/history rows at collection load boundaries while continuing to load healthy siblings
- promote backend recovery notices into more granular inline affected-surface messaging
- add precedence/conflict-specific restore notices when browser cache and durable truth differ in user-visible ways
- reduce remaining test fragility around MCP summary shape assertions in unrelated suites

## Phase contract status

Phase 18 meaningfully improved persistence recovery reliability without expanding the request-centric model or violating the execution/state boundaries established in Phase 17.
