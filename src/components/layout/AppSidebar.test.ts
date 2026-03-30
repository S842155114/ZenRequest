import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'

import AppSidebar from './AppSidebar.vue'
import type { HistoryItem, RequestCollection } from '@/types/request'

const ButtonStub = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
})

const ScrollAreaStub = defineComponent({
  name: 'ScrollArea',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const BadgeStub = defineComponent({
  name: 'Badge',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const SeparatorStub = defineComponent({
  name: 'Separator',
  inheritAttrs: false,
  template: '<div v-bind="$attrs" />',
})

const CollapsibleStub = defineComponent({
  name: 'Collapsible',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const CollapsibleContentStub = defineComponent({
  name: 'CollapsibleContent',
  template: '<div><slot /></div>',
})

const CollapsibleTriggerStub = defineComponent({
  name: 'CollapsibleTrigger',
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})

const DropdownMenuStub = defineComponent({
  name: 'DropdownMenu',
  template: '<div><slot /></div>',
})

const DropdownMenuTriggerStub = defineComponent({
  name: 'DropdownMenuTrigger',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const DropdownMenuContentStub = defineComponent({
  name: 'DropdownMenuContent',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const DropdownMenuItemStub = defineComponent({
  name: 'DropdownMenuItem',
  inheritAttrs: false,
  emits: ['select'],
  template: '<button v-bind="$attrs" @click="$emit(\'select\')"><slot /></button>',
})

const collections: RequestCollection[] = [
  {
    id: 'collection-orders',
    name: 'Orders',
    expanded: true,
    requests: [
      {
        id: 'request-orders-list',
        name: 'List Orders',
        description: 'Fetch all orders',
        tags: ['orders'],
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
          apiKeyKey: '',
          apiKeyValue: '',
          apiKeyPlacement: 'header',
        },
        tests: [],
      },
    ],
  },
]

const createHistoryItem = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  id: overrides.id ?? 'history-orders',
  name: overrides.name ?? 'List Orders',
  url: overrides.url ?? 'https://example.com/orders',
  method: overrides.method ?? 'GET',
  status: overrides.status ?? 200,
  time: overrides.time ?? '10 ms',
  executedAtEpochMs: overrides.executedAtEpochMs,
  executionSource: overrides.executionSource,
  requestSnapshot: overrides.requestSnapshot ?? {
    tabId: 'tab-orders-history',
    requestId: 'request-orders-list',
    name: overrides.name ?? 'List Orders',
    description: '',
    tags: [],
    collectionName: 'Orders',
    method: overrides.method ?? 'GET',
    url: overrides.url ?? 'https://example.com/orders',
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
})

const historyItems: HistoryItem[] = [createHistoryItem()]

const mountSidebar = (props: Record<string, unknown> = {}) => mount(AppSidebar, {
  attachTo: document.body,
  props: {
    locale: 'en',
    collections,
    historyItems,
    activeRequestId: 'request-orders-list',
    searchQuery: '',
    runtimeReady: true,
    ...props,
  },
  global: {
    stubs: {
      Button: ButtonStub,
      ScrollArea: ScrollAreaStub,
      Badge: BadgeStub,
      Separator: SeparatorStub,
      Collapsible: CollapsibleStub,
      CollapsibleContent: CollapsibleContentStub,
      CollapsibleTrigger: CollapsibleTriggerStub,
      DropdownMenu: DropdownMenuStub,
      DropdownMenuTrigger: DropdownMenuTriggerStub,
      DropdownMenuContent: DropdownMenuContentStub,
      DropdownMenuItem: DropdownMenuItemStub,
    },
  },
})

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-26T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('shows collections messaging by default and keeps mode tabs ahead of search', () => {
    const wrapper = mountSidebar()

    expect(wrapper.get('[data-testid="sidebar-root"]').classes()).toEqual(
      expect.arrayContaining(['zr-sidebar-shell', 'zr-sidebar-browser']),
    )
    expect(wrapper.get('[data-testid="sidebar-title"]').text()).toBe('Collections')
    expect(wrapper.get('[data-testid="sidebar-description"]').text()).toBe(
      'Browse saved requests and organize them into collections.',
    )
    expect(wrapper.get('[data-testid="sidebar-search-input"]').attributes('placeholder')).toBe(
      'Search collections and requests',
    )

    const modeSwitcher = wrapper.get('[data-testid="sidebar-mode-switcher"]').element
    const searchBar = wrapper.get('[data-testid="sidebar-search"]').element

    expect(wrapper.get('[data-testid="sidebar-mode-switcher"]').classes()).toContain('zr-sidebar-mode-switch')
    expect(wrapper.get('[data-testid="sidebar-search"]').classes()).toContain('zr-sidebar-search')
    expect(Boolean(modeSwitcher.compareDocumentPosition(searchBar) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('switches the top summary and search placeholder when history mode is active', async () => {
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="sidebar-history-tab"]').trigger('click')

    expect(wrapper.get('[data-testid="sidebar-title"]').text()).toBe('History')
    expect(wrapper.get('[data-testid="sidebar-description"]').text()).toBe(
      'Review recent requests and reopen previous runs.',
    )
    expect(wrapper.get('[data-testid="sidebar-search-input"]').attributes('placeholder')).toBe(
      'Search recent requests',
    )
    expect(wrapper.text()).toContain('Recent Requests')
  })

  it('collapses collection rename and delete actions into a single overflow menu', async () => {
    const wrapper = mountSidebar()

    expect(wrapper.find('[data-testid="collection-rename-orders"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="collection-delete-orders"]').exists()).toBe(false)

    await wrapper.get('[data-testid="collection-actions-orders"]').trigger('click')
    await wrapper.get('[data-testid="collection-action-rename-orders"]').trigger('click')
    await wrapper.get('[data-testid="collection-action-delete-orders"]').trigger('click')

    expect(wrapper.emitted('rename-collection')?.[0]).toEqual(['Orders'])
    expect(wrapper.emitted('delete-collection')?.[0]).toEqual(['Orders'])
  })

  it('renders workset pills and a dedicated active-row signal rail', () => {
    const wrapper = mountSidebar()

    expect(wrapper.get('[data-testid="sidebar-workset-open"]').classes()).toContain('zr-workset-pill')
    expect(wrapper.get('[data-testid="request-row-signal-request-orders-list"]').classes()).toContain(
      'zr-request-row-signal-active',
    )
  })

  it('groups history items by relative day and keeps status as secondary metadata', async () => {
    const now = Date.now()
    const wrapper = mountSidebar({
      historyItems: [
        createHistoryItem({
          id: 'history-today',
          name: 'Today Request',
          executedAtEpochMs: now - (2 * 60 * 60 * 1000),
          status: 204,
          time: '12 ms',
        }),
        createHistoryItem({
          id: 'history-yesterday',
          name: 'Yesterday Request',
          executedAtEpochMs: now - (26 * 60 * 60 * 1000),
          status: 500,
          time: '88 ms',
        }),
        createHistoryItem({
          id: 'history-earlier',
          name: 'Earlier Request',
          executedAtEpochMs: now - (72 * 60 * 60 * 1000),
          status: 301,
          time: '31 ms',
        }),
      ],
    })

    await wrapper.get('[data-testid="sidebar-history-tab"]').trigger('click')

    expect(wrapper.get('[data-testid="history-group-today"]').text()).toBe('Today')
    expect(wrapper.get('[data-testid="history-group-yesterday"]').text()).toBe('Yesterday')
    expect(wrapper.get('[data-testid="history-group-earlier"]').text()).toBe('Earlier')
    expect(wrapper.get('[data-testid="history-status-history-yesterday"]').text()).toBe('500')
    expect(wrapper.findAllComponents(BadgeStub)).toHaveLength(3)
  })

  it('shows explicit mock provenance for mock-sourced history rows', async () => {
    const wrapper = mountSidebar({
      historyItems: [
        createHistoryItem({
          id: 'history-mock',
          name: 'Mock Orders',
          executionSource: 'mock',
        }),
      ],
    })

    await wrapper.get('[data-testid="sidebar-history-tab"]').trigger('click')

    expect(wrapper.get('[data-testid="history-source-history-mock"]').text()).toContain('Mock')
  })

  it('shows collection context during search and marks the active request row', () => {
    const wrapper = mountSidebar({
      searchQuery: 'orders',
    })

    const row = wrapper.get('[data-testid="request-row-request-orders-list"]')

    expect(row.attributes('aria-current')).toBe('true')
    expect(row.classes()).toContain('zr-request-row-active')
    expect(wrapper.get('[data-testid="request-search-context-request-orders-list"]').text()).toBe('Orders')
  })

  it('renders workset summary and row activity signals from the shared projection', async () => {
    const wrapper = mountSidebar({
      activityProjection: {
        summary: {
          open: 3,
          dirty: 1,
          running: 1,
          recovered: 1,
        },
        requests: {
          'request-orders-list': {
            active: true,
            open: true,
            dirty: true,
            running: false,
            recovered: false,
            result: 'success',
          },
        },
        history: {
          'history-orders': {
            active: false,
            open: true,
            dirty: true,
            running: false,
            recovered: true,
            result: 'success',
          },
        },
        tabs: {},
      },
    })

    expect(wrapper.get('[data-testid="sidebar-workset-open"]').text()).toContain('3')
    expect(wrapper.get('[data-testid="sidebar-workset-running"]').text()).toContain('1')

    const requestActivity = wrapper.get('[data-testid="request-activity-request-orders-list"]')
    expect(requestActivity.text()).toContain('Active')
    expect(requestActivity.text()).toContain('Dirty')

    await wrapper.get('[data-testid="sidebar-history-tab"]').trigger('click')

    const historyActivity = wrapper.get('[data-testid="history-activity-history-orders"]')
    expect(historyActivity.text()).toContain('Recovered')
    expect(historyActivity.text()).toContain('Open')
  })

  it('opens a collection context menu on right-click and routes actions to that collection', async () => {
    vi.useRealTimers()
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="sidebar-collection-surface-orders"]').trigger('contextmenu')
    await flushPromises()
    await nextTick()

    const renameItem = document.body.querySelector('[data-testid="collection-context-rename-orders"]')
    expect(renameItem).not.toBeNull()

    renameItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await nextTick()

    const renameEvents = wrapper.emitted('rename-collection') ?? []
    expect(renameEvents[renameEvents.length - 1]).toEqual(['Orders'])
  })

  it('opens a request context menu without selecting the request first', async () => {
    vi.useRealTimers()
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="sidebar-request-surface-request-orders-list"]').trigger('contextmenu')
    await flushPromises()
    await nextTick()

    expect(wrapper.emitted('select-request')).toBeUndefined()

    const deleteItem = document.body.querySelector('[data-testid="request-context-delete-request-orders-list"]')
    expect(deleteItem).not.toBeNull()

    deleteItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await nextTick()

    const deleteEvents = wrapper.emitted('delete-request') ?? []
    expect(deleteEvents[deleteEvents.length - 1]).toEqual([{ collectionName: 'Orders', requestId: 'request-orders-list' }])
  })

  it('does not open an application context menu on blank sidebar surfaces or text inputs', async () => {
    vi.useRealTimers()
    mountSidebar()

    document.body.querySelector('[data-testid="sidebar-root"]')
      ?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await flushPromises()
    await nextTick()

    expect(document.body.querySelector('[data-testid="collection-context-menu"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="request-context-menu"]')).toBeNull()

    document.body.querySelector('[data-testid="sidebar-search-input"]')
      ?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await flushPromises()
    await nextTick()

    expect(document.body.querySelector('[data-testid="collection-context-menu"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="request-context-menu"]')).toBeNull()
  })
})
