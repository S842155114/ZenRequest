import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'

import AppSidebar from './AppSidebar.vue'
import type { RequestCollection, RequestPreset } from '@/types/request'

const ButtonStub = defineComponent({
  name: 'ButtonStub',
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})

const ScrollAreaStub = defineComponent({
  name: 'ScrollAreaStub',
  template: '<div><slot /></div>',
})

const SeparatorStub = defineComponent({
  name: 'SeparatorStub',
  template: '<div><slot /></div>',
})

const BadgeStub = defineComponent({
  name: 'BadgeStub',
  template: '<span><slot /></span>',
})

const CollapsibleStub = defineComponent({
  name: 'CollapsibleStub',
  template: '<div><slot /></div>',
})

const CollapsibleContentStub = defineComponent({
  name: 'CollapsibleContentStub',
  template: '<div><slot /></div>',
})

const CollapsibleTriggerStub = defineComponent({
  name: 'CollapsibleTriggerStub',
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})

const createRequest = (overrides: Partial<RequestPreset> = {}): RequestPreset => ({
  id: 'request-orders',
  name: 'Fetch Orders',
  description: 'List all orders',
  method: 'GET',
  url: 'https://example.com/orders',
  collectionName: 'Orders',
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
  ...overrides,
})

const collections: RequestCollection[] = [
  {
    id: 'collection-orders',
    name: 'Orders',
    expanded: true,
    requests: [createRequest()],
  },
]

const mountSidebar = () => mount(AppSidebar, {
  attachTo: document.body,
  props: {
    locale: 'en',
    collections,
    historyItems: [],
    activeRequestId: '',
    searchQuery: '',
    runtimeReady: true,
  },
  global: {
    stubs: {
      Button: ButtonStub,
      ScrollArea: ScrollAreaStub,
      Separator: SeparatorStub,
      Badge: BadgeStub,
      Collapsible: CollapsibleStub,
      CollapsibleContent: CollapsibleContentStub,
      CollapsibleTrigger: CollapsibleTriggerStub,
    },
  },
})

describe('AppSidebar resource context menus', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opens a collection context menu on right-click and routes actions to that collection', async () => {
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="sidebar-collection-surface-orders"]').trigger('contextmenu')
    await nextTick()

    const renameItem = document.body.querySelector('[data-testid="collection-context-rename-orders"]')
    expect(renameItem).not.toBeNull()

    renameItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('rename-collection')?.[0]).toEqual(['Orders'])
  })

  it('opens a request context menu without selecting the request first', async () => {
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="sidebar-request-surface-request-orders"]').trigger('contextmenu')
    await nextTick()

    expect(wrapper.emitted('select-request')).toBeUndefined()

    const deleteItem = document.body.querySelector('[data-testid="request-context-delete-request-orders"]')
    expect(deleteItem).not.toBeNull()

    deleteItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('delete-request')?.[0]).toEqual([{ collectionName: 'Orders', requestId: 'request-orders' }])
  })

  it('does not open an application context menu on blank sidebar surfaces or text inputs', async () => {
    const wrapper = mountSidebar()

    await wrapper.get('[data-testid="sidebar-root"]').trigger('contextmenu')
    await nextTick()
    expect(document.body.querySelector('[data-testid="collection-context-menu"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="request-context-menu"]')).toBeNull()

    await wrapper.get('[data-testid="sidebar-search-input"]').trigger('contextmenu')
    await nextTick()
    expect(document.body.querySelector('[data-testid="collection-context-menu"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="request-context-menu"]')).toBeNull()
  })
})
