---
phase: 16
plan: 16-PLAN
status: proposed
type: feature
wave: 1
depends_on:
  - 15
files_modified:
  - src/features/app-shell/domain/
  - src/features/app-shell/composables/
  - src/components/response/
  - src/lib/request-workspace.ts
  - src-tauri/src/core/mcp_runtime.rs
  - src-tauri/src/storage/repositories/
autonomous: false
requirements:
  - MCPS-03
  - WBIN-02
---

<objective>
Integrate MCP `sampling` into the existing ZenRequest history / replay / diagnostics loop so it behaves like a first-class workbench action rather than a special-case branch.
</objective>

<scope>
- Preserve full `sampling` request/result data needed for history-backed replay
- Restore `sampling` history entries into normal replay drafts inside the existing workbench
- Add a lightweight replay hint for restored `sampling` drafts
- Improve `sampling` diagnostics ordering so environment/runtime/capability causes are shown before lower-level protocol or input details
- Keep sidebar/history summaries compact while preserving replay fidelity underneath

Out of scope:
- New MCP capabilities beyond `sampling`
- Multi-server state management
- A separate replay model or standalone `sampling` screen
- Broader comparison/analysis tooling across multiple `sampling` runs
</scope>

<tasks>

### Task 16-01 — Align sampling history snapshot and replay restoration
- **Type:** History / replay integration
- **Files:** `src/lib/request-workspace.ts`, `src/features/app-shell/domain/history-replay.ts`, `src/features/app-shell/composables/useAppShellViewModel.ts`
- **Action:** Ensure `sampling` history entries retain the full request/result shape needed for replay and restore into the same replay-draft model used by other request kinds.
- **Verify:** Selecting a `sampling` history entry opens a standard replay draft with editable `sampling` fields and preserved artifact context.
- **Acceptance criteria:** `sampling` enters the existing replay loop without introducing a custom replay path, satisfying `MCPS-03` and `WBIN-02`.

### Task 16-02 — Add replay-safe sampling hinting and compact history summaries
- **Type:** UX fit
- **Files:** history summary shaping in runtime/storage plus replay-related UI surfaces adjacent to current history rendering
- **Action:** Keep full replay data under the hood while presenting concise `sampling` summaries in history lists, and add a lightweight hint when a replayed `sampling` draft is opened.
- **Verify:** History entries remain readable and replayed `sampling` tabs communicate that results may differ because of server/runtime/context changes.
- **Acceptance criteria:** `sampling` summaries stay compact while replay semantics remain fully usable.

### Task 16-03 — Prioritize boundary-first sampling diagnostics
- **Type:** Diagnostics UX
- **Files:** `src/components/response/ResponsePanel.vue` and any adjacent response-formatting helpers, plus MCP artifact shaping if needed
- **Action:** Order `sampling` diagnostics so capability/runtime/session/transport constraints are surfaced before raw protocol details or prompt/input specifics.
- **Verify:** Sampling failures first answer “is this an environment/support problem?” while still keeping lower-level details accessible.
- **Acceptance criteria:** `sampling` failure states feel consistent with ZenRequest’s readable-first workbench UX, satisfying `WBIN-02`.

### Task 16-04 — Extend targeted regression coverage for replay and diagnostics fit
- **Type:** Verification
- **Files:** history/replay tests, MCP response tests, and any runtime/history tests adjacent to touched areas
- **Action:** Add focused tests for `sampling` history persistence, replay restoration, compact summary behavior, and boundary-first diagnostics.
- **Verify:** The existing send → history → replay loop passes for `sampling` and diagnostics ordering is protected against regression.
- **Acceptance criteria:** Phase 16 behavior is covered by targeted tests and ready for future MCP fit work.

</tasks>

<verification>
- Confirm `sampling` history entries restore into standard replay drafts
- Confirm replayed `sampling` drafts show a lightweight context-change hint while staying directly sendable
- Confirm history/sidebar summaries for `sampling` stay compact and identifiable
- Confirm `sampling` diagnostics prioritize capability/runtime/session boundary causes before low-level details
- Run targeted tests covering history, replay, MCP response, and runtime/storage shaping for `sampling`
</verification>

<success_criteria>
- `sampling` participates in the existing history / replay loop without a custom replay model
- Replayed `sampling` drafts preserve fidelity and remain directly editable/sendable
- `sampling` history summaries are compact, readable, and identifiable in list surfaces
- `sampling` diagnostics follow boundary-first prioritization while preserving access to protocol detail
- No new parallel MCP workbench surface or scope creep is introduced
</success_criteria>

<implementation_notes>
- Reuse existing replay-draft construction and history selection flow before adding new branches
- Prefer shaping existing MCP artifact and summary data over creating new persistence formats
- Keep diagnostic enhancements inside the current response chrome and MCP error presentation patterns
- Optimize for consistency with existing request/replay behavior, not for `sampling`-specific exceptional flows
</implementation_notes>
