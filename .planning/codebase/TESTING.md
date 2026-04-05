# Testing Patterns

**Analysis Date:** 2026-04-06

## Test Framework

**Runner:**
- `Vitest` via `vitest run` in `package.json`.
- Config lives in `vite.config.ts` under `test.environment = 'jsdom'`.

**Assertion Library:**
- Vitest built-in assertions with `expect(...)`, used throughout `src/lib/request-workspace.test.ts`, `src/components/request/RequestPanel.test.ts`, and `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`.

**Run Commands:**
```bash
pnpm test              # Run all tests
pnpm vitest            # Interactive/default Vitest run when needed
pnpm vitest --coverage # Coverage, if run manually
```

## Test File Organization

**Location:**
- Most tests are colocated with the implementation file, for example `src/lib/tauri-client.test.ts`, `src/components/ui/textarea/Textarea.test.ts`, and `src/features/mcp-workbench/components/McpRequestPanel.test.ts`.
- Feature-level integration scenarios live in dedicated folders, for example `src/features/app-shell/test/` with `harness.ts`, `*.test.ts`, and `*.suite.ts` files.
- `src/App.test.ts` works as a test aggregator that imports multiple app-shell suites rather than defining assertions directly.

**Naming:**
- Use `.test.ts` for standard unit/component/spec files, for example `src/lib/response-code-viewer.test.ts` and `src/features/app-shell/domain/history-replay.test.ts`.
- Use `.suite.ts` for large reusable scenario bundles, for example `src/features/app-shell/test/request-flow.suite.ts`, `src/features/app-shell/test/dialogs-activity.suite.ts`, and `src/features/app-shell/test/history.suite.ts`.

**Structure:**
```
src/
├── lib/*.test.ts
├── components/**/**/*.test.ts
├── features/**/domain/*.test.ts
├── features/**/state/*.test.ts
└── features/app-shell/test/
    ├── harness.ts
    ├── *.test.ts
    └── *.suite.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from 'vitest'

import { buildMcpSchemaFormModel } from './mcp-schema-form'

describe('buildMcpSchemaFormModel', () => {
  it('builds a structured form model for flat object schemas', () => {
    expect(buildMcpSchemaFormModel({
      name: 'search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
      },
    })).toEqual(expect.objectContaining({ mode: 'structured' }))
  })
})
```
- This direct `describe` + `it` + full-object assertion style matches `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`, `src/features/app-shell/domain/request-session.test.ts`, and `src/lib/request-workspace.test.ts`.

**Patterns:**
- Prefer narrative test names that describe user-visible or domain-level behavior, for example `supports v-model so dialog detail fields can persist edited text` in `src/components/ui/textarea/Textarea.test.ts`.
- Use local fixture factories to keep setup readable, for example `createTab()` in `src/components/request/RequestPanel.test.ts`, `createAdapter()` in `src/lib/tauri-client.test.ts`, and `createBootstrapPayload()` in `src/features/app-shell/test/harness.ts`.
- Use `afterEach()` for DOM cleanup or mock reset when a test mutates global state, for example `src/components/request/RequestPanel.test.ts` and `src/lib/tauri-client.test.ts`.
- Await Vue DOM updates with `nextTick()` and promise queues with `flushPromises()` for component integration flows, as used in `src/components/request/RequestPanel.test.ts` and `src/features/app-shell/test/harness.ts`.

## Mocking

**Framework:** `Vitest` mocks via `vi.mock`, `vi.fn`, and adapter injection.

**Patterns:**
```typescript
vi.mock('@/components/ui/resizable', () => {
  const ResizablePanelGroup = defineComponent({
    name: 'ResizablePanelGroup',
    template: '<div data-testid="resizable-group"><slot /></div>',
  })

  return {
    ResizablePanelGroup,
  }
})
```
- This component-module stub pattern is used heavily in `src/features/app-shell/test/harness.ts`.

```typescript
const runtime = {
  sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
  sendMcpRequest: vi.fn(async () => ({ ok: false, error: 'not implemented' })),
} as const
```
- This function mock pattern is used in `src/features/app-shell/state/app-shell-services.test.ts`.

```typescript
setRuntimeAdapter(createAdapter(payload))
```
- This runtime adapter injection pattern is used in `src/features/app-shell/test/harness.ts` and `src/lib/tauri-client.test.ts` to isolate Tauri calls.

