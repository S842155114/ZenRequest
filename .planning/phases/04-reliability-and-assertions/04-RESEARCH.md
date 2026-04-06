# Phase 4: Reliability And Assertions - Research

**Researched:** 2026-04-06
**Domain:** Request assertions, structured failure diagnostics, and local-first recovery
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Assertion scope and product posture
- **D-01:** 本阶段断言能力以“基础且高频可用”为目标，优先覆盖常见 HTTP 调试验证，而不是把 ZenRequest 做成完整测试平台。
- **D-02:** 断言结果必须与一次请求执行直接关联，开发者在发送请求后应能立即看到断言通过/失败及其原因。
- **D-03:** 基础断言优先围绕状态码、响应头、响应体关键内容或结构化结果展开；复杂脚本、跨请求编排和高级测试 DSL 不在本阶段范围内。

### Result presentation and failure readability
- **D-04:** 断言失败信息必须帮助开发者快速定位“哪个断言失败、预期是什么、实际是什么”，不能只给笼统的失败结论。
- **D-05:** 请求执行失败、导入失败、持久化失败、恢复失败应尽量映射到可区分的错误类别，让用户能判断是网络问题、数据问题、导入数据问题还是本地存储问题。
- **D-06:** 错误反馈优先采用结构化、可行动的信息表达，至少要回答“发生了什么”和“接下来建议做什么”。

### Recovery and diagnostics boundary
- **D-07:** 本阶段要补的是本地恢复与诊断信心，而不是自动修复一切；当数据库损坏、历史异常或恢复失败时，应优先提供清楚提示、可执行建议和安全降级。
- **D-08:** 若遇到无法立即恢复的数据问题，产品应优先保护现有可读数据和继续使用能力，避免因单点异常导致整个应用不可用。
- **D-09:** 诊断信息要服务于本地优先、隐私优先定位：帮助定位问题，但不暴露敏感 secret、内部路径细节或不必要的实现噪声。

### Architecture boundary during reliability hardening
- **D-10:** 延续现有分层：组件负责展示断言结果与错误状态，app-shell / feature composable 负责编排执行与恢复流程，`src/lib/tauri-client.ts` 负责错误 DTO 归一化与前后端边界，Rust 侧负责执行结果、持久化和诊断来源建模。
- **D-11:** 不接受把断言计算、恢复判断和错误分类逻辑散落到多个 Vue 组件中；共享规则应优先沉淀到领域/状态层或 Rust 服务边界。
- **D-12:** 本阶段如需增强响应结果模型或错误返回结构，应优先采用能同时服务 HTTP 主链路与后续 MCP 工作台的稳定边界，而不是临时拼字段。

### Scope guardrails
- **D-13:** Phase 4 的重点是“基础断言 + 可靠诊断 + 可恢复提示”，不是新增更多请求能力面。
- **D-14:** 如果“断言能力更强”与“主链路更稳定、更容易定位问题”冲突，优先稳定性和可解释性，而不是测试能力堆叠。

### Claude's Discretion
- 断言编辑器的最小可行交互形式
- 断言结果在请求面板中的信息层级与布局细节
- 错误类别的具体命名与映射粒度
- 恢复建议采用 inline、toast、banner 还是对话框的具体组合
- 测试分层与验证顺序

### Deferred Ideas (OUT OF SCOPE)
- None explicitly listed in CONTEXT.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | 开发者可以为请求添加基础断言测试，并在请求执行后查看断言结果 | Existing TS/Rust assertion models, request test editor, response panel test tab, and execution artifact path support a focused implementation without introducing a new DSL. |
| TEST-02 | 开发者在本地数据库损坏、数据恢复失败或历史记录异常时可以得到明确诊断与可执行恢复提示 | Current snapshot parsing, SQLite bootstrap/migration errors, and repository deserialization hotspots identify where structured recovery diagnostics and degraded-mode handling should be added. |
| TEST-03 | 开发者在请求执行、导入或持久化失败时可以看到结构化且可定位的错误信息 | Existing `ApiEnvelope`/`AppError` seam and runtime client/service layers provide the right place to normalize error categories, user actions, and redacted details. |
</phase_requirements>

