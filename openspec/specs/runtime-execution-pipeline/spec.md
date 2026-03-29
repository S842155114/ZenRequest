# runtime-execution-pipeline Specification

## Purpose
TBD - created by archiving change align-local-api-workbench-architecture. Update Purpose after archive.
## Requirements
### Requirement: Runtime compiles executable requests from canonical request definitions
The system SHALL compile each executable request inside the Rust runtime from a canonical request definition, active environment context, and runtime-owned resolution rules instead of treating a frontend-precompiled final payload as the authoritative execution input.

#### Scenario: Runtime compiles a request before dispatch
- **WHEN** the user sends a request from the workbench
- **THEN** the runtime resolves templates, finalizes auth, normalizes the request body, and produces the authoritative compiled request before protocol dispatch

### Requirement: Runtime owns authoritative assertion evaluation
The system SHALL evaluate response assertions inside the runtime and return authoritative assertion results for the executed request.

#### Scenario: Runtime evaluates request assertions
- **WHEN** a request definition includes status, header, or body assertions
- **THEN** the runtime evaluates those assertions against the normalized response and returns the authoritative assertion result set

### Requirement: Runtime produces execution artifacts distinct from request definitions
The system SHALL generate an execution artifact for each completed execution that is distinct from the canonical request definition and can be projected into history without collapsing the two concepts.

#### Scenario: Execution produces an artifact
- **WHEN** a request execution completes
- **THEN** the runtime records an execution artifact containing execution provenance, normalized response data, and assertion results without redefining the saved request entity

### Requirement: Runtime dispatches through protocol drivers
The system SHALL route dispatch through a runtime-owned protocol driver interface so additional protocol implementations can attach without moving execution branching into the frontend.

#### Scenario: HTTP request dispatches through a protocol driver
- **WHEN** the user executes a standard HTTP request
- **THEN** the runtime dispatches that execution through the HTTP protocol driver rather than through frontend-specific protocol logic

