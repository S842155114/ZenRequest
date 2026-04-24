# Phase 20 Scope Review

**Date:** 2026-04-24
**Status:** Ready for ship review

## Summary

Phase 20 has delivered a working HTTP history/replay explainability baseline and targeted verification has passed. The current implementation is strong enough for a scoped ship as long as the phase is described as a **baseline/foundation** rather than a complete execution-composition system.

## Completed Against Plan

### T1 — Shared explainability contract

**Status:** Substantially complete

Delivered:
- Frontend explainability contract in `src/types/request.ts`
- Rust DTO contract in `src-tauri/src/models/app.rs`
- Structured `summary`, `sources`, and `limitations` shape for history/replay artifacts
- Extension-friendly category/code model without exposing secret-bearing values

Notes:
- The contract currently focuses on HTTP history/replay.
- MCP/session-aware explainability remains an explicit future extension area, which is compatible with the phase plan.

### T2 — Populate explainability metadata on history and replay shaping paths

**Status:** Partially complete, phase-appropriate baseline achieved

Delivered:
- Frontend history shaping and replay draft construction in `src/lib/request-workspace.ts` and `src/features/app-shell/domain/history-replay.ts`
- Rust-side explainability derivation in `src-tauri/src/storage/repositories/history_repo.rs`
- Bootstrap redaction consistency handling in `src-tauri/src/storage/repositories/workspace_repo.rs`

Delivered source/limitation coverage:
- `authored`
- `template`
- `safe-projected`
- `replay-recovered` / replay-side recovery handling on frontend
- `safe_projection_loss`
- `recovered_from_saved_request`
- `missing_history_snapshot`

Gap relative to full wording of the plan:
- The implementation does **not yet fully distinguish** authored input vs resolved execution vs result artifact using persisted runtime facts such as `executionArtifact.compiledRequest`.
- No deeper runtime-blocked/environment-mismatch explainability pipeline has been added on the Rust side.

Assessment:
- For a phase named `explainable replay diagnostics foundation`, the current baseline is sufficient.
- For a phase described as a fully realized execution-composition explainer, it would be incomplete.

### T3 — Inline explainability cards in history/replay detail

**Status:** Complete

Delivered:
- Inline explainability section in `src/components/response/ResponsePanel.vue`
- Concise summary, source badges, limitation blocks, expandable detail view
- Wiring through `useAppShellViewModel` and response panel bindings

### T4 — Secret-safe explainability boundaries

**Status:** Complete for current scope

Delivered:
- Explainability derives only structured categories/reasons, not raw secrets
- Bootstrap now recomputes explainability from redacted history snapshots so diagnostics stay aligned with Phase 19 safe projection output
- No new persistence path stores resolved secrets for explainability

### T5 — Focused tests

**Status:** Complete for targeted verification scope

Delivered:
- Frontend tests for replay limitation derivation and inline explainability rendering
- Rust tests for history repository explainability derivation
- Rust tests for bootstrap safe-projection explainability consistency

## Not Implemented In This Phase

These items are intentionally **not** complete yet and should not be over-claimed during ship:

- Full persisted resolved-execution explainability based on runtime compiled request artifacts
- Full result-artifact vs authored-input vs resolved-execution traceability across all history items
- MCP-specific explainability semantics beyond extension space
- A richer runtime-blocked or environment-mismatch taxonomy sourced from backend execution facts
- Product-wide regression verification beyond targeted frontend/Rust command coverage

## Ship Framing Recommendation

Phase 20 should be shipped and described as:

> An HTTP replay/history explainability baseline that adds structured source categories, replay limitation reasons, and inline diagnostics cards while preserving Phase 19 safe-default guarantees.

Phase 20 should **not** be described as:

> A complete execution provenance system or full resolved-execution diagnostics implementation.

## Recommendation

**Recommendation:** Ship-appropriate after scoped wording review.

Before shipping, keep the release summary aligned to these claims:
- HTTP history/replay baseline only
- structured explainability contract
- inline diagnostics cards
- safe-projection-aware replay limitations
- Rust/bootstrap support for explainability metadata
