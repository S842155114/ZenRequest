# Phase 09 — UI Review

**Audited:** 2026-04-07
**Baseline:** abstract standards
**Screenshots:** captured via live `http://localhost:1420/`

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Prompt-specific labels are clear, but several blockers and empty states stay generic and repetitive. |
| 2. Visuals | 3/4 | MCP workbench hierarchy is readable on desktop, but the request shell still competes visually with the prompt flow. |
| 3. Color | 3/4 | The UI mostly uses tokenized neutrals and accent sparingly, but a few hardcoded accents remain in adjacent request chrome. |
| 4. Typography | 3/4 | Type scale is controlled and consistent, though very small uppercase metadata labels reduce scan comfort. |
| 5. Spacing | 3/4 | MCP panel spacing is disciplined, but the broader request shell still mixes arbitrary sizes and dense chips. |
| 6. Experience Design | 3/4 | Prompt discovery and argument entry are thoughtfully connected, but the live page leaves the flow disabled and under-explained when endpoint and prompt are unset. |

**Overall: 18/24**

---

## Top 3 Priority Fixes

1. **Reduce competing chrome around the MCP editor** — users must parse request-shell status, blockers, and response metadata before they can focus on prompts — collapse or soften non-essential summary chips when `MCP` mode is active.
2. **Improve first-run guidance for `prompts.get`** — the current blocked state shows `Enter a request URL` plus `Enter an MCP prompt name`, even though the visible primary field is an MCP endpoint — rename and reorder blockers so the next action is unmistakable.
3. **Raise small metadata readability** — repeated `text-[10px]` and `text-[11px]` uppercase labels make the MCP panel feel dense — promote key section labels and helper copy to a more legible small-text baseline.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- Prompt-specific controls are explicit and task-oriented: `Discover Prompts`, `Not selected`, and the discovery recommendation all align with the discovery-first flow in `src/lib/i18n.ts:238`, `src/lib/i18n.ts:240`, `src/lib/i18n.ts:244`.
- The live `prompts.get` screen communicates intent clearly with `PROMPT` and `ARGUMENTS`, which matches the dedicated panel structure in `src/features/mcp-workbench/components/McpRequestPanel.vue:700` and `src/features/mcp-workbench/components/McpRequestPanel.vue:754`.
- Two blocker messages stack at once on the live page — `Enter a request URL` and `Enter an MCP prompt name` — which is accurate but cognitively noisy for an MCP-first workflow. The underlying strings come from `src/lib/i18n.ts:117` and `src/lib/i18n.ts:251`.
- Empty response copy is serviceable but generic: `No response yet` and `Send the active request to populate this inspector...` in `src/lib/i18n.ts:300` and `src/lib/i18n.ts:301` do not distinguish MCP results from HTTP results.

### Pillar 2: Visuals (3/4)

- The MCP panel establishes a solid local hierarchy with a compact title row, operation badge, grouped transport/operation controls, then prompt/argument sections in `src/features/mcp-workbench/components/McpRequestPanel.vue:547`, `src/features/mcp-workbench/components/McpRequestPanel.vue:560`, `src/features/mcp-workbench/components/McpRequestPanel.vue:700`, and `src/features/mcp-workbench/components/McpRequestPanel.vue:754`.
- Live desktop review at `http://localhost:1420/` shows the Phase 09 layout convergence working: transport, endpoint, headers, and operation sit in one configuration block instead of fragmented stacks.
- The focal point is diluted by surrounding request-shell chrome on the same canvas: global blockers, request summary badges, and response metadata still visually compete with prompt editing. This competition is visible in the live page snapshot and originates from adjacent shell blocks in `src/components/request/RequestPanel.vue:216` and `src/components/request/RequestUrlBar.vue:155`.
- Mobile structure remains functional, but the captured mobile view still surfaces the HTTP request builder rather than the MCP workbench as the dominant layer, making the prompt flow feel secondary on smaller screens.

### Pillar 3: Color (3/4)

- The MCP panel relies mostly on design tokens like `var(--zr-text-primary)`, `var(--zr-text-secondary)`, `var(--zr-border-soft)`, and `var(--zr-control-bg)` in `src/features/mcp-workbench/components/McpRequestPanel.vue:552`, `src/features/mcp-workbench/components/McpRequestPanel.vue:565`, and `src/features/mcp-workbench/components/McpRequestPanel.vue:776`, which keeps the editor visually coherent.
- Accent usage inside the MCP panel is restrained; action buttons use bordered neutral treatments instead of saturating the surface with primary fills at `src/features/mcp-workbench/components/McpRequestPanel.vue:614`, `src/features/mcp-workbench/components/McpRequestPanel.vue:661`, and `src/features/mcp-workbench/components/McpRequestPanel.vue:707`.
- The broader UI still contains hardcoded accent colors and gradients, including `text-[#ff8b5f]` and focus borders in `src/components/request/RequestUrlBar.vue:159` and `src/components/request/RequestUrlBar.vue:331`, plus multiple literal gradients in `src/style.css:401` and `src/style.css:492`.
- These hardcoded accents do not break the MCP panel directly, but they weaken overall color-system discipline when the prompt workbench is embedded in the full request shell.

