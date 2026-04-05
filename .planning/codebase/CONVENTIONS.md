# Coding Conventions

**Analysis Date:** 2026-04-06

## Naming Patterns

**Files:**
- Vue single-file components use PascalCase names in feature and UI folders, for example `src/components/request/RequestPanel.vue`, `src/components/layout/AppHeader.vue`, and `src/features/app-shell/components/WorkbenchShell.vue`.
- Composables use `useXxx` camel-cased filenames, for example `src/features/app-shell/composables/useAppShell.ts`, `src/features/app-shell/composables/useAppShellViewModel.ts`, and `src/features/request-compose/composables/useRequestCompose.ts`.
- Pure TypeScript helpers and domain modules use kebab-case filenames, for example `src/lib/request-workspace.ts`, `src/lib/tauri-client.ts`, `src/features/app-shell/domain/request-session.ts`, and `src/features/mcp-workbench/lib/mcp-schema-form.ts`.
- Test files are colocated and mirror the implementation filename with `.test.ts`, for example `src/lib/request-workspace.test.ts`, `src/components/ui/textarea/Textarea.test.ts`, and `src/features/app-shell/domain/request-session.test.ts`.
- Feature-wide integration suites use `*.suite.ts` inside dedicated test folders, for example `src/features/app-shell/test/startup-layout.suite.ts` and `src/features/app-shell/test/history.suite.ts`.

**Functions:**
- Exported functions use camelCase and read like actions or derivations, for example `buildMcpSchemaFormModel`, `parseMcpStructuredArguments`, `resolveTabOrigin`, `resolveTabExecutionState`, and `createRequestTabFromPreset` in `src/features/mcp-workbench/lib/mcp-schema-form.ts` and `src/features/app-shell/domain/request-session.ts`.
- Boolean-returning or boolean-like helpers often use `is`, `can`, or `has` prefixes in computed state and helper names, for example `isStartupReady`, `isStartupLoading`, and `canImportOpenApi` in `src/features/app-shell/composables/useAppShellViewModel.ts`.
- Internal mutation helpers inside composables use imperative verb names, for example `toggleMockEnabled`, `updateMockHeader`, `addFormDataField`, and `setExecutionTimeout` in `src/features/request-compose/composables/useRequestCompose.ts`.
- Factory helpers use `createXxx` naming for object construction, for example `createBlankRequestTab`, `createRequestTabFromPreset`, and `createHistoryEntry` in `src/lib/request-workspace.ts` and its tests.

**Variables:**
- Reactive values use descriptive noun phrases and keep `Ref` semantics in the variable name when needed, for example `activeSection`, `revealedRows`, `textBodyDraftsByRequest`, and `resolvedExecutionOptions` in `src/features/request-compose/composables/useRequestCompose.ts`.
- Temporary immutable values often use `next` or `raw` prefixes, for example `nextRequestKey`, `nextHeaders`, and `rawValue` in `src/features/request-compose/composables/useRequestCompose.ts` and `src/features/mcp-workbench/lib/mcp-schema-form.ts`.
- Test helpers commonly use `createXxx`, `ok`, `deferred`, and `wrapper` naming for fixtures and harness objects, as seen in `src/lib/tauri-client.test.ts`, `src/components/request/RequestPanel.test.ts`, and `src/features/app-shell/test/harness.ts`.

**Types:**
- Shared domain types and DTOs use PascalCase interfaces and type aliases, for example `RequestTabState`, `McpSchemaField`, `AppShellViewModel`, and `RuntimeAdapter` in `src/types/request.ts`, `src/features/mcp-workbench/lib/mcp-schema-form.ts`, `src/features/app-shell/composables/useAppShellViewModel.ts`, and `src/lib/tauri-client.ts`.
- Options/dependency bags are modeled as `XxxOptions` or `XxxDeps`, for example `UseRequestComposeOptions` in `src/features/request-compose/composables/useRequestCompose.ts` and `AppShellViewModelDeps` in `src/features/app-shell/composables/useAppShellViewModel.ts`.

