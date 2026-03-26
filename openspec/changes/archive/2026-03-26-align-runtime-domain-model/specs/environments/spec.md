## ADDED Requirements

### Requirement: Environments are workspace-scoped entities
The system SHALL model environments as workspace-scoped entities, and each environment MUST belong to exactly one workspace.

#### Scenario: Workspace environment isolation
- **WHEN** the user views environments for a workspace
- **THEN** the system shows only environments that belong to that workspace

### Requirement: Active environment is session state
The system SHALL persist the active environment selection as part of the owning workspace session rather than as global application state.

#### Scenario: Active environment restored per workspace
- **WHEN** the user returns to a workspace
- **THEN** the system restores that workspace's previously active environment selection

### Requirement: Environment deletion updates session state safely
Deleting an environment SHALL require explicit user confirmation, and confirmed deletion MUST update any affected workspace session to a valid fallback environment state.

#### Scenario: Delete active environment
- **WHEN** the user confirms deletion of the active environment
- **THEN** the system removes the environment and updates the workspace session to a valid fallback environment state
