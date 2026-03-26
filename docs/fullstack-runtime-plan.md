# ZenRequest 全栈运行时规划

## Summary
当前项目已经具备较完整的 Vue/Tauri 前台 API Client 体验，但 Rust 后台仍接近 Tauri 默认空壳：没有请求执行层、没有本地存储层、没有统一的 IPC 数据边界。  
接下来的目标不是简单“补一个后台”，而是把应用重构成性能优先、职责清晰、可持续演进的桌面 API 客户端。

默认设计决策如下：

- Rust 角色：`Core Runtime`
- 持久化方案：`SQLite + 内存热缓存`
- 前后端边界：前端只负责 UI 与轻状态，Rust 负责请求执行、工作区持久化、导入导出、历史记录、配置存储与性能敏感逻辑

完成后，应用会形成三层结构：

1. Vue Frontend：界面渲染、交互、编辑态、国际化、主题
2. Tauri IPC Facade：前后端协议层和 DTO 映射层
3. Rust Core Runtime：请求执行、存储、状态管理、导入导出、日志与性能控制

## Current Alignment Check (2026-03-25)

基于当前仓库代码核对（`src/App.vue`、`src/lib/request-workspace.ts`、`src/components/request/RequestParams.vue`、`src-tauri/src/lib.rs`、`src-tauri/Cargo.toml`）：

- 前端 UI（请求编辑、响应展示、集合/环境/历史、国际化、主题）已具备可用基础。
- 前端数据源仍是 `localStorage`：`readWorkspaceSnapshot/writeWorkspaceSnapshot` 仍是主读写路径。
- 请求发送仍使用浏览器 `fetch`，尚未切换到 Tauri `invoke` + Rust 执行器。
- Rust 端仍是默认模板（仅 `greet` command），尚无 `AppState`、SQLite、请求执行、仓储层与 DTO 层。
- `Form Data` 与 `Binary` 目前仅有 UI 选项，发送实现仍按纯文本 `body` 处理。
- `tauri-client.ts` 尚未落地，前后端 IPC 协议层不存在。
- 自动化测试当前为缺失状态（未发现前端/Rust 测试文件）。

结论：规划方向正确，但需要补齐“从当前状态到目标架构”的迁移路径与验收门槛，避免计划停留在目标描述层。

## Functional Design

### 1. 前端职责
- 保留现有 Postman 风格界面、主题切换、国际化、响应面板、集合/历史/环境等交互体验。
- 前端只维护短生命周期状态：
  - 当前编辑中的 URL、Body、Headers、Params
  - 面板展开状态、tab 选中状态、搜索关键字、局部 loading
- 前端不再以 `localStorage` 为最终真相源。
- 请求发送统一通过 Tauri `invoke` 调用 Rust，不再直接使用浏览器 `fetch` 作为正式实现。
- 导入导出、工作区存储、历史记录、集合、环境、设置都走后台接口。
- 前端保留必要的 optimistic UI，但最终以后台返回结果回写。

### 2. Rust 后台职责
- 作为应用核心运行时与持久化权威源。
- 负责以下领域：
  - `settings`：语言、主题、窗口相关偏好
  - `workspace`：打开标签、活动标签、草稿状态
  - `collections`：集合与已保存请求
  - `environments`：环境与变量
  - `history`：请求历史
  - `http_runtime`：变量替换、鉴权、请求组装、响应解析
- 统一管理数据一致性、错误处理和性能策略。
- 为后续响应测试、脚本执行、索引搜索保留扩展边界。

### 3. 数据与存储设计
- 持久化采用 SQLite。
- Rust 维护全局 `AppState`：
  - SQLite 连接或连接池
  - 内存热缓存
  - 全局 HTTP client
- 存储策略：
  - 设置、工作区、集合、环境、历史拆分存储
  - 请求的 params/headers/body/auth 在 v1 可作为 JSON 序列化字段落库，避免过早复杂范式化
- 导入导出继续保留当前 `WorkspaceSnapshot` 语义，但由 Rust 负责文件 IO、解析和校验。
- 迁移策略：
  - 首次启动如果数据库为空且前端存在旧 `localStorage` 快照，则执行一次迁移导入
  - 导入完成后，前端不再继续以 `localStorage` 做主写入

## Implementation Changes

### A. Rust 模块划分
`src-tauri/src` 下按职责拆分模块，避免把业务逻辑堆在 `lib.rs`：

- `commands/`
  - `workspace.rs`
  - `request.rs`
  - `settings.rs`
  - `collections.rs`
  - `environments.rs`
  - `history.rs`
- `core/`
  - `app_state.rs`
  - `request_executor.rs`
  - `variable_resolver.rs`
  - `auth_resolver.rs`
  - `response_mapper.rs`