## Code Style

**Formatting:**
- No dedicated Prettier, ESLint, or Biome config is detected at repo root; formatting is enforced by existing file style rather than a standalone config file. The active style is visible in `src/main.ts`, `src/lib/utils.ts`, and `src/features/app-shell/domain/request-session.ts`.
- Frontend TypeScript files predominantly use single quotes and omit semicolons, for example `src/features/app-shell/domain/request-session.ts`, `src/lib/tauri-client.test.ts`, and `src/features/mcp-workbench/lib/mcp-schema-form.ts`.
- Some Vite/bootstrap config files use double quotes and semicolons, for example `vite.config.ts` and `src/main.ts`; match the local file style instead of normalizing unrelated files.
- Indentation is two spaces in Vue templates and two spaces in most TypeScript blocks, visible in `src/components/request/RequestPanel.test.ts`, `src/components/code/CodeEditorSurface.test.ts`, and `src/features/request-compose/composables/useRequestCompose.ts`.
- Tailwind utility composition is centralized through `cn()` in `src/lib/utils.ts` instead of manual `clsx` and merge repetition across components.

**Linting:**
- No standalone lint config file is detected in the repository root; rely on `vue-tsc` via the `build` script in `package.json` and the existing code style in adjacent files.
- Type discipline is part of the quality bar: functions and dependency bags are explicitly typed in `src/features/app-shell/composables/useAppShellViewModel.ts`, `src/lib/tauri-client.ts`, and `src/features/mcp-workbench/lib/mcp-schema-form.ts`.

## Import Organization

**Order:**
1. External packages first, for example Vue and Vitest imports in `src/components/request/RequestPanel.test.ts`, `src/components/code/CodeEditorSurface.test.ts`, and `src/features/app-shell/test/harness.ts`.
2. Local relative imports next, for example `import RequestPanel from './RequestPanel.vue'` in `src/components/request/RequestPanel.test.ts` and `import { buildMcpSchemaFormModel } from './mcp-schema-form'` in `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`.
3. Alias-based project imports after or alongside locals depending on the file’s local pattern, for example `@/types/request`, `@/lib/i18n`, and `@/components/ui/resizable` in `src/features/app-shell/composables/useAppShellViewModel.ts` and `src/features/app-shell/test/harness.ts`.
4. Type-only imports are separated with `import type` when possible, for example in `src/lib/tauri-client.test.ts`, `src/features/app-shell/domain/request-session.ts`, and `src/features/request-compose/composables/useRequestCompose.ts`.

**Path Aliases:**
- Use `@` for `src` root imports; the alias is defined in `vite.config.ts` and consumed throughout `src/features/app-shell/composables/useAppShellViewModel.ts`, `src/features/app-shell/test/harness.ts`, and `src/components/request/RequestPanel.test.ts`.
- Shadcn aliases are declared in `components.json` for generator compatibility, including `@/components`, `@/components/ui`, `@/lib`, and `@/lib/utils`; hand-written source primarily uses the `@` root alias.

## Error Handling

**Patterns:**
- Model recoverable failures as explicit result envelopes instead of throwing across the UI boundary. `src/lib/tauri-client.ts` exposes `ApiEnvelope<T>` and tests assert `ok: false` results in `src/features/app-shell/state/app-shell-services.test.ts`.
- Prefer fallback and coercion helpers for user-entered state, for example `buildMcpSchemaFormModel` falls back to raw mode when schemas are unsupported in `src/features/mcp-workbench/lib/mcp-schema-form.ts`.
- Derivation helpers default conservatively instead of assuming fully populated state, for example `resolveTabOriginKind`, `resolveTabPersistenceState`, and `resolveTabExecutionState` in `src/features/app-shell/domain/request-session.ts`.
- UI state code stores machine-readable execution or persistence states such as `'transport-error'`, `'saved'`, and `'unsaved'` rather than embedding logic in templates, as seen in `src/features/app-shell/domain/request-session.ts` and `src/features/app-shell/state/app-shell-services.test.ts`.
- Error-facing copy is localized through `getMessages()` rather than hardcoding component strings, as shown in `src/features/mcp-workbench/lib/mcp-schema-form.ts` and `src/features/app-shell/composables/useAppShellViewModel.ts`.

