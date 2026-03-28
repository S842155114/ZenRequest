import { describe, expect, it } from 'vitest'

import {
  cloneResponse,
  createRequestTabFromHistorySnapshot,
  createRequestTabFromPreset,
  createResponseStateFromHistoryItem,
} from './request-workspace'
import type { HistoryItem, RequestPreset } from '@/types/request'

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
})
