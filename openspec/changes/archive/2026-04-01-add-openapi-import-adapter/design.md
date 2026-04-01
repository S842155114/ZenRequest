## Context

ZenRequest 当前已经有两条不同语义的导入链路：

- `workspace import`：导入版本化备份包，完成后刷新整个 runtime state
- `curl import`：把单条 curl 命令解析成一个可编辑的 scratch draft

这次 OpenAPI 3.0 导入既不能复用备份包语义，也不能简单降格为“多条 curl import”。它需要在现有 runtime-owned import adapter 架构内新增一个 feature-grade adapter，把标准 API 描述文档分析成 canonical request candidates，再安全地物化到当前 workspace。

当前仓库里已经有几个明显约束：

- capability 暴露是 runtime-owned，前端只消费 bootstrap 返回的 capability state
- `import_runtime.rs` 已经提供了 `ImportPlan` / `ImportIntermediateRequest` 风格的中间表示雏形
- `collections-requests` 已经规定 feature-grade imports 的 canonical target 是集合和已保存请求，而不是单独的 imported-request 存储
- `stage-gate` 测试目前仍把 OpenAPI 当作未激活的未来能力，因此实现和 capability 暴露必须成套落地
- 当前 `src-tauri/Cargo.toml` 依赖仍然较轻，没有 OpenAPI 或 YAML 解析工具链，这意味着 parser strategy 需要同时考虑运行时边界和依赖重量

这次改动是 cross-cutting 的：会同时影响 Rust command/runtime/models、frontend import entry/runtime bindings、capability bootstrap 和 stage-gate tests，因此需要单独的 design 文档先锁定方案。

## Goals / Non-Goals

**Goals:**

- 在现有 import adapter 架构中新增 OpenAPI 3.0 导入能力，而不是新开一套独立体系。
- 采用 `Analyze -> Apply` 两阶段流，先得到受控的导入分析结果，再执行写入。
- MVP 支持本地 `.json/.yaml/.yml` OpenAPI 3.0 文档导入到当前 workspace。
- 使用 Rust-native 文档/模型解析依赖作为 OpenAPI 输入边界，而不是自研完整 parser 或引入 Node-based runtime toolchain。
- 将支持的 operation 映射为 canonical collections 和 saved requests，并给出 imported / skipped / warning 摘要。
- 保持 backup restore 与 feature-grade imports 的边界清晰。
- 在 capability registry、bootstrap payload 和 stage-gate tests 中同步引入 OpenAPI 导入。

**Non-Goals:**

- 首期支持远程 URL 拉取、远程 `$ref` 下载或鉴权抓取 spec。
- 首期提供复杂的 endpoint 级筛选工作台或只读预览集合 UI。
- 首期提供重导入 diff / merge、来源指纹同步或 schema-driven form generation。
- 首期完整覆盖 OpenAPI 3.0 的全部高级语义（如复杂组合 schema、callbacks、links、discriminators）。
- 把 `swagger-parser`、`Redocly CLI` 或其他 Node 生态工具变成桌面运行时主路径依赖。
- 从零实现完整 OpenAPI parser / validator / resolver engine。

## Decisions

### Decision: 前端负责 source acquisition，Rust 负责 canonical analysis 与 apply

MVP 继续沿用现有导入模式：前端负责文件选择、读取文本内容、发起 import 命令；Rust 负责解析 OpenAPI 3.0 文档、生成分析结果、执行物化写入。

Rationale:

- 与现有 `workspace import` 的文件读取模式一致，避免额外的 runtime 文件系统分支。
- 与现有 `curl import` 的“Rust 负责语义解析”边界一致。
- 把大型文档解析、warning taxonomy 和 canonical mapping 集中在 runtime，便于测试和复用。

Alternative considered:

- 在前端解析 OpenAPI 再调用现有保存请求 API。Rejected，因为这会把协议语义拆到 Vue 层，削弱 runtime-owned seam，并增加大文件/YAML/错误归因复杂度。

### Decision: 采用 Rust-native 混合 parser strategy，而不是全自研或 Node runtime toolchain

MVP 将使用 Rust-native OpenAPI 文档/模型解析依赖处理 JSON/YAML 输入和基础模型反序列化，ZenRequest 自己保留 Analyze -> Apply、warning taxonomy、partial import policy、grouping 和 canonical request materialization。

当前首选实现方向是：

