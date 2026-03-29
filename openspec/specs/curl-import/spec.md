# curl-import Specification

## Purpose
Define curl-command import into editable workspace request drafts that map into the canonical request model without reusing backup-restore package contracts.
## Requirements
### Requirement: Curl import creates editable request drafts
The system SHALL support importing a developer-provided curl command into the active workspace as an editable request draft.

#### Scenario: User imports a curl command
- **WHEN** the user provides a valid curl command for import
- **THEN** the system creates an editable request draft in the active workspace instead of requiring the user to manually recreate the request

### Requirement: Curl import maps into the canonical request model
The system SHALL map curl-derived request semantics into the canonical request definition contract used by the runtime and persistence layers.

#### Scenario: Curl import preserves request semantics
- **WHEN** a curl command contains method, url, headers, auth-like values, or body data
- **THEN** the system maps those values into the canonical request model instead of storing them as a UI-only import artifact

### Requirement: Curl import remains distinct from backup restore import
Curl import SHALL be treated as a feature-grade import adapter and MUST NOT reuse backup package contracts intended for workspace or application restore.

#### Scenario: Curl import does not require backup package format
- **WHEN** the user imports a curl command
- **THEN** the system parses it through the curl import adapter without requiring workspace/application package metadata or restore semantics
