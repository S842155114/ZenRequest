## 1. Launch Placeholder Foundation

- [x] 1.1 Add a lightweight startup placeholder to `index.html` with inline styling so the main window paints a branded non-white launch surface before Vue mounts.
- [x] 1.2 Define startup-specific copy, identifiers, and root styling hooks needed for the post-mount startup screen and placeholder handoff.

## 2. Startup State Handoff

- [x] 2.1 Extend the root app bootstrap flow to model explicit startup states for loading, failure, retry, and ready instead of relying only on `runtimeReady`.
- [x] 2.2 Render an application-owned startup screen while bootstrap is pending, remove the static placeholder once Vue takes control, and reveal the workbench only after bootstrap succeeds.
- [x] 2.3 Show a startup failure state with clear messaging and a retry action that reruns the bootstrap flow in the same window.

## 3. Verification

- [x] 3.1 Add or update tests covering pending startup rendering, successful handoff to the workbench, failure rendering, retry behavior, and placeholder cleanup.
- [x] 3.2 Run `pnpm test` and a startup UX verification pass to confirm the app no longer shows a blank white window during launch.
