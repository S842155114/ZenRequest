# Phase 3: Variables And Secrets - Research

**Researched:** 2026-04-06
**Domain:** 变量解析、HTTP 鉴权配置、工作区导入导出 secret 边界
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Variable model and authoring scope
- **D-01:** 本阶段优先沿用现有 environment preset 模型推进，不引入新的全局变量系统或额外配置层；变量能力建立在当前工作区环境和请求模板值之上。
- **D-02:** 变量使用场景以高频 API 调试为主，重点覆盖 `baseUrl`、token、client id、api key 等常见占位值，而不是扩展为通用脚本模板语言。
- **D-03:** 变量编辑、切换与解析结果必须在请求编辑、发送、恢复和历史回放等现有入口保持一致，不允许不同入口各自实现一套解析逻辑。

### Variable resolution behavior
- **D-04:** Phase 3 必须把变量解析规则明确成可预测心智，并在前端状态层或共享纯逻辑中集中实现，避免组件、服务和 Rust 侧各自分散判断。
- **D-05:** 当变量缺失、禁用或解析失败时，优先给出明确、可定位的降级反馈，不能静默替换成错误 URL/鉴权头，也不能让请求在用户无感知的情况下发送脏值。
- **D-06:** 如果变量优先级与已有恢复/导入状态冲突，优先保证“当前激活环境 + 当前请求可见配置”这一心智稳定，而不是为了灵活性引入更多覆盖层。

### Auth behavior and request integration
- **D-07:** 本阶段要完整覆盖 `No Auth`、`Basic Auth`、`Bearer Token` 和 `API Key` 四类主流鉴权方式，且行为应与请求编辑、发送、保存和恢复链路一致。
- **D-08:** 鉴权配置继续作为请求资产的一部分进入既有请求模型、tab 状态和持久化链路，不额外引入独立 auth profile 抽象。
- **D-09:** API Key 注入位置至少要覆盖 header 与 query 两类主流入口，并保持预览值、发送值和保存值的一致性。

### Secret safety boundary
- **D-10:** secret 保护是本阶段核心交付之一；导出、迁移、分享等资产外流路径默认应避免明文 secret 被意外带出，而不是依赖用户手动记忆规避。
- **D-11:** 对 secret 的保护优先遵循“默认安全、必要时显式选择暴露”的原则；如果需要展示、覆盖或导出敏感值，界面必须给出清楚意图表达。
- **D-12:** Phase 3 的 secret 边界优先覆盖本地工作区导出/导入和请求资产迁移链路；云同步、团队共享或系统级密钥库集成不在本阶段范围内。

### Architecture boundary during hardening
- **D-13:** 延续现有分层：组件负责输入与展示，app-shell state/composable 负责编排，`src/lib/request-workspace.ts` 或相邻纯逻辑层负责变量解析与拷贝规则，`src/lib/tauri-client.ts` 负责前后端 DTO 边界，Rust 侧负责持久化与导入导出约束。
- **D-14:** 不接受把变量解析、鉴权拼装和 secret 过滤逻辑散落到多个 Vue 组件中；如需新增规则，应优先向共享状态层、纯函数层或 Rust 服务边界收敛。

### Claude's Discretion
- 变量解析提示的具体 UI 文案与展示位置
- 变量缺失时采用 inline 提示、toast 还是状态标记的具体组合
- 鉴权表单字段排布与视觉细节
- secret 脱敏在导出文件中的具体占位格式与测试分层顺序