- `serde_json` + `serde_yaml` 统一输入读取
- Rust-native OpenAPI 3.0 model/deserialization crate 作为输入边界
- ZenRequest runtime 模块负责受控 `$ref` 支持、语义映射和导入诊断

Rationale:

- 这避免了把 OpenAPI 解析变成一个无边界的自研 spec engine。
- 也避免把 Node CLI / subprocess orchestration 引入桌面运行时关键路径。
- 对当前仓库而言，这条路最贴合现有“Rust runtime-owned import adapter”模式。
- 后续若需要更强的 bundling / dereferencing / governance，可在 dev-time 或 fallback path 再引入外部成熟工具，而不破坏主架构。

Alternative considered:

- 完整自研 parser / validator / resolver。Rejected，因为真实复杂度会迅速扩散到 `$ref`、循环引用、继承规则和宽松兼容性。
- 直接把 `swagger-parser` / `Redocly CLI` 作为桌面运行时主依赖。Rejected，因为会引入额外运行时、跨进程故障模式、版本漂移和 packaging 复杂度。

### Decision: 采用 Analyze -> Apply 两阶段导入 contract

OpenAPI 导入不会设计成“一步读文件并直接写库”。MVP 流程固定为：

1. 前端读取本地 JSON/YAML 文档文本，并携带显式 `workspaceId` 发起 analyze。
2. Rust 返回一个带版本号的 typed analysis snapshot，其中包含 candidates、grouping suggestions、diagnostics 和 summary。
3. 前端展示 analyze summary，用户可以选择 `Cancel` 或显式确认 `Apply`。
4. `warning` 不阻塞 apply；`fatal` 会阻止 apply。
5. Apply 阶段必须携带显式 `workspaceId` 和 analyze 返回的 versioned analysis snapshot；运行时不重新消费原始文档，也不依赖 runtime-held opaque token。

Rationale:

- OpenAPI 的核心复杂度在于支持项、跳过项、降级项和 grouping 建议，需要中间结果承载这些状态。
- 两阶段 contract 更容易支持 partial import 和 warning 摘要。
- 显式确认和可取消路径让 MVP 在没有复杂预览 UI 的前提下仍然保持可控。
- versioned snapshot 比 runtime-held token 更容易测试、回放和做 fixture 回归。
- 即使 MVP 不先做复杂预览 UI，后续也可以在不破坏 contract 的前提下增加 endpoint-level selection。

Alternative considered:

- 直接单阶段写入 workspace。Rejected，因为会把解析、错误分类、选择策略和持久化耦死，后续很难平滑升级。
- 使用 opaque analysis token。Rejected，因为这会引入额外的 runtime 暂存状态、失效策略和前后端会话耦合，而当前桌面架构并不需要这层复杂度。

### Decision: MVP 只支持本地 JSON/YAML 文档，并显式声明 partial import

首期输入源收敛到本地 `.json/.yaml/.yml` 文件。系统应接受部分成功：支持的 operation 被导入，不支持的项被跳过并进入摘要。

Rationale:

- 这是当前代码库最小、最稳的高价值交付。
- 可以避免远程抓取、网络权限、远程 ref 解析和缓存策略的扩展复杂度。
- 真实世界 OpenAPI 文档质量参差不齐，整体失败会让能力脆弱且缺乏解释性。

Alternative considered:

- 首期同时支持 URL 和复杂预览。Rejected，因为 UX 与安全复杂度会压过导入能力本身。

### Decision: MVP 只支持单文件文档内的 JSON Pointer 引用

MVP 只支持单文件 OpenAPI 文档内的 JSON Pointer 引用（`#/...`）。相对路径本地文件 refs、bundle/multi-file refs 和 remote refs 都不在首期支持范围内。Analyze 阶段必须把超出该边界的引用显式归类为 `fatal`、`warning` 或 `skipped`，而不是尝试隐式降级。

Rationale:

- 这比“完整 dereference 一切”更符合 ZenRequest 的产品目标，也与“前端只上传文本内容”的 source acquisition 边界一致。
- 可以把支持边界做得可解释、可测试，而不是假装具备广泛 OpenAPI 兼容性。
- 不引入源文件路径 / base directory payload，可以让 analyze/apply contract 保持简单稳定。

Alternative considered:

- 首期支持 local multi-file refs。Rejected，因为这要求 payload 扩展 source path/base dir，并把导入链路重新拉回文件系统语义。
- 首期完整支持 remote refs / multi-file bundle。Rejected，因为这会把 MVP 拉向治理工具而不是 API workbench import。

