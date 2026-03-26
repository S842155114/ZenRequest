# Design: Align Runtime Domain Model

## Overview

This design aligns the runtime and persistence model with the current frontend product shape while correcting the main mismatch introduced by the frontend-first implementation.

The core design move is to separate:

- long-lived business entities
- workspace-local session state
- read-only system templates

The Rust runtime becomes the authoritative source for all persisted user data. The frontend remains responsible for rendering, editing, short-lived interaction state, and optimistic UX, but no longer acts as the final source of truth for collections, requests, environments, history, or workspace sessions.

## Design Goals

- Support multiple workspaces as first-class entities.
- Keep `Workspace` distinct from `WorkspaceSession`.
- Make collections and requests stable entities with ids.
- Scope environments to a workspace.
- Store history as long-lived, manageable data with mixed reference-plus-snapshot semantics.
- Preserve dirty drafts across app restarts.
- Allow multiple tabs for the same saved request.
- Seed a first-run demo workspace from a system template.
- Support single-workspace export by default, with optional full-application export.
- Define import conflict behavior before implementation.
- Define deletion cascades and redaction rules before implementation.

## Non-Goals

- Implementing collaboration, sync, or remote storage.
- Designing a new UI shell.
- Storing full large response bodies in history.
- Performing semantic body-level redaction in v1.

## Architecture

### Domain Layers

```text
┌────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│ UI rendering, editing, tab interactions, optimistic UX     │
└──────────────────────────────┬─────────────────────────────┘
                               │ Tauri invoke
┌──────────────────────────────▼─────────────────────────────┐
│                    Rust Command Facade                      │
│ bootstrap, workspace, collections, requests, envs, history │
└──────────────────────────────┬─────────────────────────────┘
                               │ domain APIs
┌──────────────────────────────▼─────────────────────────────┐
│                     Runtime Domain Layer                    │
│ workspaces, sessions, templates, request execution, import  │
└──────────────────────────────┬─────────────────────────────┘
                               │ repositories
┌──────────────────────────────▼─────────────────────────────┐
│                         SQLite                              │
│ entity tables + session tables + metadata + migrations      │
└────────────────────────────────────────────────────────────┘
```

### Core Concepts

#### Workspace

`Workspace` is a business entity. It owns user-managed API assets and history.

It includes:

- collections
- requests
- environments
- history
- one persisted workspace session

It does not mean "the whole app snapshot."

#### WorkspaceSession

`WorkspaceSession` is a UI/session entity attached to one workspace.

It includes:

- open tabs
- active tab id
- active environment id
- tab ordering
- persisted dirty drafts

It does not own collections, environments, or history.

#### SystemTemplate

`SystemTemplate` is a read-only system seed source.

- It is not user-owned runtime data.
- It is used to create a demo workspace for first-time users.
- Copying from a template fully detaches the new workspace from the template source.

## Domain Model

```text
Workspace
├─ Collections
│  └─ Requests
├─ Environments
├─ HistoryItems
└─ WorkspaceSession
   └─ Tabs (dirty drafts)

SystemTemplates
└─ TemplateWorkspaces
   ├─ TemplateCollections
   ├─ TemplateRequests
   └─ TemplateEnvironments
```

### Entity Definitions

#### Workspace

- `id`
- `name`
- `description`
- `created_at`
- `updated_at`
- `source_template_id?`
- `is_archived?`

#### Collection

- `id`
- `workspace_id`
- `name`
- `description`
- `sort_order`
- `created_at`
- `updated_at`

#### Request

- `id`
- `workspace_id`
- `collection_id`
- `name`
- `description`
- `tags_json`
- `method`
- `url`
- `params_json`
- `headers_json`
- `body_kind`
- `body_payload_json`
- `auth_json`
- `sort_order`
- `created_at`
- `updated_at`

#### Environment

- `id`
- `workspace_id`
- `name`
- `variables_json`
- `created_at`
- `updated_at`

#### HistoryItem

- `id`
- `workspace_id`
- `request_id?`
- `request_name`
- `request_method`
- `request_url`
- `request_snapshot_json`
- `status`
- `status_text`
- `elapsed_ms`
- `size_bytes`
- `content_type`
- `response_headers_json`
- `response_preview`
- `truncated`
- `executed_at_epoch_ms`

#### WorkspaceSession

- `workspace_id`
- `active_tab_id?`
- `active_environment_id?`
- `tabs_json`
- `updated_at_epoch_ms`

## Why Use JSON Fields in v1

Some parts of the request model are naturally document-shaped and are already represented that way in the frontend:

- params
- headers
- tags
- auth config
- body variants
- environment variables
- dirty draft tabs

Normalizing all of these in v1 would increase migration and implementation cost without producing proportionate value.

The design therefore uses:

- normalized tables for top-level entities
- JSON columns for nested document-like substructures

This keeps the schema queryable where it matters while staying close to the current frontend model.

## Session Model

### Dirty Draft Semantics

Tabs use a dirty draft model.

Rules:

- opening a saved request creates a tab that references `requestId`
- each tab carries its own mutable draft state
- multiple tabs may reference the same saved request
- drafts survive app restarts through `WorkspaceSession`
- saving a draft updates the canonical request entity
- closing a tab removes that draft from the session

### Tab Payload Shape

Each session tab should persist:

