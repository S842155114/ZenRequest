# project-baseline-readiness Specification

## Purpose
Define the canonical repository-level baseline summary, documentation alignment rules, and readiness-gap classification for the current desktop ZenRequest release.
## Requirements
### Requirement: Repository publishes a canonical desktop baseline summary
The project SHALL maintain one canonical baseline-readiness summary that states which desktop workbench capabilities are already implemented, which gaps remain open, and which items are explicitly out of scope for the current desktop release.

#### Scenario: Contributor reviews current project status
- **WHEN** a contributor needs to understand whether the current desktop product is feature-incomplete or mostly complete
- **THEN** the repository provides one baseline summary that distinguishes shipped capabilities, known gaps, and out-of-scope items without requiring ad hoc code archaeology

### Requirement: Project-facing documentation matches the implemented runtime model
The project SHALL ensure that repository-facing product documentation describes the current runtime and persistence model accurately, including the desktop-first runtime boundary and the actual local persistence mechanism used by the application.

#### Scenario: Contributor reads storage and runtime positioning
- **WHEN** a contributor reads the primary project documentation to understand how ZenRequest persists user data and executes requests
- **THEN** the documentation reflects the implemented desktop runtime model instead of an outdated or contradictory storage description

### Requirement: Readiness gaps are classified separately from missing capabilities
The project SHALL record non-blocking readiness issues, such as documentation drift, bundle-size warnings, or intentionally limited non-desktop adapters, separately from missing product capabilities.

#### Scenario: Maintainer evaluates release readiness
- **WHEN** a maintainer reviews open baseline issues after the core desktop capabilities are already implemented
- **THEN** the recorded gaps make clear which items are polish or scope-boundary concerns and which items represent missing functional behavior

### Requirement: Stable archived capability metadata is finalized after baseline review
The project SHALL replace placeholder archival metadata in stable OpenSpec capability documents once the baseline review confirms the capability set is understood and in use.

#### Scenario: Contributor reviews archived capability specs
- **WHEN** a contributor reads archived or current OpenSpec capability documents after the baseline-readiness pass
- **THEN** those documents no longer rely on unresolved placeholder purpose text for capabilities whose meaning is already stable
