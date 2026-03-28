# history Specification

## Purpose
TBD - created by archiving change align-runtime-domain-model. Update Purpose after archive.
## Requirements
### Requirement: History is long-lived workspace data
The system SHALL persist request history as long-lived, manageable data owned by a workspace rather than as transient UI-only state.

#### Scenario: Workspace history remains available
- **WHEN** the user reopens a workspace after a restart
- **THEN** the system restores that workspace's persisted history entries

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

### Requirement: History stores preview content only
The system SHALL store preview response content in history rather than full large response bodies, and it MUST mark truncated previews when the stored content is incomplete.

#### Scenario: Large response recorded in history
- **WHEN** a request response exceeds the history preview limit
- **THEN** the system stores only preview content and marks the history item as truncated

### Requirement: History redacts header and auth sensitive data
The system SHALL redact header/auth-sensitive data in persisted history records, including authorization and cookie-like credentials.

#### Scenario: Sensitive header in executed request
- **WHEN** a request containing sensitive authorization or cookie data is recorded in history
- **THEN** the persisted history record stores redacted values instead of raw sensitive credentials

### Requirement: History reopens into replay drafts with stable identity
The system SHALL reopen a history item into a replay draft identified by that history item so repeated reopen actions for the same history entry remain predictable and do not collapse into the canonical saved request tab.

#### Scenario: User reopens the same history item twice
- **WHEN** the user reopens a history item that already has an open replay draft in the workbench
- **THEN** the system focuses the existing replay draft for that history item instead of opening an unbounded duplicate

#### Scenario: User reopens different history items from the same saved request
- **WHEN** the user reopens two different history items that both reference the same saved request id
- **THEN** the system opens or focuses separate replay drafts for those history items because each history snapshot is a distinct replay source

### Requirement: History preserves execution provenance for live and mock runs
The system SHALL persist whether each history entry came from a live-network execution or a request-local mock execution so users can interpret past results correctly.

#### Scenario: Live-network execution is recorded in history
- **WHEN** the user executes a request through the normal live-network path
- **THEN** the resulting history item is stored with live-network execution provenance

#### Scenario: Mock execution is recorded in history
- **WHEN** the user executes a request while request-local mock execution is enabled
- **THEN** the resulting history item is stored with mock execution provenance instead of being recorded as a live-network result

### Requirement: History replay preserves mock-capable request snapshots
The system SHALL keep the stored request snapshot authoritative for replay even when the original execution was mock-sourced.

#### Scenario: User reopens a mock-sourced history item
- **WHEN** the user reopens a history entry that was recorded from a request-local mock execution
- **THEN** the workbench restores the stored request snapshot without reclassifying that historical execution as a live-network result

#### Scenario: User compares live and mock history entries for the same request
- **WHEN** history contains both live-network and mock-sourced executions for the same originating request
- **THEN** the stored provenance remains distinguishable for each history entry instead of collapsing them into one undifferentiated execution type
