# Codebase Structure

**Analysis Date:** 2026-04-06

## Directory Layout

```text
ZenRequest/
├── `src/`                     # Vue 3 frontend source
├── `src-tauri/`               # Tauri and Rust backend source
├── `docs/`                    # Project planning and design docs
├── `openspec/`                # Spec and change tracking artifacts
├── `dist/`                    # Frontend build output
├── `package.json`             # Frontend scripts and dependencies
├── `src-tauri/Cargo.toml`     # Rust crate manifest
└── `src-tauri/tauri.conf.json` # Tauri app configuration
```

## Directory Purposes

**`src/`:**
- Purpose: All frontend application code.
- Contains: Vue entry files, feature modules, shared UI components, utilities, tests, and static assets.
- Key files: `src/main.ts`, `src/App.vue`, `src/style.css`, `src/types/request.ts`

**`src/features/`:**
- Purpose: Business-oriented feature modules.
- Contains: Stateful composables, feature components, domain helpers, and feature-local tests.
- Key files: `src/features/app-shell/composables/useAppShell.ts`, `src/features/request-compose/composables/useRequestCompose.ts`, `src/features/mcp-workbench/components/McpRequestPanel.vue`

**`src/components/`:**
- Purpose: Reusable presentation components and layout shells.
- Contains: Layout pieces, request/response surfaces, editor surfaces, and low-level UI primitives under `src/components/ui/`.
- Key files: `src/components/layout/AppHeader.vue`, `src/components/request/RequestPanel.vue`, `src/components/response/ResponsePanel.vue`

**`src/lib/`:**
- Purpose: Cross-feature utilities and runtime bridges.
- Contains: Tauri client adapter, request/session helpers, i18n, response formatting, context-menu helpers.
- Key files: `src/lib/tauri-client.ts`, `src/lib/request-workspace.ts`, `src/lib/i18n.ts`

**`src/data/`:**
- Purpose: Static starter data and defaults.
- Contains: Seed request presets and other static frontend data.
- Key files: `src/data/request-presets.ts`

**`src/types/`:**
- Purpose: Shared frontend type contracts.
- Contains: Large request/workspace/history/auth model definitions.
- Key files: `src/types/request.ts`

