## ADDED Requirements

### Requirement: Collections are stable entities
The system SHALL model each collection as a stable entity with its own id, and each collection MUST belong to exactly one workspace.

#### Scenario: Collection identity survives rename
- **WHEN** the user renames a collection
- **THEN** the collection keeps the same id and remains associated with the same workspace

### Requirement: Requests are stable entities owned by collections
The system SHALL model each saved request as a stable entity with its own id, and each saved request MUST belong to exactly one collection and one workspace.

#### Scenario: Saved request belongs to a collection
- **WHEN** the user saves a request into a collection
- **THEN** the system stores that request as a collection-owned entity with a stable id

### Requirement: Saving a dirty draft updates the canonical request
The system SHALL treat saved request entities as canonical records, and saving a dirty draft from a tab MUST update the corresponding canonical request entity.

#### Scenario: Dirty draft save
- **WHEN** the user saves a dirty draft for a saved request
- **THEN** the system updates the canonical request record while leaving other tabs to manage their own draft state

### Requirement: Request deletion preserves history snapshots
Deleting a saved request SHALL require explicit user confirmation, and confirmed deletion MUST remove the canonical request entity without deleting existing history snapshots created from that request.

#### Scenario: Delete request with history
- **WHEN** the user confirms deletion of a saved request that has history entries
- **THEN** the system deletes the saved request and preserves history items created from earlier executions