## Summary

ZenRequest already has the skeleton for Phase 4: request tabs can store test definitions, Rust already evaluates assertions during HTTP execution, the response model already carries assertion results, the frontend already has a request-tests editor, and startup persistence already distinguishes local snapshot parse failures from valid state. [VERIFIED: codebase grep] The planning opportunity is not to invent a new testing subsystem, but to tighten the existing seams so the app can consistently explain failures and recover without hiding data corruption behind silent fallbacks. [VERIFIED: codebase grep]

The strongest implementation path is to treat reliability as a contract problem across three boundaries: request execution (`send_request` / `send_mcp_request`), persistence/bootstrap (SQLite open, migration, row decode, local snapshot hydrate), and user-facing diagnosis (`runtimeClient` -> app-shell services -> banners/toasts/panels). [VERIFIED: codebase grep] The codebase already uses a stable envelope shape (`ok`, `data`, `error`) and a layered architecture where Vue components present data, composables coordinate state, `src/lib/tauri-client.ts` normalizes runtime boundaries, and Rust services own execution/storage. [VERIFIED: codebase grep]

**Primary recommendation:** Keep assertions intentionally small, centralize diagnostic categorization in DTO/domain boundaries, and add explicit recovery-oriented error payloads instead of more UI-only messaging. [VERIFIED: codebase grep]

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` file exists at the project root, so there are no additional project-specific directives from that file. [VERIFIED: local file check]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vue` | `3.5.32` | UI rendering and composables for request/response state | Already the project’s frontend runtime and the standard place for state orchestration in this repo. [VERIFIED: npm registry] |
| `vitest` | `4.1.2` | Frontend/unit integration tests | Already configured in `package.json`; existing suite coverage for app-shell and lib logic makes it the standard verification path. [VERIFIED: npm registry] |
| `@vue/test-utils` | `2.4.6` | Vue component and composable integration testing | Existing tests use it; no new frontend test harness is needed. [VERIFIED: npm registry] |
| `tauri` | `2.10.3` | Desktop command/runtime boundary | The repo is already on Tauri 2 and Phase 4 must extend its DTO/command contracts rather than bypass them. [VERIFIED: crates.io] |
| `reqwest` | `0.13.2` current / repo uses `0.12` | HTTP execution engine | The project already executes requests via `reqwest`; Phase 4 should harden error mapping around this engine, not replace it. [VERIFIED: crates.io] |
| `rusqlite` | `0.39.0` current / repo uses `0.32` | Local SQLite persistence and migrations | The project already persists all durable state through `rusqlite`, making it the standard place for corruption and migration diagnostics. [VERIFIED: crates.io] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsdom` | `29.0.1` | Browser-like test runtime for snapshot and UI state tests | Use for frontend tests that simulate localStorage, startup hydration, and response display. [VERIFIED: package.json] |
| `serde` | `1` | DTO serialization across Rust/Tauri boundary | Use for any new structured error or recovery payloads crossing the Tauri boundary. [VERIFIED: `src-tauri/Cargo.toml`] |
| `serde_json` | `1` | JSON encode/decode for stored payloads and diagnostics | Use when preserving parse context or safe machine-readable diagnostic metadata. [VERIFIED: `src-tauri/Cargo.toml`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Repo-native assertion DTOs | A script-based test DSL | Conflicts with D-01/D-03 and adds a new execution sandbox the product explicitly does not need yet. [VERIFIED: CONTEXT.md] |
| Existing `ApiEnvelope<AppError>` seam | Ad hoc thrown strings per command | Faster short-term, but breaks structured failure handling and planner’s need for consistent recovery semantics. [VERIFIED: codebase grep] |
| Existing Vitest + Vue Test Utils | A new frontend E2E stack | Overkill for this phase because `workflow.nyquist_validation` is disabled and existing reliability risks are mostly unit/integration seams. [VERIFIED: `.planning/config.json`] |

**Installation:**
```bash
pnpm add vue@3.5.32
pnpm add -D vitest@4.1.2 @vue/test-utils@2.4.6
cargo add tauri@2.10.3 reqwest@0.13.2 rusqlite@0.39.0
```

The repo should not blindly upgrade to these versions during Phase 4; these commands document current upstream versions only. The actual implementation plan should stay on the repo’s existing versions unless a separate upgrade is justified. [VERIFIED: package.json] [VERIFIED: `src-tauri/Cargo.toml`]

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── components/                 # Present assertion results and diagnostic states
├── features/app-shell/         # Orchestrate execution, recovery, banners, and toasts
├── features/request-compose/   # Edit request assertions
├── features/request-workbench/ # Response/test panel state shaping
└── lib/                        # Pure snapshot/error normalization and runtime bridge helpers

src-tauri/src/
├── commands/                   # Stable Tauri command contracts
├── core/                       # Request compile/evaluate and execution helpers
├── services/                   # Execution, bootstrap, import/export, history orchestration
└── storage/                    # SQLite open, migration, repository mapping, corruption boundaries
```
[VERIFIED: codebase grep]

