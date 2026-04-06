# Phase 2: Workspace Assets - Research

**Researched:** 2026-04-06
**Domain:** Local-first workspace asset management for collections, history replay, import/export, and cURL draft import
**Confidence:** HIGH

## User Constraints

### Locked Decisions

### Asset model priority
- **D-01:** 本阶段优先让 collection、history、导入导出形成稳定闭环，而不是继续扩展新的调试能力面。
- **D-02:** 资产链路必须服务于“本地优先、快速、可控”的产品定位；导入导出与迁移都应首先围绕本地可恢复、可备份、可移动展开。

### Collection and folder behavior
- **D-03:** collection / folder 管理以“常用请求资产稳定保存和整理”为优先目标；交互应尽量直接，不为了未来协作场景增加复杂抽象。
- **D-04:** 本阶段可以补齐 folder / collection 结构中的保存、重命名、删除、移动等关键链路，但不引入与 Phase 2 无关的复杂共享/同步模型。

### History behavior
- **D-05:** 历史记录必须与 HTTP 主链路保持一致，查看、筛选和重发体验不能与其他执行模型混淆。
- **D-06:** 历史重发应优先强调“从历史快速回到可编辑请求态”，而不是增加新的回放系统或审计产品能力。

### Import / export behavior
- **D-07:** 导入导出优先保证可靠备份与迁移，默认采用明确、可预期的本地文件行为，而不是隐式云端或复杂同步策略。
- **D-08:** cURL 导入的落点应是“生成可继续编辑的请求草稿”，保持与当前请求编辑体验一致，而不是生成一个难以修改的只读导入结果。
- **D-09:** 本阶段可以沿用现有 import adapter 与 workspace package 边界，优先补齐稳定性、一致性和关键 UX，而不是重新设计整套导入框架。

### Architecture boundary
- **D-10:** 延续既有分层：组件负责展示和交互转发，composable / state 负责资产工作流编排，`src/lib/tauri-client.ts` 继续作为前端到 Rust 的唯一桥接边界，Rust service / storage 负责持久化与导入导出落盘。
- **D-11:** 不把 collection / history / import-export 规则重新堆回 Vue 组件；如需复杂状态协调，应归拢到现有 app-shell / feature state 边界或 Rust service / repository 层。

### Error handling and trust
- **D-12:** 资产操作的错误信息必须帮助定位是保存失败、导入失败、导出失败、迁移冲突还是历史操作异常，不能只呈现泛化失败提示。
- **D-13:** 与本地资产相关的 destructive 操作（删除、覆盖、冲突处理）必须行为可预期，避免静默丢失用户请求资产。

### Claude's Discretion
- folder / collection 面板的具体信息密度与布局呈现
- 历史筛选的最小可行交互形式
- 导入导出入口在现有 shell 中的挂载位置
- 针对迁移/冲突提示的具体文案与测试分层

### Deferred Ideas (OUT OF SCOPE)
- 变量解析、环境覆盖优先级、secret 导出脱敏策略深化 —— Phase 3
- 断言系统、恢复诊断与更强错误引导 —— Phase 4
- MCP 专用历史、回放和 schema 表单增强 —— Phase 5
- OpenAPI 之外更多导入格式、团队共享与云同步能力 —— 后续里程碑

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WS-01 | 开发者可以保存请求到 collection，并在 folder / collection 结构中管理常用请求资产 | Collection service/repository layering, deterministic destructive actions, request save/update path, minimal folder UX guidance |
| WS-02 | 开发者可以查看、筛选并重新发送历史请求记录 | Existing history snapshot model, replay-draft pattern, execution-source separation, filter recommendations |
| WS-03 | 开发者可以导出与导入本地工作区或关键请求资产，用于备份和迁移 | Existing workspace/application package boundary, conflict-strategy UX, file dialog guidance, migration safety expectations |
| WS-04 | 开发者可以从 cURL 导入请求草稿并继续编辑 | Existing `import_curl_request` runtime boundary, editable draft target, form-field parity expectations |

## Summary

