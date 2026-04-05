# Architecture

**Analysis Date:** 2026-04-06

## Pattern Overview

**Overall:** Local-first desktop application with a feature-oriented Vue frontend and layered Tauri/Rust backend.

**Key Characteristics:**
- `src/App.vue` is intentionally thin and delegates nearly all application orchestration to `src/features/app-shell/composables/useAppShell.ts`.
- Frontend feature logic is split between presentational components in `src/components/` and state/domain orchestration in `src/features/`.
- Backend requests cross a single runtime seam in `src/lib/tauri-client.ts`, then flow through Tauri commands in `src-tauri/src/commands/`, services in `src-tauri/src/services/`, runtime/storage layers in `src-tauri/src/core/` and `src-tauri/src/storage/`.

## Layers

**Frontend Entry Layer:**
- Purpose: Boot the Vue app and attach the top-level shell.
- Location: `src/main.ts`, `src/App.vue`
- Contains: Vue app bootstrap, root shell composition, startup gating.
- Depends on: `src/features/app-shell/index.ts`, global styles in `src/style.css`.
- Used by: Vite entrypoint and desktop webview runtime.

**Frontend Feature Orchestration Layer:**
- Purpose: Own application state, actions, dialogs, side effects, and view-model shaping.
- Location: `src/features/app-shell/composables/useAppShell.ts`, `src/features/app-shell/composables/useAppShellEffects.ts`, `src/features/app-shell/composables/useAppShellViewModel.ts`, `src/features/app-shell/state/app-shell-store.ts`, `src/features/app-shell/state/app-shell-services.ts`, `src/features/app-shell/state/app-shell-dialogs.ts`
- Contains: Reactive state creation, selectors/mutations, runtime service calls, persistence scheduling, toast/dialog orchestration, handler bindings for child panels.
- Depends on: `src/lib/tauri-client.ts`, `src/lib/request-workspace.ts`, domain helpers in `src/features/app-shell/domain/`.
- Used by: `src/App.vue`, `src/features/app-shell/components/WorkbenchShell.vue`, layout/request/response components through bound props and handlers.

**Frontend Domain Logic Layer:**
- Purpose: Keep pure decision logic separate from Vue runtime concerns.
- Location: `src/features/app-shell/domain/request-activity.ts`, `src/features/app-shell/domain/request-session.ts`, `src/features/app-shell/domain/history-replay.ts`, `src/features/app-shell/domain/url-resolution.ts`
- Contains: URL resolution, history replay transforms, request activity projection, session shaping.
- Depends on: Shared request types from `src/types/request.ts`.
- Used by: `src/features/app-shell/state/app-shell-store.ts` and related tests.

**Frontend Shared Runtime/Utility Layer:**
- Purpose: Provide reusable runtime boundary code, cloning/default logic, i18n, and UI-level helpers.
- Location: `src/lib/tauri-client.ts`, `src/lib/request-workspace.ts`, `src/lib/i18n.ts`, `src/lib/resource-context-menu.ts`, `src/lib/response-code-viewer.ts`
- Contains: Tauri invoke adapter, DTO typing, request/session cloning, default entities, persistence snapshot helpers, small pure utilities.
- Depends on: `@tauri-apps/api`, shared types in `src/types/request.ts`.
- Used by: Feature composables, tests, and UI components.

**Frontend Presentation Layer:**
- Purpose: Render the workbench UI and forward user intent upward through explicit events.
- Location: `src/components/layout/`, `src/components/request/`, `src/components/response/`, `src/features/request-compose/components/`, `src/features/mcp-workbench/components/`, `src/features/app-shell/components/WorkbenchShell.vue`
- Contains: Header/sidebar/dialog shell, request editor surfaces, response viewers, MCP request form, reusable shadcn-vue style primitives under `src/components/ui/`.
- Depends on: Feature bindings and handlers, shared UI primitives, localized text.
- Used by: `src/App.vue` and feature-level containers.

