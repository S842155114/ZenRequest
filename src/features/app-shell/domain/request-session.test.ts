import { describe, expect, it } from 'vitest'
import type { RequestTabState } from '@/types/request'
import {
  cloneTabOrigin,
  resolveTabExecutionState,
  resolveTabOrigin,
  resolveTabOriginKind,
  resolveTabPersistenceState,
} from './request-session'

describe('request-session domain', () => {
  it('derives replay origin metadata from a tab shape', () => {
    const origin = resolveTabOrigin({
      requestId: 'request-orders',
      origin: {
        kind: 'replay',
        requestId: 'request-orders',
        historyItemId: 'history-orders-1',
      },
    })

    expect(resolveTabOriginKind({ origin })).toBe('replay')
    expect(cloneTabOrigin(origin)).toEqual({
      kind: 'replay',
      requestId: 'request-orders',
      historyItemId: 'history-orders-1',
    })
  })

  it('marks detached tabs as unbound and dirty resource tabs as unsaved', () => {
    expect(resolveTabPersistenceState({}, { kind: 'detached' })).toBe('unbound')
    expect(resolveTabPersistenceState({ isDirty: true }, { kind: 'resource', requestId: 'request-orders' })).toBe('unsaved')
    expect(resolveTabPersistenceState({ isDirty: false }, { kind: 'resource', requestId: 'request-orders' })).toBe('saved')
  })

  it('falls back to response state when execution state is not set', () => {
    const tab: Partial<RequestTabState> = {
      response: {
        responseBody: '{}',
        status: 503,
        statusText: 'Service Unavailable',
        time: '10 ms',
        size: '1 KB',
        headers: [],
        contentType: 'application/json',
        requestMethod: 'GET',
        requestUrl: 'https://example.com/orders',
        testResults: [],
        state: 'transport-error',
      },
    }

    const executionState = resolveTabExecutionState(tab, (status) => status >= 400 ? 'http-error' : 'success')

    expect(executionState).toBe('transport-error')
  })
})
