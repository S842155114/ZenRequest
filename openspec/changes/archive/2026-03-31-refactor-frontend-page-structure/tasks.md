## 1. Frontend Structure Preparation

- [x] 1.1 Inventory the oversized frontend shell and request-workbench files, then confirm the target feature-aligned folder layout for extracted modules
- [x] 1.2 Create the new frontend structure scaffolding (feature folders, local helpers, barrel exports, and shared test utility locations) without changing runtime behavior

## 2. App Shell Decomposition

- [x] 2.1 Extract `src/App.vue` bootstrap, dialog, workspace, and workbench orchestration concerns into focused feature-scoped modules or composables
- [x] 2.2 Reduce `src/App.vue` to a thinner application entry shell that composes the extracted modules while preserving the current workbench behavior
- [x] 2.3 Split `src/App.test.ts` into focused suites with shared mount helpers, runtime adapter fixtures, and reusable builders aligned to the new structure

## 3. Request Workbench Decomposition

- [x] 3.1 Decompose `src/components/request/RequestParams.vue` into concern-based modules for section chrome, table-style editors, body-mode editors, validation helpers, and secondary configuration surfaces
- [x] 3.2 Update request-workbench imports, barrels, and focused tests so the extracted request modules preserve existing props, emits, and behavior coverage
- [x] 3.3 Refactor any still-oversized supporting workbench files coupled to the new structure (such as `RequestPanel.vue` or `AppSidebar.vue`) so their responsibilities match the standardized frontend boundaries

## 4. Verification

- [x] 4.1 Run the full frontend test suite and resolve any regressions introduced by the structural refactor
- [x] 4.2 Run a production build and verify the decomposed frontend compiles cleanly
- [x] 4.3 Manually smoke-test the main workbench flows after the split to confirm behavior parity for bootstrap, request authoring, dialog interactions, and response inspection
