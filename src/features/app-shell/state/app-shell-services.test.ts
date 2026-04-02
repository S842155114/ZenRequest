import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { defaultRequestPreset } from '@/data/request-presets'
import type { RequestPreset } from '@/types/request'
import { createRequestTabFromPreset } from '@/lib/request-workspace'
import { createAppShellServices } from './app-shell-services'
import { createAppShellStore, createInitialAppShellState } from './app-shell-store'

describe('app-shell services', () => {
  it('creates a missing collection before saving a request and updates the store state', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.environment.items = [{ id: 'env-local', name: 'Local', variables: [] }]
    state.environment.activeId = 'env-local'

    const tab = createRequestTabFromPreset(defaultRequestPreset)
    tab.id = 'tab-orders'
    tab.name = 'Orders Lookup'
    tab.description = 'Draft request'
    tab.tags = ['orders']
    tab.method = 'POST'
    tab.url = 'https://example.com/orders'
    state.request.openTabs = [tab]
    state.request.activeTabId = tab.id

    const store = createAppShellStore(state)
    const createdCollection = {
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
      requests: [],
    }
    const savedRequest: RequestPreset = {
      id: 'request-orders',
      name: 'Orders Lookup',
      description: 'Draft request',
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
    }

    const runtime = {
      createCollection: vi.fn(async () => ({ ok: true, data: createdCollection })),
      saveRequest: vi.fn(async () => ({ ok: true, data: savedRequest })),
    } as const

    const services = createAppShellServices({
      runtime: runtime as never,
      store,
    })

    const result = await services.saveRequest({
      tabId: tab.id,
      requestName: 'Orders Lookup',
      requestDescription: 'Draft request',
      requestTags: ['orders'],
      targetCollectionName: 'Orders',
    })

    expect(result).toMatchObject({ ok: true, code: 'request.saved' })
    expect(runtime.createCollection).toHaveBeenCalledWith('workspace-1', 'Orders')
    expect(runtime.saveRequest).toHaveBeenCalledWith('workspace-1', 'collection-orders', expect.objectContaining({
      name: 'Orders Lookup',
      description: 'Draft request',
      tags: ['orders'],
      collectionId: 'collection-orders',
      collectionName: 'Orders',
    }))
    expect(state.request.collections).toHaveLength(1)
    expect(state.request.collections[0]).toMatchObject({
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
    })
    expect(state.request.collections[0]?.requests[0]?.id).toBe('request-orders')
    expect(state.request.openTabs[0]).toMatchObject({
      requestId: 'request-orders',
      collectionId: 'collection-orders',
      collectionName: 'Orders',
      persistenceState: 'saved',
      isDirty: false,
    })
  })
})
