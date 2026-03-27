## Context

ZenRequest's current header is implemented in `src/components/layout/AppHeader.vue` and mounted from `src/App.vue` as part of the shell outside the workbench `BusySurface`. It currently mixes brand display, compact-navigation access, workspace switching, environment switching, language switching, theme switching, and a top-level settings icon in one strip, with most interactive weight pushed to the right side of the header.

Two problems now overlap:

1. The shell hierarchy is unclear. Workspace and environment controls are mixed with utility preferences, while the settings trigger exists without owning the current language/theme controls.
2. The responsive behavior conflicts with the desired shell contract. Workspace and environment controls disappear behind a large-screen breakpoint even though they represent active workbench context and should remain visible across supported widths.

There is also an important implementation constraint: environments already have runtime meaning. The active environment's enabled variables are used to resolve templates before request sending in `src/App.vue` and `src/lib/request-workspace.ts`, and the request editor already surfaces active environment variables in the environment tab. The missing piece is not environment behavior; it is environment value visibility in the header.

The project already ships `DropdownMenu` and `Sheet` primitives, but not a dedicated `Popover` primitive, so the settings-entry strategy should build on existing UI infrastructure instead of introducing a parallel overlay pattern just for this change.

## Goals / Non-Goals

**Goals:**
- Reframe the header into explicit shell zones for brand/navigation, context switching, and utilities.
- Keep workspace and environment controls visible across desktop, medium, and compact layouts by compressing presentation instead of hiding context controls.
- Move language and theme controls under the top settings entry while preserving a persistent settings trigger in the header.
- Make the active environment's runtime relevance visible from the header through lightweight metadata such as enabled variable counts.
- Define header interaction rules so request sending does not lock the header, while workspace reloads only disable the context controls they invalidate.
- Keep the change aligned with the current Tauri + Vue + Tailwind shell and existing component primitives.

**Non-Goals:**
- Redesign the whole workbench again beyond the header-focused scope.
- Change workspace, environment, or request runtime data models.
- Introduce a new global settings domain beyond consolidating language and theme into the existing top-level settings entry.
- Build a brand-new overlay primitive when existing `DropdownMenu` and `Sheet` components are already sufficient.
- Solve every possible future shell utility need in the same refactor.

## Decisions

### Adopt a three-zone header contract
The header will be treated as a three-zone shell:

1. brand/navigation,
2. context switching,
3. utilities.

This creates a stable visual and behavioral boundary between "where am I", "what context am I in", and "what global preferences can I adjust".

Alternatives considered:
- Keep a single mixed toolbar and only restyle spacing. Rejected because the current ambiguity is structural, not merely cosmetic.
- Push all non-brand actions into the rightmost utility cluster. Rejected because workspace/environment lose their status as active workbench context.

### Keep workspace and environment visible by progressive compression instead of breakpoint removal
Workspace and environment controls will remain visible across supported widths. Desktop can show richer labels, medium widths can compress into a shared context group with shorter labels, and compact layouts can use truncated labels and icons, but neither control should disappear completely.

Alternatives considered:
- Preserve the current `lg`-only visibility for workspace and environment controls. Rejected because it hides active shell context when the user still needs it.
- Collapse one of the two controls into a secondary menu. Rejected because the user explicitly wants both workspace and environment to remain visible.

### Consolidate language and theme under the existing settings entry
Language and theme will move out of the primary header row and into the settings surface. On desktop and medium widths, settings will use the existing `DropdownMenu` pattern. On compact layouts, settings will use the existing `Sheet` pattern to provide enough room for utility controls.

Alternatives considered:
- Keep language and theme as standalone header selectors. Rejected because they compete with workbench-context controls for primary header space.
- Introduce a new popover primitive. Rejected because the project already has suitable menu/sheet primitives and does not need a second overlay system for this scope.

### Surface environment value through lightweight metadata rather than a new feature flow
The environment switcher will show lightweight metadata such as enabled variable counts, and environment menu items can include the same kind of summary. This makes existing runtime behavior visible without expanding the environment feature set.

Alternatives considered:
- Leave the environment switcher as name-only. Rejected because it hides the reason the control matters.
- Add a larger environment inspector directly to the header. Rejected because it would over-expand scope and duplicate the existing environment editing surface in the request panel.

### Scope header interaction locking to the affected context only
The header will not be wrapped in a global `BusySurface` for request sending. Request sends only lock the request-builder region. Workspace reloads disable the context-switching zone because both workspace and environment state are being reloaded. Settings and brand/navigation remain usable while that reload is in progress.

Alternatives considered:
- Lock the full header whenever any async action runs. Rejected because `BusySurface` is a strong blocker and would unnecessarily freeze unrelated shell actions.
- Keep workspace active while environment is disabled during workspace reload. Rejected because the two controls represent one reloading context group in that transition.

### Refactor incrementally around stable sub-surfaces rather than a full component explosion
Implementation should keep `AppHeader` as the shell entry point, then extract or internally organize stable sub-surfaces around the context group and settings content. This gives the code a clearer contract without forcing an over-fragmented component tree on the first pass.

Alternatives considered:
- Keep everything in one large template. Rejected because the current component is already carrying too many responsibilities.
- Fully decompose every zone into many tiny components in one pass. Rejected because it raises refactor overhead before the new contract has proven stable.

## Risks / Trade-offs

- [Medium-width headers may still feel crowded] → Mitigation: explicitly prioritize workspace/environment visibility, compress brand copy first, and keep utilities to a single settings trigger.
- [Settings may outgrow a simple menu over time] → Mitigation: keep settings content isolated so it can evolve from `DropdownMenu` to a richer surface later without changing the top-level trigger contract.
- [Environment metadata could drift from real runtime state] → Mitigation: derive the displayed metadata directly from the active environment variable collection already used for request resolution.
- [Partial refactoring may leave stale header props and template paths behind] → Mitigation: remove unused props such as `openTabCount` as part of the same implementation slice.
- [Scoped disabled states could become inconsistent across future async actions] → Mitigation: treat this change as the initial header-zone contract and keep async ownership explicit in `App.vue`.

## Migration Plan

1. Reorganize header layout structure around the three-zone contract in `AppHeader.vue`.
2. Move language and theme controls into a settings-owned surface built from the existing menu/sheet primitives.
3. Replace the current large-screen-only visibility rule for workspace/environment controls with progressive width-aware compression.
4. Add environment metadata to the header switcher and environment menu items using existing environment-variable data.
5. Remove stale header API surface such as `openTabCount` if it remains unused.
6. Verify desktop and constrained-width behavior, environment metadata visibility, settings access, and async disabled-state scope through frontend tests and manual shell checks.
7. Rollback strategy: revert the header layout and utility-surface changes at the Vue component layer; no runtime data migration is required.

## Open Questions

- A dedicated `environmentBusy` flag is not required for the first implementation slice, but it may be useful later if environment mutations need more explicit shell-state ownership than the current flows provide.
