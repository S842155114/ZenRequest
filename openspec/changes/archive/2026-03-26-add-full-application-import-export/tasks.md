## 1. Export/Import Contract

- [x] 1.1 Add scope-tagged export/import DTOs for `workspace` and `application` packages in the Tauri model layer.
- [x] 1.2 Refactor current workspace export serialization so it can be reused as a building block inside application-scope export, including per-workspace session payloads.
- [x] 1.3 Add package validation/parsing logic that accepts legacy workspace exports and new scope-tagged packages.

## 2. Backend Application Backup Flow

- [x] 2.1 Implement full-application export assembly for settings plus all persisted workspaces.
- [x] 2.2 Implement full-application import that applies the selected conflict strategy per imported workspace and restores the imported active workspace deterministically.
- [x] 2.3 Update Tauri commands and command payloads so the frontend can choose export scope and submit application-package imports.

## 3. Desktop UI and Runtime Integration

- [x] 3.1 Update export UI to let the user choose active-workspace export or full-application export.
- [x] 3.2 Update import UI to detect package scope, show scope-aware messaging, and keep conflict strategy selection explicit without asking the user to choose import scope.
- [x] 3.3 Refresh bootstrap/runtime state after successful application import so settings, workspace list, and active workspace reflect the restored package.

## 4. Verification

- [x] 4.1 Add backend tests for workspace-package backward compatibility and full-application export/import roundtrip behavior.
- [x] 4.2 Add frontend/runtime integration checks for scope selection and post-import state refresh.
- [x] 4.3 Run project build and test commands to verify the new import/export flows do not regress current workspace behavior.
