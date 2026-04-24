---
phase: 19
plan: 19-PLAN
type: implementation
wave: 1
depends_on:
  - Phase 18
files_modified:
  - .planning/phases/19-secret-hygiene-safe-projection/19-PLAN.md
  - .planning/phases/19-secret-hygiene-safe-projection/19-RESEARCH.md
  - src/lib/request-workspace.ts
  - src/features/app-shell/state/app-shell-services.ts
  - src/lib/tauri-client.ts
  - src-tauri/src/core/request_runtime.rs
  - src-tauri/src/commands/request.rs
  - src-tauri/src/storage/repositories/request_repo.rs
  - src-tauri/src/storage/repositories/history_repo.rs
  - src-tauri/src/storage/repositories/workspace_repo.rs
  - src/features/app-shell/state/app-shell-services.test.ts
  - src/features/app-shell/test/
autonomous: true
requirements:
  - LT-02
  - AR-01
must_haves:
  - Sensitive field inventory covers explicit auth fields, sensitive headers, secret-like environment variables, and resolved values
  - Safe projection distinguishes authored input, resolved execution snapshot, and safe projection values
  - Persistence, export, replay, and recovery paths default to safe projection instead of blind secret retention
  - Redacted placeholders remain visible for structure but cannot be sent as real credentials
  - Focused tests prove secret-bearing values do not flow into unsafe persistence paths by default
---

<objective>
Implement the Phase 19 secret hygiene baseline so ZenRequest stops treating secrets as ordinary persistence data. The work must establish a shared safe projection policy across browser snapshot, durable repositories, replay/export shaping, and runtime send guards without expanding scope into a vault system or Phase 20 explainability work.
</objective>

<tasks>
<task>
  <id>T1</id>
  <title>Define the shared secret inventory and safe projection contract</title>
  <type>design-contract</type>
  <files>src/lib/tauri-client.ts, src-tauri/src/commands/request.rs, src-tauri/src/core/request_runtime.rs</files>
  <read_first>
- .planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md
- .planning/phases/19-secret-hygiene-safe-projection/19-RESEARCH.md
- .planning/v2.0-REQUIREMENTS.md
- src/lib/tauri-client.ts
- src-tauri/src/commands/request.rs
- src-tauri/src/core/request_runtime.rs
  </read_first>
  <action>
Define a shared Phase 19 contract that explicitly distinguishes `authoring`, `resolved execution`, and `safe projection`. The contract must classify at least these secret-bearing inputs as sensitive: `bearerToken`, `password`, `apiKeyValue`, `Authorization`, `Cookie`, `Set-Cookie`, names containing `token`, `secret`, `key`, `password`, or `cookie`, and resolved values produced by template expansion. Place the core classification and redaction semantics in code locations that can be reused by repository/export/replay shaping instead of inventing separate per-path rules.
  </action>
  <acceptance_criteria>
- `src/lib/tauri-client.ts` or adjacent shared contract code contains the terms `authoring`, `resolved execution`, and `safe projection`
- code updated for Phase 19 classifies `Authorization`, `Cookie`, and `Set-Cookie` as sensitive
- code updated for Phase 19 classifies secret-like names containing `token`, `secret`, `key`, `password`, or `cookie`
- Phase 19 code documents or encodes that resolved values are not safe projection values by default
- no new `.vue` file is modified to implement secret classification policy
  </acceptance_criteria>
</task>

<task>
  <id>T2</id>
  <title>Apply safe projection to browser snapshot and frontend workspace shaping</title>
  <type>implementation</type>
  <files>src/lib/request-workspace.ts, src/features/app-shell/state/app-shell-services.ts</files>
  <read_first>
- .planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md
- .planning/phases/19-secret-hygiene-safe-projection/19-RESEARCH.md
- src/lib/request-workspace.ts
- src/features/app-shell/state/app-shell-services.ts
- src/features/app-shell/composables/useAppShell.ts
- .planning/phases/18-persistence-reliability-and-recovery-paths/18-CONTEXT.md
  </read_first>
  <action>
Update browser snapshot shaping, workspace clone helpers, and frontend recovery/replay handoff code so any state that enters browser persistence or replay/recovery projection uses safe projection defaults. Preserve request structure, auth type, and field positions where possible, but replace secret-bearing values with `[REDACTED]` or exclude them where Phase 19 rules require exclusion. Ensure replay/recovery objects coming from safe projection do not silently rehydrate real credentials.
  </action>
  <acceptance_criteria>
- `src/lib/request-workspace.ts` no longer persists raw secret-bearing values by default into browser snapshot shaping paths
- browser-persisted or replay/recovery-facing request shapes preserve auth/header structure while redacting sensitive values
- frontend replay or recovery shaping does not restore redacted placeholders as real credentials
- `src/features/app-shell/state/app-shell-services.ts` contains logic that treats safe-projected secrets as non-sendable until authoring values are restored
- no new secret-handling policy is introduced in `.vue` components
  </acceptance_criteria>
</task>

<task>
  <id>T3</id>
  <title>Apply the same safe projection policy to durable repositories and export/bootstrap paths</title>
  <type>implementation</type>
  <files>src-tauri/src/storage/repositories/request_repo.rs, src-tauri/src/storage/repositories/history_repo.rs, src-tauri/src/storage/repositories/workspace_repo.rs</files>
  <read_first>
- .planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md
- .planning/phases/19-secret-hygiene-safe-projection/19-RESEARCH.md
- src-tauri/src/storage/repositories/request_repo.rs
- src-tauri/src/storage/repositories/history_repo.rs
- src-tauri/src/storage/repositories/workspace_repo.rs
- src-tauri/src/commands/request.rs
  </read_first>
  <action>
