## MODIFIED Requirements

### Requirement: Frontend visual language aligns across primary and supporting surfaces
The system SHALL apply one consistent local-first developer-workbench visual hierarchy across the main workbench and supporting frontend surfaces so the product reads as a precise local API engineering tool instead of a generic productivity shell.

#### Scenario: User opens the workbench on desktop width
- **WHEN** the user opens the main workbench shell in a standard desktop-width window
- **THEN** the primary surfaces use a shared `Signal Light` visual language built from cool neutral materials, restrained orange action emphasis, teal runtime or automation signals, and consistent interaction feedback

#### Scenario: User opens a supporting UI surface
- **WHEN** the user opens a dialog, menu, sheet, dropdown, or context menu from the frontend shell
- **THEN** the surface uses the same workbench visual system, control hierarchy, and state language as the rest of the shell instead of appearing like an unrelated local style

### Requirement: Explorer surface supports dense request browsing
The system SHALL present the explorer surface as an activity-aware resource browser with clear hierarchy, active-state signaling, collection and request identity, and shared workbench activity signals so users can scan saved assets and current work-in-progress without losing context.

#### Scenario: User browses saved requests
- **WHEN** the user opens the explorer surface
- **THEN** the system shows collections, requests, history, search, workset summaries, and creation controls with visual treatment that emphasizes hierarchy, scanability, current selection, and current workbench activity instead of a flat list of generic controls

#### Scenario: User has open or dirty workbench items
- **WHEN** one or more saved requests are already open, unsaved, sending, or restored from history
- **THEN** the explorer surface projects those high-value states onto the relevant resource rows through compact state signals and row-level emphasis without forcing the user to enter the request pane to understand what is active

### Requirement: Request authoring controls remain visually primary
The system SHALL present the request authoring surface as the main command workspace with explicit request identity, request-local actions, and send readiness so users can understand what object they are editing before they trigger execution or save changes, without duplicating the same identity layer across adjacent header surfaces.

#### Scenario: Active request is being edited
- **WHEN** the user focuses on the active request tab
- **THEN** the request builder reads as the primary construction surface with visible request identity, save state, send readiness, and context chips while method selection, URL editing, send actions, and request detail tools remain the most visually actionable elements

#### Scenario: Expanded request pane shows active request identity
- **WHEN** the request pane is expanded and the active request tab is visible above the compose surface
- **THEN** the compose layout presents one dominant request-identity surface instead of repeating the same request title and identity content in both the panel header and the command bar

#### Scenario: User opens many request tabs while composing
- **WHEN** the expanded request pane contains multiple request tabs
- **THEN** the tab strip keeps each tab compact enough to preserve more visible tabs before overflow, using a dense single-line treatment instead of a metadata-heavy stacked card

#### Scenario: User accesses workspace-wide actions while editing a request
- **WHEN** the user is editing an active request
- **THEN** workspace-global actions such as import or export remain available through secondary controls without occupying the primary request-local command runway

### Requirement: Response inspection communicates lifecycle state explicitly
The system SHALL present the response inspection surface as a diagnostic view that distinguishes result state, transport metadata, and inspection modes through a stable local-workbench hierarchy with shared lifecycle pills and readout styling.

#### Scenario: User has not sent the active request yet
- **WHEN** the active request tab has no completed send result
- **THEN** the response inspection region shows an explicit idle state instead of presenting the pane as a successful response

#### Scenario: User sends a request while a previous result is visible
- **WHEN** the user triggers a send for the active request and the response region still contains the prior completed result
- **THEN** the response inspection region shows that a new response is pending and that any retained result content is stale until the new send completes

#### Scenario: Request send returns an error
- **WHEN** the active request send fails with an HTTP or transport error
- **THEN** the response inspection region presents an explicit error-oriented state while preserving access to the relevant response details that are available
