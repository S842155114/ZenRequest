---
phase: 18
plan: 18-PLAN
type: reliability-implementation
wave: 1
depends_on: []
files_modified:
  - .planning/phases/18-persistence-reliability-and-recovery-paths/18-PLAN.md
  - src/lib/request-workspace.ts
  - src/features/app-shell/composables/useAppShell.ts
  - src-tauri/src/services/bootstrap_service.rs
  - src-tauri/src/models/app.rs
  - src/lib/tauri-client.ts
  - src-tauri/src/storage/repositories/request_repo.rs
  - src-tauri/src/storage/repositories/history_repo.rs
  - src-tauri/src/storage/repositories/workspace_repo.rs
  - src/features/app-shell/test/
  - src/stage-gate.test.ts
  - .planning/phases/18-persistence-reliability-and-recovery-paths/18-SUMMARY.md
autonomous: true
requirements:
  - EX-02
  - LT-01
  - AR-01
must_haves:
  - Corrupted local snapshot is detected and surfaced as diagnosable degraded recovery rather than silently swallowed
  - Malformed persisted JSON rows are isolated at the smallest affected unit and do not silently collapse into trusted default state
  - Startup restore behavior explicitly prefers backend durable truth over browser snapshot cache and communicates user-visible conflicts
  - Reliability improvements are covered by focused corruption and restore-path tests
---

<objective>
Implement Phase 18 reliability improvements so ZenRequest can detect corrupted local snapshot state, isolate malformed persisted JSON rows, apply backend-durable-first restore precedence, and surface user-facing degraded recovery signals without re-opening Phase 17 model decisions.
</objective>

<tasks>
<task>
  <id>T0</id>
  <title>Define recovery diagnostics contract and propagation boundaries</title>
  <type>design</type>
  <files>src/lib/request-workspace.ts, src-tauri/src/models/app.rs, src-tauri/src/services/bootstrap_service.rs, src/lib/tauri-client.ts</files>
  <read_first>
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-RESEARCH.md
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-REVIEWS.md
- .planning/phases/17-execution-model-state-boundary/17-summary.md
  </read_first>
  <action>
Define the structured recovery diagnostics contract used across browser snapshot handling and durable bootstrap recovery. Make explicit what fields carry user-facing summary, affected scope, severity, and secondary diagnostic detail, and document how diagnostics propagate from repository or snapshot detection to bootstrap/service and finally to frontend-visible messaging. Keep this contract outside request-centric execution shape and aligned with Phase 17 state boundaries.
  </action>
  <acceptance_criteria>
- the plan explicitly defines a recovery diagnostics contract or equivalent structured payload shape before repository/bootstrap/UI wiring work begins
- the plan distinguishes user-facing summary from secondary technical detail or diagnostic metadata
- the plan states how diagnostics propagate across repository -> service/bootstrap -> frontend-visible paths
- the contract does not reopen Phase 17 execution envelope or request-centric model boundaries
  </acceptance_criteria>
</task>

<task>
  <id>T1</id>
  <title>Detect corrupted browser snapshot and return diagnosable recovery results</title>
  <type>implementation</type>
  <files>src/lib/request-workspace.ts, src/features/app-shell/composables/useAppShell.ts</files>
  <read_first>
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-RESEARCH.md
- .planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md
- src/lib/request-workspace.ts
- src/features/app-shell/composables/useAppShell.ts
  </read_first>
  <action>
Update browser snapshot reading and startup hydration so malformed or structurally invalid local snapshot data is not silently treated as normal empty state. Make `src/lib/request-workspace.ts` return a structured degraded recovery result that distinguishes missing snapshot, corrupted snapshot, and valid snapshot, and make the result shape explicit enough for downstream startup/recovery UI handling. Update `src/features/app-shell/composables/useAppShell.ts` so corrupted snapshot input drives a degraded-but-usable startup path with a user-facing recovery message instead of silent reset. Keep browser snapshot classified as cache-only input rather than durable truth.
  </action>
  <acceptance_criteria>
