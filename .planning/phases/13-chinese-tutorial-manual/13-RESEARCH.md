# Phase 13: Chinese Tutorial Manual - Research

**Date:** 2026-04-10
**Status:** Complete

## Findings

### 1. README already has the right role for a lightweight landing page
- `README.md` is the repository entry point and already contains product positioning, feature overview, and setup information.
- Recent Phase 12 work also added an in-app-help landing section, which means README can now serve as the bridge between product UI help and longer-form docs.
- This supports keeping README concise and navigation-oriented rather than turning it into the full Chinese manual.

### 2. Existing shipped UI surfaces map naturally to a tutorial narrative
- `src/components/request/RequestPanel.vue` represents the main request workspace and HTTP/MCP mode switching.
- `src/features/mcp-workbench/components/McpRequestPanel.vue` represents the MCP and `stdio` authoring workflow.
- `src/components/response/ResponsePanel.vue` provides the response/result reading surface.
- Together these surfaces support a user-flow-first tutorial: open app → create/send request → inspect response → use MCP → use stdio.

### 3. Product copy and domain naming are already centralized
- `src/lib/i18n.ts` contains authoritative wording for major UI areas like history, MCP, and stdio.
- The Chinese manual should reuse these product terms to avoid documentation/UI naming drift.

### 4. Phase 12 changed the documentation relationship
- Phase 12 introduced in-product help entry and stdio onboarding, but intentionally stopped short of a full manual.
- Therefore Phase 13 should describe and extend the shipped product behavior rather than invent a separate help model.

## Pattern Matches

1. `README.md`
   - Pattern: top-level repository entry and first-stop orientation
   - Relevance: should become a short navigation hub, not the full tutorial body

2. `AppHeader.vue` help entry
   - Pattern: product-internal help affordance pointing outward
   - Relevance: docs should reference this as the user’s on-ramp from the app to repository docs

3. `McpRequestPanel.vue` and `RequestPanel.vue`
   - Pattern: core workbench flow surfaces
   - Relevance: ideal anchors for tutorial sections and terminology

## Risks

- If README grows too much, it will duplicate the manual and weaken the “navigation hub” role.
- If the Chinese manual is organized only by feature modules, it will be harder for first-time users to reach a successful workflow quickly.
- If docs wording diverges from shipped UI labels, the manual will feel out of sync even when technically correct.

## Recommended Planning Direction

Split Phase 13 into:
1. Reshape README into a concise quick-start/documentation hub
2. Create the Chinese manual structure with mixed flow/module organization
3. Fill the manual with grounded content covering current shipped capabilities
4. Verify links and terminology alignment across README, docs, and product UI

## Conclusion

Phase 13 is best treated as documentation IA + content authoring work grounded in the existing shipped UI. The right outcome is a concise README plus a tutorial-style Chinese manual that starts with end-to-end flows and then transitions into capability-based chapters.
