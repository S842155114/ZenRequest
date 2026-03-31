# ZenRequest

[简体中文](./README.md) | [English](./README.en.md)

ZenRequest is a desktop-first, local-first, privacy-first API workbench.  
It is designed as a fast, lightweight desktop tool where request authoring, runtime execution, persistence, history, and import/export stay under local control instead of being pushed into mandatory cloud workflows.

## Positioning

ZenRequest is built for developers who want:

- locally managed workspaces, collections, environments, and request history
- a Rust-owned runtime that remains authoritative for execution and persistence
- an API tool without forced login, forced sync, or telemetry-first product design
- a project with a clear architecture roadmap instead of an ever-growing frontend-only shell

Current product boundaries:

- desktop-first, built with Tauri
- Rust runtime as the authoritative execution layer
- local SQLite as the implemented persistence path
- browser-side mock adapters are for tests and local UI development, not full desktop-runtime parity

## Current Desktop Baseline

Based on the repository baseline documents and OpenSpec contracts, ZenRequest already ships a substantial desktop baseline:

### Workspace and Session

- multiple workspaces
- active workspace switching and restoration
- separately persisted workspace sessions
- open-tab, active-tab, and active-environment restoration
- preserved semantics for draft, replay, scratch, and detached tabs

### Request Authoring

- collections and saved requests
- request params, headers, and environment variable editing
- `json`, `formdata`, `raw`, and `binary` body modes
- request-local mock template editing
- request-local response test authoring

### Runtime Execution

- Rust-owned request compilation
- environment resolution and auth integration
- local HTTP execution
- mock execution through the same send flow
- runtime-side assertion evaluation and execution artifacts
- history persistence and replay restoration

### Import / Export

- workspace export
- full-application export
- workspace/application import
- `skip` / `rename` / `overwrite` conflict handling
- `curl` import into editable draft requests

### Response and UI

- response code viewer
- HTML preview
- explorer / request / response desktop workbench layout
- startup handoff and local workbench UI

Canonical references:

- [Project Baseline Readiness](./docs/project-baseline-readiness.md)
- [workbench-ui OpenSpec](./openspec/specs/workbench-ui/spec.md)

## Core Architecture

ZenRequest is organized around a three-layer model:

1. Vue Frontend  
   Rendering, editing state, themes, i18n, and short-lived interaction state

2. Tauri IPC Facade  
   Contract boundary, DTO mapping, and frontend invocation wrappers

3. Rust Core Runtime  
   Request execution, persistence, workspace data, import/export, history, and performance-sensitive logic

Key principles:

- the frontend is not the ultimate source of truth
- request compilation and assertion evaluation belong to the runtime, not browser-side logic
- workspace business data and workspace session data stay separate
- future capabilities extend through runtime seams rather than ad hoc frontend branches

Related documents:

- [Fullstack Runtime Plan](./docs/fullstack-runtime-plan.md)
- [runtime-bootstrap](./openspec/specs/runtime-bootstrap/spec.md)
- [runtime-execution-pipeline](./openspec/specs/runtime-execution-pipeline/spec.md)
- [runtime-capability-seams](./openspec/specs/runtime-capability-seams/spec.md)
- [workspace-sessions](./openspec/specs/workspace-sessions/spec.md)

## Architecture Roadmap

This project is no longer at the proof-of-concept stage. The current roadmap is about tightening architecture and release readiness on top of an already-shipped desktop baseline.

### Already Landed

- a usable local desktop workbench baseline
- Rust runtime is no longer an empty shell
- local SQLite persistence is in place
- execution, history, import/export, environments, and workspace semantics have explicit OpenSpec contracts
- the frontend shell has already gone through a feature-aligned structural refactor to reduce oversized modules

### Near-Term Priorities

- reinforce runtime authority so the frontend does not drift back into being the source of truth
- strengthen regression coverage around main desktop flows
- keep README, docs, and OpenSpec aligned with the actual implementation
- address release-readiness concerns such as the current frontend bundle-size warning

### Mid-Term Direction

- further refine Rust runtime and IPC contracts
- improve stability around import/export, workspace restoration, execution artifacts, and large-response handling
- strengthen automated verification for desktop-critical paths

### Reserved but Not Active Yet

These directions are already represented as runtime seams, but they are not active current-release features:

- additional protocol support
- more import adapters such as OpenAPI
- execution hooks
- tool packaging
- plugin manifests

Those belong to later stages and should not be described as already shipped functionality.

## Repository Layout

The most important top-level paths are:

```text
.
├─ src/                     # Vue frontend, components, feature modules
├─ src-tauri/               # Rust runtime and Tauri desktop shell
├─ openspec/specs/          # active capability specs
├─ openspec/changes/archive/# archived change records
├─ docs/                    # baseline, planning, and design docs
└─ README.md / README.en.md
```

After the latest frontend structure refactor, `src/features/` now contains feature-scoped modules for the app shell, request compose, and request workbench boundaries.

## Development

### Prerequisites

You will need:

- Node.js 18+
- `pnpm`
- a Rust toolchain, typically installed through `rustup`
- the OS dependencies required by Tauri 2

Reference:

- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install

```bash
git clone git@github.com:S842155114/ZenRequest.git
cd ZenRequest
pnpm install
```

### Common Commands

Frontend development:

```bash
pnpm dev
```

Desktop development:

```bash
pnpm tauri dev
```

Run tests:

```bash
pnpm test
```

Build frontend:

```bash
pnpm build
```

Build desktop app:

```bash
pnpm tauri build
```

## Tech Stack

- Frontend: Vue 3 + TypeScript + Vite
- Desktop Shell: Tauri v2
- Runtime: Rust
- HTTP: `reqwest`
- Persistence: SQLite via `rusqlite`
- UI / Styling: Tailwind CSS 4 + reka-ui / shadcn-vue style components
- Testing: Vitest

## Reading Guide

If you want to understand the project quickly, read these in order:

1. [Project Baseline Readiness](./docs/project-baseline-readiness.md)
2. [Fullstack Runtime Plan](./docs/fullstack-runtime-plan.md)
3. [project-baseline-readiness OpenSpec](./openspec/specs/project-baseline-readiness/spec.md)
4. [workbench-ui OpenSpec](./openspec/specs/workbench-ui/spec.md)
5. [import-export OpenSpec](./openspec/specs/import-export/spec.md)
6. [frontend-page-structure OpenSpec](./openspec/specs/frontend-page-structure/spec.md)

## Current State

ZenRequest should be understood as a desktop workbench with its mainline already present.  
The remaining work is better described as:

- release readiness
- documentation alignment
- architecture tightening
- staged future capability expansion

not as “missing core desktop functionality”.

## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE).
