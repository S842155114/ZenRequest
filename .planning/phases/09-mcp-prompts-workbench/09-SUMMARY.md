# Phase 09 Summary — MCP Prompts Workbench

## Delivered

Phase 09 extends the MCP workbench from tools/resources into explicit prompt discovery and prompt invocation flows, while tightening the MCP editing layout to reduce duplicated configuration noise.

Implemented behavior:
- MCP operation model now supports `prompts.list` and `prompts.get`
- MCP request authoring UI now exposes explicit prompt discovery and prompt execution flows
- `prompts.get` follows discovery-first semantics while still allowing manual prompt name fallback
- prompt arguments support structured form rendering when prompt argument definitions are available, with raw JSON fallback retained
- MCP workbench layout now consolidates transport, operation, endpoint, and header context into a tighter single configuration area rather than repeating the same metadata across stacked sections
- prompt responses continue to use the existing generic protocol/result/history/replay pipeline
- prompt replay preserves selected prompt and cached prompt discovery context

## Scope Boundaries Kept

The phase intentionally does **not** add:
- MCP roots support
- stdio transport
- sampling
- multi-server management
- rich prompt-specific renderers beyond the generic protocol/result views

## Key Implementation Notes

- Reused the existing MCP operation-driven architecture instead of introducing a prompt-specific subsystem
- Extended TypeScript request/artifact/history contracts and Rust DTO/runtime mapping in parallel
- Added a dedicated `discoverMcpPrompts` seam alongside the existing tools/resources discovery flows
- Kept prompt arguments aligned with the existing schema-form pipeline by synthesizing an object schema from discovered prompt argument metadata
- Preserved the current history/replay philosophy: discovery data improves editing ergonomics, while replay still derives from the recorded request + response evidence
- Recorded the branch execution rule in `.planning/STATE.md`: new phase execution must start on a dedicated branch instead of `main`

## Validation

Executed successfully:
- `pnpm exec vue-tsc --noEmit`
- `pnpm exec vitest run src/features/mcp-workbench/components/McpRequestPanel.test.ts src/features/app-shell/state/app-shell-services.test.ts src/features/app-shell/test/history.suite.ts src/lib/tauri-client.test.ts src/stage-gate.test.ts`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Requirements Coverage

- `MCPP-01` — covered by explicit `prompts.list` discovery flow
- `MCPP-02` — covered by explicit `prompts.get` operation with discovery-first and manual fallback behavior
- `MCPP-03` — covered by structured/raw prompt argument authoring based on discovered prompt argument definitions
- `MCPP-04` — covered by history summary + replay continuity for prompt requests
- `MCPP-05` — covered by MCP workbench layout convergence that reduces duplicated MCP configuration chrome
