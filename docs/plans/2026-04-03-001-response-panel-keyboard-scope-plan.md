---
title: fix: Response panel keyboard scope and focus behavior
type: feature
status: active
date: 2026-04-03
---

# fix: Response panel keyboard scope and focus behavior

## Overview

This plan implements a bounded keyboard-scope pass for the response panel so keyboard behavior follows focused response regions instead of leaking into whole-page browser selection. The work keeps scope local to the response panel and its child views, establishes a minimum keyboard-navigation surface, and leaves future application-level global shortcuts possible without requiring a full shortcut system redesign now.

## Problem Frame

ZenRequest's response panel currently behaves like a visually separate surface without a reliable keyboard interaction boundary. The most visible failure is `Ctrl/Cmd + A` selecting the entire page when the user expects to operate only on response content. That breaks desktop-workbench expectations and indicates that focus ownership is underspecified across the response panel's tabs, actions, source viewer, HTML preview, and metadata views.

The goal is not to redesign keyboard behavior for the whole app. The goal is to make the response panel a coherent keyboard region with local selection semantics, predictable focus movement, and explicit non-goals for views that should avoid page-wide side effects without pretending to be full editors.

## Requirements Trace

- R1. Apply a focus-first keyboard model inside the response panel.
- R2. Prevent response-panel keyboard interactions from falling through into whole-page selection.
- R3. Preserve room for future explicitly global application shortcuts.
- R4. Cover all response views: `Body`, `Headers`, `Cookies`, and `Tests`.
- R5. Support local select-all in `Body` source mode.
- R6. Keep `Body` preview mode on locally meaningful native behavior and suppress whole-page fallback.
- R7. Prevent whole-page select-all in `Headers`, `Cookies`, and `Tests` without requiring rich local selection semantics.
- R8. Make the response panel operable without a mouse.
- R9. Provide a predictable focus path across tabs, actions, and active content.
- R10. Keep keyboard behavior consistent with the active view.
- R11. Avoid focus traps.
- R12. Define behavior by primary modifier semantics, not platform-specific wording.
- R13. Limit this phase's navigation scope to bounded response-panel coverage.
- R14. Do not indiscriminately consume unknown primary-modifier shortcuts.

## Scope Boundaries

- No whole-application shortcut registry, command palette, or app-wide keyboard system in this phase.
- No keyboard-scope work for request editing, sidebar, dialogs, or other workbench regions.
- No requirement to add rich local select-all semantics to `Headers`, `Cookies`, or `Tests` beyond suppressing page-wide misbehavior.
- No app-shell state redesign unless a narrow prop or event extension is required for response-panel composition.

## Context & Research

### Relevant Code and Patterns

- [ResponsePanel.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponsePanel.vue) already owns response tabs, toolbar actions, body-mode switches, and conditional rendering for response subviews. This should remain the assembly root for response-panel keyboard scope.
- [ResponseCodeViewer.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponseCodeViewer.vue) is currently a thin wrapper over [CodeEditorSurface.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/code/CodeEditorSurface.vue). Source-mode selection behavior should be implemented by extending this seam rather than adding page-level listeners in the shell.
- [ResponseHtmlPreview.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponseHtmlPreview.vue) renders an iframe-backed preview. Preview-mode behavior needs an explicit local boundary because iframe/native selection semantics differ from the source viewer.
- [ResponsePanel.test.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponsePanel.test.ts) already covers tab switching, source/preview mode switching, and response-state rendering. It is the primary unit-test anchor for response-panel behavior changes.
- [WorkbenchShell.vue](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/components/WorkbenchShell.vue) embeds the response panel as a leaf workbench segment. There is no current sign that keyboard scope needs to be lifted to app-shell orchestration.
- [src/features/app-shell/types.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/features/app-shell/types.ts) shows that `ResponsePanel` currently receives only display bindings plus two emitted actions. If new keyboard props are needed, they should stay narrow and view-facing.

### Planning Decisions

- Keep keyboard-scope ownership local to response components rather than introducing a new global shortcut manager.
- Treat source, preview, and metadata/test views as different interaction surfaces with different selection semantics.
- Prefer native focusable elements and component-local keyboard handling over document-level event interception whenever possible.
- Test behavior at the response-panel boundary first, then add lower-level tests only where component-level behavior depends on new child-component contracts.

## Technical Approach

