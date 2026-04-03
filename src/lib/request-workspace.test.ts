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
})
