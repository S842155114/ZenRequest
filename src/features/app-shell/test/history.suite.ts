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