**What to Mock:**
- Mock UI infrastructure and heavy child components when the test targets parent behavior, as in `src/components/request/RequestPanel.test.ts` stubbing `RequestComposeRail` and `RequestUrlBar`.
- Mock Tauri/runtime boundaries instead of exercising native code from frontend tests, as in `src/lib/tauri-client.test.ts` and `src/features/app-shell/test/harness.ts`.
- Stub browser APIs missing in jsdom, for example `Range.prototype.getClientRects` and `Range.prototype.getBoundingClientRect` in `src/components/code/CodeEditorSurface.test.ts`.

**What NOT to Mock:**
- Do not mock small pure domain helpers; test them directly with full input/output assertions, as in `src/features/app-shell/domain/request-session.test.ts`, `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`, and `src/lib/request-workspace.test.ts`.
- Do not mock Vue reactivity when the goal is to validate state propagation or event handling; mount the component/harness and assert rendered output, as in `src/components/ui/textarea/Textarea.test.ts` and `src/components/code/CodeEditorSurface.test.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
const createTab = (overrides: Partial<RequestTabState> = {}): RequestTabState => ({
  id: overrides.id ?? 'tab-1',
  name: '订单详情',
  method: overrides.method ?? 'POST',
  url: overrides.url ?? 'https://example.com/orders',
  ...overrides,
})
```
- Inline factory functions like this appear in `src/components/request/RequestPanel.test.ts`, `src/lib/tauri-client.test.ts`, and `src/features/app-shell/test/harness.ts`.

**Location:**
- Small fixtures live inside each test file near the assertions.
- Shared feature integration fixtures live in `src/features/app-shell/test/harness.ts`.
- Cross-language fixture assets also exist under `src-tauri/tests/fixtures/`, but frontend quality patterns are centered in `src/` tests.

## Coverage

**Requirements:** No explicit coverage threshold or config file is detected in `package.json` or `vite.config.ts`.

**View Coverage:**
```bash
pnpm vitest --coverage
```
- Coverage is not wired into a named npm script, so run it directly through Vitest when needed.

## Test Types

**Unit Tests:**
- Pure helper and domain logic tests assert exact object transforms and fallback behavior, for example `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`, `src/features/app-shell/domain/request-session.test.ts`, and `src/lib/response-code-viewer.test.ts`.

**Integration Tests:**
- Vue component tests mount SFCs with props, stubs, and emitted events, for example `src/components/request/RequestPanel.test.ts`, `src/components/layout/AppSidebar.test.ts`, and `src/components/response/ResponsePanel.test.ts`.
- App-shell integration tests mount `src/App.vue` through the harness, drive UI interactions, and validate coordinated state across panels, history, and runtime responses in `src/features/app-shell/test/harness.ts` and the imported suites listed by `src/App.test.ts`.
- Service/store integration tests use reactive state with mocked runtime adapters to validate orchestration without rendering the full app, for example `src/features/app-shell/state/app-shell-services.test.ts` and `src/features/app-shell/composables/useAppShellEffects.test.ts`.

**E2E Tests:**
- Not detected. No Playwright, Cypress, or browser-automation test runner is configured in `package.json`.

## Common Patterns

**Async Testing:**
```typescript
await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
await nextTick()
```
- This UI-event pattern is used in `src/features/app-shell/test/harness.ts` and component tests such as `src/components/request/RequestPanel.test.ts`.

```typescript
const result = await services.sendRequest({ payload })
expect(result).toMatchObject({ ok: true, code: 'request.sent' })
```
- This async service assertion pattern is used in `src/features/app-shell/state/app-shell-services.test.ts`.

**Error Testing:**
```typescript
expect(result).toMatchObject({
  ok: false,
  code: 'request.send_failed',
  message: 'send_mcp_request is not implemented yet',
})
```
- Assert structured failure payloads rather than generic thrown errors, matching `src/features/app-shell/state/app-shell-services.test.ts` and the envelope-based adapter tests in `src/lib/tauri-client.test.ts`.

```typescript
expect(buildMcpSchemaFormModel(schema, args)).toEqual({
  mode: 'raw',
  fields: [],
  initialRaw: expect.any(String),
  fallbackReason: expect.any(String),
})
```
- For parser/transform fallback paths, assert the degraded mode and user-facing reason, matching `src/features/mcp-workbench/lib/mcp-schema-form.test.ts`.

---

*Testing analysis: 2026-04-06*
