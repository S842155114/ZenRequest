# Phase 3: Variables And Secrets - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只聚焦环境变量解析、请求鉴权配置与 secret 边界收敛：让开发者可以稳定复用 base URL、token 等变量，清楚理解解析优先级，完成常见 HTTP 鉴权配置，并在导出、迁移或分享时默认避免敏感值泄露。断言体系、恢复诊断深化与 MCP 专属变量模型不在本阶段扩 scope。

</domain>

<decisions>
## Implementation Decisions

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

### the agent's Discretion
- 变量解析提示的具体 UI 文案与展示位置
- 变量缺失时采用 inline 提示、toast 还是状态标记的具体组合
- 鉴权表单字段排布与视觉细节
- secret 脱敏在导出文件中的具体占位格式与测试分层顺序

</decisions>

<specifics>
## Specific Ideas

- Phase 1 解决“能稳定发送”，Phase 2 解决“资产可依赖”，Phase 3 则要解决“同一个请求在不同环境下能否安全、稳定、可预测地复用”。
- 变量解析的核心不是支持多复杂语法，而是让开发者明确知道最终发出去的 URL、header 和 auth 值从哪里来。
- secret 安全优先于导出便利性：如果“完整导出所有值”和“默认避免泄露”冲突，优先选择默认脱敏/剥离敏感值。
- 鉴权能力以 HTTP 高频调试场景为准，不为未来 OAuth、签名算法或动态脚本预埋复杂抽象。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/PROJECT.md` — 本地优先、离线优先、隐私优先的产品定位约束
- `.planning/REQUIREMENTS.md` — `VAR-01`、`VAR-02`、`AUTH-01`、`AUTH-02` 的验收边界
- `.planning/ROADMAP.md` — Phase 3 的目标、成功标准与顺序依据
- `.planning/STATE.md` — 当前阶段衔接状态

### Prior phase decisions
- `.planning/phases/01-core-flow-hardening/01-CONTEXT.md` — 主链路稳定性与错误处理边界
- `.planning/phases/02-workspace-assets/02-CONTEXT.md` — 资产保存/导入导出/迁移行为的既有约束
- `.planning/phases/02-workspace-assets/02-UAT.md` — 已验证通过的资产链路边界，可作为 secret 保护外流路径的基线

### Codebase map
- `.planning/codebase/ARCHITECTURE.md` — 现有前后端分层与 app-shell/runtime 边界
- `.planning/codebase/CONCERNS.md` — 本地持久化、导入导出与敏感数据处理风险点
- `.planning/codebase/TESTING.md` — 现有测试结构和推荐验证切入点
- `.planning/codebase/STRUCTURE.md` — 变量、鉴权和工作区状态相关模块落位

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/request-workspace.ts`：已经定义 environment、auth、request clone 与 workspace snapshot 纯逻辑，是变量解析与鉴权数据复制规则最合适的收敛位置。
- `src/lib/tauri-client.ts`：已经暴露 environment CRUD、workspace import/export 等运行时接口，适合承接 secret-safe DTO 边界与错误归一化。
- `src/features/app-shell/composables/useAppShell.ts`：当前 app-shell 已集中编排工作区、环境、活动标签与 toast，是变量切换、鉴权编辑和错误反馈的现有编排入口。
- `src/types/request.ts`：已有 `AuthConfig`、environment variable、request payload 等核心类型，说明 Phase 3 更偏向补齐行为一致性而不是重建模型。

### Established Patterns
- 项目当前延续 composable + state/store/service + lib pure helpers 的分层，Phase 3 应继续把变量解析和鉴权转换逻辑放在共享层，而不是放入表单组件内部。
- 默认环境和 auth 结构已经存在于 workspace/request 类型系统中，说明当前缺口更可能是解析优先级、发送一致性与导出脱敏，而不是完全缺少基础能力。
- 导入导出、历史与请求保存已经形成前端桥接 + Rust service 的分工，secret 保护应沿着同一边界补齐，而不是额外新增平行通道。

### Integration Points
- Phase 3 预计会同时触达请求编辑 UI、environment 状态、resolved request 选择器、runtime request payload DTO、workspace import/export DTO、以及 Rust 持久化/导出实现。
- 与 Phase 2 的边界要保持清晰：可以在现有导出导入链路中增加 secret-safe 规则，但不要重新定义整个资产模型或引入新格式。
- 与 Phase 4 的边界要保持清晰：本阶段需要给出清楚错误反馈，但不扩展为完整断言、诊断或数据库恢复工作流。

</code_context>

<deferred>
## Deferred Ideas

- OAuth、签名算法、动态 pre-request script、自动 token 刷新 —— 后续 phase / backlog
- 系统级安全存储、主密码、操作系统钥匙串集成 —— 后续里程碑
- 团队共享变量、云同步 secret、多人协作权限模型 —— 与产品定位相关，后续单独评估
- MCP 专属变量作用域、tool-call schema 级 secret masking —— Phase 5 或后续 MCP 扩展

</deferred>

---

*Phase: 03-variables-and-secrets*
*Context gathered: 2026-04-06*
