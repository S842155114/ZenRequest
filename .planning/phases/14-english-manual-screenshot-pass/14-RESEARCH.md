# Phase 14: English Manual & Screenshot Pass - Research

**Date:** 2026-04-10
**Status:** Complete

## Findings

### 1. The Chinese manual is already the canonical content structure
- `docs/zh-CN-manual.md` has a clear hybrid flow: onboarding chapters first, module/capability chapters later.
- For Phase 14, the lowest-risk path is to mirror that structure exactly instead of rethinking English IA.
- This directly supports the user’s chosen direction: strict mirror of the Chinese manual.

### 2. `README.en.md` is currently a repo landing page, not a documentation hub
- `README.en.md` already explains positioning, setup, and project structure.
- Unlike `README.md`, it does not yet route users into a full English tutorial manual.
- Phase 14 should keep it concise while adding a documentation-navigation role, matching the Chinese-side pattern.

### 3. Screenshot work should optimize for organization, not completeness
- Roadmap success criteria only require a first-pass screenshot organization, not a full localized screenshot library.
- Reusing Chinese screenshots in English docs is the fastest way to satisfy documentation continuity without blocking on fresh captures.
- A stable screenshot folder and references are enough for this phase if later replacement remains easy.

### 4. Existing product surfaces already ground the manual topics
- `src/components/request/RequestPanel.vue` anchors the HTTP/MCP request workflow.
- `src/features/mcp-workbench/components/McpRequestPanel.vue` anchors MCP and `stdio` usage details.
- `src/components/response/ResponsePanel.vue` anchors response reading, history, and replay explanations.
- This means the English manual can stay grounded in shipped behavior without product changes.

## Pattern Matches

1. `docs/zh-CN-manual.md`
   - Pattern: tutorial-first manual with later capability chapters
   - Relevance: exact structural source for the English mirror

2. `README.md`
   - Pattern: concise repository entry plus doc navigation hub
   - Relevance: best reference for how `README.en.md` should route readers into longer docs

3. Phase 13 planning artifacts
   - Pattern: documentation work split into README routing, doc structure, and content alignment
   - Relevance: Phase 14 can reuse the same planning pattern while substituting English mirror + screenshot organization

## Risks

- If English headings drift from Chinese structure, bilingual maintenance will get harder immediately.
- If screenshot references are embedded ad hoc without a stable folder convention, later replacement will be noisy.
- If `README.en.md` stays detached from the English manual, English readers will have no clear tutorial entry point.

## Recommended Planning Direction

1. Create the Phase 14 plan artifacts with strict mirror decisions locked in
2. Add an English manual under `docs/` that mirrors `docs/zh-CN-manual.md` section-for-section
3. Refocus `README.en.md` into a quick-start + documentation hub for English readers
4. Create a first-pass screenshot directory and reference strategy that can reuse Chinese screenshots cleanly

## Conclusion

Phase 14 is best treated as documentation alignment work, not new product work. The right outcome is a maintainable English mirror of the Chinese manual, a clearer English README entry path, and a lightweight screenshot organization layer that can evolve later.
