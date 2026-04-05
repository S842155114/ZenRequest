# Architecture Patterns

**Domain:** Local-first desktop API workbench
**Researched:** 2026-04-06

## Recommended Architecture

ZenRequest should continue as a layered local-first desktop system with one clear seam between the Vue workbench and the Rust runtime. The current split is directionally right: `src/App.vue` stays thin, `src/features/app-shell/composables/useAppShell.ts` owns top-level orchestration, `src/lib/tauri-client.ts` is the only frontend bridge to Tauri, and `src-tauri/src/lib.rs` exposes a narrow command surface over backend services.

The next milestone should preserve that shape but tighten it into a more explicit pipeline:

`UI components` → `feature composables / app-shell store` → `frontend domain helpers` → `runtime bridge` → `Tauri commands` → `backend services` → `protocol runtimes` + `storage repositories`

That structure fits the product’s local-first and extensible goals because it keeps interaction logic in the frontend, durable execution and persistence in Rust, and protocol growth behind stable backend interfaces instead of scattering capability-specific logic into Vue components.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/App.vue` | Root composition only; mount startup, shell, dialogs, toasts | `src/features/app-shell/composables/useAppShell.ts` |
| `src/features/app-shell/composables/` | App-wide orchestration, startup, effects, view-model shaping | `src/features/app-shell/state/`, `src/lib/tauri-client.ts` |
| `src/features/app-shell/state/` | Central app state, selectors, mutations, workflow handlers | `src/features/app-shell/domain/`, `src/lib/request-workspace.ts`, services created in app shell |
| `src/features/*/domain/` | Pure feature rules and transforms | State/composables only |
| `src/components/` and `src/features/*/components/` | Presentation, input capture, event forwarding | Feature view-model props and callbacks |
| `src/lib/tauri-client.ts` | Sole frontend RPC adapter; DTO translation and runtime capabilities surface | `src-tauri/src/commands/*.rs` via Tauri `invoke` |
| `src/lib/request-workspace.ts` | Pure request/workspace/session cloning, defaults, snapshot helpers | Frontend state and tests |
| `src-tauri/src/commands/` | Thin RPC boundary; validate inputs, map errors, return envelopes | `src-tauri/src/services/` |
| `src-tauri/src/services/` | Use-case orchestration for requests, imports, history, environments, collections | `src-tauri/src/core/`, `src-tauri/src/storage/db.rs` |
| `src-tauri/src/core/` | Protocol/runtime internals: HTTP execution, MCP execution, import compilation, capability registry | Services only |
| `src-tauri/src/storage/repositories/` and `src-tauri/src/storage/db.rs` | Persistence and migrations, no UI/workflow decisions | Services only |

### Extension Rule For Future Capabilities

Future capabilities should plug into one of three places, not invent a new cross-cutting path:

1. **New user workflow**: add to a feature module under `src/features/`, then call existing services through `src/lib/tauri-client.ts`.
2. **New backend use case**: add a new command/service pair under `src-tauri/src/commands/` and `src-tauri/src/services/`.
3. **New protocol/import/execution capability**: add it under `src-tauri/src/core/` and expose its availability through the runtime capabilities model already typed in `src/lib/tauri-client.ts`.

That means AI-assisted request generation, richer MCP tooling, test runners, or plugin-like packaging should be treated as capabilities behind the backend runtime boundary first, with the frontend consuming them as declared features rather than embedding business logic in the shell.

## Data Flow

### Current Good Path

The repo already shows the right top-level flow:

1. User intent starts in UI components such as request, response, sidebar, and shell views under `src/components/` and `src/features/app-shell/components/`.
2. Events are handled by the view model returned from `src/features/app-shell/composables/useAppShell.ts`.
3. State transitions are routed through `src/features/app-shell/state/app-shell-store.ts` and related app-shell service/dialog modules.
4. Runtime work crosses the single frontend seam in `src/lib/tauri-client.ts`.
5. Tauri dispatches into `src-tauri/src/commands/*.rs`, then `src-tauri/src/services/*.rs`.
6. Services call `src-tauri/src/core/request_runtime.rs`, `src-tauri/src/core/request_executor.rs`, `src-tauri/src/core/mcp_runtime.rs`, or persistence via `src-tauri/src/storage/db.rs` and repository files.
7. Structured results return to the frontend and are projected into request tabs, history, and response panels.

### Recommended Stable Flows

**Request execution flow**

`Request editor UI` → `app-shell/request feature state` → `src/lib/tauri-client.ts` `sendRequest`/`sendMcpRequest` → `src-tauri/src/commands/request.rs` → `src-tauri/src/services/request_service.rs` → protocol runtime in `src-tauri/src/core/` → normalized result + history persistence → frontend state update.

**Workspace persistence flow**

Frontend mutations update local reactive state first, then persistence is scheduled through app-shell effects/services; Rust remains source of truth for durable storage, while `src/lib/request-workspace.ts` continues to own clone/default/snapshot logic on the frontend.

**Capability discovery flow**

Backend capability registration should originate in `src-tauri/src/core/runtime_capabilities.rs`, be included in bootstrap payloads from Rust, exposed in `src/lib/tauri-client.ts`, and then used by feature composables to decide whether to render or enable advanced UI. Do not hardcode feature availability in components.

### Data Ownership

- **Frontend owns** transient UI state, layout state, tab state, dialog state, in-progress editing, and view projections.
- **Rust owns** durable execution semantics, protocol behavior, import parsing, history persistence, environment resolution at execution time, and capability registration.
- **Shared DTOs own** the contract. If a capability changes the request or response shape, update the shared contract in `src/types/request.ts` and matching Rust models together.

## Patterns to Follow

### Pattern 1: Thin Root, Heavy Feature Shell
**What:** Keep `src/App.vue` as composition only; push branching, side effects, and workflow logic into app-shell composables and state modules.
**When:** Any app-wide startup, dialog, navigation, or cross-panel feature.
**Why:** This preserves a stable root and keeps future capabilities from turning the top-level component into an untestable god object.

### Pattern 2: Single Frontend Runtime Bridge
**What:** All frontend-to-backend calls go through `src/lib/tauri-client.ts`.
**When:** Any new command, import action, execution action, capability lookup, or file save/open flow.
**Why:** It preserves testability, DTO consistency, and a single place to evolve transport/runtime behavior.

### Pattern 3: Service-Orchestrated Backend
**What:** Commands stay thin; services own use-case flow; core modules own protocol internals.
**When:** Adding new request kinds, importers, execution hooks, or automation features.
**Why:** It prevents command files from accumulating business logic and lets protocol-specific code evolve independently.

### Pattern 4: Capability-Driven Expansion
**What:** Treat future systems as registered capabilities, not ad hoc flags.
**When:** MCP expansion, plugin packaging, tool calling, AI-assisted generation, offline documentation transforms.
**Why:** ZenRequest’s likely future is a broader workbench; capabilities let the app expose advanced features without collapsing domain boundaries.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Feature Logic Inside Vue Components
**What:** Adding request execution rules, import parsing, or capability gating directly inside `.vue` files.
**Why bad:** It duplicates logic, weakens tests, and makes UI rewrites risky.
**Instead:** Keep components event-driven and route logic through composables/state/domain helpers.

### Anti-Pattern 2: Direct `invoke` Calls Outside `src/lib/tauri-client.ts`
**What:** Calling Tauri APIs from scattered features or components.
**Why bad:** It fractures the RPC contract and makes capability evolution harder.
**Instead:** Extend `src/lib/tauri-client.ts` and keep one bridge.

### Anti-Pattern 3: Mixing Storage With Protocol Runtime
**What:** Letting runtime modules perform ad hoc SQL or letting repositories know about HTTP/MCP semantics.
**Why bad:** It entangles persistence with execution behavior and makes new protocols harder to add.
**Instead:** Services coordinate runtime + repository calls.

### Anti-Pattern 4: Plugin Architecture Before Stable Internal Seams
**What:** Designing a heavy plugin framework before command/service/core boundaries are fully settled.
**Why bad:** It adds abstraction cost before the core execution model stabilizes.
**Instead:** First standardize capabilities and internal extension points, then expose only proven seams.

## Suggested Build Order

1. **Stabilize app-shell orchestration boundary**
   - Keep app-wide workflow in `src/features/app-shell/composables/` and `src/features/app-shell/state/`.
   - Prevent new global logic from leaking back into `src/App.vue`.
2. **Harden shared contracts**
   - Normalize request, response, history, capability, and import DTOs across `src/types/request.ts`, `src/lib/tauri-client.ts`, and `src-tauri/src/models/`.
   - This is the prerequisite for adding future protocols safely.
3. **Formalize capability registry usage**
   - Make all future advanced functionality discoverable from backend bootstrap/runtime capabilities instead of frontend flags.
4. **Split execution concerns by engine**
   - Continue separating generic request orchestration in `src-tauri/src/services/request_service.rs` from protocol-specific implementations in `src-tauri/src/core/request_runtime.rs` and `src-tauri/src/core/mcp_runtime.rs`.
   - Future engines should follow the same pattern.
5. **Introduce new feature slices for new user-facing workflows**
   - Add dedicated frontend feature modules for things like advanced MCP workbench flows, assertions/test runner UX, or AI-assisted request generation.
   - Reuse app-shell only for cross-feature composition.
6. **Only then expose external extension seams**
   - If plugin manifests or tool packaging become real features, expose them as capability-backed backend modules first, then add frontend management UI.

## Integration Guidance For Future Capabilities

### AI / Agent Features

AI features should not live inside `src/features/app-shell/composables/useAppShell.ts` as bespoke prompt logic. Instead:
- frontend feature module handles prompt inputs, results review, and user approval UX;
- backend service layer owns document-to-request, tool-call planning, or offline assistant orchestration;
- generated requests still enter the same collection/request/history model already used by the workbench.

### MCP Expansion

The current MCP path should evolve as a sibling engine to HTTP, not a special-case branch everywhere. Keep MCP request modeling in shared types, MCP execution in `src-tauri/src/core/mcp_runtime.rs`, and MCP-specific UI in `src/features/mcp-workbench/` or another dedicated feature slice.

### Import / Export / Packaging

All importers and future exporters should follow the existing import runtime pattern: parse and normalize in backend core, orchestrate in services, persist through repositories, then surface diagnostics back to the UI. Avoid parsing OpenAPI, cURL, or future formats in the browser when Rust can provide one durable implementation.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| App complexity | Single app-shell store is acceptable | Split feature stores behind app-shell composition | Keep app-shell as composition root, not universal store |
| Protocol support | HTTP + MCP fits current layering | Add per-protocol runtime modules in `src-tauri/src/core/` | Standardize protocol engine interface behind service orchestration |
| Persistence volume | SQLite history and collections are fine | Add pruning, indexing, artifact retention policy | Keep local DB, but segment large artifacts and cache-heavy data |
| Feature growth | Feature folders are enough | Add clearer feature ownership and DTO versioning | Capability registry and bounded contexts become mandatory |

## Sources

- `.planning/PROJECT.md` — HIGH confidence
- `.planning/codebase/ARCHITECTURE.md` — HIGH confidence
- `.planning/codebase/STRUCTURE.md` — HIGH confidence
- `src/App.vue` — HIGH confidence
- `src/features/app-shell/composables/useAppShell.ts` — HIGH confidence
- `src/lib/tauri-client.ts` — HIGH confidence
- `src/lib/request-workspace.ts` — HIGH confidence
- `src-tauri/src/lib.rs` — HIGH confidence
- `src-tauri/src/services/request_service.rs` — HIGH confidence
