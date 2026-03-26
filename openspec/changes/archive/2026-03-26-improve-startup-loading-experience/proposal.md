## Why

The desktop app currently shows a visible white screen while the Tauri window opens and the Vue application has not mounted yet. That startup gap makes the product feel slow and unfinished even when bootstrap succeeds quickly, and it offers no feedback if runtime initialization takes longer.

## What Changes

- Add a startup experience that renders immediately when the main window appears instead of leaving the window blank before Vue mounts.
- Hand off from the pre-mount startup placeholder to an application-owned startup surface while runtime bootstrap is still loading.
- Preserve the current single-window launch flow and avoid introducing a separate native splash window unless later profiling proves the WebView itself is the dominant delay.
- Provide explicit startup loading and failure messaging so bootstrap delays or errors are not represented as a blank or frozen screen.

## Capabilities

### New Capabilities
- `startup-experience`: Covers launch-time placeholder rendering, bootstrap handoff into the app shell, and user-visible startup loading or failure feedback before the full workbench is ready.

### Modified Capabilities

## Impact

- Affected frontend entry points: `index.html`, `src/main.ts`, `src/App.vue`, `src/style.css`
- Likely affected support code: launch copy in `src/lib/i18n.ts` and startup/bootstrap tests
- No backend API or Tauri command contract changes are expected
