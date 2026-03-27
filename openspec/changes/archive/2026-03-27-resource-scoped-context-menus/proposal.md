## Why

The current workbench exposes right-click actions too broadly, which makes empty regions and non-resource surfaces feel interactive even when there is no meaningful target. Context menus should only appear when the pointer is on a concrete resource such as a collection, saved request, or workbench tab so users can trust that right-click actions are specific and intentional.

## What Changes

- Limit application-level context menus to explicit resource surfaces in the sidebar and main workbench instead of allowing unrelated regions to react to right-click.
- Define which workbench resources support contextual actions, starting with collection headers, saved request rows, and request tab items.
- Ensure non-resource surfaces such as blank layout areas, general panel chrome, and read-only container regions do not open application context menus.
- Preserve native editing behavior for text-entry and editor controls so right-click remains available for copy, paste, and other input-level actions.
- Normalize resource-specific menu payloads so each allowed trigger surface opens actions for the targeted resource without forcing unrelated focus changes first.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workbench-ui`: Constrain context-menu behavior to supported resource surfaces and define no-op behavior for non-resource workbench regions.

## Impact

- Affects workbench interaction handling in `src/App.vue` and the component tree under `src/components/layout/` and `src/components/request/`.
- Likely introduces shared context-menu target modeling for collection, request, and tab resources.
- Requires i18n-managed copy for any new resource menu labels or descriptions.
- Requires frontend regression coverage for right-click trigger scoping, no-op zones, and preservation of native input/editor context menus.
