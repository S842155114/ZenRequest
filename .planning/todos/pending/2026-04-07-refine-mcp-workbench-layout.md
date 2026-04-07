---
created: 2026-04-07T02:41:15.397Z
title: Refine MCP workbench layout
area: ui
files:
  - src/features/mcp-workbench/components/McpRequestPanel.vue
  - src/components/request/RequestPanel.vue
  - src/features/app-shell/components/WorkbenchShell.vue
---

## Problem

当前 MCP 请求工作台里，上方 MCP 请求模式区域与下方 MCP 工作台存在明显信息重合。像传输方式、操作、端点等配置已经在 MCP 工作台中存在，再在上方重复展示会挤压主要操作区空间，也降低界面聚焦度。

## Solution

梳理 MCP 请求模式与 MCP 工作台的职责边界，减少重复配置展示。优先保留一次配置入口，把主要空间让给当前操作所需字段与结果区域；必要时将重复信息改为只读摘要、折叠区或完全移除，并确保不影响 `initialize`、`tools.list`、`tools.call`、`resources.list`、`resources.read` 等现有流程。
