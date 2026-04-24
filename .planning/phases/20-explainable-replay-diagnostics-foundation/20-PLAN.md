---
phase: 20
plan: 20-PLAN
type: implementation
wave: 1
depends_on:
  - Phase 19
files_modified:
  - .planning/phases/20-explainable-replay-diagnostics-foundation/20-PLAN.md
  - .planning/phases/20-explainable-replay-diagnostics-foundation/20-RESEARCH.md
  - src/lib/tauri-client.ts
  - src/types/request.ts
  - src/features/app-shell/domain/history-replay.ts
  - src/features/app-shell/state/app-shell-services.ts
  - src/features/app-shell/composables/useAppShell.ts
  - src/components/
  - src-tauri/src/models/
  - src-tauri/src/commands/
  - src-tauri/src/services/
  - src-tauri/src/storage/repositories/history_repo.rs
  - src-tauri/src/storage/repositories/workspace_repo.rs
  - src/**/__tests__
autonomous: true
requirements:
  - DX-01
  - AR-01
must_haves:
  - HTTP replay/history gains a minimal explainable replay contract focused on execution composition
  - Explainability distinguishes authored input, resolved execution, result artifact, and replay-time limitations
  - Diagnostics surface source categories and replay limitation reasons without exposing secret-bearing values
  - History/replay detail view shows inline structured diagnostics cards with concise default summary and expandable details
  - Phase 20 leaves extension slots for MCP session-aware metadata and future approval/intervention diagnostics without fully implementing them
---

<objective>
Implement the Phase 20 explainable replay baseline so ZenRequest history/replay stops being only rerunnable and becomes inspectable. The first delivery should focus on HTTP replay/history, surface minimal execution-composition explanations and replay limitation reasons, and preserve Phase 19 safe-default guarantees.
</objective>

<tasks>
<task>
  <id>T1</id>
  <title>Define a shared explainable replay contract for HTTP history artifacts</title>
  <type>design-contract</type>
  <files>src/types/request.ts, src/lib/tauri-client.ts, src-tauri/src/models/, src-tauri/src/commands/, src-tauri/src/services/</files>
  <read_first>
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-CONTEXT.md
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-RESEARCH.md
- .planning/v2.0-REQUIREMENTS.md
- .planning/phases/17-execution-model-state-boundary/17-CONTEXT.md
- .planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md
- src/types/request.ts
- src/lib/tauri-client.ts
- src-tauri/src/models/
  </read_first>
  <action>
Define a minimal explainability envelope or equivalent structured contract that can travel with HTTP history/replay artifacts. The contract must express execution-composition explanation, source categories, replay limitation reasons, and extension slots for future protocol-specific metadata without forcing the UI to infer these from raw blobs.
  </action>
  <acceptance_criteria>
- Contract explicitly represents authored input vs resolved execution vs result/diagnostic artifact concepts or their equivalent Phase 17-aligned shape
- Contract includes structured source-category information rather than only free-form strings
- Contract includes structured replay limitation reasons (for example: safe projection loss, environment mismatch, runtime blocked, unresolved source)
- Contract preserves Phase 19 safe-default behavior and does not introduce raw secret-bearing diagnostic fields
- Contract leaves extension space for future MCP session-aware and approval/intervention metadata
  </acceptance_criteria>
</task>

<task>
  <id>T2</id>
  <title>Populate explainability metadata on history and replay shaping paths</title>
  <type>implementation</type>
  <files>src/features/app-shell/domain/history-replay.ts, src/features/app-shell/state/app-shell-services.ts, src/features/app-shell/composables/useAppShell.ts, src-tauri/src/services/, src-tauri/src/storage/repositories/history_repo.rs, src-tauri/src/storage/repositories/workspace_repo.rs</files>
  <read_first>
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-CONTEXT.md
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-RESEARCH.md
- src/features/app-shell/domain/history-replay.ts
- src/features/app-shell/state/app-shell-services.ts
- src/features/app-shell/composables/useAppShell.ts
- src-tauri/src/storage/repositories/history_repo.rs
- src-tauri/src/storage/repositories/workspace_repo.rs
- src-tauri/src/core/request_runtime.rs
  </read_first>
  <action>
Add shaping logic that derives explainability metadata for HTTP history items and replay detail flows. Ensure the system can tell users how execution was composed and why replay is not guaranteed to be equivalent to the original execution, while keeping the logic in domain/service/repository layers rather than Vue components.
  </action>
  <acceptance_criteria>
- HTTP history/replay path produces explainability metadata or equivalent structured diagnostics alongside existing history artifacts
- Replay detail path can surface why a replay is only approximate or blocked from semantic equivalence
- Source categories include at least authored, environment/template/default-derived, safe-projected, or runtime-blocked-equivalent classes
- Replay limitation reasons are generated from real system behavior rather than hard-coded UI-only copy
- No new explainability policy is implemented directly inside `.vue` component business logic
  </acceptance_criteria>
</task>

