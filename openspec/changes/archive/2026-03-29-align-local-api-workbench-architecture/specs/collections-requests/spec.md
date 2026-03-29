## ADDED Requirements

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