Phase 2 should be planned as a reliability pass over an already-existing asset pipeline, not as a greenfield subsystem. The codebase already has end-to-end boundaries for collections, history, workspace import/export, and cURL/OpenAPI import through `src/lib/tauri-client.ts`, `src/features/app-shell/state/app-shell-services.ts`, `src/features/app-shell/state/app-shell-dialogs.ts`, and Rust services/repositories under `src-tauri/src/services/` and `src-tauri/src/storage/repositories/`. [VERIFIED: codebase grep] That means the planner should bias toward closing behavioral gaps, consistency gaps, and destructive-action safeguards rather than inventing new architecture. [VERIFIED: codebase grep]

The most important design center is “request as editable asset.” History replay already reconstructs an editable draft from `requestSnapshot`, falls back to saved request assets when needed, and marks the resulting tab as unsaved replay state in `buildHistoryReplayDraft`. [VERIFIED: codebase grep] cURL import already returns a `RequestTabState` draft through the existing runtime boundary. [VERIFIED: codebase grep] Export/import already distinguishes workspace-scoped and application-scoped packages, and the dialog layer already exposes explicit conflict strategies (`rename`, `skip`, `overwrite`). [VERIFIED: codebase grep]

The planning risk is not missing primitives; it is failing to make them predictable. Collection mutations, history filtering/replay, and import/export flows all cross UI, app-shell orchestration, runtime DTO mapping, Rust services, and SQLite persistence. [VERIFIED: codebase grep] The plan should therefore sequence work around invariant preservation: stable asset identity, explicit overwrite behavior, replay that never mutates history in place, and error messages that identify the failing stage. [VERIFIED: codebase grep]