### Decision: MVP apply 是 append-only，不做 merge / upsert

Apply 阶段允许创建或复用本次导入派生出的 collection 容器，但每个 importable operation 只会物化为新的 canonical saved request。MVP 不会按 `operationId`、`summary`、`METHOD path` 或现有 request 名称去覆盖、更新或合并已存在请求。

Rationale:

- 这与 non-goals 中排除的 re-import diff / merge 保持一致。
- append-only 比 upsert 更容易解释，也更适合首期 fixture/snapshot 回归。
- 这样可以避免“同名但语义不同”的请求被静默覆盖。

Alternative considered:

- 以 `operationId` 或请求名称做 upsert。Rejected，因为这会把 MVP 提前拉入冲突检测、字段级 merge 和 re-import 身份识别问题。

### Decision: MVP 默认按 spec title + tag 分组写入 canonical collections

Apply 阶段将导入结果落到当前 workspace，优先使用 `info.title` 作为导入上下文，缺失时回退到 `Imported OpenAPI`。有 tag 的 operation 使用“spec title + 第一 tag”派生 collection key；多 tag operation 不会在多个 collection 中重复物化。无 tag 的 operation 使用 spec-level fallback collection。若 workspace 中已存在同名导入 collection，可复用该 collection 容器，但请求仍以追加方式新建。

Rationale:

- 和现有 `collections-requests` 模型天然兼容。
- 对多数 OpenAPI 文档来说，tag 是最接近用户认知的集合边界。
- 比 path 层级分组更容易在 MVP 中获得可读结果。
- “第一 tag”规则比多重复制更容易保持结果可预测。

Alternative considered:

- 仅按 path 层级分组。Rejected，因为在大多数业务 API 中可读性不如 tag。
- 多 tag 复制到多个 collection。Rejected，因为这会制造重复请求与去重问题。
- 直接生成 scratch drafts。Rejected，因为 OpenAPI 首期更偏向批量物化价值，而不是单请求草稿探索。

### Decision: MVP 映射矩阵必须固定为 deterministic rules

MVP 映射规则固定如下：

- server/base URL：按 OpenAPI 的就近优先级选择第一个可用 server，顺序为 operation-level → path-item-level → document-level；若不存在 server，则仅导入 path-relative URL 并产生 warning。
- server variables：有 `default` 的变量使用默认值替换；没有 `default` 的变量映射为 ZenRequest 模板变量 `{{variableName}}`，并产生 warning。
- path parameters：URL path 中的 `{param}` 映射为 `{{param}}` 占位符；query/header 参数优先使用显式 `example`，其次 `schema.default`，否则使用 `{{param}}`。
- request naming：优先级固定为非空 `summary` → `operationId` → `METHOD path`。
- auth：仅保证映射 `http bearer`、`http basic`、`apiKey`（`header` / `query`）；不支持的 security scheme 产生 warning，并将请求 auth 回退为 `none`。
- request body/media type：优先级固定为 `application/json` → `multipart/form-data` → `application/x-www-form-urlencoded` → 第一个剩余 media type；示例值优先级固定为 `example` → 第一个 `examples` 项 → 空模板体。

Rationale:

- 这些规则覆盖了最常见的 API workbench 导入场景，同时保持行为可预测。
- 优先使用 `{{...}}` 占位符与当前 runtime 的模板变量解析约定一致。
- 把 auth/media type 范围显式锁定下来，可以避免“看似支持、实际丢字段”的灰色区。

Alternative considered:

- 把 server variables 映射到 workspace environments。Rejected，因为这会把 MVP 拉入 environment 生命周期与命名冲突管理。
- 同时支持更多 security scheme 和复杂 body encoding。Rejected，因为这超出了首期可验证范围。

### Decision: warning taxonomy 分为 fatal / warning / skipped，并进入结果摘要

Analyze 和 Apply 结果都必须区分：

- `fatal`：整份文档无法继续处理
- `warning`：文档可继续，但存在降级或信息丢失
- `skipped`：特定 operation 或字段未被导入

MVP 诊断 contract 还必须满足：