**Tauri Command Layer:**
- Purpose: Expose Rust functionality as narrow Tauri commands and map results into envelope responses.
- Location: `src-tauri/src/commands/workspace.rs`, `src-tauri/src/commands/request.rs`, `src-tauri/src/commands/importing.rs`, `src-tauri/src/commands/collections.rs`, `src-tauri/src/commands/environments.rs`, `src-tauri/src/commands/history.rs`, `src-tauri/src/commands/settings.rs`
- Contains: `#[tauri::command]` handlers, minimal request validation, envelope construction, command registration through `src-tauri/src/lib.rs`.
- Depends on: `src-tauri/src/services/`, `src-tauri/src/core/app_state.rs`, DTOs in `src-tauri/src/models/`.
- Used by: `src/lib/tauri-client.ts` through `invoke` calls.

**Backend Service Layer:**
- Purpose: Coordinate use cases and isolate command handlers from storage/runtime details.
- Location: `src-tauri/src/services/bootstrap_service.rs`, `src-tauri/src/services/workspace_service.rs`, `src-tauri/src/services/request_service.rs`, `src-tauri/src/services/import_service.rs`, `src-tauri/src/services/collection_service.rs`, `src-tauri/src/services/environment_service.rs`, `src-tauri/src/services/history_service.rs`
- Contains: App bootstrap assembly, request execution orchestration, import workflows, workspace CRUD, collection/environment/history behavior.
- Depends on: `src-tauri/src/core/`, `src-tauri/src/storage/db.rs`.
- Used by: `src-tauri/src/commands/`.

**Backend Runtime/Core Layer:**
- Purpose: Hold long-lived app state and protocol-specific runtime behavior.
- Location: `src-tauri/src/core/app_state.rs`, `src-tauri/src/core/request_runtime.rs`, `src-tauri/src/core/request_executor.rs`, `src-tauri/src/core/mcp_runtime.rs`, `src-tauri/src/core/import_runtime.rs`, `src-tauri/src/core/runtime_capabilities.rs`
- Contains: SQLite path initialization, capability registries, HTTP request compilation/execution helpers, MCP-over-HTTP execution, OpenAPI and cURL import logic.
- Depends on: `reqwest`, capability registries, backend models and errors.
- Used by: Services and app startup in `src-tauri/src/lib.rs`.

**Persistence Layer:**
- Purpose: Own SQLite connection setup, migrations, and repository operations.
- Location: `src-tauri/src/storage/db.rs`, `src-tauri/src/storage/connection.rs`, `src-tauri/src/storage/migrations.rs`, `src-tauri/src/storage/migrations/sql/`, `src-tauri/src/storage/repositories/*.rs`
- Contains: Database initialization, migration running, repository-specific CRUD and bootstrap assembly.
- Depends on: `rusqlite`, SQL migration files like `src-tauri/src/storage/migrations/sql/V1__baseline.sql` through `V6__request_execution_options.sql`.
- Used by: Services and `src-tauri/src/core/app_state.rs`.

**Shared Contract Layer:**
- Purpose: Keep frontend/backend payload shapes aligned.
- Location: `src/types/request.ts`, `src-tauri/src/models/app.rs`, `src-tauri/src/models/request.rs`, `src-tauri/src/models/importing.rs`, `src-tauri/src/models/envelope.rs`
- Contains: Request, response, workspace, history, import, and envelope DTOs.
- Depends on: TypeScript and Rust serialization models.
- Used by: All higher layers on both sides of the Tauri boundary.

## Data Flow

**Startup Bootstrap:**

1. `src/main.ts` mounts `src/App.vue`, which immediately consumes `useAppShell` from `src/features/app-shell/composables/useAppShell.ts`.
2. `useAppShell` seeds state from `readWorkspaceSnapshot()` in `src/lib/request-workspace.ts`, builds a store via `createAppShellStore`, and creates runtime services via `createAppShellServices`.
3. `useAppShellEffects.ts` runs `runStartupBootstrap()` on mount, which calls `runtimeClient.bootstrapApp()` in `src/lib/tauri-client.ts`.
4. `src-tauri/src/commands/workspace.rs` routes `bootstrap_app` into `src-tauri/src/services/workspace_service.rs` and capability assembly from `src-tauri/src/core/runtime_capabilities.rs`.
5. `src-tauri/src/core/app_state.rs` has already initialized SQLite and capability registries during `src-tauri/src/lib.rs` setup.
6. Bootstrap payload returns to the frontend, where `app-shell-store` applies settings, workspaces, environments, collections, history, and session state.

