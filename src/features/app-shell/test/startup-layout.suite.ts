import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setRuntimeAdapter } from '@/lib/tauri-client'
import type { ApiEnvelope, AppBootstrapPayload, RuntimeAdapter } from '@/lib/tauri-client'
import type { HistoryItem, RequestPreset } from '@/types/request'
import {
  AppSidebarStub,
  RequestPanelStub,
  ResponsePanelStub,
  createAdapter,
  createOpenApiAnalysis,
  createBootstrapPayload,
  createStoredSnapshot,
  deferred,
  getActiveRequestPanelTab,
  getRequestPanelTabs,
  mountApp,
  ok,
} from './harness'

const withOpenApiCapability = (payload: AppBootstrapPayload) => {
  payload.capabilities = {
    descriptors: [
      { key: 'protocol.http', kind: 'protocol', displayName: 'HTTP', availability: 'active' },
      { key: 'mcp.http', kind: 'mcp_transport', displayName: 'MCP over HTTP', availability: 'active' },
      { key: 'mcp.stdio', kind: 'mcp_transport', displayName: 'MCP over stdio', availability: 'reserved' },
      { key: 'import.backup', kind: 'import_adapter', displayName: 'Backup Restore', availability: 'active' },
      { key: 'import.curl', kind: 'import_adapter', displayName: 'Curl Import', availability: 'active' },
      { key: 'import.openapi', kind: 'import_adapter', displayName: 'OpenAPI Import', availability: 'active' },
      { key: 'execution_hook.reserved', kind: 'execution_hook', displayName: 'Execution Hook Seam', availability: 'reserved' },
      { key: 'tool_packaging.reserved', kind: 'tool_packaging', displayName: 'Tool Packaging Seam', availability: 'reserved' },
      { key: 'plugin_manifest.reserved', kind: 'plugin_manifest', displayName: 'Plugin Manifest Seam', availability: 'reserved' },
    ],
    protocols: [
      { key: 'http', displayName: 'HTTP', schemes: ['http', 'https'], availability: 'active' },
    ],
    importAdapters: [
      { key: 'backup', displayName: 'Backup Restore', availability: 'active' },
      { key: 'curl', displayName: 'Curl Import', availability: 'active' },
      { key: 'openapi', displayName: 'OpenAPI Import', availability: 'active' },
    ],
    executionHooks: [],
    toolPackaging: [
      { key: 'tool_packaging.reserved', displayName: 'Tool Packaging Seam', availability: 'reserved' },
    ],
    pluginManifests: [
      { key: 'plugin_manifest.reserved', displayName: 'Plugin Manifest Seam', availability: 'reserved' },
    ],
  }
  return payload
}

