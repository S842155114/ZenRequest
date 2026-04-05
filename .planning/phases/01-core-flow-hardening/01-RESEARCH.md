# Phase 1: Core Flow Hardening - Research

**Researched:** 2026-04-06
**Domain:** request editing, execution, response viewing, startup recovery, and large-payload / high-frequency reliability in a local-first Tauri desktop app
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Core flow priority
- **D-01:** 本阶段以“开发者愿意日常打开使用”为首要目标，优先解决主链路流畅性、稳定性和恢复可靠性，而不是新增能力面。
- **D-02:** 允许为提升稳定性重构主链路内部边界，但不引入新的产品能力，不追求对外可见的大功能扩展。

### Startup and recovery behavior
- **D-03:** 启动恢复必须是 Phase 1 的核心交付，而不是附带优化；应用重启后应优先恢复最近工作区、标签页和当前调试上下文。
- **D-04:** 恢复失败时优先保证“可进入可继续使用”的降级体验，必须给出明确状态和错误信息，不能静默失败或把用户丢在不一致状态。

### Large payload and repeated execution behavior
- **D-05:** 大响应体、文件上传和频繁重发场景按真实高频使用场景处理，目标是避免明显卡顿、崩溃、历史污染或 UI 锁死。
- **D-06:** Phase 1 优先保证主链路在压力场景下仍然可预期；若需要取舍，应优先保证稳定和可恢复，而不是追求花哨展示。

### Architecture boundary during hardening
- **D-07:** 延续现有分层：组件负责展示与交互转发，组合式函数负责状态编排，`lib` 负责纯函数与运行时桥接，Rust 侧负责执行与存储。
- **D-08:** 本阶段不接受把更多执行策略、恢复规则或复杂状态判断重新塞进 Vue 组件模板；如需收敛复杂性，应向既有服务层、store 或 Rust 侧边界归拢。

### Error handling and observability
- **D-09:** 用户可见错误信息必须帮助定位“发送失败 / 恢复失败 / 历史写入异常 / 大响应处理异常”等问题来源，不能只显示泛化失败提示。
- **D-10:** 本阶段的可观测性以支撑主链路定位问题为目标，优先补齐启动态、执行态和恢复态的状态表达，而不是扩展为完整 tracing 产品能力。

### Claude's Discretion
- 启动恢复链路的具体拆分方式
- 响应展示层面的局部性能优化手法
- UI 细节、提示文案的具体布局与呈现
- 具体测试分层与验证顺序

### Deferred Ideas (OUT OF SCOPE)
- None explicitly listed in `01-CONTEXT.md`; treat collections management, environment/secret boundary work, assertion-system deepening, and MCP workbench expansion as out of scope for this phase per the phase boundary text. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | 开发者可以在单个工作区中快速创建、编辑并重复发送 HTTP 请求 | Existing composable/runtime bridge split supports isolating editing state from execution side effects; focus planning on app-shell orchestration, request-workspace cloning/snapshots, and Tauri execution contract hardening. [VERIFIED: .planning/REQUIREMENTS.md] |
| CORE-02 | 开发者可以查看响应状态码、耗时、响应头、原始响应和格式化响应内容 | Current response model already carries status, headers, responseBody, stale state, and executionSource; Phase 1 should harden projection/performance rules instead of inventing new response models. [VERIFIED: src/types/request.ts][VERIFIED: src/lib/request-workspace.ts] |
| CORE-03 | 开发者在重启应用后可以恢复最近工作区、标签页和当前调试上下文 | `useAppShell.ts` is already the startup and recovery entrypoint; planner should center work on deterministic restore sequencing, degraded fallback, and explicit startup state transitions. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md][VERIFIED: src/features/app-shell/composables/useAppShell.ts] |
| CORE-04 | 开发者在处理大响应体、文件上传和频繁重发时不会遇到明显卡顿、崩溃或历史损坏 | Existing request/response snapshot + history persistence path already touches frontend state, invoke bridge, and SQLite writes, so plan must validate pressure-path ownership and avoid deep reactive churn on large payloads. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: src/lib/tauri-client.ts][VERIFIED: src-tauri/src/storage/db.rs] |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Follow repo-local instructions from `AGENTS.md`; this repo does not contain `CLAUDE.md` in the working directory. [VERIFIED: filesystem check]
- Preserve current stack: Vue 3 + TypeScript + Vite, Tauri 2, Rust, `reqwest`, SQLite + `rusqlite`, Tailwind CSS, Vitest + Vue Test Utils + jsdom. [VERIFIED: AGENTS.md][VERIFIED: package.json][VERIFIED: src-tauri/Cargo.toml]
- Keep the current boundary: components for presentation, composables for orchestration, `lib` for pure logic/runtime bridge, Rust for execution and storage. [VERIFIED: AGENTS.md][VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]
- Prefer incremental, local fixes over wide rewrites; do not add complexity or new product capabilities in this phase. [VERIFIED: AGENTS.md][VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]
- Tests should cover public functions and major interaction paths; if validation is not run later, it must be reported explicitly. [VERIFIED: AGENTS.md]
- Do not overwrite existing uncommitted work; current repo has untracked `.planning/` content, so Phase 1 planning should keep work scoped to the phase artifact path only. [VERIFIED: git status]

