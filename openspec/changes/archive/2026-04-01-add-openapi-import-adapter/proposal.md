## Why

ZenRequest 目前已经具备 `workspace import` 和 `curl import` 两条成熟导入链路，但还缺少将标准 API 描述文档批量转换为工作区请求资产的能力。现在补上 OpenAPI 3.0 导入，可以把现有 runtime-owned import adapter、capability registry、canonical request model 和 stage-gate 约束串成一个高价值新能力，而不需要引入新的存储模型或前端主导的协议解析分支。

## What Changes

- Add a new OpenAPI 3.0 feature-grade import adapter that accepts local JSON/YAML spec content and maps supported operations into canonical workspace collections and saved requests.
- Add an `Analyze -> Apply` import flow so the runtime can first produce a typed OpenAPI import plan with warnings/skipped items and then materialize the selected or default import result into the active workspace.
- Keep the OpenAPI parsing path runtime-owned in Rust by using Rust-native document/model parsing dependencies for the input boundary while keeping ZenRequest-specific import semantics, warning taxonomy, and canonical mapping in-house.
- Expose OpenAPI import through the existing capability-driven runtime seam and frontend import entry points, including bootstrap capability descriptors, runtime command bindings, and import result summaries.
- Preserve the distinction between backup restore packages and feature-grade imports, so OpenAPI import does not require workspace/application package metadata or restore semantics.
- Explicitly avoid making Node-based OpenAPI governance or CLI tools a required runtime dependency for the desktop MVP import path.
- Extend stage-discipline coverage so OpenAPI is only exposed as active when the runtime and UI paths are actually implemented and verified.

## Capabilities

### New Capabilities

- `openapi-import`: Import OpenAPI 3.0 documents into canonical workspace collections and saved requests through a typed analyze/apply runtime flow with warning-aware partial import behavior.

### Modified Capabilities

- `runtime-capability-seams`: Update capability seam requirements so OpenAPI import becomes a runtime-owned built-in import adapter instead of a permanently absent future capability, while preserving stage-gated exposure rules.
- `collections-requests`: Clarify how feature-grade OpenAPI import materializes into canonical collection-owned saved requests, including collection grouping and canonical request-definition ownership.
- `import-export`: Clarify that implemented OpenAPI import remains distinct from backup restore package contracts and continues to use feature-grade import semantics rather than package restore semantics.

## Impact

- Affected specs:
  - `openspec/specs/openapi-import/spec.md` (new)
  - `openspec/specs/runtime-capability-seams/spec.md`
  - `openspec/specs/collections-requests/spec.md`
  - `openspec/specs/import-export/spec.md`
- Affected runtime code:
  - `src-tauri/src/commands/importing.rs`
  - `src-tauri/src/core/import_runtime.rs`
  - `src-tauri/src/core/runtime_capabilities.rs`
  - `src-tauri/src/commands/workspace.rs`
  - `src-tauri/src/models/importing.rs`
- Affected dependencies:
  - add Rust-native OpenAPI/YAML parsing dependencies at the Tauri runtime boundary
  - no Node-based CLI/toolchain dependency in the desktop import runtime path
- Affected frontend code:
  - `src/lib/tauri-client.ts`
  - `src/features/app-shell/composables/useAppShell.ts`
  - `src/features/app-shell/types.ts`
  - `src/components/request/RequestUrlBar.vue`
  - `src/lib/i18n.ts`
- Affected verification:
  - `src/stage-gate.test.ts`
  - runtime capability tests
  - import flow tests for analyze/apply, warnings, and workspace materialization