- `src/lib/request-workspace.ts` contains a structured branch that distinguishes corrupted snapshot from missing snapshot and defines the contract fields consumed by startup recovery handling
- `src/features/app-shell/composables/useAppShell.ts` sets degraded startup behavior when corrupted snapshot input is reported and surfaces a user-facing summary message through an existing startup or notice path
- no code path in `src/lib/request-workspace.ts` silently converts malformed browser snapshot into normal success state without a diagnostic result
- browser snapshot recovery logic still allows app startup to continue when backend durable data is available
  </acceptance_criteria>
</task>

<task>
  <id>T2</id>
  <title>Isolate malformed persisted JSON rows at repository and bootstrap boundaries</title>
  <type>implementation</type>
  <files>src-tauri/src/storage/repositories/request_repo.rs, src-tauri/src/storage/repositories/history_repo.rs, src-tauri/src/storage/repositories/workspace_repo.rs, src-tauri/src/services/bootstrap_service.rs</files>
  <read_first>
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-RESEARCH.md
- .planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md
- src-tauri/src/storage/repositories/request_repo.rs
- src-tauri/src/storage/repositories/history_repo.rs
- src-tauri/src/storage/repositories/workspace_repo.rs
- src-tauri/src/services/bootstrap_service.rs
  </read_first>
  <action>
Replace silent malformed-JSON fallback behavior at repository/bootstrap boundaries with smallest-unit isolation and structured recovery reporting. Make parent-versus-child corruption handling explicit so unrecoverable parent structures may escalate while valid child or sibling data remains available wherever practical. For request/history/workspace persisted JSON rows, detect malformed JSON explicitly, isolate only the affected row or snapshot fragment, and preserve other valid data. Ensure bootstrap/service paths can communicate that a row or fragment was ignored because it was corrupted, instead of flattening the failure into ordinary default values. Do not escalate row-level corruption into whole-workspace reset unless durable truth for the relevant structure becomes unusable.
  </action>
  <acceptance_criteria>
- repository/bootstrap code explicitly detects malformed persisted JSON instead of only returning default/empty values
- malformed JSON handling isolates the smallest affected row or fragment rather than dropping the entire workspace/session by default, and the plan states when parent-structure corruption must escalate beyond row-level isolation
- `src-tauri/src/services/bootstrap_service.rs` participates in reporting recovery/degraded state when corrupted persisted data affects startup restore
- no new logic expands request-centric shape to carry recovery policy; recovery signaling stays within service/bootstrap/repository boundaries or returned diagnostics
  </acceptance_criteria>
</task>

<task>
  <id>T3</id>
  <title>Apply backend-durable-first restore precedence and conflict signaling</title>
  <type>implementation</type>
  <files>src/features/app-shell/composables/useAppShell.ts, src-tauri/src/services/bootstrap_service.rs, src-tauri/src/storage/repositories/workspace_repo.rs</files>
  <read_first>
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md
- .planning/phases/17-execution-model-state-boundary/17-summary.md
- src/features/app-shell/composables/useAppShell.ts
- src-tauri/src/services/bootstrap_service.rs
- src-tauri/src/storage/repositories/workspace_repo.rs
  </read_first>
  <action>
Make startup restore precedence explicit in implementation paths: backend durable state is the primary truth source, and browser snapshot only fills cache/convenience state. When browser snapshot and backend durable state conflict in a way that changes user-visible restore results, surface a clear recovery message that says the system restored from the more trustworthy durable state. Define user-visible conflicts concretely around restored active workspace/session/tab/request content differences, and treat closed-tab/history/cache metadata differences as cache-only unless they change the visible restore outcome. When conflicts only affect internal cache details, keep them out of the primary UI path but retain them for diagnostics. Reuse existing app-shell degraded/runtime messaging paths and avoid inventing a new top-level debug surface.
  </action>
  <acceptance_criteria>
- startup restore code prefers backend durable state over browser snapshot when both are present
- user-visible restore conflicts trigger a recovery message that indicates durable state was preferred
- non-user-visible cache-only conflicts do not trigger primary blocking UI
- code changes remain within app-shell/service/bootstrap boundaries and do not introduce new `.vue`-level persistence policy logic
  </acceptance_criteria>
</task>

