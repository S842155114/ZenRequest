import { describe, expect, it } from 'vitest'
import type { HistoryItem, RequestCollection } from '@/types/request'
import { buildHistoryReplayDraft } from './history-replay'

describe('history-replay domain', () => {
  it('builds a replay draft from a history snapshot', () => {
    const item: HistoryItem = {
      id: 'history-orders-1',
      name: 'Orders Lookup',
      method: 'POST',
      time: '20 ms',
      status: 201,
      url: 'https://example.com/orders',
      statusText: 'Created',
      elapsedMs: 20,
      sizeBytes: 128,
      contentType: 'application/json',
      truncated: false,
      responseHeaders: [{ key: 'content-type', value: 'application/json' }],
      responsePreview: '{"ok":true}',
      requestSnapshot: {
        tabId: 'tab-history-1',
        requestId: 'request-orders',
        name: 'Orders Snapshot',
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
          apiKeyKey: 'X-API-Key',
          apiKeyValue: '',
          apiKeyPlacement: 'header',
        },
        tests: [],
      },
    }

    const tab = buildHistoryReplayDraft({
      item,
      collections: [],
      recoveredDescription: 'Recovered at 20 ms',
      historyTag: 'history',
    })

    expect(tab.origin).toEqual({
      kind: 'replay',
      requestId: 'request-orders',
      historyItemId: 'history-orders-1',
    })
    expect(tab.name).toBe('Orders Snapshot')
    expect(tab.description).toBe('Recovered from history')
    expect(tab.response.status).toBe(201)
    expect(tab.executionState).toBe('success')
  })

  it('falls back to the saved request when the history snapshot is missing', () => {
    const collections: RequestCollection[] = [
      {
        id: 'collection-orders',
        name: 'Orders',
        expanded: true,
        requests: [
          {
            id: 'request-orders',
            name: 'Orders Request',
            description: 'Saved request',
            tags: ['orders'],
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
              apiKeyKey: 'X-API-Key',
              apiKeyValue: '',
              apiKeyPlacement: 'header',
            },
            tests: [],
          },
        ],
      },
    ]

    const item: HistoryItem = {
      id: 'history-orders-2',
      requestId: 'request-orders',
      name: 'Orders Request',
      method: 'GET',
      time: '10 ms',
      status: 200,
      url: 'https://example.com/orders',
      responsePreview: '{"ok":true}',
    }

    const tab = buildHistoryReplayDraft({
      item,
      collections,
      recoveredDescription: 'Recovered at 10 ms',
      historyTag: 'history',
    })

    expect(tab.name).toBe('Orders Request')
    expect(tab.description).toBe('Saved request')
    expect(tab.tags).toEqual(['orders'])
    expect(tab.origin?.historyItemId).toBe('history-orders-2')
    expect(tab.persistenceState).toBe('unsaved')
  })
})
