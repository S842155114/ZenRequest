## Why

The `align-local-api-workbench-architecture` change closed all major architectural gaps but task 6.3 (stage gate automation) was marked complete without any corresponding code. The MVP Exit Gate defined in the architecture brainstorm requires automated verification of Runtime Authority, Contract Parity, Mainline Loop, and Stage Discipline — none of these constraints exist in the test suite today.

## What Changes

- Add a comment to `App.vue`'s `resolvedActiveUrl` computed marking it as a UI-only display calculation, explicitly distinguishing it from the Rust-owned execution path, to satisfy the MVP Exit Gate requirement that frontend variable resolution be labeled as display-only.
- Add gate attribution comments to existing Rust tests in `src-tauri/src/commands/request.rs` that already cover Gate A (runtime compile + assert) and Gate D (future seams reserved), making the gate coverage visible and verifiable.
- Add a new `src/stage-gate.test.ts` that implements three gate test groups using the existing mock adapter pattern:
  - **Gate B (Contract Parity)**: Verifies that canonical request fields (`bodyContentType`, `formDataFields`, `binaryFileName`, `auth`, `tests`) survive a send → history round-trip without loss.
  - **Gate C (Mainline Loop)**: A single test that walks the full bootstrap → tab edit → send → history entry appears → history restore → restored tab matches original path.
  - **Gate D frontend (Stage Discipline)**: Verifies that capability descriptors returned by bootstrap do not contain any `active` v0.3/v0.4+ capabilities (`openapi`, execution hooks, tool packaging, plugin manifest).

## Capabilities

### New Capabilities

### Modified Capabilities
- `runtime-execution-pipeline`: Add requirement that stage gate automation exists to verify Runtime Authority and Mainline Loop before v0.2 progression.
- `runtime-capability-seams`: Add requirement that stage discipline automation exists to verify future-stage capabilities remain non-active until their gate is opened.

## Impact

- Affected frontend: `src/App.vue` (comment only), new `src/stage-gate.test.ts`.
- Affected Rust: `src-tauri/src/commands/request.rs` (comment annotations on existing tests only, no logic changes).
- No runtime behavior changes. No API or schema changes.
