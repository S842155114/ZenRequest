## Why

ZenRequest 已经具备本地优先桌面 API 工作台的基础，但当前实现仍未严格对齐《产品定位与架构讨论》要求的目标架构。最关键的缺口是执行语义仍分裂在前端与 Rust Runtime 之间、canonical data contract 尚未统一、MVP 主链路仍缺少 `curl` 导入，而未来 AI/Agent、协议扩展与插件能力也还没有稳定的接入边界。

## What Changes

- Establish a runtime-owned execution pipeline so request compilation, protocol dispatch, assertion evaluation, and execution artifacts are owned by Rust instead of split across Vue helpers and Rust transport code.
- Add MVP `curl` import as a first-class import adapter that maps external developer text into the canonical request model instead of treating import as a UI helper.
- Define runtime capability seams for future protocol drivers, import adapters, execution hooks, tool packaging, and plugin manifests without implementing the advanced features yet.
- Expand the canonical request and session contracts so TypeScript domain types, Rust DTOs, and SQLite persistence can represent the same request body semantics, draft provenance, and replay identity.
- Clarify that backup restore import/export remains a distinct capability from feature-grade imports such as `curl` and future OpenAPI import.
- Add stage gates so MVP must close before v0.2, v0.3, and v0.4+ capabilities are allowed into the main implementation path.

## Capabilities

### New Capabilities
- `runtime-execution-pipeline`: Defines the runtime-owned compile, dispatch, normalize, assert, and artifact pipeline for request execution.
- `curl-import`: Imports developer-provided curl commands into canonical request drafts and saved request definitions.
- `runtime-capability-seams`: Defines runtime-declared protocol, import, hook, tool-packaging, and plugin-manifest seams for future expansion.

### Modified Capabilities
- `collections-requests`: Request entities must preserve canonical request-definition semantics across frontend, runtime DTOs, and persistence.
- `workspace-sessions`: Session drafts must preserve tab origin, draft identity, and round-trip complete editable request semantics.
- `environments`: Environment entities must remain workspace-scoped while becoming contract-ready for future layering and extraction provenance.
- `history`: History must remain a replay-safe workspace projection of execution artifacts with preserved execution provenance.
- `import-export`: Backup restore import/export must remain versioned and distinct from feature-grade import adapters such as `curl` and future OpenAPI import.
- `runtime-bootstrap`: Bootstrap must hydrate canonical runtime-owned resource and session state without reintroducing frontend source-of-truth drift.

## Impact

- Affected frontend areas: `src/App.vue`, `src/lib/request-workspace.ts`, `src/lib/tauri-client.ts`, request/response workbench flows.
- Affected runtime areas: `src-tauri/src/core/*`, `src-tauri/src/commands/*`, `src-tauri/src/models/*`, `src-tauri/src/storage/*`.
- Affected data boundaries: request definition schema, workspace session schema, environment contract, history contract, import/export contracts.
- Affected future architecture: protocol seams, import adapter seams, capability registry seams, tool packaging seams, plugin manifest seams.