1. Introduce a small response-panel keyboard-scope model that identifies which response subregion is active and what local keyboard behavior is valid there.
2. Make the response panel's interactive regions explicitly keyboard-reachable: tabs, toolbar actions, body-mode toggles, and active content surface.
3. Extend the source-viewer path so read-only code content can support local select-all and expose a stable focus target.
4. Add an explicit focus/keyboard boundary for HTML preview so modifier-based selection shortcuts either stay within the preview's meaningful native behavior or resolve to a no-op instead of whole-page selection.
5. Add bounded handling for metadata/test views so focused non-editable content regions suppress page-wide select-all without pretending to support rich editor semantics.
6. Verify the keyboard path end to end with response-panel tests and focused child-component tests.

## Implementation Units

- [ ] **Unit 1: Define response-panel keyboard regions and focus path**

**Goal:** Make the response panel's major interactive regions explicitly focusable and internally consistent so keyboard behavior has a stable local boundary.

**Requirements:** R1, R4, R8, R9, R10, R11, R13

**Dependencies:** None

**Files:**
- Modify: `src/components/response/ResponsePanel.vue`
- Modify: `src/components/response/ResponsePanel.test.ts`
- Optional test create: `src/components/response/ResponsePanel.keyboard.test.ts`

**Approach:**
- Identify the panel's keyboard regions: response tabs, panel actions, body-mode toggles, source/preview content, and non-body content surface.
- Add explicit focus affordances and predictable focus targets where the current markup relies only on visual grouping.
- Keep region ownership inside `ResponsePanel.vue` instead of routing keyboard state through app-shell.

**Patterns to follow:**
- Existing component-local state ownership in `ResponsePanel.vue`
- Existing focus-visible styling conventions already present in shared UI primitives and `src/style.css`

**Test scenarios:**
- Happy path: keyboard users can reach response tabs, response actions, and the active content region in a predictable order.
- Edge case: collapsed and idle/pending states do not create dead-end or trapped focus paths.
- Edge case: switching between response tabs preserves a sensible focused region or fallback target.

- [ ] **Unit 2: Add local select-all behavior for source mode and prevent page-wide fallback**

**Goal:** Make `Body` source mode behave like a local read-only editor surface where primary-modifier plus `A` selects response content instead of the whole page.

**Requirements:** R1, R2, R5, R12

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/code/CodeEditorSurface.vue`
- Modify: `src/components/response/ResponseCodeViewer.vue`
- Modify: `src/components/response/ResponsePanel.vue`
- Modify: `src/components/response/ResponsePanel.test.ts`
- Test: `src/components/code/CodeEditorSurface.test.ts`

**Approach:**
- Extend the read-only code viewer seam so the source surface exposes a stable focus target and local select-all semantics.
- Keep selection behavior owned by the code-viewer path rather than by a document-level fallback listener.
- Ensure the response panel recognizes the source viewer as a valid local keyboard region.

**Patterns to follow:**
- Codemirror setup and prop-driven state rebuilds in `CodeEditorSurface.vue`
- `ResponseCodeViewer.vue` as a thin adapter rather than a second orchestration layer

**Test scenarios:**
- Happy path: primary-modifier plus `A` in source mode selects source content rather than page content.
- Edge case: read-only mode still allows local selection behavior without exposing editing behavior.
- Regression: source/preview mode switching keeps source mode behavior intact when switching back from preview.

- [ ] **Unit 3: Bound preview and non-body views to local keyboard semantics**

**Goal:** Prevent HTML preview, headers, cookies, and tests from leaking modifier-based selection into whole-page behavior while keeping their semantics appropriately lightweight.

**Requirements:** R2, R4, R6, R7, R10, R14

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/response/ResponseHtmlPreview.vue`
- Modify: `src/components/response/ResponsePanel.vue`
- Modify: `src/components/response/ResponsePanel.test.ts`
- Optional test create: `src/components/response/ResponseHtmlPreview.test.ts`

**Approach:**
- Give preview mode an explicit focus boundary and locally scoped keyboard policy.
- Preserve meaningful native preview behavior when it exists, but suppress escalation to whole-page select-all when it does not.
- Treat `Headers`, `Cookies`, and `Tests` as non-editor surfaces: focused local region, no page-wide select-all, no requirement for rich local selection.

**Patterns to follow:**
- Response subview switching already centralized in `ResponsePanel.vue`
- Existing iframe-backed preview boundary in `ResponseHtmlPreview.vue`

