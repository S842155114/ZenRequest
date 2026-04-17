---
phase: 17
plan: 17-PLAN
type: documentation-architecture
wave: 1
depends_on: []
files_modified:
  - .planning/phases/17-execution-model-state-boundary/17-PLAN.md
  - .planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md
  - .planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md
  - .planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md
  - .planning/phases/17-execution-model-state-boundary/17-summary.md
autonomous: true
requirements:
  - EX-01
  - EX-02
  - AR-01
must_haves:
  - Execution envelope v1 is defined as a top-level model above request-centric shapes
  - Authored input, resolved execution snapshot, and result artifact boundaries are explicitly documented
  - Durable, cached, and ephemeral ownership plus startup restore precedence are explicitly documented
  - Compatibility constraints prohibit further expansion of request-centric shape
  - Phase 18-20 receive explicit handoff inputs from this phase
---

<objective>
Produce the architecture-definition artifacts for Phase 17 so later v2.0 phases can implement persistence reliability, secret hygiene, and explainable replay against a stable execution/state boundary rather than continuing to expand the existing request-centric model.
</objective>

<tasks>
<task>
  <id>T1</id>
  <title>Audit current request-centric responsibilities and map them to execution layers</title>
  <type>analysis</type>
  <files>.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md</files>
  <read_first>
- .planning/phases/17-execution-model-state-boundary/17-CONTEXT.md
- .planning/phases/17-execution-model-state-boundary/17-RESEARCH.md
- src/types/request.ts
- src/lib/request-workspace.ts
- src-tauri/src/storage/repositories/request_repo.rs
- src-tauri/src/storage/repositories/history_repo.rs
  </read_first>
  <action>
Read the current request/history/workspace model and document which responsibilities are currently mixed together. In `17-execution-envelope-design.md`, create an “Observed Current Model” section that explicitly classifies at least these categories against the current code: authored input, resolved execution snapshot, result artifact, and UI-only/transient state. Name the existing files and paths where each responsibility currently lives, and call out at least three concrete cases where request-centric structure is carrying semantics that belong to execution-level modeling instead.
  </action>
  <acceptance_criteria>
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` contains `## Observed Current Model`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` mentions `src/types/request.ts`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` mentions `src/lib/request-workspace.ts`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` contains the phrases `authored input`, `resolved execution snapshot`, and `result artifact`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` lists at least 3 concrete request-centric overload examples
  </acceptance_criteria>
</task>

<task>
  <id>T2</id>
  <title>Define execution envelope v1 with minimal shared top-level fields</title>
  <type>design-doc</type>
  <files>.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md</files>
  <read_first>
- .planning/phases/17-execution-model-state-boundary/17-CONTEXT.md
- .planning/phases/17-execution-model-state-boundary/17-RESEARCH.md
- .planning/v2.0-REQUIREMENTS.md
- .planning/research/ARCHITECTURE.md
- src/lib/tauri-client.ts
- src-tauri/src/core/request_runtime.rs
- src-tauri/src/core/request_executor.rs
- src-tauri/src/core/mcp_runtime.rs
  </read_first>
  <action>
In `17-execution-envelope-design.md`, define `execution` as the top-level entity and specify execution envelope v1. Document the minimal shared top-level fields the model needs, keeping protocol-specific detail out of the top level. Add explicit sections for `authored input`, `resolved execution snapshot`, and `result artifact`, and describe how HTTP, MCP, and future agent-oriented execution fit into the same shared lifecycle frame while retaining protocol-specific sections. State that replay uses dual-track retention, with authored intent preserved for human-readable editing while trusted replay semantics anchor on resolved execution snapshot.
  </action>
  <acceptance_criteria>
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` contains `## Execution Envelope v1`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` contains `## Top-Level Shared Fields`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` contains `## Protocol-Specific Sections`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` contains `HTTP`, `MCP`, and `future agent-oriented execution`
- `.planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md` states that trusted replay anchors on `resolved execution snapshot`
  </acceptance_criteria>
</task>

<task>
  <id>T3</id>
  <title>Document state ownership map and startup restore precedence</title>
  <type>design-doc</type>
  <files>.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md</files>
  <read_first>
- .planning/phases/17-execution-model-state-boundary/17-CONTEXT.md
- .planning/phases/17-execution-model-state-boundary/17-RESEARCH.md
- src/features/app-shell/composables/useAppShell.ts
- src/features/app-shell/state/
- src/lib/request-workspace.ts
- src-tauri/src/services/bootstrap_service.rs
- src-tauri/src/storage/repositories/workspace_repo.rs
  </read_first>
  <action>
