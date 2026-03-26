## Why

The response pane currently treats HTML payloads as source text only, which makes it slow to verify page structure, styling, and rendered output when debugging web endpoints or mock pages. Adding a built-in preview closes that gap without forcing users to copy the payload into a browser or external tool.

## What Changes

- Detect when the active response body is HTML and expose an in-app preview mode in the response pane.
- Let users switch between the existing formatted source view and a rendered HTML preview without losing access to headers, cookies, tests, or download actions.
- Render the preview in an isolated surface so HTML responses can be inspected safely inside the desktop workbench.
- Keep non-HTML responses on the current code-viewing path with no preview affordance shown.

## Capabilities

### New Capabilities
- `response-html-preview`: Preview HTML response bodies directly in the response pane while preserving the existing raw/pretty inspection workflow.

### Modified Capabilities
- None.

## Impact

- Affects the response workbench UI, especially `ResponsePanel` and related response-view helpers.
- Requires localized copy updates for preview labels and empty-state or unsupported-state messaging if needed.
- Requires response-panel regression coverage for HTML detection, preview mode switching, and non-HTML fallback behavior.
