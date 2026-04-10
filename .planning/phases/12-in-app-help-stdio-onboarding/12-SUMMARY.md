---
phase: 12
plan: 12-PLAN
subsystem: in-app-help-stdio-onboarding
tags:
  - help
  - mcp
  - stdio
  - onboarding
key-files:
  - src/components/layout/AppHeader.vue
  - src/features/mcp-workbench/components/McpRequestPanel.vue
  - src/lib/i18n.ts
  - README.md
metrics:
  tests_targeted: 2
  tests_passing_targeted: 2
---

# Phase 12 Summary

## What shipped

- Added a stable help section to the existing settings surfaces in `AppHeader`
- Added `stdio` onboarding guidance, field hints, and troubleshooting copy inside `McpRequestPanel`
- Added EN and zh-CN localized strings for the new help and onboarding copy
- Added a stable README quick-start landing section for the in-app help link
- Added component tests covering the new discoverability behavior

## Files changed

- `src/components/layout/AppHeader.vue`
- `src/components/layout/AppHeader.test.ts`
- `src/features/mcp-workbench/components/McpRequestPanel.vue`
- `src/components/request/RequestPanel.test.ts`
- `src/lib/i18n.ts`
- `README.md`

## Deviations

- None

## Self-Check

PASSED

- Scope remained within Phase 12 usability/help requirements
- No MCP transport/runtime behavior was changed
- Help entry reuses existing settings UI rather than introducing a new navigation surface
- `stdio` guidance is localized and attached to the relevant form controls