**`src-tauri/src/`:**
- Purpose: Native backend implementation.
- Contains: Tauri commands, services, runtime/core modules, database storage modules, models, and error types.
- Key files: `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, `src-tauri/src/core/app_state.rs`

**`src-tauri/src/commands/`:**
- Purpose: Public Tauri command surface.
- Contains: One file per command domain.
- Key files: `src-tauri/src/commands/workspace.rs`, `src-tauri/src/commands/request.rs`, `src-tauri/src/commands/importing.rs`

**`src-tauri/src/services/`:**
- Purpose: Backend use-case orchestration.
- Contains: CRUD, bootstrap, request execution, and import service modules.
- Key files: `src-tauri/src/services/workspace_service.rs`, `src-tauri/src/services/request_service.rs`, `src-tauri/src/services/import_service.rs`

**`src-tauri/src/core/`:**
- Purpose: Runtime internals and protocol-specific engines.
- Contains: App state, capability registries, HTTP request compilation/execution, MCP runtime, import runtime.
- Key files: `src-tauri/src/core/request_runtime.rs`, `src-tauri/src/core/request_executor.rs`, `src-tauri/src/core/mcp_runtime.rs`

**`src-tauri/src/storage/`:**
- Purpose: Persistence setup and repository logic.
- Contains: Connection helpers, migration runner, SQL migration files, repositories.
- Key files: `src-tauri/src/storage/db.rs`, `src-tauri/src/storage/migrations.rs`, `src-tauri/src/storage/repositories/workspace_repo.rs`

**`docs/`:**
- Purpose: Human-authored design and planning documentation.
- Contains: Brainstorms, plans, and superpower-specific docs.
- Key files: `docs/plans/`, `docs/brainstorms/`

**`openspec/`:**
- Purpose: Specification history and active change proposals.
- Contains: Base specs under `openspec/specs/` and archived changes under `openspec/changes/archive/`.
- Key files: `openspec/specs/frontend-page-structure/`, `openspec/changes/refresh-local-api-workbench-ui/`

## Key File Locations

**Entry Points:**
- `src/main.ts`: Frontend app bootstrap.
- `src/App.vue`: Root UI composition and startup gate.
- `src-tauri/src/main.rs`: Native binary entry.
- `src-tauri/src/lib.rs`: Tauri builder, plugin registration, and command registration.

**Configuration:**
- `package.json`: Frontend scripts and npm dependencies.
- `src-tauri/Cargo.toml`: Rust dependencies and crate configuration.
- `src-tauri/tauri.conf.json`: Tauri window/app packaging config.
- `src/vite-env.d.ts`: Vite TS ambient typings.

**Core Logic:**
- `src/features/app-shell/composables/useAppShell.ts`: Top-level frontend orchestration.
- `src/features/app-shell/state/app-shell-store.ts`: Global state selectors and mutations.
- `src/lib/tauri-client.ts`: Frontend-to-backend runtime boundary.
- `src/lib/request-workspace.ts`: Pure request/workspace/session helper logic.
- `src-tauri/src/services/request_service.rs`: Request and MCP execution orchestration.
- `src-tauri/src/storage/db.rs`: Backend persistence façade.

**Testing:**
- `src/**/*.test.ts`: Frontend unit and component tests.
- `src/features/app-shell/test/`: App-shell scenario suites and test harness.
- `src-tauri/src/**`: Inline Rust unit tests appear within source files such as `src-tauri/src/storage/repositories/workspace_repo.rs`.
- `src-tauri/tests/fixtures/openapi/`: Backend import test fixtures.

## Naming Conventions

**Files:**
- Vue SFC components use PascalCase filenames: `src/components/layout/AppHeader.vue`, `src/features/request-compose/components/RequestBodySection.vue`.
- Composables use `useX` camelCase filenames: `src/features/app-shell/composables/useAppShell.ts`, `src/features/request-workbench/composables/useRequestPanelState.ts`.
- Feature helpers and domain files use kebab-case: `src/features/app-shell/domain/url-resolution.ts`, `src/features/request-compose/request-compose.helpers.ts`.
- Rust modules use snake_case filenames: `src-tauri/src/services/request_service.rs`, `src-tauri/src/storage/repositories/history_repo.rs`.
- Barrel exports use `index.ts`: `src/components/layout/index.ts`, `src/features/request-compose/index.ts`.

**Directories:**
- Frontend directories are domain-oriented and kebab-case at the feature level: `src/features/app-shell/`, `src/features/request-compose/`, `src/features/request-workbench/`.
- Shared UI primitives are grouped by component family under `src/components/ui/`.
- Backend directories reflect architectural layers instead of feature slices: `src-tauri/src/commands/`, `src-tauri/src/services/`, `src-tauri/src/core/`, `src-tauri/src/storage/`.

## Where to Add New Code

**New Frontend Feature Behavior:**
- Primary code: Add orchestration to the closest feature module under `src/features/`; for app-wide behavior start in `src/features/app-shell/`.
- Tests: Add colocated `*.test.ts` next to the changed module or extend suites under `src/features/app-shell/test/` when the change is workflow-level.

**New Presentational Component:**
- Implementation: Put reusable shell or shared UI in `src/components/`; put feature-specific UI in that feature’s `components/` directory such as `src/features/request-compose/components/`.

**New Composable or State Logic:**
- Implementation: Use `src/features/<feature>/composables/` for orchestration hooks and `src/features/<feature>/state/` for store/services/dialogs when state complexity justifies it.

**New Pure Domain Logic:**
- Implementation: Add pure transforms/selectors to `src/features/<feature>/domain/` or `src/lib/` if reused across features.

**New Tauri Command:**
- Implementation: Add a domain file or extend an existing file under `src-tauri/src/commands/`, wire it in `src-tauri/src/lib.rs`, and keep business logic in `src-tauri/src/services/`.

**New Backend Persistence Logic:**
- Implementation: Add repository code under `src-tauri/src/storage/repositories/`, expose it through `src-tauri/src/storage/db.rs`, and consume it from a service.

**New Shared Types:**
- Implementation: Extend `src/types/request.ts` for frontend contracts and the matching Rust DTO module under `src-tauri/src/models/`.

**Utilities:**
- Shared helpers: Put generic frontend utilities in `src/lib/`; avoid placing cross-feature helpers inside a single component directory.

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn-vue style primitive wrappers and low-level reusable controls.
- Generated: No.
- Committed: Yes.

**`src-tauri/src/storage/migrations/sql/`:**
- Purpose: Versioned SQLite migration scripts.
- Generated: No.
- Committed: Yes.

**`src-tauri/tests/fixtures/openapi/`:**
- Purpose: Backend import fixtures for tests and parsing edge cases.
- Generated: No.
- Committed: Yes.

**`dist/`:**
- Purpose: Built frontend assets.
- Generated: Yes.
- Committed: Yes in the current working tree.

**`openspec/changes/archive/`:**
- Purpose: Historical accepted change records.
- Generated: No.
- Committed: Yes.

## Placement Guidance

- Put new app-wide orchestration behind `useAppShell`-adjacent files instead of expanding `src/App.vue`.
- Keep components event-driven; move persistence, runtime calls, and workflow branching into `src/features/app-shell/state/` or other feature composables.
- Reuse `src/lib/tauri-client.ts` as the only frontend bridge to Rust; do not call `@tauri-apps/api/core` directly from scattered components.
- Reuse `src/lib/request-workspace.ts` for cloning/default/session helpers before creating new request-state utilities.
- Keep Rust commands thin and move non-trivial logic into `src-tauri/src/services/` or `src-tauri/src/core/`.
- Route all SQLite access through `src-tauri/src/storage/db.rs` and repository modules instead of embedding SQL in commands or services.

---

*Structure analysis: 2026-04-06*
