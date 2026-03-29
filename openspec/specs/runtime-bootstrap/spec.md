# runtime-bootstrap Specification

## Purpose
Define the typed runtime bootstrap payload used to hydrate settings, workspaces, active workspace data, session state, and capability awareness for the desktop workbench.
## Requirements
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

### Requirement: Bootstrap hydrates canonical runtime-owned request and session contracts
The system SHALL bootstrap frontend state from canonical runtime-owned resource and session contracts without requiring the frontend to reconstruct missing request or draft semantics after startup.

#### Scenario: Startup hydrates complete draft semantics
- **WHEN** the frontend receives bootstrap data for the active workspace
- **THEN** the response includes runtime-owned request and session semantics sufficient to restore saved requests and workspace session drafts without frontend-side semantic reconstruction

### Requirement: Bootstrap remains compatible with runtime-declared capability state
The system SHALL remain compatible with future runtime capability descriptors so the workbench can become capability-aware without reintroducing frontend-owned source-of-truth logic.

#### Scenario: Frontend becomes capability-aware through bootstrap-compatible contracts
- **WHEN** future runtime capability descriptors are introduced
- **THEN** the bootstrap contract can include or reference that capability state without collapsing resource and session boundaries
