# Local API Workbench UI Refresh Design

Date: 2026-03-30
Status: Drafted from approved design discussion
Scope: Adjust the frontend UI style and typography to match the project's product positioning without changing the underlying workbench model

## Context

ZenRequest is not being positioned as "another Postman clone" or a generic cloud SaaS dashboard. The approved product direction is:

> A local-first API workbench for the AI / Agent era.

That positioning implies a different visual target from common API tools:

- It should feel like a developer's local workstation, not a browser-hosted business dashboard.
- It should communicate control, stability, and speed before novelty.
- It should leave room for future AI / Agent workflows without turning the current UI into a futuristic gimmick.
- It should improve the main daily path: open the app, locate a request, edit it, send it, inspect the result, move on.

The current UI already has the right workbench structure, so the problem is not architecture replacement. The problem is visual alignment: the styling, spacing, hierarchy, and status language need to reflect the product's intended identity more clearly and consistently.

## Goals

- Align the UI with the "local-first developer workbench" positioning.
- Make the interface feel lighter, more controlled, and more native to a desktop workflow.
- Preserve the current workbench mental model while improving hierarchy and readability.
- Introduce a restrained secondary signal for AI / Agent related affordances without overpowering the base tool identity.
- Normalize typography, color, spacing, and state treatment across the main workbench surfaces.

## Non-Goals

- Redesign the product information architecture.
- Rebuild request execution, response handling, or workspace logic.
- Add new runtime features, navigation models, or major flows.
- Turn the interface into a marketing-style landing page, glass-heavy concept UI, or terminal cosplay.
- Make the product look like a "better themed Postman" instead of its own workbench.

## Considered Directions

Three visual directions were explored:

1. `Command Center`: dark, execution-heavy, stronger console identity.
2. `Local Studio`: light, structured, desktop-tool oriented.
3. `Agent Console`: stronger future-tech signal and automation emphasis.

The approved direction is:

- Base direction: `Local Studio`
- Refinement direction: `Signal Light`
- Final blend: keep the `Local Studio` light desktop-tool foundation and add a small amount of `Agent Console` signal language

This means the product should read first as a reliable local workbench, and only secondarily as an AI / Agent-era tool.

## Core Visual Decision

The refreshed UI should look like a calm, capable local developer tool:

- light stone/slate surfaces instead of heavy dark framing
- restrained depth instead of floating cards everywhere
- mono accents for technical data and execution readouts
- orange as the action/focus color
- green-teal only for success, runtime, and automation-related signals

The visual personality should be intentional but not loud. A user should feel that the tool is purpose-built for focused request work, not trying to advertise itself.

## Layout And Hierarchy

The existing four major workbench areas remain intact:

- `AppHeader`
- `AppSidebar`
- `RequestPanel`
- `ResponsePanel`

The update changes how these areas present information rather than what they fundamentally are.

### Header

The header should behave like a context bar, not a brand banner.

- Reduce the visual dominance of the product mark.
- Prioritize current workspace, environment, navigation access, and settings.
- Keep the header compact and stable.
- Favor plain product naming (`ZenRequest`) over a mandatory icon badge.
- Allow a compact fallback mark only when space is constrained enough that the text label becomes wasteful.

The header should tell the user where they are working, not try to sell the product on every screen.

### Sidebar

The sidebar should feel like a resource explorer.

- Collections and history should resemble a left-hand workstation panel, closer to an IDE explorer than a marketing-nav drawer.
- Group labels need stronger structural clarity.
- Row styling should be lighter and more repeatable.
- Active states should rely on subtle background, border, and a narrow signal edge instead of large colored fills.
- Search should read as a utility input, not a decorative surface.

The sidebar should support fast scanning and repeat use over long sessions.

### Request Panel

The request panel remains the primary work surface.

- The method, URL, and send action form the first visual layer.
- Request details such as params, auth, body, tests, and mock setup are secondary structure under the main task.
- Tabs and controls should feel tidier and more regular in spacing.
- Editing surfaces should look dependable and neutral rather than overly stylized.

The editing area should feel "work-ready" at a glance.

### Response Panel

The response panel should shift from "output card" to "diagnostic surface."

- Status, time, and size should look like readouts.
- Body, headers, cookies, and tests should share a single clear switching hierarchy.
- Status categories such as `success`, `pending`, `failed`, `stale`, and `mock` should use one consistent visual language.
- The response panel should feel slightly lighter than the request panel so the overall layout still reads as request-first.

