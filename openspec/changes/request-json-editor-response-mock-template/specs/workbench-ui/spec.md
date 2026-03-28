## MODIFIED Requirements

### Requirement: Request body mode selection maps to matching editing surfaces
The system SHALL present a request-body editing surface that matches the selected body mode instead of routing every body mode through one generic text editor.

#### Scenario: User selects a structured body mode
- **WHEN** the active request body mode is changed to `formdata` or `binary`
- **THEN** the request authoring region shows an editing surface that matches that mode rather than a generic text-area-only editor

#### Scenario: User selects a text body mode
- **WHEN** the active request body mode is `json` or `raw`
- **THEN** the request authoring region provides a code-editor surface appropriate for that mode instead of a plain textarea

#### Scenario: User formats a valid JSON request body
- **WHEN** the active request body mode is `json` and the current body contains valid JSON
- **THEN** the request authoring region allows the user to format the body into a normalized pretty-printed JSON structure without leaving JSON mode

#### Scenario: User switches between body modes after editing each one
- **WHEN** the user edits content in `json`, `formdata`, `raw`, or `binary` mode and then switches to a different body mode
- **THEN** the workbench preserves each body mode as its own isolated draft instead of auto-converting or overwriting the other body-mode drafts

#### Scenario: User sends a request while the active body mode is invalid
- **WHEN** the currently selected body mode has invalid content such as malformed JSON or incomplete form-data rows
- **THEN** the request does not send, and the validation feedback remains inside the active request-payload editing surface instead of being promoted as an unrelated top-level blocker from inactive body modes

## ADDED Requirements

### Requirement: Request workbench exposes request-local mock configuration
The system SHALL expose request-local mock-template controls inside the request workbench as a secondary configuration surface rather than moving response-template authoring into the response pane.

#### Scenario: User edits an existing request-local mock template
- **WHEN** the active request already has a stored mock template
- **THEN** the request workbench shows a `Mock` configuration surface where the user can edit enabled state, status, status text, headers, content type, and body for that template

#### Scenario: User reviews request-local mock scope
- **WHEN** the active request has no stored mock template
- **THEN** the request workbench does not misrepresent mock execution as active for that request

### Requirement: Response inspection can create request-local mock templates from completed responses
The system SHALL let users create a request-local mock template from the latest completed response without making the response pane itself the primary editing surface.

#### Scenario: Completed response can seed a mock template
- **WHEN** the active request has a completed response available in the response inspection pane
- **THEN** the response surface shows an affordance to create or refresh the current request-local mock template from that response

#### Scenario: No completed response is available
- **WHEN** the active request is idle or still waiting on a response
- **THEN** the response inspection pane does not present the create-mock-template affordance as if a completed response were available

### Requirement: Response inspection distinguishes mock-sourced results from live-network results
The system SHALL make mock-sourced execution results visually distinguishable from live-network results in the response inspection surface.

#### Scenario: User inspects a mock-sourced response
- **WHEN** the active response was produced from the request-local mock template
- **THEN** the response inspection pane shows an explicit mock-source indicator in addition to the existing lifecycle state information

#### Scenario: User inspects a live-network response
- **WHEN** the active response was produced by a live network request
- **THEN** the response inspection pane does not label that result as mock-sourced