- `storage/`
  - `db.rs`
  - `migrations.rs`
  - `repositories/`
- `models/`
  - 前后端共享的序列化 DTO
- `errors/`
  - 统一错误类型与可返回前端的错误结构

`lib.rs` 仅保留：

- Tauri builder
- 全局状态注册
- command 注册
- 插件初始化

### B. Rust 命令接口
v1 需要提供统一、稳定的命令集合：

- `bootstrap_app() -> AppBootstrapPayload`
- `save_workspace(...) -> WorkspaceSaveResult`
- `list_collections()`
- `create_collection(payload)`
- `rename_collection(payload)`
- `delete_collection(payload)`
- `save_request(payload)`
- `delete_request(payload)`
- `list_environments()`
- `create_environment(payload)`
- `rename_environment(payload)`
- `delete_environment(payload)`
- `update_environment_variables(payload)`
- `list_history()`
- `clear_history()`
- `remove_history_item(id)`
- `send_request(payload) -> SendRequestResult`
- `export_workspace(...)`
- `import_workspace(...)`
- `get_settings()`
- `update_settings(payload)`

接口要求：

- 返回结构统一，前端可稳定消费
- DTO 与现有前端类型尽量保持兼容
- 前端不直接感知 SQLite 表结构

### C. 请求执行设计
Rust 请求执行器负责完整链路：

1. 读取活动环境变量
2. 执行模板变量替换
3. 解析鉴权配置
4. 组装 query/header/body
5. 发送 HTTP 请求
6. 解析响应头、状态码、耗时、大小、内容类型
7. 写入历史
8. 返回标准化响应 DTO

v1 性能策略：

- 使用复用的全局异步 HTTP client
- 开启连接池与 keep-alive
- JSON 响应只在需要展示时格式化
- 对大响应体设置内存展示阈值
- 超限时返回截断标记、原始大小等元信息
- 流式响应先不在 v1 完整实现，但接口设计需为后续预留扩展空间

### D. 前端重构范围
前端不是推倒重写，而是切换数据来源：

- `App.vue`
  - 启动时改为调用 `bootstrap_app`
  - 请求发送改为 `invoke`
  - 工作区保存改为后台驱动
- `src/lib/request-workspace.ts`
  - 保留纯前端的 clone、sanitize、formatter 等辅助逻辑
  - 去掉“最终持久化职责”
- 新增 `src/lib/tauri-client.ts`
  - 统一封装所有 `invoke`
  - 做 DTO 转换、错误映射和调用集中管理
- 各组件继续基于现有 props/emit 模式工作，避免让组件直接依赖后台实现细节
- 国际化继续前端主导，但设置值由 Rust 持久化并在 bootstrap 返回

### E. 性能优先设计
所有后续实现必须遵守以下性能原则：

- 单一全局 `AppState`
- 单一全局 HTTP client
- 热数据内存缓存：
  - settings
  - workspace snapshot
  - environment map
  - collection/request index
  - recent history
- 避免每次小改动都跨 IPC：
  - 草稿保存采用节流，例如 300 到 500ms debounce
- 启动阶段仅加载必要对象
- 批量返回启动数据，避免多次碎片化 IPC
- 大响应体避免重复序列化与重复高亮
- 搜索在 v1 可保留前端局部过滤；待数据规模增长后再下沉到 Rust 索引层

### F. 缺口补全与迁移里程碑
按当前项目现状，新增以下可执行里程碑（M0 到 M4）：

- M0：契约冻结与脚手架搭建
  - 新建 `src/lib/tauri-client.ts`（仅接口定义 + 错误封装 + mock 兜底）。
  - Rust 建立目录骨架：`commands/`、`core/`、`storage/`、`models/`、`errors/`。
  - 定义统一响应信封：`{ ok: boolean, data?: T, error?: AppError }`。
  - 明确 `SendRequestPayload` 在 `json/formdata/raw/binary` 下的差异化字段。

- M1：启动链路与持久化打通
  - 落地 `bootstrap_app`、`get_settings`、`update_settings`、`save_workspace`。
  - SQLite 初始化 + migration（至少 1 条基线 migration）。
  - 前端启动改为 `bootstrap_app`，`localStorage` 仅保留一次性迁移输入。
  - 草稿保存改为 debounce（300-500ms）+ IPC。

- M2：请求执行器打通
  - 落地 `send_request` 与 `history` 写入。
  - 支持 `none/bearer/basic/apiKey`。
  - 支持 `json/raw/formdata/binary` 实际发送，不再仅文本发送。
  - 返回 `SendRequestResult`（包含耗时、大小、header、截断标记）。

- M3：领域 CRUD 完整化
  - `collections`、`environments`、`history`、`import/export` 命令补齐。
  - 前端删除本地最终写入逻辑，改为后台权威数据回写。
  - 导入导出全部下沉 Rust（前端只负责触发与展示结果）。

