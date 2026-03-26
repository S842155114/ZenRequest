## Why

ZenRequest now has first-class multi-workspace persistence, but import/export is still effectively scoped to a single workspace. Once users start splitting requests across multiple workspaces, they need a reliable way to back up and restore the whole local application state, including settings and every workspace, without exporting each workspace one by one.

## What Changes

- Add full-application export as a first-class option alongside the existing active-workspace export flow.
- Add full-application import so a previously exported application package can restore settings and multiple workspaces in one operation.
- Distinguish export/import package scope in the format so the runtime can validate whether a file contains one workspace or the entire application state.
- Extend conflict handling so application-scope import can resolve workspace name collisions consistently across all imported workspaces.
- Update the desktop UI to let the user choose export scope, detect import package scope, and clearly communicate the implications of application-wide restore.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `import-export`: extend the capability from workspace-only operational behavior to support explicit full-application export/import, scoped package metadata, and scope-aware conflict handling.

## Impact

- Frontend export/import actions, dialogs, and user messaging in the Tauri desktop shell.
- Tauri commands and payload types for export/import scope selection and application package handling.
- SQLite import/export code paths that currently serialize a single workspace package.
- Backward-compatible package parsing and validation for future import/export evolution.
