## MODIFIED Requirements

### Requirement: History uses mixed reference-plus-snapshot storage
Each history item SHALL store an execution-time request snapshot and MAY reference the originating saved request by request id when one exists. When reopened in the workbench, the stored request snapshot SHALL remain the authoritative replay source, and the replayed work item MUST NOT be treated as the same object as the canonical saved request solely because they share a request id.

#### Scenario: Execution from saved request
- **WHEN** the user executes a saved request
- **THEN** the resulting history item stores both a request snapshot and the originating request id

#### Scenario: Execution from unsaved draft
- **WHEN** the user executes an unsaved draft
- **THEN** the resulting history item stores a request snapshot without requiring a request id

#### Scenario: User reopens history for a saved request
- **WHEN** the user reopens a history item that references an existing saved request
- **THEN** the workbench restores the history snapshot as a replay draft distinct from the canonical saved request tab

## ADDED Requirements

### Requirement: History reopens into replay drafts with stable identity
The system SHALL reopen a history item into a replay draft identified by that history item so repeated reopen actions for the same history entry remain predictable and do not collapse into the canonical saved request tab.

#### Scenario: User reopens the same history item twice
- **WHEN** the user reopens a history item that already has an open replay draft in the workbench
- **THEN** the system focuses the existing replay draft for that history item instead of opening an unbounded duplicate

#### Scenario: User reopens different history items from the same saved request
- **WHEN** the user reopens two different history items that both reference the same saved request id
- **THEN** the system opens or focuses separate replay drafts for those history items because each history snapshot is a distinct replay source