### Pattern 1: Evaluate assertions in the execution/runtime layer
**What:** Request assertions are already compiled with the request and evaluated against the normalized response in Rust, then returned as structured results. [VERIFIED: codebase grep]
**When to use:** For HTTP execution outcomes tied directly to one request result, especially for `TEST-01`. [VERIFIED: codebase grep]
**Example:**
```rust
pub fn evaluate_assertions(
    tests: &[RequestTestDefinitionDto],
    response: &NormalizedResponseDto,
) -> AssertionResultSetDto {
    let results = tests
        .iter()
        .map(|test| {
            let actual = match test.source.as_str() {
                "status" => response.status.to_string(),
                "header" => get_header_value(&response.headers, test.target.trim()),
                _ => response.body.clone(),
            };
            let passed = match test.source.as_str() {
                "status" => match test.operator.as_str() {
                    "contains" => actual.contains(test.expected.trim()),
                    "exists" => !actual.is_empty(),
                    _ => actual == test.expected.trim(),
                },
                "header" => match test.operator.as_str() {
                    "exists" => !actual.is_empty(),
                    "contains" => actual.contains(test.expected.trim()),
                    _ => actual == test.expected.trim(),
                },
                _ => match test.operator.as_str() {
                    "exists" => !actual.is_empty(),
                    "equals" => actual == test.expected.trim(),
                    _ => actual.contains(test.expected.trim()),
                },
            };
            RequestAssertionResultDto { id: test.id.clone(), name: test.name.clone(), passed, message: String::new() }
        })
        .collect::<Vec<_>>();

    AssertionResultSetDto {
        passed: results.iter().all(|result| result.passed),
        results,
    }
}
```
Source: [CITED: `src-tauri/src/core/request_runtime.rs`]

### Pattern 2: Keep UI editors thin and model-driven
**What:** The request tests editor is a form over `RequestTestDefinition`; it does not evaluate tests or own execution logic. [VERIFIED: codebase grep]
**When to use:** For any Phase 4 UI work that adds assertion editing or error display controls. [VERIFIED: `src/features/request-compose/components/RequestTestsSection.vue`]
**Example:**
```ts
export interface RequestTestDefinition {
  id: string
  name: string
  source: 'status' | 'header' | 'body'
  operator: 'equals' | 'contains' | 'exists'
  target?: string
  expected?: string
}
```
Source: [CITED: `src/types/request.ts`]

