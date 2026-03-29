import { describe, expect, it } from 'vitest'

import {
  cloneResponse,
  cloneTab,
  createPresetFromTab,
  createRequestTabFromHistorySnapshot,
  createRequestTabFromPreset,
  createResponseStateFromHistoryItem,
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

  it('retains canonical draft identity fields when cloning tabs for session persistence', () => {
    const tab: RequestTabState = {
      id: 'tab-detached',
      requestId: 'request-orders',
      origin: {
        kind: 'detached',
        requestId: 'request-orders',
      },
      persistenceState: 'unbound',
      executionState: 'success',
      name: 'Detached Orders',
      description: 'detached draft',
      tags: ['orders'],
      collectionName: 'Scratch Pad',
      method: 'POST',
      url: 'https://example.com/orders',
      params: [],
      headers: [],
      body: 'ZmFrZS1ieXRlcw==',
      bodyType: 'binary',
      binaryFileName: 'orders.bin',
      binaryMimeType: 'application/octet-stream',
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
      response: {
        responseBody: '{"ok":true}',
        status: 200,
        statusText: 'OK',
        time: '12 ms',
        size: '128 B',
        headers: [],
        contentType: 'application/json',
        requestMethod: 'POST',
        requestUrl: 'https://example.com/orders',
        testResults: [],
        state: 'success',
        stale: false,
        executionSource: 'live',
      },
      isSending: false,
      isDirty: true,
    }

    const cloned = cloneTab(tab)

    expect(cloned.origin).toEqual({
      kind: 'detached',
      requestId: 'request-orders',
    })
    expect(cloned.persistenceState).toBe('unbound')
    expect(cloned.executionState).toBe('success')
    expect(cloned.binaryFileName).toBe('orders.bin')
    expect(cloned.binaryMimeType).toBe('application/octet-stream')
  })
})
