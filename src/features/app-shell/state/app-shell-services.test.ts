import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { defaultRequestPreset } from '@/data/request-presets'
import type { RequestPreset, SendRequestPayload } from '@/types/request'
import { createRequestTabFromPreset } from '@/lib/request-workspace'
import { createAppShellServices } from './app-shell-services'
import { createAppShellStore, createInitialAppShellState } from './app-shell-store'

describe('app-shell services', () => {
  it('propagates runtime failures for mcp sends', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-mcp'
    tab.name = 'MCP Search'
    tab.requestKind = 'mcp'
    tab.mcp = {
      connection: {
        transport: 'http',
        baseUrl: 'https://example.com/mcp',
        headers: [],
        auth: {
          type: 'none',
          bearerToken: '',
          username: '',
          password: '',
          apiKeyKey: 'X-API-Key',
          apiKeyValue: '',
          apiKeyPlacement: 'header',
        },
      },
      operation: {
        type: 'tools.call',
        input: {
          toolName: 'search',
          arguments: {},
        },
      },
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async () => ({
        ok: false,
        error: { code: 'NOT_IMPLEMENTED', message: 'send_mcp_request is not implemented yet' },
      })),
    } as const

    const services = createAppShellServices({
      runtime: runtime as never,
      store,
    })

    const payload: SendRequestPayload = {
      tabId: tab.id,
      requestKind: 'mcp',
      mcp: tab.mcp,
      requestId: tab.requestId,
      name: tab.name,
      description: tab.description,
      tags: tab.tags,
      collectionName: tab.collectionName,
      method: tab.method,
      url: tab.mcp.connection.baseUrl,
      params: [],
      headers: [],
      body: '',
      bodyType: 'json',
      auth: tab.auth,
      tests: [],
      executionOptions: tab.executionOptions,
    }

    const result = await services.sendRequest({ payload })

    expect(result).toMatchObject({
      ok: false,
      code: 'request.send_failed',
      message: 'send_mcp_request is not implemented yet',
    })
    expect(runtime.sendRequest).not.toHaveBeenCalled()
    expect(runtime.sendMcpRequest).toHaveBeenCalledWith('workspace-1', 'env-local', payload)
    expect(state.request.openTabs[0]).toMatchObject({
      isSending: false,
      executionState: 'transport-error',
    })
    expect(state.request.openTabs[0]?.response.responseBody).toContain('send_mcp_request is not implemented yet')
  })

  it('preserves runtime-provided mcp history items after a successful send', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-mcp'
    tab.name = 'MCP Search'
    tab.requestKind = 'mcp'
    tab.mcp = {
      connection: {
        transport: 'http',
        baseUrl: 'https://example.com/mcp',
        headers: [],
        auth: {
          type: 'none',
          bearerToken: '',
          username: '',
          password: '',
          apiKeyKey: '',
          apiKeyValue: '',
          apiKeyPlacement: 'header',
        },
      },
      operation: {
        type: 'tools.call',
        input: {
          toolName: 'search',
          arguments: { q: 'zen' },
        },
      },
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async () => ({
        ok: true,
        data: {
          requestMethod: 'POST',
          requestUrl: 'https://example.com/mcp',
          status: 200,
          statusText: 'OK',
          elapsedMs: 12,
          sizeBytes: 32,
          contentType: 'application/json',
          responseBody: '{"result":true}',
          headers: [],
          truncated: false,
          executionSource: 'live',
          mcpArtifact: {
            transport: 'http',
            operation: 'tools.call',
            errorCategory: 'protocol',
          },
          historyItem: {
            id: 'history-mcp-runtime-1',
            name: 'MCP Search',
            method: 'POST',
            time: '10:00:00',
            status: 200,
            url: 'https://example.com/mcp',
            executionSource: 'live',
            mcpSummary: {
              operation: 'tools.call',
              transport: 'http',
              errorCategory: 'protocol',
            },
            requestSnapshot: {
              tabId: 'tab-mcp',
              requestId: tab.requestId,
              requestKind: 'mcp',
              mcp: tab.mcp,
              name: 'MCP Search',
              description: '',
              tags: [],
              collectionName: 'Scratch Pad',
              method: 'POST',
              url: 'https://example.com/mcp',
              params: [],
              headers: [],
              body: '',
              bodyType: 'json',
              auth: tab.auth,
              tests: [],
            },
          },
        },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })

    const payload: SendRequestPayload = {
      tabId: tab.id,
      requestKind: 'mcp',
      mcp: tab.mcp,
      requestId: tab.requestId,
      name: tab.name,
      description: tab.description,
      tags: tab.tags,
      collectionName: tab.collectionName,
      method: tab.method,
      url: tab.mcp.connection.baseUrl,
      params: [],
      headers: [],
      body: '',
      bodyType: 'json',
      auth: tab.auth,
      tests: [],
      executionOptions: tab.executionOptions,
    }

    const result = await services.sendRequest({ payload })

    expect(result).toMatchObject({ ok: true, code: 'request.sent' })
    expect(runtime.sendRequest).not.toHaveBeenCalled()
    expect(state.request.historyItems[0]).toMatchObject({
      id: 'history-mcp-runtime-1',
      mcpSummary: {
        operation: 'tools.call',
        transport: 'http',
        errorCategory: 'protocol',
      },
    })
    expect(state.request.historyItems[0]?.requestSnapshot?.requestKind).toBe('mcp')
  })

  it('preserves cached mcp tools after a tools.call response omits the tool list', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-mcp-cache'
    tab.name = 'MCP Search'
    tab.requestKind = 'mcp'
    tab.mcp = {
      connection: {
        transport: 'http',
        baseUrl: 'https://example.com/mcp',
        headers: [],
        auth: {
          type: 'none',
          bearerToken: '',
          username: '',
          password: '',
          apiKeyKey: 'X-API-Key',
          apiKeyValue: '',
          apiKeyPlacement: 'header',
        },
      },
      operation: {
        type: 'tools.call',
        input: {
          toolName: 'search',
          arguments: { q: 'zen' },
        },
      },
    }
    tab.response.mcpArtifact = {
      transport: 'http',
      operation: 'tools.list',
      cachedTools: [
        {
          name: 'search',
          title: 'Search',
          inputSchema: {
            type: 'object',
            properties: {
              q: { type: 'string' },
            },
          },
        },
      ],
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async () => ({
        ok: true,
        data: {
          requestMethod: 'POST',
          requestUrl: 'https://example.com/mcp',
          status: 200,
          statusText: 'OK',
          elapsedMs: 12,
          sizeBytes: 32,
          contentType: 'application/json',
          responseBody: '{"result":true}',
          headers: [],
          truncated: false,
          executionSource: 'live',
          mcpArtifact: {
            transport: 'http',
            operation: 'tools.call',
            selectedTool: {
              name: 'search',
              title: 'Search',
            },
            protocolResponse: {
              result: {
                content: [],
              },
            },
          },
        },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })

    const payload: SendRequestPayload = {
      tabId: tab.id,
      requestKind: 'mcp',
      mcp: tab.mcp,
      requestId: tab.requestId,
      name: tab.name,
      description: tab.description,
      tags: tab.tags,
      collectionName: tab.collectionName,
      method: tab.method,
      url: tab.mcp.connection.baseUrl,
      params: [],
      headers: [],
      body: '',
      bodyType: 'json',
      auth: tab.auth,
      tests: [],
      executionOptions: tab.executionOptions,
    }

    const result = await services.sendRequest({ payload })

    expect(result).toMatchObject({ ok: true, code: 'request.sent' })
    expect(state.request.openTabs[0]?.response.mcpArtifact?.cachedTools).toEqual([
      {
        name: 'search',
        title: 'Search',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string' },
          },
        },
      },
    ])
  })

  it('discovers mcp tools through the runtime bridge', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const store = createAppShellStore(state)
    const payload: SendRequestPayload = {
      tabId: 'tab-mcp-discover',
      requestKind: 'mcp',
      mcp: {
        connection: {
          transport: 'http',
          baseUrl: 'https://example.com/mcp',
          headers: [],
          auth: {
            type: 'none',
            bearerToken: '',
            username: '',
            password: '',
            apiKeyKey: 'X-API-Key',
            apiKeyValue: '',
            apiKeyPlacement: 'header',
          },
        },
        operation: {
          type: 'tools.call',
          input: { toolName: 'search', arguments: {} },
        },
      },
      name: 'MCP Discover',
      description: '',
      tags: [],
      collectionName: 'Scratch Pad',
      method: 'POST',
      url: 'https://example.com/mcp',
      params: [],
      headers: [],
      body: '',
      bodyType: 'json',
      auth: {
        type: 'none',
        bearerToken: '',
        username: '',
        password: '',
        apiKeyKey: '',
        apiKeyValue: '',
        apiKeyPlacement: 'header',
      },
      tests: [],
      executionOptions: {
        redirectPolicy: 'follow',
        proxy: { mode: 'inherit' },
        verifySsl: true,
      },
    }

    const runtime = {
      discoverMcpTools: vi.fn(async () => ({ ok: true, data: [{ name: 'search', inputSchema: { type: 'object' } }] })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.discoverMcpTools({ payload })

    expect(result).toMatchObject({ ok: true, code: 'mcp.discovered' })
    expect(result.ok && result.data ? result.data[0] : null).toMatchObject({ name: 'search' })
    expect(runtime.discoverMcpTools).toHaveBeenCalledWith('workspace-1', 'env-local', payload)
  })

  it('creates a missing collection before saving a request and updates the store state', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-orders'
    tab.name = 'Orders Lookup'
    tab.description = 'Draft request'
    tab.tags = ['orders']
    tab.method = 'POST'
    tab.url = 'https://example.com/orders'
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const createdCollection = {
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
      requests: [],
    }
    const savedRequest: RequestPreset = {
      id: 'request-orders',
      name: 'Orders Lookup',
      description: 'Draft request',
      tags: ['orders'],
      collectionId: 'collection-orders',
      collectionName: 'Orders',
      method: 'POST',
      url: 'https://example.com/orders',
      params: [],
      headers: [],
      body: '',
      bodyType: 'json',
      auth: {
        type: 'none',
        bearerToken: '',
        username: '',
        password: '',
        apiKeyKey: '',
        apiKeyValue: '',
        apiKeyPlacement: 'header',
      },
      tests: [],
    }

    const runtime = {
      createCollection: vi.fn(async () => ({ ok: true, data: createdCollection })),
      saveRequest: vi.fn(async () => ({ ok: true, data: savedRequest })),
    } as const

    const services = createAppShellServices({
      runtime: runtime as never,
      store,
    })

    const result = await services.saveRequest({
      tabId: tab.id,
      requestName: 'Orders Lookup',
      requestDescription: 'Draft request',
      requestTags: ['orders'],
      targetCollectionName: 'Orders',
    })

    expect(result).toMatchObject({ ok: true, code: 'request.saved' })
    expect(runtime.createCollection).toHaveBeenCalledWith('workspace-1', 'Orders')
    expect(runtime.saveRequest).toHaveBeenCalledWith('workspace-1', 'collection-orders', expect.objectContaining({
      name: 'Orders Lookup',
      description: 'Draft request',
      tags: ['orders'],
      collectionId: 'collection-orders',
      collectionName: 'Orders',
    }))
    expect(state.request.collections).toHaveLength(1)
    expect(state.request.collections[0]).toMatchObject({
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
    })
    expect(state.request.collections[0]?.requests[0]?.id).toBe('request-orders')
    expect(state.request.openTabs[0]).toMatchObject({
      requestId: 'request-orders',
      collectionId: 'collection-orders',
      collectionName: 'Orders',
      persistenceState: 'saved',
      isDirty: false,
    })
  })

  it('fails when a successful http response omits history snapshot data', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({
        ok: true,
        data: {
          requestMethod: 'GET',
          requestUrl: 'https://example.com/api',
          status: 200,
          statusText: 'OK',
          elapsedMs: 12,
          sizeBytes: 16,
          contentType: 'application/json',
          responseBody: '{"ok":true}',
          headers: [],
          truncated: false,
          executionSource: 'live',
        },
      })),
      sendMcpRequest: vi.fn(async () => ({ ok: true, data: {} })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const tab = store.selectors.getActiveTab()!

    const result = await services.sendRequest({
      payload: {
        tabId: tab.id,
        requestKind: 'http',
        requestId: tab.requestId,
        name: tab.name,
        description: tab.description,
        tags: tab.tags,
        collectionName: tab.collectionName,
        method: tab.method,
        url: tab.url,
        params: tab.params,
        headers: tab.headers,
        body: tab.body,
        bodyType: tab.bodyType,
        auth: tab.auth,
        tests: tab.tests,
        executionOptions: tab.executionOptions,
      },
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'request.send_failed',
      message: 'HTTP request completed without a history snapshot',
    })
  })

  it('prepends newest history item first across repeated successful sends', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: {
            requestMethod: 'GET',
            requestUrl: 'https://example.com/api',
            status: 200,
            statusText: 'OK',
            elapsedMs: 10,
            sizeBytes: 16,
            contentType: 'application/json',
            responseBody: '{"run":1}',
            headers: [],
            truncated: false,
            executionSource: 'live',
            historyItem: {
              id: 'history-1',
              name: 'First',
              method: 'GET',
              time: '10:00:00',
              status: 200,
              url: 'https://example.com/api',
            },
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          data: {
            requestMethod: 'GET',
            requestUrl: 'https://example.com/api',
            status: 201,
            statusText: 'Created',
            elapsedMs: 11,
            sizeBytes: 17,
            contentType: 'application/json',
            responseBody: '{"run":2}',
            headers: [],
            truncated: false,
            executionSource: 'live',
            historyItem: {
              id: 'history-2',
              name: 'Second',
              method: 'GET',
              time: '10:00:01',
              status: 201,
              url: 'https://example.com/api',
            },
          },
        }),
      sendMcpRequest: vi.fn(async () => ({ ok: true, data: {} })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const tab = store.selectors.getActiveTab()!
    const payload: SendRequestPayload = {
      tabId: tab.id,
      requestKind: 'http',
      requestId: tab.requestId,
      name: tab.name,
      description: tab.description,
      tags: tab.tags,
      collectionName: tab.collectionName,
      method: tab.method,
      url: tab.url,
      params: tab.params,
      headers: tab.headers,
      body: tab.body,
      bodyType: tab.bodyType,
      auth: tab.auth,
      tests: tab.tests,
      executionOptions: tab.executionOptions,
    }

    await services.sendRequest({ payload })
    await services.sendRequest({ payload })

    expect(state.request.historyItems.map((item) => item.id)).toEqual(['history-2', 'history-1'])
    expect(store.selectors.getActiveTab()?.response.status).toBe(201)
    expect(store.selectors.getActiveTab()?.response.responseBody).toBe('{"run":2}')
  })

  it('preserves large response body and formatted size for a successful send', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const largeBody = 'x'.repeat(32 * 1024)
    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({
        ok: true,
        data: {
          requestMethod: 'GET',
          requestUrl: 'https://example.com/large',
          status: 200,
          statusText: 'OK',
          elapsedMs: 25,
          sizeBytes: 32 * 1024,
          contentType: 'text/plain',
          responseBody: largeBody,
          headers: [],
          truncated: false,
          executionSource: 'live',
          historyItem: {
            id: 'history-large-1',
            name: 'Large Response',
            method: 'GET',
            time: '10:00:02',
            status: 200,
            url: 'https://example.com/large',
            sizeBytes: 32 * 1024,
            responsePreview: largeBody,
          },
        },
      })),
      sendMcpRequest: vi.fn(async () => ({ ok: true, data: {} })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const tab = store.selectors.getActiveTab()!

    const result = await services.sendRequest({
      payload: {
        tabId: tab.id,
        requestKind: 'http',
        requestId: tab.requestId,
        name: tab.name,
        description: tab.description,
        tags: tab.tags,
        collectionName: tab.collectionName,
        method: tab.method,
        url: 'https://example.com/large',
        params: tab.params,
        headers: tab.headers,
        body: tab.body,
        bodyType: tab.bodyType,
        auth: tab.auth,
        tests: tab.tests,
        executionOptions: tab.executionOptions,
      },
    })

    expect(result).toMatchObject({ ok: true, code: 'request.sent' })
    expect(store.selectors.getActiveTab()?.response.responseBody).toHaveLength(32 * 1024)
    expect(store.selectors.getActiveTab()?.response.size).toBe('32.0 KB')
    expect(state.request.historyItems[0]?.id).toBe('history-large-1')
  })
})
