# Phase 17 — State Ownership Map

**Phase:** 17  
**Status:** Drafted for execution  
**Date:** 2026-04-15

## Purpose

Define which classes of ZenRequest state are durable, cached, and ephemeral so later phases can improve persistence reliability, secret safety, and explainable replay against a clear truth model.

## Ownership Principle

ZenRequest should distinguish:
- **durable state** — user assets and trusted execution records that must survive process restarts and act as persistence truth
- **cached state** — convenience or performance state that may be dropped and rebuilt
- **ephemeral state** — transient UI/runtime state that should not default into persistence

## Durable State

Durable state is persisted in backend/SQLite-backed storage and should be treated as the primary truth source.

### Durable categories

#### Authored assets
- request presets and authored request drafts that are intentionally saved
- collections and workspace-owned request organization
- environments and authored variables/configuration that are user assets
- workspace summaries and explicit active workspace linkage when stored as durable application state

#### Trusted execution records
- history entries required for replay and diagnostics
- execution-derived records needed to explain prior runs
- compact but trustworthy execution identity/timing/result linkage
- replay-critical resolved execution data that later phases may formalize under execution envelope

#### Necessary diagnostics metadata
- metadata needed to explain why a run failed or what boundary/context affected the result
- stable diagnostic classifications and structured failure summaries needed for recovery or replay understanding

Durable state should be sourced primarily through backend services and repositories such as:
- `src-tauri/src/storage/repositories/request_repo.rs`
- `src-tauri/src/storage/repositories/history_repo.rs`
- `src-tauri/src/storage/repositories/workspace_repo.rs`
- `src-tauri/src/services/bootstrap_service.rs`

## Cached State

Cached state can improve startup feel or runtime convenience, but it is not persistence truth.

### Cached categories

#### Browser convenience snapshot
- browser local snapshot used to reopen UI/session shape faster
- convenience projections for restoring visible layout or recent in-memory shell context
- non-authoritative session restoration helpers read by `useAppShell` and request-workspace snapshot helpers

#### Rebuildable discovery and derived state
- derived capability or discovery surfaces that can be reloaded from backend bootstrap or runtime sources
- summary projections that can be recomputed from durable request/history/workspace records
- local convenience state whose loss harms UX but not correctness

#### Optional view restoration helpers
- recently selected tab or visible panel proportions when treated as convenience rather than truth
- layout-specific cached preferences that can be safely re-derived or reset

Browser local snapshot belongs here. It is useful, but it is **not** durable truth.

## Ephemeral State

Ephemeral state should stay in memory for the current UI/runtime session only.

### Ephemeral categories

#### UI transient state
- toast state
- hover/focus/open-panel interaction state
- temporary mobile explorer open/closed state
- temporary layout interaction state used only during the current render session

#### Runtime handles and connection state
- in-flight request state
- runtime handles, timers, and pending UI task markers
- temporary connection/session handles that are only valid during the current process lifetime

#### Temporary MCP session internals
- unstable runtime-only MCP session internals
- short-lived transport/session details that do not carry stable replay or durable semantics yet
- intermediate protocol exchange context that should not silently become persisted truth

#### Unstable temporary context
- any temporary context without a clearly defined durable or replay-safe meaning
- partial state created only to complete the current interaction flow

## State Category Mapping by Domain

### Request authoring state
- Saved request presets: **durable**
- Unsaved in-tab draft convenience: **cached** if intentionally preserved for UX, otherwise **ephemeral**
- UI-only field focus/open editor state: **ephemeral**

### Response preview state
- Stable replay/history-facing result summaries: **durable** when part of trusted execution record
- current open response tab rendering/view mode: **cached** or **ephemeral** depending on whether it is intentionally restored
- scroll position and temporary preview toggles: **ephemeral**

### MCP session/runtime state
- stable replay-relevant MCP execution records: **durable**
- rebuildable discovery caches and convenience snapshots: **cached**
- transport handles, unstable session internals, active live connection state: **ephemeral**

### Diagnostics state
- trusted diagnostic summaries tied to execution history: **durable**
- convenience-only local warning banners or dismissed UI notices: **cached** or **ephemeral**
- temporary troubleshooting UI state: **ephemeral**

### Startup hydration inputs
- backend bootstrap payload built from durable storage: **durable source**
- browser local snapshot read by `readWorkspaceSnapshotResult()`: **cached source**
- in-memory boot process state such as `startupState` and temporary recovery messaging: **ephemeral**

## Startup Restore Precedence

### Rule

Startup restore uses **backend durable state first**, with browser snapshot only filling cached state.

### Precedence order

1. Load durable backend truth via bootstrap payload
2. Merge in browser local snapshot only for fields explicitly treated as cached/convenience state
3. Ignore or discard browser snapshot values that conflict with durable truth
4. Keep current-process boot flags and transient UI state ephemeral

### Why this rule exists

The current repo already shows startup hydration spanning two persistence systems:
- browser local snapshot through `src/lib/request-workspace.ts`
- SQLite-backed bootstrap through `src-tauri/src/services/bootstrap_service.rs` and repository-backed data loading

Without a hard precedence rule, state restoration becomes hard to explain and fragile under malformed local snapshot or mixed-version data.

## Browser Snapshot vs Backend Persistence

### Browser local snapshot
- role: auxiliary cache layer
- purpose: improve UX and startup continuity
- reliability: may be malformed, stale, or discarded
- truth status: **not durable truth**

### Backend persistence
- role: durable truth for authored assets and trusted execution records
- purpose: persistence of long-lived user state and replay-worthy execution history
- reliability: higher trust boundary than browser snapshot, though still subject to recovery work in Phase 18
- truth status: **primary truth source**

## Default Classification Rules

If a state class is ambiguous:
- classify it as **ephemeral** unless it has a clear stable semantic meaning and durable value
- classify it as **cached** only if it is useful for UX and safe to drop
- classify it as **durable** only if users would reasonably expect it to survive restarts as a trusted asset or trusted execution record

## Implications for Later Phases

- Phase 18 can now treat browser local snapshot corruption as cache failure rather than truth failure
- Phase 19 can apply secret-safe rules differently across authored, resolved, durable, cached, and ephemeral boundaries
- Phase 20 can attach explainability to trusted execution records without making every runtime/session detail durable