## Summary

Phase 1 should be planned as a hardening pass over an already-established architecture, not as a feature-build phase. The evidence from the current codebase points to a good existing split: `src/features/app-shell/composables/useAppShell.ts` owns startup/runtime orchestration, `src/lib/request-workspace.ts` owns snapshot and clone semantics, `src/lib/tauri-client.ts` owns frontend↔Tauri contract shaping, and Rust storage/execution layers persist history and runtime results. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md][VERIFIED: AGENTS.md][VERIFIED: src/lib/tauri-client.ts][VERIFIED: src/lib/request-workspace.ts]

The main planning risk is not “missing capability” but “boundary overload.” Current research and codebase notes both warn that startup recovery, runtime invocation, toast/error state, tab/session recovery, and pressure-path behavior can keep accreting into app-shell orchestration. Phase 1 should therefore be planned around explicit state ownership, deterministic recovery sequencing, and stress-path degradation rules rather than around UI polish or additional request features. [VERIFIED: .planning/codebase/ARCHITECTURE.md][VERIFIED: .planning/codebase/CONCERNS.md][VERIFIED: .planning/research/SUMMARY.md]

For large responses and repeated sends, Vue and Tauri guidance support a pragmatic approach: keep frontend composables responsible for lifecycle-safe orchestration, keep Rust commands returning structured `Result` values that reject cleanly on the frontend, and avoid deep reactivity on large immutable payloads when a shallow ownership model is sufficient. [CITED: https://v2.tauri.app/develop/calling-rust][CITED: https://github.com/vuejs/docs/blob/main/src/guide/reusability/composables.md][CITED: https://github.com/vuejs/docs/blob/main/src/api/reactivity-advanced.md]

**Primary recommendation:** Plan Phase 1 around three tracks only: deterministic startup recovery, execution/history error-surface hardening, and large-payload/high-frequency state-performance containment. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | 3.5.13 in repo | UI and composables orchestration | Existing app already uses Vue 3 Composition API; official composable guidance matches current `use*` orchestration style. [VERIFIED: package.json][CITED: https://github.com/vuejs/docs/blob/main/src/guide/reusability/composables.md] |
| Tauri API | ^2 in repo | Frontend invoke bridge into Rust commands | Existing runtime bridge already depends on Tauri invoke semantics; official docs confirm `Result`-based command errors map cleanly to rejected frontend promises. [VERIFIED: package.json][CITED: https://v2.tauri.app/develop/calling-rust] |
| Rust + Tauri commands | repo local | Request execution, persistence, startup/runtime services | Existing product architecture already delegates execution/storage to Rust, which aligns with local-first performance and reliability goals. [VERIFIED: AGENTS.md][VERIFIED: src-tauri/Cargo.toml] |
| SQLite + `rusqlite` | repo local | Workspace/history/session persistence | Existing storage schema already persists history and migration state locally; Phase 1 should harden usage, not replace storage. [VERIFIED: AGENTS.md][VERIFIED: src-tauri/src/storage/db.rs] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.1 in repo | Frontend unit/integration verification | Use for all new service/composable/domain hardening coverage in this phase. [VERIFIED: package.json][VERIFIED: .planning/codebase/TESTING.md] |
| Vue Test Utils | 2.4.6 in repo | Mounting components and app-shell integration tests | Use when validating startup/recovery and response-panel interaction seams through existing harness patterns. [VERIFIED: package.json][VERIFIED: .planning/codebase/TESTING.md] |
| jsdom | 29.0.1 in repo | Browser-like test environment | Use for startup/UI recovery behavior already covered by existing app and launch-document tests. [VERIFIED: package.json][VERIFIED: .planning/codebase/TESTING.md] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing composable + lib + Rust split | Move more logic into components | Rejected for this phase because phase constraints explicitly forbid pushing more strategy into Vue templates/components. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md] |
| Existing SQLite local persistence | New embedded store or browser-only cache | Rejected because it breaks local-first continuity and does not address current recovery/history correctness risks. [VERIFIED: AGENTS.md][VERIFIED: .planning/research/SUMMARY.md] |
| Vitest integration-first validation | Introduce E2E runner now | Rejected for this phase because no E2E framework is configured and current test strategy already centers service/composable/integration seams. [VERIFIED: .planning/codebase/TESTING.md] |

**Installation:**
```bash
pnpm install
cargo check --manifest-path src-tauri/Cargo.toml
```

**Version verification:**
- Repo-pinned versions were verified from `package.json`; live npm registry verification could not be completed in this session because `npm view` calls did not return within the available CLI interaction window. [VERIFIED: package.json][ASSUMED]
- Planner should treat repo versions as execution baseline for Phase 1 rather than attempting dependency upgrades inside this hardening phase. [VERIFIED: package.json][VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── features/app-shell/        # startup orchestration, recovery sequencing, top-level flow state
├── lib/                       # snapshot cloning, request/response transforms, tauri invoke contracts
├── components/                # request/response presentation and interaction forwarding
└── types/                     # stable frontend request/response/session models

src-tauri/src/
├── commands/                  # Tauri command entrypoints
├── services/                  # execution/history/recovery service logic
└── storage/                   # SQLite schema and persistence operations
```

### Pattern 1: Orchestration in composables, not in components
**What:** Keep startup, restore, send, and degraded-state sequencing inside app-shell composables or adjacent service/state modules, while UI components remain presentational. [VERIFIED: AGENTS.md][VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]
**When to use:** Any Phase 1 change that affects startup recovery, send/retry behavior, or response-state transitions.
**Example:**
```typescript
// Source: official Vue composables guidance + current repo structure
import { ref, onMounted, onUnmounted } from 'vue'

export function useRecoveryState() {
  const phase = ref<'idle' | 'loading' | 'ready' | 'degraded'>('idle')
  const error = ref<string | null>(null)

  async function restore() {
    phase.value = 'loading'
    error.value = null

    try {
      // invoke runtime bridge / load snapshot
      phase.value = 'ready'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'restore failed'
      phase.value = 'degraded'
    }
  }

  onMounted(() => {
    void restore()
  })

  return { phase, error, restore }
}
```
[CITED: https://github.com/vuejs/docs/blob/main/src/guide/reusability/composables.md]

### Pattern 2: Tauri commands return structured `Result`, frontend normalizes envelopes
**What:** Keep Rust failures explicit with `Result<Success, Error>` and translate them at the `tauri-client` boundary into stable frontend envelopes/messages. [CITED: https://v2.tauri.app/develop/calling-rust]
**When to use:** Any send, history write, startup restore, or workspace session persistence command in Phase 1.
**Example:**
```rust
#[tauri::command]
async fn restore_workspace() -> Result<WorkspaceSnapshotDto, String> {
    // load and validate snapshot
    Ok(snapshot)
}
```
```typescript
const result = await invoke('restore_workspace')
  .then((payload) => ({ ok: true as const, payload }))
  .catch((error) => ({ ok: false as const, message: String(error) }))
```
[CITED: https://v2.tauri.app/develop/calling-rust]

### Pattern 3: Treat large response bodies as replaceable payload blobs, not deeply reactive trees
**What:** Use shallow ownership for large immutable response payloads to reduce reactivity overhead, and derive formatted/preview state explicitly instead of mutating nested live structures. [CITED: https://github.com/vuejs/docs/blob/main/src/api/reactivity-advanced.md]
**When to use:** Response body storage, stale/live switching, replayed history hydration, and large-payload render preparation.
**Example:**
```typescript
import { shallowRef } from 'vue'

const rawResponseBody = shallowRef<string>('')

function applyResponse(body: string) {
  rawResponseBody.value = body
}
```
[CITED: https://github.com/vuejs/docs/blob/main/src/api/reactivity-advanced.md]

### Anti-Patterns to Avoid
- **App-shell accretion:** Do not keep adding recovery policy, send retries, history-writing heuristics, and UI fallback logic directly into one giant `useAppShell` branch tree; split by state/service responsibility. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md][VERIFIED: .planning/codebase/ARCHITECTURE.md]
- **Deep-clone everywhere on hot path:** Existing snapshot cloning is useful for persistence boundaries, but plan should avoid unnecessary whole-response cloning during repeated live updates for large payloads. [VERIFIED: src/lib/request-workspace.ts][VERIFIED: .planning/codebase/CONCERNS.md]
- **Generic failure messages:** Planner should require domain-specific failure surfaces for send, restore, history write, and response processing failures. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md][VERIFIED: .planning/REQUIREMENTS.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontend↔Rust error transport | Ad-hoc string parsing at call sites | Single `tauri-client` envelope normalization layer | Prevents error-shape drift and keeps UI consistent across commands. [VERIFIED: src/lib/tauri-client.ts][CITED: https://v2.tauri.app/develop/calling-rust] |
| Startup lifecycle coordination | Component-local restore logic | App-shell composable/state orchestration | Matches current repo boundary and keeps restore semantics testable. [VERIFIED: AGENTS.md][VERIFIED: src/features/app-shell/composables/useAppShell.ts] |
| Response snapshot copying | Manual per-component copy logic | Central `request-workspace` clone/snapshot helpers | Existing code already centralizes request/response/environment cloning. [VERIFIED: src/lib/request-workspace.ts] |
| Pressure-path testing | Manual clicking only | Existing Vitest service/composable/app-shell integration harness | Existing test suite already exercises app-shell and lib seams without adding a new test framework. [VERIFIED: .planning/codebase/TESTING.md] |

**Key insight:** Phase 1 should mostly standardize and narrow existing seams, not invent new abstractions. The “don’t hand-roll” risk is duplicating recovery, error normalization, or snapshot logic outside the boundaries that already exist. [VERIFIED: AGENTS.md][VERIFIED: .planning/codebase/ARCHITECTURE.md]

## Common Pitfalls

### Pitfall 1: Startup recovery mixes data load, validation, and UI unblock in one opaque step
**What goes wrong:** A partial restore failure leaves the app neither fully restored nor clearly degraded.
**Why it happens:** Startup work is coordinated from app-shell entrypoints, so it is easy to collapse load, validate, select-tab, and toast work into one unobservable sequence. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md][VERIFIED: src/features/app-shell/composables/useAppShell.ts]
**How to avoid:** Plan explicit recovery phases such as `loading snapshot` → `validating` → `hydrating visible state` → `ready/degraded`, with user-visible fallback status.
**Warning signs:** “Works after reload” bugs, empty current tab with non-empty history, or startup errors that only appear in console logs. [VERIFIED: .planning/codebase/CONCERNS.md]

### Pitfall 2: History persistence and live response state drift apart under repeated sends
**What goes wrong:** Rapid re-send or large response paths create stale UI, duplicate history, or incorrect response provenance.
**Why it happens:** Live execution, response projection, and SQLite history insertions cross frontend and Rust boundaries. [VERIFIED: src/lib/tauri-client.ts][VERIFIED: src-tauri/src/storage/db.rs]
**How to avoid:** Plan for explicit execution IDs / provenance checks and a single commit point for history snapshots after a successful execution result is normalized.
**Warning signs:** History item content differs from visible response panel, or stale/live flags become inconsistent. [VERIFIED: src/types/request.ts]

### Pitfall 3: Large payload handling stays deeply reactive
**What goes wrong:** UI locks, unnecessary re-renders, and poor typing responsiveness when large response bodies or replay artifacts are loaded.
**Why it happens:** Vue deep reactivity is expensive for large nested immutable structures when only replacement semantics are needed. [CITED: https://github.com/vuejs/docs/blob/main/src/api/reactivity-advanced.md]
**How to avoid:** Plan shallow ownership for heavyweight payloads and isolate derived formatting/preview work from edit-state reactivity.
**Warning signs:** Typing lag after response load, response panel resize jank, or startup recovery slowdown proportional to last response size.

### Pitfall 4: Error hardening stops at generic `request failed`
**What goes wrong:** Users cannot tell whether a failure came from network execution, history write, response decode, or startup recovery.
**Why it happens:** Multiple flows can reject via the same Tauri invoke boundary if messages are not normalized with context. [CITED: https://v2.tauri.app/develop/calling-rust][VERIFIED: .planning/research/PITFALLS.md]
**How to avoid:** Plan error taxonomy and UI mapping early; require source-aware codes/messages at the bridge boundary.
**Warning signs:** Tests only assert thrown errors or generic toast text. [VERIFIED: .planning/codebase/TESTING.md]

## Code Examples

Verified patterns from official and codebase sources:

### Structured Tauri command failure
```rust
#[tauri::command]
fn login(user: String, password: String) -> Result<String, String> {
  if user == "tauri" && password == "tauri" {
    Ok("logged_in".to_string())
  } else {
    Err("invalid credentials".to_string())
  }
}
```
```javascript
invoke('login', { user: 'tauri', password: '0j4rijw8=' })
  .then((message) => console.log(message))
  .catch((error) => console.error(error))
```
Source: [CITED: https://v2.tauri.app/develop/calling-rust]

### Vue composable lifecycle-safe side effects
```javascript
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(event) {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
```
Source: [CITED: https://github.com/vuejs/docs/blob/main/src/guide/reusability/composables.md]

### Existing repo pressure-path model hooks
```typescript
export const cloneResponse = (response?: Partial<ResponseState>): ResponseState => {
  const merged = {
    ...defaultResponseState(),
    ...response,
  }

  return {
    ...merged,
    requestKind: response?.requestKind ?? merged.requestKind ?? 'http',
    mcpArtifact: cloneMcpExecutionArtifact(response?.mcpArtifact ?? merged.mcpArtifact),
    state: response?.state ?? resolveResponseStateFromStatus(merged.status),
    stale: response?.stale ?? false,
    executionSource: response?.executionSource ?? merged.executionSource ?? 'live',
    headers: (response?.headers ?? []).map((header) => ({ ...header })),
    testResults: (response?.testResults ?? []).map((result) => ({ ...result })),
  }
}
```
Source: [VERIFIED: src/lib/request-workspace.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Feature-centric expansion on API tools | Reliability-first local workbench hardening before more capability breadth | Current planning state, 2026 | Phase 1 should invest in daily-use stability rather than parity chasing. [VERIFIED: .planning/research/SUMMARY.md] |
| Generic request-only desktop client | Local-first workbench with HTTP plus emerging MCP support | Current repo state, 2026 | Shared execution/history models must stay stable enough for later MCP/agent expansion. [VERIFIED: README.md][VERIFIED: .planning/research/SUMMARY.md] |
| Browser-like thin frontend | Frontend orchestration + Rust execution/storage split | Current repo state | Reliability work belongs mostly at orchestration and runtime boundaries, not in view components. [VERIFIED: AGENTS.md][VERIFIED: .planning/codebase/ARCHITECTURE.md] |

**Deprecated/outdated:**
- Broad “add more features first” strategy for this phase: explicitly out of step with Phase 1 decisions, which prioritize hardening over new capability surface. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]

## Open Questions

1. **What exact startup state machine already exists inside `useAppShell.ts`, and which transitions are currently implicit rather than modeled?**
   - What we know: `useAppShell.ts` is the startup/recovery entrypoint and already owns runtime-ready and toast orchestration. [VERIFIED: .planning/phases/01-core-flow-hardening/01-CONTEXT.md]
   - What's unclear: The precise transition graph was not exhaustively enumerated from the truncated file read in this session.
   - Recommendation: Planner should add an initial mapping task for startup states/events before implementation decomposition.

2. **Where is the authoritative execution→history commit point today?**
   - What we know: `tauri-client` shapes send payloads/results, and Rust storage persists history rows including request snapshot and response preview fields. [VERIFIED: src/lib/tauri-client.ts][VERIFIED: src-tauri/src/storage/db.rs]
   - What's unclear: Whether history insertion is always coupled to successful response normalization or can diverge under partial failures.
   - Recommendation: Planner should schedule a trace task through send command, response normalization, and history insert/update semantics.

3. **Which response-view formatting steps are hottest for large payloads?**
   - What we know: Response viewing and large payload reliability are in scope, and Vue shallow refs are the standard optimization knob for large immutable structures. [VERIFIED: .planning/REQUIREMENTS.md][CITED: https://github.com/vuejs/docs/blob/main/src/api/reactivity-advanced.md]
   - What's unclear: Whether the bottleneck is syntax formatting, deep reactivity, duplicate snapshot copies, or panel rendering.
   - Recommendation: Planner should include a profiling/measurement subtask before choosing specific response-panel optimizations.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | frontend build/tests | ✓ | v25.7.0 | — |
| pnpm | frontend scripts | ✓ | 10.33.0 | npm can install, but repo scripts assume pnpm |
| cargo | Rust checks/build | ✓ | 1.93.1 | — |
| rustc | Tauri/Rust compilation | ✓ | 1.93.1 | — |
| sqlite3 | local DB inspection/debugging | ✓ | 3.51.3 | Rust-side tests can still inspect via code if CLI unavailable |
| npm | registry/package inspection | ✓ | 11.10.1 | — |

**Missing dependencies with no fallback:**
- None detected for planning and validation preparation. [VERIFIED: local environment probe]

**Missing dependencies with fallback:**
- None detected. [VERIFIED: local environment probe]

## Sources

### Primary (HIGH confidence)
- `/websites/v2_tauri_app` - Tauri command invocation and `Result`-based error handling
- `/vuejs/docs` - composables guidance and `shallowRef` performance guidance
- `AGENTS.md` - project boundaries, stack, and architecture rules
- `.planning/phases/01-core-flow-hardening/01-CONTEXT.md` - locked phase decisions and scope
- `.planning/REQUIREMENTS.md` - Phase 1 requirement IDs and descriptions
- `.planning/codebase/ARCHITECTURE.md` - current system layering and weak points
- `.planning/codebase/CONCERNS.md` - persistence/recovery/payload risk focus
- `.planning/codebase/TESTING.md` - current verification strategy
- `src/features/app-shell/composables/useAppShell.ts` - startup/orchestration anchor
- `src/lib/tauri-client.ts` - runtime bridge anchor
- `src/lib/request-workspace.ts` - snapshot/clone anchor
- `src-tauri/src/storage/db.rs` - history persistence schema and storage anchor

### Secondary (MEDIUM confidence)
- `README.md` - product framing and current capability boundaries
- `.planning/research/SUMMARY.md` - synthesized roadmap risk prioritization
- `.planning/research/PITFALLS.md` - domain failure patterns aligned with this phase

### Tertiary (LOW confidence)
- Live registry currency for npm package latest versions beyond repo-pinned values; registry commands were attempted but did not complete in-session. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - repo stack and official docs align cleanly; no ambiguity for Phase 1 execution baseline.
- Architecture: HIGH - phase context, AGENTS guidance, and existing anchors all point to the same composable/lib/Rust boundary.
- Pitfalls: HIGH - pitfalls are strongly corroborated by planning docs, codebase concerns, and official runtime/composable guidance.

**Research date:** 2026-04-06
**Valid until:** 2026-05-06
