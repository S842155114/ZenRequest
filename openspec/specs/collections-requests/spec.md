# collections-requests Specification

## Purpose
Define the canonical workspace-scoped collection and saved-request model, including ownership, canonical save behavior, deletion semantics, and structured request-body round-tripping.
## Requirements
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
The system SHALL treat saved request entities as canonical records distinct from replay, scratch, and detached drafts, and saving a dirty draft for a saved request MUST update the targeted canonical request entity without changing the lifecycle state of other open drafts.

#### Scenario: Dirty resource-tab save
- **WHEN** the user saves a dirty draft that is linked to an existing saved request
- **THEN** the system updates the canonical request record for that saved request and marks only the saved draft as persisted

#### Scenario: User saves a non-active dirty draft
- **WHEN** the user invokes save from a non-active request tab that is linked to a saved request
- **THEN** the system saves the canonical request targeted by that tab instead of redirecting the save to the currently active tab

### Requirement: Request deletion preserves history snapshots
Deleting a saved request SHALL require explicit user confirmation, and confirmed deletion MUST remove the canonical request entity without deleting existing history snapshots created from that request.

#### Scenario: Delete request with history
- **WHEN** the user confirms deletion of a saved request that has history entries
- **THEN** the system deletes the saved request and preserves history items created from earlier executions

### Requirement: Saved requests open through one canonical resource tab by default
The system SHALL treat each saved request as having one canonical resource tab in the workbench, and selecting the same saved request again MUST focus that tab unless the user explicitly chooses to open a separate draft.

#### Scenario: User selects an already-open saved request
- **WHEN** the user selects a saved request whose canonical resource tab is already open
- **THEN** the workbench focuses that canonical tab instead of silently opening a duplicate

#### Scenario: User intentionally creates another working copy
- **WHEN** the user chooses an explicit duplicate or open-as-draft action for a saved request
- **THEN** the workbench opens a separate draft tab while preserving the canonical resource tab semantics for ordinary selection

### Requirement: Deleting saved requests detaches open drafts instead of discarding them
The system SHALL preserve the contents of open tabs when their backing saved request or collection is deleted by converting those tabs into detached drafts that are no longer treated as canonical saved requests.

#### Scenario: User deletes a saved request with an open tab
- **WHEN** the user confirms deletion of a saved request that still has one or more open tabs
- **THEN** the system preserves each open tab's editable content and reclassifies it as a detached draft rather than closing it or discarding its contents

#### Scenario: User deletes a collection with open request tabs
- **WHEN** the user confirms deletion of a collection whose saved requests still have open tabs
- **THEN** the system preserves those tabs as detached drafts even though their canonical saved resources no longer exist

### Requirement: Canonical request definitions preserve full body semantics
The system SHALL preserve canonical request definition semantics for structured request bodies, including raw content type metadata, form-data fields, and binary file metadata, across editing, saving, loading, export, and import flows.

#### Scenario: Saved request round-trips a structured body
- **WHEN** the user saves and later reloads a request that uses raw body content type metadata, form-data fields, or binary metadata
- **THEN** the system restores the same canonical request-definition semantics without silently degrading those fields

### Requirement: Canonical request definitions are the import target
The system SHALL treat saved request definitions as the canonical target for feature-grade imports such as curl and future OpenAPI import instead of introducing separate imported-request storage models.

#### Scenario: Feature import maps to saved request definitions
- **WHEN** a feature-grade import creates or updates requests
- **THEN** the imported data is mapped into canonical request definitions owned by the workspace and collection model
