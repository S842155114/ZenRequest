---
status: complete
phase: 03-variables-and-secrets
source:
  - .planning/phases/03-variables-and-secrets/03-PLAN.md
  - src/features/app-shell/domain/url-resolution.ts
  - src/features/app-shell/state/app-shell-services.ts
  - src/features/app-shell/state/app-shell-store.ts
  - src-tauri/src/core/request_runtime.rs
  - src-tauri/src/storage/repositories/workspace_repo.rs
started: 2026-04-06T14:54:54+08:00
updated: 2026-04-06T15:01:58+08:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Variable Resolution Send Blocking
expected: 在一个 HTTP 请求里把 URL 或 Bearer Token 写成环境变量模板时，缺少关键变量会阻断发送并显示明确反馈；变量存在时会使用解析后的值发送
result: pass

### 2. Auth Replay And Restore Safety
expected: 从历史记录恢复或 replay 一个带鉴权配置的请求后，鉴权模式（No Auth / Basic / Bearer / API Key）保持一致；如果值是 `[REDACTED]` 占位，不会被当成真实凭据直接发送
result: pass

### 3. Secret-Safe Export
expected: 导出 workspace / application 包时，Bearer Token、Basic 密码、API Key 值，以及明显属于 secret 的环境变量默认不会以明文出现在导出 JSON 中
result: pass

### 4. Recovery Regression Guardrail
expected: 历史恢复、重放和变量解析改动不会打坏现有主流程；恢复出来的请求仍然可编辑、可查看，但 redacted 占位值不会被误注入发送
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

none
