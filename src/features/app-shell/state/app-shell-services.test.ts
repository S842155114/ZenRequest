import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { defaultRequestPreset } from '@/data/request-presets'
import type { RequestPreset, SendRequestPayload } from '@/types/request'
import { createRequestTabFromPreset } from '@/lib/request-workspace'
import { createAppShellServices } from './app-shell-services'
import { createAppShellStore, createInitialAppShellState } from './app-shell-store'

describe('app-shell services', () => {
  it('blocks http sends when required variables are unresolved', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
    ] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-http-missing-vars'
    tab.url = '{{baseUrl}}/orders/{{missingId}}'
    tab.auth = {
      type: 'bearer',
      bearerToken: '{{token}}',
      username: '',
      password: '',
      apiKeyKey: 'X-API-Key',
      apiKeyValue: '',
      apiKeyPlacement: 'header',
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async () => ({ ok: true, data: {} })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })

    const payload: SendRequestPayload = {
      tabId: tab.id,
      requestId: tab.requestId,
      name: tab.name,
      description: tab.description,
      tags: tab.tags,
      collectionName: tab.collectionName,
      method: tab.method,
      url: tab.url,
      params: [],
      headers: [],
      body: tab.body,
      bodyType: tab.bodyType,
      auth: tab.auth,
      tests: [],
      executionOptions: tab.executionOptions,
    }

    const result = await services.sendRequest({ payload })

    expect(result).toMatchObject({
      ok: false,
      code: 'request.send_failed',
      message: 'Missing required variables: missingId, token',
    })
    expect(runtime.sendRequest).not.toHaveBeenCalled()
    expect(state.request.openTabs[0]?.executionState).toBe('transport-error')
    expect(state.request.openTabs[0]?.response.responseBody).toContain('Missing required variables')
  })


  it('blocks replayed redacted bearer secrets before runtime send', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-http-redacted-secret'
    tab.url = 'https://example.com/orders'
    tab.auth = {
      type: 'bearer',
      bearerToken: '[REDACTED]',
      username: '',
      password: '',
      apiKeyKey: 'X-API-Key',
      apiKeyValue: '',
      apiKeyPlacement: 'header',
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async () => ({ ok: true, data: {} })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })

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
        params: [],
        headers: [],
        body: tab.body,
        bodyType: tab.bodyType,
        auth: tab.auth,
        tests: [],
        executionOptions: tab.executionOptions,
      },
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'request.send_failed',
      message: 'Missing required variables: bearerToken',
    })
    expect(runtime.sendRequest).not.toHaveBeenCalled()
  })


  it('maps runtime request failures to structured advice', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
    ] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-http-runtime-error'
    tab.url = 'https://example.com/orders'
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({
        ok: false,
        error: { code: 'DB_WRITE_FAILED', message: 'Failed to persist request history' },
      })),
      sendMcpRequest: vi.fn(async () => ({ ok: true, data: {} })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
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
        params: [],
        headers: [],
        body: tab.body,
        bodyType: tab.bodyType,
        auth: tab.auth,
        tests: tab.tests,
        executionOptions: tab.executionOptions,
      },
    })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Failed to persist request history')
    expect(result.message).toContain('Check local data health')
    expect(state.request.openTabs[0]?.response.responseBody).toContain('DB_WRITE_FAILED')
    expect(state.request.openTabs[0]?.response.responseBody).toContain('Check local data health')
  })

  it('maps bootstrap failures to degraded startup advice', async () => {
    const state = reactive(createInitialAppShellState())
    const store = createAppShellStore(state)
    const runtime = {
      bootstrapApp: vi.fn(async () => ({
        ok: false,
        error: { code: 'SNAPSHOT_RESTORE_FAILED', message: 'Snapshot could not be restored' },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.bootstrapApp()

    expect(result).toMatchObject({
      ok: false,
      code: 'runtime.bootstrap_failed',
    })
    expect(state.runtime.startupState).toBe('degraded')
    expect(state.runtime.startupErrorMessage).toContain('Snapshot could not be restored')
    expect(state.runtime.startupErrorMessage).toContain('Retry startup')
  })

  it('propagates runtime failures for mcp sends', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
    ] }]
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
    })
    expect(result.message).toContain('send_mcp_request is not implemented yet')
    expect(result.message).toContain('Check the selected tool, arguments, and server tool response')
    expect(runtime.sendRequest).not.toHaveBeenCalled()
    expect(runtime.sendMcpRequest).toHaveBeenCalledWith('workspace-1', 'env-local', payload)
    expect(state.request.openTabs[0]).toMatchObject({
      isSending: false,
      executionState: 'transport-error',
    })
    expect(state.request.openTabs[0]?.response.responseBody).toContain('NOT_IMPLEMENTED')
    expect(state.request.openTabs[0]?.response.responseBody).toContain('send_mcp_request is not implemented yet')
  })

  it('classifies mcp transport failures with transport guidance', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-mcp-transport'
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
        type: 'initialize',
        input: { clientName: 'ZenRequest', clientVersion: '0.1.0' },
      },
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async () => ({
        ok: false,
        error: { code: 'MCP_REQUEST_FAILED', message: 'connect ECONNREFUSED' },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.sendRequest({
      payload: {
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
      },
    })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Check MCP transport connectivity')
    expect(state.request.openTabs[0]?.response.responseBody).toContain('"layer": "transport"')
  })

  it('classifies protocol-level mcp failures as session errors when server reports initialize/session issues', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-mcp-session'
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
        sessionId: 'session-1',
      },
      operation: {
        type: 'tools.call',
        input: { toolName: 'search', arguments: { q: 'zen' } },
      },
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async () => ({
        ok: false,
        error: { code: 'MCP_SESSION_INVALID', message: 'Server session is not initialized' },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.sendRequest({
      payload: {
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
      },
    })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Re-run initialize')
    expect(state.request.openTabs[0]?.response.responseBody).toContain('"layer": "session"')
  })

  it('preserves sse-style initialize responses as parsed mcp protocol payloads', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-mcp-init'
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
        type: 'initialize',
        input: { clientName: 'ZenRequest', clientVersion: '0.1.0' },
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
          elapsedMs: 8,
          sizeBytes: 120,
          contentType: 'text/event-stream',
          responseBody: 'event: message\ndata: {"jsonrpc":"2.0","id":"test:init","result":{"protocolVersion":"2024-11-05"}}',
          headers: [{ key: 'mcp-session-id', value: 'session-1' }],
          truncated: false,
          executionSource: 'live',
          mcpArtifact: {
            transport: 'http',
            operation: 'initialize',
            sessionId: 'session-1',
            protocolRequest: { method: 'initialize' },
            protocolResponse: {
              jsonrpc: '2.0',
              id: 'test:init',
              result: { protocolVersion: '2024-11-05' },
            },
          },
        },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.sendRequest({
      payload: {
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
      },
    })

    expect(result.ok).toBe(true)
    expect(state.request.openTabs[0]?.mcp?.connection.sessionId).toBe('session-1')
    expect(state.request.openTabs[0]?.response.mcpArtifact?.sessionId).toBe('session-1')
    expect(state.request.openTabs[0]?.response.mcpArtifact?.protocolResponse).toEqual({
      jsonrpc: '2.0',
      id: 'test:init',
      result: { protocolVersion: '2024-11-05' },
    })
  })

  it('keeps initialize session context for follow-up tools.list style requests', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-mcp-tools-list'
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
        sessionId: 'session-1',
      },
      operation: {
        type: 'tools.list',
        input: { cursor: '' },
      },
    }
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({ ok: true, data: {} })),
      sendMcpRequest: vi.fn(async (_workspaceId, _envId, payload) => ({
        ok: true,
        data: {
          requestMethod: 'POST',
          requestUrl: 'https://example.com/mcp',
          status: 200,
          statusText: 'OK',
          elapsedMs: 9,
          sizeBytes: 64,
          contentType: 'application/json',
          responseBody: '{"result":{"tools":[]}}',
          headers: [],
          truncated: false,
          executionSource: 'live',
          mcpArtifact: {
            transport: 'http',
            operation: 'tools.list',
            sessionId: payload.mcp.connection.sessionId,
            protocolResponse: { result: { tools: [] } },
          },
        },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.sendRequest({
      payload: {
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
      },
    })

    expect(result.ok).toBe(true)
    expect(runtime.sendMcpRequest).toHaveBeenCalledWith('workspace-1', 'env-local', expect.objectContaining({
      mcp: expect.objectContaining({
        connection: expect.objectContaining({ sessionId: 'session-1' }),
      }),
    }))
  })

  it('preserves runtime-provided mcp history items after a successful send', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
    ] }]
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
        toolName: 'search',
      },
    })
    expect(state.request.historyItems[0]?.requestSnapshot?.requestKind).toBe('mcp')
    expect(state.request.historyItems[0]?.mcpArtifact?.operation).toBe('tools.call')
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


  it('sends resolved http payload values to runtime', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
      { key: 'requestId', value: '42', enabled: true },
      { key: 'token', value: 'secret-token', enabled: true },
    ] }]
    state.environment.activeId = 'env-local'

    const store = createAppShellStore(state)
    const runtime = {
      sendRequest: vi.fn(async () => ({
        ok: true,
        data: {
          requestMethod: 'GET',
          requestUrl: 'https://example.com/orders/42',
          status: 200,
          statusText: 'OK',
          elapsedMs: 12,
          sizeBytes: 16,
          contentType: 'application/json',
          responseBody: '{"ok":true}',
          headers: [],
          truncated: false,
          executionSource: 'live',
          historyItem: {
            id: 'history-1',
            name: 'Orders',
            method: 'GET',
            time: '10:00:00',
            status: 200,
            url: 'https://example.com/orders/42',
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
        url: '{{baseUrl}}/orders/{{requestId}}',
        params: [{ key: 'page', value: '{{requestId}}', enabled: true }],
        headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
        body: tab.body,
        bodyType: tab.bodyType,
        auth: {
          ...tab.auth,
          type: 'bearer',
          bearerToken: '{{token}}',
        },
        tests: tab.tests,
        executionOptions: tab.executionOptions,
      },
    })

    expect(result).toMatchObject({ ok: true, code: 'request.sent' })
    expect(runtime.sendRequest).toHaveBeenCalledWith(
      'workspace-1',
      'env-local',
      expect.objectContaining({
        url: 'https://example.com/orders/42',
        params: [{ key: 'page', value: '42', enabled: true }],
        headers: [{ key: 'Authorization', value: 'Bearer secret-token', enabled: true }],
        auth: expect.objectContaining({
          type: 'bearer',
          bearerToken: 'secret-token',
        }),
      }),
    )
  })

  it('fails when a successful http response omits history snapshot data', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
    ] }]
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
    })
    expect(result.message).toContain('HTTP request completed without a history snapshot')
    expect(result.message).toContain('Check local data health')
  })

  it('prepends newest history item first across repeated successful sends', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
    ] }]
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

  it('detaches replay tabs when removing their source history item', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'
    state.request.historyItems = [{
      id: 'history-orders-1',
      requestId: 'request-orders',
      name: 'Orders Replay',
      method: 'POST',
      time: '10:00:00',
      status: 201,
      url: 'https://example.com/orders/1',
    }]

    const replayTab = createRequestTabFromPreset(defaultRequestPreset)
    replayTab.id = 'tab-replay'
    replayTab.requestId = 'request-orders'
    replayTab.origin = {
      kind: 'replay',
      requestId: 'request-orders',
      historyItemId: 'history-orders-1',
    }
    replayTab.persistenceState = 'unsaved'
    replayTab.isDirty = false
    state.request.openTabs = [replayTab]
    state.request.activeTabId = replayTab.id

    const store = createAppShellStore(state)
    const runtime = {
      removeHistoryItem: vi.fn(async () => ({ ok: true, data: { message: 'ok' } })),
      clearHistory: vi.fn(async () => ({ ok: true, data: { message: 'ok' } })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })

    const result = await services.removeHistoryItem({ id: 'history-orders-1' })

    expect(result).toMatchObject({ ok: true, code: 'history.removed', data: { id: 'history-orders-1' } })
    expect(runtime.removeHistoryItem).toHaveBeenCalledWith('workspace-1', 'history-orders-1')
    expect(state.request.historyItems).toEqual([])
    expect(store.selectors.getActiveTab()).toMatchObject({
      id: 'tab-replay',
      persistenceState: 'unbound',
      isDirty: true,
      origin: {
        kind: 'detached',
        requestId: 'request-orders',
      },
    })
    expect(store.selectors.getActiveTab()?.origin?.historyItemId).toBeUndefined()
  })

  it('detaches all replay tabs when clearing history', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'
    state.request.historyItems = [{
      id: 'history-orders-1',
      requestId: 'request-orders',
      name: 'Orders Replay',
      method: 'POST',
      time: '10:00:00',
      status: 201,
      url: 'https://example.com/orders/1',
    }]

    const replayTab = createRequestTabFromPreset(defaultRequestPreset)
    replayTab.id = 'tab-replay'
    replayTab.requestId = 'request-orders'
    replayTab.origin = {
      kind: 'replay',
      requestId: 'request-orders',
      historyItemId: 'history-orders-1',
    }
    replayTab.persistenceState = 'unsaved'
    replayTab.isDirty = false

    const savedTab = createRequestTabFromPreset(defaultRequestPreset)
    savedTab.id = 'tab-saved'
    savedTab.requestId = 'request-saved'
    savedTab.origin = {
      kind: 'resource',
      requestId: 'request-saved',
    }
    savedTab.persistenceState = 'saved'
    savedTab.isDirty = false

    state.request.openTabs = [replayTab, savedTab]
    state.request.activeTabId = replayTab.id

    const store = createAppShellStore(state)
    const runtime = {
      removeHistoryItem: vi.fn(async () => ({ ok: true, data: { message: 'ok' } })),
      clearHistory: vi.fn(async () => ({ ok: true, data: { message: 'ok' } })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })

    const result = await services.clearHistory()

    expect(result).toMatchObject({ ok: true, code: 'history.cleared' })
    expect(runtime.clearHistory).toHaveBeenCalledWith('workspace-1')
    expect(state.request.historyItems).toEqual([])
    expect(store.selectors.getTabById('tab-replay')).toMatchObject({
      id: 'tab-replay',
      persistenceState: 'unbound',
      isDirty: true,
      origin: {
        kind: 'detached',
        requestId: 'request-orders',
      },
    })
    expect(store.selectors.getTabById('tab-replay')?.origin?.historyItemId).toBeUndefined()
    expect(store.selectors.getTabById('tab-saved')).toMatchObject({
      id: 'tab-saved',
      persistenceState: 'saved',
      isDirty: false,
      origin: {
        kind: 'resource',
        requestId: 'request-saved',
      },
    })
  })


  it('detaches open resource tabs when deleting their source collection', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.request.collections = [{
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
      requests: [{
        id: 'request-orders-list',
        name: 'Orders Lookup',
        description: '',
        tags: [],
        collectionId: 'collection-orders',
        collectionName: 'Orders',
        method: 'GET',
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
      }],
    }]

    const resourceTab = createRequestTabFromPreset(defaultRequestPreset)
    resourceTab.id = 'tab-orders'
    resourceTab.requestId = 'request-orders-list'
    resourceTab.collectionId = 'collection-orders'
    resourceTab.collectionName = 'Orders'
    resourceTab.origin = {
      kind: 'resource',
      requestId: 'request-orders-list',
    }
    resourceTab.persistenceState = 'saved'
    resourceTab.isDirty = false

    state.request.openTabs = [resourceTab]
    state.request.activeTabId = resourceTab.id

    const store = createAppShellStore(state)
    const runtime = {
      deleteCollection: vi.fn(async () => ({ ok: true, data: { message: 'ok' } })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.deleteCollection({ collectionId: 'collection-orders' })

    expect(result).toMatchObject({
      ok: true,
      code: 'collection.deleted',
      data: {
        collectionId: 'collection-orders',
        collectionName: 'Orders',
      },
    })
    expect(runtime.deleteCollection).toHaveBeenCalledWith('workspace-1', 'collection-orders')
    expect(state.request.collections).toEqual([])
    expect(store.selectors.getActiveTab()).toMatchObject({
      id: 'tab-orders',
      requestId: undefined,
      collectionId: undefined,
      collectionName: 'Scratch Pad',
      persistenceState: 'unbound',
      isDirty: true,
      origin: {
        kind: 'detached',
        requestId: 'request-orders-list',
      },
    })
  })


  it('maps invalid workspace import packages to a specific failure code', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'

    const store = createAppShellStore(state)
    const runtime = {
      importWorkspace: vi.fn(async () => ({
        ok: false,
        error: {
          code: 'INVALID_IMPORT_PACKAGE',
          message: 'failed to parse workspace import package',
        },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.importWorkspace({ packageJson: '{invalid', strategy: 'rename' })

    expect(result).toMatchObject({
      ok: false,
      code: 'workspace.import_invalid_package',
      message: 'failed to parse workspace import package Check the package contents, selected conflict strategy, and local workspace state before retrying.',
    })
  })

  it('maps unsupported workspace import packages to a specific failure code', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'

    const store = createAppShellStore(state)
    const runtime = {
      importWorkspace: vi.fn(async () => ({
        ok: false,
        error: {
          code: 'UNSUPPORTED_IMPORT_PACKAGE',
          message: 'unsupported workspace export format: 2',
        },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.importWorkspace({ packageJson: '{}', strategy: 'rename' })

    expect(result).toMatchObject({
      ok: false,
      code: 'workspace.import_unsupported_package',
      message: 'unsupported workspace export format: 2 Check the package contents, selected conflict strategy, and local workspace state before retrying.',
    })
  })


  it('preserves application import results across the service boundary', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'

    const store = createAppShellStore(state)
    const runtime = {
      importWorkspace: vi.fn(async () => ({
        ok: true,
        data: {
          scope: 'application',
          workspace: { id: 'workspace-2', name: 'Imported Workspace' },
          importedWorkspaceCount: 2,
          activeWorkspaceId: 'workspace-2',
        },
      })),
      bootstrapApp: vi.fn(async () => ({
        ok: true,
        data: {
          settings: { themeMode: 'dark', locale: 'en' },
          workspaces: [{ id: 'workspace-2', name: 'Imported Workspace' }],
          activeWorkspaceId: 'workspace-2',
          collections: [],
          environments: [],
          history: [],
        },
      })),
    } as const

    const services = createAppShellServices({ runtime: runtime as never, store })
    const result = await services.importWorkspace({ packageJson: '{"scope":"application"}', strategy: 'overwrite' })

    expect(runtime.importWorkspace).toHaveBeenCalledWith('{"scope":"application"}', 'overwrite')
    expect(result).toMatchObject({
      ok: true,
      code: 'workspace.imported',
      data: {
        scope: 'application',
        importedWorkspaceCount: 2,
        workspaceName: 'Imported Workspace',
      },
    })
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

it('maps history removal failures to structured persistence advice', async () => {
  const state = reactive(createInitialAppShellState())
  state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
  state.workspace.activeId = 'workspace-1'

  const store = createAppShellStore(state)
  const runtime = {
    removeHistoryItem: vi.fn(async () => ({
      ok: false,
      error: { code: 'HISTORY_ROW_CORRUPTED', message: 'Failed to remove history item' },
    })),
  } as const

  const services = createAppShellServices({ runtime: runtime as never, store })
  const result = await services.removeHistoryItem({ id: 'history-1' })

  expect(result).toMatchObject({
    ok: false,
    code: 'history.remove_failed',
  })
  expect(result.message).toContain('Failed to remove history item')
  expect(result.message).toContain('Check local data health')
})

it('maps history clear failures to structured persistence advice', async () => {
  const state = reactive(createInitialAppShellState())
  state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
  state.workspace.activeId = 'workspace-1'

  const store = createAppShellStore(state)
  const runtime = {
    clearHistory: vi.fn(async () => ({
      ok: false,
      error: { code: 'SQLITE_HISTORY_LOCKED', message: 'Failed to clear history' },
    })),
  } as const

  const services = createAppShellServices({ runtime: runtime as never, store })
  const result = await services.clearHistory()

  expect(result).toMatchObject({
    ok: false,
    code: 'history.clear_failed',
  })
  expect(result.message).toContain('Failed to clear history')
  expect(result.message).toContain('Check local data health')
})

it('adds actionable import guidance when workspace import fails', async () => {
  const state = reactive(createInitialAppShellState())
  state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
  state.workspace.activeId = 'workspace-1'

  const store = createAppShellStore(state)
  const runtime = {
    importWorkspace: vi.fn(async () => ({
      ok: false,
      error: {
        code: 'IMPORT_CONFLICT_FAILED',
        message: 'workspace import conflicted with existing resources',
      },
    })),
  } as const

  const services = createAppShellServices({ runtime: runtime as never, store })
  const result = await services.importWorkspace({ packageJson: '{}', strategy: 'rename' })

  expect(result).toMatchObject({
    ok: false,
    code: 'workspace.import_failed',
  })
  expect(result.message).toContain('workspace import conflicted with existing resources')
  expect(result.message).toContain('selected conflict strategy')
})
