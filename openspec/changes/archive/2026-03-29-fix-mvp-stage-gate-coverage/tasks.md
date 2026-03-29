## 1. App.vue UI-Only Label

- [x] 1.1 Add a comment above `resolvedActiveUrl` in `src/App.vue` marking `resolveTemplate` as a UI-only display calculation with no role in the request execution path

## 2. Rust Gate Attribution

- [x] 2.1 Add `// [Gate A: Runtime Authority]` attribution comment to the Rust test in `src-tauri/src/commands/request.rs` that verifies request compilation and assertion evaluation execute inside the Rust runtime
- [x] 2.2 Add `// [Gate D: Stage Discipline]` attribution comment to the Rust test `future_capability_seams_remain_reserved_until_enabled` in `src-tauri/src/commands/request.rs` (or `runtime_capabilities.rs`) that verifies future-stage capability seams remain reserved

## 3. Stage Gate Test Suite

- [x] 3.1 Create `src/stage-gate.test.ts` with the required mock setup (reuse the mock adapter and bootstrap factory patterns from `App.test.ts`)
- [x] 3.2 Implement Gate B (Contract Parity): add a test that sends a request with non-default `bodyContentType`, `formDataFields`, `binaryFileName`, `auth`, and `tests` fields and verifies the resulting history snapshot preserves all canonical fields
- [x] 3.3 Implement Gate C (Mainline Loop): add a single test that walks bootstrap → tab present → send → history entry appears → history restore → restored tab state matches the sent request
- [x] 3.4 Implement Gate D frontend (Stage Discipline): add a test that boots the workbench with a capability descriptor payload and verifies no `openapi`, execution hook, tool packaging, or plugin manifest capability has `availability: active`

## 4. Verification

- [x] 4.1 Run `pnpm test` and confirm all existing tests still pass and the new `stage-gate.test.ts` tests pass
- [x] 4.2 Run `cargo test --manifest-path src-tauri/Cargo.toml` and confirm all Rust tests still pass