| Condition | Severity | Contract |
| --- | --- | --- |
| 文档无法解析、不是 OpenAPI 3.0.x、analyze 后无任何 importable operations、analysis snapshot 版本不支持、apply 的 `workspaceId` 与 snapshot 不匹配 | `fatal` | 阻止 apply，且不产生 workspace 写入 |
| 缺少 server 或 server variable 默认值、不支持但可安全忽略的 auth / media type / schema 细节 | `warning` | 允许继续 analyze/apply，并在 diagnostics 中显式报告 |
| 外部文件 refs、remote refs、无法解析的单 operation 内联引用、无法构造 canonical request 的 operation 级特性 | `skipped` | 跳过受影响 operation，并在结果中记录原因 |

诊断 code 必须稳定使用 `OPENAPI_*` 命名空间。Apply summary 的计数口径固定为：

- `importedRequestCount`：实际创建的 canonical saved requests 数量
- `skippedOperationCount`：未被物化的 operations 数量
- `warningDiagnosticCount`：发出的 `warning` diagnostics 条数

Rationale:

- 这是 partial import 可被解释、可被测试的基础。
- 也为后续 preview UI、重导入 diff 和 richer diagnostics 打下统一数据结构。

Alternative considered:

- 只返回一个自由文本错误字符串。Rejected，因为既不利于 UI 呈现，也不利于测试和后续演进。

### Decision: capability 只在功能可用时变为 active

OpenAPI 不会先以 reserved seam 形式提前出现在当前 release 的 active bootstrap descriptors 中。只有运行时命令、前端入口、测试和结果处理链路可用时，才把 `import.openapi` 作为 active import adapter 暴露。

Rationale:

- 与现有 stage-discipline 测试和运行时约束保持一致。
- 避免 capability 漂移和半成品 UI。

Alternative considered:

- 先暴露 reserved seam 再慢慢接实现。Rejected，因为这会让当前版本的 capability contract 与真实能力脱节。

## Risks / Trade-offs

- [OpenAPI 文档语义跨度大，MVP 支持面过窄会让部分文档导入结果不理想] → Mitigation: 明确首期支持范围，并通过 warning/skipped 摘要解释降级与跳过原因。
- [Analyze -> Apply 增加 DTO 与命令数量] → Mitigation: 复用现有 import runtime 中间层风格，避免引入额外抽象框架。
- [按 tag 分组可能与部分文档结构不匹配] → Mitigation: 先把 grouping suggestion 固定为 spec title + tag，并在设计上保留后续 path-based / selectable grouping 扩展位。
- [Rust OpenAPI 生态不提供 authoring-grade bundling/validation 全家桶] → Mitigation: 把运行时目标限定为“可导入的受控子集”，并在需要时评估 dev-time preprocessor 或 fallback tooling。
- [YAML 解析与 OpenAPI 模型映射可能引入新的 Rust 依赖] → Mitigation: 将依赖选择限制在解析和模型层，避免把依赖传播到前端或引入 Node runtime。
- [parser dependency 升级导致 analyze/apply 结果漂移] → Mitigation: 采用 corpus-first fixture 回归，依赖升级必须经过 snapshot diff 审核。
- [能力位从“未来能力”变成“当前能力”会打破现有 stage-gate 测试] → Mitigation: 同一 change 中同步更新 runtime capability tests 和 frontend stage-gate assertions。

## Migration Plan

1. 先落 OpenSpec proposal、design、spec deltas 和 tasks，明确 capability contract。
2. 在 Rust 侧新增 OpenAPI analyze/apply payload/result DTO、parser、materializer 和 command surface。
3. 引入 Rust-native OpenAPI/YAML parsing 依赖，并明确受控 `$ref` 支持边界与 unsupported taxonomy。
4. 更新 runtime capability registry 与 bootstrap payload，使 `import.openapi` 在功能完成时变为 active。
5. 在前端添加 `Import OpenAPI` 入口、文件读取和结果摘要处理。
6. 建立 corpus-first fixture 回归集，覆盖 JSON/YAML parity、refs、partial import 和 apply consistency。
7. 补齐 runtime、frontend、stage-gate 测试并完成验证后再开放实现阶段。

Rollback strategy:

- 如果导入链路不稳定，可回退整条 OpenAPI import change；由于不引入新的持久化实体类型，只需回退代码和 capability 暴露。
- 已导入到 workspace 的请求仍是 canonical collections/requests，不需要额外数据迁移回滚。

## Open Questions

- Apply 阶段是否在 MVP 就需要支持“导入到新建 workspace”选项，还是只写入当前 workspace。
- 具体采用哪一个 Rust-native OpenAPI model crate 作为首选实现依赖，以及其升级策略如何锁定。
