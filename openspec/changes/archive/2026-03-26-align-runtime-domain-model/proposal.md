# Proposal: Align Runtime Domain Model

## Summary
Align the Rust runtime and persistence model with the already-built frontend by introducing a first-class multi-workspace architecture, separating long-lived business entities from UI session state, and making Rust the authoritative source for workspace data domains.

This change formalizes `Workspace`, `WorkspaceSession`, `Collection`, `Request`, `Environment`, `History`, and `SystemTemplate` as distinct concepts with clear ownership and lifecycle rules.

## Problem
The project was implemented frontend-first, so the current Rust side is only partially aligned with the UI:

- request execution already runs through Rust
- settings and partial workspace session state already persist in SQLite
- collections, environments, and most history behavior still live primarily in frontend state
- `workspace` currently means different things in frontend and Rust
- collections are modeled by name instead of stable identity
- import/export and deletion semantics are not yet defined end-to-end

This creates contract drift, weak persistence boundaries, and growing risk as the product moves to multi-workspace support.

## Goals
- Make Rust the authority for business data and session persistence.
- Introduce a multi-workspace data model.
- Split `Workspace` from `WorkspaceSession`.
- Promote collections and requests to stable entities with ids.
- Make environments workspace-scoped entities.
- Make history long-lived, manageable data using a mixed reference-plus-snapshot model.
- Support system templates that can seed a first-run demo workspace and be copied into workspaces.
- Define import/export, conflict handling, and deletion rules before implementation.

## Non-Goals
- Reworking the existing frontend UI design.
- Full response-body archival in history.
- Automatic semantic redaction of request or response bodies in v1.
- Real-time collaboration or cloud sync.

## Decisions Captured
- The product supports multiple workspaces.
- `Workspace` is a business entity.
- `WorkspaceSession` is separate and only stores UI/session state such as open tabs, active tab, active environment, tab ordering, and persisted dirty drafts.
- Dirty drafts survive app restarts.
- A saved request may be opened in multiple tabs, each with its own dirty draft.
- Collections are real entities and must have stable ids.
- Environments are workspace-scoped entities.
- History is long-lived, workspace-scoped data.
- History uses a mixed model: it may reference `requestId`, but it also stores an execution-time request snapshot.
- History stores preview content only, not full large response bodies.
- v1 redacts header/auth-sensitive data in history, but does not perform semantic body redaction.
- On first use, the app automatically creates a demo workspace from a system template.
- System templates are copied into a workspace and then fully detached from the template source.
- Export defaults to single-workspace export, with an option for full-application export.
- Import conflict handling must let the user choose `skip`, `rename`, or `overwrite`.
- Deleting a workspace, request, or environment requires confirmation and cascades to lower layers of owned data.

## Proposed Domain Shape
- `Workspace`
  - owns collections, requests, environments, history, and one session record
- `WorkspaceSession`
  - owns open tabs, active tab id, active environment id, and dirty drafts
- `Collection`
  - belongs to one workspace
- `Request`
  - belongs to one collection
- `Environment`
  - belongs to one workspace
- `HistoryItem`
  - belongs to one workspace
- `SystemTemplate`
  - read-only system seed source, not user-owned runtime data

## Expected Outcome
After this change, the frontend and Rust runtime will speak the same domain language, data ownership will be explicit, migrations from the current frontend-first state will be possible, and future features such as robust import/export, search, and workspace management can be built on a stable foundation.

## Migration Intent
- Migrate existing frontend-local data into a default user workspace.
- Generate stable ids for collections, requests, environments, and history items where missing.
- Preserve recoverable session state as `WorkspaceSession`.
- Seed the first-run demo workspace from a system template only for brand-new users.
