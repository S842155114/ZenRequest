import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setRuntimeAdapter } from '@/lib/tauri-client'
import type { ApiEnvelope, AppBootstrapPayload, RuntimeAdapter, SendRequestPayloadDto } from '@/lib/tauri-client'
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

describe('App workbench shell - request execution and persistence', () => {
  it('saves the tab that triggered save even when it is not the active tab', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.collections = [
      {
        id: 'collection-active',
        name: 'Active',
        expanded: true,
        requests: [{
          id: 'request-active',
          name: 'Active Request',
          description: '',
          tags: [],
          collectionId: 'collection-active',
          collectionName: 'Active',
          method: 'GET',
          url: 'https://example.com/active',
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
      {
        id: 'collection-background',
        name: 'Background',
        expanded: true,
        requests: [{
          id: 'request-background',
          name: 'Background Request',
          description: '',
          tags: [],
          collectionId: 'collection-background',
          collectionName: 'Background',
          method: 'POST',
          url: 'https://example.com/background',
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
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-active',
      openTabs: [
        {
          id: 'tab-active',
          requestId: 'request-active',
          collectionId: 'collection-active',
          name: 'Active Request',
          description: '',
          tags: [],
          collectionName: 'Active',
          method: 'GET',
          url: 'https://example.com/active',
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
            responseBody: '{}',
            status: 200,
            statusText: 'OK',
            time: '10 ms',
            size: '1 KB',
            headers: [],
            contentType: 'application/json',
            requestMethod: 'GET',
            requestUrl: 'https://example.com/active',
            testResults: [],
          },
          isSending: false,
          isDirty: false,
        },
        {
          id: 'tab-background',
          requestId: 'request-background',
          collectionId: 'collection-background',
          name: 'Background Request',
          description: '',
          tags: [],
          collectionName: 'Background',
          method: 'POST',
          url: 'https://example.com/background',
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
            responseBody: '{}',
            status: 200,
            statusText: 'OK',
            time: '10 ms',
            size: '1 KB',
            headers: [],
            contentType: 'application/json',
            requestMethod: 'POST',
            requestUrl: 'https://example.com/background',
            testResults: [],
          },
          isSending: false,
          isDirty: true,
        },
      ],
    }

    const saveRequest = vi.fn<RuntimeAdapter['saveRequest']>()
      .mockImplementation(async (_workspaceId, _collectionId, request) => ok(request))

    setRuntimeAdapter(createAdapter(payload, { saveRequest }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-save-tab-background"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(saveRequest).toHaveBeenCalledTimes(1)
    expect(saveRequest.mock.calls[0]?.[1]).toBe('collection-background')
    expect(saveRequest.mock.calls[0]?.[2].id).toBe('request-background')
    expect(saveRequest.mock.calls[0]?.[2].name).toBe('Background Request')
  })

  it('keeps unsaved state after a successful send until the tab is explicitly saved', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-orders',
      openTabs: [{
        id: 'tab-orders',
        requestId: 'request-orders-list',
        name: 'Orders Lookup',
        description: '',
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
        response: {
          responseBody: '{"ok":false}',
          status: 500,
          statusText: 'Error',
          time: '20 ms',
          size: '2 KB',
          headers: [],
          contentType: 'application/json',
          requestMethod: 'POST',
          requestUrl: 'https://example.com/orders',
          testResults: [],
        },
        isSending: false,
        isDirty: true,
      }],
    }

    setRuntimeAdapter(createAdapter(payload, {
      sendRequest: async () => ok({
        requestMethod: 'POST',
        requestUrl: 'https://example.com/orders',
        status: 200,
        statusText: 'OK',
        elapsedMs: 18,
        sizeBytes: 64,
        contentType: 'application/json',
        responseBody: '{"ok":true}',
        headers: [],
        truncated: false,
      }),
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(getActiveRequestPanelTab(wrapper)?.isDirty).toBe(true)
  })

  it('creates a request-local mock template from the active completed response', async () => {
    window.innerWidth = 1440

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="response-panel-create-mock"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(getActiveRequestPanelTab(wrapper)?.mock).toMatchObject({
      enabled: false,
      status: 201,
      statusText: 'Created',
      contentType: 'application/json',
      body: '{"ok":true}',
      headers: [],
    })
  })

  it('forwards request-local mock templates through send and surfaces mock provenance', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.session!.openTabs[1] = {
      ...payload.session!.openTabs[1],
      mock: {
        enabled: true,
        status: 202,
        statusText: 'Accepted',
        contentType: 'application/json',
        body: '{"source":"mock"}',
        headers: [],
      },
    }

    const sendRequest = vi.fn(async (_payload: SendRequestPayloadDto) => ok({
      requestMethod: 'POST',
      requestUrl: 'https://example.com/orders',
      status: 202,
      statusText: 'Accepted',
      elapsedMs: 1,
      sizeBytes: 20,
      contentType: 'application/json',
      responseBody: '{"source":"mock"}',
      headers: [],
      truncated: false,
      executionSource: 'mock' as const,
      historyItem: {
        id: 'history-mock-1',
        name: 'Orders Lookup',
        method: 'POST',
        time: '10:00:00',
        status: 202,
        url: 'https://example.com/orders',
        statusText: 'Accepted',
        elapsedMs: 1,
        sizeBytes: 20,
        contentType: 'application/json',
        truncated: false,
        responseHeaders: [],
        responsePreview: '{"source":"mock"}',
        executionSource: 'mock' as const,
      },
    }))

    setRuntimeAdapter(createAdapter(payload, { sendRequest }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(sendRequest).toHaveBeenCalledTimes(1)
    expect(sendRequest.mock.calls[0]?.[0].mock?.enabled).toBe(true)
    expect(wrapper.get('[data-testid="response-panel-stub"]').attributes('data-execution-source')).toBe('mock')
    expect((wrapper.findComponent(AppSidebarStub).props('historyItems') as HistoryItem[])[0]?.executionSource).toBe('mock')
  })

  it('forwards the active environment to the runtime and uses runtime-owned assertion results', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.environments = [{
      id: 'env-local',
      name: 'Local',
      variables: [
        { key: 'baseUrl', value: 'https://runtime.example', enabled: true },
        { key: 'token', value: 'runtime-token', enabled: true },
      ],
    }]
    payload.session!.openTabs[1] = {
      ...payload.session!.openTabs[1],
      url: '{{baseUrl}}/orders',
      headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
      tests: [{
        id: 'test-status',
        name: 'Status is 200',
        source: 'status',
        operator: 'equals',
        expected: '200',
      }],
    }

    const sendRequest = vi.fn(async (_payload: SendRequestPayloadDto) => ok({
      requestMethod: 'POST',
      requestUrl: 'https://runtime.example/orders',
      status: 200,
      statusText: 'OK',
      elapsedMs: 12,
      sizeBytes: 32,
      contentType: 'application/json',
      responseBody: '{"ok":true}',
      headers: [],
      truncated: false,
      assertionResults: {
        passed: false,
        results: [{
          id: 'test-status',
          name: 'Status is 200',
          passed: false,
          message: 'Runtime assertion failed',
        }],
      },
      executionArtifact: {
        executionSource: 'live' as const,
        executedAtEpochMs: 123,
        compiledRequest: {
          protocolKey: 'http',
          method: 'POST',
          url: 'https://runtime.example/orders',
          params: [],
          headers: [{ key: 'Authorization', value: 'Bearer runtime-token', enabled: true }],
          body: {
            kind: 'json' as const,
            value: '',
          },
          auth: {
            type: 'none' as const,
            bearerToken: '',
            username: '',
            password: '',
            apiKeyKey: '',
            apiKeyValue: '',
            apiKeyPlacement: 'header' as const,
          },
          tests: [{
            id: 'test-status',
            name: 'Status is 200',
            source: 'status' as const,
            operator: 'equals' as const,
            expected: '200',
          }],
        },
        normalizedResponse: {
          status: 200,
          statusText: 'OK',
          elapsedMs: 12,
          sizeBytes: 32,
          contentType: 'application/json',
          body: '{"ok":true}',
          headers: [],
          truncated: false,
        },
        assertionResults: {
          passed: false,
          results: [{
            id: 'test-status',
            name: 'Status is 200',
            passed: false,
            message: 'Runtime assertion failed',
          }],
        },
      },
    }))

    setRuntimeAdapter(createAdapter(payload, { sendRequest }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(sendRequest).toHaveBeenCalledTimes(1)
    expect(sendRequest.mock.calls[0]?.[0].activeEnvironmentId).toBe('env-local')
    expect(wrapper.findComponent(ResponsePanelStub).props('testResults')).toEqual([{
      id: 'test-status',
      name: 'Status is 200',
      passed: false,
      message: 'Runtime assertion failed',
    }])
  })

})