- `tabId`
- `requestId?`
- `collectionId?`
- `name`
- `description`
- `tags`
- `method`
- `url`
- `params`
- `headers`
- `body`
- `bodyType`
- `auth`
- `responsePreview?`
- `isDirty`
- `createdAt`
- `updatedAt`

`WorkspaceSession` is intentionally the only place where unsaved request mutations live.

## History Model

### Mixed Reference-Plus-Snapshot

History is long-lived data, but it must preserve execution-time truth.

Each history item may include:

- `requestId` when the execution came from a saved request
- a full request snapshot for reproducibility and auditability

This allows the system to support both:

- "show me what happened at execution time"
- "show me which saved request this came from"

Deleting a saved request does not delete its history. The history item keeps its snapshot even if the live request reference is no longer resolvable.

### Preview Storage

History stores preview data only.

Recommended v1 behavior:

- text or json responses store a bounded preview string
- large responses set `truncated = true`
- binary responses store preview-safe placeholder content or summary text rather than raw binary

History should always retain:

- status
- status text
- elapsed time
- response size
- content type
- response headers
- execution timestamp

### Redaction

v1 redaction applies to header/auth-sensitive data only.

At minimum, redact:

- `Authorization`
- `Cookie`
- `Set-Cookie`
- API-key headers
- basic auth credentials
- auth payloads derived from frontend auth config

Body content is not automatically semantically redacted in v1.

## Template Model

### First-Run Behavior

If and only if the user is truly new and has no persisted workspace data:

1. select the default system template
2. create a demo workspace from it
3. create its initial session state
4. mark the app as initialized

The copied workspace is fully detached from the template afterward.

### Template Ownership

System templates are not exported as ordinary user data.

They exist as system seed material only.

Possible implementation forms:

- embedded static JSON assets
- bundled SQLite seed assets
- Rust-embedded template structures

The exact storage form is an implementation choice. The product contract is read-only and detachable.

## Bootstrap Model

The current bootstrap contract is too loose and still uses generic `Value` containers in several places. The next contract should become typed and domain-specific.

Target bootstrap shape:

```text
bootstrap_app()
└─ {
   settings,
   workspaces,
   activeWorkspaceId,
   activeWorkspace: {
     session,
     collections,
     environments,
     history
   },
   templatesSummary
}
```

This allows one initial round trip to hydrate the app shell while keeping domain boundaries explicit.

## Import and Export

### Export Scopes

Supported scopes:

- single workspace export by default
- optional full-application export

System templates are not part of ordinary export payloads.

### Export Format

Exports must be versioned.

Recommended package envelope:

```text
{
  formatVersion,
  scope,
  exportedAt,
  payload
}
```

Where:

- `scope = "workspace"` or `scope = "app"`
- `payload` contains typed domain records, not anonymous blobs

### Import Conflict Handling

The user must be able to choose:

- `skip`
- `rename`
- `overwrite`

Conflict resolution applies to imported entities whose logical destination already exists.

Recommended rules:

- entity ids from the import package may be preserved when safe
- when id reuse is unsafe, generate fresh ids
- `rename` should preserve both source and destination entities while giving the imported copy a new user-visible name

## Deletion Semantics

Deletion requires explicit user confirmation.

Rules:

- deleting a workspace cascades to its collections, requests, environments, history, and session
- deleting a collection cascades to its requests
- deleting a request removes the canonical request but preserves history snapshots
- deleting an environment updates any affected session state to a safe fallback

The UI should clearly communicate cascade impact before confirmation.

## Migration Strategy

### Source State

Current state is split across:

- frontend local storage
- Rust settings persistence
- Rust partial workspace persistence

### Migration Target

Migration creates:

- a default user workspace
- collections with stable ids
- requests with stable ids
- environments with stable ids
- history items with stable ids and execution timestamps where possible
- a workspace session derived from recoverable open-tab state

### Migration Rules

1. If runtime storage already contains migrated workspace data, do not re-run migration.
2. If only old frontend-local data exists, create one default workspace and attach migrated entities to it.
3. Generate ids for collections and nested requests that currently rely only on names.
4. Convert old session-like state into `WorkspaceSession`.
5. Convert legacy history display records into structured history items as far as data allows.
6. Preserve user data over demo seeding. Demo workspace creation is only for truly new users.

## Frontend Contract Changes

The frontend should evolve from:

- local source of truth
- broad snapshot writing

to:

- typed runtime client
- domain-specific commands
- optimistic UI with authoritative Rust reconciliation

Expected command groups:

- app bootstrap and active workspace selection
- workspace CRUD
- workspace session save/load
- collections CRUD
- requests CRUD
- environments CRUD
- history query/clear/delete
- import/export
- settings get/update
- request execution

## Risks

- migration from name-based collections to id-based collections may break implicit references if not carefully mapped
- session persistence may accidentally absorb business data again unless the boundary is enforced
- import overwrite semantics can become destructive if identity rules are underspecified
- redaction gaps in history could leak credentials if auth and header transformations are not centralized

## Open Questions

The following are intentionally left for implementation detail decisions rather than product contract decisions:

- exact preview byte limit for history storage
- exact template asset storage mechanism
- exact bootstrap payload field layout
- exact fallback environment selection behavior after environment deletion
- whether workspace search remains current-workspace-only in all v1 surfaces

## Recommended Next Step

Use this design as the basis for:

1. typed Rust DTO design
2. SQLite migration design
3. command contract definition
4. frontend runtime client refactor scope
