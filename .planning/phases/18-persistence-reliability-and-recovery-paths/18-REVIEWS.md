---
phase: 18
reviewers: [claude, opencode]
reviewed_at: 2026-04-17T05:07:08.589390+00:00
plans_reviewed: ["18-PLAN.md"]
---

# Cross-AI Plan Review — Phase 18

## the agent Review

# Phase 18 Plan Review

## Summary

This is a well-structured reliability improvement plan that appropriately scopes corruption detection and recovery without reopening Phase 17's foundational decisions. The plan correctly identifies the three main corruption surfaces (browser snapshot, persisted JSON rows, startup conflicts) and proposes a layered recovery strategy. However, there are some gaps in error propagation contracts, test coverage specificity, and user messaging design that need attention before implementation.

## Strengths

- **Respects upstream boundaries** — Explicitly avoids reopening Phase 17 execution model decisions and stays within established adapter-first constraints
- **Appropriate scope control** — Correctly defers secret-safe persistence (Phase 19) and replay explainability (Phase 20) rather than attempting everything at once
- **Layered recovery strategy** — Distinguishes cache-level auto-recovery from row-level isolation from durable-truth escalation, which matches the research findings
- **Smallest-unit isolation principle** — Correctly targets individual corrupted rows rather than wholesale workspace resets
- **Reuses existing infrastructure** — Leverages `useAppShell.ts` degraded state and doesn't invent parallel recovery systems
- **Clear task boundaries** — Each task has well-defined file scope and distinct responsibilities

## Concerns

### HIGH Severity

- **Missing error propagation contract** — T2 requires repositories to return "structured recovery reporting" but doesn't specify the Rust type signature or how diagnostics flow from repository → service → bootstrap → frontend. Without this contract, T1 and T3 can't reliably consume the diagnostics.
  
- **Undefined user messaging strategy** — T3 mentions "surface a clear recovery message" but provides no guidance on message content, tone, or placement. The plan needs at least a sketch of what users will actually see (e.g., "Restored from server data; local cache was outdated" vs technical jargon).

- **Test coverage gaps** — T4 is too vague about what "focused tests" means. Missing specifics on:
  - How to simulate corrupted browser snapshot in tests
  - How to inject malformed JSON into repository test fixtures
  - What "degraded-but-usable" actually looks like in assertions
  - Whether Rust-side repository tests are needed or only frontend tests

### MEDIUM Severity

- **Incomplete isolation rules** — T2 says "isolate only the affected row" but doesn't address cascading corruption (e.g., if a workspace row is malformed, what happens to its child sessions/requests?). Need explicit handling for parent-child corruption scenarios.

- **Missing rollback/repair guidance** — The plan focuses on detection and isolation but doesn't specify what happens after isolation. Can users manually fix corrupted data? Is there a "discard corrupted data" action? Or is it permanently quarantined?

- **Unclear cache-vs-durable conflict detection** — T3 needs to define what constitutes a "user-visible conflict" vs "cache-only conflict". Without concrete examples, implementers will make inconsistent decisions.

- **No performance consideration** — Corruption detection (especially JSON parsing validation) could add startup latency. The plan should at least acknowledge this and suggest lazy validation or background checks for non-critical paths.

### LOW Severity

- **T5 summary timing** — Writing the summary as the final task means it can't guide earlier implementation decisions. Consider moving summary skeleton creation earlier or making it iterative.

- **Missing observability hooks** — No mention of logging/metrics for corruption events. This would be valuable for understanding real-world corruption frequency and patterns.

## Suggestions

### Critical (Address Before Implementation)

1. **Define `RecoveryDiagnostics` contract** — Add a preliminary task (T0) to define the Rust struct that repositories return:
   ```rust
   pub struct RecoveryDiagnostics {
       pub severity: RecoverySeverity,  // CacheOnly | RowIsolated | DurableTruthCompromised
       pub affected_scope: AffectedScope,  // Workspace | Session | Request | HistoryRow
       pub user_message: String,
       pub technical_details: Option<String>,
   }
   ```

