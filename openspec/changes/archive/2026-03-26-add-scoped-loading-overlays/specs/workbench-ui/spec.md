## ADDED Requirements

### Requirement: Async workbench actions show busy feedback on the affected region only
The system SHALL display a visible busy/loading overlay on the workbench region whose data or controls are temporarily invalidated by an async action, while avoiding a full-application blocker for operations that do not affect the entire app.

#### Scenario: Scoped action affects only one workbench region
- **WHEN** an async user action invalidates only a specific workbench region
- **THEN** the system shows a busy overlay on that region instead of blocking unrelated workbench regions

### Requirement: Workspace refresh actions lock the workspace region while loading
The system SHALL mask the workspace workbench region and prevent interaction inside it while switching workspaces or performing another action that reloads the current workspace state.

#### Scenario: User switches workspaces
- **WHEN** the user changes the active workspace and the app begins reloading workspace data
- **THEN** the system shows a workspace-scoped loading overlay and prevents interaction with the workspace region until the refreshed workspace state is ready

### Requirement: Request sending locks the active request builder region
The system SHALL mask the active request authoring region and prevent editing or repeated actions while a request is being sent.

#### Scenario: User sends the active request
- **WHEN** the user triggers a send action for the active request tab
- **THEN** the request builder region shows a loading overlay and does not allow request editing or repeated request actions until the send flow completes

#### Scenario: Request send finishes or fails
- **WHEN** the active request send flow completes successfully or returns an error
- **THEN** the request builder loading overlay is removed and the request authoring region becomes interactive again
