## Why

ZenRequest now has multiple local interaction surfaces inside one workbench shell: native form fields, widget-owned code editors, readonly code viewers, ordinary readonly result tables, and embedded HTML preview. Without a keyboard scope policy, browser or WebView page-level behavior can leak into those local surfaces, as already seen with `Ctrl/Cmd+A` selecting the whole page instead of only the active local area.

This is not limited to select-all. The same ownership gap can affect copy, delete, confirm, and escape behavior, and the risk will grow as the app adds more readonly diagnostic surfaces such as logs, traces, or AI-assisted debugging panels.

## What Changes

- Add a keyboard interaction scope policy that distinguishes native editing surfaces, widget-owned editor/viewer surfaces, selectable readonly surfaces, embedded preview surfaces, and shell-owned surfaces.
- Define `Ctrl/Cmd+A` as a local-scope action for native inputs, code editors, code viewers, and focusable ordinary readonly tables so selection does not escalate to the entire page.
- Require shell-level keyboard shortcuts to yield whenever focus or event target belongs to a local editing, readonly viewing, or embedded preview scope.
- Keep `Ctrl/Cmd+F` owned by browser-default find behavior instead of adding application-level interception in this phase.
- Require `Backspace/Delete`, `Enter/Ctrl/Cmd+Enter`, and `Escape` to respect local scope ownership and IME composition state before any shell-level action may run.
- Add explicit performance constraints so scope resolution uses lightweight target ancestry checks and avoids per-cell listeners or heavy global focus-tracking state.

## Capabilities

### New Capabilities
- `keyboard-interaction-scope`: Defines keyboard ownership boundaries across editing, readonly viewing, embedded preview, and shell surfaces in the workbench.

### Modified Capabilities
- `workbench-ui`: The workbench shell must yield keyboard ownership to local editing and selectable-readonly surfaces instead of overriding them with shell-level behavior.
- `response-html-preview`: Embedded HTML preview must keep browser-native keyboard ownership and remain excluded from shell shortcut interception.

## Impact

- Affected specs:
  - `openspec/specs/keyboard-interaction-scope/spec.md` (new)
  - `openspec/specs/workbench-ui/spec.md`
  - `openspec/specs/response-html-preview/spec.md`
- Affected frontend systems:
  - global workbench keyboard entry points
  - dialog form surfaces
  - request compose editor surfaces
  - response code viewers and readonly result tables
  - embedded HTML preview handling
  - shared interaction-scope utilities adjacent to existing context-menu bypass logic
- Affected verification:
  - keyboard interaction tests for input, textarea, code editor, code viewer, readonly table, iframe preview, shell blank-area, and IME composition scenarios
- Affected performance constraints:
  - at most one global keyboard listener
  - constant-cost target ancestry checks
  - no per-row or per-cell keyboard listeners for readonly tables
