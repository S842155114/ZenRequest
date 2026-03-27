## MODIFIED Requirements

### Requirement: Request authoring controls remain visually primary
The system SHALL present the request authoring surface as the main command workspace with explicit request identity, request-local actions, and send readiness so users can understand what object they are editing before they trigger execution or save changes, without duplicating the same identity layer across adjacent header surfaces.

#### Scenario: Active request is being edited
- **WHEN** the user focuses on the active request tab
- **THEN** the request builder reads as the primary construction surface with visible request identity, save state, and send readiness while method selection, URL editing, send actions, and request detail tools remain the most visually actionable elements

#### Scenario: Expanded request pane shows active request identity
- **WHEN** the request pane is expanded and the active request tab is visible above the compose surface
- **THEN** the compose layout presents one dominant request-identity surface instead of repeating the same request title and identity content in both the panel header and the command bar

#### Scenario: User opens many request tabs while composing
- **WHEN** the expanded request pane contains multiple request tabs
- **THEN** the tab strip keeps each tab compact enough to preserve more visible tabs before overflow, using a dense single-line treatment instead of a metadata-heavy stacked card

#### Scenario: User accesses workspace-wide actions while editing a request
- **WHEN** the user is editing an active request
- **THEN** workspace-global actions such as import or export remain available without occupying the primary request-local command runway

## ADDED Requirements

### Requirement: Primary request sections expose consistent density cues
The system SHALL expose comparable count badges across primary request-compose sections so users can scan request density and configured scope without opening every section individually.

#### Scenario: User scans request section tabs
- **WHEN** the user views the primary request section tabs in the workbench
- **THEN** params, headers, body, auth, tests, and environment sections present count badges using rules appropriate to their content type instead of leaving some primary sections without comparable density cues

#### Scenario: Body and auth configuration changes
- **WHEN** the user changes body mode, payload content, enabled form-data fields, or auth type
- **THEN** the body and auth count badges update to reflect the effective configured scope for the active request

### Requirement: Row-level request state controls remain low-noise
The system SHALL present params, headers, form-data fields, and environment-variable enabled states through a quiet row-level control that remains operable without overpowering the editable request data around it.

#### Scenario: User scans editable request rows
- **WHEN** the user views request parameter, header, form-data, or environment-variable rows
- **THEN** each row shows an enabled-state control that communicates on/off status clearly without repeating a loud textual status badge in every row

#### Scenario: User disables a request row
- **WHEN** the user toggles a row into the disabled state
- **THEN** the control state and row styling both reflect that the row is inactive while preserving the ability to re-enable it directly from the same location

### Requirement: Request segmented controls show one active option at a time
The system SHALL render request-side segmented option groups through one consistent active-state treatment so only the selected body/auth option appears active.

#### Scenario: User changes request body mode
- **WHEN** the user switches between `json`, `formdata`, `raw`, and `binary`
- **THEN** only the currently selected body-mode option shows active elevation, border emphasis, or shadow, and previously active options return to the neutral state immediately

#### Scenario: User changes request auth mode
- **WHEN** the user switches between auth options such as `none`, `bearer`, `basic`, and `apiKey`
- **THEN** only the selected auth option shows active treatment, with no residual highlight left on the default option after selection changes

### Requirement: Expanded request tabs remain compact in dense workspaces
The system SHALL compress expanded-mode request tabs so they preserve quick tab switching in high-tab-count workflows without duplicating rich metadata already shown in the active request workbench.

#### Scenario: User scans the expanded request tab strip
- **WHEN** the user views request tabs in expanded mode
- **THEN** each tab emphasizes method, truncated request name, one compact lifecycle/status indicator, and the close action rather than rendering stacked collection/provenance/persistence badges inside every tab

#### Scenario: User relies on tab status while many tabs are open
- **WHEN** non-active request tabs have differing lifecycle states such as unsaved, running, success, or failure
- **THEN** each tab surfaces that state through one compact indicator that remains readable at the denser tab width
