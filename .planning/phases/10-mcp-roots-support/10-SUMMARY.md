---
phase: 10
phase_name: MCP Roots Support
status: completed
completed: 2026-04-07
plan: .planning/phases/10-mcp-roots-support/10-PLAN.md
context: .planning/phases/10-mcp-roots-support/10-CONTEXT.md
research: .planning/phases/10-mcp-roots-support/10-RESEARCH.md
---

# Phase 10 Summary — MCP Roots Support

## Outcome

Phase 10 adds minimal MCP `roots` support to the existing single-server MCP workbench without introducing a new MCP operation family or a parallel settings subsystem.

The implemented flow treats roots as session-level client context:

- developers can add, edit, and remove roots in the MCP workbench
- `initialize` automatically declares client `roots` capability
- executed MCP artifacts preserve the configured roots snapshot
- history / replay retain roots-related execution context for diagnosis

## Delivered

### 1. Session-level roots contract

Extended the MCP request and execution models with a minimal roots snapshot:

- `uri` (required in practice, filtered if blank at runtime)
- `name` (optional)

Updated both frontend and Rust DTO layers so roots move through the existing MCP request pipeline as session context.

### 2. MCP workbench roots editor

Added a compact roots editor to the MCP workbench main area.

Supported interactions:

- add a root row
- edit `uri`
- edit optional `name`
- remove a root row

This stays aligned with the current MCP workbench layout and avoids adding separate top-level configuration chrome.

### 3. Initialize capability wiring

Updated MCP runtime request construction so `initialize` now declares:

- `capabilities.roots.listChanged = false`

This preserves the current protocol flow while making roots support explicit to compatible MCP servers.

### 4. Artifact / history continuity

Extended artifact cloning and store recovery paths so executed roots snapshots are preserved across:

- response artifacts
- history entries
- replay hydration
- workspace cloning

This keeps roots evidence attached to the executed MCP session without turning roots into a separate summary subsystem.

## Files changed

- `src/types/request.ts`
- `src/lib/request-workspace.ts`
- `src/lib/i18n.ts`
- `src/features/mcp-workbench/components/McpRequestPanel.vue`
- `src/features/mcp-workbench/components/McpRequestPanel.test.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src-tauri/src/models/request.rs`
- `src-tauri/src/models/mod.rs`
- `src-tauri/src/core/mcp_runtime.rs`

## Verification

Completed validation:

- `pnpm exec vue-tsc --noEmit`
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/lib/request-workspace.test.ts src/lib/tauri-client.test.ts src/stage-gate.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes

- This phase keeps roots scoped to the current single-server HTTP MCP workbench path.
- It does **not** add stdio roots handling, multi-server roots management, file browsing, or a new user-triggered `roots.list` operation.
- The current runtime implementation surfaces roots through the existing protocol/artifact chain with minimal scope expansion, matching the phase goal of “能配、能传、能查、能回放”.
