---
phase: 16
slug: replay-diagnostics-and-fit
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-13
---

# Phase 16 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP history persistence | `sampling` 请求摘要与回放上下文在本地工作区历史中持久化 | Prompt 摘要、会话标识、MCP 协议产物元数据 |
| Response diagnostics surface | MCP 响应面板把边界性错误与协议错误展示给用户 | Server 错误消息、协议错误码、运行时约束信息 |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-16-01 | Information Disclosure | sampling history summary | mitigate | 历史列表仅保留紧凑 `promptSummary`，不在列表层直接展开完整 prompt / result 正文 | closed |
| T-16-02 | Integrity | replay restoration path | mitigate | `sampling` 继续复用现有 replay draft 模型，避免引入平行 special-case 流程导致上下文丢失或回放语义漂移 | closed |
| T-16-03 | Security Misconfiguration | sampling diagnostics ordering | mitigate | 失败提示优先暴露 capability / runtime / session 边界解释，再显示底层 protocol detail，降低误导性排障路径 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-13 | 3 | 3 | 0 | codex / gsd-secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-13
