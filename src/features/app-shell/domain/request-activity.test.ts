import { describe, expect, it } from 'vitest'
import type { RequestTabState } from '@/types/request'
import { createWorkbenchActivityProjection } from './request-activity'

const createTab = (overrides: Partial<RequestTabState> = {}): RequestTabState => ({
  id: overrides.id ?? 'tab-orders',
  requestId: overrides.requestId ?? 'request-orders',
  origin: overrides.origin ?? { kind: 'resource', requestId: overrides.requestId ?? 'request-orders' },
  persistenceState: overrides.persistenceState ?? 'saved',
  executionState: overrides.executionState,
  name: overrides.name ?? 'Orders',
  description: overrides.description ?? '',
  tags: overrides.tags ?? [],
  collectionName: overrides.collectionName ?? 'Orders',
  collectionId: overrides.collectionId,
  method: overrides.method ?? 'GET',
  url: overrides.url ?? 'https://example.com/orders',
  params: overrides.params ?? [],
  headers: overrides.headers ?? [],
  body: overrides.body ?? '',
  bodyType: overrides.bodyType ?? 'json',
  auth: overrides.auth ?? {
    type: 'none',
    bearerToken: '',
    username: '',
    password: '',
    apiKeyKey: 'X-API-Key',
    apiKeyValue: '',
    apiKeyPlacement: 'header',
  },
  tests: overrides.tests ?? [],
  executionOptions: overrides.executionOptions,
  response: overrides.response ?? {
    responseBody: '{}',
    status: 200,
    statusText: 'OK',
    time: '10 ms',
    size: '1 KB',
    headers: [],
    contentType: 'application/json',
    requestMethod: 'GET',
    requestUrl: 'https://example.com/orders',
    testResults: [],
  },
  isSending: overrides.isSending ?? false,
  isDirty: overrides.isDirty ?? false,
})

describe('request-activity domain', () => {
  it('aggregates dirty, running, recovered, and active signals', () => {
    const projection = createWorkbenchActivityProjection(
      [
        createTab({ id: 'tab-active', isDirty: true, isSending: true }),
        createTab({
          id: 'tab-replay',
          requestId: 'request-orders',
          origin: { kind: 'replay', requestId: 'request-orders', historyItemId: 'history-orders-1' },
          executionState: 'success',
        }),
      ],
      'tab-active',
      (status) => status >= 400 ? 'http-error' : 'success',
    )

    expect(projection.summary).toEqual({
      open: 2,
      dirty: 1,
      running: 1,
      recovered: 1,
    })
    expect(projection.tabs['tab-active']?.active).toBe(true)
    expect(projection.requests['request-orders']?.running).toBe(true)
    expect(projection.history['history-orders-1']?.recovered).toBe(true)
  })
})
