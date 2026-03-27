## Why

The top header currently mixes brand, workspace switching, environment switching, language, theme, and settings in one uneven control strip, which makes the shell hierarchy hard to read and harder to scale across breakpoints. The current responsive behavior also hides workspace and environment controls on narrower widths, and the header does not visibly communicate the runtime value of the active environment even though environment variables already affect request resolution and sending.

## What Changes

- Reorganize the top header into explicit brand/navigation, context-switching, and utility zones so the workbench shell communicates clear priority and purpose.
- Keep both workspace and environment controls visible across desktop, medium, and compact layouts by progressively compressing their presentation instead of hiding them behind a large-screen breakpoint.
- Consolidate language and theme controls into the top settings entry while keeping a persistent settings trigger in the header.
- Make the active environment's value visible from the header by showing lightweight metadata such as enabled variable counts alongside the current environment selection.
- Define header interaction and busy-state behavior so request sending does not lock the header, while workspace refreshes only disable the affected context-switching controls.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workbench-ui`: Refine the header structure, responsive visibility rules, settings entry, and header-scoped interaction behavior for workbench shell controls.

## Impact

- Affects the shell layout and interaction model in `src/components/layout/AppHeader.vue` and its integration in `src/App.vue`.
- Affects responsive workbench behavior because workspace and environment controls must remain visible on constrained widths instead of disappearing at `lg`.
- Affects utility-surface composition by moving language and theme options under the existing settings entry using currently supported menu and sheet surfaces.
- Affects environment presentation by exposing lightweight runtime metadata derived from existing environment variables in the header.
- Requires i18n-managed copy updates and frontend regression coverage for header layout, responsive control visibility, settings access, environment metadata, and scoped disabled states.
