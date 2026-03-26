## Context

The current response body experience is centered on `ResponsePanel` and `prepareResponseCodeView`. That pipeline already classifies HTML payloads and feeds them into the read-only code viewer, but users can only inspect markup as source text. The requested change is limited to the frontend response surface and does not require backend or transport changes.

The main constraints are:

- Preserve the existing response tabs and pretty-print workflow for all content types.
- Keep the preview aligned with the active response body so switching requests or re-sending requests does not leave stale content on screen.
- Avoid giving arbitrary HTML payloads direct access to the application shell or privileged runtime APIs.
- Continue using the i18n layer for any new labels or empty-state copy.

## Goals / Non-Goals

**Goals:**

- Let users preview HTML response bodies directly inside the response pane.
- Keep source inspection available so users can move between rendered output and markup.
- Limit the change to the response-body surface and existing response detection helpers.
- Add regression coverage for HTML preview eligibility and mode switching behavior.

**Non-Goals:**

- Building a full browser-debugging surface with navigation, devtools, or script inspection.
- Changing how requests are executed, stored, or downloaded.
- Providing preview rendering for non-HTML content types in this change.
- Executing arbitrary response scripts inside the main application context.

## Decisions

### 1. Preview eligibility will reuse the existing response language detection

`prepareResponseCodeView` already resolves the response body into `json`, `xml`, `html`, or `text`. The response panel should derive preview eligibility from that existing result instead of introducing a second HTML detector.

Why this decision:

- Keeps HTML detection rules in one place.
- Matches current behavior for content-type-based and payload-shape-based HTML recognition.
- Minimizes the risk of the code viewer and preview toggle disagreeing about whether a payload is HTML.

Alternative considered:

- Re-run HTML detection directly in `ResponsePanel`. Rejected because it duplicates parsing heuristics and increases drift risk.

### 2. HTML preview will be a body-local mode switch, not a new top-level response tab

The current primary response tabs separate major datasets: body, headers, cookies, and tests. HTML preview is a second way of viewing the response body, so it should live inside the body tab as a local switch between source and preview modes.

Why this decision:

- Preserves the existing top-level information architecture.
- Keeps preview scoped to the body payload users are already inspecting.
- Avoids expanding the main response tab strip for a feature that only applies to HTML bodies.

Alternative considered:

- Add a new top-level `Preview` tab. Rejected because it creates inconsistent tab behavior that only appears for one content type and splits body inspection across two primary tabs.

### 3. Preview rendering will use an isolated embedded document

The response panel should render HTML previews inside an embedded document, populated from the current response body and sandboxed away from the surrounding application UI. The preview should not replace the existing code viewer; it should be a separate mode in the same content region.

Why this decision:

- Gives users a rendered page view without leaving the workbench.
- Keeps untrusted markup visually and technically separated from the shell.
- Supports straightforward updates when the active response changes.

Alternative considered:

- Inject HTML directly into the Vue component tree with `v-html`. Rejected because it couples arbitrary response markup to the application DOM and makes style or event leakage much harder to control.

## Risks / Trade-offs

- [Some HTML pages depend on script execution or external assets] -> The first version should prioritize safe static preview behavior over full browser fidelity, and the UI can keep the source mode available when rendered output is incomplete.
- [Preview state can become stale when the active response changes] -> Tie preview content directly to the current response body and reset body-local view state when the active payload is no longer HTML.
- [Extra controls could clutter the response header] -> Show the preview toggle only inside the body view and only when the resolved language is HTML.
- [Localization drift for new labels] -> Add preview strings through the existing i18n structure and cover them in response-panel tests.

## Migration Plan

1. Add the body-local preview mode and isolated preview surface in the response panel.
2. Extend i18n messages and tests for preview mode labels and HTML/non-HTML behavior.
3. Verify HTML responses render in preview mode while JSON, XML, and plain text responses remain on the current source-only path.

Rollback strategy:

- Revert the response-panel preview controls and embedded preview surface while leaving the existing code-view path untouched.

## Open Questions

- None for proposal scope. Relative asset resolution and richer browser-style tooling remain out of scope unless a later change requires them.
