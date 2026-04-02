# frontend-page-structure Specification

## Purpose
Define the required ownership boundaries for oversized frontend page shells, request-compose surfaces, and page-level test suites so structural refactors preserve behavior while improving maintainability.
## Requirements
### Requirement: Oversized frontend page shells use feature-aligned module boundaries
The frontend SHALL decompose oversized page and shell modules into feature-aligned structure so one module does not simultaneously own framework-neutral workbench state, runtime-backed use-case orchestration, dialog workflow branching, Vue or browser effects, and detailed workbench view-model composition.

#### Scenario: Workbench shell orchestration is refactored
- **WHEN** the main workbench shell is restructured
- **THEN** the resulting frontend structure separates framework-neutral state and application services from dialog workflows, Vue or browser effects, and component-facing view-model assembly instead of continuing to centralize those concerns in one oversized root module

#### Scenario: Shared UI primitives remain distinct from feature orchestration
- **WHEN** new files are introduced during the refactor
- **THEN** reusable UI primitives remain in shared UI locations while workbench-specific state, orchestration, dialogs, and adapters live in feature-owned modules rather than mixed together arbitrarily

### Requirement: Large request-workbench surfaces split by editing concern
The frontend SHALL decompose oversized request-workbench modules by editing concern so section chrome, table-style editors, body-mode editors, validation logic, and secondary configuration surfaces can evolve independently without one file owning all request-compose behavior.

#### Scenario: Request compose surface is extracted
- **WHEN** a large request-compose module is broken apart
- **THEN** the resulting structure groups code by editing concern such as section rails, body-mode handling, validation helpers, and secondary configuration surfaces instead of only moving template fragments into smaller files

#### Scenario: Request behavior remains stable after extraction
- **WHEN** the request-compose structure is refactored
- **THEN** existing request authoring behavior, user flows, and public integration contracts remain functionally equivalent while internal ownership boundaries become smaller and clearer

### Requirement: Frontend test structure mirrors runtime ownership boundaries
The frontend SHALL organize app-shell structural refactors into focused behavior groups with shared fixtures so store, service, dialog, and adapter concerns can be verified independently without collapsing all bootstrap, dialog, request-flow, and workspace assertions into one oversized shell implementation.

#### Scenario: App-shell orchestration tests are refactored
- **WHEN** the main app-shell structure is split into store, service, dialog, and adapter modules
- **THEN** reusable setup helpers remain in shared test utilities while assertions are grouped into focused suites by those ownership boundaries instead of depending on one monolithic composable implementation path

#### Scenario: Test changes preserve regression coverage
- **WHEN** the refactor changes frontend test file boundaries
- **THEN** the frontend still retains automated coverage for the previously supported bootstrap, workspace, request, dialog, and import flows instead of silently dropping those checks during the split

### Requirement: App-shell runtime use cases remain framework-neutral below the adapter layer
The frontend SHALL implement app-shell runtime-backed use cases through framework-neutral service modules that can read selectors, mutate app-shell state, and return structured results without directly invoking toast presentation or browser-only side effects.

#### Scenario: Service returns structured result instead of presentation feedback
- **WHEN** an app-shell service completes a runtime-backed flow such as request save, request send, workspace switch, or OpenAPI apply
- **THEN** the service returns a structured success or failure result that outer adapters can translate into toast feedback, dialog follow-up, or other UI behavior

#### Scenario: Service avoids browser-only side effects
- **WHEN** an app-shell service needs to complete a flow that also triggers browser-only behavior such as downloads, lifecycle hooks, or DOM event handling
- **THEN** the service stops at state mutation plus structured result output and leaves browser-only side effects to the Vue adapter layer