**Primary recommendation:** Use the existing `app-shell services/dialogs → tauri-client → Rust service → repository` path, and spend Phase 2 on deterministic asset workflows, not new abstractions. [VERIFIED: codebase grep]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | Project: `3.5.13`, Registry current: `3.5.32` | Frontend state/view layer for asset panels and dialogs | Existing app shell, component tests, and runtime bindings are already built on Vue 3. [VERIFIED: npm registry] [VERIFIED: codebase grep] |
| Vite | Project: `8.0.2`, Registry current: `8.0.7` | Frontend build/dev pipeline | Existing scripts and test/build flow already assume Vite. [VERIFIED: npm registry] [VERIFIED: codebase grep] |
| Tauri | Project: `2.x`, Crates current: `2.10.3` | Desktop runtime and frontend↔Rust command bridge | Official Tauri v2 documents command invocation as the standard way to call Rust from the frontend. [CITED: https://v2.tauri.app/develop/calling-rust/] |
| rusqlite | Project: `0.32`, Crates current: `0.39.0` | Local SQLite persistence for collections/history/workspaces | Existing repositories and migrations already use rusqlite directly. [VERIFIED: codebase grep] [CITED: https://docs.rs/rusqlite/latest/rusqlite/] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tauri-apps/plugin-dialog` | Project: `2.6.0` | Save/open file dialogs for import/export | Use for explicit local file selection and save destinations. [VERIFIED: codebase grep] [CITED: https://v2.tauri.app/plugin/dialog/] |
| reqwest | Project: `0.12`, Crates current: `0.13.2` | HTTP execution engine that must stay aligned with history records | Use indirectly; Phase 2 should preserve request/response history fidelity around reqwest-backed sends. [VERIFIED: codebase grep] [CITED: https://docs.rs/reqwest/latest/reqwest/] |
| openapiv3 | Project: `2`, Crates current: `2.2.0` | Existing OpenAPI import analysis/apply path | Use only within current import boundary; do not redesign import stack in this phase. [VERIFIED: codebase grep] |
| Vitest + Vue Test Utils | Project: `4.1.1`/`2.4.6`, Registry current: `4.1.2`/`2.4.6` | Frontend orchestration and component behavior tests | Existing test suites already validate app-shell history/dialog flows this way. [VERIFIED: npm registry] [VERIFIED: codebase grep] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing SQLite repositories | ORM / new persistence layer | Adds migration and mapping risk in a reliability phase. [VERIFIED: codebase grep] |
| Existing Tauri commands + services | Direct `invoke` calls scattered in components | Breaks the established bridge boundary and duplicates error handling. [VERIFIED: codebase grep] |
| Existing dialog plugin | Custom browser-only download/upload plumbing | Loses desktop-native file selection semantics already supported by Tauri. [CITED: https://v2.tauri.app/plugin/dialog/] |

**Installation:**
```bash
pnpm install
cargo fetch --manifest-path src-tauri/Cargo.toml
```

**Version verification:**
- `vue` current registry version is `3.5.32`; project pins `^3.5.13`. [VERIFIED: npm registry]
- `vite` current registry version is `8.0.7`; project pins `^8.0.2`. [VERIFIED: npm registry] [ASSUMED]
- `vitest` current registry version is `4.1.2`; project pins `^4.1.1`. [VERIFIED: npm registry]
- `@vue/test-utils` current registry version is `2.4.6`; project pins `^2.4.6`. [VERIFIED: npm registry]
- `tauri` current crates.io version is `2.10.3`; project uses `2`. [VERIFIED: npm registry] [VERIFIED: codebase grep]
- `rusqlite` current crates.io version is `0.39.0`; project pins `0.32`. [VERIFIED: npm registry] [VERIFIED: codebase grep]

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── features/app-shell/      # Asset workflow orchestration, dialogs, replay, sidebar actions
├── lib/                     # Runtime bridge and pure request/history/workspace transforms
└── components/              # Presentation-only panels and shell UI

src-tauri/
├── src/commands/            # Tauri invoke entrypoints
├── src/services/            # Use-case orchestration and validation
└── src/storage/repositories/# SQLite persistence and import/export serialization
```

### Pattern 1: Frontend orchestration stays above the runtime bridge
**What:** Vue components emit UI intent; app-shell services/dialogs coordinate behavior; `src/lib/tauri-client.ts` is the only frontend bridge into Tauri. [VERIFIED: codebase grep]
**When to use:** Any collection/history/import/export mutation or import/export command in Phase 2. [VERIFIED: codebase grep]
**Example:**
```typescript
// Source: src/features/app-shell/state/app-shell-dialogs.ts + src/lib/tauri-client.ts
const result = await deps.services.exportWorkspace({ scope })
if (result.ok) {
  await triggerJsonDownload(result.data.fileName, result.data.packageJson)
}
```

### Pattern 2: History replay creates a new editable draft, not a live binding
**What:** Reopen history into a draft tab with `origin.kind = 'replay'`, `persistenceState = 'unsaved'`, and a response snapshot copied from history. [VERIFIED: codebase grep]
**When to use:** WS-02 replay, resend-from-history, and “continue editing from old request” flows. [VERIFIED: codebase grep]
**Example:**
```typescript
// Source: src/features/app-shell/domain/history-replay.ts
newTab.origin = {
  kind: 'replay',
  requestId: snapshot?.requestId ?? fallbackPreset?.id ?? item.requestId,
  historyItemId: item.id,
}
newTab.persistenceState = 'unsaved'
newTab.isDirty = true
```

### Pattern 3: Rust services stay thin; repositories own persistence detail
**What:** Service functions validate payloads and delegate to repository/db helpers; repository modules own SQL and serialization. [VERIFIED: codebase grep]
**When to use:** Folder/collection move/rename/delete, import conflict handling, export package shape changes. [VERIFIED: codebase grep]
**Example:**
```rust
// Source: src-tauri/src/services/collection_service.rs
pub fn rename_collection(
    state: &AppState,
    payload: &CollectionMutationPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    db::rename_collection(&state.db_path, payload)
}
```

### Anti-Patterns to Avoid
- **Component-owned persistence logic:** Do not call runtime commands directly from sidebar/panel components; keep orchestration in app-shell services/dialogs. [VERIFIED: codebase grep]
- **History replay as in-place mutation:** Do not mutate stored history items or reopen them as “saved” tabs; replay should always produce a new draft. [VERIFIED: codebase grep]
- **Implicit overwrite/import behavior:** Do not hide conflict resolution; existing dialog contracts already surface explicit strategies and should remain explicit. [VERIFIED: codebase grep]
- **New generic asset framework:** This phase already has concrete asset boundaries; adding a new abstraction layer increases risk without solving a proven problem. [VERIFIED: codebase grep]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Desktop file save/open | Custom anchor/download or browser-only chooser logic | `@tauri-apps/plugin-dialog` + existing frontend dialog flow | Tauri already provides native file selection/save flows. [CITED: https://v2.tauri.app/plugin/dialog/] |
| Frontend↔Rust transport | Ad hoc `invoke` calls throughout feature code | `src/lib/tauri-client.ts` | Existing bridge centralizes DTO mapping and not-implemented fallbacks. [VERIFIED: codebase grep] |
| History replay reconstruction | New replay mapper in UI layer | `buildHistoryReplayDraft` + request workspace helpers | Existing replay logic already handles snapshot fallback and draft semantics. [VERIFIED: codebase grep] |
| SQLite migration bookkeeping | Manual one-off schema edits | Existing migration runner in `src-tauri/src/storage/migrations.rs` | The project already tracks `user_version` and idempotent step checks. [VERIFIED: codebase grep] |
| cURL/OpenAPI parsing framework | New import stack | Existing `import_service` / `import_runtime` boundary | Phase constraints explicitly prefer stabilizing current adapter boundaries. [VERIFIED: codebase grep] |

**Key insight:** Most Phase 2 work is “make existing boundaries trustworthy,” not “invent missing primitives.” [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Treating folders as a pure UI problem
**What goes wrong:** The plan focuses on tree rendering but leaves save/move/delete semantics underdefined. [ASSUMED]
**Why it happens:** Folder/collection work feels visual, but the real risk is asset identity and destructive behavior. [VERIFIED: codebase grep]
**How to avoid:** Plan folder support together with storage shape, move semantics, and import/export serialization compatibility. [ASSUMED]
**Warning signs:** UI tasks exist without repository, DTO, and export-format tasks. [ASSUMED]

### Pitfall 2: Mixing history viewing with execution provenance
**What goes wrong:** HTTP, mock, and MCP history become hard to distinguish, and replay sends the wrong mental signal. [VERIFIED: codebase grep]
**Why it happens:** History items already carry `execution_source`; ignoring it collapses distinct execution models. [VERIFIED: codebase grep]
**How to avoid:** Preserve `execution_source` in list/filter/replay UI and test it explicitly. [VERIFIED: codebase grep]
**Warning signs:** Filter logic only uses method/status/name and ignores source kind. [ASSUMED]

### Pitfall 3: Import/export convenience overriding safety
**What goes wrong:** Import silently overwrites, export scope is unclear, or users cannot predict what package they are writing. [VERIFIED: codebase grep]
**Why it happens:** Asset portability paths cross file selection, package scope, and conflict resolution. [VERIFIED: codebase grep]
**How to avoid:** Keep explicit scope labels and explicit conflict strategies, and verify toasts/errors mention overwrite/rename/skip decisions. [VERIFIED: codebase grep]
**Warning signs:** A single “Import” or “Export” action hides scope and strategy. [ASSUMED]

### Pitfall 4: Planning only happy-path tests
**What goes wrong:** The feature appears complete but fails on missing snapshots, duplicate collection names, or invalid import payloads. [VERIFIED: codebase grep]
**Why it happens:** Existing tests already show the project values degraded-mode and failure assertions; omitting them would regress style. [VERIFIED: codebase grep]
**How to avoid:** Add tests for duplicate names, missing request snapshots, invalid package JSON, and destructive-action confirmations. [VERIFIED: codebase grep]
**Warning signs:** Only create/save success tests are added. [ASSUMED]

## Code Examples

Verified patterns from official sources and the current codebase:

### History replay draft
```typescript
// Source: src/features/app-shell/domain/history-replay.ts
const newTab = snapshot
  ? createRequestTabFromHistorySnapshot(snapshot, item.name, item.id)
  : fallbackPreset
    ? createRequestTabFromPreset(fallbackPreset)
    : createBlankRequestTab()

newTab.origin = {
  kind: 'replay',
  requestId: snapshot?.requestId ?? fallbackPreset?.id ?? item.requestId,
  historyItemId: item.id,
}
newTab.persistenceState = 'unsaved'
newTab.isDirty = true
```

### Tauri command boundary
```rust
// Source: https://v2.tauri.app/develop/calling-rust/
#[tauri::command]
fn my_custom_command() {
  println!("I was invoked from JavaScript!");
}
```

### Native file picker/save dialog
```rust
// Source: https://v2.tauri.app/plugin/dialog/
use tauri_plugin_dialog::DialogExt;

let file_path = app.dialog().file().blocking_pick_file();
```

### App-shell service calling runtime bridge
```typescript
// Source: src/features/app-shell/state/app-shell-services.ts
const result = await deps.runtime.importCurlRequest(workspaceId, command)
if (!result.ok) {
  return fail('request.import_failed', result.error)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treat local workspace as ephemeral UI state | Persist collections/history/session in SQLite with migration steps | Already present by 2026-04-06 codebase snapshot | Phase 2 should preserve persistence invariants instead of bypassing them. [VERIFIED: codebase grep] |
| Generic “history log” mentality | Replay from structured `requestSnapshot` into editable draft tabs | Already present by 2026-04-06 codebase snapshot | WS-02 can be planned around editability, not read-only replay. [VERIFIED: codebase grep] |
| Browser-style file export assumptions | Native desktop file dialog support via Tauri dialog plugin | Current Tauri v2 docs | Use explicit local files for backup/migration UX. [CITED: https://v2.tauri.app/plugin/dialog/] |

**Deprecated/outdated:**
- Hand-writing frontend persistence calls outside `tauri-client` is outdated for this repo’s architecture. [VERIFIED: codebase grep]
- Treating import/export as an implicit sync feature is out of scope for this product direction. [VERIFIED: codebase grep]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Folder support likely needs storage/export schema work, not only UI work | Common Pitfalls | Planner may under-scope backend and migration tasks |
| A2 | Current history filter logic does not yet fully account for execution source in UI | Common Pitfalls | Planner may overestimate existing filter completeness |
| A3 | Single-action import/export UX without explicit scope/strategy would be confusing in this product | Common Pitfalls | Planner could choose a simpler UI than users can safely trust |
| A4 | `vite` current registry version is `8.0.7` | Standard Stack | Minor version note may be stale; low implementation risk |

## Open Questions

1. **How is folder structure represented today—persisted model or planned extension?**
   - What we know: Collections exist and are persisted; context explicitly includes folder/collection structure in scope. [VERIFIED: codebase grep]
   - What's unclear: The provided code excerpts do not show a persisted folder model yet. [VERIFIED: codebase grep]
   - Recommendation: Wave 0 planning should decide whether folders are true persisted entities or a minimal collection-grouping extension before UI tasks are decomposed.

2. **Should “key request assets” export be request-level, collection-level, or workspace-subset level?**
   - What we know: Current dialog/service contracts clearly support `workspace` and `application` scopes. [VERIFIED: codebase grep]
   - What's unclear: WS-03 mentions “关键请求资产”, which may imply a narrower export granularity than current scopes. [VERIFIED: codebase grep]
   - Recommendation: Planner should either constrain Phase 2 to current package scopes or add a scoped-export requirement clarification before implementation.

3. **What is the minimum viable history filter set?**
   - What we know: Phase context leaves filter interaction as agent discretion, and requirements only demand basic filtering. [VERIFIED: codebase grep]
   - What's unclear: Whether filters should include method/status/text/source/date in v1. [VERIFIED: codebase grep]
   - Recommendation: Plan a narrow filter set first: text + method + execution source.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | Frontend scripts and package tooling | ✓ | `v25.7.0` | — |
| `pnpm` | `pnpm test` / `pnpm build` workflow | ✓ | `10.33.0` | `npm` for install only, not preferred |
| `cargo` | Rust compile/test/check flow | ✓ | `1.93.1` | — |
| `rustc` | Tauri/Rust build toolchain | ✓ | `1.93.1` | — |
| `npm` | Registry verification and package fallback | ✓ | `11.10.1` | — |

**Missing dependencies with no fallback:**
- None found. [VERIFIED: local environment probe]

**Missing dependencies with fallback:**
- None found. [VERIFIED: local environment probe]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not a user-login phase; keep local-only asset flows outside auth scope. [VERIFIED: requirements/context docs] |
| V3 Session Management | no | No remote session model introduced here. [VERIFIED: requirements/context docs] |
| V4 Access Control | no | Local desktop asset management only in this phase. [VERIFIED: requirements/context docs] |
| V5 Input Validation | yes | Validate import payloads, workspace IDs, collection names, and destructive action targets in services/repositories. [VERIFIED: codebase grep] |
| V6 Cryptography | no | No new crypto primitive should be introduced; reuse existing platform/runtime behavior only. [ASSUMED] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed import package causes partial state or crash | Tampering | Validate package shape before apply, keep explicit conflict strategy, and test invalid payloads. [VERIFIED: codebase grep] |
| Silent overwrite of local assets during import | Tampering | Require explicit `rename` / `skip` / `overwrite` choice and surface result clearly. [VERIFIED: codebase grep] |
| Unbounded imported payload degrades UI or history panels | Denial of Service | Reuse existing large-payload stability patterns and test large response/history previews. [VERIFIED: codebase grep] |
| Error messages expose local paths or raw internals | Information Disclosure | Keep `AppError` structured and user-facing messages specific but sanitized. [VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)
- `src/lib/tauri-client.ts` - runtime bridge for collections/history/import/export/cURL import
- `src/features/app-shell/state/app-shell-services.ts` - frontend orchestration service layer
- `src/features/app-shell/state/app-shell-dialogs.ts` - dialog-driven collection and import/export flows
- `src/features/app-shell/domain/history-replay.ts` - replay-draft construction pattern
- `src-tauri/src/services/collection_service.rs` - collection service boundary
- `src-tauri/src/services/history_service.rs` - history service boundary
- `src-tauri/src/services/import_service.rs` - cURL/OpenAPI import service boundary
- `src-tauri/src/services/workspace_service.rs` - workspace import/export boundary
- `src-tauri/src/storage/repositories/collection_repo.rs` - collection persistence behavior
- `src-tauri/src/storage/repositories/history_repo.rs` - history persistence behavior
- `src-tauri/src/storage/migrations.rs` - SQLite migration model
- `https://v2.tauri.app/develop/calling-rust/` - Tauri v2 command invocation pattern
- `https://v2.tauri.app/plugin/dialog/` - Tauri dialog plugin file picker/save behavior
- `https://docs.rs/rusqlite/latest/rusqlite/` - rusqlite crate docs
- `https://docs.rs/reqwest/latest/reqwest/` - reqwest crate docs

### Secondary (MEDIUM confidence)
- `npm view vue version time --json` - current Vue registry version
- `npm view vite version time --json` - current Vite registry version
- `npm view vitest version time --json` - current Vitest registry version
- `npm view @vue/test-utils version time --json` - current VTU registry version
- `cargo info tauri` - current crates.io Tauri metadata
- `cargo info reqwest` - current crates.io reqwest metadata
- `cargo info rusqlite` - current crates.io rusqlite metadata
- `cargo info openapiv3` - current crates.io openapiv3 metadata

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Project dependencies and current registry/crates metadata were checked directly.
- Architecture: HIGH - Asset flow boundaries are explicit in current code and prior phase docs.
- Pitfalls: MEDIUM - Most are grounded in current codebase, but a few UX/planning failure modes remain inferred.

**Research date:** 2026-04-06
**Valid until:** 2026-05-06
