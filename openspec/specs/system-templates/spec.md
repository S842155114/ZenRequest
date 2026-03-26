# system-templates Specification

## Purpose
TBD - created by archiving change align-runtime-domain-model. Update Purpose after archive.
## Requirements
### Requirement: System templates are read-only seed sources
The system SHALL treat system templates as read-only seed sources and MUST NOT treat them as ordinary user-owned runtime data.

#### Scenario: Viewing available templates
- **WHEN** the system presents available templates
- **THEN** it exposes them as read-only sources rather than editable user workspaces

### Requirement: Template copy detaches from source
Copying a system template into a workspace SHALL create a fully detached workspace copy that no longer depends on the template source.

#### Scenario: Template-based workspace diverges
- **WHEN** the user edits a workspace created from a system template
- **THEN** those edits affect only the copied workspace and not the original template

