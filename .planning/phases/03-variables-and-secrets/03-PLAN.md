---
phase: 03
phase_name: Variables And Secrets
plan_type: implementation
status: ready
source_context: .planning/phases/03-variables-and-secrets/03-CONTEXT.md
source_research: .planning/phases/03-variables-and-secrets/03-RESEARCH.md
created: 2026-04-06
---

# Phase 3 Plan — Variables And Secrets

## Goal

收敛变量解析、鉴权配置和 secret 边界，让环境变量复用、HTTP 鉴权和本地导出迁移在现有 ZenRequest 架构下表现一致、可预测、默认安全。**本 phase 将“分享”限定为现有导出 JSON / 备份文件这一资产外流路径，不新增独立分享机制。**

## Must Haves

- `VAR-01`：开发者可以定义并使用环境变量与模板值来复用 `baseUrl`、token 和其他参数
- `VAR-02`：变量解析优先级明确且在不同入口保持稳定一致
- `AUTH-01`：支持 `No Auth`、`Basic Auth`、`Bearer Token`、`API Key`
- `AUTH-02`：导出、分享或迁移默认避免 secret 明文泄露；其中“分享”按现有导出文件路径处理

## Plan Summary

本 phase 拆成 4 个可执行任务：
1. 收敛前端预览解析与 Rust 执行编译的双边界语义
2. 打通鉴权配置到预览、发送、恢复、回放的一致行为
3. 将 secret-safe 规则扩展到导出/分享/迁移边界
4. 补齐变量、鉴权、脱敏和恢复的回归验证

## Tasks

