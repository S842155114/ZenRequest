## ADDED Requirements

### Requirement: Workbench shell shortcuts yield to local keyboard-owned surfaces
The frontend SHALL ensure workbench shell shortcuts yield to local editing, viewing, and embedded-preview surface ownership instead of overriding focused local interactions.

#### Scenario: Shell shortcuts yield to local workbench surfaces
- **WHEN** the user focuses a request editor, dialog field, readonly viewer, readonly result table, or embedded preview surface inside the workbench
- **THEN** shell-level keyboard actions do not override that local surface's selection, copy, deletion, confirmation, or escape behavior

#### Scenario: Shell shortcuts only execute from shell-owned focus
- **WHEN** focus is on sidebar chrome, tab-strip chrome, blank panel chrome, or another shell-owned workbench surface
- **THEN** workbench keyboard shortcuts may execute according to shell behavior
- **AND** the same shortcuts do not execute while focus remains inside a local keyboard-owned surface

#### Scenario: Local select-all does not leak into whole-page selection
- **WHEN** the user presses `Ctrl/Cmd+A` inside a workbench-local editing or selectable readonly surface
- **THEN** the workbench resolves that action against the current local surface instead of allowing page-wide content selection
