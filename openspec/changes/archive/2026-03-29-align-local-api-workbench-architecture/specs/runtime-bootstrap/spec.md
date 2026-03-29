## ADDED Requirements

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
