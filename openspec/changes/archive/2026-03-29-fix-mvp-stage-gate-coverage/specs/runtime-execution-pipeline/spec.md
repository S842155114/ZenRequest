## ADDED Requirements

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
