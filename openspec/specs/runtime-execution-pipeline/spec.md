# runtime-execution-pipeline Specification

## Purpose
Define the Rust-owned request execution pipeline, including request compilation, protocol dispatch, runtime-side assertion evaluation, and execution-artifact creation.
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

### Requirement: Stage gate automation verifies Runtime Authority before v0.2 progression
The project SHALL maintain automated tests that verify the Rust runtime owns request compilation and assertion evaluation, so that Runtime Authority gate status is machine-verifiable rather than relying on documentation claims alone.

#### Scenario: Gate A test confirms Rust compiles and asserts
- **WHEN** the stage gate test suite runs
- **THEN** tests confirm that request compilation and assertion evaluation execute inside the Rust runtime without frontend involvement

### Requirement: Stage gate automation verifies Mainline Loop before v0.2 progression
The project SHALL maintain an automated test that walks the complete bootstrap → tab edit → send → history entry → history restore path as a single verifiable flow, so that Mainline Loop gate status is machine-verifiable.

#### Scenario: Gate C test walks the full mainline loop
- **WHEN** the stage gate test suite runs
- **THEN** a single test bootstraps the workbench, edits a tab, sends a request, confirms a history entry appears, restores from history, and asserts the restored tab state matches the original request

### Requirement: Stage gate automation verifies Contract Parity before v0.2 progression
The project SHALL maintain automated tests that verify canonical request fields survive a send → history round-trip without loss, so that Contract Parity gate status is machine-verifiable.

#### Scenario: Gate B test confirms canonical fields survive round-trip
- **WHEN** the stage gate test suite runs
- **THEN** tests confirm that bodyContentType, formDataFields, binaryFileName, auth configuration, and test definitions present in a sent request are preserved in the resulting history entry
