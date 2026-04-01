## MODIFIED Requirements

### Requirement: Canonical request definitions are the import target
The system SHALL treat saved request definitions as the canonical target for feature-grade imports such as curl and OpenAPI import instead of introducing separate imported-request storage models, and OpenAPI apply results MUST materialize into workspace collections and collection-owned saved requests without merging into pre-existing saved requests during MVP import.

#### Scenario: Feature import maps to saved request definitions
- **WHEN** a feature-grade import materializes requests into workspace-owned assets
- **THEN** the imported data is mapped into canonical request definitions owned by the workspace and collection model

#### Scenario: OpenAPI apply creates collection-owned saved requests
- **WHEN** the user applies an analyzed OpenAPI import into the active workspace
- **THEN** the resulting requests are created as canonical saved requests owned by workspace collections rather than as transient import-only records

#### Scenario: OpenAPI reapply does not overwrite an existing saved request
- **WHEN** the user reapplies an analyzed OpenAPI import whose request names overlap with existing saved requests
- **THEN** the system keeps existing saved requests intact and appends new canonical saved requests for the new import
