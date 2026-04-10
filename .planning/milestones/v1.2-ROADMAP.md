# Roadmap: ZenRequest

**Current milestone:** `v1.2 Usage Guidance & Product Manual`
**Previous milestone archive:** `v1.1` → `.planning/milestones/v1.1-ROADMAP.md`
**Phases:** 3
**v1.2 Requirements:** 9
**Coverage:** 100%

## Overview

本路线图聚焦把 ZenRequest 从“能力已经逐步完整”推进到“可理解、可上手、可自助学习”的状态。优先顺序遵循先产品内引导、再中文主手册、后英文镜像与截图收口：先解决 `stdio` 等高摩擦场景的首次成功问题，再建立系统教程，最后补齐双语一致性。

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 12 | In-App Help & Stdio Onboarding | 在设置中提供帮助入口，并为 `stdio` 场景补齐首次空状态引导与字段说明 | GUIDE-01, GUIDE-02, GUIDE-03, IA-01 | 4 |
| 13 | Chinese Tutorial Manual | 建立中文教程型手册与 README 快速入口，覆盖当前主线能力 | DOCS-01, DOCS-02, IA-02 | 3 |
| 14 | English Manual & Screenshot Pass | 建立英文教程镜像并补齐首轮截图组织 | DOCS-03, DOCS-04 | 2 |

## Phase Details

### Phase 12: In-App Help & Stdio Onboarding

**Goal:** 在设置中提供帮助入口，并为 `stdio` 场景补齐首次空状态引导与字段说明。

**Requirements:** `GUIDE-01`, `GUIDE-02`, `GUIDE-03`, `IA-01`

**Success Criteria:**
1. 用户可以在设置中找到帮助入口
2. `stdio` 首次空状态能引导完成最小成功路径
3. `command` / `args` / `cwd` 等关键字段有清晰说明
4. 产品内帮助与外部文档导航建立连通

**UI hint**: yes

### Phase 13: Chinese Tutorial Manual

**Goal:** 建立中文教程型手册与 README 快速入口，覆盖当前主线能力。

**Requirements:** `DOCS-01`, `DOCS-02`, `IA-02`

**Success Criteria:**
1. README 提供快速上手和文档入口
2. 中文手册覆盖 HTTP、MCP、导入、历史/回放、`stdio`
3. 文档结构适合教程式阅读，而不是碎片化功能罗列

**UI hint**: no

### Phase 14: English Manual & Screenshot Pass

**Goal:** 建立英文教程镜像并补齐首轮截图组织。

**Requirements:** `DOCS-03`, `DOCS-04`

**Success Criteria:**
1. 英文手册与中文手册保持结构对应
2. 首轮关键截图落地，英文可先复用中文截图

**UI hint**: no

## Sequencing Rationale

- 先做 Phase 12，因为产品内帮助和 `stdio` 首次引导直接解决当前真实痛点
- 再做 Phase 13，把 README 和中文教程型手册作为主要文档骨架建立起来
- 最后做 Phase 14，把英文镜像和截图组织收口，避免一开始就被双语截图成本拖慢

## Next Command

推荐下一步：`$gsd-plan-phase 12`

---
*Last updated: 2026-04-10 after v1.2 roadmap creation*