Create `17-state-ownership-map.md` that defines durable, cached, and ephemeral state with concrete category groupings for ZenRequest. The document must cover request authoring state, response preview state, MCP session/runtime state, diagnostics state, startup hydration inputs, and browser snapshot versus backend persistence precedence. Explicitly state that browser local snapshot is an auxiliary cache rather than durable truth, that startup restore is backend durable first with browser snapshot only filling cached state, and that UI transient state, runtime handles, connection state, temporary MCP session internals, and unstable temporary context are ephemeral by default.
  </action>
  <acceptance_criteria>
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md` contains `## Durable State`
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md` contains `## Cached State`
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md` contains `## Ephemeral State`
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md` contains `## Startup Restore Precedence`
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md` contains the phrase `backend durable state first`
- `.planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md` mentions `browser local snapshot`
  </acceptance_criteria>
</task>

<task>
  <id>T4</id>
  <title>Write compatibility constraints and migration guardrails</title>
  <type>design-doc</type>
  <files>.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md</files>
  <read_first>
- .planning/phases/17-execution-model-state-boundary/17-CONTEXT.md
- .planning/phases/17-execution-model-state-boundary/17-RESEARCH.md
- src/types/request.ts
- src/lib/request-workspace.ts
- src-tauri/src/storage/repositories/request_repo.rs
- src-tauri/src/storage/repositories/history_repo.rs
- src-tauri/src/storage/repositories/workspace_repo.rs
  </read_first>
  <action>
Create `17-compatibility-constraints.md` that records what the current request/history/workspace structure may keep as long-lived assets, what must be treated as compatibility-only adapter surfaces, and what must not be extended further. Explicitly write the migration guardrail that new execution, replay, agent, diagnostics, and persistence-policy semantics must not be added by expanding request-centric shape. Define the recommended strategy as adapter-first gradual migration, preserving compatibility of current DTO/repository boundaries while future phases progressively shrink the old structure.
  </action>
  <acceptance_criteria>
- `.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md` contains `## Long-Lived Assets`
- `.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md` contains `## Compatibility-Only Adapter Surfaces`
- `.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md` contains `## Red Lines`
- `.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md` contains the phrase `must not be added by expanding request-centric shape`
- `.planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md` contains the phrase `adapter-first`
  </acceptance_criteria>
</task>

<task>
  <id>T5</id>
  <title>Prepare downstream handoff summary for phases 18 through 20</title>
  <type>summary-doc</type>
  <files>.planning/phases/17-execution-model-state-boundary/17-summary.md</files>
  <read_first>
- .planning/phases/17-execution-model-state-boundary/17-CONTEXT.md
- .planning/phases/17-execution-model-state-boundary/17-RESEARCH.md
- .planning/phases/17-execution-model-state-boundary/17-execution-envelope-design.md
- .planning/phases/17-execution-model-state-boundary/17-state-ownership-map.md
- .planning/phases/17-execution-model-state-boundary/17-compatibility-constraints.md
- .planning/ROADMAP.md
  </read_first>
  <action>
Create `17-summary.md` that consolidates the phase decisions, names any intentionally deferred decisions, and provides explicit handoff inputs for Phase 18, Phase 19, and Phase 20. The summary must state what each downstream phase may now assume as fixed, what it must not reopen, and which artifacts from Phase 17 it must consume before planning or implementation.
  </action>
  <acceptance_criteria>
- `.planning/phases/17-execution-model-state-boundary/17-summary.md` contains `## Locked Decisions`
- `.planning/phases/17-execution-model-state-boundary/17-summary.md` contains `## Deferred Decisions`
- `.planning/phases/17-execution-model-state-boundary/17-summary.md` contains `## Inputs for Phase 18`
- `.planning/phases/17-execution-model-state-boundary/17-summary.md` contains `## Inputs for Phase 19`
- `.planning/phases/17-execution-model-state-boundary/17-summary.md` contains `## Inputs for Phase 20`
  </acceptance_criteria>
</task>
</tasks>

<verification>
- Read all generated Phase 17 artifacts and confirm they map back to D-01 through D-16 from `17-CONTEXT.md`
- Confirm `17-execution-envelope-design.md` defines execution as top-level and documents authored/resolved/result boundaries
- Confirm `17-state-ownership-map.md` defines durable/cached/ephemeral ownership and startup precedence with backend durable first
- Confirm `17-compatibility-constraints.md` records adapter-first migration and the red line against further request-centric expansion
- Confirm `17-summary.md` hands off explicit inputs to Phases 18, 19, and 20
</verification>

<success_criteria>
- Phase 17 has one executable planning document that drives document-focused execution rather than implementation-heavy work
- The plan produces all four required Phase 17 artifacts as explicit outputs
- All tasks contain concrete actions, read-first inputs, and grep-verifiable acceptance criteria
- The plan stays within Phase 17 scope and does not introduce schema migration, secret storage implementation, or replay runtime rewrites
</success_criteria>

<threat_model>
- Risk: The plan drifts into abstract architecture language without tying decisions to current code touchpoints; Mitigation: every task reads concrete source files and writes artifact sections that reference existing modules
- Risk: Later phases reopen execution/state boundary questions because compatibility constraints are weak; Mitigation: write explicit red lines and downstream assumptions into compatibility and summary artifacts
- Risk: Planning quietly expands scope into implementation work that belongs to phases 18-20; Mitigation: keep outputs document-oriented and define later-phase inputs rather than implementation tasks
</threat_model>