**Test scenarios:**
- Happy path: preview mode does not trigger whole-page select-all when focused.
- Happy path: non-body tabs do not trigger whole-page select-all when their content region is focused.
- Edge case: empty headers/cookies/tests states still provide a valid local focus target or intentionally skip local handling without page-wide side effects.
- Regression: preview frame rendering and source/preview toggle behavior remain unchanged apart from keyboard scope.

- [ ] **Unit 4: Preserve explicit global-shortcut headroom and verify bounded navigation coverage**

**Goal:** Ensure response-panel keyboard handling stays bounded, does not swallow unknown modifier shortcuts indiscriminately, and covers the minimum navigation surface promised by the requirements.

**Requirements:** R3, R8, R9, R11, R13, R14

**Dependencies:** Units 1-3

**Files:**
- Modify: `src/components/response/ResponsePanel.vue`
- Modify: `src/components/response/ResponsePanel.test.ts`
- Optional modify: `src/features/app-shell/components/WorkbenchShell.vue`
- Optional modify: `src/features/app-shell/types.ts`

**Approach:**
- Audit any response-panel-level key handling so it only claims shortcuts with explicit local meaning.
- Keep future global-command precedence as a behavioral constraint, not as a new registry or app-wide abstraction.
- Only touch app-shell wiring if the response panel needs one narrow integration seam for focus entry or composition.

**Patterns to follow:**
- Existing leaf-component composition where `WorkbenchShell.vue` embeds `ResponsePanel` without owning its internal interaction state
- Narrow prop/event contracts in `src/features/app-shell/types.ts`

**Test scenarios:**
- Happy path: unknown primary-modifier combinations are not broadly consumed by response-panel handlers.
- Happy path: response-panel keyboard handling remains local to the panel and does not require app-shell orchestration to function.
- Regression: existing response panel actions like copy, download, create-mock-template, and collapse toggle still work.

## Test Strategy

### Unit Tests

- [src/components/response/ResponsePanel.test.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponsePanel.test.ts)
  Add coverage for focus order, active content focus targeting, per-view `Ctrl/Cmd + A` behavior boundaries, and bounded modifier-key handling.
- [src/components/code/CodeEditorSurface.test.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/code/CodeEditorSurface.test.ts)
  Add coverage for read-only source-mode focusability and local select-all behavior.
- [src/components/response/ResponseHtmlPreview.test.ts](/media/qiang/DataDisk/D/MyProject/ZenRequest/src/components/response/ResponseHtmlPreview.test.ts) if needed
  Add coverage for preview focus boundary and no whole-page fallback behavior.

### Verification Scenarios

- Source mode: focus the response body source viewer, use primary-modifier plus `A`, confirm only response source content is targeted.
- Preview mode: focus preview, confirm primary-modifier plus `A` does not escalate into page-wide selection.
- Headers/Cookies/Tests: focus each non-body content surface and confirm primary-modifier plus `A` does not select the whole page.
- Keyboard reachability: navigate tabs, response actions, body-mode toggles, and active content using `Tab` and `Shift+Tab`.
- Focus safety: users can leave the response panel using standard keyboard movement and are not trapped.
- Regression: copy/download/create-mock-template and current tab switching still behave as before.

## Risks and Mitigations

- Risk: keyboard handling drifts into a panel-wide hotkey system.
  Mitigation: keep handling scoped to explicit local meanings and avoid creating an app-wide registry in this phase.
- Risk: Codemirror read-only behavior and iframe preview behavior diverge in ways that make a single abstraction misleading.
  Mitigation: keep source and preview behavior split at the component boundary and test them independently.
- Risk: accessibility changes add focus targets but create awkward keyboard order.
  Mitigation: define and test the minimum response-panel focus path before adding any extra shortcuts.

## Sequencing

1. Establish panel regions and focus path in `ResponsePanel.vue`.
2. Add source-mode local select-all behavior through `ResponseCodeViewer` and `CodeEditorSurface`.
3. Add preview and non-body bounded behavior.
4. Tighten unknown-modifier handling and verify no app-shell escalation is needed.
5. Run focused response-panel and editor tests, then broader frontend verification if touched behavior spills into workbench composition.

## Next Steps

→ /prompts:ce-work docs/plans/2026-04-03-001-response-panel-keyboard-scope-plan.md
