## Why

ZenRequest has the right workbench structure, but its current frontend styling does not fully communicate the approved product position: a local-first API workbench for the AI / Agent era. The UI needs a visual recalibration now so the header, explorer, request workspace, and response diagnostics read as one coherent developer tool instead of a generic productivity shell.

## What Changes

- Refresh the frontend visual system around a light `Signal Light` palette with restrained orange action emphasis and teal runtime/automation signals.
- Rework the header to behave as a context bar, with branding kept secondary to workspace and environment context.
- Restyle the sidebar as a denser explorer surface with clearer hierarchy, workset summaries, and active-row signals.
- Rebalance the request workspace so request identity, primary actions, compose controls, and section rails read as one focused authoring surface.
- Restyle the response surface as a lighter diagnostic panel with shared state pills and clearer transport/readout hierarchy.
- Keep the current workbench layout, request flow, and data model intact while updating the visual contract across light and dark themes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workbench-ui`: Update the workbench shell, explorer, request workspace, and response diagnostics requirements so the product presents a local-first developer workbench visual system with explicit Signal Light hierarchy and consistent status language.

## Impact

- Affected specs: `openspec/specs/workbench-ui/spec.md`
- Affected frontend code: `src/style.css`, `src/components/layout/AppHeader.vue`, `src/components/layout/AppSidebar.vue`, `src/components/request/RequestPanel.vue`, `src/components/request/RequestUrlBar.vue`, `src/components/request/RequestParams.vue`, `src/components/response/ResponsePanel.vue`
- Affected tests: `src/components/layout/AppHeader.test.ts`, `src/components/layout/AppSidebar.test.ts`, `src/components/request/RequestPanel.test.ts`, `src/components/request/RequestUrlBar.test.ts`, `src/components/request/RequestParams.test.ts`, `src/components/response/ResponsePanel.test.ts`
- Delivery process: implementation will happen on a GitFlow feature branch created from `develop`, with the completed change merged back through a PR