### Task 1 — Variable Resolution Semantics Across Frontend Preview And Rust Compile

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/features/app-shell/domain/url-resolution.ts`
- `src/lib/request-workspace.ts`
- `src/types/request.ts`
- `src/features/app-shell/state/app-shell-store.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/composables/useAppShell.ts`
- `src-tauri/src/core/request_runtime.rs`
- `.planning/phases/03-variables-and-secrets/03-CONTEXT.md`
- `.planning/phases/03-variables-and-secrets/03-RESEARCH.md`
</read_first>

<action>
Unify the semantics of variable resolution across the two boundaries that already exist in the repo:
- frontend pure resolution for preview/selectors/send-blocking behavior
- Rust `compile_request` for final execution compilation

Do not create two independent rule systems. Instead, make the frontend domain/pure-helper layer and Rust compile path share the same priority order, placeholder handling, and missing-variable policy.

Concrete implementation goals:
- keep preview-oriented template logic in `src/features/app-shell/domain/` or an adjacent shared pure-logic layer that store/services can consume
- keep `src/lib/request-workspace.ts` focused on request/workspace pure helpers and use it only where that matches existing responsibility boundaries
- define one deterministic variable-priority model centered on active environment values plus request-visible configuration
- resolve placeholders for URL, params, headers, and auth-related values through shared semantics that match Rust `compile_request`
- distinguish blocking vs non-blocking resolution failures so missing critical values do not silently degrade into broken sends
- surface structured diagnostics that app-shell can present consistently before send
</action>

<acceptance_criteria>
- frontend preview/selectors and Rust `compile_request` use aligned variable-priority and placeholder semantics
- active request URL preview and send preparation can read from one coherent frontend resolved result instead of ad-hoc branches
- missing variable behavior is explicit and testable rather than silently replacing with empty strings in critical send paths
- rule ownership is clear: frontend handles preview/blocking UX, Rust handles final execution compile
- targeted tests covering variable substitution and unresolved-variable handling exit 0
</acceptance_criteria>

<verify>
- `pnpm vitest run src/features/app-shell/domain/url-resolution.test.ts src/lib/request-workspace.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml request_runtime -- --nocapture`
</verify>

<done>
- 前端预览解析与 Rust 执行编译的优先级/缺失变量语义不再漂移
- 至少一个 app-shell 层入口能消费结构化解析结果，而不是各自手写模板替换
- 缺失关键变量时，发送会被阻断且原因可供 UI 使用
</done>

### Task 2 — Auth Consistency Across Edit, Send, Restore, Replay, And Execution

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- `src/types/request.ts`
- `src/lib/request-workspace.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/lib/tauri-client.ts`
- `src-tauri/src/core/request_runtime.rs`
- `src-tauri/src/core/request_executor.rs`
- `src-tauri/src/core/mcp_runtime.rs`
- `.planning/phases/03-variables-and-secrets/03-RESEARCH.md`
</read_first>

<action>
Make auth behavior consistent from request editing through live execution and restored request state. Keep `AuthConfig` as the canonical model and avoid introducing a separate auth profile system.

Split execution work explicitly across two sub-concerns:
- frontend/app-shell consistency: edit, preview, send preparation, save/reopen, startup restore, history replay
- Rust execution consistency: `compile_request` + executor consume the same auth meaning, especially for `API Key` query/header placement

Concrete implementation goals:
- preserve `No Auth`, `Basic Auth`, `Bearer Token`, and `API Key` as the only in-scope auth modes for Phase 3
- ensure API Key placement (`header` vs `query`) drives both previewed/resolved request state and actual execution behavior
- keep history replay, saved request reopen, and startup restore aligned with the same auth model used for live send
- minimize duplication between frontend send preparation and Rust execution by passing a coherent compiled request boundary
- avoid dragging OAuth, signing schemes, token refresh, or MCP-specific secret abstractions into this phase
</action>

<acceptance_criteria>
- auth mode selection remains within the existing `AuthConfig` model and flows through request open/save/replay/send consistently
- API Key placement behavior is asserted for both header and query cases at preview/send/execution level
- live send behavior no longer depends on multiple divergent auth-assembly paths for the same HTTP request
- replayed/restored tabs preserve auth configuration without type drift or placement loss
- targeted tests covering bearer/basic/api-key behavior exit 0
</acceptance_criteria>

<verify>
- `pnpm vitest run src/features/app-shell/state/app-shell-services.test.ts src/lib/tauri-client.test.ts src/stage-gate.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml request_executor -- --nocapture`
</verify>

<done>
- `No Auth` / `Basic` / `Bearer` / `API Key` 四种模式在编辑、发送、恢复、回放上语义一致
- API Key query/header placement 至少有一条前端回归和一条 Rust 执行侧验证
- 不再存在 UI 保留状态但发送链路走另一套 auth 注入规则的情况
</done>

### Task 3 — Secret-Safe Export, Share, And Migration Hardening

<wave>2</wave>
<depends_on>Task 1, Task 2</depends_on>

<read_first>
- `src/lib/tauri-client.ts`
- `src/features/app-shell/state/app-shell-dialogs.ts`
- `src-tauri/src/services/workspace_service.rs`
- `src-tauri/src/storage/repositories/workspace_repo.rs`
- `src-tauri/src/commands/request.rs`
- `.planning/phases/02-workspace-assets/02-CONTEXT.md`
- `.planning/phases/03-variables-and-secrets/03-RESEARCH.md`
</read_first>

<action>
Extend the product's existing local-asset export/import workflow so workspace packages are secret-safe by default. In this phase, “share” means the same current export-file / backup-file path, not a separate product surface.

Concrete implementation goals:
- define which fields count as sensitive for Phase 3: bearer token, basic auth password, API key value, and environment variables clearly intended as secrets
- apply secret-safe transformation during export package construction, not only in history or request logging paths
- keep import behavior compatible with exported placeholder values so imported workspaces remain editable and understandable without falsely restoring secret plaintext
- preserve non-secret request structure, collection membership, and environment topology while redacting only sensitive values
- ensure replay/restore/import flows do not mistake placeholder secret values for real credentials and silently resend them as if they were real secrets
</action>

<acceptance_criteria>
- workspace/application export no longer serializes in-scope secret values as raw plaintext by default
- exported file path covers the current product meaning of export/share/migration for this phase
- imported redacted packages still load as valid editable assets with understandable placeholder state
- secret-safe rules are implemented in the existing workspace export/import seam rather than scattered per component
- destructive migration behavior remains deterministic and existing scope/conflict flows still pass
</acceptance_criteria>

<verify>
- `pnpm vitest run src/lib/tauri-client.test.ts src/features/app-shell/state/app-shell-dialogs.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml workspace_repo -- --nocapture`
</verify>

<done>
- 导出 JSON 默认不再携带明文 secret
- 导入后的占位值仍可编辑，但不会被系统误判为真实 secret 自动发送
- “分享”覆盖范围已被明确限定为现有导出文件路径，不新增额外机制
</done>

### Task 4 — Variable, Auth, Secret, And Recovery Regression Guardrails

<wave>3</wave>
<depends_on>Task 1, Task 2, Task 3</depends_on>

<read_first>
- `src/features/app-shell/domain/url-resolution.test.ts`
- `src/lib/request-workspace.test.ts`
- `src/lib/tauri-client.test.ts`
- `src/features/app-shell/**/*.test.ts`
- `src/features/app-shell/test/*.ts`
- `src/stage-gate.test.ts`
- `src-tauri/Cargo.toml`
- `.planning/codebase/TESTING.md`
</read_first>

<action>
Add or update focused regression coverage around variable resolution, send blocking feedback, auth placement, request restoration, secret-safe export behavior, and redacted restore/replay semantics. Prefer the existing Vitest seam tests, app-shell integration suites, and Rust unit coverage where export/repository/runtime behavior changes materially.

Concrete validation scope:
- variable placeholders resolve consistently in preview/selectors and send preparation
- unresolved critical variables produce explicit blocking/error behavior plus visible app-shell feedback
- bearer/basic/api-key auth survives save/reopen/history replay and matches actual send semantics
- exported workspace/application packages redact in-scope secret values while preserving asset structure
- saved request + startup restore + history replay remain editable after redaction and do not resend placeholder secret values as real credentials
- full regression suite continues to validate the mainline request loop after these changes
</action>

<acceptance_criteria>
- Phase 3 adds or updates frontend tests for variable resolution, app-shell feedback, and auth behavior under the existing test structure
- at least one regression test covers API key placement and one covers secret-safe export data
- at least one regression test covers redacted import/replay/restore semantics
- if Rust export/repository/runtime logic changes materially, matching Rust-side tests are added or updated
- `pnpm test` exits 0 after changes
- `cargo check --manifest-path src-tauri/Cargo.toml` exits 0 after changes
</acceptance_criteria>

<verify>
- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`
</verify>

<done>
- 变量、鉴权、脱敏、恢复四条链路都有对应回归防线
- 缺失变量阻断发送时，至少一个 UI/状态层测试验证了显式反馈
- redacted import/replay/restore 不会把占位值当真 secret 重新注入请求
</done>

<threat_model>
## Threat Model

### In-Scope Risks
- variable resolution drifting between preview, send, restore, and replay entry points
- API Key placement or auth mode state being preserved in UI but executed differently at send time
- secret values being removed from history but still leaking through workspace export or migration packages
- missing variables silently degrading requests into malformed URLs or blank auth headers
- placeholder secret values being replayed or restored as though they were real credentials

### Mitigations Required In Plan
- one shared semantic contract between frontend resolution and Rust `compile_request`
- one canonical auth flow from editable draft to executed payload
- export-time secret redaction applied in the workspace package seam
- regression coverage for runtime behavior, UI blocking feedback, and persisted/exported artifacts

### Blockers
- Any plan change that introduces a new variable DSL, OAuth flow, script engine, or system keychain integration is blocked for this phase
- Any plan change that spreads resolution or redaction rules across multiple UI components without a shared pure-logic owner is blocked
- Any implementation that keeps export packages carrying plaintext secrets by default is blocked
</threat_model>

## Execution Waves

| Wave | Tasks | Reason |
|------|-------|--------|
| 1 | Task 1, Task 2 | Variable semantics and auth consistency define the canonical runtime contract and can be hardened together |
| 2 | Task 3 | Secret-safe export/share/migration depends on the canonical auth/value model being clarified |
| 3 | Task 4 | Regression coverage should validate the final Phase 3 behavior as a whole |

## Verification Commands

- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes For Executor

- Keep Phase 3 focused on consistency and safety, not on expanding auth capability surface.
- Prefer evolving `src/features/app-shell/domain/url-resolution.ts`, adjacent frontend pure-logic helpers, existing app-shell state/services, and current Rust `request_runtime` / workspace export seams over inventing a parallel architecture.
- Reuse the current `AuthConfig` and environment models; add only the minimum structure needed to encode deterministic resolution and redaction rules.
- When variable or secret handling is ambiguous, default toward explicit feedback and privacy-safe behavior instead of silent convenience.