### Deferred Ideas (OUT OF SCOPE)
- OAuth、签名算法、动态 pre-request script、自动 token 刷新 —— 后续 phase / backlog
- 系统级安全存储、主密码、操作系统钥匙串集成 —— 后续里程碑
- 团队共享变量、云同步 secret、多人协作权限模型 —— 与产品定位相关，后续单独评估
- MCP 专属变量作用域、tool-call schema 级 secret masking —— Phase 5 或后续 MCP 扩展
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VAR-01 | 开发者可以定义并使用环境变量与模板值来复用 base URL、token 和其他参数 | 通过在 `src/lib/request-workspace.ts` 集中实现模板解析、缺失变量检查和鉴权/URL/headers/query 统一编译来支撑。 |
| VAR-02 | 开发者可以明确理解变量解析优先级，并获得稳定一致的解析结果 | 通过单一“resolved request / compile request”管线、可视预览和一致错误反馈来支撑。 |
| AUTH-01 | 开发者可以对请求配置 No Auth、Basic Auth、Bearer Token 与 API Key | 通过沿用 `AuthConfig` 模型，把 UI、请求发送、历史回放、导入导出统一接入同一 auth 编译规则来支撑。 |
| AUTH-02 | 开发者在导出、分享或迁移工作区时不会意外泄露敏感 secret 值 | 通过在 Tauri 导出 DTO 与 Rust 导出实现加入默认脱敏/剥离规则，并为导入链路保留兼容占位语义来支撑。 |
</phase_requirements>

## Summary

[VERIFIED: codebase grep] 当前仓库已经具备环境、请求鉴权、导入导出和历史持久化的基础模型：`src/types/request.ts` 已定义 `AuthConfig` 与 environment 变量结构，`src/lib/request-workspace.ts` 已集中承载 request/tab/environment 的 clone 与 snapshot 纯逻辑，`src/lib/tauri-client.ts` 已统一请求发送与工作区导入导出 DTO 边界，Rust 侧已负责真实发送、OpenAPI/curl 导入与历史落库。当前缺口不是“没有模型”，而是“没有把变量解析、auth 注入、secret 过滤收敛成一条一致管线”。

[VERIFIED: codebase grep] Phase 3 最合适的落位是：前端在 `src/lib/request-workspace.ts` 新增纯函数级解析/编译层，app-shell/store 只消费其结果并负责提示；`src/lib/tauri-client.ts` 继续只做 DTO 适配；Rust `request_service` 继续只执行“已经编译好的请求”并保留历史脱敏；Rust 导入导出链路负责 secret-safe package 约束。这个分层与已有 app-shell → lib → tauri-client → Rust service 的结构一致。

[VERIFIED: codebase grep] 主风险在于“同一请求被不同入口以不同规则解析”：当前发送链路、URL 展示、导入结果、历史回放、导出包并没有一个统一的变量/鉴权编译源头。Phase 3 应先收敛编译规则，再补 UI 和导出策略；否则很容易出现预览正确但发送错误、保存正确但导出泄露、回放恢复后 auth 失真等问题。

**Primary recommendation:** [VERIFIED: codebase grep] 在 `src/lib/request-workspace.ts` 新增单一 `resolve/compile request` 纯逻辑层，统一处理模板变量替换、auth 注入、缺失变量检测和 secret 元数据判定；所有 UI、发送、恢复和导出都只消费这条结果。

## Project Constraints (from CLAUDE.md)