### Pattern 3: Normalize runtime failures at the Tauri client boundary
**What:** The project already routes frontend/backend calls through `src/lib/tauri-client.ts` and app-shell services consume the resulting envelopes. [VERIFIED: codebase grep]
**When to use:** For any new error category/recovery action payload required by `TEST-02` and `TEST-03`. [VERIFIED: codebase grep]
**Example:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}
```
Source: [CITED: `src-tauri/src/errors/mod.rs`]

### Anti-Patterns to Avoid
- **UI-scattered reliability logic:** Don’t evaluate assertions, map DB corruption, or infer recovery actions inside multiple Vue components; put that logic in `core/`, `services/`, `lib/`, or app-shell domain helpers. [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep]
- **Silent fallback on malformed persistence:** Current repository export/load paths sometimes use `unwrap_or_default()` on stored JSON, which hides corruption and weakens diagnostics. Phase 4 should reduce that in reliability-sensitive paths. [VERIFIED: `src-tauri/src/storage/repositories/history_repo.rs`]
- **Unbounded error details:** Don’t pass raw secrets, auth headers, tokens, or filesystem-heavy detail strings to the UI; the request/history path already redacts sensitive data and Phase 4 should preserve that discipline. [VERIFIED: `src-tauri/src/services/request_service.rs`] [VERIFIED: `src-tauri/src/commands/request.rs`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request assertion engine | A custom scripting language or JS sandbox | The existing `RequestTestDefinition` + Rust `evaluate_assertions` path | It already covers status/header/body checks and keeps execution deterministic and local. [VERIFIED: codebase grep] |
| Error transport contract | Per-command bespoke response shapes | `ApiEnvelope<T>` + `AppError` | Existing commands and client code already understand this shape; reusing it lowers integration risk. [VERIFIED: codebase grep] |
| Persistence corruption signaling | String matching on thrown DB messages in components | Typed error codes/categories emitted from Rust and normalized in `tauri-client` | Keeps recovery messaging consistent and testable. [VERIFIED: codebase grep] |
| Snapshot parsing heuristics in UI | Component-level localStorage parsing | `readWorkspaceSnapshotResult()` and adjacent `lib` helpers | The repo already has structured parse/invalid/missing results for browser snapshot recovery. [VERIFIED: `src/lib/request-workspace.ts`] |

**Key insight:** Phase 4 should harden and extend the contracts already present, not introduce a second reliability architecture beside them. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Treating assertion support as “not built yet”
**What goes wrong:** Planning assumes assertions need a greenfield design. [VERIFIED: codebase grep]
**Why it happens:** The UI looks lightweight, but the repo already persists tests, evaluates them in Rust, and surfaces them in response state. [VERIFIED: codebase grep]
**How to avoid:** Plan for gap-filling: better result wording, result placement, and shared DTOs for execution artifacts instead of rebuilding the feature. [VERIFIED: codebase grep]
**Warning signs:** Proposals mention adding a new DSL, client-side-only evaluation, or detached “test runner” screens. [VERIFIED: CONTEXT.md]

### Pitfall 2: Hiding corrupted local state behind defaults
**What goes wrong:** Malformed JSON rows or snapshots get swallowed, making the app appear to “forget” data without explaining why. [VERIFIED: `src/lib/request-workspace.ts`] [VERIFIED: `src-tauri/src/storage/repositories/history_repo.rs`]
**Why it happens:** Several persistence paths prefer permissive `unwrap_or_default()` or broad fallbacks. [VERIFIED: `src-tauri/src/storage/repositories/history_repo.rs`]
**How to avoid:** Convert high-risk decode points into explicit diagnostic results with actionable recovery guidance. [VERIFIED: codebase grep]
**Warning signs:** Empty history after restart, reset collections, or startup degraded state without a category/action payload. [VERIFIED: codebase grep]

### Pitfall 3: Overexposing internal details in diagnostics
**What goes wrong:** Recovery messages include raw auth values, full secret-bearing headers, or noisy low-level storage paths. [VERIFIED: codebase grep]
**Why it happens:** DB and runtime errors naturally contain sensitive or implementation-specific strings. [ASSUMED]
**How to avoid:** Preserve existing redaction for request/auth data and split developer detail from user-actionable message. [VERIFIED: `src-tauri/src/services/request_service.rs`]
**Warning signs:** Errors show `Authorization`, bearer tokens, cookies, or full internal path traces in the response panel or toast text. [VERIFIED: codebase grep]

### Pitfall 4: Planning recovery only for SQLite open failures
**What goes wrong:** The plan covers DB-open or migration failure but misses malformed row JSON, corrupted history snapshots, or import content errors. [VERIFIED: codebase grep]
**Why it happens:** “Database damage” is broader than `Connection::open` failure in this codebase. [VERIFIED: codebase grep]
**How to avoid:** Audit bootstrap, repository row mapping, import/export decode, and local snapshot parsing as one reliability surface. [VERIFIED: codebase grep]
**Warning signs:** The plan has no tasks touching `request-workspace.ts`, repository mappers, or import/export services. [VERIFIED: codebase grep]

## Code Examples

Verified patterns from the current codebase:

### Structured browser snapshot diagnosis
```ts
export const readWorkspaceSnapshotResult = (): SnapshotValidationResult => {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'missing', message: 'Workspace snapshot unavailable outside browser runtime' }
  }

  const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
  if (!raw) {
    return { ok: false, reason: 'missing', message: 'No saved workspace snapshot found' }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>
    const snapshot = sanitizeSnapshot(parsed)

    if (!snapshot) {
      return { ok: false, reason: 'invalid', message: 'Saved workspace snapshot is invalid or incomplete' }
    }

    return { ok: true, snapshot }
  } catch {
    return { ok: false, reason: 'parse_failed', message: 'Saved workspace snapshot could not be parsed' }
  }
}
```
Source: [CITED: `src/lib/request-workspace.ts`]

### Structured assertion result messaging
```rust
message: if passed {
    format!("Passed{qualifier}")
} else {
    format!(
        "Expected {}{}{}, got {}",
        test.operator,
        qualifier,
        if expected.is_empty() {
            String::new()
        } else {
            format!(" {expected}")
        },
        if actual.is_empty() {
            "empty".to_string()
        } else {
            actual
        }
    )
}
```
Source: [CITED: `src-tauri/src/core/request_runtime.rs`]

### Stable error envelope
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiEnvelope<T> {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<AppError>,
}
```
Source: [CITED: `src-tauri/src/models/envelope.rs`]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Frontend-only request shaping with minimal execution metadata | Structured execution artifacts with compiled request, normalized response, and assertion results | Already present in current codebase by 2026-04-06 | Phase 4 can build diagnosis and replay confidence on top of existing artifacts instead of inventing a new result model. [VERIFIED: codebase grep] |
| Ad hoc local snapshot parsing | Structured `missing` / `parse_failed` / `invalid` snapshot results | Already present in current codebase by 2026-04-06 | Recovery UX can distinguish no data from broken data. [VERIFIED: `src/lib/request-workspace.ts`] |
| Flat request send success/failure perception | Result model already distinguishes lifecycle states and test results, but lacks richer categorized error actions | Current repo state | Phase 4 should extend, not replace, the current model. [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- Silent defaulting for malformed persisted JSON in reliability-sensitive flows: acceptable for low-risk import/export convenience, but insufficient for Phase 4 recovery goals. [VERIFIED: `src-tauri/src/storage/repositories/history_repo.rs`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Some low-level DB/runtime errors naturally include more sensitive/noisy details than should reach the UI, beyond the specific cases already redacted in request history. | Common Pitfalls | Medium — planner may over-prioritize sanitization breadth, but the phase still benefits from a clear redaction review. |

## Open Questions

1. **Should Phase 4 introduce explicit error categories as a new DTO field, or encode categories into existing `AppError.code` values?**
   - What we know: `AppError` currently has `code`, `message`, and optional `details`; app-shell services already pass through messages. [VERIFIED: codebase grep]
   - What's unclear: Whether the frontend needs a distinct `category`/`action` contract for better UX branching. [VERIFIED: codebase grep]
   - Recommendation: Plan a small design decision early; prefer adding typed fields only if multiple UI surfaces need branching beyond `code`. [ASSUMED]

2. **Which repository decode paths should stop using permissive defaults in Phase 4 vs. later phases?**
   - What we know: History export/load currently contains permissive JSON decode fallbacks, and concerns docs flag malformed row recovery as a high-priority gap. [VERIFIED: `src-tauri/src/storage/repositories/history_repo.rs`] [VERIFIED: `.planning/codebase/CONCERNS.md`]
   - What's unclear: Whether collection/request/environment repos have the same silent-reset risk at equal severity. [VERIFIED: codebase grep]
   - Recommendation: Prioritize startup/bootstrap and history-facing paths first because they affect visible recovery confidence. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | Frontend toolchain | ✓ | `v25.7.0` | — |
| `pnpm` | Frontend tests/build | ✓ | `10.33.0` | `npm` only for package metadata, not preferred for project workflow |
| `cargo` | Rust checks/tests | ✓ | `1.93.1` | — |
| `rustc` | Rust compile/test | ✓ | `1.93.1` | — |

**Missing dependencies with no fallback:**
- None identified for planning research. [VERIFIED: local environment check]

**Missing dependencies with fallback:**
- None identified for planning research. [VERIFIED: local environment check]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 4 is not adding login/authentication flows; existing request auth config still requires redaction discipline. [VERIFIED: REQUIREMENTS + codebase grep] |
| V3 Session Management | no | No user session layer exists; focus is on local workspace/session persistence integrity. [VERIFIED: README + codebase grep] |
| V4 Access Control | no | Desktop local-first app with no multi-user authorization boundary in this phase. [VERIFIED: README] |
| V5 Input Validation | yes | Validate assertion definitions, import payloads, and persisted snapshot/row JSON before trusting them. [VERIFIED: codebase grep] |
| V6 Cryptography | no | This phase should not hand-roll cryptography; current scope is reliability and diagnostics, not crypto changes. [VERIFIED: CONTEXT.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret leakage in diagnostics/history | Information Disclosure | Reuse header/auth redaction and avoid surfacing raw sensitive values in new diagnostics. [VERIFIED: `src-tauri/src/services/request_service.rs`] |
| Corrupted local snapshot or JSON columns causing silent state loss | Tampering | Return explicit parse/invalid/corruption diagnostics and preserve degraded read access where possible. [VERIFIED: `src/lib/request-workspace.ts`] [VERIFIED: `.planning/codebase/CONCERNS.md`] |
| Import payload failures collapsing into generic errors | Repudiation / Tampering | Categorize import/data-shape failures separately from transport/runtime failures. [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep] |
| Oversized or noisy error details overwhelming users | Denial of Service / Info Disclosure | Split actionable user message from developer detail and cap previews similar to history preview truncation. [VERIFIED: `src-tauri/src/services/request_service.rs`] |

## Sources

### Primary (HIGH confidence)
- [CITED: `src-tauri/src/core/request_runtime.rs`] - assertion evaluation, compiled request pipeline
- [CITED: `src-tauri/src/services/request_service.rs`] - request execution, history persistence, redaction, execution artifacts
- [CITED: `src/lib/request-workspace.ts`] - snapshot recovery and frontend assertion helpers
- [CITED: `src/types/request.ts`] - request/response/assertion DTOs
- [CITED: `src/features/request-compose/components/RequestTestsSection.vue`] - current assertion editor UI boundary
- [CITED: `src/components/response/ResponsePanel.vue`] - current response/test result presentation boundary
- [CITED: `src-tauri/src/errors/mod.rs`] - structured error contract
- [CITED: `src-tauri/src/models/envelope.rs`] - API envelope contract
- [CITED: `.planning/phases/04-reliability-and-assertions/04-CONTEXT.md`] - locked decisions and scope
- [CITED: `.planning/REQUIREMENTS.md`] - requirement definitions
- [CITED: `.planning/ROADMAP.md`] - phase goal and ordering
- [VERIFIED: npm registry] - `vitest 4.1.2`, `@vue/test-utils 2.4.6`, `vue 3.5.32`, `@tauri-apps/api 2.10.1`, `@tauri-apps/cli 2.10.1`
- [VERIFIED: crates.io] - `rusqlite 0.39.0`, `reqwest 0.13.2`, `tauri 2.10.3`

### Secondary (MEDIUM confidence)
- [CITED: `.planning/codebase/ARCHITECTURE.md`] - system layering summary
- [CITED: `.planning/codebase/CONCERNS.md`] - risk and gap mapping for corrupted persistence and startup behavior

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified against npm/crates.io and matched against current repo manifests.
- Architecture: HIGH - conclusions are grounded in current repo code paths and planning docs.
- Pitfalls: MEDIUM-HIGH - most are directly verified in code/docs, with a small amount of inference about sanitization scope.

**Research date:** 2026-04-06
**Valid until:** 2026-05-06
