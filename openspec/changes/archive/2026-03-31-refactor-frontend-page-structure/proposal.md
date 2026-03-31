## Why

The current frontend shell has accumulated too much page-level responsibility in a few oversized files, most notably `src/App.vue`, `src/App.test.ts`, and request-workbench components such as `src/components/request/RequestParams.vue`. The file size now makes routine changes, review, and regression analysis slower than they should be, so the frontend needs a structural refactor now before more features are added.

## What Changes

- Introduce a standard frontend decomposition plan for oversized page or shell files so feature orchestration, view composition, async workflows, and shared helpers do not continue to live in the same module.
- Split the current workbench shell into clearer page-structure layers such as shell containers, feature-scoped composables, view fragments, and test helpers while preserving the current runtime behavior and UI contract.
- Define where large request-workbench surfaces should be broken apart when one component currently owns multiple concerns such as section configuration, validation, body-mode management, and view chrome.
- Restructure the largest frontend tests so bootstrap helpers, runtime adapter fixtures, and page-flow assertions are separated from one another instead of remaining in one monolithic spec file.
- Keep current capabilities, user flows, and visual behavior intact; this change is about maintainability, ownership boundaries, and standard project structure rather than new product functionality.

## Capabilities

### New Capabilities
- `frontend-page-structure`: Defines how oversized frontend page and shell modules must be split into standard feature-aligned structure without changing user-visible behavior.

### Modified Capabilities
<!-- None. This change standardizes frontend structure without changing existing user-facing requirements. -->

## Impact

- Affected frontend shell and page modules: `src/App.vue`, `src/App.test.ts`
- Likely affected oversized workbench files: `src/components/request/RequestParams.vue`, `src/components/request/RequestPanel.vue`, `src/components/layout/AppSidebar.vue`, related tests, and new supporting modules/directories created during decomposition
- Affected supporting frontend structure: feature folders, composables, local helpers, test utilities, and barrel exports under `src/components`, `src/lib`, and any new `src/features/*` or equivalent structure introduced by the refactor
- No API or runtime-contract changes are intended; the main risk is regression during module extraction, so verification must focus on parity of existing frontend behavior
