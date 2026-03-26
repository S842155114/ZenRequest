## 1. Frontend Foundation

- [x] 1.1 Audit the current frontend surface inventory and identify which layout, dialog, menu, tooltip, card, and navigation primitives must be replaced or added from `shadcn-vue`.
- [x] 1.2 Refactor the top-level frontend shell in `src/App.vue` and related layout components so the overall application composition aligns with the current Postman-style workbench hierarchy.
- [x] 1.3 Normalize shared visual tokens in `src/style.css` so spacing, typography, panel chrome, toolbar density, borders, and status accents come from one cohesive system.

## 2. Primary Workbench Surfaces

- [x] 2.1 Rebuild the explorer/sidebar experience for denser workspace, collections, history, search, and creation flows while aligning structure and styling with the new shell.
- [x] 2.2 Rework the request authoring surface so method selection, URL entry, send action, tabs, and detail sections match the new Postman-inspired hierarchy and composition.
- [x] 2.3 Refresh the response inspection surface so metadata, tabs, content panes, and supporting tools read as a dedicated inspection area with the same visual system.

## 3. Supporting UI Surfaces

- [x] 3.1 Refactor dialogs, menus, dropdowns, tooltips, and supporting controls to use `shadcn-vue` components wherever practical and align them with the new frontend visual language.
- [x] 3.2 Implement constrained-width behavior that converts secondary navigation/explorer surfaces into temporary sheet or drawer patterns instead of shrinking all panes uniformly.
- [x] 3.3 Ensure opening, closing, or switching shell navigation surfaces preserves the active workspace, request tab, and response inspection context.

## 4. Internationalization Alignment

- [x] 4.1 Audit visible frontend copy in Vue components and move hard-coded user-facing strings into the i18n message layer.
- [x] 4.2 Update supporting message structures in `src/lib/i18n.ts` so the redesigned shell and supporting surfaces can render entirely from i18n-managed copy.

## 5. Verification

- [x] 5.1 Add or update frontend tests for the redesigned shell, including workbench region behavior, responsive navigation behavior, and preserved editing context.
- [ ] 5.2 Run `pnpm build` and `pnpm test`, then perform a manual UI verification pass for key request-editing, response-inspection, dialog, and language-switching flows in the desktop shell.