<task>
  <id>T4</id>
  <title>Add focused corruption and recovery path tests</title>
  <type>test</type>
  <files>src/features/app-shell/test/, src/stage-gate.test.ts</files>
  <read_first>
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-RESEARCH.md
- src/features/app-shell/test/
- src/stage-gate.test.ts
- src/lib/request-workspace.ts
- src/features/app-shell/composables/useAppShell.ts
  </read_first>
  <action>
Add focused tests that cover: corrupted local snapshot recovery, malformed persisted JSON row handling, startup restore precedence when browser snapshot conflicts with backend durable state, and continuity of unaffected data when one row or fragment is isolated. Use the existing frontend/startup test locations and adjacent patterns already used for startup and stage-gate reliability checks. The tests should assert degraded-but-usable recovery behavior, smallest-unit isolation behavior where practical, and explicit precedence in favor of backend durable state.
  </action>
  <acceptance_criteria>
- test files under `src/features/app-shell/test/` or `src/stage-gate.test.ts` cover corrupted local snapshot behavior
- test files under `src/features/app-shell/test/` or `src/stage-gate.test.ts` cover backend-durable-first restore precedence
- tests fail if corrupted snapshot/malformed JSON is silently treated as normal success with no degraded signal
- test coverage includes at least one malformed JSON fixture at repository level and one frontend degraded recovery assertion
- test coverage proves unaffected sibling data remains available when a single corrupted row or fragment is isolated
- tests document at least one user-visible conflict case and one cache-only degraded case
  </acceptance_criteria>
</task>

<task>
  <id>T5</id>
  <title>Write Phase 18 summary and deferred recovery notes</title>
  <type>documentation</type>
  <files>.planning/phases/18-persistence-reliability-and-recovery-paths/18-SUMMARY.md</files>
  <read_first>
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-RESEARCH.md
- .planning/phases/17-execution-model-state-boundary/17-summary.md
  </read_first>
  <action>
Create `18-SUMMARY.md` describing what corruption/recovery paths were improved, what user-visible degraded recovery behavior now exists, what persistence edge cases remain deferred, and what follow-on assumptions Phase 19 and Phase 20 may rely on. Explicitly note any heavier repair tooling or broader debug-center ideas that were intentionally left out of scope.
  </action>
  <acceptance_criteria>
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-SUMMARY.md` exists
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-SUMMARY.md` contains `## Delivered`
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-SUMMARY.md` contains `## Remaining Limits`
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-SUMMARY.md` contains `## Inputs for Phase 19`
- `.planning/phases/18-persistence-reliability-and-recovery-paths/18-SUMMARY.md` contains `## Inputs for Phase 20`
  </acceptance_criteria>
</task>
</tasks>

<verification>
- Verify corrupted browser snapshot is handled as degraded recovery rather than silent success
- Verify the diagnostics contract shape is explicit and flows consistently across detection, bootstrap/service, and frontend-visible messaging
- Verify row-level corruption does not unnecessarily escalate to whole-workspace loss when healthy sibling data can still load
- Verify malformed persisted JSON rows are isolated and surfaced rather than silently normalized into trusted defaults
- Verify startup restore explicitly prefers backend durable truth over browser snapshot cache
- Verify focused tests exist for corrupted snapshot, malformed persisted data, and restore precedence
- Verify `18-SUMMARY.md` captures delivered reliability improvements and deferred repair/tooling scope
</verification>

<success_criteria>
- Phase 18 turns silent fallback behavior into diagnosable, degraded-but-usable recovery behavior
- recovery messaging and diagnostics propagation are explicit enough that implementers do not invent ad hoc shapes at each boundary
- Reliability logic stays within app-shell/service/bootstrap/repository boundaries
- User-visible restore conflicts are explained without defaulting to heavy blocking UX
- Focused regression tests protect corrupted snapshot and malformed persisted JSON paths
</success_criteria>

<threat_model>
- Risk: Recovery logic spreads into ad hoc UI conditionals instead of staying in core boundaries; Mitigation: constrain work to request-workspace, app-shell orchestration, bootstrap/service, and repository layers
- Risk: Row-level corruption still collapses into defaults and hides data loss; Mitigation: require explicit malformed-JSON detection and smallest-unit isolation
- Risk: Recovery UX becomes too heavy and exceeds phase scope; Mitigation: reuse existing degraded/runtime messaging and defer broader repair center ideas to later work
</threat_model>
