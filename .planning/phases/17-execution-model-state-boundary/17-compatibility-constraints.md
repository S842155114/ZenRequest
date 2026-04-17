# Phase 17 — Compatibility Constraints

**Phase:** 17  
**Status:** Drafted for execution  
**Date:** 2026-04-15

## Purpose

Record what the current request/history/workspace model may keep, what must be treated as compatibility-only surfaces, and what red lines later phases must obey while the project transitions toward a top-level execution model.

## Compatibility Strategy

The project should follow an **adapter-first** gradual migration strategy.

This means:
- preserve current user-facing and repository-facing continuity where necessary
- define `execution` above current structures before large-scale DTO or storage replacement
- constrain new semantics so they do not keep inflating request-centric shapes
- allow later phases to progressively shrink legacy/compatibility surfaces instead of forcing an all-at-once replacement

## Long-Lived Assets

Some current structures remain valuable long-term assets even if they stop being the top-level execution subject.

### Authored request assets
The following can remain long-lived assets:
- authored request presets and related request composition fields stored through `request_repo`
- collection/workspace organization and authored environment data
- user-authored request intent that later maps into `execution.authored_input`

### Stable workspace/application assets
The following can remain long-lived assets:
- workspace identity and summaries
- saved collection and request organization structures
- stable settings and runtime capability surfaces delivered through bootstrap

### History and diagnostics records with execution value
History rows and diagnostics summaries may remain long-lived where they are genuinely trusted execution records, but they should increasingly be interpreted as execution-derived artifacts rather than request-derived blobs.

## Compatibility-Only Adapter Surfaces

The following current surfaces should be treated as compatibility-preserving adapter layers rather than future primary models.

### Request-centric mixed shapes
- broad request-centric frontend types in `src/types/request.ts` that currently combine authored intent, execution artifacts, tab state, and MCP execution details
- request/workspace snapshot shaping utilities in `src/lib/request-workspace.ts` that currently mix cloning, persistence shaping, and MCP artifact handling

### Repository JSON payloads
- JSON columns in `request_repo`, `history_repo`, and `workspace_repo` that preserve current persistence compatibility
- bootstrap/session payload shapes that currently aggregate authored and runtime-adjacent concerns into one restore surface

### Frontend/backend DTO seams
- `src/lib/tauri-client.ts` DTOs that currently expose request- and execution-adjacent fields together for compatibility with the existing command/service surface

These surfaces should be preserved carefully where needed, but new architecture decisions should treat them as transitional boundaries rather than the future model center.

## Red Lines

### Red Line 1 — No further request-centric expansion
New execution, replay, agent, diagnostics, and persistence-policy semantics **must not be added by expanding request-centric shape**.

Before adding any new field or payload, later phases must first decide whether it belongs in:
- `execution.authored_input`
- `execution.resolved_snapshot`
- `execution.result_artifact`
- state ownership / persistence policy rules
- a compatibility adapter layer

### Red Line 2 — Do not use browser snapshot as truth
Later phases must not design restore or replay behavior around browser snapshot as the authoritative state source.

### Red Line 3 — Do not merge resolved context and result artifact into one blob
Resolved runtime context and produced result/diagnostics serve different purposes and should remain separately documented and reasoned about.

### Red Line 4 — Do not hide migration debt behind optional fields
If a new need appears and the easiest patch is “add another optional field to request/history/workspace,” that should be treated as a design warning, not the default solution.

## Adapter-First Migration Guidance

### Stage 1 — Define the new top-level contract
Phase 17 defines `execution`, ownership rules, and compatibility constraints without forcing implementation replacement.

### Stage 2 — Reinterpret existing structures through adapters
Later phases should map current request/history/workspace DTOs and repository rows into the new conceptual model using adapter logic and explicit notes.

### Stage 3 — Shrink overloaded old surfaces
As persistence, secret hygiene, and replay explainability improve, later phases can remove or narrow overloaded fields and stop treating old mixed shapes as primary sources.

## Required Compatibility Questions for Later Phases

Before later phases change any persistence or DTO contract, they should answer:
- Is this field a long-lived authored asset, a trusted execution record, or only adapter baggage?
- Does this change preserve compatibility with current request/workspace/history flows?
- Can the change be explained under the execution envelope without inflating request-centric shape?
- Does this change accidentally turn cached or ephemeral state into durable truth?

## Constraints for Phase 18

Phase 18 may improve corruption/recovery behavior, but it should not reopen whether browser snapshot is truth or whether `execution` is top-level.

## Constraints for Phase 19

Phase 19 may define secret-safe persistence/projection behavior, but it should not revert to storing newly sensitive execution semantics in broad request-centric blobs just for convenience.

## Constraints for Phase 20

Phase 20 may expand explainability and replay metadata, but it should do so as execution-derived semantics, not by further expanding request/history fields without model boundaries.