## Logging

**Framework:** Not detected in frontend source; no structured logger is present in the sampled `src/` files.

**Patterns:**
- Frontend modules avoid routine console logging in production paths; no persistent `console.*` pattern is present in `src/features/request-compose/composables/useRequestCompose.ts`, `src/features/app-shell/composables/useAppShellViewModel.ts`, or `src/features/mcp-workbench/lib/mcp-schema-form.ts`.
- Prefer surfaced UI state, toasts, and result objects over logs for user-visible failures, as implied by `showToast`, `showErrorToast`, and service result assertions in `src/features/app-shell/composables/useAppShellViewModel.ts` and `src/features/app-shell/state/app-shell-services.test.ts`.

## Comments

**When to Comment:**
- Keep comments sparse and reserve them for environment-specific behavior or tool constraints. `vite.config.ts` documents Tauri-specific dev-server requirements; most app code files contain no comments.
- Tests occasionally use narrative test names instead of inline comments. Prefer descriptive `it('...')` strings like those in `src/components/code/CodeEditorSurface.test.ts` and `src/features/app-shell/domain/request-session.test.ts`.

**JSDoc/TSDoc:**
- Not a common pattern in `src/`; types and descriptive names carry intent without block documentation.

## Function Design

**Size:**
- Domain helpers stay small and single-purpose, for example the exported functions in `src/features/app-shell/domain/request-session.ts`.
- Large orchestration logic is moved into composables and dependency bags rather than embedded in components, for example `src/features/app-shell/composables/useAppShell.ts`, `src/features/app-shell/composables/useAppShellViewModel.ts`, and `src/features/request-compose/composables/useRequestCompose.ts`.

**Parameters:**
- Prefer typed object parameters for complex dependency injection or state bundles, for example `useRequestCompose(options)` in `src/features/request-compose/composables/useRequestCompose.ts` and view-model deps in `src/features/app-shell/composables/useAppShellViewModel.ts`.
- Small pure helpers still use positional arguments when the relationship is obvious, for example `parseMcpStructuredArguments(fields, values)` in `src/features/mcp-workbench/lib/mcp-schema-form.ts` and `resolveTabPersistenceState(tab, origin)` in `src/features/app-shell/domain/request-session.ts`.

**Return Values:**
- Pure derivation helpers return plain serializable objects or primitive unions, for example `McpSchemaFormModel` in `src/features/mcp-workbench/lib/mcp-schema-form.ts` and request-tab origin state in `src/features/app-shell/domain/request-session.ts`.
- UI orchestration layers expose grouped bindings and handlers rather than leaking internal refs everywhere, as shown by `AppShellViewModel` in `src/features/app-shell/composables/useAppShellViewModel.ts`.

## Module Design

**Exports:**
- Domain/helper modules prefer named exports for all public functions, for example `src/features/app-shell/domain/request-session.ts`, `src/features/mcp-workbench/lib/mcp-schema-form.ts`, and `src/lib/utils.ts`.
- Vue components remain default exports at the SFC level and are imported by filename, for example `src/components/request/RequestPanel.vue` and `src/components/code/CodeEditorSurface.vue`.

**Barrel Files:**
- Barrel files are used for component groups and feature entry points, for example `src/components/layout/index.ts`, `src/components/request/index.ts`, `src/components/ui/select/index.ts`, and `src/features/app-shell/index.ts`.
- Add a barrel only where a directory already exposes a grouped public surface; keep internal domain or composable helpers imported from their direct file paths.

---

*Convention analysis: 2026-04-06*
