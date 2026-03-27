## Context

The current UI already has resource-level action entry points for collections and shell controls, but right-click behavior is not yet constrained to the same resource model. This change touches multiple workbench surfaces: the sidebar collection tree, saved request rows, and the request tab strip in the main editor. The primary constraint is that contextual actions must stay attached to explicit resources, while blank regions and editable controls remain unaffected.

The implementation is cross-cutting because it spans shared menu presentation, sidebar resource rows, request tab rendering, and shell-level interaction coordination in `App.vue`. The design also needs to preserve native browser or editor context menus for text-entry controls so the product does not break common copy/paste workflows.

## Goals / Non-Goals

**Goals:**

- Restrict application context menus to a clear whitelist of supported workbench resource surfaces.
- Make each context menu resolve to a specific resource target without requiring a prior left-click selection or focus mutation.
- Reuse a consistent target descriptor model so sidebar and tab surfaces can share menu-opening logic.
- Preserve native context-menu behavior inside inputs, textareas, and editor-like controls.

**Non-Goals:**

- Adding every possible resource action in one change.
- Redesigning existing header utility menus that are already explicit button-triggered controls.
- Changing collection, request, or tab persistence semantics beyond how contextual actions are invoked.
- Replacing native browser or editor context menus inside editable fields.

## Decisions

### 1. Application context menus will be opt-in per resource surface

The shell should only open an application context menu when the event originates from a DOM surface that explicitly declares a supported resource target such as a collection, request row, or workbench tab. Unsupported regions should not attempt to infer a target from surrounding layout containers.

Why this decision:

- Prevents false-positive menus on blank or decorative surfaces.
- Keeps the interaction model predictable and easy to test.
- Aligns right-click behavior with concrete resources that already have domain actions.

Alternative considered:

- A shell-level catch-all `contextmenu` handler that walks ancestors and guesses the nearest target. Rejected because it makes unrelated surfaces accidentally interactive and is harder to reason about.

### 2. Resource target resolution will be normalized before menu rendering

Each supported surface should map the right-click event into a small shared target descriptor such as `{ type: 'collection', id, name }`, `{ type: 'request', id, collectionId }`, or `{ type: 'tab', id }`. Menu content should render from that descriptor instead of from ad hoc component-local conditions.

Why this decision:

- Reduces duplication across sidebar and workbench implementations.
- Makes target-specific actions easier to validate in tests.
- Keeps future resource surfaces extensible without rewriting the menu contract.

Alternative considered:

- Separate standalone menu logic in every component. Rejected because action availability and targeting would drift between resource types.

### 3. Right-click should not implicitly activate the targeted resource

Opening a context menu on an inactive tab or a non-selected request row should not immediately switch the current work context. The action should resolve against the targeted resource only when the user selects a menu item that requires state mutation.

Why this decision:

- Avoids unintended focus changes while the user is only exploring options.
- Prevents right-click from mutating workbench state before an action is chosen.
- Matches desktop-style contextual menu expectations.

Alternative considered:

- Auto-select the target on right-click before opening the menu. Rejected because it couples discovery with mutation and can disrupt in-progress work.

### 4. Editable controls keep native context behavior

The application should explicitly bypass resource-menu handling when the event starts inside native text-entry controls or code-editor surfaces. Those surfaces should retain their native copy, paste, and selection affordances.

Why this decision:

- Protects a core editing workflow users already expect.
- Avoids fighting browser and editor semantics for text manipulation.
- Limits the application menu to places where the product owns the full interaction model.

Alternative considered:

- Suppressing all native context menus for visual consistency. Rejected because it would degrade usability in request URL, body, and other editable fields.

## Risks / Trade-offs

- [Supported-surface detection may miss a valid resource wrapper] -> Centralize the target contract and cover every allowed trigger surface in component tests.
- [Right-click handling may accidentally block native editor menus] -> Gate application menus behind explicit target types and skip handling for known editable controls.
- [Target descriptors can drift from live resource state] -> Build descriptors from the same props/state already used to render each resource row or tab.
- [Tab-context actions may need more commands later] -> Start with a minimal shared descriptor and extend menu items without changing the target-resolution contract.

## Migration Plan

1. Define the resource target contract and the whitelist of supported right-click surfaces.
2. Apply resource-scoped context-menu triggers to sidebar collections, sidebar request rows, and workbench tabs.
3. Add guards so unsupported layout regions and editable controls do not open application context menus.
4. Verify action targeting, no-op regions, and native editor behavior with frontend tests.

Rollback strategy:

- Remove the resource-scoped context-menu bindings and fall back to the current explicit button-triggered menus without touching underlying collection, request, or tab actions.

## Open Questions

- Whether response history items should join the same context-menu model can remain out of scope until the first resource-scoped implementation is stable.