[VERIFIED: local filesystem] 项目根目录不存在 `CLAUDE.md`，因此本节无额外约束；仍需遵守仓库 `AGENTS.md`、现有分层与本地优先/隐私优先产品边界。

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vue` | `3.5.32` | 前端状态与组件编排 | [VERIFIED: npm registry] 当前项目已使用 Vue 3；继续在 composable/store 中承接 Phase 3 逻辑可保持现有模式一致。 |
| `@tauri-apps/api` | `2.10.1` | 前端到 Rust 的命令调用边界 | [VERIFIED: npm registry] 项目已通过 Tauri v2 命令模型调用 Rust；官方要求命令参数/返回值可序列化，适合做导入导出与请求发送 DTO 边界。[CITED: https://v2.tauri.app/develop/calling-rust/] |
| `tauri` | `2.10.3` | 桌面运行时与命令桥接 | [VERIFIED: crates.io] 当前项目已使用 Tauri 2；命令式 IPC 与本地优先目标一致。 |
| `reqwest` | `0.13.2` | Rust 侧 HTTP 发送执行 | [VERIFIED: crates.io] Reqwest 原生支持 `bearer_auth`、`basic_auth`、`query`、超时、代理和重定向策略，适合承接统一编译后的请求。 [CITED: https://docs.rs/reqwest/latest/reqwest/struct.RequestBuilder.html] |
| `rusqlite` | `0.39.0` | 本地 SQLite 持久化 | [VERIFIED: crates.io] 项目已以 SQLite + `rusqlite` 为本地数据边界，符合离线优先。 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `4.1.2` | 前端单测与状态逻辑验证 | [VERIFIED: npm registry] 用于验证纯解析函数、store 选择器、导出对话服务等；官方支持 `jsdom` 环境与逐文件环境声明。 [CITED: https://vitest.dev/guide/] |
| `@vue/test-utils` | `2.4.6` | Vue 组件与 composable 测试 | [VERIFIED: npm registry] 用于 auth/variables UI 和 app-shell 交互测试。 |
| `jsdom` | `29.0.1` | DOM 环境模拟 | [VERIFIED: package.json] 项目测试栈已安装，适合覆盖请求编辑器与导出确认 UI。 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 在 `src/lib/request-workspace.ts` 做集中编译 | 在组件或 Rust 侧分散解析 | [VERIFIED: codebase grep] 会破坏现有分层，并让请求预览、发送、保存、恢复之间更难保持一致。 |
| 继续使用现有 `AuthConfig` | 新建独立 auth profile 系统 | [VERIFIED: codebase grep] 与 D-08 冲突，且当前 repo 只有请求内嵌 auth 模型，没有第二个真实复用场景支撑更重抽象。 |
| 默认导出脱敏/剥离 secret | 导出明文并要求用户手动避免泄露 | [VERIFIED: 03-CONTEXT.md] 与 D-10 / D-11 冲突，也违背隐私优先目标。 |

**Installation:**
```bash
npm install
cargo check --manifest-path src-tauri/Cargo.toml
```

**Version verification:**
- `vue@3.5.32`，npm modified `2026-04-03T05:41:40.006Z` [VERIFIED: npm registry]
- `vitest@4.1.2`，npm modified `2026-03-26T14:36:51.783Z` [VERIFIED: npm registry]
- `@vue/test-utils@2.4.6`，npm modified `2024-05-07T00:07:49.169Z` [VERIFIED: npm registry]
- `@tauri-apps/api@2.10.1`，npm modified `2026-02-03T00:17:27.147Z` [VERIFIED: npm registry]
- `@tauri-apps/plugin-dialog@2.7.0`，npm modified `2026-04-04T16:48:51.988Z` [VERIFIED: npm registry]
- `tauri@2.10.3`，published `2026-03-04T10:43:17.516043Z` [VERIFIED: crates.io]
- `reqwest@0.13.2`，published `2026-02-06T19:47:02.850685Z` [VERIFIED: crates.io]
- `rusqlite@0.39.0`，published `2026-03-15T10:36:10.995524Z` [VERIFIED: crates.io]

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── lib/
│   ├── request-workspace.ts   # 变量解析、auth 编译、tab/request clone、snapshot 纯逻辑
│   └── tauri-client.ts        # DTO 映射与 runtime adapter 边界
├── features/app-shell/
│   ├── state/                 # 选择器、mutation、发送与导出编排
│   └── composables/           # toast / dialog / 持久化节流编排
├── features/request-compose/  # 变量与 auth 表单输入组件
└── types/request.ts           # Request/Auth/Environment DTO

src-tauri/
├── src/services/request_service.rs  # 已编译 HTTP 请求执行、历史脱敏
├── src/services/import_service.rs   # 导入服务入口
└── src/core/import_runtime.rs       # curl/OpenAPI 导入映射、auth 推断
```

