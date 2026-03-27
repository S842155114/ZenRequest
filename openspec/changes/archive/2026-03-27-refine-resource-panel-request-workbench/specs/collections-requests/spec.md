## MODIFIED Requirements

### Requirement: Saving a dirty draft updates the canonical request
The system SHALL treat saved request entities as canonical records distinct from replay, scratch, and detached drafts, and saving a dirty draft for a saved request MUST update the targeted canonical request entity without changing the lifecycle state of other open drafts.

#### Scenario: Dirty resource-tab save
- **WHEN** the user saves a dirty draft that is linked to an existing saved request
- **THEN** the system updates the canonical request record for that saved request and marks only the saved draft as persisted

#### Scenario: User saves a non-active dirty draft
- **WHEN** the user invokes save from a non-active request tab that is linked to a saved request
- **THEN** the system saves the canonical request targeted by that tab instead of redirecting the save to the currently active tab

## ADDED Requirements

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
