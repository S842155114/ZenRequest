import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'

import RequestPanel from './RequestPanel.vue'
import type { RequestTabState } from '@/types/request'

const createTab = (): RequestTabState => ({
  id: 'tab-1',
  name: '订单详情',
  description: '',
  tags: [],
  collectionName: 'Scratch Pad',
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
})

describe('RequestPanel i18n copy', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders shell labels from i18n in zh-CN locale', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'zh-CN',
        tabs: [createTab()],
        activeTabId: 'tab-1',
        activeEnvironmentName: '本地环境',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
        collapsed: true,
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div />' }),
          RequestParams: defineComponent({ template: '<div />' }),
        },
      },
    })

    expect(wrapper.text()).toContain('请求工作台')
    expect(wrapper.text()).toContain('请求方法')
    expect(wrapper.text()).toContain('环境')
    expect(wrapper.text()).toContain('标签页')
  })

  it('shows a request-scoped busy overlay while the active tab is sending', () => {
    const sendingTab = createTab()
    sendingTab.isSending = true

    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [sendingTab],
        activeTabId: 'tab-1',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-panel-busy-overlay"]').text()).toContain('Sending request')
    expect(wrapper.get('[data-testid="request-panel-busy-surface"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('[data-testid="request-url-bar-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="request-params-stub"]').exists()).toBe(true)
  })

  it('keeps the request tab strip outside the sending overlay scope', () => {
    const sendingTab = createTab()
    sendingTab.isSending = true

    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          sendingTab,
          { ...createTab(), id: 'tab-2', name: '用户详情', isSending: false },
        ],
        activeTabId: 'tab-1',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    const busySurface = wrapper.get('[data-testid="request-panel-busy-surface"]')

    expect(wrapper.find('[data-testid="request-panel-tabs"]').exists()).toBe(true)
    expect(busySurface.find('[data-testid="request-url-bar-stub"]').exists()).toBe(true)
    expect(busySurface.find('[data-testid="request-params-stub"]').exists()).toBe(true)
    expect(busySurface.find('[data-testid="request-panel-tabs"]').exists()).toBe(false)
  })

  it('removes the busy overlay when the active tab is not sending', async () => {
    const sendingTab = createTab()
    sendingTab.isSending = true

    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [sendingTab],
        activeTabId: 'tab-1',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    await wrapper.setProps({
      tabs: [{ ...sendingTab, isSending: false }],
    })

    expect(wrapper.find('[data-testid="request-panel-busy-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="request-panel-busy-surface"]').attributes('aria-busy')).toBe('false')
  })

  it('opens a context menu for a non-active tab without selecting it first', async () => {
    const wrapper = mount(RequestPanel, {
      attachTo: document.body,
      props: {
        locale: 'en',
        tabs: [
          createTab(),
          { ...createTab(), id: 'tab-2', name: 'User Detail', collectionName: 'Orders' },
        ],
        activeTabId: 'tab-1',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    await wrapper.get('[data-testid="request-tab-tab-2"]').trigger('contextmenu')
    await nextTick()

    expect(wrapper.emitted('select-tab')).toBeUndefined()

    const saveItem = document.body.querySelector('[data-testid="request-tab-context-save-tab-2"]')
    expect(saveItem).not.toBeNull()

    saveItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('save-tab')?.[0]).toEqual(['tab-2'])
  })

  it('keeps editable request controls on native context-menu behavior', async () => {
    const wrapper = mount(RequestPanel, {
      attachTo: document.body,
      props: {
        locale: 'en',
        tabs: [createTab()],
        activeTabId: 'tab-1',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    await wrapper.get('input').trigger('contextmenu')
    await nextTick()

    expect(document.body.querySelector('[data-testid="request-tab-context-menu"]')).toBeNull()
  })
})