describe('App workbench shell - startup and layout', () => {
  it('shows an app-owned startup screen while the initial bootstrap is pending', async () => {
    window.innerWidth = 1440

    const pendingBootstrap = deferred<ApiEnvelope<AppBootstrapPayload>>()
    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockImplementation(() => pendingBootstrap.promise)

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      bootstrapApp,
    }))

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="startup-screen"]').text()).toContain('Loading ZenRequest')
    expect(wrapper.find('[data-testid="header-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(false)

    pendingBootstrap.resolve(ok(createBootstrapPayload()))
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
  })

  it('keeps the static launch placeholder until runtime theme alignment completes', async () => {
    window.innerWidth = 1440

    const pendingBootstrap = deferred<ApiEnvelope<AppBootstrapPayload>>()
    const lightPayload = createBootstrapPayload()
    lightPayload.settings.themeMode = 'light'
    window.localStorage.setItem('zenrequest.workspace', JSON.stringify(createStoredSnapshot('light')))

    setRuntimeAdapter(createAdapter(lightPayload, {
      bootstrapApp: async () => pendingBootstrap.promise,
    }))

    const launchScreen = document.createElement('div')
    launchScreen.id = 'startup-launch-screen'
    document.body.appendChild(launchScreen)

    const wrapper = await mountApp()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.startupTheme).toBe('light')
    expect(document.getElementById('startup-launch-screen')).not.toBeNull()
    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(true)

    pendingBootstrap.resolve(ok(lightPayload))
    await flushPromises()
    await nextTick()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.startupTheme).toBe('light')
    expect(document.getElementById('startup-launch-screen')).toBeNull()
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
  })

  it('shows a startup failure screen and retries bootstrap in place', async () => {
    window.innerWidth = 1440

    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'BOOTSTRAP_FAILED', message: 'Runtime bootstrap failed' },
      })
      .mockResolvedValueOnce(ok(createBootstrapPayload()))

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      bootstrapApp,
    }))

    const launchScreen = document.createElement('div')
    launchScreen.id = 'startup-launch-screen'
    document.body.appendChild(launchScreen)

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="startup-screen"]').text()).toContain('Unable to start ZenRequest')
    expect(wrapper.get('[data-testid="startup-retry"]').text()).toContain('Retry startup')
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(false)
    expect(document.getElementById('startup-launch-screen')).toBeNull()

    await wrapper.get('[data-testid="startup-retry"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(bootstrapApp).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
  })

  it('falls back to a fresh bootstrap when the stored snapshot is invalid', async () => {
    window.innerWidth = 1440
    window.localStorage.setItem('zenrequest.workspace', JSON.stringify({ activeTabId: 'tab-bad', openTabs: [] }))

    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockResolvedValueOnce(ok(createBootstrapPayload()))

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      bootstrapApp,
    }))

    const wrapper = await mountApp()

    expect(bootstrapApp).toHaveBeenCalledTimes(1)
    expect(bootstrapApp).toHaveBeenCalledWith(null)
    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
  })

  it('shows a workbench-scoped busy overlay while switching workspaces', async () => {
    window.innerWidth = 1440

    const workspaceSwitchDeferred: {
      resolve: (value: ApiEnvelope<{ message: string }>) => void
    } = {
      resolve: () => undefined,
    }
    const workspaceSwitchPromise = new Promise<ApiEnvelope<{ message: string }>>((resolve) => {
      workspaceSwitchDeferred.resolve = resolve
    })

    const initialPayload = createBootstrapPayload()
    initialPayload.workspaces = [
      { id: 'workspace-1', name: 'Primary Workspace' },
      { id: 'workspace-2', name: 'Reports Workspace' },
    ]

    const secondaryPayload = createBootstrapPayload()
    secondaryPayload.workspaces = [
      { id: 'workspace-1', name: 'Primary Workspace' },
      { id: 'workspace-2', name: 'Reports Workspace' },
    ]
    secondaryPayload.activeWorkspaceId = 'workspace-2'

    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockResolvedValueOnce(ok(initialPayload))
      .mockResolvedValueOnce(ok(secondaryPayload))

    setRuntimeAdapter(createAdapter(initialPayload, {
      bootstrapApp,
      setActiveWorkspace: async () => workspaceSwitchPromise,
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="header-switch-workspace"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="workbench-busy-overlay"]').text()).toContain('Loading workspace')
    expect(wrapper.get('[data-testid="workbench-busy-surface"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('[data-testid="request-panel-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="response-panel-stub"]').exists()).toBe(true)

    workspaceSwitchDeferred.resolve(ok({ message: 'ok' }))
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="workbench-busy-overlay"]').exists()).toBe(false)
  })

  it('keeps the header interactive while a request is sending', async () => {
    window.innerWidth = 1440

    const requestDeferred = deferred<ApiEnvelope<{
      requestMethod: string
      requestUrl: string
      status: number
      statusText: string
      elapsedMs: number
      sizeBytes: number
      contentType: string
      responseBody: string
      headers: Array<{ key: string; value: string }>
      truncated: boolean
    }>>()

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      sendRequest: async () => requestDeferred.promise,
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="header-stub"]').attributes('data-workspace-busy')).toBe('false')
    expect(wrapper.find('[data-testid="workbench-busy-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="response-panel-stub"]').attributes('data-state')).toBe('pending')
    expect(wrapper.get('[data-testid="response-panel-stub"]').attributes('data-stale')).toBe('true')

    requestDeferred.resolve(ok({
      requestMethod: 'POST',
      requestUrl: 'https://example.com/orders',
      status: 200,
      statusText: 'OK',
      elapsedMs: 18,
      sizeBytes: 64,
      contentType: 'application/json',
      responseBody: '{"ok":true}',
      headers: [],
      truncated: false,
    }))
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[data-testid="header-stub"]').attributes('data-workspace-busy')).toBe('false')
  })

  it('starts normally when bootstrap includes runtime capability descriptors', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.capabilities = {
      descriptors: [
        { key: 'protocol.http', kind: 'protocol', displayName: 'HTTP', availability: 'active' },
        { key: 'mcp.http', kind: 'mcp_transport', displayName: 'MCP over HTTP', availability: 'active' },
        { key: 'mcp.stdio', kind: 'mcp_transport', displayName: 'MCP over stdio', availability: 'reserved' },
        { key: 'import.backup', kind: 'import_adapter', displayName: 'Backup Restore', availability: 'active' },
      ],
      protocols: [
        { key: 'http', displayName: 'HTTP', schemes: ['http', 'https'], availability: 'active' },
      ],
      importAdapters: [
        { key: 'backup', displayName: 'Backup Restore', availability: 'active' },
      ],
      executionHooks: [],
      toolPackaging: [
        { key: 'tool_packaging.reserved', displayName: 'Tool Packaging Seam', availability: 'reserved' },
      ],
      pluginManifests: [
        { key: 'plugin_manifest.reserved', displayName: 'Plugin Manifest Seam', availability: 'reserved' },
      ],
    }

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="request-panel-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="response-panel-stub"]').exists()).toBe(true)
  })

  it('shows the OpenAPI import entry only when the runtime exposes the adapter capability', async () => {
    window.innerWidth = 1440

    const withoutOpenApi = createBootstrapPayload()
    withoutOpenApi.capabilities = {
      descriptors: [
        { key: 'protocol.http', kind: 'protocol', displayName: 'HTTP', availability: 'active' },
        { key: 'mcp.http', kind: 'mcp_transport', displayName: 'MCP over HTTP', availability: 'active' },
        { key: 'mcp.stdio', kind: 'mcp_transport', displayName: 'MCP over stdio', availability: 'reserved' },
        { key: 'import.backup', kind: 'import_adapter', displayName: 'Backup Restore', availability: 'active' },
        { key: 'import.curl', kind: 'import_adapter', displayName: 'Curl Import', availability: 'active' },
      ],
      protocols: [
        { key: 'http', displayName: 'HTTP', schemes: ['http', 'https'], availability: 'active' },
      ],
      importAdapters: [
        { key: 'backup', displayName: 'Backup Restore', availability: 'active' },
        { key: 'curl', displayName: 'Curl Import', availability: 'active' },
      ],
      executionHooks: [],
      toolPackaging: [],
      pluginManifests: [],
    }

    setRuntimeAdapter(createAdapter(withoutOpenApi))
    const wrapperWithout = await mountApp()

    expect(wrapperWithout.find('[data-testid="request-panel-import-openapi"]').exists()).toBe(false)

    wrapperWithout.unmount()

    setRuntimeAdapter(createAdapter(withOpenApiCapability(createBootstrapPayload())))
    const wrapperWith = await mountApp()

    expect(wrapperWith.find('[data-testid="request-panel-import-openapi"]').exists()).toBe(true)
  })

  it('imports a curl command into a new editable draft tab', async () => {
    window.innerWidth = 1440

    const importCurlRequest = vi.fn(async (_workspaceId: string, _command: string) => ok({
      id: 'tab-imported-curl',
      name: 'Imported Curl Request',
      description: '',
      tags: ['curl'],
      collectionName: 'Scratch Pad',
      method: 'POST',
      url: 'https://example.com/orders',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      params: [],
      body: '{"ok":true}',
      bodyType: 'json' as const,
      auth: {
        type: 'none' as const,
        bearerToken: '',
        username: '',
        password: '',
        apiKeyKey: '',
        apiKeyValue: '',
        apiKeyPlacement: 'header' as const,
      },
      tests: [],
      response: {
        responseBody: '{}',
        status: 0,
        statusText: 'READY',
        time: '0 ms',
        size: '0 B',
        headers: [],
        contentType: 'application/json',
        requestMethod: 'POST',
        requestUrl: 'https://example.com/orders',
        testResults: [],
      },
      origin: { kind: 'scratch' as const },
      persistenceState: 'unsaved' as const,
      executionState: 'idle' as const,
      isSending: false,
      isDirty: true,
    }))

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), { importCurlRequest }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-import-curl"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-open')).toBe('true')

    await wrapper.get('[data-testid="dialog-details-input"]').setValue(`curl -X POST https://example.com/orders -H "Content-Type: application/json" -d '{"ok":true}'`)
    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(importCurlRequest).toHaveBeenCalledWith(
      'workspace-1',
      `curl -X POST https://example.com/orders -H "Content-Type: application/json" -d '{"ok":true}'`,
    )
    expect(getActiveRequestPanelTab(wrapper)?.name).toBe('Imported Curl Request')
    expect(getActiveRequestPanelTab(wrapper)?.requestKind).toBe('http')
    expect(getActiveRequestPanelTab(wrapper)?.origin?.kind).toBe('scratch')
    expect(getActiveRequestPanelTab(wrapper)?.persistenceState).toBe('unsaved')
  })

  it('saves imported curl drafts without losing canonical body metadata', async () => {
    window.innerWidth = 1440

    const createCollection = vi.fn(async (_workspaceId: string, name: string) => ok({
      id: 'collection-scratch-pad',
      name,
      expanded: true,
      requests: [],
    }))
    const saveRequest = vi.fn(async (_workspaceId: string, _collectionId: string, request: RequestPreset) => ok({
      ...request,
      id: 'request-imported-curl',
      collectionId: 'collection-scratch-pad',
      collectionName: 'Scratch Pad',
    }))
    const importCurlRequest = vi.fn(async (_workspaceId: string, _command: string) => ok({
      id: 'tab-imported-formdata',
      name: 'Imported Multipart Curl',
      description: '',
      tags: ['curl'],
      collectionName: 'Scratch Pad',
      method: 'POST',
      url: 'https://example.com/upload',
      headers: [],
      params: [],
      body: 'file=',
      bodyType: 'formdata' as const,
      formDataFields: [
        { key: 'file', value: '', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
      ],
      auth: {
        type: 'none' as const,
        bearerToken: '',
        username: '',
        password: '',
        apiKeyKey: '',
        apiKeyValue: '',
        apiKeyPlacement: 'header' as const,
      },
      tests: [],
      response: {
        responseBody: '{}',
        status: 0,
        statusText: 'READY',
        time: '0 ms',
        size: '0 B',
        headers: [],
        contentType: 'application/json',
        requestMethod: 'POST',
        requestUrl: 'https://example.com/upload',
        testResults: [],
      },
      origin: { kind: 'scratch' as const },
      persistenceState: 'unsaved' as const,
      executionState: 'idle' as const,
      isSending: false,
      isDirty: true,
    }))

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      importCurlRequest,
      createCollection,
      saveRequest,
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-import-curl"]').trigger('click')
    await wrapper.get('[data-testid="dialog-details-input"]').setValue(`curl https://example.com/upload -F "file=@demo.txt;type=text/plain"`)
    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await flushPromises()
    await nextTick()

    await wrapper.get('[data-testid="request-panel-save-tab-imported-formdata"]').trigger('click')
    await flushPromises()
    await nextTick()

    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(createCollection).toHaveBeenCalledWith('workspace-1', 'Scratch Pad')
    expect(saveRequest).toHaveBeenCalledTimes(1)
    expect(saveRequest.mock.calls[0]?.[2]).toMatchObject({
      name: 'Imported Multipart Curl',
      method: 'POST',
      url: 'https://example.com/upload',
      bodyType: 'formdata',
      formDataFields: [
        { key: 'file', value: '', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
      ],
      bodyDefinition: {
        kind: 'formData',
        fields: [
          { key: 'file', value: '', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
        ],
      },
    })
  })

  it('blocks OpenAPI apply when analyze fails and leaves the confirmation dialog closed', async () => {
    window.innerWidth = 1440

    const analyzeOpenApiImport = vi.fn<RuntimeAdapter['analyzeOpenApiImport']>(async () => ({
      ok: false,
      error: {
        code: 'OPENAPI_PARSE_ERROR',
        message: 'failed to parse OpenAPI document',
      },
    }))
    const applyOpenApiImport = vi.fn<RuntimeAdapter['applyOpenApiImport']>()

    setRuntimeAdapter(createAdapter(withOpenApiCapability(createBootstrapPayload()), {
      analyzeOpenApiImport,
      applyOpenApiImport,
    }))

    const wrapper = await mountApp()

    const file = new File(['not an openapi document'], 'broken.yaml', { type: 'application/yaml' })
    const input = wrapper.get('[data-testid="openapi-import-input"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await wrapper.get('[data-testid="request-panel-import-openapi"]').trigger('click')
    await input.trigger('change')
    await flushPromises()
    await nextTick()

    expect(analyzeOpenApiImport).toHaveBeenCalledWith('workspace-1', 'not an openapi document')
    expect(applyOpenApiImport).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-open')).toBe('false')
  })

  it('allows a warning-tolerant OpenAPI analyze -> confirm -> apply flow and preserves the session before refresh', async () => {
    window.innerWidth = 1440

    const initialPayload = withOpenApiCapability(createBootstrapPayload())
    const refreshedPayload = withOpenApiCapability(createBootstrapPayload())
    refreshedPayload.collections = [{
      id: 'collection-pets',
      name: 'Petstore - Pets',
      expanded: true,
      requests: [{
        id: 'request-openapi-imported',
        name: 'List pets',
        description: '',
        tags: ['pets'],
        collectionId: 'collection-pets',
        collectionName: 'Petstore - Pets',
        method: 'GET',
        url: 'https://api.example.com/pets',
        params: [],
        headers: [],
        body: '',
        bodyType: 'json',
        auth: {
          type: 'none' as const,
          bearerToken: '',
          username: '',
          password: '',
          apiKeyKey: '',
          apiKeyValue: '',
          apiKeyPlacement: 'header' as const,
        },
        tests: [],
      }],
    }]

    const analysis = createOpenApiAnalysis()
    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockResolvedValueOnce(ok(initialPayload))
      .mockResolvedValueOnce(ok(refreshedPayload))
    const analyzeOpenApiImport = vi.fn<RuntimeAdapter['analyzeOpenApiImport']>(async () => ok(analysis))
    const applyOpenApiImport = vi.fn<RuntimeAdapter['applyOpenApiImport']>(async () => ok({
      importedRequestCount: 1,
      skippedOperationCount: 1,
      warningDiagnosticCount: 1,
      collectionNames: ['Petstore - Pets'],
    }))
    const saveWorkspaceSession = vi.fn<RuntimeAdapter['saveWorkspaceSession']>(async (_workspaceId, _session) =>
      ok({ savedAtEpochMs: Date.now() }))

    setRuntimeAdapter(createAdapter(initialPayload, {
      bootstrapApp,
      analyzeOpenApiImport,
      applyOpenApiImport,
      saveWorkspaceSession,
    }))

    const wrapper = await mountApp()

    const file = new File(['openapi: 3.0.3'], 'petstore.yaml', { type: 'application/yaml' })
    const input = wrapper.get('[data-testid="openapi-import-input"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await wrapper.get('[data-testid="request-panel-import-openapi"]').trigger('click')
    await input.trigger('change')
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-open')).toBe('true')
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-details-value')).toContain('OPENAPI_MISSING_SERVER')

    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(analyzeOpenApiImport).toHaveBeenCalledWith('workspace-1', 'openapi: 3.0.3')
    expect(applyOpenApiImport).toHaveBeenCalledWith('workspace-1', analysis)
    expect(saveWorkspaceSession).toHaveBeenCalled()
    expect(bootstrapApp).toHaveBeenCalledTimes(2)
  })

  it('lets the user cancel after a successful OpenAPI analyze without mutating the workspace', async () => {
    window.innerWidth = 1440

    const analyzeOpenApiImport = vi.fn<RuntimeAdapter['analyzeOpenApiImport']>(async () => ok(createOpenApiAnalysis()))
    const applyOpenApiImport = vi.fn<RuntimeAdapter['applyOpenApiImport']>()

    setRuntimeAdapter(createAdapter(withOpenApiCapability(createBootstrapPayload()), {
      analyzeOpenApiImport,
      applyOpenApiImport,
    }))

    const wrapper = await mountApp()

    const file = new File(['openapi: 3.0.3'], 'petstore.yaml', { type: 'application/yaml' })
    const input = wrapper.get('[data-testid="openapi-import-input"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await wrapper.get('[data-testid="request-panel-import-openapi"]').trigger('click')
    await input.trigger('change')
    await flushPromises()
    await nextTick()

    await wrapper.get('[data-testid="dialog-close"]').trigger('click')
    await nextTick()

    expect(analyzeOpenApiImport).toHaveBeenCalledTimes(1)
    expect(applyOpenApiImport).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-open')).toBe('false')
  })

  it('collapses the request pane as a layout state and restores it on the next toggle', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()
    const panels = () => wrapper.findAll('[data-testid="resizable-panel"]')

    expect(panels()[2]?.attributes('data-state')).toBe('expanded')

    await wrapper.get('[data-testid="request-panel-toggle-collapse"]').trigger('click')
    await nextTick()

    expect(panels()[2]?.attributes('data-state')).toBe('collapsed')
    expect(wrapper.get('[data-testid="request-panel-collapsed-state"]').text()).toBe('collapsed')

    await wrapper.get('[data-testid="request-panel-toggle-collapse"]').trigger('click')
    await nextTick()

    expect(panels()[2]?.attributes('data-state')).toBe('expanded')
    expect(wrapper.get('[data-testid="request-panel-collapsed-state"]').text()).toBe('expanded')
  })

  it('renders distinct desktop workbench regions after bootstrap', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="workbench-carrier"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workbench-carrier"]').classes()).toContain('zr-workbench-carrier')
    expect(wrapper.get('[data-testid="workbench-layout-desktop"]').classes()).toContain('zr-workbench-layout-desktop')
    expect(wrapper.find('[data-testid="workbench-sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-response"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workbench-sidebar"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-sidebar']),
    )
    expect(wrapper.get('[data-testid="workbench-request"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-request']),
    )
    expect(wrapper.get('[data-testid="workbench-response"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-response']),
    )
  })

  it('preserves the active request context when toggling compact navigation', async () => {
    window.innerWidth = 960
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="workbench-sidebar"]').exists()).toBe(false)

    await wrapper.get('[data-testid="header-nav-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-explorer-sheet"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="request-panel-stub"]').text()).toContain('Orders Lookup')

    await wrapper.get('[data-testid="header-nav-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="request-panel-stub"]').text()).toContain('Orders Lookup')
    expect(wrapper.find('[data-testid="workbench-response"]').exists()).toBe(true)
  })

  it('renders splitter lines without handle buttons', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    const handles = [
      wrapper.get('[data-testid="workbench-seam-sidebar-request"]'),
      wrapper.get('[data-testid="workbench-seam-request-response"]'),
    ]

    expect(handles.length).toBeGreaterThan(0)
    expect(handles.every((handle) => handle.attributes('data-with-handle') === 'false')).toBe(true)
  })

  it('renders tighter splitter gaps after removing handle buttons', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    const groups = [
      wrapper.get('[data-testid="workbench-layout-desktop"]'),
      wrapper.get('[data-testid="workbench-stack-desktop"]'),
    ]
    const sidebarSeam = wrapper.get('[data-testid="workbench-seam-sidebar-request"]')
    const responseSeam = wrapper.get('[data-testid="workbench-seam-request-response"]')

    expect(groups.length).toBe(2)
    expect(groups.every((group) => group.classes().includes('gap-[var(--zr-workbench-seam-gap)]'))).toBe(true)
    expect(sidebarSeam.classes()).toEqual(
      expect.arrayContaining(['zr-workbench-seam', 'zr-workbench-seam-vertical', 'w-[var(--zr-workbench-seam-size)]']),
    )
    expect(responseSeam.classes()).toEqual(
      expect.arrayContaining(['zr-workbench-seam', 'zr-workbench-seam-horizontal', 'h-[var(--zr-workbench-seam-size)]']),
    )
  })

  it('keeps the three workbench regions shrinkable for internal vertical scrolling', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="workbench-sidebar"]').classes()).toContain('min-h-0')
    expect(wrapper.get('[data-testid="workbench-request"]').classes()).toContain('min-h-0')
    expect(wrapper.get('[data-testid="workbench-response"]').classes()).toContain('min-h-0')
  })

  it('keeps the connected docked-segment language in compact layout', async () => {
    window.innerWidth = 960
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="workbench-carrier"]').classes()).toContain('zr-workbench-carrier')
    expect(wrapper.get('[data-testid="workbench-layout-compact"]').classes()).toContain('zr-workbench-layout-compact')
    expect(wrapper.get('[data-testid="workbench-request"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-request']),
    )
    expect(wrapper.get('[data-testid="workbench-response"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-response']),
    )
    expect(wrapper.get('[data-testid="workbench-seam-request-response"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-seam', 'zr-workbench-seam-horizontal']),
    )
  })


  it('keeps repeated request/response resize events with the same size from mutating layout state indefinitely', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()
    const requestCollapsedBefore = wrapper.findComponent(RequestPanelStub).props('collapsed')
    const responseCollapsedBefore = wrapper.findComponent(ResponsePanelStub).props('collapsed')

    for (let index = 0; index < 5; index += 1) {
      window.dispatchEvent(new Event('resize'))
    }
    await nextTick()

    expect(wrapper.findComponent(RequestPanelStub).props('collapsed')).toBe(requestCollapsedBefore)
    expect(wrapper.findComponent(ResponsePanelStub).props('collapsed')).toBe(responseCollapsedBefore)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-response"]').exists()).toBe(true)
  })

  it('suppresses global context menus on unsupported surfaces while allowing whitelisted targets', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    const blockedEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    wrapper.get('[data-testid="workbench-response"]').element.dispatchEvent(blockedEvent)
    expect(blockedEvent.defaultPrevented).toBe(true)

    const allowedEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    wrapper.get('[data-testid="resource-context-surface"]').element.dispatchEvent(allowedEvent)
    expect(allowedEvent.defaultPrevented).toBe(false)

    const nativeInputEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    wrapper.get('[data-testid="native-context-input"]').element.dispatchEvent(nativeInputEvent)
    expect(nativeInputEvent.defaultPrevented).toBe(false)
  })

})
