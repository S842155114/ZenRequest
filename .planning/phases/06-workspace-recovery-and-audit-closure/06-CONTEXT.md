# Phase 6: Workspace, Recovery And Audit Closure - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning
**Source:** Milestone audit driven gap-closure planning

## Why This Phase Exists

Phase 6 is a milestone gap-closure phase created from `.planning/v1.0-MILESTONE-AUDIT.md`.

The audit identified three product-level gaps that still block clean v1 archive readiness:
- `WS-01`: collection / folder asset management is not fully evidenced or fully integrated
- `WS-03`: import/export is reliable, but migration/conflict closure is only partial at milestone level
- `TEST-02`: degraded startup recovery is validated, but broader database/history anomaly recovery guidance is not fully closed milestone-wide

The audit also identified archive-proof gaps that should be closed in the same phase while the affected subsystems are already open:
- Phase 3 is missing `03-SUMMARY.md` and `03-VERIFICATION.md`
- Phase 4 is missing `04-VERIFICATION.md`
- `REQUIREMENTS.md` traceability still does not reflect milestone gap-closure routing cleanly enough for re-audit

## Locked Decisions

- This phase is a **gap-closure** phase, not a fresh product expansion phase.
- Scope is limited to closing the milestone gaps recorded in `.planning/v1.0-MILESTONE-AUDIT.md`.
- Prefer boring, local, existing-boundary solutions over asset-model rewrites.
- Reuse the current layering:
  - components for display and interaction
  - composables/state for orchestration
  - `src/lib/` for pure helpers
  - `src-tauri/` for storage/runtime boundaries
- Do not broaden into v2 roadmap items.
- Archive-proof work is in-scope only where it directly closes audit blockers for Phase 3 / 4 and milestone traceability.

## Gap Targets

### Product gaps to close

#### 1. `WS-01` — Workspace asset hierarchy closure
Audit signal:
- folder-level model/integration is not convincingly present
- Phase 2 summary explicitly says collection/folder hardening is not fully executed

Phase 6 should either:
- complete the intended folder/collection closure in the existing model, or
- explicitly tighten the requirement to the implemented product truth and align roadmap/requirements/evidence accordingly

Default preference: close the actual product gap if the missing work is still modest and fits current architecture.

#### 2. `WS-03` — Import/export migration closure
Audit signal:
- boundary reliability is improved, but milestone closure for conflict/migration UX is still partial

Phase 6 should:
- tighten the conflict strategy path and result messaging end-to-end
- ensure import/export outcomes remain understandable and durable in the main UX path
- avoid introducing a large migration framework

#### 3. `TEST-02` — Recovery path closure
Audit signal:
- degraded startup path is validated
- broader database/history anomaly recovery guidance is not fully evidenced across runtime boundaries

Phase 6 should:
- make user-visible recovery guidance more complete for DB/history failure scenarios already in product scope
- ensure diagnostics and next-step suggestions are structured and consistent
- avoid inventing a heavyweight repair center unless current code patterns already support it

## Archive-Proof Gaps To Close

### Phase 3 artifacts
Need to create:
- `03-SUMMARY.md`
- `03-VERIFICATION.md`

These must reflect what actually shipped in Phase 3:
- variable resolution semantics
- auth consistency and replay safety
- secret-safe export / redaction behavior

### Phase 4 artifacts
Need to create:
- `04-VERIFICATION.md`

Phase 4 already has a summary and UAT, but lacks the formal verification artifact needed by milestone audit.

### Requirements traceability alignment
Need to ensure:
- Phase assignments in `.planning/REQUIREMENTS.md` match gap-closure routing
- future re-audit can distinguish original delivery from gap-closure completion clearly enough to pass

## Evidence Sources

### Audit source
- `.planning/v1.0-MILESTONE-AUDIT.md`

### Existing phase artifacts
- `.planning/phases/02-workspace-assets/02-SUMMARY.md`
- `.planning/phases/02-workspace-assets/02-UAT.md`
- `.planning/phases/03-variables-and-secrets/03-PLAN.md`
- `.planning/phases/03-variables-and-secrets/03-UAT.md`
- `.planning/phases/04-reliability-and-assertions/04-SUMMARY.md`
- `.planning/phases/04-reliability-and-assertions/04-UAT.md`

### Likely code seams
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/components/layout/AppSidebar*`
- `src/lib/request-workspace.ts`
- `src/lib/tauri-client.ts`
- `src-tauri/src/core/import_runtime.rs`
- `src-tauri/src/storage/repositories/workspace_repo.rs`

## Expected Output Of This Phase

1. Product gap closure for workspace hierarchy / import-export / recovery guidance
2. Regression tests proving those closures
3. Missing planning artifacts for Phase 3 and Phase 4 completed
4. Milestone re-audit should have a realistic path to passing after Phase 6 and Phase 7 complete

## Out Of Scope

- MCP improvements beyond what is already assigned to Phase 7
- OpenAPI / stdio / broader protocol expansion
- New sharing/cloud collaboration systems
- Major storage architecture rewrite
- Any milestone archive itself; archive only after re-audit passes
