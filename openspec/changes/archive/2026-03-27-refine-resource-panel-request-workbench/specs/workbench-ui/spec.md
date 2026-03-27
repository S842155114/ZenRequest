## MODIFIED Requirements

### Requirement: Explorer surface supports dense request browsing
The system SHALL present the explorer surface as an activity-aware resource browser with clear hierarchy, active-state emphasis, collection/request identity, and shared workbench activity signals so users can scan saved assets and current work-in-progress without losing context.

#### Scenario: User browses saved requests
- **WHEN** the user opens the explorer surface
- **THEN** the system shows collections, requests, history, search, and creation controls with visual treatment that emphasizes hierarchy, scanability, current selection, and current workbench activity instead of a flat list of generic controls

#### Scenario: User has open or dirty workbench items
- **WHEN** one or more saved requests are already open, unsaved, sending, or restored from history
- **THEN** the explorer surface projects those high-value states onto the relevant resource rows without forcing the user to enter the request pane to understand what is active

### Requirement: Request authoring controls remain visually primary
The system SHALL present the request authoring surface as the main command workspace with explicit request identity, request-local actions, and send readiness so users can understand what object they are editing before they trigger execution or save changes.

#### Scenario: Active request is being edited
- **WHEN** the user focuses on the active request tab
- **THEN** the request builder reads as the primary construction surface with visible request identity, save state, and send readiness while method selection, URL editing, send actions, and request detail tools remain the most visually actionable elements

#### Scenario: User accesses workspace-wide actions while editing a request
- **WHEN** the user is editing an active request
- **THEN** workspace-global actions such as import or export remain available without occupying the primary request-local command runway

## ADDED Requirements

### Requirement: Resource browsing and request tabs share lifecycle state language
The system SHALL express workbench lifecycle signals through one shared vocabulary across sidebar rows, request tabs, and request context surfaces so users can correlate open, active, unsaved, sending, failed, and recovered work states without interpreting each surface differently.

#### Scenario: User edits a saved request with one open canonical tab
- **WHEN** the user opens a saved request, edits it, and keeps it as the current active tab
- **THEN** the sidebar row, request tab, and request context surfaces all identify that object consistently as the active saved request with unsaved changes

#### Scenario: User views a dirty canonical resource tab
- **WHEN** the user is editing the canonical tab for a saved request and the tab has unsaved changes
- **THEN** the workbench presents the tab as a resource-origin draft and MUST NOT reuse the same "saved" label for both provenance and persistence state

#### Scenario: User restores a request from history
- **WHEN** the user reopens a history item into the workbench
- **THEN** the sidebar, request tab, and request context surfaces identify it consistently as a recovered work item distinct from the canonical saved request

### Requirement: Request workbench communicates send readiness before execution
The system SHALL present request-local send blockers and advisories within the request workbench before execution so users can determine whether the current request is ready without waiting for response-side error feedback.

#### Scenario: User has a blocking request issue
- **WHEN** the active request contains a blocking issue such as an empty URL, unresolved required variables, invalid JSON, or missing binary payload
- **THEN** the request workbench surfaces that issue before send and does not require the user to infer readiness from a later response failure

#### Scenario: User has a non-blocking request advisory
- **WHEN** the active request has advisories such as unsaved changes but is otherwise runnable
- **THEN** the request workbench indicates the advisory while preserving the ability to send the request

### Requirement: Dirty request tabs require an explicit close decision
The system SHALL require an explicit save-or-discard decision before closing a request tab that contains unsaved work so users do not lose in-progress edits by triggering a generic tab close action.

#### Scenario: User attempts to close a dirty request tab
- **WHEN** the user closes a request tab whose work is unsaved or detached from a saved resource
- **THEN** the system keeps the tab open and presents actions to save before closing, discard changes, or cancel the close action

#### Scenario: User saves from the dirty-close confirmation
- **WHEN** the user chooses to save from the dirty-close confirmation and completes the save flow successfully
- **THEN** the system persists the request and closes the original tab after the save completes
