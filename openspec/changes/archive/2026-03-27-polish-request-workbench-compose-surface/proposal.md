## Why

The request workbench compose surface still has several presentation inconsistencies that make the active request harder to scan than it should be. The tab strip and request-builder header currently duplicate identity information, primary request sections do not expose counts consistently, row-level enable controls are visually noisy, segmented switches in body/auth controls can retain misleading active styling, and request tabs consume too much width in multi-tab workflows.

## What Changes

- Simplify the expanded request workbench header so the tab strip and request-builder identity bar no longer compete for the same attention.
- Compress expanded-mode request tabs into a denser single-line treatment so more tabs fit before the strip overflows.
- Add consistent count badges for primary request sections such as body, auth, and environment variables so all major compose surfaces expose comparable density cues.
- Replace the current left-column enable badge in params, headers, form-data, and environment variable rows with a quieter control treatment that still communicates enabled vs disabled state clearly.
- Normalize body/auth segmented controls so only the active option shows active elevation, with no residual default shadow on inactive options such as `JSON` or `None`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workbench-ui`: refine request workbench compose-surface hierarchy, compact tab density, state density cues, row control styling, and segmented-control active-state behavior

## Impact

- Affected frontend files will primarily include request workbench presentation components such as `src/components/request/RequestPanel.vue`, `src/components/request/RequestUrlBar.vue`, `src/components/request/RequestParams.vue`, and shared styling in `src/style.css`.
- Supporting i18n copy and component/integration tests will need updates to reflect new badges, hierarchy, tab density, and control-state behavior.
