# Phase 15: Sampling Request Flow - Research

**Date:** 2026-04-10
**Status:** Complete

## Findings

### 1. `McpRequestPanel.vue` is the correct integration surface
- `src/features/mcp-workbench/components/McpRequestPanel.vue` already owns MCP-specific transport, operation selection, discovery actions, and operation-specific inputs.
- Existing MCP capability expansion (`tools`, `resources`, `prompts`, `roots`, `stdio`) already lands here, so adding `sampling` as a new operation type matches the established product pattern.
- This aligns directly with the locked context decision: no parallel workbench.

### 2. Structured-first input matches current MCP authoring patterns
- The panel already supports schema-driven or operation-specific structured inputs rather than exposing only raw protocol payloads.
- `buildMcpSchemaFormModel` and `parseMcpStructuredArguments` show an established preference for guided form entry when possible.
- For Phase 15, `sampling` should follow this pattern with a structured form first, keeping raw protocol visibility secondary.

### 3. Response surfaces already separate readable state from protocol detail
- `src/components/response/ResponsePanel.vue` distinguishes between body/result-oriented reading and protocol-oriented detail for MCP responses.
- Existing MCP response treatment favors actionable diagnostics (`errorCategory`, `failurePhase`, `stderrSummary`) and a readable main result, with protocol detail available but not dominant.
- This matches the phase decision to make `sampling` results readable first and protocol detail non-primary.

### 4. Existing copy system can absorb sampling-specific guidance cleanly
- `src/lib/i18n.ts` already contains MCP-specific guidance for `stdio`, transport hints, discovery suggestions, and troubleshooting text in both English and Chinese.
- `sampling` guidance can be introduced through the same localized copy structure rather than ad hoc inline strings.
- This is the right place to encode boundary/risk messaging and first-run guidance consistently.

## Pattern Matches

1. `src/features/mcp-workbench/components/McpRequestPanel.vue`
   - Pattern: single MCP authoring surface with transport and operation variants
   - Relevance: `sampling` should be added as another variant in the same flow

2. `src/components/response/ResponsePanel.vue`
   - Pattern: readable primary output plus protocol/diagnostic support
   - Relevance: `sampling` result presentation should follow this layered model

3. `src/lib/i18n.ts`
   - Pattern: localized instructional copy colocated with feature wording
   - Relevance: `sampling` onboarding, hints, and warnings should be added here rather than hardcoded

## Risks

- If `sampling` is modeled too close to raw protocol JSON, it will conflict with the user decision to optimize for first success.
- If `sampling` result UI over-emphasizes protocol envelopes, the new feature will feel inconsistent with the current MCP result experience.
- If boundary/risk copy only appears on errors, users may misinterpret unsupported or partially supported sampling behavior as a bug.

## Recommended Planning Direction

1. Extend MCP operation selection to include `sampling`
2. Add structured request inputs and guidance in `McpRequestPanel.vue`
3. Normalize `sampling` result payloads into a readable response view with diagnostics
4. Add localized copy and targeted tests around operation selection, input rendering, and readable output states

## Conclusion

Phase 15 should be planned as a focused extension of the existing MCP workbench rather than a new subsystem. The right implementation is operation-type expansion + structured authoring + readable result surfaces + explicit boundary messaging.
