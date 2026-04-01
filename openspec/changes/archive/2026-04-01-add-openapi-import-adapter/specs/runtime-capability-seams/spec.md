## MODIFIED Requirements

### Requirement: Stage gate automation verifies Stage Discipline before v0.2 progression
The project SHALL maintain automated tests that verify only unimplemented future-stage capabilities remain non-active in the current release, so that Stage Discipline gate status is machine-verifiable rather than relying on documentation claims alone.

#### Scenario: Gate D Rust test confirms only future seams remain reserved
- **WHEN** the stage gate test suite runs
- **THEN** Rust tests confirm that execution hooks, tool packaging, and plugin manifests remain non-active future-stage capabilities while implemented import adapters are allowed to be active

#### Scenario: Gate D frontend test confirms bootstrap descriptors match implemented capability state
- **WHEN** the stage gate test suite runs
- **THEN** frontend tests confirm that the capability descriptors exposed at bootstrap do not mark unimplemented future-stage capabilities as active and do include implemented runtime import adapters

## ADDED Requirements

### Requirement: Implemented import adapters are exposed through runtime-owned capability descriptors
The system SHALL expose implemented import adapters such as backup restore, curl import, and OpenAPI import through runtime-owned capability descriptors and bootstrap import-adapter lists.

#### Scenario: Bootstrap exposes OpenAPI import as an implemented adapter
- **WHEN** the runtime boots with OpenAPI import implemented for the current release
- **THEN** the bootstrap capability payload includes an active `import.openapi` capability descriptor and corresponding import-adapter entry
