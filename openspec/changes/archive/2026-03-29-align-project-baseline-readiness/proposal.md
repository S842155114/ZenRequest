## Why

The desktop workbench baseline is already broadly implemented and covered by passing frontend and Rust tests, but the repository does not describe that baseline consistently. README messaging, archived OpenSpec metadata, and release-readiness signals diverge from the actual implementation, which makes it hard to judge whether the current product is feature-incomplete or simply under-documented.

Before additional feature work continues, the project needs one canonical readiness pass that clarifies what is already shipped, what remains intentionally out of scope for the current desktop release, and which cleanup items are documentation or engineering polish rather than missing core capabilities.

## What Changes

- Introduce a canonical baseline-readiness artifact that summarizes the shipped desktop capability set, known gaps, and scope boundaries.
- Align project-facing documentation with the actual runtime model, including local SQLite persistence and desktop-first execution flow.
- Replace placeholder OpenSpec purpose text that remains from archived changes where the capability scope is already stable and understood.
- Separate non-blocking readiness gaps, such as frontend bundle-size warnings and non-Tauri mock-adapter limitations, from true missing product capabilities.

## Capabilities

### New Capabilities
- `project-baseline-readiness`: Defines how the repository records the implemented desktop baseline, known gaps, and release-readiness expectations.

### Modified Capabilities

## Impact

- Affected documentation: `README.md`, OpenSpec capability metadata, and release-readiness notes.
- Affected workflow: future changes can rely on a clearer definition of the current desktop baseline before proposing additional scope.
- Affected engineering decisions: contributors will have an explicit record of which gaps are documentation/polish issues versus missing capability work.
