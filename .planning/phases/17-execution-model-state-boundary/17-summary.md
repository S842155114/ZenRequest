# Phase 17 — Summary and Handoff

**Phase:** 17  
**Status:** Drafted for execution  
**Date:** 2026-04-15

## Locked Decisions

### Execution model
- `execution` is a first-class top-level entity above current request-centric shapes
- `request` remains an authored asset surface, not the default future host for every new semantic concern
- future agent-oriented execution is first-class in the model, but only structurally reserved in this phase

### Envelope boundaries
- the shared envelope is split into `authored input`, `resolved execution snapshot`, and `result artifact`
- protocol-specific sections are allowed in all three layers
- top-level execution fields stay minimal and shared rather than becoming a new giant DTO
- trusted replay semantics anchor on `resolved execution snapshot`, while authored input remains available as human-readable intent/edit source

### State ownership
- durable state holds authored assets and trusted execution records
- browser local snapshot is an auxiliary cache layer, not durable truth
- startup restore is backend durable first, with browser snapshot only filling cached state
- UI transient state, runtime handles, unstable connection/session internals, and temporary context are ephemeral by default

### Migration and compatibility
- current request/history/workspace structures are treated as compatibility layers plus migratable assets
- new execution/replay/agent/diagnostics/persistence-policy semantics must not be added by further expanding request-centric shape
- migration strategy is adapter-first and gradual

## Deferred Decisions

The following are intentionally deferred beyond Phase 17:
- exact schema migration strategy for moving persistence toward clearer execution-derived records
- secure secret storage implementation details
- corruption repair UX and end-user recovery flows
- full explainability surface and replay UX details
- full future agent workflow UX and operational model

## Inputs for Phase 18

### What Phase 18 may assume as fixed
- backend durable state is the primary truth source
- browser snapshot is cache only
- startup restore precedence is backend durable first
- execution/state ownership boundaries already exist as architecture constraints

### What Phase 18 must not reopen
- whether browser snapshot should be truth
- whether `execution` is top-level
- whether request-centric expansion is still allowed as a default pattern

### Phase 18 required inputs
- `17-execution-envelope-design.md`
- `17-state-ownership-map.md`
- `17-compatibility-constraints.md`

### Phase 18 focus transfer
Phase 18 should use these decisions to define corruption detection, malformed persisted row diagnostics, safe fallback behavior, and repair-guided recovery without drifting into model redefinition.

## Inputs for Phase 19

### What Phase 19 may assume as fixed
- authored input, resolved snapshot, and result artifact are separate layers
- durable/cached/ephemeral ownership is already classified
- trusted replay is tied to resolved execution semantics rather than just authored drafts

### What Phase 19 must not reopen
- whether resolved execution context deserves its own layer
- whether request should continue to absorb new execution semantics
- whether browser snapshot can hold durable truth by convenience

### Phase 19 required inputs
- `17-execution-envelope-design.md`
- `17-state-ownership-map.md`
- `17-compatibility-constraints.md`

### Phase 19 focus transfer
Phase 19 should define safe projection and redaction/exclusion/isolation policy across authored input, resolved snapshot, and result artifact, with durable/cached/ephemeral ownership used to constrain what is allowed to persist.

## Inputs for Phase 20

### What Phase 20 may assume as fixed
- replay explainability is execution-derived
- resolved execution snapshot is the trusted replay anchor
- protocol-specific execution sections can coexist under one shared execution lifecycle frame

### What Phase 20 must not reopen
- whether replay is only request-draft based
- whether execution/result boundaries should collapse back into a single blob
- whether explainability should be modeled by adding more ad hoc request/history fields

### Phase 20 required inputs
- `17-execution-envelope-design.md`
- `17-state-ownership-map.md`
- `17-compatibility-constraints.md`
- this summary document

### Phase 20 focus transfer
Phase 20 should extend replay/history/diagnostics toward clearer explainability, using the execution envelope and ownership constraints from Phase 17 rather than redefining the model.

## Canonical Artifacts From Phase 17

Downstream phases should treat these as the canonical outputs of Phase 17:
- `17-CONTEXT.md`
- `17-RESEARCH.md`
- `17-execution-envelope-design.md`
- `17-state-ownership-map.md`
- `17-compatibility-constraints.md`
- `17-summary.md`

## Completion Statement

Phase 17 is complete when downstream phases can plan against these artifacts without re-asking:
- what an execution is
- where authored/resolved/result boundaries sit
- what persistence truth means
- what migration red lines they must obey
