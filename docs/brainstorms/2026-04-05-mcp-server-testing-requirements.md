---
date: 2026-04-05
topic: mcp-server-testing
---

# MCP Server Testing Workbench

## Problem Frame
ZenRequest 目前已经能较好地承担传统 HTTP API 的构造、执行、响应查看和断言测试，但还不能把 MCP Server 当作被测目标来调试和回归验证。随着 MCP Server 成为越来越常见的工具接口形态，单纯把它当作普通 HTTP 接口来手工拼 JSON 请求，既不够高效，也无法沉淀为稳定的测试资产。

这次能力扩展的目标不是把 ZenRequest 做成一个完整的通用 MCP 客户端，而是把它扩展成一个面向 MCP Server 开发者和测试者的调试与测试工作台。首版优先服务“连接 MCP Server、完成初始化、发现工具、调用工具、观察协议结果、保存测试并重复执行”这一闭环。

## Requirements

**产品定位与范围**
- R1. ZenRequest 必须支持把 MCP Server 作为被测目标，而不是仅把 MCP 协议流量当作普通 HTTP 请求手工编辑。
- R2. 首版产品定位必须是“面向 MCP Server 的调试与测试工作台”，而不是“完整 MCP 全协议客户端”或“协议一致性认证平台”。
- R3. 首版必须优先支持 MCP Tool Server 调试与测试场景，重点覆盖初始化、工具发现和工具调用。
- R4. 首版必须允许用户把 MCP 调试结果沉淀为可重复执行的测试资产，而不只是一次性手工调试。

**传输与连接模型**
- R5. 产品方向上必须兼容 `HTTP 类传输 + stdio` 两类 MCP Server 接入方式。
- R6. 首版实现必须以 HTTP 类传输为主，包括用户能够把 HTTP/Streamable HTTP/SSE 类 MCP Server 作为首要测试目标。
- R7. 首版不要求完整交付 stdio 能力，但产品模型和后续扩展方向不能把 stdio 排除在外。
- R8. 用户必须能够为 MCP Server 配置独立的连接目标与请求上下文，例如地址、请求头和必要的认证信息。

**MCP 专用请求体验**
- R9. 产品必须新增独立的 MCP 请求工作模式，而不是要求用户继续使用通用 HTTP 请求编辑器手工拼装 MCP 报文。
- R10. 首版 MCP 请求体验必须优先提供专用表单，而不是把原始 JSON-RPC 文本编辑作为主要入口。
- R11. 用户必须能够在 MCP 请求中明确选择操作类型，首版至少包括 `initialize`、`tools/list` 和 `tools/call`。
- R12. `initialize` 和 `tools/list` 必须提供结构化输入体验，避免要求用户手工拼完整协议报文。
- R13. `tools/call` 必须支持 schema 驱动的结构化输入，而不是只提供原始 JSON 参数编辑器。
- R14. 当 MCP Server 返回工具 schema 时，产品必须尽量把可识别的参数结构映射为表单输入，而不是默认回退到纯文本 JSON。
- R15. 即使首版优先是结构化表单，用户仍应能够查看底层协议请求和响应内容，以便调试协议细节。

**响应查看与测试能力**
- R16. 响应区必须清晰区分协议层结果与业务层结果，例如初始化响应、工具列表结果、工具调用返回内容和协议错误。
- R17. 用户必须能够针对 MCP 请求结果编写和执行基础断言，至少覆盖成功/失败状态、JSON 字段存在和值匹配等场景。
- R18. MCP 请求的历史记录、保存请求、回放执行能力必须与现有 ZenRequest 工作流保持一致，避免形成单独割裂的测试入口。
- R19. 错误展示必须优先帮助用户判断是连接失败、初始化失败、协议错误，还是工具执行结果异常。

**首版排除项**
- R20. 首版不要求覆盖 MCP 全协议面，尤其不要求完整交付 resources、prompts、notifications、sampling、roots 等所有能力。
- R21. 首版不要求提供协议一致性认证、兼容性评分或标准化 conformance test suite。
- R22. 首版不要求支持多服务器编排、自动探索式测试或 agent 驱动测试流。

## Success Criteria
- 用户可以在 ZenRequest 中创建一个 MCP 请求，并完成对 HTTP 类 MCP Server 的 `initialize`、`tools/list` 和 `tools/call` 调试闭环。
- 用户不需要手工编写完整 JSON-RPC 请求，就能完成常见 MCP Tool Server 的基础调试。
- 用户可以把至少一个 MCP 工具调用保存下来并重复执行，且能看到稳定的断言结果。
- 对用户而言，MCP 调试路径表现为 ZenRequest 的自然扩展，而不是一套与现有请求/响应工作流割裂的新系统。

## Scope Boundaries
- 首版不是完整 MCP 通用客户端。
- 首版不是 MCP 协议认证平台。
- 首版不是以 stdio 为优先的本地进程托管工具。
- 首版不以 resources/prompts 全量可视化为目标。

## Key Decisions
- 首版优先做 MCP Server 测试而不是 MCP Server 接入平台: 这样更贴近 ZenRequest 现有“请求执行 + 响应查看 + 测试断言”的产品基底。
- 首版优先支持 HTTP 类传输: 这最符合“把 MCP Server 当作类似接口服务进行测试”的核心诉求，也最容易复用现有产品心智。
- 首版交互优先做专用表单: 目标用户价值在于更高效地调试和测试 MCP，而不是强迫用户手写原始协议包。
- 首版尽量做 schema 驱动表单: 对 `tools/call` 而言，这是比纯 JSON 编辑器更符合产品方向的交互选择，即便实现成本更高。
- 首版产品定位偏协议调试器而不是完整测试平台: 先把调试、观测和基础断言闭环跑通，再逐步增强更重的回归测试能力。

## Dependencies / Assumptions
- 假设 ZenRequest 现有请求保存、历史记录、断言测试和响应展示能力可以复用于 MCP 请求模式，而不需要完全重建一套工作区体系。
- 假设首版支持的 HTTP 类 MCP Server 在协议交互上足够集中，能够沉淀出稳定的 MCP 请求表单模型。
- 假设后续需要支持的 stdio 能力可以通过 Tauri/Rust 运行时边界承接，而不要求当前 brainstorm 先定义完整实现。

## Outstanding Questions

### Deferred to Planning
- [Affects R6][Technical] HTTP 类传输在首版中具体支持到哪一类 MCP 交互方式，如何在现有运行时边界中表达会话与流式响应。
- [Affects R13][Needs research] `tools/call` 的 schema 驱动表单首版应覆盖哪些 schema 形态，哪些复杂输入需要回退策略。
- [Affects R15][Technical] 原始协议包与结构化表单之间的数据映射和调试视图如何共存，才能既利于调试又不破坏首版复杂度控制。
- [Affects R18][Technical] MCP 请求在现有请求模型、历史模型和测试模型中的持久化边界如何设计，才能避免把 MCP 特有状态硬塞进现有 HTTP 请求结构。
- [Affects R19][Needs research] 首版错误模型如何分层，才能让用户快速分辨 transport、initialize、protocol 和 tool execution 四类失败。

## Next Steps
→ /prompts:ce-plan for structured implementation planning
