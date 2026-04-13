# Phase 16 Research

## Objective

Research how to make MCP `sampling` fit the existing ZenRequest history / replay / diagnostics loop without introducing a separate product model or new heavyweight abstraction.

## What matters for planning

Phase 16 is not about inventing new `sampling` capabilities. It is about aligning `sampling` with already-established workbench behaviors so that users experience it like other MCP actions: send → inspect → history → replay → inspect again.

## Existing patterns confirmed

### 1. Replay already restores canonical drafts from history
- `src/features/app-shell/domain/history-replay.ts`
- `buildHistoryReplayDraft(...)` already restores a request tab from `HistoryItem.requestSnapshot`
- Replay tabs are marked with `origin.kind = 'replay'`, `historyItemId`, `persistenceState = 'unsaved'`, and `isDirty = true`
- This strongly suggests `sampling` should reuse the same replay path instead of inventing a `sampling`-specific replay model

### 2. History selection is already centralized
- `src/features/app-shell/composables/useAppShellViewModel.ts`
- `handleSelectHistory(...)` already deduplicates replay tabs and restores history through `buildHistoryReplayDraft(...)`
- This means Phase 16 likely only needs to ensure `sampling` snapshots and summary metadata are complete enough for this existing path to work well

### 3. Request workspace cloning already supports sampling
- `src/lib/request-workspace.ts`
- Request cloning already preserves `sampling` request definitions and metadata
- This removes the need for a new persistence subsystem; the likely work is around history summary fidelity, replay hints, and diagnostic affordances

### 4. Response UX is already readable-first with layered details
- `src/components/response/ResponsePanel.vue`
- Existing response chrome separates readable body, metadata, headers, cookies, and tests
- Diagnostics fit best as an enhancement of the current MCP response area, not as a new panel type

### 5. Runtime history summaries already key off operation type
- `src-tauri/src/storage/repositories/history_repo.rs`
- MCP history summary derivation maps operation names into persisted summary metadata
- `sampling` was only recently added there, so Phase 16 should extend summary shaping rather than replace it

### 6. MCP runtime artifacts are the real integration point
- `src-tauri/src/core/mcp_runtime.rs`
- Runtime already shapes request/response artifacts, protocol payloads, session identifiers, and error categories
- For Phase 16, the critical fit work will likely happen here plus the replay/history view-model path

## Implications for Phase 16 planning

### Replay semantics
Recommended direction:
- Reuse the existing replay-draft model
- Restore `sampling` as a normal editable replay draft
- Add a lightweight replay hint, not a modal or confirmation gate

Why:
- Preserves current workbench mental model
- Avoids special-casing one MCP operation
- Matches locked user decisions from `16-CONTEXT.md`

### Diagnostics priority
Recommended direction:
- Introduce boundary-first diagnostics ordering for `sampling`
- Keep protocol details available, but not primary

Why:
- `sampling` failures often stem from server capability, runtime, or transport conditions rather than malformed prompt content
- This is a presentation and classification problem more than a new runtime feature

### History retention and summary
Recommended direction:
- Persist full replay-safe `sampling` request/result data in the underlying snapshot and artifact
- Keep sidebar/history summary compact: operation label, truncated prompt summary, outcome, concise diagnostic signal

Why:
- Preserves replay fidelity
- Avoids bloating the history list with long prompt/result bodies

## Risks

### Risk 1: Sampling replay becomes a special-case flow
If replay adds a custom send gate, new tab type, or isolated restore logic, the product model drifts away from existing replay semantics.

### Risk 2: Diagnostics become too protocol-heavy
If the implementation only exposes raw protocol envelopes or deep JSON details, it will fail the “boundary-first” user decision.

### Risk 3: History summaries become noisy
If full prompt/result bodies are shown directly in sidebar/history summaries, list readability will degrade quickly.

### Risk 4: Snapshot/runtime mismatch
If history snapshots, MCP artifacts, and replay reconstruction keep slightly different subsets of `sampling` data, replay confidence will erode.

## Recommended planning direction

1. Audit current `sampling` persistence into history snapshots and MCP artifacts
2. Extend replay restoration so `sampling` behaves like other replay drafts plus a lightweight replay hint
3. Add compact `sampling`-specific history summaries instead of raw content dumps
4. Add boundary-first diagnostic ordering for `sampling` failures within the existing response chrome
5. Protect the fit with targeted history/replay/response tests rather than broad new abstractions

## Conclusion

Phase 16 should be planned as a consistency-and-integration phase. The codebase already contains the right foundational patterns for replay drafts, history restoration, response presentation, and artifact persistence. The work now is to connect `sampling` into those patterns cleanly, with minimal new abstraction and strong regression coverage.