### Pattern 1: 单一解析/编译入口
**What:** [VERIFIED: codebase grep] 定义一个前端纯函数层，把 `RequestTabState + active environment` 编译成统一 `ResolvedRequest` / `CompiledDraft`，其中同时包含 `resolvedUrl`、`resolvedHeaders`、`resolvedAuth`、`resolvedParams`、缺失变量列表、阻塞/提示信息。
**When to use:** [VERIFIED: 03-CONTEXT.md] 所有请求展示、发送、保存前校验、历史回放和导出预览都必须走这层。
**Example:**
```typescript
// Source: src/lib/request-workspace.ts + Phase 3 recommendation
export interface VariableResolutionIssue {
  scope: 'url' | 'header' | 'param' | 'auth'
  key: string
  template: string
  reason: 'missing' | 'disabled'
}

export interface ResolvedHttpRequestDraft {
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  auth: AuthConfig
  issues: VariableResolutionIssue[]
  isSendBlocked: boolean
}

export const resolveHttpRequestDraft = (input: {
  tab: RequestTabState
  activeEnvironment?: EnvironmentPreset
}): ResolvedHttpRequestDraft => {
  // 统一替换 {{token}} / {{baseUrl}} 并汇总缺失项
}
```

### Pattern 2: 发送链路只吃“编译结果”
**What:** [VERIFIED: codebase grep] app-shell/service 在发送 HTTP 请求前，先从共享纯逻辑拿到编译结果，再映射到 `SendRequestPayloadDto`；不要在组件、store、tauri-client、Rust 多处重复拼 `Authorization` 或 query API Key。
**When to use:** [VERIFIED: codebase grep] 发送 live request、history replay、后续保存前预检都适用。
**Example:**
```typescript
// Source: src/lib/tauri-client.ts + src/features/app-shell/state/app-shell-services.ts
const resolved = resolveHttpRequestDraft({ tab, activeEnvironment })
if (resolved.isSendBlocked) {
  throw new Error('request has unresolved variables')
}

await runtime.sendRequest(workspaceId, activeEnvironmentId, {
  ...tab,
  url: resolved.url,
  params: resolved.params,
  headers: resolved.headers,
  auth: resolved.auth,
})
```

### Pattern 3: 导出默认 secret-safe，导入接受占位值
**What:** [VERIFIED: 03-CONTEXT.md] 导出工作区 package 时默认移除或占位替换敏感值；导入时保留占位文本，不自动恢复明文 secret。
**When to use:** [VERIFIED: 03-CONTEXT.md] `export_workspace`、本地 JSON 下载、工作区迁移。
**Example:**
```typescript
// Source: recommended for src/lib/tauri-client.ts DTO boundary + Rust export service
export interface SecretExportPolicy {
  mode: 'redact'
  placeholder: '__ZENREQUEST_SECRET_REDACTED__'
}
```

