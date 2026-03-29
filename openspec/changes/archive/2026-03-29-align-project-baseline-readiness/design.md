## Context

ZenRequest already has a broad desktop baseline in place: multiple workspaces, collections and saved requests, environment management, request execution, history replay, import/export, curl import, request-local mocks, response HTML preview, and a Rust-owned runtime pipeline. The project also has passing frontend and Rust tests plus a successful production build.

The remaining uncertainty is not primarily about missing core desktop behavior. It is about inconsistent repository signals:

- README positioning still describes a storage model that no longer matches the implemented SQLite runtime.
- Multiple OpenSpec capability documents still carry placeholder purpose text from the archive workflow.
- Build output reports a large frontend bundle warning, but that is a release-readiness concern rather than proof of missing functionality.
- The non-Tauri mock adapter remains intentionally incomplete for live send and curl import, which matters only if browser-mode parity becomes an explicit product goal.

This change is cross-cutting because it touches project-facing documentation, OpenSpec artifacts, and release-readiness classification.

## Goals / Non-Goals

**Goals:**
- Create one canonical readiness framing for the current desktop baseline.
- Align project-facing documentation with the implemented runtime and persistence model.
- Separate documentation and polish gaps from true missing capabilities.
- Finalize stable OpenSpec archival metadata touched by the baseline review.

**Non-Goals:**
- Changing shipped desktop runtime behavior.
- Introducing new end-user capabilities.
- Implementing browser-mode parity for the mock adapter.
- Solving bundle optimization beyond documenting and tracking the gap.

## Decisions

### Decision: Model this as a new meta capability instead of rewriting existing product specs
The cleanup work is about repository truthfulness and baseline classification, not about changing request/workspace/runtime behavior. Creating `project-baseline-readiness` avoids forcing unrelated requirement edits into existing capability specs such as `workspaces`, `history`, or `runtime-execution-pipeline`.

Alternative considered:
- Modify existing capability specs directly.
Why not chosen:
- The current findings are largely cross-cutting and documentary. Editing multiple functional specs would create noise and imply behavior changes that are not actually happening.

### Decision: Treat documentation drift and readiness warnings as first-class tracked outputs
The audit found several items that matter for maintainers but do not mean the desktop product is missing core behavior. These need to be tracked explicitly so future reviews do not re-open the same ambiguity.

Alternative considered:
- Leave these concerns in ad hoc review notes only.
Why not chosen:
- Informal notes decay quickly and do not create a reusable baseline for future OpenSpec changes.

### Decision: Keep desktop scope explicit and classify non-Tauri limitations accordingly
The implemented runtime is clearly Tauri-first. The non-Tauri adapter is useful for tests and local component development, but its `send_request` and `import_curl_request` limitations should be recorded as scope-boundary gaps unless product scope expands.

Alternative considered:
- Treat non-Tauri adapter incompleteness as an immediate functional defect.
Why not chosen:
- That would overstate the current product scope and mix desktop-release concerns with future web-parity ambitions.

### Decision: Use the baseline pass to finalize placeholder OpenSpec metadata
Placeholder `Purpose` text in stable specs creates avoidable ambiguity during future reviews. The readiness pass should explicitly close those metadata gaps for capabilities already understood and archived.

Alternative considered:
- Defer metadata cleanup indefinitely.
Why not chosen:
- It keeps the repository looking less mature than the implementation actually is and weakens OpenSpec as the source of truth.

## Risks / Trade-offs

- [Risk] Repository documentation cleanup could be mistaken for a functional feature release. → Mitigation: keep the proposal, spec, and tasks explicit that this is a baseline-alignment change, not new runtime behavior.
- [Risk] A new meta capability may feel less concrete than user-facing feature specs. → Mitigation: constrain the capability to objective, testable repository behaviors such as canonical summaries, accurate runtime description, and classified readiness gaps.
- [Risk] Bundle-size warnings may remain unresolved after the alignment pass. → Mitigation: classify them as tracked readiness gaps unless a follow-up implementation change is approved.
- [Risk] Contributors may disagree on whether browser-mode adapter gaps are in scope. → Mitigation: record the current desktop-first scope explicitly and leave parity work to a separate proposal if needed.

## Migration Plan

1. Capture the baseline-readiness requirements in the new capability spec.
2. Update the repository-facing documents referenced by the readiness summary.
3. Finalize placeholder purpose text for stable specs included in the review scope.
4. Record remaining non-blocking readiness gaps in the baseline summary or linked notes.
5. Validate that future contributors can determine the implemented desktop baseline without re-running a full repository audit.

## Open Questions

- Should the canonical baseline summary live in `README.md`, a dedicated readiness document, or both?
- Should the bundle-size warning produce an immediate follow-up OpenSpec change, or remain a tracked gap until it blocks release goals?
- Does the team want to keep browser-mode adapter support strictly development-only, or elevate it into roadmap scope later?
