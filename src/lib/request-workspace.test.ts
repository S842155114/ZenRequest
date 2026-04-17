import { describe, expect, it } from 'vitest'

import {
  cloneResponse,
  cloneTab,
  createHistoryEntry,
  createPresetFromTab,
  createRequestTabFromHistorySnapshot,
  createRequestTabFromPreset,
  createResponseStateFromHistoryItem,
  readWorkspaceSnapshotResult,
} from './request-workspace'
import type { HistoryItem, RequestPreset, RequestTabState } from '@/types/request'

describe('request workspace mock state helpers', () => {
  it('preserves request-local mock templates when opening a saved request', () => {
    const preset: RequestPreset = {
      id: 'request-orders',
      name: 'Orders',
      method: 'GET',
      url: 'https://example.com/orders',
      body: '',
      bodyType: 'json',
      headers: [],
      params: [],
      mock: {
        enabled: true,
        status: 202,
        statusText: 'Accepted',
        contentType: 'application/json',
        body: '{"ok":true}',
        headers: [
          { key: 'X-Mock', value: 'enabled', description: '', enabled: true },
        ],
      },
    }

    const tab = createRequestTabFromPreset(preset)

    expect(tab.mock).toEqual(preset.mock)
    expect(tab.response.executionSource).toBe('live')
  })

  it('restores mock-capable history snapshots into replay drafts', () => {
    const tab = createRequestTabFromHistorySnapshot({
      tabId: 'tab-history-1',
      requestId: 'request-orders',
      name: 'Orders',
      description: '',
      tags: [],
      collectionName: 'Orders',
      method: 'GET',
      url: 'https://example.com/orders',
      params: [],
      headers: [],
      body: { kind: 'json', value: '{"ok":true}' },
      bodyType: 'json',
      auth: {
        type: 'none',
        bearerToken: '',
        username: '',
        password: '',
        apiKeyKey: 'X-API-Key',
        apiKeyValue: '',
        apiKeyPlacement: 'header',
      },
      tests: [],
      mock: {
        enabled: true,
        status: 200,
        statusText: 'OK',
        contentType: 'application/json',
        body: '{"source":"mock"}',
        headers: [],
      },
    }, 'Recovered Orders', 'history-orders-1')

    expect(tab.origin?.kind).toBe('replay')
    expect(tab.mock?.enabled).toBe(true)
    expect(tab.mock?.body).toContain('"source":"mock"')
  })



  it('preserves mcp history summaries on creation', () => {
    const item = createHistoryEntry({
      requestId: 'request-mcp-search',
      name: 'Search tool',
      method: 'POST',
      url: 'https://example.com/mcp',
      status: 200,
      mcpSummary: {
        operation: 'tools.call',
        transport: 'http',
        errorCategory: 'tool_execution',
      },
    })

    expect(item.mcpSummary).toEqual({
      operation: 'tools.call',
      transport: 'http',
      errorCategory: 'tool_execution',
    })
    expect(item.executionSource).toBe('live')
  })

  it('preserves history snapshots when creating local entries', () => {
    const item = createHistoryEntry({
      requestId: 'request-mcp-search',
      name: 'Search tool',
      method: 'POST',
      url: 'https://example.com/mcp',
      status: 200,
      requestSnapshot: {
        tabId: 'tab-mcp',
        requestId: 'request-mcp-search',
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
        name: 'Search tool',
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
      },
    })

    expect(item.requestSnapshot?.requestKind).toBe('mcp')
    expect(item.requestSnapshot?.mcp?.operation.type).toBe('tools.call')
  })

  it('clones sampling mcp definitions without dropping operation input', () => {
    const preset: RequestPreset = {
      id: 'request-mcp-sampling',
      name: 'Sampling tool',
      method: 'POST',
      url: 'https://example.com/mcp',
      body: '',
      bodyType: 'json',
      headers: [],
      params: [],
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
          type: 'sampling',
          input: {
            prompt: 'Summarize this',
            systemPrompt: 'Be concise',
            maxTokens: 64,
            temperature: 0.1,
            metadata: { source: 'test' },
          },
        },
      },
    }

    const tab = createRequestTabFromPreset(preset)
    expect(tab.mcp?.operation.type).toBe('sampling')
    if (tab.mcp?.operation.type === 'sampling') {
      expect(tab.mcp.operation.input.prompt).toBe('Summarize this')
      expect(tab.mcp.operation.input.metadata).toEqual({ source: 'test' })
    }
  })

  it('carries explicit execution provenance through response helpers', () => {
    const response = cloneResponse({
      status: 201,
      statusText: 'Created',
      executionSource: 'mock',
      responseBody: '{"ok":true}',
    })

    expect(response.executionSource).toBe('mock')

    const historyItem: HistoryItem = {
      id: 'history-orders-1',
      name: 'Orders',
      method: 'GET',
      time: '10:00:00',
      status: 201,
      url: 'https://example.com/orders',
      statusText: 'Created',
      elapsedMs: 4,
      sizeBytes: 32,
      contentType: 'application/json',
      truncated: false,
      responseHeaders: [],
      responsePreview: '{"ok":true}',
      executionSource: 'mock',
    }

    const historyResponse = createResponseStateFromHistoryItem(
      historyItem,
      'GET',
      'https://example.com/orders',
    )

    expect(historyResponse.executionSource).toBe('mock')
  })

  it('prefers canonical body definitions when opening and saving editable requests', () => {
    const preset: RequestPreset = {
      id: 'request-formdata',
      name: 'Upload',
      method: 'POST',
      url: 'https://example.com/upload',
      body: 'legacy=ignored',
      bodyType: 'json',
      bodyDefinition: {
        kind: 'formData',
        fields: [
          { key: 'file', value: 'payload', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
        ],
      },
      headers: [],
      params: [],
    }

    const tab = createRequestTabFromPreset(preset)

    expect(tab.bodyType).toBe('formdata')
    expect(tab.formDataFields).toEqual([
      { key: 'file', value: 'payload', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
    ])

    const roundtripPreset = createPresetFromTab(tab)
    expect(roundtripPreset.bodyDefinition).toEqual({
      kind: 'formData',
      fields: [
        { key: 'file', value: 'payload', enabled: true, fileName: 'demo.txt', mimeType: 'text/plain' },
      ],
    })
  })

  it('preserves execution options when opening, cloning, saving, and restoring requests', () => {
    const executionOptions = {
      timeoutMs: 15000,
      redirectPolicy: 'manual' as const,
      proxy: { mode: 'custom' as const, url: 'http://127.0.0.1:8080' },
      verifySsl: false,
    }

    const preset: RequestPreset = {
      id: 'request-orders',
      name: 'Orders',
      method: 'GET',
      url: 'https://example.com/orders',
      body: '',
      bodyType: 'json',
      headers: [],
      params: [],
      executionOptions,
    }

    const tab = createRequestTabFromPreset(preset)
    expect(tab.executionOptions).toEqual(executionOptions)

    const cloned = cloneTab(tab)
    expect(cloned.executionOptions).toEqual(executionOptions)
    expect(cloned.executionOptions).not.toBe(tab.executionOptions)
    if (
      cloned.executionOptions?.proxy.mode === 'custom'
      && tab.executionOptions?.proxy.mode === 'custom'
    ) {
      expect(cloned.executionOptions.proxy).not.toBe(tab.executionOptions.proxy)
    }

    const roundtripPreset = createPresetFromTab(tab)
    expect(roundtripPreset.executionOptions).toEqual(executionOptions)

    const historyTab = createRequestTabFromHistorySnapshot({
      tabId: 'tab-history-execution',
      requestId: 'request-orders',
      name: 'Orders',
      description: '',
      tags: [],
      collectionName: 'Orders',
      method: 'GET',
      url: 'https://example.com/orders',
      params: [],
      headers: [],
      body: { kind: 'json', value: '{}' },
      bodyType: 'json',
      auth: {
        type: 'none',
        bearerToken: '',
        username: '',
        password: '',
        apiKeyKey: 'X-API-Key',
        apiKeyValue: '',
        apiKeyPlacement: 'header',
      },
      tests: [],
      executionOptions,
    }, 'Recovered Orders', 'history-orders-execution')

    expect(historyTab.executionOptions).toEqual(executionOptions)
  })

  it('defaults legacy requests to http kind across preset and tab helpers', () => {
    const preset: RequestPreset = {
      id: 'request-legacy-http',
      name: 'Legacy HTTP',
      method: 'GET',
      url: 'https://example.com/legacy',
      headers: [],
      params: [],
    }

    const tab = createRequestTabFromPreset(preset)
    expect(tab.requestKind).toBe('http')
    expect(tab.response.requestKind).toBe('http')

    const cloned = cloneTab(tab)
    expect(cloned.requestKind).toBe('http')

    const roundtripPreset = createPresetFromTab(tab)
    expect(roundtripPreset.requestKind).toBe('http')
  })

  it('preserves mcp request definitions across preset and tab helpers', () => {
    const preset: RequestPreset = {
      id: 'request-mcp-tools-list',
      requestKind: 'mcp',
      mcp: {
        connection: {
          transport: 'http',
          baseUrl: 'https://example.com/mcp',
          headers: [{ key: 'Accept', value: 'application/json', description: '', enabled: true }],
          auth: {
            type: 'bearer',
            bearerToken: 'token',
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
            arguments: { query: 'orders' },
            schema: {
              name: 'search',
              description: 'Search orders',
              inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
            },
          },
        },
      },
      name: 'MCP Search',
      method: 'POST',
      url: 'https://example.com/mcp',
      headers: [],
      params: [],
    }

    const tab = createRequestTabFromPreset(preset)
    expect(tab.requestKind).toBe('mcp')
    expect(tab.mcp?.operation.type).toBe('tools.call')
    expect(tab.response.requestKind).toBe('mcp')

    const cloned = cloneTab(tab)
    expect(cloned.mcp).toEqual(tab.mcp)
    expect(cloned.mcp).not.toBe(tab.mcp)

    const roundtripPreset = createPresetFromTab(tab)
    expect(roundtripPreset.requestKind).toBe('mcp')
    expect(roundtripPreset.mcp).toEqual(tab.mcp)
  })

  it('returns a structured parse error for invalid snapshot json', () => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => '{invalid-json',
      },
      configurable: true,
    })

    expect(readWorkspaceSnapshotResult()).toEqual({
      ok: false,
      reason: 'parse_failed',
      message: 'Saved browser snapshot could not be parsed and was ignored. ZenRequest will restore from more reliable persisted state when available.',
      degraded: true,
      userVisible: true,
      ignoredSource: 'browser_snapshot',
    })
  })

  it('returns a structured invalid result for incomplete snapshot content', () => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => JSON.stringify({ activeTabId: 'tab-1', openTabs: [] }),
      },
      configurable: true,
    })

    expect(readWorkspaceSnapshotResult()).toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Saved browser snapshot was ignored because it is invalid. ZenRequest will restore from more reliable persisted state when available.',
      degraded: true,
      userVisible: true,
      ignoredSource: 'browser_snapshot',
    })
  })

  it('returns missing when no snapshot exists', () => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
      },
      configurable: true,
    })

    expect(readWorkspaceSnapshotResult()).toEqual({
      ok: false,
      reason: 'missing',
      message: 'No saved workspace snapshot found',
      degraded: false,
      userVisible: false,
    })
  })
})
