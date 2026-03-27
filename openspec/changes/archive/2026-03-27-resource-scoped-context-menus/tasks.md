## 1. Context Menu Target Model

- [x] 1.1 Define the supported resource target types and the whitelist of right-click trigger surfaces for collections, saved requests, and request tabs.
- [x] 1.2 Add shared guard logic so unsupported layout regions and editable controls bypass application-level resource context menus.

## 2. Resource Surface Integration

- [x] 2.1 Apply resource-scoped context-menu behavior to sidebar collection headers and saved request rows using target-specific actions.
- [x] 2.2 Apply resource-scoped context-menu behavior to workbench request tabs without implicitly switching the active tab on open.
- [x] 2.3 Reconcile resource menu copy and action wiring with existing explicit action entry points so collection, request, and tab commands stay consistent.

## 3. Verification

- [x] 3.1 Add or update frontend tests covering supported right-click triggers, unsupported no-op zones, non-active resource targeting, and native editable-control behavior.
- [x] 3.2 Run `pnpm test` plus targeted manual UX verification for sidebar resources, request tabs, blank workbench regions, and editable controls.
