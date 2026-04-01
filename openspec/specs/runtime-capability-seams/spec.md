# runtime-capability-seams Specification

## Purpose
Define runtime-owned capability descriptors and reserved seams for protocols, import adapters, execution hooks, tool packaging, and plugin manifests.
## Requirements
### Requirement: Runtime declares capability descriptors for built-in seams
The system SHALL let the runtime declare built-in capability descriptors for supported protocols, import adapters, execution hooks, tool-packaging paths, and plugin-manifest seams.

#### Scenario: Runtime exposes built-in capability categories
- **WHEN** the runtime initializes
- **THEN** it registers capability descriptors for the built-in capability kinds supported by the current release

### Requirement: Capability seams remain runtime-owned
The system SHALL define protocol, import, and execution-hook seams inside the runtime rather than letting those concerns attach directly through frontend-only feature logic.

#### Scenario: New capability attaches through a runtime seam
- **WHEN** a future protocol or import capability is introduced
- **THEN** that capability is attached through a runtime-owned seam instead of a frontend-specific branch

### Requirement: Stage-gated future capabilities remain declarative until enabled
The system SHALL allow future-stage capabilities to exist as declared seams without requiring their full implementation in earlier stages.

#### Scenario: Future capability remains reserved
- **WHEN** a capability belongs to a later roadmap stage such as MCP debugging, Tool Call debugging, or plugin execution
- **THEN** the system may reserve its seam declaratively without treating that capability as implemented in the current stage

### Requirement: Stage gate automation verifies Stage Discipline before v0.2 progression
The project SHALL maintain automated tests that verify only unimplemented future-stage capabilities remain non-active in the current release, so that Stage Discipline gate status is machine-verifiable rather than relying on documentation claims alone.

#### Scenario: Gate D Rust test confirms only future seams remain reserved
- **WHEN** the stage gate test suite runs
- **THEN** Rust tests confirm that execution hooks, tool packaging, and plugin manifests remain non-active future-stage capabilities while implemented import adapters are allowed to be active

#### Scenario: Gate D frontend test confirms bootstrap descriptors match implemented capability state
- **WHEN** the stage gate test suite runs
- **THEN** frontend tests confirm that the capability descriptors exposed at bootstrap do not mark unimplemented future-stage capabilities as active and do include implemented runtime import adapters

### Requirement: Implemented import adapters are exposed through runtime-owned capability descriptors
The system SHALL expose implemented import adapters such as backup restore, curl import, and OpenAPI import through runtime-owned capability descriptors and bootstrap import-adapter lists.

#### Scenario: Bootstrap exposes OpenAPI import as an implemented adapter
- **WHEN** the runtime boots with OpenAPI import implemented for the current release
- **THEN** the bootstrap capability payload includes an active `import.openapi` capability descriptor and corresponding import-adapter entry

