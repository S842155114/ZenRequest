## ADDED Requirements

### Requirement: History projects execution artifacts rather than replacing them
The system SHALL treat history as a workspace-owned projection of execution artifacts rather than as a replacement for canonical request definitions or full execution-state ownership.

#### Scenario: History records an execution artifact projection
- **WHEN** a request execution completes
- **THEN** the system stores history as a projection of that execution while keeping the conceptual execution artifact distinct from the saved request definition

### Requirement: History replay preserves canonical execution provenance
The system SHALL preserve execution provenance and replay-safe request snapshots even as execution ownership moves fully into the runtime.

#### Scenario: Replayed history entry keeps runtime provenance
- **WHEN** the user reopens a history item recorded from a runtime-owned execution
- **THEN** the replay draft is restored from the stored execution snapshot with the original execution provenance preserved
