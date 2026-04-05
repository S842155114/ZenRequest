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
  createBootstrapPayload,
  createStoredSnapshot,
  deferred,
  getActiveRequestPanelTab,
  getRequestPanelTabs,
  mountApp,
  ok,
} from './harness'

describe('App workbench shell - history recovery', () => {
  it('restores stored response data when reopening an item from history', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.history = [{
      id: 'history-response-1',
      name: 'Orders Lookup',
      method: 'POST',
      status: 201,
      time: '20 ms',
      url: 'https://example.com/orders',
      requestId: undefined,
      executedAtEpochMs: 1_774_961_200_000,
      statusText: 'Created',
      elapsedMs: 20,
      sizeBytes: 2048,
      contentType: 'application/json',
      truncated: false,
      requestSnapshot: {
        workspaceId: 'workspace-1',
        tabId: 'tab-history-1',
        requestId: undefined,
        name: 'Orders Lookup',
        description: 'Recovered from history',
        tags: ['history'],
        collectionName: 'Scratch Pad',
        method: 'POST',
        url: 'https://example.com/orders',
        params: [],
        headers: [],
        body: { kind: 'json', value: '{"orderId":1}' },
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
      },
      responsePreview: '{"ok":true,"source":"history"}',
      responseHeaders: [{ key: 'content-type', value: 'application/json' }],
    } as unknown as HistoryItem]

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="request-panel-stub"]').text()).toContain('Orders Lookup')
    expect(wrapper.get('[data-testid="response-panel-stub"]').text()).toContain('201 POST https://example.com/orders')
    expect(wrapper.get('[data-testid="response-panel-stub"]').text()).toContain('{"ok":true,"source":"history"}')
    expect(wrapper.get('[data-testid="response-panel-stub"]').text()).toContain('"content-type"')
  })

  it('reopens the same history item into one stable replay draft instead of duplicating tabs', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.collections = [
      {
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
        }],
      },
    ]
    payload.history = [{
      id: 'history-orders-1',
      name: 'Orders Lookup',
      method: 'POST',
      status: 201,
      time: '20 ms',
      url: 'https://example.com/orders',
      requestId: 'request-orders-list',
      executedAtEpochMs: 1_774_961_200_000,
      statusText: 'Created',
      elapsedMs: 20,
      sizeBytes: 2048,
      contentType: 'application/json',
      truncated: false,
      requestSnapshot: {
        workspaceId: 'workspace-1',
        tabId: 'tab-history-1',
        requestId: 'request-orders-list',
        name: 'Orders Lookup',
        description: 'Recovered from history',
        tags: ['history'],
        collectionName: 'Orders',
        method: 'POST',
        url: 'https://example.com/orders',
        params: [],
        headers: [],
        body: { kind: 'json', value: '{"orderId":1}' },
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
      },
      responsePreview: '{"ok":true,"source":"history"}',
      responseHeaders: [{ key: 'content-type', value: 'application/json' }],
    } as unknown as HistoryItem]

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()
    const initialTabCount = getRequestPanelTabs(wrapper).length

    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await nextTick()

    const firstReplay = getActiveRequestPanelTab(wrapper)
    expect(firstReplay?.origin?.kind).toBe('replay')
    expect(firstReplay?.origin?.historyItemId).toBe('history-orders-1')
    expect(getRequestPanelTabs(wrapper)).toHaveLength(initialTabCount + 1)

    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await nextTick()

    expect(getRequestPanelTabs(wrapper)).toHaveLength(initialTabCount + 1)
    expect(getActiveRequestPanelTab(wrapper)?.id).toBe(firstReplay?.id)
  })

  it('adds mcp sends to history with replayable summaries when runtime does not return a history item', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-mcp',
      openTabs: [{
        id: 'tab-mcp',
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
        },
        name: 'MCP Search',
        description: '',
        tags: ['mcp'],
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
        response: {
          requestKind: 'mcp',
          responseBody: '',
          status: 0,
          statusText: '',
          time: '0 ms',
          size: '0 B',
          headers: [],
          contentType: 'application/json',
          requestMethod: 'POST',
          requestUrl: 'https://example.com/mcp',
          testResults: [],
        },
        isSending: false,
        isDirty: false,
      }],
    }

    setRuntimeAdapter(createAdapter(payload, {
      sendMcpRequest: async () => ok({
        requestMethod: 'POST',
        requestUrl: 'https://example.com/mcp',
        status: 200,
        statusText: 'OK',
        elapsedMs: 16,
        sizeBytes: 96,
        contentType: 'application/json',
        responseBody: '{"result":true}',
        headers: [],
        truncated: false,
        executionSource: 'live' as const,
        mcpArtifact: {
          transport: 'http',
          operation: 'tools.call',
          errorCategory: 'protocol',
        },
      }),
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await flushPromises()
    await nextTick()

    const historyItems = wrapper.findComponent(AppSidebarStub).props('historyItems') as HistoryItem[]
    expect(historyItems[0]?.mcpSummary).toEqual({
      operation: 'tools.call',
      transport: 'http',
      errorCategory: 'protocol',
    })
    expect(historyItems[0]?.requestSnapshot?.requestKind).toBe('mcp')

    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await flushPromises()
    await nextTick()

    const replayTab = getActiveRequestPanelTab(wrapper)
    expect(replayTab?.origin?.kind).toBe('replay')
    expect(replayTab?.requestKind).toBe('mcp')
    expect(replayTab?.mcp?.operation.type).toBe('tools.call')
  })


  it('replays initialize, tools.list, and tools.call MCP history snapshots through one workbench flow', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.history = [
      {
        id: 'history-mcp-init',
        name: 'MCP Initialize',
        method: 'POST',
        status: 200,
        time: '12 ms',
        url: 'https://example.com/mcp',
        executedAtEpochMs: 1_774_961_100_000,
        statusText: 'OK',
        elapsedMs: 12,
        sizeBytes: 120,
        contentType: 'application/json',
        truncated: false,
        responsePreview: '{"result":{"protocolVersion":"2025-03-26"}}',
        responseHeaders: [{ key: 'content-type', value: 'application/json' }],
        mcpSummary: {
          operation: 'initialize',
          transport: 'http',
        },
        requestSnapshot: {
          workspaceId: 'workspace-1',
          activeEnvironmentId: 'env-local',
          tabId: 'tab-mcp-init',
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
                apiKeyKey: '',
                apiKeyValue: '',
                apiKeyPlacement: 'header',
              },
            },
            operation: {
              type: 'initialize',
              input: {
                clientName: 'ZenRequest',
                clientVersion: '0.1.0',
              },
            },
          },
          name: 'MCP Initialize',
          description: '',
          tags: ['mcp'],
          collectionName: 'Scratch Pad',
          method: 'POST',
          url: 'https://example.com/mcp',
          params: [],
          headers: [],
          body: { kind: 'json', value: '' },
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
        },
      },
      {
        id: 'history-mcp-tools-list',
        name: 'MCP Tools List',
        method: 'POST',
        status: 200,
        time: '15 ms',
        url: 'https://example.com/mcp',
        executedAtEpochMs: 1_774_961_200_000,
        statusText: 'OK',
        elapsedMs: 15,
        sizeBytes: 256,
        contentType: 'application/json',
        truncated: false,
        responsePreview: '{"result":{"tools":[{"name":"search"}]}}',
        responseHeaders: [{ key: 'content-type', value: 'application/json' }],
        mcpSummary: {
          operation: 'tools.list',
          transport: 'http',
        },
        requestSnapshot: {
          workspaceId: 'workspace-1',
          activeEnvironmentId: 'env-local',
          tabId: 'tab-mcp-tools-list',
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
                apiKeyKey: '',
                apiKeyValue: '',
                apiKeyPlacement: 'header',
              },
            },
            operation: {
              type: 'tools.list',
              input: {
                cursor: '',
              },
            },
          },
          name: 'MCP Tools List',
          description: '',
          tags: ['mcp'],
          collectionName: 'Scratch Pad',
          method: 'POST',
          url: 'https://example.com/mcp',
          params: [],
          headers: [],
          body: { kind: 'json', value: '' },
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
        },
      },
      {
        id: 'history-mcp-tools-call',
        name: 'MCP Search',
        method: 'POST',
        status: 200,
        time: '18 ms',
        url: 'https://example.com/mcp',
        executedAtEpochMs: 1_774_961_300_000,
        statusText: 'OK',
        elapsedMs: 18,
        sizeBytes: 300,
        contentType: 'application/json',
        truncated: false,
        responsePreview: '{"result":{"content":[{"type":"text","text":"zen"}]}}',
        responseHeaders: [{ key: 'content-type', value: 'application/json' }],
        mcpSummary: {
          operation: 'tools.call',
          transport: 'http',
        },
        requestSnapshot: {
          workspaceId: 'workspace-1',
          activeEnvironmentId: 'env-local',
          tabId: 'tab-mcp-tools-call',
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
          },
          name: 'MCP Search',
          description: '',
          tags: ['mcp'],
          collectionName: 'Scratch Pad',
          method: 'POST',
          url: 'https://example.com/mcp',
          params: [],
          headers: [],
          body: { kind: 'json', value: '' },
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
        },
      },
    ] as unknown as HistoryItem[]

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()
    const sidebar = wrapper.findComponent(AppSidebarStub)
    const items = sidebar.props('historyItems') as HistoryItem[]

    expect(items.map((item) => item.mcpSummary?.operation)).toEqual([
      'initialize',
      'tools.list',
      'tools.call',
    ])

    sidebar.vm.$emit('select-history', items[0])
    await flushPromises()
    await nextTick()
    expect(getActiveRequestPanelTab(wrapper)?.requestKind).toBe('mcp')
    expect(getActiveRequestPanelTab(wrapper)?.mcp?.operation.type).toBe('initialize')
    expect(wrapper.get('[data-testid="response-panel-stub"]').text()).toContain('protocolVersion')

    sidebar.vm.$emit('select-history', items[1])
    await flushPromises()
    await nextTick()
    expect(getActiveRequestPanelTab(wrapper)?.mcp?.operation.type).toBe('tools.list')
    expect(wrapper.get('[data-testid="response-panel-stub"]').text()).toContain('search')

    sidebar.vm.$emit('select-history', items[2])
    await flushPromises()
    await nextTick()
    expect(getActiveRequestPanelTab(wrapper)?.mcp?.operation.type).toBe('tools.call')
    expect(getActiveRequestPanelTab(wrapper)?.mcp?.operation.input.toolName).toBe('search')
    expect(wrapper.get('[data-testid="response-panel-stub"]').text()).toContain('zen')
  })

  it('restores runtime-owned history snapshots into canonical replay drafts after send', async () => {
    window.innerWidth = 1440

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      sendRequest: async () => ok({
        requestMethod: 'POST',
        requestUrl: 'https://example.com/upload',
        status: 201,
        statusText: 'Created',
        elapsedMs: 14,
        sizeBytes: 48,
        contentType: 'application/json',
        responseBody: '{"ok":true}',
        headers: [],
        truncated: false,
        historyItem: {
          id: 'history-upload-1',
          name: 'Imported Upload',
          method: 'POST',
          time: '10:00:00',
          status: 201,
          url: 'https://example.com/upload',
          statusText: 'Created',
          elapsedMs: 14,
          sizeBytes: 48,
          contentType: 'application/json',
          truncated: false,
          responseHeaders: [],
          responsePreview: '{"ok":true}',
          executionSource: 'live' as const,
          requestSnapshot: {
            workspaceId: 'workspace-1',
            activeEnvironmentId: 'env-local',
            tabId: 'tab-upload-1',
            name: 'Imported Upload',
            description: '',
            tags: ['curl'],
            collectionName: 'Scratch Pad',
            method: 'POST',
            url: 'https://example.com/upload',
            params: [],
            headers: [],
            body: {
              kind: 'formData' as const,
              fields: [
                { key: 'file', value: '', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
              ],
            },
            bodyType: 'formdata' as const,
            auth: {
              type: 'none',
              bearerToken: '',
              username: '',
              password: '',
              apiKeyKey: '',
              apiKeyValue: '',
              apiKeyPlacement: 'header' as const,
            },
            tests: [],
          },
        },
      }),
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await flushPromises()
    await nextTick()

    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await flushPromises()
    await nextTick()

    const replayTab = getActiveRequestPanelTab(wrapper)
    expect(replayTab?.origin?.kind).toBe('replay')
    expect(replayTab?.origin?.historyItemId).toBe('history-upload-1')
    expect(replayTab?.bodyType).toBe('formdata')
    expect(replayTab?.formDataFields).toEqual([
      { key: 'file', value: '', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
    ])
  })

})
