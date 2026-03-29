# import-export Specification

## Purpose
TBD - created by archiving change align-runtime-domain-model. Update Purpose after archive.
## Requirements
### Requirement: Workspace export is the default export scope
The system SHALL default export operations to single-workspace export and MUST also provide an explicit full-application export option.

#### Scenario: Default workspace export
- **WHEN** the user starts an export without selecting a broader scope
- **THEN** the system exports only the current workspace data

#### Scenario: Full application export
- **WHEN** the user explicitly selects full-application export
- **THEN** the system exports all persisted user workspaces and application-owned data included in the export contract

### Requirement: Export packages are versioned
The system SHALL version export packages so future runtime versions can interpret or migrate imported data safely.

#### Scenario: Export package generation
- **WHEN** the system creates an export package
- **THEN** the package includes a format version field

### Requirement: Import conflict handling is user-selectable
The system SHALL let the user choose how to resolve import conflicts by selecting `skip`, `rename`, or `overwrite`, and the chosen strategy MUST apply consistently to each conflicting imported workspace.

#### Scenario: Workspace import conflict prompt
- **WHEN** imported workspace data conflicts with an existing destination workspace
- **THEN** the system prompts the user to choose `skip`, `rename`, or `overwrite`

#### Scenario: Application import with mixed conflicts
- **WHEN** an application import contains multiple workspaces and only some names conflict with existing local workspaces
- **THEN** the system applies the selected strategy independently to each conflicting imported workspace

### Requirement: Export packages declare their scope
The system SHALL include an explicit package scope field in export packages so the runtime can validate whether a file contains one workspace or a full application export.

#### Scenario: Workspace export package generated
- **WHEN** the system creates a workspace-scoped export
- **THEN** the package declares that its scope is `workspace`

#### Scenario: Application export package generated
- **WHEN** the system creates a full-application export
- **THEN** the package declares that its scope is `application`

### Requirement: Import scope is derived from the package
The system SHALL determine import scope from the package contents and MUST NOT require the user to declare whether an import file is workspace-scoped or application-scoped before parsing it.

#### Scenario: Import workspace-scoped package
- **WHEN** the user imports a package whose declared scope is `workspace`
- **THEN** the system restores only the workspace data contained in that package

#### Scenario: Import application-scoped package
- **WHEN** the user imports a package whose declared scope is `application`
- **THEN** the system restores the application-owned data and every workspace contained in that package

### Requirement: Full application packages include restorable app state
The system SHALL include persisted application settings, exported active workspace identity, and all persisted workspaces in a full-application export package, and a successful full-application import SHALL restore that application state subject to conflict resolution.

#### Scenario: Full application backup generated
- **WHEN** the user exports the full application
- **THEN** the resulting package includes application settings, exported active workspace identity, and every persisted workspace owned by the local runtime

#### Scenario: Full application restore completes
- **WHEN** the user imports a valid full-application package
- **THEN** the system restores the package settings and imported workspaces and activates the imported active workspace when it survives conflict resolution

### Requirement: Workspace export packages remain importable
The system SHALL continue importing existing workspace-scoped export packages after full-application export/import support is added.

#### Scenario: Import legacy workspace package after application backup feature ships
- **WHEN** the user imports a previously generated workspace export package
- **THEN** the system accepts the file and restores it as a workspace-scoped import without requiring manual migration

### Requirement: Backup restore import/export remains distinct from feature-grade imports
The system SHALL keep backup restore import/export contracts separate from feature-grade import adapters such as curl and future OpenAPI import.

#### Scenario: Restore import remains package-based
- **WHEN** the user imports a workspace or application backup package
- **THEN** the system applies restore semantics for versioned packages rather than feature-import mapping semantics

#### Scenario: Feature import does not require backup metadata
- **WHEN** the user performs a feature-grade import such as curl import
- **THEN** the system maps external request data through the canonical import adapter path without requiring workspace/application package structure