2. **Specify user message templates** — In T3, add concrete examples:
   - Cache corruption: "Loaded from saved data. Recent unsaved changes were not recovered."
   - Row isolation: "1 request could not be loaded due to data corruption. Other requests are unaffected."
   - Durable conflict: "Restored workspace from server. Local changes from [timestamp] were discarded."

3. **Expand test specifications** — In T4, require:
   - At least one Rust repository test with malformed JSON fixture
   - At least one frontend test with mocked corrupted snapshot
   - Explicit assertion that degraded state includes diagnostic message
   - Test that isolated corruption doesn't block unaffected data access

4. **Add cascading corruption handling** — In T2, specify:
   - If workspace row is malformed, attempt to load child sessions individually
   - If session row is malformed, attempt to load child requests individually
   - Only escalate to workspace-level degradation if parent structure is unrecoverable

### Recommended (Improve Quality)

5. **Add conflict detection heuristics** — In T3, define user-visible conflicts as:
   - Active workspace ID mismatch
   - Current session content divergence
   - Open request body/headers divergence
   - Cache-only conflicts: closed tabs, inactive workspaces, history metadata

6. **Include performance budget** — Add acceptance criterion to T1/T2: "Corruption detection adds <100ms to cold startup on typical workspace"

7. **Add repair action hooks** — In T2/T3, include placeholder for future repair actions:
   ```typescript
   interface RecoveryAction {
     type: 'discard' | 'retry' | 'export_for_manual_fix';
     available: boolean;
   }
   ```

8. **Move summary earlier** — Make T5 produce an initial skeleton after T1, then update it after T2/T3/T4. This creates a living document that guides implementation.

### Optional (Nice to Have)

9. **Add corruption event logging** — Include structured logging in T2 for corruption events (type, frequency, affected scope) to inform future reliability work.

10. **Consider progressive validation** — For large workspaces, validate critical data (active workspace/session) synchronously and defer validation of inactive data to background.

## Risk Assessment

**Overall Risk: MEDIUM**

### Justification

The plan is fundamentally sound and well-scoped, but the missing error propagation contract and vague test specifications create moderate implementation risk. The HIGH concerns are addressable with targeted additions to the plan rather than fundamental redesign.

**Risk Breakdown:**
- **Technical Risk: MEDIUM** — Missing contracts could lead to inconsistent error handling across layers
- **Scope Risk: LOW** — Plan correctly avoids scope creep and defers appropriate work
- **User Impact Risk: MEDIUM** — Undefined messaging strategy could result in confusing or alarming UX
- **Schedule Risk: LOW** — Tasks are appropriately sized and dependencies are clear

**Mitigation Priority:**
1. Define `RecoveryDiagnostics` contract (blocks T1/T3)
2. Specify user message templates (blocks T3 UX quality)
3. Expand test specifications (blocks T4 effectiveness)
4. Add cascading corruption handling (prevents data loss edge cases)

With these additions, risk would drop to **LOW** and the plan would be ready for autonomous execution.

---

## OpenCode Review

OpenCode review failed or returned empty output.

---

## Consensus Summary

This review run produced one substantive external review from `claude`. `opencode` was available but did not return usable markdown review output in this run.
The successful review strongly supports the overall Phase 18 direction while identifying a few important clarification gaps before planning or re-planning.

### Agreed Strengths

- The plan respects Phase 17 boundaries and avoids reopening already-locked execution model decisions.
- The scope is disciplined and stays focused on reliability, degradation, isolation, and recovery.
- The recovery strategy is layered appropriately across browser snapshot, persisted rows, and durable-truth startup conflicts.
- The plan makes good use of existing app-shell degraded paths instead of inventing an unrelated recovery UI system.

### Agreed Concerns

- The repository → service → bootstrap → frontend recovery diagnostics contract needs to be made more explicit.
- User-facing recovery messaging is still under-specified and would benefit from clearer examples or templates.
- Test coverage expectations for malformed data and degraded-but-usable behavior should be made more concrete.
- Cascading corruption and parent/child persistence damage scenarios need clearer handling rules.

### Divergent Views

- No reviewer divergence could be synthesized in this run because only one external CLI produced a substantive review.
- `opencode` returned no usable review content during this run, so its perspective is unavailable.
