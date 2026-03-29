## ADDED Requirements

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
