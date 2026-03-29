## ADDED Requirements

### Requirement: Stage gate automation verifies Stage Discipline before v0.2 progression
The project SHALL maintain automated tests that verify future-stage capabilities remain non-active in the current release, so that Stage Discipline gate status is machine-verifiable rather than relying on documentation claims alone.

#### Scenario: Gate D Rust test confirms future seams remain reserved
- **WHEN** the stage gate test suite runs
- **THEN** Rust tests confirm that capability descriptors for OpenAPI import, execution hooks, tool packaging, and plugin manifests are not registered as active capabilities in the current runtime

#### Scenario: Gate D frontend test confirms bootstrap descriptors contain no active future-stage capabilities
- **WHEN** the stage gate test suite runs
- **THEN** frontend tests confirm that the capability descriptors exposed at bootstrap do not include any v0.3 or v0.4+ capabilities in an active state
