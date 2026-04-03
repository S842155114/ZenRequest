## ADDED Requirements

### Requirement: Global keyboard handling yields to native editing surfaces
The frontend SHALL treat native editing controls as keyboard-owned local surfaces so browser-native selection, copy, paste, deletion, navigation, and composition behavior are not overridden by shell-level shortcuts.

#### Scenario: Input and textarea keep local selection semantics
- **WHEN** the focused target is an `input`, `textarea`, or `contenteditable` surface
- **THEN** `Ctrl/Cmd+A` only selects the current control content instead of selecting the entire page
- **AND** shell-level shortcuts do not override local copy, paste, delete, or navigation behavior

#### Scenario: Dialog forms keep local editing behavior
- **WHEN** the user is editing a dialog field or multiline dialog details surface
- **THEN** `Enter`, `Backspace/Delete`, `Escape`, and `Ctrl/Cmd+A` resolve according to the focused field semantics before any shell-level action is considered

### Requirement: Widget-owned editor surfaces keep local keyboard ownership
The frontend SHALL treat widget-owned editors and code viewers as local keyboard scopes even when they are not native text controls.

#### Scenario: Editable code surfaces keep local editing control
- **WHEN** focus is inside a request body code editor or another widget-owned editing surface
- **THEN** `Ctrl/Cmd+A`, copy, deletion, and newline behavior apply only to that editor surface
- **AND** shell-level keyboard actions do not preempt the editor-owned behavior

#### Scenario: Readonly code viewers keep local selection control
- **WHEN** focus is inside a readonly code viewer
- **THEN** `Ctrl/Cmd+A` and copy behavior operate on the current viewer content instead of escalating to page-wide selection

### Requirement: Selectable readonly result surfaces own local selection behavior
The frontend SHALL treat focusable readonly result surfaces, including ordinary tables and result grids, as selectable local scopes instead of falling back to whole-page keyboard behavior.

#### Scenario: Readonly tables support local select-all behavior
- **WHEN** focus is on a readonly table or result grid scope root
- **THEN** `Ctrl/Cmd+A` selects only the current table or result surface content
- **AND** the implementation does not require per-cell or per-row keyboard listeners to provide that behavior

#### Scenario: Readonly tables support local copy behavior
- **WHEN** focus is on a selectable readonly result surface
- **THEN** copy behavior resolves against the current local selection instead of a page-level selection outside that surface

### Requirement: Embedded preview surfaces preserve native embedded behavior
The frontend SHALL not override browser-native keyboard behavior for embedded preview surfaces such as iframe-based HTML preview.

#### Scenario: HTML preview frame keeps embedded keyboard behavior
- **WHEN** the user is interacting with an embedded HTML preview frame
- **THEN** shell-level keyboard shortcuts do not preempt iframe-owned browser behavior
- **AND** the outer workbench does not force page-level selection semantics into the embedded preview

### Requirement: Shell-level shortcuts only act from shell-owned focus
The frontend SHALL only allow shell-level keyboard actions when the current event target is not owned by a local editing, viewing, or embedded scope.

#### Scenario: Shell blank area may receive shell shortcuts
- **WHEN** focus is on a shell-owned surface such as blank workspace chrome, sidebar chrome, or other non-local-interaction layout surfaces
- **THEN** shell-level keyboard shortcuts may execute according to workbench behavior

#### Scenario: Destructive shell actions require explicit shell focus context
- **WHEN** the user presses `Backspace` or `Delete`
- **THEN** the frontend does not delete requests, tabs, collections, or history items while focus is owned by a local editing or readonly scope
- **AND** any shell-level destructive behavior requires explicit shell-owned resource focus rather than page-wide coarse focus

### Requirement: Browser-default find is preserved
The frontend SHALL not intercept `Ctrl/Cmd+F` for application-level find behavior in this phase.

#### Scenario: Browser find remains the active find behavior
- **WHEN** the user presses `Ctrl/Cmd+F`
- **THEN** the application does not override the browser-default find behavior with a shell-level or widget-level custom implementation

### Requirement: IME composition and scope resolution remain safe and lightweight
The frontend SHALL yield keyboard handling during input-method composition and SHALL resolve keyboard scope with lightweight target ancestry checks rather than a heavy focus-tracking graph.

#### Scenario: Composition state blocks shell shortcut takeover
- **WHEN** the user is in an IME composition session
- **THEN** shell-level `Enter`, `Ctrl/Cmd+Enter`, `Escape`, and other shortcut behaviors do not interrupt the composition-owned interaction

#### Scenario: Frequent focus churn does not require expensive scope tracking
- **WHEN** focus moves frequently between editors, tables, dialogs, preview surfaces, and shell chrome
- **THEN** keyboard scope resolution remains based on constant-cost target ancestry checks
- **AND** the system does not depend on per-element listeners or high-frequency globally reactive focus state to decide shortcut ownership
