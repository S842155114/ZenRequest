## 1. Shared Compose Scroll Boundary

- [x] 1.1 Refactor `RequestParams` so the active request compose content uses one shared scroll container instead of separate per-section `ScrollArea` wrappers
- [x] 1.2 Adjust request section layout primitives so params, headers, body, auth, tests, and env content render correctly inside the shared compose scroll boundary

## 2. Verification

- [x] 2.1 Update request workbench tests to assert the shared compose scroll boundary and the absence of section-level nested scroll ownership
- [x] 2.2 Run targeted request workbench tests plus `pnpm test` and `pnpm build`