### Pillar 4: Typography (3/4)

- The panel keeps its type system fairly tight: the relevant files mostly use `text-xs`, `text-sm`, and `text-base`, plus `font-medium` and `font-semibold`, with the MCP panel evidence concentrated in `src/features/mcp-workbench/components/McpRequestPanel.vue:548`, `src/features/mcp-workbench/components/McpRequestPanel.vue:552`, `src/features/mcp-workbench/components/McpRequestPanel.vue:564`, and `src/features/mcp-workbench/components/McpRequestPanel.vue:778`.
- Titles and values are differentiated consistently: request title and main values use `text-sm` + stronger weight, while helper and fallback text stay secondary.
- Readability suffers where many labels use `text-[10px]` or `text-[11px]`, especially repeated uppercase metadata rows in `src/features/mcp-workbench/components/McpRequestPanel.vue:563`, `src/features/mcp-workbench/components/McpRequestPanel.vue:588`, `src/features/mcp-workbench/components/McpRequestPanel.vue:703`, and `src/features/mcp-workbench/components/McpRequestPanel.vue:758`.
- The surrounding request shell adds more custom small sizes like `text-[9px]`, `text-[13px]`, and `text-[15px]` in `src/components/request/RequestUrlBar.vue:241`, `src/components/request/RequestPanel.vue:177`, and `src/components/request/RequestUrlBar.vue:162`, which makes the global hierarchy feel less systematized than the MCP panel alone.

### Pillar 5: Spacing (3/4)

- The MCP workbench itself shows disciplined spacing rhythm with repeated `px-3 py-3`, `gap-3`, and `mt-2/mt-3` patterns across the core sections in `src/features/mcp-workbench/components/McpRequestPanel.vue:560`, `src/features/mcp-workbench/components/McpRequestPanel.vue:607`, `src/features/mcp-workbench/components/McpRequestPanel.vue:700`, and `src/features/mcp-workbench/components/McpRequestPanel.vue:754`.
- Structured argument cards are cleanly separated and easier to scan than a single raw JSON textarea, especially in `src/features/mcp-workbench/components/McpRequestPanel.vue:772` and `src/features/mcp-workbench/components/McpRequestPanel.vue:776`.
- The larger request shell still mixes many arbitrary values such as `[0.7rem]`, `[10px]`, `[13px]`, `[15px]`, `[164px]`, and `[180px]`, as seen in `src/components/request/RequestPanel.vue:138`, `src/components/request/RequestPanel.vue:143`, `src/components/request/RequestUrlBar.vue:162`, `src/components/request/RequestPanel.vue:170`, and `src/components/request/RequestUrlBar.vue:203`.
- Those arbitrary sizes are not catastrophic, but they make the combined MCP + request workspace feel denser and less token-driven than it could be.

### Pillar 6: Experience Design (3/4)

- Phase 09 successfully connects prompt discovery to editing ergonomics: the panel offers a discover action, a manual prompt-name fallback, and either a structured schema form or raw JSON fallback in `src/features/mcp-workbench/components/McpRequestPanel.vue:707`, `src/features/mcp-workbench/components/McpRequestPanel.vue:718`, `src/features/mcp-workbench/components/McpRequestPanel.vue:772`, and `src/features/mcp-workbench/components/McpRequestPanel.vue:793`.
- The view model also preserves discovered prompt context and replay continuity, which strengthens longitudinal UX, as shown by `src/features/app-shell/composables/useAppShellViewModel.ts:395`, `src/features/app-shell/composables/useAppShellViewModel.ts:431`, and `src/features/app-shell/composables/useAppShellViewModel.ts:453`.
- Error and idle states are covered by the shared response inspector, including MCP error categorization in `src/components/response/ResponsePanel.vue:156` and pending-state handling in `src/components/response/ResponsePanel.vue:149`.
- The live first-run state is still a bit under-guided: `Send` is disabled, endpoint is `Not configured`, and the prompt field says `Not selected`, but the UI does not strongly sequence the actions beyond passive helper text. This is visible live on `http://localhost:1420/` and supported by `src/lib/i18n.ts:228`, `src/lib/i18n.ts:239`, and `src/lib/i18n.ts:244`.

---

## Files Audited

- `.planning/phases/09-mcp-prompts-workbench/09-SUMMARY.md`
- `.planning/phases/09-mcp-prompts-workbench/09-PLAN.md`
- `.planning/phases/09-mcp-prompts-workbench/09-CONTEXT.md`
- `.planning/phases/09-mcp-prompts-workbench/09-UI-REVIEW.md`
- `src/features/mcp-workbench/components/McpRequestPanel.vue`
- `src/lib/i18n.ts`
- `src/components/request/RequestPanel.vue`
- `src/components/request/RequestUrlBar.vue`
- `src/components/response/ResponsePanel.vue`
- `src/features/app-shell/composables/useAppShellViewModel.ts`
- `src/style.css`
