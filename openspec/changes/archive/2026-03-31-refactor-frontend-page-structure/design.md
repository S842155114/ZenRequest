## Context

The frontend currently has several oversized orchestration files that combine page-shell composition, feature state, async workflows, and detailed view logic in the same module. The largest examples are `src/App.vue` (~1700+ lines), `src/App.test.ts` (~2600+ lines), `src/components/request/RequestParams.vue` (~1200+ lines), plus large supporting workbench files such as `AppSidebar.vue`, `RequestPanel.vue`, and related test suites.

This is no longer just a style issue. It slows down review, makes regressions harder to isolate, and creates files that own too many unrelated responsibilities at once. The change must preserve the existing workbench behavior and visual contract while moving the codebase toward a standard frontend structure with clearer boundaries between:

- page or shell orchestration
- feature-specific composables and helpers
- presentational fragments or section views
- shared UI primitives
- test fixtures and flow-specific assertions

Constraints:

- Preserve current runtime behavior, props/events contracts, and visible workbench flows.
- Avoid introducing a new global state library or router rewrite.
- Keep shared reusable UI primitives under `src/components/ui`.
- Prefer incremental extraction over large “rewrite” moves so the refactor stays reviewable.

## Goals / Non-Goals

**Goals:**

- Decompose oversized frontend page and shell files into standard feature-aligned structure.
- Separate orchestration logic from render-heavy view composition in `App.vue` and other large workbench modules.
- Break request-workbench subdomains such as section rails, body-mode editors, validation helpers, and mock/auth/test configuration into smaller units with single-purpose ownership.
- Split monolithic frontend test files into focused suites with reusable setup helpers and fixtures.
- Preserve current user-facing behavior while improving maintainability, change isolation, and ownership clarity.

**Non-Goals:**

- Changing the current product information architecture or visual design.
- Replacing the existing runtime client, request data model, or workbench interaction model.
- Introducing new product capabilities as part of the refactor.
- Forcing every medium-sized component into many tiny files when extraction does not improve ownership.

## Decisions

### Decision: Adopt feature-first decomposition for oversized workbench shells

Oversized page-shell modules will be broken into feature-scoped folders that own orchestration, view fragments, and helpers for one domain, instead of continuing to expand `App.vue` and a handful of giant component files.

Rationale:

- The current bottleneck is not shared UI primitives; it is domain-heavy workbench files with too many responsibilities.
- A feature-first layout better matches how the app is changed: workbench shell, request compose, sidebar explorer, and response diagnostics evolve as domains rather than as one flat component list.
- It allows feature-local helpers and tests to live close to their owning workflow instead of bloating `src/lib` or root test files.

Alternative considered:

- Keep everything under the current flat `src/components/*` folders and only extract a few helpers. Rejected because it would reduce line count somewhat but would not create stable long-term ownership boundaries.

### Decision: Split `App.vue` into shell composition plus extracted workbench modules

`App.vue` will remain the application entry, but it will no longer directly own every bootstrap, dialog, workspace, and workbench orchestration detail. The refactor will extract cohesive workbench modules such as shell composables, dialog coordination helpers, and layout segments into dedicated feature modules.

Rationale:

- `App.vue` currently mixes bootstrapping, persistence, dialog state, workspace mutations, panel layout, and request/response coordination.
- Keeping a thin entry shell lowers merge pressure and makes behavior easier to reason about.
- This preserves the app entry point while removing “god component” behavior.

Alternative considered:

- Replace `App.vue` wholesale with a new root architecture. Rejected because it raises regression risk and makes parity verification harder.

### Decision: Decompose `RequestParams.vue` by section concern rather than by generic micro-components

The request compose surface will be split along meaningful editing concerns such as section-rail chrome, table-style editors, body-mode editors, mock configuration, auth configuration, and validation utilities rather than extracting arbitrary tiny subcomponents.

Rationale:

- `RequestParams.vue` is large because it owns multiple distinct editing domains, not because it needs more presentational wrappers.
- Concern-based extraction makes it easier to map future changes to one module.
- Shared behaviors such as invalid-row handling can live in composables or helpers instead of being duplicated across section implementations.

Alternative considered:

- Only extract template fragments and leave all state logic in one file. Rejected because it reduces readability only superficially and leaves the main ownership problem in place.

### Decision: Normalize frontend tests around focused suites plus shared harnesses

Large frontend tests such as `App.test.ts` will be split into focused files grouped by behavior (for example bootstrap, dialogs, workbench flow, import/export, layout responsiveness), while shared mount helpers, adapter fixtures, and reusable builders move into dedicated test utilities.

Rationale:

- The current tests are difficult to navigate because setup, fixtures, and many unrelated assertions coexist in one giant file.
- Smaller suites make regression failures easier to triage.
- Shared harnesses reduce copy-paste without centralizing every test into one place again.

Alternative considered:

- Keep one large test file and only use editor folds or comments for organization. Rejected because it does not improve ownership, navigation, or reviewability.

### Decision: Preserve existing public component contracts during extraction where practical

The refactor should prefer stable props, emits, and public interfaces for major workbench components while internals move behind new local modules.

Rationale:

- Stable interfaces reduce regression risk and allow incremental extraction.
- Existing tests and parent-child integration assumptions remain useful during the refactor.
- This keeps the change focused on structure rather than behavior redesign.

Alternative considered:

- Refactor public interfaces aggressively at the same time as file decomposition. Rejected because it couples structural cleanup to avoidable behavior risk.

## Risks / Trade-offs

- [Refactor touches many imports and file boundaries] → Mitigation: extract in stages with focused verification after each domain split.
- [Feature-first structure could over-fragment the codebase] → Mitigation: split only when a module owns multiple concerns, and keep simple presentational files where decomposition adds no value.
- [Large test moves can make history harder to follow] → Mitigation: move setup utilities first, then split assertions into clearly named suites with stable fixtures.
- [Behavior parity could drift during extraction] → Mitigation: keep public interfaces stable where practical and require full frontend test + build verification before completion.

## Migration Plan

1. Define the target frontend structure contract in spec form so the refactor has explicit requirements.
2. Extract `App.vue` responsibilities into workbench-shell modules without changing visible behavior.
3. Decompose the largest request-workbench surfaces, starting with `RequestParams.vue`, into concern-based modules.
4. Restructure large frontend tests around shared harnesses and focused suites.
5. Run full frontend verification to confirm behavior parity.

Rollback strategy:

- Because this change is structural and frontend-only, rollback is code-only: revert the refactor commits or restore the previous file arrangement if parity is not maintained.

## Open Questions

- None required for proposal readiness; the main remaining implementation choice is the exact folder naming under `src/features/*`, which can be finalized during execution as long as the ownership boundaries in this design are preserved.
