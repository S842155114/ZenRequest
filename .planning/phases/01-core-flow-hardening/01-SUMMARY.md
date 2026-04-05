---
phase: 01-core-flow-hardening
plan: 01
subsystem: app-shell-runtime
tags: [startup, recovery, history, http, workspace, vitest]
provides:
  - startup recovery fallback for invalid or unreadable workspace snapshots
  - explicit startup state transitions for loading, degraded, and ready
  - hardened HTTP response-to-history commit boundary for repeated sends
  - regression coverage for startup recovery and large-response history scenarios
affects: [core-flow-hardening, app-shell, request-workspace, history]
tech-stack:
  added: []
  patterns: [composable-store-service layering, deterministic state transitions, normalized snapshot result]
key-files:
  created: []
  modified:
    - src/lib/request-workspace.ts
    - src/features/app-shell/composables/useAppShell.ts
    - src/features/app-shell/state/app-shell-services.ts
    - src/features/app-shell/state/app-shell-store.ts
    - src/lib/request-workspace.test.ts
    - src/features/app-shell/state/app-shell-services.test.ts
    - src/features/app-shell/test/startup-layout.suite.ts
key-decisions:
  - "Invalid persisted snapshot falls back to a fresh usable workspace instead of blocking startup"
  - "HTTP success may synthesize a history item from execution artifacts when runtime history payload is absent"
  - "Startup status must surface degraded recovery rather than collapsing to a generic failure"
duration: 69min
completed: 2026-04-06
---

# Phase 1: Core Flow Hardening Summary

**Hardened the core HTTP debugging flow so startup recovery and repeated send history behavior stay usable under corrupted snapshots and heavy response paths.**

## Performance
- **Duration:** 69min
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Added structured workspace snapshot loading in `src/lib/request-workspace.ts` so missing, parse-failed, and invalid snapshots are distinguished instead of collapsing into one opaque restore path.
- Updated `useAppShell` and app-shell services to drive explicit `loading` → `degraded` / `ready` startup transitions and preserve a usable fallback workspace when recovery fails.
- Hardened HTTP send success handling so repeated sends keep newest history first and successful executions still record usable history when only execution artifacts are available.
- Added regression tests covering invalid snapshot fallback, repeated send/history consistency, and large response integrity.

## User-facing Changes
- App startup no longer gets stuck or becomes unusable when the saved workspace snapshot is corrupted.
- Recovery problems can surface as a degraded startup state instead of a silent generic failure.
- Repeatedly sending the same request keeps the latest result at the top of history without visible/history drift.
- Large HTTP responses keep status, timing, headers, raw body, and formatted body available without corrupting local history.

## Task Commits
1. **Task 1: Startup And Recovery Hardening** - `uncommitted`
2. **Task 2: Execution Result And History Boundary Hardening** - `uncommitted`
3. **Task 3: Large Payload And Response Projection Performance Hardening** - `uncommitted`
4. **Task 4: Reliability Test Coverage And Regression Guardrails** - `uncommitted`

## Files Created/Modified
- `src/lib/request-workspace.ts` - Returns structured snapshot load outcomes for startup recovery logic.
- `src/features/app-shell/composables/useAppShell.ts` - Applies degraded fallback behavior during workspace bootstrap.
- `src/features/app-shell/state/app-shell-services.ts` - Normalizes startup state transitions and HTTP success/history handling.
- `src/features/app-shell/state/app-shell-store.ts` - Synthesizes history entries when runtime history payload is absent.
- `src/lib/request-workspace.test.ts` - Covers missing, parse-failed, and invalid snapshot cases.
- `src/features/app-shell/state/app-shell-services.test.ts` - Covers repeated send ordering, fallback history creation, and large response integrity.
- `src/features/app-shell/test/startup-layout.suite.ts` - Verifies invalid saved snapshot falls back to a fresh bootstrap.

## Decisions & Deviations
- Chose graceful fresh bootstrap for invalid persisted snapshots to preserve the product promise of “可进入可继续使用”.
- Kept changes inside existing composable/store/service/lib boundaries instead of introducing a new recovery abstraction layer.
- No material Rust-side changes were needed for this phase slice, so Rust validation was not part of the executed changes.

## Next Phase Readiness
- Phase 1 now provides a more trustworthy startup/recovery baseline for Phase 2 workspace asset flows.
- HTTP history and response projection behavior is stable enough for collection/history/import-export work to build on.
- Frontend regression coverage exists for the most failure-prone core-flow paths.