The response side exists to validate work, not to compete with the editor for attention.

## Visual System Rules

### Color Structure

Use a light-first system as the reference point, then mirror it into dark mode.

- Backgrounds: cool slate/stone neutrals
- Main panel surfaces: warm-neutral off-white
- Borders: soft but visible, never washed out
- Hover states: neutral gray-blue rather than persistent brand color

The light theme should define the design language. Dark mode should be a translation of the same language, not a separate personality.

### Semantic Accent Allocation

Color responsibilities must stay narrow:

- Orange: primary action, send, focus, deliberate user intent
- Teal/green: success, active runtime, automation, Agent-related indicators
- Neutral slate/gray-blue: selection, hover, structure, secondary emphasis
- Red/rose: destructive or failed states only

This prevents the interface from becoming visually noisy or semantically inconsistent.

### Typography

Typography should reinforce "developer tool" rather than "consumer product."

- Primary interface text: `IBM Plex Sans`
- Technical text: `JetBrains Mono` for URLs, metrics, code, variables, and state readouts
- Large headings should not become oversized branding moments
- Hierarchy should come from rhythm, weight, and spacing more than scale inflation

The application should feel precise and readable, not dramatic.

### Density

Target density is medium to moderately compact.

- Dense enough to work well on 13-14 inch laptop screens
- Not so dense that panels become IDE-cramped
- Not so loose that the workbench starts feeling like a showcase layout

The standard interaction posture is repeated daily use, not occasional browsing.

### Shape And Depth

- Use small-to-medium radii consistently.
- Reduce soft, plush UI cues.
- Use subtle shadows only for layer separation.
- Prefer border, fill difference, and spacing to communicate structure.

The result should feel confident and grounded instead of pillowy or floating.

### Branding

Branding should support layout, not dominate it.

- Prefer a wordmark-style `ZenRequest` treatment in normal desktop contexts.
- Keep `ZR` as an optional compact mark for constrained layouts only.
- Do not force a persistent badge if it weakens the "workspace context bar" behavior of the header.

## Component-Level Delivery Boundaries

The implementation should prioritize minimal structural disruption and maximal visual clarity.

Primary file targets are:

- `src/style.css`
- `src/components/layout/AppHeader.vue`
- `src/components/layout/AppSidebar.vue`
- `src/components/request/RequestPanel.vue`
- `src/components/response/ResponsePanel.vue`

Additional updates are allowed only when needed to keep tokens, shared classes, or tests consistent.

Permitted light structural changes:

- reorder small visual groupings
- simplify label treatment
- adjust badge placement
- revise header brand treatment
- tighten or rebalance panel-level spacing

Out of scope:

- replacing the resizable workbench model
- introducing new global navigation
- changing data flow contracts

## Acceptance Criteria

The redesign is acceptable only if all of the following are true:

### Positioning Match

- The interface reads as a local-first developer workbench.
- It does not read as a cloud SaaS admin panel.
- It does not read as a Postman imitation with a different palette.

### Visual Consistency

- Header, sidebar, request, and response areas use the same color and spacing language.
- States are visually coherent across surfaces.
- Accent colors are semantically disciplined.

### Workflow Clarity

- A user can quickly identify current context, current request, and current response state.
- The request area remains the visual center of gravity.
- The response area supports diagnosis without visually overpowering editing.

### Responsive Stability

- Desktop widths keep their hierarchy.
- Narrow widths preserve the main flow instead of shrinking everything evenly.
- Collapsed states continue to feel intentional rather than like visual leftovers.

## Verification Plan

Verification should combine automated checks with human review.

Automated checks:

- run the existing frontend test suite
- add or adjust tests only where visible behavior or structure meaningfully changes
- run a production build

Manual review:

- inspect light and dark themes
- inspect 375, 768, 1024, and 1440 widths
- inspect hover, focus, collapsed, active, success, failure, stale, and mock states
- confirm that branding remains secondary to work context

## Final Design Summary

This redesign is a calibration, not a reinvention.

ZenRequest should keep its existing workbench structure and become more clearly legible as a new-generation local API tool: clean, desktop-native, technically precise, and quietly ready for AI / Agent workflows. The UI should stop borrowing generic SaaS cues and instead express a focused, durable work surface for real request work.
