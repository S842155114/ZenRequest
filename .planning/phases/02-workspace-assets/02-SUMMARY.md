# Phase 2 Summary

**Status:** Ready for verify
**Updated:** 2026-04-06

## What Landed

### History workflow hardening
- replay tabs now detach into editable drafts when their source history item is removed
- replay tabs now detach into editable drafts when history is cleared
- history filtering is covered by a component-level regression test so search-by-name, method, and url remains stable

### Import/export reliability hardening
- workspace import failures now distinguish invalid package vs unsupported package at the service boundary
- runtime import conflict strategy forwarding is covered so `skip` / `rename` / `overwrite` remain explicit across the runtime adapter boundary
- application-scope import results are preserved through the app-shell service layer
- workspace import file parse failures now surface an immediate error toast in the dialog layer

### cURL draft continuity hardening
- Rust cURL import now returns an explicit HTTP request draft instead of an untyped request kind
- frontend startup/import flow now asserts that imported cURL drafts open as normal editable HTTP tabs

## Files Touched
- `src/features/app-shell/state/app-shell-store.ts`
- `src/features/app-shell/state/app-shell-services.ts`
- `src/features/app-shell/state/app-shell-services.test.ts`
- `src/components/layout/AppSidebar.test.ts`
- `src/features/app-shell/state/app-shell-dialogs.test.ts`
- `src/features/app-shell/test/startup-layout.suite.ts`
- `src/lib/tauri-client.test.ts`
- `src-tauri/src/core/import_runtime.rs`

## Validation Completed
- targeted Vitest coverage for app-shell services, sidebar history behavior, startup/import flows, runtime client forwarding, and dialog error handling
- `pnpm test` passes (`27` files, `245` tests)
- `cargo check --manifest-path src-tauri/Cargo.toml` passes after cURL draft normalization

## Remaining Phase 2 Work
- collection-first asset model is now the intended v1 scope; folder hierarchy work was intentionally deferred beyond v1
- import/export conflict semantics are now guarded at the boundary, but broader end-to-end conflict outcome UX may still need coverage
- broader frontend regression pass is complete and green

## Notes
- this phase execution intentionally favored small, testable reliability slices over a large asset-model refactor
- history, import/export, and cURL changes stay within existing app-shell service/store/dialog and Rust import-runtime boundaries