**Request Execution Flow:**

1. User actions in `src/components/request/RequestPanel.vue` and `src/features/request-compose/components/*.vue` emit events back to handlers exposed by `useAppShell`.
2. `src/features/app-shell/state/app-shell-store.ts` mutates open-tab state and constructs a `SendRequestPayload` from the active tab.
3. `src/features/app-shell/state/app-shell-services.ts` calls `runtimeClient.sendRequest()` or `runtimeClient.sendMcpRequest()` in `src/lib/tauri-client.ts`.
4. Tauri commands in `src-tauri/src/commands/request.rs` delegate to `src-tauri/src/services/request_service.rs`.
5. HTTP requests are compiled and executed through `src-tauri/src/core/request_runtime.rs` and `src-tauri/src/core/request_executor.rs`; MCP requests go through `src-tauri/src/core/mcp_runtime.rs`.
6. `request_service.rs` evaluates assertions, redacts sensitive data for history storage, persists history via `src-tauri/src/storage/db.rs`, and returns normalized results.
7. Frontend store mutations apply the response to the active tab, update history, and drive `src/components/response/ResponsePanel.vue`.

**Workspace Session Persistence:**

1. Watches in `src/features/app-shell/composables/useAppShellEffects.ts` observe `activeEnvironmentId`, `openTabs`, and `activeTabId`.
2. The store builds a session snapshot through `buildWorkspaceSession()` in `src/features/app-shell/state/app-shell-store.ts`.
3. `runtimeClient.saveWorkspaceSession()` in `src/lib/tauri-client.ts` invokes `save_workspace` in `src-tauri/src/commands/workspace.rs`.
4. Persistence is handled by `src-tauri/src/services/workspace_service.rs` and repository logic under `src-tauri/src/storage/repositories/workspace_repo.rs`.

**Import Flow:**

1. File inputs in `src/App.vue` trigger `handleWorkspaceImportChange` or `handleOpenApiImportChange` from `useAppShell`.
2. Dialog logic in `src/features/app-shell/state/app-shell-dialogs.ts` shapes confirmation UX and passes raw document content to `src/lib/tauri-client.ts`.
3. Tauri import commands in `src-tauri/src/commands/importing.rs` call `src-tauri/src/services/import_service.rs`.
4. Import runtime logic in `src-tauri/src/core/import_runtime.rs` parses cURL/OpenAPI data and, for apply flows, writes collections/requests via `src-tauri/src/storage/db.rs`.

**State Management:**
- Global application state is centralized in a single reactive state tree created by `createInitialAppShellState()` in `src/features/app-shell/state/app-shell-store.ts`.
- Access is mediated through explicit selectors and mutations instead of direct component mutation.
- View-specific bindings are derived in `src/features/app-shell/composables/useAppShellViewModel.ts` and passed down as props/handlers.
- Pure request/session cloning and defaults live in `src/lib/request-workspace.ts`, preventing Vue components from owning persistence shape logic.

## Key Abstractions

**App Shell Store:**
- Purpose: Central mutation/selector façade over app runtime state.
- Examples: `src/features/app-shell/state/app-shell-store.ts`
- Pattern: Store factory returning typed `selectors` and `mutations` over a reactive state object.

**Runtime Client:**
- Purpose: Single frontend boundary for all Tauri command calls and DTO translation.
- Examples: `src/lib/tauri-client.ts`, `src/lib/tauri-client.test.ts`
- Pattern: Adapter object with replaceable runtime implementation via `setRuntimeAdapter` for tests.

**Request Workspace Utilities:**
- Purpose: Shared cloning, defaults, tab construction, response normalization, and legacy snapshot handling.
- Examples: `src/lib/request-workspace.ts`, `src/lib/request-workspace.test.ts`
- Pattern: Pure utility module used by store logic, tests, and startup migration paths.

