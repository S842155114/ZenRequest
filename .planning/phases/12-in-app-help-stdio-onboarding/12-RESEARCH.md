# Phase 12: In-App Help & Stdio Onboarding - Research

**Date:** 2026-04-10
**Status:** Complete

## Findings

### 1. Settings-hosted preferences already exist
- `src/components/layout/AppHeader.vue` already hosts a settings trigger and compact settings sheet
- `src/components/layout/AppHeader.test.ts` asserts this surface is the place for shell-level controls
- Therefore, Phase 12 should extend this existing settings host instead of adding a new help page entry point elsewhere

### 2. MCP transport authoring already supports stdio
- `src/features/mcp-workbench/components/McpRequestPanel.vue` already models `stdio.command`, `stdio.args`, and `stdio.cwd`
- Current transport copy in `src/lib/i18n.ts` only states HTTP and stdio are available, but does not yet coach first-time setup
- This means the correct implementation is usability guidance on top of existing fields, not schema/model redesign

### 3. Request panel architecture favors localized UX additions
- `src/components/request/RequestPanel.vue` switches between HTTP and MCP panels but keeps both inside the same workbench shell
- Existing tests in `src/components/request/RequestPanel.test.ts` already verify MCP guidance copy
- This suggests onboarding should be added as MCP-panel-local guidance with targeted tests, preserving current architecture

### 4. Localization should flow through the existing message tree
- `src/lib/i18n.ts` centralizes request and header copy in locale-aware message objects
- New help/onboarding strings should be added there rather than hard-coded in components

## Pattern Matches

1. `AppHeader.vue` + `AppHeader.test.ts`
   - Pattern: settings-triggered shell-level secondary actions
   - Relevance: best host for a visible in-app help entry

2. `McpRequestPanel.vue`
   - Pattern: MCP-specific authoring UI with transport-sensitive fields
   - Relevance: best host for `stdio` onboarding and field hints

3. `RequestPanel.test.ts`
   - Pattern: discoverability/guidance copy tested through user-visible strings
   - Relevance: Phase 12 should add tests at this same behavior layer

## Constraints Derived From Codebase

- Avoid introducing a new global navigation/info architecture
- Keep help logic close to presentation surfaces (`AppHeader`, `McpRequestPanel`) while leaving orchestration outside components unless needed
- Preserve current request data shape; guidance should not mutate the MCP schema model unnecessarily
- Maintain EN and zh-CN parity for all new user-facing copy

## Recommended Planning Direction

Plan should split into:
1. Settings help entry design and copy
2. `stdio` onboarding surface and field-level guidance
3. Documentation link wiring and tests

## Risks

- Over-designing a full documentation browser inside the app would exceed Phase 12 scope
- Putting too much conditional logic directly into `McpRequestPanel.vue` could make an already large component harder to maintain
- Linking to future docs paths before Phase 13 may create dead ends unless a minimal placeholder target exists or the link target is intentionally stable

## Conclusion

Phase 12 is a focused usability layer on top of existing `AppHeader` and `McpRequestPanel` patterns. The safest approach is to add lightweight, localized help affordances, keep them within existing surfaces, and validate via component tests.
