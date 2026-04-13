# Phase 16: Replay, Diagnostics, and Fit - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Make MCP `sampling` fit the existing ZenRequest workbench loop by integrating it into current history / replay / diagnostics / state-flow behavior. This phase is about product fit and consistency, not about introducing a new `sampling` capability surface.

In scope:
- `sampling` history persistence and replay behavior
- `sampling` diagnostics presentation and failure explanation priorities
- `sampling` fit with existing MCP workbench state patterns

Out of scope:
- New MCP capabilities beyond `sampling`
- Multi-server MCP management
- A separate `sampling` workbench or custom replay model
- Large new protocol abstractions unrelated to current MCP workbench patterns
</domain>

<decisions>
## Implementation Decisions

### Replay semantics
- **D-01:** `sampling` restored from history should open as a normal replay draft inside the existing workbench.
- **D-02:** Restored `sampling` drafts may be sent again immediately without requiring a special confirmation step.
- **D-03:** Replay should include a lightweight hint explaining that the request came from history and its result may differ because of server capability, runtime, or context changes.

### Diagnostics priority
- **D-04:** `sampling` diagnostics should prioritize environment and boundary explanations first.
- **D-05:** When `sampling` fails, the UI should first help users understand server support, capability mismatch, transport/runtime limits, or session/context changes before focusing on input-level issues.
- **D-06:** Lower-level protocol details and input specifics should remain available, but they are secondary to boundary-focused guidance.

### History retention
- **D-07:** `sampling` history should retain the full request structure and result payload needed for replay and diagnostics.
- **D-08:** History list and summary surfaces should stay compact by showing only concise sampling summaries, not full prompt/result bodies inline.
- **D-09:** Summary-level history presentation should favor operation label, truncated prompt summary, success/failure state, and concise diagnostic signal over verbose content dumps.

### the agent's Discretion
- Exact hint wording for replayed `sampling` drafts
- Exact truncation rules for history summaries
- Exact visual treatment of boundary-first diagnostics, as long as priority ordering remains clear
</decisions>

<specifics>
## Specific Ideas

- Replay should feel the same as other existing replay drafts rather than becoming a special-case flow.
- `sampling` failures should direct the user toward capability/runtime causes before implying prompt/input mistakes.
- Storage should preserve replay fidelity, while list surfaces stay readable and lightweight.
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` — Defines Phase 16 goal, requirement mapping, and milestone sequencing
- `.planning/REQUIREMENTS.md` — Defines `MCPS-03` and `WBIN-02`

### Upstream phase decisions
- `.planning/phases/15-sampling-request-flow/15-CONTEXT.md` — Locked decisions for `sampling` living inside the existing workbench
- `.planning/phases/15-sampling-request-flow/15-SUMMARY.md` — What Phase 15 actually shipped
- `.planning/phases/15-sampling-request-flow/15-UAT.md` — What users validated in Phase 15 and what follow-up fixes were required

### Existing implementation shape
- `src/lib/request-workspace.ts` — Current request cloning, persistence, and replay-related state handling
- `src/features/app-shell/domain/history-replay.ts` — Existing history-to-replay draft behavior
- `src/features/app-shell/composables/useAppShellViewModel.ts` — Existing workbench history selection and replay orchestration
- `src/components/response/ResponsePanel.vue` — Existing response and diagnostics presentation patterns
- `src-tauri/src/storage/repositories/history_repo.rs` — Runtime history summary persistence behavior
- `src-tauri/src/core/mcp_runtime.rs` — MCP runtime request/response artifact construction
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/request-workspace.ts`: already clones MCP request definitions and artifacts, including `sampling`
- `src/features/app-shell/domain/history-replay.ts`: existing replay-draft path should likely be extended rather than replaced
- `src/features/app-shell/composables/useAppShellViewModel.ts`: already coordinates history selection and restored tab state
- `src/components/response/ResponsePanel.vue`: already provides a readable-first response chrome with diagnostics layering
- `src-tauri/src/storage/repositories/history_repo.rs`: already derives MCP history summary labels from operation type

### Established Patterns
- MCP operations are expected to fit inside one workbench model rather than branching into separate product surfaces
- History restore should create canonical replay drafts, preserving current workbench mental model
- Diagnostics should remain visible but not overwhelm the main readable response body

### Integration Points
- History item persistence and replay restoration for `sampling`
- MCP artifact shaping for replay-safe `sampling` payloads
- Response/diagnostic presentation for boundary-first `sampling` failures
- Sidebar/history summaries where `sampling` entries need concise but identifiable summaries
</code_context>

<deferred>
## Deferred Ideas

- Richer multi-run comparison tools for `sampling`
- Multi-server history organization or sampling session grouping
- Any broader capability management or runtime negotiation UX beyond what is needed for current single-server MCP fit
</deferred>

---

*Phase: 16-replay-diagnostics-and-fit*
*Context gathered: 2026-04-13*
