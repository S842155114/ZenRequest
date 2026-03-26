## ADDED Requirements

### Requirement: Bootstrap hydrates typed workspace runtime state
The system SHALL provide a typed bootstrap response that hydrates application settings, workspace list, active workspace identity, and the active workspace's collections, environments, history, and session state.

#### Scenario: App startup bootstrap
- **WHEN** the frontend boots the application runtime
- **THEN** the system returns typed bootstrap data sufficient to render the active workspace without relying on frontend-local source-of-truth persistence

### Requirement: Bootstrap keeps workspace and session boundaries explicit
The bootstrap contract SHALL keep workspace business data separate from workspace session data rather than returning a single undifferentiated snapshot blob.

#### Scenario: Bootstrap response structure
- **WHEN** bootstrap data is returned to the frontend
- **THEN** workspace entities and workspace session state are represented as separate typed structures
