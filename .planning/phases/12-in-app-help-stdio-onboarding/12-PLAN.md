---
phase: 12
plan: 12-PLAN
status: proposed
type: feature
wave: 1
depends_on: []
files_modified:
  - src/components/layout/AppHeader.vue
  - src/components/layout/AppHeader.test.ts
  - src/features/mcp-workbench/components/McpRequestPanel.vue
  - src/components/request/RequestPanel.test.ts
  - src/lib/i18n.ts
  - README.md
autonomous: false
requirements:
  - GUIDE-01
  - GUIDE-02
  - GUIDE-03
  - IA-01
---

<objective>
Deliver an in-app help entry and first-run `stdio` guidance that lowers the time-to-first-success for MCP local server setup without changing the core MCP transport architecture.
</objective>

<scope>
- Add a stable help entry inside the existing settings surface
- Add `stdio` onboarding/empty-state guidance inside the MCP workbench
- Add field-level guidance for `command`, `args`, and `cwd`
- Wire product help to stable external documentation entry points
- Add/adjust tests for visible guidance behavior

Out of scope:
- Full documentation authoring for Chinese/English manuals
- New MCP transport/runtime capabilities
- Major app-shell navigation or settings redesign
</scope>

<tasks>

### Task 12-01 — Add help entry to settings surface
- **Type:** UI
- **Files:** `src/components/layout/AppHeader.vue`, `src/components/layout/AppHeader.test.ts`, `src/lib/i18n.ts`
- **Action:** Extend the existing settings sheet/dropdown copy with a dedicated help area or action row that remains visible from the settings entry point. The help affordance should clearly indicate where the user can get onboarding/docs for ZenRequest.
- **Verify:** Component tests assert the help entry is rendered and labeled in both compact settings sheet and standard settings-hosted UI path as appropriate.
- **Acceptance criteria:** Users can discover a help entry from settings without needing to enter a request flow first.

### Task 12-02 — Add `stdio` onboarding state inside MCP workbench
- **Type:** UI
- **Files:** `src/features/mcp-workbench/components/McpRequestPanel.vue`, `src/components/request/RequestPanel.test.ts`, `src/lib/i18n.ts`
- **Action:** When MCP transport is `stdio`, render onboarding guidance near the transport-specific form explaining the minimum path to success. Guidance should be especially visible when `command` is empty and may compact down when the form becomes populated.
- **Verify:** Tests assert transport-specific onboarding appears for `stdio` and does not incorrectly override HTTP guidance.
- **Acceptance criteria:** A first-time user can infer the minimum `stdio` setup flow directly from the panel.

### Task 12-03 — Add field-level hints for `command`, `args`, and `cwd`
- **Type:** UX Copy
- **Files:** `src/features/mcp-workbench/components/McpRequestPanel.vue`, `src/lib/i18n.ts`, `src/components/request/RequestPanel.test.ts`
- **Action:** Add inline help text or supporting descriptions for the three key `stdio` fields. Include short examples/usage notes and a concise “check these first” troubleshooting cue.
- **Verify:** Tests assert the new help copy is rendered when `stdio` transport is active.
- **Acceptance criteria:** Users can understand what each field represents without leaving the form.

### Task 12-04 — Wire in-app help to stable docs entry points
- **Type:** IA / Docs integration
- **Files:** `src/components/layout/AppHeader.vue`, `src/lib/i18n.ts`, `README.md`
- **Action:** Define a stable help target that the in-app entry can point to now (for example README quick start/docs section), and update README so the linked target is a valid landing spot for later documentation expansion.
- **Verify:** Manual inspection plus tests for visible help label/URL binding where feasible.
- **Acceptance criteria:** Product help and external docs navigation are connected, satisfying the Phase 12 IA requirement without pre-building full manuals.

</tasks>

<verification>
- Run targeted tests for `AppHeader` and MCP request guidance
- Confirm EN and zh-CN copy both exist in `src/lib/i18n.ts`
- Confirm the help entry is visible from settings
- Confirm `stdio` onboarding appears only in the relevant transport path
- Confirm docs entry target exists and is not a dead link
</verification>

<success_criteria>
- Settings surface contains a stable user-visible help entry
- `stdio` flow exposes onboarding guidance for first-time use
- `command`, `args`, and `cwd` each have understandable help text
- Product-internal help and repository docs are connected through a stable entry point
- Tests cover the new discoverability behavior
</success_criteria>

<implementation_notes>
- Prefer small presentational additions over new composables unless state branching becomes substantial
- Keep localization keys grouped with existing `header` and `request.mcp` message sections
- Reuse existing card/sheet/text styles instead of inventing a new design language
</implementation_notes>
