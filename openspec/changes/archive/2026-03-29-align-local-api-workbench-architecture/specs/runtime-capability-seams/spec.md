## ADDED Requirements

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
