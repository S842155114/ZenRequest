## 1. Keyboard Scope Contract

- [ ] 1.1 Add the new `keyboard-interaction-scope` spec and align the related `workbench-ui` and `response-html-preview` deltas with the approved scope model
- [ ] 1.2 Define one shared keyboard-scope detection utility that distinguishes native editing, widget-editing, selectable-readonly, embedded, and shell surfaces
- [ ] 1.3 Establish stable scope-root markers and IME-yield rules without introducing per-cell listeners or heavy global focus tracking

## 2. First-Wave Shortcut Behavior

- [ ] 2.1 Implement local-scope `Ctrl/Cmd+A` behavior for inputs, textareas, code editors, readonly code viewers, and focusable readonly tables while preventing whole-page selection leakage
- [ ] 2.2 Guard shell handling so copy, `Backspace/Delete`, `Enter/Ctrl/Cmd+Enter`, and `Escape` yield to local surface ownership before any shell action runs
- [ ] 2.3 Preserve browser-default `Ctrl/Cmd+F` behavior and ensure embedded HTML preview remains excluded from shell shortcut interception

## 3. Verification

- [ ] 3.1 Add keyboard interaction tests for dialog fields, sidebar search, request body editor, readonly response code viewer, readonly response tables, embedded HTML preview, and shell blank-area contexts
- [ ] 3.2 Add regression tests covering IME composition yield behavior and explicit protection against shell-level destructive actions firing from local scopes
- [ ] 3.3 Verify the implementation uses at most one global keyboard listener, constant-cost ancestry checks, and no per-row or per-cell keyboard listeners for readonly tables
