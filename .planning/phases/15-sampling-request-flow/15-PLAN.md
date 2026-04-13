---
phase: 15
plan: 15-PLAN
status: proposed
type: feature
wave: 1
depends_on: []
files_modified:
  - src/features/mcp-workbench/components/
  - src/components/request/
  - src/components/response/
  - src/lib/i18n.ts
autonomous: false
requirements:
  - MCPS-01
  - MCPS-02
  - WBIN-01
---

<objective>
Add `sampling` to the existing single-server MCP workbench flow so users can author a request, submit it, and read a structured result without leaving the current MCP interaction model.
</objective>

<scope>
- Add `sampling` as a first-class MCP operation in the existing workbench
- Introduce structured-first authoring inputs for `sampling`
- Present readable result, diagnostics, and boundary guidance for `sampling`
- Keep the implementation compatible with later history/replay integration in Phase 16

Out of scope:
- Full history/replay support for `sampling`
- Multi-server MCP management
- A separate `sampling` workbench or standalone screen
- Raw-protocol-first authoring workflow
</scope>

<tasks>

### Task 15-01 — Extend MCP operation model and operation picker
- **Type:** MCP workbench integration
- **Files:** MCP request model/types and `src/features/mcp-workbench/components/McpRequestPanel.vue`
- **Action:** Add `sampling` as a supported MCP operation and wire it into the existing operation-selection flow.
- **Verify:** Users can choose `sampling` in the MCP workbench without leaving the existing panel structure.
- **Acceptance criteria:** `sampling` appears as a natural MCP operation variant, satisfying `WBIN-01`.

### Task 15-02 — Add structured-first sampling input UI
- **Type:** Request authoring
- **Files:** `src/features/mcp-workbench/components/McpRequestPanel.vue`, related request types/helpers, `src/lib/i18n.ts`
- **Action:** Add structured form inputs and guidance text for `sampling`, prioritizing understandable entry over raw protocol editing.
- **Verify:** The workbench renders operation-specific sampling fields and localized hints/warnings.
- **Acceptance criteria:** Users can configure `sampling` through a structured interface, satisfying `MCPS-01`.

### Task 15-03 — Support readable sampling result presentation
- **Type:** Result UX
- **Files:** MCP execution/result mapping, `src/components/response/ResponsePanel.vue` or adjacent response formatting helpers
- **Action:** Make `sampling` results readable in the primary result surface, with diagnostics and clear error/boundary messaging when relevant.
- **Verify:** Sampling output is readable first, while diagnostics remain visible and useful.
- **Acceptance criteria:** Workbench surfaces structured results and basic failure context, satisfying `MCPS-02`.

### Task 15-04 — Add targeted tests for sampling workbench flow
- **Type:** Verification
- **Files:** existing MCP/request/response tests adjacent to touched components
- **Action:** Add focused tests covering operation selection, structured input rendering, and visible sampling guidance/result behavior.
- **Verify:** New tests exercise the phase’s mainline behavior without depending on later replay/history work.
- **Acceptance criteria:** Phase 15 behavior is protected by targeted tests and remains ready for Phase 16 integration.

</tasks>

<verification>
- Confirm `sampling` is selectable in the existing MCP operation picker
- Confirm structured sampling inputs render with localized guidance
- Confirm readable sampling results and error/boundary messaging appear in the response surface
- Run targeted tests for touched MCP/request/response areas
</verification>

<success_criteria>
- `sampling` is available inside the existing MCP workbench
- Users can author `sampling` requests through a structured-first UI
- The result surface emphasizes readable sampling output and useful diagnostics
- No separate `sampling` workbench or scope creep into replay/history is introduced
</success_criteria>

<implementation_notes>
- Reuse existing MCP panel operation-branching patterns before adding new abstractions
- Keep result formatting compatible with Phase 16 replay/history attachment
- Put user-facing strings in `src/lib/i18n.ts`
- Prefer the smallest extension that fits current MCP workbench architecture
</implementation_notes>
