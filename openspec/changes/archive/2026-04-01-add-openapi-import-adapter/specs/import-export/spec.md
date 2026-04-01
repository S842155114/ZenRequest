## MODIFIED Requirements

### Requirement: Backup restore import/export remains distinct from feature-grade imports
The system SHALL keep backup restore import/export contracts separate from feature-grade import adapters such as curl and OpenAPI import.

#### Scenario: Restore import remains package-based
- **WHEN** the user imports a workspace or application backup package
- **THEN** the system applies restore semantics for versioned packages rather than feature-import mapping semantics

#### Scenario: Feature import does not require backup metadata
- **WHEN** the user performs a feature-grade import such as curl import or OpenAPI import
- **THEN** the system maps external request data through the canonical import adapter path without requiring workspace/application package structure
