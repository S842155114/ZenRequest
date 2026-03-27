## 1. Compose Surface Hierarchy

- [x] 1.1 Refactor the expanded request workbench header so tab-strip navigation and panel-shell chrome no longer duplicate the active request identity already shown in the compose command bar
- [x] 1.2 Update request workbench tests to cover the revised expanded-header hierarchy and ensure collapsed summaries still expose the needed request context

## 2. Section Density Cues

- [x] 2.1 Add count-badge derivation for `Body`, `Auth`, and `Env` using the body-mode-aware and auth-mode-aware rules defined in the spec
- [x] 2.2 Update request-params tests to verify section badges react correctly when body mode, form-data rows, auth mode, and environment-variable enablement change

## 3. Row Control Styling

- [x] 3.1 Replace the current textual row enable badge with a lower-noise enabled-state control across params, headers, form-data, and environment variables
- [x] 3.2 Ensure disabled rows continue to communicate inactive state through row styling and remain directly re-enableable from the same control location

## 4. Segmented Control Consistency

- [x] 4.1 Normalize body-mode and auth-mode segmented buttons onto a shared neutral base style so only the selected option receives active treatment
- [x] 4.2 Regress the request workbench segmented controls to confirm inactive options such as `JSON` and `None` no longer retain residual shadow or active emphasis after switching

## 5. Verification

- [x] 5.1 Run targeted component tests for request workbench hierarchy, section badges, row controls, and segmented-control state
- [x] 5.2 Run `pnpm test` and `pnpm build` after the compose-surface polish is complete

## 6. Dense Tab Strip

- [x] 6.1 Compress expanded request tabs into a denser single-line layout that prioritizes method, truncated request name, one compact state indicator, and the close action
- [x] 6.2 Update request-panel tests to cover compact tab density and compact lifecycle indicator behavior in multi-tab workflows
- [x] 6.3 Re-run targeted request workbench tests plus `pnpm test` and `pnpm build` after the tab-strip compaction lands
