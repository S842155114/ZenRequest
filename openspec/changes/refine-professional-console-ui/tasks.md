## 1. Visual Foundation

- [ ] 1.1 Refine the global workbench design tokens in `src/style.css` so background, panel, border, text, state, and accent rules express a more precise professional-console language in both light and dark themes.
- [ ] 1.2 Normalize shared surface treatments for buttons, tabs, badges, inputs, dropdowns, and context menus so action priority and feedback semantics stay consistent across the shell.

## 2. Shell Surfaces

- [ ] 2.1 Re-style `AppHeader` into a more instrument-like top control bar that preserves the existing three-zone contract while improving brand, context, and utility differentiation.
- [ ] 2.2 Re-style `AppSidebar` into a clearer resource browser with stronger hierarchy, active-item emphasis, and more deliberate collection/request/history scanning cues.

## 3. Main Workbench Surfaces

- [ ] 3.1 Re-style `RequestPanel` so tabs, primary actions, and secondary editing sections read more clearly as a request construction workspace.
- [ ] 3.2 Re-style `ResponsePanel` so lifecycle state, transport metadata, and inspection tabs read more clearly as a diagnostic and result-review workspace.

## 4. Verification

- [ ] 4.1 Add or update frontend tests that assert the retained structure and any new visual-state hooks needed for header, sidebar, request, and response styling contracts.
- [ ] 4.2 Run `pnpm test` plus targeted manual verification of light/dark themes, desktop/compact layouts, action-priority cues, active-selection treatment, and response-state readability.
