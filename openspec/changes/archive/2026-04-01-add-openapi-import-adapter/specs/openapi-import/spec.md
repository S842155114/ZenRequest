## ADDED Requirements

### Requirement: OpenAPI import accepts local OpenAPI 3.0 documents
The system SHALL support importing developer-provided local OpenAPI 3.0 documents in JSON and YAML form into the active workspace import flow.

#### Scenario: User selects a local JSON or YAML OpenAPI document
- **WHEN** the user starts OpenAPI import and provides a local `.json`, `.yaml`, or `.yml` OpenAPI 3.0 document
- **THEN** the system accepts that document as input for feature-grade import analysis without requiring workspace/application backup package metadata

#### Scenario: User provides an invalid OpenAPI source document
- **WHEN** the provided file cannot be parsed as an OpenAPI 3.0 document
- **THEN** the system rejects the import before apply and returns a fatal analysis error instead of creating partial workspace data

### Requirement: OpenAPI import uses a runtime-owned analysis path
The system SHALL analyze OpenAPI documents through the runtime-owned import adapter path and MUST NOT require workspace users to install or invoke a separate external CLI tool as part of the primary desktop import flow.

#### Scenario: User imports OpenAPI from the desktop workbench
- **WHEN** the user starts OpenAPI import from the workbench
- **THEN** the system completes the primary analysis flow through the runtime-owned adapter path exposed by the application

### Requirement: OpenAPI import analyzes documents before applying workspace changes
The system SHALL analyze an OpenAPI 3.0 document before mutating workspace state and MUST produce a versioned, workspace-bound import analysis snapshot that identifies candidate operations, grouping suggestions, and non-fatal import diagnostics.

#### Scenario: Analyze returns import candidates and diagnostics
- **WHEN** the user provides a valid OpenAPI 3.0 document
- **THEN** the system returns an analysis snapshot that includes the target `workspaceId`, candidate request imports, grouping guidance, and any warnings or skipped items detected during analysis

#### Scenario: Analyze classification is deterministic for the same document
- **WHEN** the same OpenAPI 3.0 document is analyzed multiple times under the same runtime version
- **THEN** the system returns the same fatal, warning, skipped, and candidate classification results for that document

#### Scenario: Apply requires explicit confirmation after analyze
- **WHEN** analyze completes without fatal diagnostics
- **THEN** the system exposes a summary that can be canceled or explicitly confirmed before apply mutates workspace state

#### Scenario: Fatal analysis blocks apply
- **WHEN** analyze returns one or more fatal diagnostics
- **THEN** the system does not permit apply from that analysis result

#### Scenario: Apply rejects mismatched workspace or unsupported snapshot versions
- **WHEN** apply is invoked with an analysis snapshot whose `workspaceId` or analysis version does not match the active apply request
- **THEN** the system rejects apply without creating or mutating workspace data

### Requirement: OpenAPI import supports a bounded reference-resolution contract
The system SHALL support only the in-document JSON Pointer reference subset (`#/...`) required for the current desktop import capability and MUST classify unsupported or unresolved references as fatal, warning, or skipped outcomes instead of silently ignoring them.

#### Scenario: Supported in-document references resolve during analysis
- **WHEN** an importable OpenAPI operation depends on `#/...` references within the same source document
- **THEN** the system resolves those references before producing import candidates

#### Scenario: File-system and remote references are reported explicitly
- **WHEN** an OpenAPI document contains file-system relative references or remote references
- **THEN** the system reports those references as unsupported diagnostics instead of trying to fetch or traverse them during MVP import

#### Scenario: Unsupported or unresolved references are reported explicitly
- **WHEN** an OpenAPI document contains in-document references that cannot be resolved
- **THEN** the system reports those references as fatal, warning, or skipped diagnostics instead of silently importing incomplete request definitions

### Requirement: OpenAPI import maps supported operations into canonical request definitions
The system SHALL map supported OpenAPI operations into the canonical request-definition model used by workspace collections and saved requests.

#### Scenario: Imported operation becomes a canonical saved request
- **WHEN** a supported OpenAPI operation is applied into the active workspace
- **THEN** the system materializes that operation as a canonical saved request owned by a workspace collection instead of storing it as a separate import-only artifact

#### Scenario: Imported operation preserves common request semantics
- **WHEN** a supported OpenAPI operation declares method, path, query parameters, headers, common auth, or request-body examples
- **THEN** the system maps those semantics into the canonical request model without silently discarding supported fields

### Requirement: OpenAPI import uses deterministic MVP mapping rules
The system SHALL use deterministic MVP mapping rules for server selection, variable substitution, request naming, auth mapping, and request-body example selection.

#### Scenario: Server and variable mapping is deterministic
- **WHEN** a supported OpenAPI operation is analyzed
- **THEN** the system chooses the first available server from operation-level, path-item-level, then document-level precedence, substitutes declared server defaults, and converts unresolved variables into request template placeholders with explicit warnings

#### Scenario: Request naming precedence is deterministic
- **WHEN** a supported OpenAPI operation provides multiple naming candidates
- **THEN** the system names the request using non-empty `summary`, otherwise `operationId`, otherwise `METHOD path`

#### Scenario: Auth mapping stays within the MVP support matrix
- **WHEN** a supported OpenAPI operation declares security requirements
- **THEN** the system maps `http bearer`, `http basic`, and `apiKey` (`header` or `query`) schemes into canonical auth fields and reports unsupported security schemes as warnings

#### Scenario: Request-body selection is deterministic
- **WHEN** a supported OpenAPI operation declares multiple request-body media types or examples
- **THEN** the system chooses media types and example values according to a deterministic MVP precedence instead of selecting them arbitrarily

#### Scenario: Analyze can be canceled without workspace mutation
- **WHEN** the user cancels after a successful analyze step
- **THEN** the system leaves workspace collections and saved requests unchanged

### Requirement: OpenAPI import groups imported requests into workspace collections
The system SHALL derive workspace collection grouping from analyzed document context and operation tags, and SHALL materialize imported OpenAPI requests as append-only canonical saved requests.

#### Scenario: Tagged operations are grouped into collections
- **WHEN** an imported OpenAPI operation includes one or more tags
- **THEN** the system groups that operation into a collection derived from the analyzed import context and the first tag in deterministic order

#### Scenario: Untagged operations fall back to an import collection
- **WHEN** an imported OpenAPI operation has no tags
- **THEN** the system assigns that operation to a deterministic fallback collection for the analyzed document instead of dropping it from the import solely because tags are absent

#### Scenario: Repeated apply stays append-only
- **WHEN** the user reapplies the same analyzed OpenAPI document into the same workspace
- **THEN** the system appends new saved requests instead of merging with or overwriting existing saved requests by name or inferred identity

### Requirement: OpenAPI import supports warning-aware partial apply
The system SHALL permit partial import of supported OpenAPI operations and MUST report imported, skipped, and warning outcomes after apply.

#### Scenario: Unsupported operations are skipped while supported ones import
- **WHEN** an OpenAPI document contains both supported and unsupported operations or fields
- **THEN** the system applies the supported request imports and reports the unsupported items as skipped or warning outcomes rather than failing the entire import by default

#### Scenario: Import result includes an outcome summary
- **WHEN** an OpenAPI apply operation completes
- **THEN** the system returns an import summary that reports imported request count, skipped operation count, and warning diagnostic count using stable counting rules
