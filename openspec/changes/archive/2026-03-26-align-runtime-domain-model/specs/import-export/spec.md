## ADDED Requirements

### Requirement: Workspace export is the default export scope
The system SHALL default export operations to single-workspace export and MUST also provide an option for full-application export.

#### Scenario: Default export
- **WHEN** the user starts an export without selecting a broader scope
- **THEN** the system exports only the current workspace data

#### Scenario: Full application export
- **WHEN** the user explicitly selects full-application export
- **THEN** the system exports all user workspaces and application-owned data included in the export contract

### Requirement: Export packages are versioned
The system SHALL version export packages so future runtime versions can interpret or migrate imported data safely.

#### Scenario: Export package generation
- **WHEN** the system creates an export package
- **THEN** the package includes a format version field

### Requirement: Import conflict handling is user-selectable
The system SHALL let the user choose how to resolve import conflicts by selecting `skip`, `rename`, or `overwrite`.

#### Scenario: Import conflict prompt
- **WHEN** imported data conflicts with existing destination data
- **THEN** the system prompts the user to choose `skip`, `rename`, or `overwrite`
