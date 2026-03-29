# workspace-sessions Specification

## Purpose
Define separately persisted workspace editing session state, including draft origin semantics, complete draft round-tripping, and active tab restoration.
## Requirements
### Requirement: Workspace session is separate from workspace business data
The system SHALL persist workspace session state separately from workspace business entities. Workspace session data MUST be limited to UI and editing state such as open tabs, active tab, active environment, tab ordering, and dirty drafts.

#### Scenario: Session persistence excludes business entities
- **WHEN** the system saves workspace session state
- **THEN** it persists tab and editing state without treating collections, environments, or history as session-owned data

### Requirement: Dirty drafts persist across restarts
The system SHALL persist dirty drafts across application restarts as part of the owning workspace's session.

#### Scenario: Restart restores dirty drafts
- **WHEN** the user restarts the application after editing unsaved request tabs
- **THEN** the system restores those dirty drafts in the workspace session

### Requirement: Multiple tabs may reference one saved request
The system SHALL allow the same saved request to be opened in multiple tabs, and each tab MUST maintain an independent dirty draft state.

#### Scenario: Same request in multiple tabs
- **WHEN** the user opens the same saved request in more than one tab
- **THEN** each tab preserves its own draft changes without overwriting the other tab's draft state

### Requirement: Workspace sessions preserve draft origin semantics
The system SHALL persist request tab draft origin semantics, including resource, replay, scratch, and detached identities, as part of the workspace session contract.

#### Scenario: Restart restores draft origin
- **WHEN** the user restarts the application with replay, scratch, or detached drafts open
- **THEN** the workspace session restores those drafts with their original origin semantics intact

### Requirement: Workspace sessions round-trip complete editable request drafts
The system SHALL persist enough request tab draft data to round-trip complete editable request semantics, including structured body metadata needed for continued editing after restore.

#### Scenario: Restart restores full editable request draft semantics
- **WHEN** the user restarts the application with a dirty request tab using structured body metadata
- **THEN** the workspace session restores the draft with the same editable request semantics instead of degrading it to a partial projection