**Workbench Shell:**
- Purpose: Layout container coordinating sidebar, request panel, response panel, compact/mobile behavior, and resizable panel state.
- Examples: `src/features/app-shell/components/WorkbenchShell.vue`
- Pattern: Stateful layout component with controller refs, but business actions are forwarded through typed handler props.

**Tauri App State:**
- Purpose: Hold shared backend state for database path, cached settings, and runtime capabilities.
- Examples: `src-tauri/src/core/app_state.rs`
- Pattern: Managed singleton injected into commands through `tauri::State<'_, AppState>`.

**Repository Gateway:**
- Purpose: Centralize SQLite reads/writes behind repository modules.
- Examples: `src-tauri/src/storage/db.rs`, `src-tauri/src/storage/repositories/workspace_repo.rs`, `src-tauri/src/storage/repositories/request_repo.rs`
- Pattern: Service-to-db façade in `db.rs` delegating to repository-specific files.

## Entry Points

**Vue Application Entry:**
- Location: `src/main.ts`
- Triggers: Vite frontend bootstrap inside the Tauri webview.
- Responsibilities: Import global CSS, create Vue app, mount `App`.

**Root Shell Entry:**
- Location: `src/App.vue`
- Triggers: Rendered immediately after Vue boot.
- Responsibilities: Run `useAppShell`, gate startup screen, attach file inputs, compose header, workbench shell, dialogs, and toasts.

**Feature Barrel Entry:**
- Location: `src/features/app-shell/index.ts`
- Triggers: Imported by `src/App.vue` and tests.
- Responsibilities: Re-export shell composable, shell components, and shared types for the feature.

**Tauri Runtime Entry:**
- Location: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- Triggers: Native desktop application launch.
- Responsibilities: Initialize managed app state, register plugins, expose all Tauri commands, run generated Tauri context.

**Database Initialization Entry:**
- Location: `src-tauri/src/core/app_state.rs`, `src-tauri/src/storage/db.rs`
- Triggers: Called during Tauri `.setup()` in `src-tauri/src/lib.rs`.
- Responsibilities: Resolve app data directory, create/open SQLite database, run migrations, warm settings cache.

## Error Handling

**Strategy:** Backend-first structured errors with frontend toast/dialog surfacing.

**Patterns:**
- Rust commands return `ApiEnvelope<T>` or `Result<ApiEnvelope<T>, AppError>` from files under `src-tauri/src/commands/`, keeping failures structured across the Tauri boundary.
- Backend services and core helpers construct `AppError` values from `src-tauri/src/errors/mod.rs` instead of panicking for expected failures.
- Sensitive request and response data are redacted before history persistence in `src-tauri/src/services/request_service.rs`.
- Frontend startup and action failures are caught in `src/features/app-shell/composables/useAppShellEffects.ts` and surfaced through toast helpers created in `src/features/app-shell/composables/useAppShell.ts`.
- Mock execution and MCP transport validation are handled as explicit branches in `src-tauri/src/commands/request.rs` and `src-tauri/src/core/mcp_runtime.rs`.

## Cross-Cutting Concerns

**Logging:** Minimal explicit logging is present; the architecture relies more on structured error propagation and persisted history artifacts than on a dedicated logging subsystem.

**Validation:**
- Frontend validation is mostly action-level and UI-driven in `src/features/app-shell/state/app-shell-dialogs.ts`, `src/features/request-compose/request-compose.helpers.ts`, and feature components.
- Backend validation is enforced in command/service/runtime layers such as `src-tauri/src/services/import_service.rs` and `src-tauri/src/core/mcp_runtime.rs`.

**Authentication:**
- HTTP and MCP auth configuration is represented in shared request types under `src/types/request.ts` and DTOs in `src/lib/tauri-client.ts`.
- Auth material is applied during execution in `src-tauri/src/core/request_runtime.rs` and `src-tauri/src/core/mcp_runtime.rs`.
- Sensitive auth fields are redacted before storage in `src-tauri/src/services/request_service.rs`.

---

*Architecture analysis: 2026-04-06*
