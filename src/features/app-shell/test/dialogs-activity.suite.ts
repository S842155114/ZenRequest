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

describe('App workbench shell - dialogs and activity', () => {
  it('reopens the save dialog with the last saved request description', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.collections = [{
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
    }]
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-orders',
      openTabs: [{
        id: 'tab-orders',
        requestId: 'request-orders-list',
        origin: {
          kind: 'resource',
          requestId: 'request-orders-list',
        },
        persistenceState: 'saved',
        executionState: 'idle',
        collectionId: 'collection-orders',
        name: 'Orders Lookup',
        description: '',
        tags: [],
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
          responseBody: '{}',
          status: 200,
          statusText: 'OK',
          time: '10 ms',
          size: '1 KB',
          headers: [],
          contentType: 'application/json',
          requestMethod: 'POST',
          requestUrl: 'https://example.com/orders',
          testResults: [],
        },
        isSending: false,
        isDirty: false,
      }],
    }

    setRuntimeAdapter(createAdapter(payload, {
      saveRequest: async (_workspaceId, _collectionId, request) => ok(request),
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-save-tab-orders"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-details-value')).toBe('')

    await wrapper.get('[data-testid="dialog-details-input"]').setValue('Saved request description')
    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await flushPromises()
    await nextTick()

    await wrapper.get('[data-testid="request-panel-save-tab-orders"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-details-value')).toBe('Saved request description')
  })

  it('prompts before closing a dirty tab instead of discarding it immediately', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-dirty',
      openTabs: [
        {
          id: 'tab-dirty',
          requestId: 'request-dirty',
          origin: {
            kind: 'resource',
            requestId: 'request-dirty',
          },
          persistenceState: 'unsaved',
          executionState: 'idle',
          collectionId: 'collection-orders',
          name: 'Dirty Request',
          description: 'Unsaved changes',
          tags: [],
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
            responseBody: '{}',
            status: 200,
            statusText: 'OK',
            time: '10 ms',
            size: '1 KB',
            headers: [],
            contentType: 'application/json',
            requestMethod: 'POST',
            requestUrl: 'https://example.com/orders',
            testResults: [],
          },
          isSending: false,
          isDirty: true,
        },
        {
          id: 'tab-clean',
          requestId: 'request-clean',
          origin: {
            kind: 'resource',
            requestId: 'request-clean',
          },
          persistenceState: 'saved',
          executionState: 'success',
          collectionId: 'collection-orders',
          name: 'Clean Request',
          description: '',
          tags: [],
          collectionName: 'Orders',
          method: 'GET',
          url: 'https://example.com/orders/1',
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
            requestUrl: 'https://example.com/orders/1',
            testResults: [],
          },
          isSending: false,
          isDirty: false,
        },
      ],
    }

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-close-tab-dirty"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-open')).toBe('true')
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-confirm-text')).toBe('Save and Close')
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-secondary-action-text')).toBe("Don't Save")
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-variant')).toBe('dirty-close')
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-highlight-label')).toBe('Before Closing')
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-context-badges')).toContain('POST')
    expect(wrapper.get('[data-testid="dialog-stub"]').attributes('data-context-badges')).toContain('Draft')
    expect(getRequestPanelTabs(wrapper).map((tab) => tab.id)).toEqual(['tab-dirty', 'tab-clean'])
  })

  it('can discard a dirty tab from the close confirmation dialog', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-dirty',
      openTabs: [
        {
          id: 'tab-dirty',
          requestId: 'request-dirty',
          origin: {
            kind: 'resource',
            requestId: 'request-dirty',
          },
          persistenceState: 'unsaved',
          executionState: 'idle',
          collectionId: 'collection-orders',
          name: 'Dirty Request',
          description: 'Unsaved changes',
          tags: [],
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
            responseBody: '{}',
            status: 200,
            statusText: 'OK',
            time: '10 ms',
            size: '1 KB',
            headers: [],
            contentType: 'application/json',
            requestMethod: 'POST',
            requestUrl: 'https://example.com/orders',
            testResults: [],
          },
          isSending: false,
          isDirty: true,
        },
        {
          id: 'tab-clean',
          requestId: 'request-clean',
          origin: {
            kind: 'resource',
            requestId: 'request-clean',
          },
          persistenceState: 'saved',
          executionState: 'success',
          collectionId: 'collection-orders',
          name: 'Clean Request',
          description: '',
          tags: [],
          collectionName: 'Orders',
          method: 'GET',
          url: 'https://example.com/orders/1',
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
            requestUrl: 'https://example.com/orders/1',
            testResults: [],
          },
          isSending: false,
          isDirty: false,
        },
      ],
    }

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-close-tab-dirty"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="dialog-secondary-action"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(getRequestPanelTabs(wrapper).map((tab) => tab.id)).toEqual(['tab-clean'])
    expect(wrapper.get('[data-testid="request-panel-stub"]').text()).toContain('Clean Request')
  })

  it('can save a dirty tab from the close confirmation flow before closing it', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.collections = [{
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
      requests: [{
        id: 'request-dirty',
        name: 'Dirty Request',
        description: 'Unsaved changes',
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
    }]
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-dirty',
      openTabs: [
        {
          id: 'tab-dirty',
          requestId: 'request-dirty',
          origin: {
            kind: 'resource',
            requestId: 'request-dirty',
          },
          persistenceState: 'unsaved',
          executionState: 'idle',
          collectionId: 'collection-orders',
          name: 'Dirty Request',
          description: 'Unsaved changes',
          tags: [],
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
            responseBody: '{}',
            status: 200,
            statusText: 'OK',
            time: '10 ms',
            size: '1 KB',
            headers: [],
            contentType: 'application/json',
            requestMethod: 'POST',
            requestUrl: 'https://example.com/orders',
            testResults: [],
          },
          isSending: false,
          isDirty: true,
        },
        {
          id: 'tab-clean',
          requestId: 'request-clean',
          origin: {
            kind: 'resource',
            requestId: 'request-clean',
          },
          persistenceState: 'saved',
          executionState: 'success',
          collectionId: 'collection-orders',
          name: 'Clean Request',
          description: '',
          tags: [],
          collectionName: 'Orders',
          method: 'GET',
          url: 'https://example.com/orders/1',
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
            requestUrl: 'https://example.com/orders/1',
            testResults: [],
          },
          isSending: false,
          isDirty: false,
        },
      ],
    }

    const saveRequest = vi.fn<RuntimeAdapter['saveRequest']>()
      .mockImplementation(async (_workspaceId, _collectionId, request) => ok(request))

    setRuntimeAdapter(createAdapter(payload, { saveRequest }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-close-tab-dirty"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="dialog-submit"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(saveRequest).toHaveBeenCalledTimes(1)
    expect(getRequestPanelTabs(wrapper).map((tab) => tab.id)).toEqual(['tab-clean'])
  })
  it('marks open tabs as detached drafts when their backing saved request is deleted', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.collections = [{
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
    }]
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-orders',
      openTabs: [{
        id: 'tab-orders',
        requestId: 'request-orders-list',
        collectionId: 'collection-orders',
        name: 'Orders Lookup',
        description: '',
        tags: [],
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
          responseBody: '{}',
          status: 200,
          statusText: 'OK',
          time: '10 ms',
          size: '1 KB',
          headers: [],
          contentType: 'application/json',
          requestMethod: 'POST',
          requestUrl: 'https://example.com/orders',
          testResults: [],
        },
        isSending: false,
        isDirty: false,
      }],
    }

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="sidebar-delete-request"]').trigger('click')
    await flushPromises()
    await nextTick()

    const detachedTab = getActiveRequestPanelTab(wrapper)
    expect(detachedTab?.requestId).toBeUndefined()
    expect(detachedTab?.origin?.kind).toBe('detached')
    expect(detachedTab?.collectionName).toBe('Scratch Pad')
  })

  it('derives a shared activity projection for saved requests, replay drafts, and tab surfaces', async () => {
    window.innerWidth = 1440

    const payload = createBootstrapPayload()
    payload.collections = [{
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
      requests: [{
        id: 'request-orders-list',
        name: 'Orders Lookup',
        description: 'Fetch one order',
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
      }],
    }]
    payload.history = [{
      id: 'history-orders-1',
      requestId: 'request-orders-list',
      name: 'Orders Replay',
      method: 'POST',
      time: '28 ms',
      status: 201,
      url: 'https://example.com/orders/1',
      requestSnapshot: {
        tabId: 'snapshot-orders-1',
        requestId: 'request-orders-list',
        name: 'Orders Replay',
        description: '',
        tags: ['orders'],
        collectionName: 'Orders',
        method: 'POST',
        url: 'https://example.com/orders/1',
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
    }]
    payload.session = {
      activeEnvironmentId: 'env-local',
      activeTabId: 'tab-orders',
      openTabs: [{
        id: 'tab-orders',
        requestId: 'request-orders-list',
        origin: {
          kind: 'resource',
          requestId: 'request-orders-list',
        },
        persistenceState: 'saved',
        executionState: 'success',
        collectionId: 'collection-orders',
        name: 'Orders Lookup',
        description: '',
        tags: ['orders'],
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
          responseBody: '{"ok":true}',
          status: 201,
          statusText: 'Created',
          time: '18 ms',
          size: '2 KB',
          headers: [],
          contentType: 'application/json',
          requestMethod: 'POST',
          requestUrl: 'https://example.com/orders',
          testResults: [],
        },
        isSending: false,
        isDirty: false,
      }],
    }

    setRuntimeAdapter(createAdapter(payload))

    const wrapper = await mountApp()

    const initialSidebarProjection = wrapper.findComponent(AppSidebarStub).props('activityProjection') as Record<string, any>
    expect(initialSidebarProjection.summary).toMatchObject({
      open: 1,
      dirty: 0,
      running: 0,
      recovered: 0,
    })
    expect(initialSidebarProjection.requests['request-orders-list']).toMatchObject({
      active: true,
      open: true,
      dirty: false,
      running: false,
      recovered: false,
      result: 'success',
    })

    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await flushPromises()
    await nextTick()

    const updatedSidebarProjection = wrapper.findComponent(AppSidebarStub).props('activityProjection') as Record<string, any>
    expect(updatedSidebarProjection.summary).toMatchObject({
      open: 2,
      dirty: 1,
      running: 0,
      recovered: 1,
    })
    expect(updatedSidebarProjection.history['history-orders-1']).toMatchObject({
      active: true,
      open: true,
      dirty: true,
      running: false,
      recovered: true,
      result: 'success',
    })

    const activeReplayTab = getActiveRequestPanelTab(wrapper)
    const requestPanelProjection = wrapper.findComponent(RequestPanelStub).props('activityProjection') as Record<string, any>

    expect(activeReplayTab?.origin?.kind).toBe('replay')
    expect(activeReplayTab?.origin?.historyItemId).toBe('history-orders-1')
    expect(requestPanelProjection.tabs[activeReplayTab!.id]).toMatchObject({
      active: true,
      open: true,
      dirty: true,
      running: false,
      recovered: true,
      result: 'success',
    })
  })
})
