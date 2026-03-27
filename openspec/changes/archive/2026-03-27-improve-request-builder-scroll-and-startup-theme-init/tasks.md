## 1. Request Compose Scroll Boundary

- [x] 1.1 Refine `RequestPanel` and `RequestParams` container hierarchy so the request tab strip and `RequestUrlBar` stay anchored while the request compose body becomes the sole vertical scroll region for long request content
- [x] 1.2 Update request workbench tests to verify the compose surface remains shrinkable and independently scrollable without visually colliding with the response pane

## 2. Startup Theme Continuity

- [x] 2.1 Pre-resolve the persisted `themeMode` in `index.html` and apply matching startup theme attributes before Vue mounts, including `system` mode resolution
- [x] 2.2 Adjust the startup bootstrap handoff so the static launch screen is removed only after runtime theme alignment and app-owned startup state are ready, while still revealing the startup failure state correctly
- [x] 2.3 Update startup tests to cover persisted-theme initialization, static launch screen removal timing, and retry behavior after bootstrap failure

## 3. Verification

- [x] 3.1 Run targeted request-workbench and startup tests covering scroll-boundary behavior and startup handoff behavior
- [x] 3.2 Run `pnpm test` and `pnpm build` after the change is implemented
