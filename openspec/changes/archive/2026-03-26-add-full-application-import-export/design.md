## Context

ZenRequest has already moved core request data into a typed multi-workspace runtime backed by SQLite. The current import/export path serializes one workspace package at a time and restores one workspace package at a time, which is adequate for early single-workspace usage but incomplete now that workspaces are first-class entities and application settings are also persisted.

The existing `import-export` capability already requires default workspace-scoped export plus an explicit full-application export option, but the runtime and desktop UI only expose workspace packages. The next change therefore needs to extend an existing behavior rather than introduce a separate subsystem.

## Goals / Non-Goals

**Goals:**
- Support exporting the entire application state, including settings and all workspaces, as a single versioned package.
- Support importing an application-scope package in one operation while preserving explicit conflict strategy behavior.
- Keep workspace-scope import/export working for existing files and current UI workflows.
- Make package scope explicit so the runtime can validate whether a file contains one workspace or the full application state.

**Non-Goals:**
- Replace SQLite with file-system-native persistence.
- Add selective partial import such as “only these two collections from one workspace”.
- Introduce a new conflict strategy beyond `skip`, `rename`, and `overwrite`.
- Change request execution, history storage, or bootstrap semantics outside what is needed to reflect imported state.

## Decisions

### Use a scope-tagged export package model
The runtime will distinguish package scope explicitly rather than infer it from optional fields. A new top-level scope discriminator avoids ambiguous import behavior and makes validation straightforward.

Alternatives considered:
- Reuse the current workspace package shape and infer “application export” when multiple workspaces are present. Rejected because it weakens validation and makes backward compatibility harder to reason about.
- Create a completely separate command set and package family for app backup. Rejected because it duplicates most of the existing import/export model and fragments the UI.

### Keep workspace package compatibility and add an application package wrapper
Existing workspace exports should continue to import without migration. The application export will wrap persisted settings, the exported active workspace identity, and a list of per-workspace payloads that each retain their own session state, allowing the current workspace serializer to remain a reusable building block.

Alternatives considered:
- Replace the existing workspace package format immediately. Rejected because it would make current exports invalid and add needless migration pressure.
- Serialize raw database rows. Rejected because it leaks persistence internals and makes format evolution brittle.

### Apply conflict strategy per imported workspace and restore a deterministic active workspace
Application import will evaluate name conflicts independently for each incoming workspace using the selected strategy. `skip` drops only conflicting imported workspaces, `rename` renames only conflicting imported workspaces, and `overwrite` replaces only matching destination workspaces. After import, the runtime will activate the imported active workspace if it survives conflict resolution; otherwise it will activate the first successfully imported workspace in package order.

Alternatives considered:
- Treat any single conflict as a failure for the entire application import. Rejected because it makes large backup restore brittle and inconsistent with the existing conflict strategy model.
- Apply `overwrite` by wiping all local data before import. Rejected because the current strategy vocabulary is workspace-oriented, not full reset semantics.

### Expose scope selection only for export and detect scope for import
Export should ask the user whether they want the active workspace or the full application. Import should detect package scope from the file contents, then present scope-aware copy describing what will be restored and how conflicts will be handled.

Alternatives considered:
- Keep export as one-click workspace export and bury full application export elsewhere. Rejected because the spec requires full-application export to be a supported option, and discoverability matters once multiple workspaces exist.
- Force import scope selection before parsing the file. Rejected because the package itself should be authoritative about what it contains.

## Risks / Trade-offs

- [Package shape complexity increases] → Mitigation: keep workspace export payloads reusable and add a narrow wrapper for application exports instead of inventing an unrelated format.
- [Users may confuse workspace import with application restore] → Mitigation: make scope explicit in dialog titles, descriptions, and confirmation text.
- [Overwrite behavior may feel destructive during app import] → Mitigation: define overwrite at the workspace-conflict level and surface that behavior clearly in the import dialog.
- [Backward compatibility could regress] → Mitigation: retain support for current workspace export files and cover both scopes with import/export roundtrip tests.

## Migration Plan

1. Introduce scope-tagged export/import DTOs while keeping current workspace package parsing valid.
2. Add backend commands/helpers for full-application export and import assembly, including active-workspace restoration rules.
3. Update the desktop UI to choose export scope and display scope-aware import messaging.
4. Add tests for workspace-package compatibility and application-package roundtrips.
5. Rollback strategy: keep the current workspace import/export path intact so application-scope UI can be disabled without invalidating existing workspace export files.

## Open Questions

- None for the initial implementation slice.
