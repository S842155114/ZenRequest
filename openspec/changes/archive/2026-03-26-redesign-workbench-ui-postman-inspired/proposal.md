## Why

ZenRequest's current frontend is still too close to an early functional prototype: layout structure, typography, spacing, panel chrome, and interaction patterns are inconsistent across the app, and the resulting experience does not yet feel comparable to a mature desktop API client. The next step is not a local workbench polish but a coordinated frontend UI overhaul that realigns the full product shell with the current Postman design language while preserving ZenRequest's runtime behavior.

## What Changes

- Rebuild the overall frontend shell and page composition so header, sidebar, request editor, response viewer, dialogs, menus, and supporting panels follow a unified Postman-inspired visual and interaction model rather than isolated local restyles.
- Align typography, spacing, density, color hierarchy, panel surfaces, iconography, tabs, toolbars, and navigation patterns with the current Postman desktop client style direction.
- Use `shadcn-vue` as the default component layer for all new or rewritten UI surfaces, only falling back to custom components when no suitable `shadcn-vue` primitive exists.
- Standardize all user-facing frontend copy to come from the project's i18n message system instead of hard-coded strings in Vue components.
- Preserve all existing request, workspace, environment, import/export, and execution behaviors while replacing presentation, composition, and interaction patterns across the frontend.

## Capabilities

### New Capabilities
- `workbench-ui`: Covers the overall frontend application shell, shared visual system, workbench layout, supporting UI surfaces, and responsive behavior for the desktop client.

### Modified Capabilities
- None.

## Impact

- Frontend shell files such as `src/App.vue`, `src/style.css`, and the layout/request/response component tree under `src/components/`.
- Potential addition of `shadcn-vue` components via `pnpm dlx shadcn-vue@latest add <component>` whenever the local component set does not cover the needed surface.
- Shared visual tokens, panel layouts, responsive behavior, dialog/menu treatment, and toolbar/navigation composition across the desktop client.
- i18n message definitions in `src/lib/i18n.ts` and any supporting copy organization needed to remove hard-coded UI strings from components.
- Frontend verification for layout behavior, responsive transitions, component composition, and regression coverage around existing request workflows.