Unify repository-level persistence, bootstrap shaping, and export shaping around the shared Phase 19 safe projection rules. Ensure request/history/workspace records exposed to frontend bootstrap, export packages, and replay-oriented shaping never include raw secret-bearing values by default. Reuse shared helpers where practical so repository paths and frontend snapshot paths do not diverge on which fields are sensitive or how they are redacted.
  </action>
  <acceptance_criteria>
- repository/export/bootstrap code paths do not expose raw `bearerToken`, `password`, or `apiKeyValue` values by default
- repository/export/bootstrap code paths redact `Authorization`, `Cookie`, or `Set-Cookie` values by default when present in projected outputs
- request/history/workspace projection logic uses one consistent sensitive-field policy rather than three unrelated local lists
- exported or bootstrapped projection objects preserve enough structure to show that a secret-bearing field exists
- no new vault/encrypted-storage subsystem is introduced in Phase 19 code
  </acceptance_criteria>
</task>

<task>
  <id>T4</id>
  <title>Keep runtime and replay transitions blocked when only safe-projected secrets are available</title>
  <type>implementation</type>
  <files>src-tauri/src/core/request_runtime.rs, src/features/app-shell/state/app-shell-services.ts, src-tauri/src/commands/request.rs</files>
  <read_first>
- .planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md
- src-tauri/src/core/request_runtime.rs
- src/features/app-shell/state/app-shell-services.ts
- src-tauri/src/commands/request.rs
- src/features/app-shell/state/app-shell-services.test.ts
  </read_first>
  <action>
Preserve and extend the existing `[REDACTED]` runtime guard so replayed, recovered, or exported request shapes with safe-projected secrets cannot be sent as if they still carried valid credentials. Align frontend pre-send validation and backend runtime validation so both layers communicate that authoring values must be restored before execution when a request only has safe-projected placeholders.
  </action>
  <acceptance_criteria>
- `src-tauri/src/core/request_runtime.rs` still rejects `[REDACTED]` secret inputs before send
- replayed or recovered request paths trigger blocked-send behavior when credentials are still redacted
- `src/features/app-shell/state/app-shell-services.ts` or its tests assert that safe-projected credentials require user restoration before send
- no code path auto-converts `[REDACTED]` placeholders back into executable credentials
  </acceptance_criteria>
</task>

<task>
  <id>T5</id>
  <title>Add focused tests for secret-safe persistence, export, and replay defaults</title>
  <type>test</type>
  <files>src/features/app-shell/state/app-shell-services.test.ts, src/features/app-shell/test/, src-tauri/src/commands/request.rs, src-tauri/src/storage/repositories/</files>
  <read_first>
- .planning/phases/19-secret-hygiene-safe-projection/19-CONTEXT.md
- .planning/phases/19-secret-hygiene-safe-projection/19-RESEARCH.md
- src/features/app-shell/state/app-shell-services.test.ts
- src/features/app-shell/test/
- src-tauri/src/commands/request.rs
- src-tauri/src/storage/repositories/workspace_repo.rs
  </read_first>
  <action>
Add focused regression tests proving that secret-bearing values do not flow into unsafe persistence paths by default. Cover at least: secret-like environment variable projection, request/auth/header redaction in projected outputs, browser snapshot or replay projection safety, export/bootstrap safety, and blocked send behavior for redacted replayed credentials. Reuse adjacent repository/runtime/frontend test patterns instead of introducing a new test harness.
  </action>
  <acceptance_criteria>
- test coverage includes a secret-like environment variable classification case
- test coverage includes `Authorization` or equivalent header redaction in projected outputs
- test coverage includes `bearerToken`, `password`, or `apiKeyValue` redaction in projected outputs
- test coverage includes a replay or recovery case where redacted credentials are blocked from send
- test coverage proves at least one persistence/export/bootstrap path does not retain raw secret-bearing values by default
  </acceptance_criteria>
</task>
</tasks>

<verification>
- Verify Phase 19 defines one consistent sensitive-field inventory across request, history, workspace, and environment projections
- Verify browser snapshot, durable bootstrap, export, and replay-facing paths use safe projection defaults instead of retaining raw secrets
- Verify safe projection preserves structure and `[REDACTED]` placeholders rather than blindly deleting every sensitive field
- Verify redacted placeholders remain non-sendable in runtime and replay transitions
- Verify tests cover environment-variable-derived secrets as well as explicit auth/header fields
- Verify implementation stays within request-workspace, app-shell state, tauri-client/runtime/command, and repository boundaries
</verification>

<success_criteria>
- ZenRequest establishes a secret-safe baseline for persistence and projection without introducing a heavyweight secret vault
- Secret-bearing values are no longer treated as ordinary browser snapshot, export, bootstrap, or replay data by default
- Users can still understand request structure and where secrets exist, but cannot recover raw credentials from normal projected outputs
- Phase 19 leaves Phase 20 free to focus on explainability rather than redoing secret hygiene fundamentals
</success_criteria>

<threat_model>
- Risk: Secret redaction rules diverge across browser snapshot, repository, and export paths; Mitigation: define one shared sensitive-field policy and reuse it across all projection boundaries
- Risk: Safe-projected placeholders are accidentally treated as executable credentials during replay or recovery; Mitigation: preserve and extend `[REDACTED]` send guards in frontend orchestration and backend runtime validation
- Risk: Scope expands into vault, encryption, or broader explainability work; Mitigation: keep Phase 19 limited to baseline safe projection and defer isolate/vault and explainability metadata to later phases
</threat_model>
