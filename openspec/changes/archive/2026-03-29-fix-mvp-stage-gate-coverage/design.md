## Context

The `align-local-api-workbench-architecture` change established the target architecture and marked all tasks complete, including task 6.3 (stage gate automation). However, inspection of the codebase reveals no stage gate tests exist. The MVP Exit Gate defined in the architecture brainstorm requires four automated checks before v0.2 work proceeds:

- **Gate A** (Runtime Authority): Rust owns compile and assert — already covered by inline Rust tests in `commands/request.rs` but not labeled as gate coverage.
- **Gate B** (Contract Parity): TS/Rust/DB canonical fields survive round-trips — no dedicated test exists.
- **Gate C** (Mainline Loop): Full bootstrap → edit → send → history → restore path in one test — covered fragmentarily across many tests but never as a single coherent flow.
- **Gate D** (Stage Discipline): Future-stage capabilities remain non-active — covered by `future_capability_seams_remain_reserved_until_enabled` Rust test but not labeled, and the frontend side (bootstrap descriptor verification) is untested.

Additionally, `App.vue:179` uses `resolveTemplate` for URL bar display preview without any comment distinguishing it from the execution path, which the MVP Exit Gate requires to be explicitly labeled.

## Goals / Non-Goals

**Goals:**
- Make existing gate coverage visible by adding attribution comments to Rust tests.
- Add missing gate tests (Gate B, Gate C, Gate D frontend) using the existing Vitest + mock adapter pattern already established in `App.test.ts`.
- Add a single comment to `App.vue` that labels the UI-only `resolveTemplate` usage.
- Produce a `stage-gate.test.ts` file that serves as the canonical machine-verifiable MVP gate checklist.

**Non-Goals:**
- Changing any runtime behavior or business logic.
- Adding real Tauri IPC integration tests (accepted as mock-adapter tests per user decision).
- Implementing any v0.2/v0.3/v0.4 capabilities.
- Modifying the SQLite schema or Rust DTO structures.

## Decisions

### Decision: Gate tests live in a dedicated `stage-gate.test.ts` rather than being distributed across feature test files
Concentrating gate tests in one file makes the MVP exit checklist visible and auditable as a unit. Scattering gate assertions across feature files would make it impossible to see at a glance whether all gates are covered.

Alternative considered: Append gate tests to `App.test.ts`.
Why not chosen: `App.test.ts` is already 2500+ lines. A dedicated file with explicit gate labels is easier to audit.

### Decision: Use the existing Vitest + mock adapter pattern for Gate C mainline loop
The mock adapter already simulates the full IPC surface. The user confirmed this is acceptable for gate verification. Requiring real Tauri IPC would demand a separate test harness with significant infrastructure cost.

### Decision: Gate A and Gate D Rust coverage uses comment attribution only, no new test logic
The Rust tests already assert the correct behavior. Adding new duplicate tests would be noise. Attribution comments make the coverage traceable without adding maintenance burden.

## Risks / Trade-offs

- Mock adapter tests do not catch Rust-side regressions in the IPC contract. This is accepted risk given the Rust unit tests already cover the logic directly.
- Gate tests may become stale if the mock adapter interface changes. Mitigation: the mock adapter is typed against the same TS interfaces as the real client, so type errors surface at compile time.

## Migration Plan

No migration required. All changes are additive (new test file, comments). Existing tests are unaffected.
