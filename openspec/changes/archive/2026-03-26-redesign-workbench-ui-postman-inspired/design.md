## Context

ZenRequest is already a Tauri + Vue + Tailwind desktop API client with a working multi-workspace runtime, import/export flows, and a request editing shell composed primarily in `src/App.vue` and `src/components/`. The current frontend mixes custom glassmorphism styling, partial `shadcn-vue` adoption, and component-local copy. As a result, the product reads as a collection of individually styled panels instead of a unified API client application.

The requested direction is a full frontend UI overhaul aligned with the current Postman desktop style: stronger hierarchy, denser and clearer navigation, more deliberate panel composition, consistent component primitives, and centralized i18n-backed copy. This change must improve the whole frontend shell without rewriting runtime behavior or inventing new request features.

## Goals / Non-Goals

**Goals:**
- Rebuild the overall frontend shell so primary and supporting surfaces all follow one Postman-inspired visual system rather than panel-by-panel styling.
- Prefer `shadcn-vue` components and primitives for all new or rewritten UI surfaces and interactions.
- Create a cohesive token and component strategy so headers, side panels, editors, tabs, dialogs, menus, and utility actions share the same visual language.
- Centralize all user-facing frontend copy in the existing i18n system so Vue components do not hard-code visible text.
- Improve behavior on narrower desktop widths by converting secondary panels into intentional sheet/drawer patterns instead of simply shrinking every region.
- Keep current request, workspace, environment, and import/export behaviors working while the frontend shell changes around them.

**Non-Goals:**
- Rebuild runtime data flow, Tauri command contracts, or request execution behavior.
- Create a pixel-perfect clone of Postman.
- Add brand-new product features such as mock servers, monitors, cloud sync, or advanced request collaboration.
- Replace every existing custom component if a focused wrapper or styling pass is sufficient.
- Introduce a second parallel localization system outside the current i18n layer.

## Decisions

### Reframe the frontend around one coherent Postman-inspired shell
The app shell will be reorganized into a consistent API-client structure with four conceptual zones:
1. global top/header utility area,
2. persistent navigation/explorer area,
3. request editor workbench,
4. response/results surface.

This mirrors the mental model users expect from modern API clients and gives each zone a clearer ownership boundary. The current layout already has most of these pieces, but they are visually blended and action-heavy. The same hierarchy should also inform supporting surfaces such as dialogs, menus, and secondary controls so the frontend feels like one product instead of adjacent screens.

Alternatives considered:
- Keep the existing three-panel shell and only restyle colors/spacing. Rejected because the current structural hierarchy is part of the usability problem.
- Collapse navigation and explorer into a single undifferentiated sidebar. Rejected because it reduces density gains and makes collections/history/workspace switching compete in the same region.

### Use shadcn-vue primitives as the default assembly layer
New or reworked surfaces should first look for `shadcn-vue` support, especially `sidebar`, `sheet`, `dialog`, `card`, `separator`, `tooltip`, `dropdown-menu`, `tabs`, `collapsible`, and `scroll-area`. Existing locally installed primitives remain valid; missing pieces may be added with `pnpm dlx shadcn-vue@latest add <component>`.

This keeps the UI system consistent, reduces one-off accessibility work, and makes future shell refinements cheaper.

Alternatives considered:
- Continue building custom primitives in-place. Rejected because it increases styling drift and maintenance cost.
- Import an entirely separate design system. Rejected because the project already has compatible Tailwind and `shadcn-vue` foundations.

### Adopt Postman-inspired hierarchy without copying Postman literally
The design target is not a direct clone. Instead, implementation should borrow the most useful traits from current Postman patterns: compact explorer rows, prominent request URL/method entry, strong content panes, restrained chrome, tighter utility density, and clear differentiation between primary and secondary actions.

This gives the product a more professional API-client feel while preserving ZenRequest's own naming, domain model, and interaction constraints.

Alternatives considered:
- Attempt a near-clone of Postman. Rejected because it adds unnecessary visual and implementation coupling.
- Preserve the current visual identity entirely and only rearrange spacing. Rejected because the present look does not communicate a mature tooling surface strongly enough.

### Use responsive panel substitution instead of uniform shrinkage
For narrower widths, the shell should not simply compress all panels. Secondary navigation/explorer regions should convert to `Sheet` or overlay-style panels, while the request editor and response view remain primary. This preserves usability on constrained window sizes without maintaining a separate mobile application design.

Alternatives considered:
- Keep the current resizable desktop layout at all widths. Rejected because it degrades into unusably tight panes.
- Hide the response or explorer area entirely at smaller widths. Rejected because users still need access to both, just through a different access pattern.

### Centralize visual tokens and layout styling
Shared tokens for panel surfaces, borders, typography scale, toolbar density, spacing, and status accents should live centrally in `src/style.css` or a focused theme layer. Feature components should consume those tokens rather than hard-code ad hoc gradients, opacity values, and spacing rules.

Alternatives considered:
- Tune each component locally. Rejected because the current drift came from exactly that pattern.

### Route all visible UI copy through i18n
Visible labels, section titles, tooltips, button text, helper text, and dialog copy in Vue components should be sourced from `src/lib/i18n.ts` or an equivalent i18n-backed organization layer rather than inline literals. This keeps language switching reliable and prevents the redesign from introducing a second copy source of truth.

Alternatives considered:
- Leave minor labels hard-coded during the redesign. Rejected because it guarantees drift and forces a second cleanup pass.
- Create a parallel UI copy map outside i18n. Rejected because the project already has an i18n entry point and should extend it instead of bypassing it.

## Risks / Trade-offs

- [A Postman-inspired shell could become an overbuilt clone] → Mitigation: treat Postman as a hierarchy reference, not a pixel target, and keep scope focused on the existing ZenRequest workbench.
- [Adding too many new components could slow delivery] → Mitigation: install only the `shadcn-vue` primitives the shell actually uses, and prefer wrapping existing primitives where possible.
- [Large visual refactors can destabilize existing workflows] → Mitigation: keep runtime contracts unchanged and add focused frontend verification around core request/edit/import/export flows.
- [Responsive drawer patterns can complicate state handling] → Mitigation: reuse existing reactive state and isolate viewport-specific behavior to shell/layout components.
- [The redesign could leave hard-coded strings behind] → Mitigation: explicitly audit visible component copy and move it into i18n as part of the implementation checklist.

## Migration Plan

1. Define the target shell composition and identify which existing layout/request/response/supporting components can be preserved, split, or replaced.
2. Introduce any missing `shadcn-vue` primitives needed for sidebar, drawer, dialog, menu, tooltip, and card-based surfaces.
3. Refactor the top-level layout and shared theme tokens before polishing individual child components.
4. Update sidebar, request editor, response viewer, dialogs, menus, and supporting controls to match the new shell hierarchy while preserving current behaviors.
5. Audit visible component copy and route it through i18n.
6. Verify desktop and constrained-width behavior with build/tests and a manual pass in the Tauri shell.
7. Rollback strategy: because runtime behavior is unchanged, the UI shell can be reverted at the component/style layer without data migration concerns.

## Open Questions

- None for the proposal stage; specific component choices can be finalized during implementation once the exact gaps in the local `shadcn-vue` set are confirmed.