### Anti-Patterns to Avoid
- **组件内自己解析模板:** [VERIFIED: 03-CONTEXT.md] 会让显示值和发送值分叉。
- **Rust 再次决定 auth 拼装规则:** [VERIFIED: codebase grep] 前端已持有完整请求编辑状态；Rust 应执行编译结果，而不是再猜一次用户意图。
- **仅在历史记录中脱敏、但导出明文:** [VERIFIED: codebase grep] 当前历史已做部分脱敏，若导出不做同等级处理，会留下明显安全边界缺口。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP Basic/Bearer 拼装 | 自己手写 `Authorization` Base64 头部逻辑到多个位置 | `reqwest` 的 `basic_auth` / `bearer_auth` 或单一前端编译层生成统一 header | [CITED: https://docs.rs/reqwest/latest/reqwest/struct.RequestBuilder.html] 已有现成语义，重复实现容易分叉。 |
| Query 参数拼接 | 手动字符串拼 URL | 统一解析后用结构化 `params` / `query` 进入发送层 | [CITED: https://docs.rs/reqwest/latest/reqwest/struct.RequestBuilder.html] 避免编码和重复问号拼接错误。 |
| 组件内 secret 判定 | 每个表单自己猜哪些字段敏感 | 在共享纯逻辑定义 `isSecretField` / `redactSecretValue` | [VERIFIED: codebase grep] secret 边界涉及导出、恢复、历史、UI，多点判断必然漂移。 |
| 新的变量 DSL | 自定义脚本模板语言 | 仅支持现有高频 `{{name}}` 占位替换 | [VERIFIED: 03-CONTEXT.md] 范围明确限制在高频 API 调试变量，不扩展为脚本系统。 |

**Key insight:** [VERIFIED: 03-CONTEXT.md] 这个阶段的复杂度不在“算法”，而在“边界一致性”；任何手写的第二套规则都会立刻破坏可预测性。

## Common Pitfalls

### Pitfall 1: URL 预览与实际发送值不一致
**What goes wrong:** [VERIFIED: codebase grep] 用户在 URL 栏看到的是原始模板或局部替换值，但 `send_request` 使用另一套拼装结果。
**Why it happens:** [VERIFIED: codebase grep] 解析逻辑散落在 selector、发送前 payload 构造和组件显示层。
**How to avoid:** [VERIFIED: 03-CONTEXT.md] 只保留一个 `resolveHttpRequestDraft`，URL 预览和发送 DTO 都从同一结果读取。
**Warning signs:** [ASSUMED] 用户报告“预览能看懂，但发出去是旧值/空值/双重 query”。

### Pitfall 2: API Key placement 只改 UI，未改执行链路
**What goes wrong:** [VERIFIED: codebase grep] `apiKeyPlacement` 在 UI 可切换，但真实发送仍然只写 header 或只写 query。
**Why it happens:** [VERIFIED: codebase grep] 当前类型已支持 `header | query`，但如果没有统一编译层，placement 很容易只停留在表单状态。
**How to avoid:** [VERIFIED: 03-CONTEXT.md] 在编译层里明确：`header` 注入 headers，`query` 注入 params/url，且预览与发送共用结果。
**Warning signs:** [VERIFIED: codebase grep] 仅有组件测试覆盖 placement 切换，而没有发送 payload / Rust 执行侧测试。

### Pitfall 3: 历史脱敏做了，导出仍明文
**What goes wrong:** [VERIFIED: codebase grep] 当前 Rust `request_service` 在历史存储前会 redaction `authorization`、`cookie`、`api-key` 与 auth 字段，但这套策略没有自然覆盖到 workspace export。
**Why it happens:** [VERIFIED: codebase grep] 历史记录与导出是两条不同的服务链路。
**How to avoid:** [VERIFIED: 03-CONTEXT.md] 把 secret-safe 规则抽成共享导出约束，并在 export package 生成时默认执行。
**Warning signs:** [VERIFIED: codebase grep] 历史查看安全，但导出的 JSON 仍含 `bearerToken` / `password` / `apiKeyValue` 明文。

### Pitfall 4: 缺失变量被静默替换为空字符串
**What goes wrong:** [VERIFIED: 03-CONTEXT.md] 请求仍被发送，但 URL 或 auth 值已经损坏。
**Why it happens:** [ASSUMED] 简化实现时常用空字符串兜底。
**How to avoid:** [VERIFIED: 03-CONTEXT.md] 区分 blocker 与 advisory；URL / auth 缺失变量默认阻止发送，普通描述性字段可仅提示。
**Warning signs:** [ASSUMED] 请求打到根路径、401、或 query/header 中出现空 token。

## Code Examples

Verified patterns from official sources and current codebase:

### Tauri 命令边界必须使用可序列化 DTO
```rust
// Source: https://v2.tauri.app/develop/calling-rust
#[tauri::command]
fn my_custom_command() -> String {
  "Hello from Rust!".into()
}
```

```ts
// Source: https://v2.tauri.app/develop/calling-rust
import { invoke } from '@tauri-apps/api/core'

invoke('my_custom_command').then((message) => console.log(message))
```

### Reqwest 支持标准 Bearer / Basic / Query
```rust
// Source: https://docs.rs/reqwest/latest/reqwest/struct.RequestBuilder.html
let response = client
    .get("https://httpbin.org/get")
    .query(&[("search", "rust")])
    .bearer_auth("my-token")
    .send()
    .await?;

let auth_response = client
    .get("https://httpbin.org/basic-auth/user/pass")
    .basic_auth("user", Some("pass"))
    .send()
    .await?;
```

### 当前仓库已有历史脱敏模式
```rust
// Source: src-tauri/src/commands/request.rs
fn is_sensitive_header(key: &str) -> bool {
    let lower = key.trim().to_ascii_lowercase();
    matches!(lower.as_str(), "authorization" | "cookie" | "set-cookie")
        || lower.contains("api-key")
        || lower == "x-api-key"
}
```

### 当前仓库已有 auth 基础模型
```typescript
// Source: src/types/request.ts
export interface AuthConfig {
  type: AuthType
  bearerToken: string
  username: string
  password: string
  apiKeyKey: string
  apiKeyValue: string
  apiKeyPlacement: 'header' | 'query'
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 组件各自决定请求展示/发送细节 | 单一共享编译层 + DTO 边界 | [ASSUMED] 这是当前桌面 API 客户端与本仓库分层更合理的做法 | 可预测性更高，测试面更集中。 |
| 明文导出整个 workspace | 默认脱敏/剥离 secret，再显式允许暴露 | [VERIFIED: 03-CONTEXT.md] 本阶段 scope 已锁定默认安全原则 | 更符合本地优先与隐私优先承诺。 |
| 单测只测 UI 切换 | 增加 pure resolver / export package / payload 编译测试 | [VERIFIED: TESTING.md + package.json] 项目已有 Vitest + jsdom，可快速补齐行为测试 | 能防止预览、发送、导出三条链路再次分叉。 |

**Deprecated/outdated:**
- [VERIFIED: 03-CONTEXT.md] 为 OAuth、签名算法、动态脚本预埋抽象：不符合本阶段范围。
- [VERIFIED: 03-CONTEXT.md] 新建全局变量系统：与 D-01 冲突。

## Open Questions

1. **导出时采用“剥离字段”还是“固定占位符”更适合当前包格式？**
   - What we know: [VERIFIED: 03-CONTEXT.md] 需要默认 secret-safe；[VERIFIED: codebase grep] 当前已有导入导出 package 流，但未见统一 secret-safe 规范。
   - What's unclear: [VERIFIED: codebase grep] 现有 import 对缺失 auth 字段与占位文本的容错边界还未被 Phase 3 文档锁定。
   - Recommendation: [ASSUMED] 优先使用固定占位符而不是删字段，避免导入 schema 漂移，并让 UI 明确显示“该值已脱敏，需要重新填写”。

2. **模板语法是否仅支持完整 token 替换，还是允许字符串内嵌？**
   - What we know: [VERIFIED: 03-CONTEXT.md] 范围强调高频 baseUrl/token/apiKey 场景，不要演变成脚本 DSL。
   - What's unclear: [VERIFIED: codebase grep] 现仓库尚未存在已实现的模板解析器可复用。
   - Recommendation: [ASSUMED] 第一版支持字符串内 `{{name}}` 替换，但仅面向字符串值，不支持函数、条件、嵌套表达式。

3. **缺失变量的 blocker 范围是否包含普通 header/query？**
   - What we know: [VERIFIED: 03-CONTEXT.md] URL 和 auth 不能静默发送脏值。
   - What's unclear: [ASSUMED] 普通自定义 header/query 缺失时，是全部阻断还是仅对启用项阻断。
   - Recommendation: [ASSUMED] 对启用且包含模板的 header/query 也默认阻断发送，这样规则最一致、最易理解。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | 前端测试/脚本 | ✓ | `v25.7.0` | — |
| `npm` | 版本核验/依赖管理 | ✓ | `11.10.1` | `pnpm` |
| `pnpm` | 项目脚本运行 | ✓ | `10.33.0` | `npm run` |
| `cargo` | Rust 检查与构建 | ✓ | `1.93.1` | — |

**Missing dependencies with no fallback:**
- None. [VERIFIED: local shell]

**Missing dependencies with fallback:**
- None. [VERIFIED: local shell]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | [VERIFIED: requirements + codebase] `AuthConfig` 限定在 HTTP 客户端侧鉴权配置，而不是用户登录系统。 |
| V3 Session Management | no | [VERIFIED: project scope] 本阶段不涉及用户会话或登录态。 |
| V4 Access Control | no | [VERIFIED: project scope] 本地桌面工作台暂无多用户访问控制模型。 |
| V5 Input Validation | yes | [VERIFIED: codebase grep] 模板变量、导入包 JSON、auth 配置和 URL/query/header 都需要结构化校验。 |
| V6 Cryptography | yes | [VERIFIED: codebase grep] HTTP TLS 由 `reqwest`/rustls 承担；禁止自写加密或自定义 token 编码方案。 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 明文 secret 被导出到 JSON 包 | Information Disclosure | [VERIFIED: 03-CONTEXT.md] 默认脱敏/剥离，且 UI 要明确暴露意图。 |
| 缺失变量导致请求误发到错误主机 | Tampering | [VERIFIED: 03-CONTEXT.md] 解析失败时阻断发送并高亮缺失变量。 |
| API Key 被写入错误位置 | Tampering | [VERIFIED: requirements + types] 用统一 `apiKeyPlacement` 编译规则覆盖 header/query。 |
| 历史/日志泄露 auth 值 | Information Disclosure | [VERIFIED: codebase grep] 延续并扩展当前 history redaction 到导出和预览边界。 |

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase grep] `src/lib/request-workspace.ts` - request/tab/environment clone、snapshot 纯逻辑与默认 auth/environment 结构
- [VERIFIED: codebase grep] `src/lib/tauri-client.ts` - 发送、导入导出、DTO 映射边界
- [VERIFIED: codebase grep] `src/types/request.ts` - `AuthConfig`、environment、request payload 类型
- [VERIFIED: codebase grep] `src-tauri/src/commands/request.rs` - 历史 redaction 策略
- [VERIFIED: codebase grep] `src-tauri/src/core/import_runtime.rs` - OpenAPI/curl auth 映射、server variable 处理
- [CITED: https://v2.tauri.app/develop/calling-rust/] - Tauri v2 command IPC、可序列化命令边界
- [CITED: https://docs.rs/reqwest/latest/reqwest/struct.RequestBuilder.html] - Reqwest auth/query/timeout/redirect/proxy 能力
- [CITED: https://vitest.dev/guide/] - Vitest guide 与 jsdom 环境模式
- [VERIFIED: npm registry] `vue`, `vitest`, `@vue/test-utils`, `@tauri-apps/api`, `@tauri-apps/plugin-dialog` 版本
- [VERIFIED: crates.io] `tauri`, `reqwest`, `rusqlite` 当前版本与发布时间

### Secondary (MEDIUM confidence)
- [VERIFIED: package.json] 项目测试与运行脚本配置
- [VERIFIED: .planning/config.json] `workflow.nyquist_validation` 显式为 `false`

### Tertiary (LOW confidence)
- [ASSUMED] 固定占位符优于删字段的导出策略细节
- [ASSUMED] 第一版模板语法应支持字符串内嵌 `{{name}}`
- [ASSUMED] 缺失普通 header/query 模板也应阻断发送

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 固定占位符比删字段更适合当前导入导出包格式 | Open Questions | 若导入器实际更依赖字段缺失语义，后续可能需要调整 package schema。 |
| A2 | 第一版模板语法可支持字符串内嵌 `{{name}}` | Open Questions | 若实现难度或 UI 解释成本偏高，可能需要收缩到“整值替换”。 |
| A3 | 启用的 header/query 模板缺失也应默认阻断发送 | Open Questions / Common Pitfalls | 若用户期望部分 header/query 允许空值，阻断策略可能过严。 |
| A4 | “单一共享编译层”是当前桌面 API 客户端更合理的当代做法 | State of the Art | 若后续发现已有仓库模式更偏向 Rust 侧编译，需要调整职责划分。 |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - [VERIFIED: package manifests + registries + official docs] 当前技术栈、版本和能力都已核验。
- Architecture: HIGH - [VERIFIED: codebase grep + context decisions] Phase 3 的收敛位置与现有分层高度一致。
- Pitfalls: HIGH - [VERIFIED: codebase grep + context] 风险主要来自已观察到的链路分散，而非猜测新问题。

**Research date:** 2026-04-06
**Valid until:** 2026-05-06
