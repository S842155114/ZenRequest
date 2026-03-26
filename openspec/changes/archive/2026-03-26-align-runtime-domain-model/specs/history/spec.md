## ADDED Requirements

### Requirement: History is long-lived workspace data
The system SHALL persist request history as long-lived, manageable data owned by a workspace rather than as transient UI-only state.

#### Scenario: Workspace history remains available
- **WHEN** the user reopens a workspace after a restart
- **THEN** the system restores that workspace's persisted history entries

### Requirement: History uses mixed reference-plus-snapshot storage
Each history item SHALL store an execution-time request snapshot and MAY reference the originating saved request by request id when one exists.

#### Scenario: Execution from saved request
- **WHEN** the user executes a saved request
- **THEN** the resulting history item stores both a request snapshot and the originating request id

#### Scenario: Execution from unsaved draft
- **WHEN** the user executes an unsaved draft
- **THEN** the resulting history item stores a request snapshot without requiring a request id

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
