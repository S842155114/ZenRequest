## ADDED Requirements

### Requirement: Request body mode selection maps to matching editing surfaces
The system SHALL present a request-body editing surface that matches the selected body mode instead of routing every body mode through one generic text editor.

#### Scenario: User selects a structured body mode
- **WHEN** the active request body mode is changed to `formdata` or `binary`
- **THEN** the request authoring region shows an editing surface that matches that mode rather than a generic text-area-only editor

#### Scenario: User selects a text body mode
- **WHEN** the active request body mode is `json` or `raw`
- **THEN** the request authoring region provides a text-oriented editing surface appropriate for that mode

### Requirement: Response inspection communicates lifecycle state explicitly
The system SHALL distinguish idle, pending, completed, and failed response states in the response inspection region so users can interpret the current result without inferring state from stale content.

#### Scenario: User has not sent the active request yet
- **WHEN** the active request tab has no completed send result
- **THEN** the response inspection region shows an explicit idle state instead of presenting the pane as a successful response

#### Scenario: User sends a request while a previous result is visible
- **WHEN** the user triggers a send for the active request and the response region still contains the prior completed result
- **THEN** the response inspection region shows that a new response is pending and that any retained result content is stale until the new send completes

#### Scenario: Request send returns an error
- **WHEN** the active request send fails with an HTTP or transport error
- **THEN** the response inspection region presents an explicit error-oriented state while preserving access to the relevant response details that are available

### Requirement: Request and response pane collapse behaves as a layout state
The system SHALL treat request-pane and response-pane collapse as layout states with compact summaries and predictable restore behavior, not only as local content toggles.

#### Scenario: User collapses the request pane
- **WHEN** the user collapses the request pane
- **THEN** the workbench shows a compact request summary and reallocates layout space in a predictable way for the remaining visible pane

#### Scenario: User re-expands a collapsed pane
- **WHEN** the user restores a previously collapsed request or response pane
- **THEN** the workbench restores that pane to a predictable usable size instead of leaving it at an arbitrary compressed size

### Requirement: Constrained-width workbench preserves main task continuity across pane states
The system SHALL preserve access to both request authoring and response inspection across supported constrained-width layouts, including when one pane is collapsed and later restored.

#### Scenario: User works in a constrained-width layout
- **WHEN** the workbench is displayed below the desktop threshold
- **THEN** the user can still access both request authoring and response inspection without losing the active editing or response context

#### Scenario: User changes pane state on a constrained width
- **WHEN** the user collapses or restores the request or response pane in a constrained-width layout
- **THEN** the workbench preserves the active request and latest response context instead of resetting the task flow
