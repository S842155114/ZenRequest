## Context

ZenRequest already has the correct workbench model: a persistent header, explorer/sidebar, request authoring pane, and response inspection pane. The approved product direction does not require a navigation or runtime redesign; it requires a visual-system recalibration so the frontend reads as a local-first developer workbench rather than a generic SaaS console.

This change is cross-cutting because it touches shared tokens in `src/style.css` and the major workbench surfaces in `src/components/layout`, `src/components/request`, and `src/components/response`. The implementation must also preserve existing behavior and tests while updating visual hierarchy across both light and dark themes.

Constraints:

- Keep the current workbench layout and runtime behavior intact.
- Preserve the existing i18n-driven copy model.
- Minimize structural churn in Vue components; prefer targeted markup and class changes.
- Implement through GitFlow on a feature branch created from `develop`.

## Goals / Non-Goals

**Goals:**

- Establish a light `Signal Light` visual system with disciplined orange action accents and teal runtime/automation signals.
- Make the header behave as a context bar with secondary branding.
- Make the sidebar read as a denser explorer with explicit active-state signaling.
- Make the request workspace clearly primary and the response workspace clearly diagnostic.
- Keep light and dark themes aligned to the same visual language.

**Non-Goals:**

- Replacing the resizable workbench model.
- Changing request execution, response parsing, or workspace data flow.
- Introducing new navigation surfaces or product capabilities.
- Rewriting the request builder into different component boundaries unless a small local adjustment is required for styling hooks.

## Decisions

### Decision: Push the redesign through shared CSS tokens first

The redesign will start in `src/style.css` by updating neutral surfaces, accent allocation, and shared utility classes. Component templates will then consume those tokens through small class-level changes.

Rationale:

- The current workbench already relies on shared `--zr-*` variables and component classes.
- Updating tokens first keeps light/dark parity manageable and reduces duplicated styling logic.
- This produces a cleaner diff than scattering inline utility-only tweaks across every component.

Alternative considered:

- Restyle each Vue component independently with local utility classes. Rejected because it would fragment the visual system and make dark-theme parity harder to keep consistent.

### Decision: Keep branding secondary and context-first in the header

The header will move from a badge-led brand block to a wordmark-first context bar on desktop, with a compact fallback mark only in constrained layouts.

Rationale:

- The product positioning emphasizes control, workspace context, and immediacy over strong chrome branding.
- Current workspace and environment selection are operationally more important than a persistent brand badge.
- This matches the approved design direction without removing product identity entirely.

Alternative considered:

- Keep the existing `ZR` badge as the primary header anchor. Rejected because it overemphasizes branding and weakens the “context bar” behavior.

### Decision: Use explicit signal rails and shared state pills instead of many bespoke badges

The sidebar active state, request identity chips, and response lifecycle badges will converge on a shared signal language built from reusable classes and tighter semantics.

Rationale:

- The current UI already uses many badges, but they do not always read as one system.
- Shared classes such as explorer signal rails and status pills make the visual contract more consistent across surfaces.
- This keeps the UI calm while still making “active”, “success”, “pending”, and “error” legible.

Alternative considered:

- Increase color saturation or card elevation to make states stand out. Rejected because it creates visual noise and competes with the request workspace.

### Decision: Preserve existing component boundaries and test IDs wherever possible

The implementation will modify `AppHeader`, `AppSidebar`, `RequestPanel`, `RequestUrlBar`, `RequestParams`, and `ResponsePanel` in place rather than splitting or replacing them.

Rationale:

- Existing tests already validate these components directly.
- The approved change is visual and hierarchical, not architectural.
- Keeping boundaries stable lowers regression risk and makes OpenSpec tasks easier to execute incrementally.

Alternative considered:

- Refactor the request and response surfaces into new subcomponents as part of the redesign. Rejected because it expands scope and delays the actual UI calibration.

## Risks / Trade-offs

- [Shared token change ripples across supporting UI surfaces] → Mitigation: keep token edits disciplined, verify dialogs/menus/sheets visually, and rely on the existing shared class system instead of redefining all tokens.
- [Visual refresh may break brittle class-based tests] → Mitigation: add or update focused tests only where new structure or hooks are required, then run the full Vitest suite.
- [Header de-emphasis could make product identity feel too weak] → Mitigation: keep the `ZenRequest` wordmark on desktop and a compact fallback mark on constrained layouts.
- [Signal colors could become too loud in dark mode] → Mitigation: define dedicated dark-theme `--zr-signal-*` values instead of reusing light-theme intensities verbatim.

## Migration Plan

1. Land the OpenSpec proposal, design, spec delta, and tasks on `develop`.
2. Create `feature/local-api-workbench-ui-refresh` from `develop` in a dedicated worktree.
3. Implement the tasks incrementally with test validation after each major surface update.
4. Run full frontend tests and a production build.
5. Manually verify light/dark themes and target widths.
6. Open a PR from the feature branch back into `develop`.

Rollback strategy:

- Revert the feature branch or the merge commit if the visual refresh creates unacceptable regressions.
- Because this change does not alter persisted data or backend/runtime contracts, rollback is code-only.

## Open Questions

- None at proposal time. The product direction, visual blend, branding stance, and GitFlow delivery path have all been explicitly approved.
