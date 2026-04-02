## Why

`src/features/app-shell/composables/useAppShell.ts` has become a high-risk orchestration hotspot that mixes framework-neutral state rules, runtime-backed use cases, dialog workflows, Vue/browser effects, and component-facing bindings in one file. This change is needed now because upcoming AI, agent, and MCP-oriented work will add more orchestration pressure, and the current shell structure makes those changes harder to implement and verify safely.

## What Changes

- Extract framework-neutral app-shell state, selectors, and semantic mutations from `useAppShell.ts` into a dedicated store module.
- Introduce app-shell application services for runtime-backed flows such as bootstrap, workspace switching, request send/save, and OpenAPI import, with services mutating store state directly and returning structured result objects.
- Move dialog-specific workflow branching and transient submit logic into a dedicated dialog module instead of keeping a large `handleDialogSubmit` switch inside the main composable.
- Move Vue/browser-only effects such as lifecycle hooks, viewport watchers, theme sync, persistence timers, and DOM-driven import/export triggers into dedicated adapter composables.
- Preserve the current runtime contracts, workbench behavior, and component-facing shell API while reducing ownership overlap inside the shell implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-page-structure`: Tighten the workbench shell decomposition requirements so oversized app-shell orchestration is split into framework-neutral state and service modules plus explicit dialog, effect, and view-model adapters.

## Impact

- Affected specs: `openspec/specs/frontend-page-structure/spec.md`
- Affected frontend code: `src/features/app-shell/composables/useAppShell.ts`, new `src/features/app-shell/state/*` modules, new app-shell dialog/effect/view-model modules, and supporting pure helpers in `src/lib/request-workspace.ts`
- Affected tests: `src/features/app-shell/test/*.suite.ts` plus any new focused app-shell store/service tests added during extraction
- Runtime/API impact: no new backend dependency and no intended change to `src/lib/tauri-client.ts` public runtime contract