<task>
  <id>T3</id>
  <title>Render inline explainability cards in history/replay detail view</title>
  <type>implementation</type>
  <files>src/components/, src/features/app-shell/, src/types/request.ts</files>
  <read_first>
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-CONTEXT.md
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-RESEARCH.md
- src/components/response/ResponsePanel.vue
- src/features/app-shell/
- src/types/request.ts
  </read_first>
  <action>
Add inline structured diagnostics cards to the history/replay detail path. The UI should present a concise default summary and optional expanded details, reusing existing diagnostics/response panel style where possible rather than introducing a new standalone diagnostics workspace.
  </action>
  <acceptance_criteria>
- History/replay detail shows explainability information in an inline structured section
- Default view stays concise and readable, with expandable details for deeper inspection
- The UI explains execution composition and replay limitation reasons without requiring raw payload inspection
- The rendering follows existing product visual patterns instead of inventing a separate diagnostics shell
- No natural-language summary generator is required for this phase
  </acceptance_criteria>
</task>

<task>
  <id>T4</id>
  <title>Protect secret-safe explainability boundaries</title>
  <type>implementation</type>
  <files>src/lib/request-workspace.ts, src/lib/tauri-client.ts, src-tauri/src/core/request_runtime.rs, src-tauri/src/storage/repositories/, src/types/request.ts</files>
  <read_first>
- .planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md
- .planning/phases/19-secret-hygiene-safe-projection/19-VERIFICATION.md
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-CONTEXT.md
- src/lib/request-workspace.ts
- src/lib/tauri-client.ts
- src-tauri/src/core/request_runtime.rs
- src-tauri/src/storage/repositories/history_repo.rs
  </read_first>
  <action>
Ensure explainability metadata never weakens Phase 19 secret-safe guarantees. Where replay differences are caused by redaction or blocked execution, explain the reason category without exposing the underlying secret-bearing values or reclassifying safe projection as resolved execution.
  </action>
  <acceptance_criteria>
- Explainability output remains compatible with safe projection defaults
- Replay limitation messages can explain redaction/projection loss without leaking raw secret values
- No new persistence/export/history field stores resolved secrets just for explainability
- Runtime or replay diagnostics continue to treat redacted placeholders as non-sendable
- Phase 20 diagnostics do not redefine or bypass Phase 19 boundaries
  </acceptance_criteria>
</task>

<task>
  <id>T5</id>
  <title>Add focused tests for explainable replay contracts and inline diagnostics behavior</title>
  <type>test</type>
  <files>src/features/app-shell/domain/, src/features/app-shell/state/, src/components/, src/lib/, src-tauri/src/storage/repositories/, src-tauri/src/services/</files>
  <read_first>
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-CONTEXT.md
- .planning/phases/20-explainable-replay-diagnostics-foundation/20-RESEARCH.md
- src/features/app-shell/domain/history-replay.test.ts
- src/features/app-shell/state/app-shell-services.test.ts
- src/components/response/ResponsePanel.test.ts
- src-tauri/src/storage/repositories/history_repo.rs
  </read_first>
  <action>
Add focused regression tests proving that explainable replay metadata is derived and surfaced correctly. Cover at least: source-category surfacing, replay limitation reasons, safe-projection-induced explainability gaps, inline detail rendering, and the continued blocking of non-equivalent redacted replay execution.
  </action>
  <acceptance_criteria>
- Tests cover execution-composition source categories in at least one history/replay scenario
- Tests cover replay limitation reasons such as redaction, environment mismatch, or runtime block
- Tests verify inline explainability section/card rendering behavior in the history/replay detail path
- Tests verify Phase 19 safe-default guarantees still hold when explainability metadata is present
- Focused verification commands for touched frontend and Rust layers can validate the new contract without requiring a full product-wide run
  </acceptance_criteria>
</task>
</tasks>

<verification>
- Verify HTTP history/replay now explains execution composition rather than only preserving rerunnable payloads
- Verify explainability distinguishes authored input, resolved execution, result artifact, and replay-time limitation concepts clearly enough for DX-01
- Verify replay detail surfaces why current replay may not be semantically equivalent to the original execution
- Verify diagnostics are structured and inline, with concise default view and expandable details
- Verify Phase 19 secret-safe projection boundaries remain intact under the new explainability contract
- Verify implementation stays within app-shell/domain/helper/tauri/service/storage boundaries required by AR-01
</verification>

<success_criteria>
- HTTP replay/history gains a stable explainable replay baseline that helps users understand how execution was composed
- Users can see why a replay is approximate, blocked, or context-dependent without manually diffing raw payload blobs
- Explainability metadata is structured enough to support future diagnostics growth without forcing an immediate MCP-wide rollout
- Phase 20 improves inspectability without undoing the secret-safe foundation established in Phase 19
</success_criteria>

<threat_model>
- Risk: explainability metadata becomes a covert path for storing or surfacing sensitive resolved values; Mitigation: keep Phase 19 safe-default policy authoritative and only surface structured reason categories
- Risk: UI components reimplement diagnostics interpretation ad hoc; Mitigation: define a shared explainability contract and derive it in domain/service/repository layers
- Risk: planning overreaches into full MCP explainability or a standalone diagnostics workspace; Mitigation: explicitly keep this phase scoped to HTTP history/replay baseline plus extension slots
</threat_model>
