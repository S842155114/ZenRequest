## 1. Busy Overlay Foundation

- [x] 1.1 Add a reusable region-level busy/loading overlay pattern that can mask a workbench surface, keep the underlying context visible, show status feedback, and block pointer and keyboard interaction while active.
- [x] 1.2 Extend shell and request-derived state so workspace refresh and active request sending each expose a clear busy scope that can drive the overlay pattern.

## 2. Scoped Workbench Integration

- [x] 2.1 Apply the busy overlay to the workspace workbench region during workspace switching and any related refresh flow so the current workspace surface is visibly loading and non-interactive.
- [x] 2.2 Apply the busy overlay to the active request builder region during request sending so request tabs, request editing controls, and request actions cannot be changed until the send flow completes.
- [x] 2.3 Add i18n-managed loading copy and busy-state semantics for the scoped overlays so the unavailable state is clearly communicated instead of only visually dimmed.

## 3. Verification

- [x] 3.1 Add or update frontend tests covering scope-specific overlay visibility, interaction locking, busy-state semantics, unaffected-region isolation, and overlay cleanup after workspace refresh or request send completion/failure.
- [x] 3.2 Run `pnpm test` and targeted UX verification for workspace switching and request sending to confirm the overlays appear only on the affected region, communicate the busy state clearly, and prevent mis-operations.
