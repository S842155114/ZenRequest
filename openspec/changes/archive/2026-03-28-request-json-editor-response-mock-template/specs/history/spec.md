## ADDED Requirements

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
