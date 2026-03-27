## 1. Visual Foundation

- [x] 1.1 Refine the global workbench design tokens in `src/style.css` so background, panel, border, text, state, and accent rules express a more precise professional-console language in both light and dark themes.
- [x] 1.2 Normalize shared surface treatments for buttons, tabs, badges, inputs, dropdowns, and context menus so action priority and feedback semantics stay consistent across the shell.
- [x] 1.3 Introduce shared workbench carrier and seam tokens in `src/style.css` so panel spacing, shell radii, border layering, and splitter feedback read as docked console segments rather than floating cards.

## 2. Shell Surfaces

- [x] 2.1 Re-style `AppHeader` into a more instrument-like top control bar that preserves the existing three-zone contract while improving brand, context, and utility differentiation.
- [x] 2.2 Re-style `AppSidebar` into a clearer resource browser with stronger hierarchy, active-item emphasis, and more deliberate collection/request/history scanning cues.

## 3. Main Workbench Surfaces

- [x] 3.1 Re-style `RequestPanel` so tabs, primary actions, and secondary editing sections read more clearly as a request construction workspace.
- [x] 3.2 Re-style `ResponsePanel` so lifecycle state, transport metadata, and inspection tabs read more clearly as a diagnostic and result-review workspace.
- [x] 3.3 Re-style the main workbench shell in `src/App.vue` and align `AppSidebar`, `RequestPanel`, and `ResponsePanel` edge treatments so desktop and compact layouts read as connected docked segments while preserving resize and collapse behavior.

## 4. Verification

- [x] 4.1 Add or update frontend tests that assert the retained structure and any new visual-state hooks needed for header, sidebar, request, and response styling contracts.
- [x] 4.2 Add or update app-level tests that assert the shared workbench carrier, seam-styled resize handles, and connected panel layout contracts.
- [x] 4.3 Run `pnpm test`, `pnpm build`, plus targeted manual verification of light/dark themes, desktop/compact connected seams, action-priority cues, active-selection treatment, and response-state readability.
