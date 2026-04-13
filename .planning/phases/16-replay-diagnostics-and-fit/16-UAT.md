---
status: complete
phase: 16-replay-diagnostics-and-fit
source: [16-SUMMARY.md]
started: 2026-04-13T11:07:00+08:00
updated: 2026-04-13T11:17:00+08:00
---

## Current Test

[testing complete]

## Tests

### 1. Sampling 历史摘要保持紧凑可读
expected: 在侧边栏或历史列表里，sampling 历史项应显示为紧凑摘要：能看出这是 sampling，并带有简短 prompt 预览；不应直接把完整 prompt 或结果正文整块铺开。
result: pass

### 2. Sampling 历史回放恢复为普通 replay 草稿
expected: 从历史中打开 sampling 记录时，应进入现有工作台里的普通 replay 草稿，而不是新开一套特殊流程；sampling prompt 等字段应仍可编辑，并可直接再次发送。
result: pass

### 3. Sampling 回放保留上下文而不丢协议信息
expected: 回放后的 sampling 草稿仍保留必要的会话/产物上下文，因此再次查看结果或相关协议信息时，不会变成一个被“简化丢失”的历史副本。
result: pass

### 4. Sampling 失败时先提示边界/能力问题
expected: 当 sampling 因 server 不支持、runtime 限制、session/transport 约束等原因失败时，响应区应先提示这是边界/支持性问题，再展示底层 protocol error 细节。
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