- M4：稳定性与性能收口
  - 热缓存策略与回收策略落地（settings/workspace/index/recent history）。
  - 大响应阈值与截断策略验证。
  - 测试补齐并通过，作为发布前硬门槛。

### G. 完成定义（Definition of Done）
满足以下条件才可视为 v1 Runtime 迁移完成：

- 前端不再以 `localStorage` 作为主写入路径（仅一次性迁移读取允许）。
- 请求执行 100% 走 Rust（无生产路径下浏览器 `fetch` 直发）。
- `json/formdata/raw/binary` 四类 body 均具备真实发送能力。
- `bootstrap_app` 返回可直接驱动 UI 的完整启动数据。
- 集合、环境、历史、设置、导入导出均有对应 Rust 命令且完成端到端回写。
- 至少具备：Rust 单元测试 + 存储测试 + 请求集成测试 + 前端关键流程测试。
- 在常规交互下（连续编辑、切换 tab、查看历史）无明显卡顿，且无数据丢失。

## Public APIs / Types

### 前端新增或调整
- `WorkspaceSnapshot`
  - 保持导入导出兼容语义
  - 后续不再默认由 `localStorage` 持久化
- `AppSettings`
  - 至少包含 `themeMode`、`locale`
- `AppBootstrapPayload`
  - `settings`
  - `workspace`
  - `collections`
  - `environments`
  - `history`
- `SendRequestResult`
  - 标准化响应数据
  - 可选错误信息
  - 可选截断标记

### Rust DTO 设计原则
- Rust DTO 与前端类型保持明确映射
- 前端通过 `tauri-client.ts` 消费 DTO，不直接绑定数据库模型
- 现有这些类型尽量只做兼容性扩展，不做破坏式改名：
  - `RequestPreset`
  - `RequestTabState`
  - `SendRequestPayload`
  - `EnvironmentPreset`
  - `WorkspaceSnapshot`
- 建议新增统一错误 DTO：
  - `AppError { code: string, message: string, details?: string }`
- 建议补充请求体 DTO（避免 `formdata/binary` 被字符串化）：
  - `RequestBodyDto = JsonBody | RawBody | FormDataBody | BinaryBodyRef`
- 建议补充开发态兼容：
  - 当未运行在 Tauri 容器时，`tauri-client.ts` 可切换 mock adapter，避免纯前端开发阻塞

## Test Plan

### Rust 层
- 单元测试：
  - 变量替换
  - 鉴权解析
  - 请求组装
  - 响应映射
  - DTO 序列化
- 存储测试：
  - 数据库初始化
  - migration 幂等
  - 集合/环境/历史 CRUD
  - bootstrap 数据完整性
- 集成测试：
  - GET/POST 请求
  - Bearer/Basic/API Key
  - 环境变量替换
  - 导入导出往返一致性
  - 旧 localStorage 快照迁移

### 前端层
- 启动流程：
  - 空数据库首启
  - 已有数据库正常启动
  - 首次迁移旧快照
- 请求流程：
  - 发送成功
  - 发送失败
  - 非 JSON 响应
  - 大响应展示
- 工作区流程：
  - 保存请求
  - 删除集合
  - 删除环境
  - 导入导出
  - 历史恢复
- UI 与设置：
  - 主题切换
  - 英文/中文切换
  - 重启保留
- 性能体验：
  - 快速切 tab
  - 连续编辑 URL/body 无明显卡顿
  - 较多历史记录下仍可正常筛选和切换

### 交付门槛补充
- 当前状态基线：自动化测试缺失，需从 0 到 1 建立最小测试集。
- 合并门槛建议：
  - Rust：核心模块单元测试通过
  - Rust：SQLite migration 与 repository 测试通过
  - Rust：`send_request` 集成测试通过
  - Frontend：启动/发送/导入导出关键流程测试通过
- 回归门槛建议：
  - 每次调整 IPC DTO 或数据库 schema，必须同步更新测试与迁移脚本

## Assumptions / Defaults
- 默认采用 `Rust Core Runtime + SQLite + 内存热缓存`。
- v1 不实现完整插件系统、脚本沙箱和全文索引搜索。
- v1 的 `Tests` 面板继续保持前端占位，待响应测试执行器设计完成后再接通。
- v1 必须补齐 `Form Data` 与 `Binary` 的真实请求发送能力，不能长期停留在仅有 UI 的状态。
- 前端最终移除对 `localStorage` 的主写入依赖，仅保留一次性兼容迁移。
- 性能优先级高于“最少改动”，允许新增独立 Rust 模块、IPC facade 和 DTO 映射层以保证整体架构清晰。
