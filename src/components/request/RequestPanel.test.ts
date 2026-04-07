import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'

import RequestPanel from './RequestPanel.vue'
import type { RequestTabState } from '@/types/request'
import McpRequestPanel from '@/features/mcp-workbench/components/McpRequestPanel.vue'

const RequestComposeRailStub = defineComponent({
  name: 'RequestComposeRail',
  props: {
    executionConfiguredCount: { type: Number, required: false, default: 0 },
  },
  emits: ['send', 'save', 'import-workspace', 'import-openapi', 'import-curl', 'export-workspace'],
  template: '<button data-testid="request-url-bar-send" @click="$emit(\'send\')">Send</button>',
})

const withRequestPanelStubs = (stubs: Record<string, unknown>) => ({
  ...stubs,
  RequestComposeRail: RequestComposeRailStub,
})

const RequestUrlBarCaptureStub = defineComponent({
  name: 'RequestUrlBar',
  props: {
    readiness: {
      type: Object,
      required: false,
      default: () => ({
        blockers: [],
        advisories: [],
      }),
    },
    originKind: { type: String, required: false, default: '' },
    persistenceState: { type: String, required: false, default: '' },
    executionState: { type: String, required: false, default: '' },
  },
  template: `
    <div data-testid="request-url-bar-capture">
      <div data-testid="request-url-bar-origin">{{ originKind }}</div>
      <div data-testid="request-url-bar-persistence">{{ persistenceState }}</div>
      <div data-testid="request-url-bar-execution">{{ executionState }}</div>
      <div data-testid="request-url-bar-blockers">{{ readiness.blockers.join(' | ') }}</div>
      <div data-testid="request-url-bar-advisories">{{ readiness.advisories.join(' | ') }}</div>
    </div>
  `,
})

const RequestUrlBarSendStub = defineComponent({
  name: 'RequestUrlBarSendStub',
  emits: ['send'],
  template: '<button data-testid="request-url-bar-send" @click="$emit(\'send\')">Send</button>',
})

const createTab = (overrides: Partial<RequestTabState> = {}): RequestTabState => ({
  id: overrides.id ?? 'tab-1',
  name: '订单详情',
  description: '',
  tags: [],
  collectionName: overrides.collectionName ?? 'Scratch Pad',
  method: overrides.method ?? 'POST',
  url: overrides.url ?? 'https://example.com/orders',
  params: [],
  headers: [],
  body: overrides.body ?? '',
  bodyType: overrides.bodyType ?? 'json',
  bodyContentType: overrides.bodyContentType,
  formDataFields: overrides.formDataFields ?? [],
  binaryFileName: overrides.binaryFileName,
  binaryMimeType: overrides.binaryMimeType,
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
  executionOptions: {
    timeoutMs: undefined,
    redirectPolicy: 'follow',
    proxy: { mode: 'inherit' },
    verifySsl: true,
  },
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
  isDirty: overrides.isDirty ?? false,
  requestId: overrides.requestId,
  origin: overrides.origin,
  persistenceState: overrides.persistenceState,
  executionState: overrides.executionState,
  ...overrides,
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

    expect(wrapper.get('[data-testid="request-panel-root"]').classes()).toEqual(
      expect.arrayContaining(['zr-request-shell']),
    )
    expect(wrapper.get('[data-testid="request-panel-header"]').classes()).toContain('zr-request-shell-header')
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
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-panel-busy-overlay"]').text()).toContain('Sending request')
    expect(wrapper.get('[data-testid="request-panel-busy-surface"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('[data-testid="request-url-shell"]').exists()).toBe(true)
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
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    const busySurface = wrapper.get('[data-testid="request-panel-busy-surface"]')
    const firstTab = wrapper.get('[data-testid="request-tab-tab-1"]')
    const secondTab = wrapper.get('[data-testid="request-tab-tab-2"]')

    expect(wrapper.find('[data-testid="request-panel-tabs"]').exists()).toBe(true)
    expect(firstTab.classes()).toContain('zr-request-tab-active')
    expect(secondTab.classes()).toContain('zr-request-tab-idle')
    expect(busySurface.find('[data-testid="request-url-shell"]').exists()).toBe(true)
    expect(busySurface.find('[data-testid="request-params-stub"]').exists()).toBe(true)
    expect(busySurface.find('[data-testid="request-panel-tabs"]').exists()).toBe(false)
  })

  it('keeps the request compose shell shrinkable beneath the fixed command surfaces', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [createTab({ id: 'tab-orders', name: 'Orders Lookup' })],
        activeTabId: 'tab-orders',
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

    expect(wrapper.get('[data-testid="request-compose-shell"]').classes()).toEqual(
      expect.arrayContaining(['h-full', 'min-h-0', 'overflow-hidden']),
    )
    expect(wrapper.get('[data-testid="request-compose-body-host"]').classes()).toEqual(
      expect.arrayContaining(['flex', 'min-h-0', 'flex-1', 'overflow-hidden']),
    )
    expect(wrapper.find('[data-testid="request-url-shell"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="request-params-stub"]').exists()).toBe(true)
  })

  it('does not duplicate the active request title in expanded header chrome', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [createTab({ id: 'tab-orders', name: 'Orders Lookup' })],
        activeTabId: 'tab-orders',
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

    const headerText = wrapper.get('[data-testid="request-panel-header"]').text()
    const titleMatches = headerText.match(/Orders Lookup/g) ?? []

    expect(titleMatches).toHaveLength(1)
  })

  it('compresses expanded request tabs into a denser single-line layout for multi-tab workbenches', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({ id: 'tab-1', name: 'Lookup Request', collectionName: 'Orders' }),
          createTab({ id: 'tab-2', name: 'User Detail', collectionName: 'Users' }),
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

    const strip = wrapper.get('[data-testid="request-panel-tabs"]')
    const firstTab = wrapper.get('[data-testid="request-tab-tab-1"]')

    expect(strip.classes()).toContain('gap-1.5')
    expect(firstTab.classes()).toContain('min-w-[164px]')
    expect(firstTab.classes()).not.toContain('min-w-[188px]')
    expect(wrapper.find('[data-testid="request-tab-origin-tab-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-tab-persistence-tab-1"]').exists()).toBe(false)
    expect(firstTab.find('[data-testid="request-tab-status-tab-1"]').exists()).toBe(true)
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

    expect(document.body.querySelector('[data-testid="request-tab-context-save-tab-1"]')).toBeNull()
  })

  it('compresses tab lifecycle states into a single compact indicator in the tab strip', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-resource',
            name: 'Saved Request',
            collectionName: 'Orders',
            requestId: 'request-orders',
            origin: { kind: 'resource', requestId: 'request-orders' },
            persistenceState: 'saved',
            executionState: 'success',
          }),
          createTab({
            id: 'tab-replay',
            name: 'Replay Draft',
            collectionName: 'Orders',
            requestId: 'request-orders',
            origin: { kind: 'replay', requestId: 'request-orders', historyItemId: 'history-orders' },
            persistenceState: 'unsaved',
            executionState: 'success',
            isDirty: true,
          }),
          createTab({
            id: 'tab-scratch',
            name: 'Scratch Draft',
            origin: { kind: 'scratch' },
            persistenceState: 'unsaved',
            executionState: 'idle',
            isDirty: true,
          }),
          createTab({
            id: 'tab-detached',
            name: 'Detached Draft',
            origin: { kind: 'detached', requestId: 'request-orders' },
            persistenceState: 'unbound',
            executionState: 'http-error',
            isDirty: true,
          }),
          createTab({
            id: 'tab-pending',
            name: 'Pending Request',
            collectionName: 'Orders',
            requestId: 'request-pending',
            origin: { kind: 'resource', requestId: 'request-pending' },
            persistenceState: 'saved',
            executionState: 'pending',
            isSending: true,
          }),
        ],
        activeTabId: 'tab-resource',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarCaptureStub,
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-tab-status-tab-resource"]').attributes('data-state')).toBe('success')
    expect(wrapper.get('[data-testid="request-tab-status-tab-replay"]').attributes('data-state')).toBe('dirty')
    expect(wrapper.get('[data-testid="request-tab-status-tab-scratch"]').attributes('data-state')).toBe('dirty')
    expect(wrapper.get('[data-testid="request-tab-status-tab-detached"]').attributes('data-state')).toBe('error')
    expect(wrapper.get('[data-testid="request-tab-status-tab-pending"]').attributes('data-state')).toBe('pending')
    expect(wrapper.find('[data-testid="request-tab-origin-tab-resource"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-tab-persistence-tab-detached"]').exists()).toBe(false)
  })

  it('prefers the dirty compact state for canonical request tabs with unsaved edits', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-resource-dirty',
            name: 'Orders Draft',
            collectionName: 'Orders',
            requestId: 'request-orders',
            origin: { kind: 'resource', requestId: 'request-orders' },
            persistenceState: 'unsaved',
            executionState: 'idle',
            isDirty: true,
          }),
        ],
        activeTabId: 'tab-resource-dirty',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarCaptureStub,
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-tab-status-tab-resource-dirty"]').attributes('data-state')).toBe('dirty')
    expect(wrapper.find('[data-testid="request-tab-origin-tab-resource-dirty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-tab-persistence-tab-resource-dirty"]').exists()).toBe(false)
  })

  it('shows provenance cues in the collapsed summary for replay drafts', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-replay',
            name: 'Replay Draft',
            collectionName: 'Orders',
            requestId: 'request-orders',
            origin: { kind: 'replay', requestId: 'request-orders', historyItemId: 'history-orders' },
            persistenceState: 'unsaved',
            executionState: 'success',
            isDirty: true,
          }),
        ],
        activeTabId: 'tab-replay',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
        collapsed: true,
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarCaptureStub,
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-summary-origin"]').text()).toContain('Recovered')
    expect(wrapper.get('[data-testid="request-summary-persistence"]').text()).toContain('Draft')
    expect(wrapper.get('[data-testid="request-summary-result"]').text()).toContain('Success')
  })

  it('keeps invalid JSON feedback out of the top blocker strip while preserving other readiness blockers', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-invalid-json',
            requestId: 'request-orders',
            origin: { kind: 'resource', requestId: 'request-orders' },
            persistenceState: 'unsaved',
            executionState: 'idle',
            url: 'https://{{missingHost}}/orders',
            bodyType: 'json',
            body: '{',
            isDirty: true,
          }),
        ],
        activeTabId: 'tab-invalid-json',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: '',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarCaptureStub,
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-url-bar-origin"]').text()).toBe('resource')
    expect(wrapper.get('[data-testid="request-url-bar-blockers"]').text()).toContain('missingHost')
    expect(wrapper.get('[data-testid="request-url-bar-blockers"]').text()).not.toContain('JSON body is invalid')
    expect(wrapper.get('[data-testid="request-url-bar-advisories"]').text()).toContain('Unsaved changes')
  })

  it('prevents send for invalid JSON even when the top blocker strip is otherwise clear', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-invalid-json-send',
            url: 'https://example.com/orders',
            bodyType: 'json',
            body: '{',
          }),
        ],
        activeTabId: 'tab-invalid-json-send',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarSendStub,
          CodeEditorSurface: defineComponent({ template: '<div data-testid="code-editor-surface-stub" />' }),
        },
      },
    })

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('blocks binary requests that do not have an attached payload', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-binary',
            origin: { kind: 'scratch' },
            persistenceState: 'unsaved',
            executionState: 'idle',
            url: 'https://example.com/upload',
            bodyType: 'binary',
            body: '',
            isDirty: true,
          }),
        ],
        activeTabId: 'tab-binary',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [{ key: 'baseUrl', value: 'https://example.com', enabled: true }],
        resolvedActiveUrl: 'https://example.com/upload',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarCaptureStub,
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-url-bar-blockers"]').text()).toContain('Attach a binary payload')
  })

  it('reveals request row validation and prevents sending when send is triggered with invalid params rows', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-invalid-param-row',
            url: 'https://example.com/orders',
            params: [
              { key: '', value: '1', description: '', enabled: true },
            ],
            bodyType: 'json',
            body: '{}',
          }),
        ],
        activeTabId: 'tab-invalid-param-row',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarSendStub,
        },
      },
    })

    expect(wrapper.find('[data-testid="request-row-error-params-0"]').exists()).toBe(false)

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('send')).toBeUndefined()
    expect(wrapper.get('[data-testid="request-row-error-params-0"]').text()).toContain('Key is required')
    expect(wrapper.get('[data-testid="request-section-invalid-params"]').text()).toContain('1')
  })

  it('includes canonical execution options in the send payload', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-execution-send',
            url: 'https://example.com/orders',
            bodyType: 'json',
            body: '{}',
            executionOptions: {
              timeoutMs: 2500,
              redirectPolicy: 'manual',
              proxy: { mode: 'custom', url: 'http://127.0.0.1:8080' },
              verifySsl: false,
            },
          }),
        ],
        activeTabId: 'tab-execution-send',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarSendStub,
        },
      },
    })

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('send')).toHaveLength(1)
    expect(wrapper.emitted('send')?.[0]?.[0]).toMatchObject({
      executionOptions: {
        timeoutMs: 2500,
        redirectPolicy: 'manual',
        proxy: { mode: 'custom', url: 'http://127.0.0.1:8080' },
        verifySsl: false,
      },
    })
  })


  it('renders the request mode switch inside the compose shell and switches into mcp mode', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [createTab({ id: 'tab-http-switch', name: 'Switch Me' })],
        activeTabId: 'tab-http-switch',
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

    const toggle = wrapper.get('[data-testid=\"request-kind-toggle\"]')

    expect(wrapper.find('[data-testid=\"request-compose-mode-switch\"]').exists()).toBe(false)
    expect(toggle.text()).toContain('HTTP')
    expect(toggle.text()).toContain('MCP')
    expect(wrapper.get('[data-testid=\"request-panel-header\"]').text()).not.toContain('Mode')

    await toggle.get('[data-testid=\"request-kind-mcp\"]').trigger('click')
    await nextTick()

    const emitted = wrapper.emitted('update-active-tab') ?? []
    expect(emitted[emitted.length - 1]?.[0]).toMatchObject({
      requestKind: 'mcp',
      mcp: {
        connection: {
          transport: 'http',
          baseUrl: '',
        },
        operation: {
          type: 'initialize',
          input: {
            clientName: 'ZenRequest',
            clientVersion: '0.1.0',
          },
        },
      },
    })
  })

  it('renders the mcp request panel for mcp tabs and hides the http compose panel', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp',
            name: 'MCP Search',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [{ key: 'Accept', value: 'application/json', description: '', enabled: true }],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: { query: 'orders' },
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.findComponent(McpRequestPanel).exists()).toBe(true)
    expect(wrapper.find('[data-testid="request-compose-mode-switch"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="request-kind-toggle"]').length).toBe(1)
    expect(wrapper.get('[data-testid="mcp-request-panel"]').text()).toContain('MCP Workbench')
    expect(wrapper.get('[data-testid="mcp-request-scroll-area"]').classes()).toEqual(
      expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-y-auto']),
    )
    expect(wrapper.find('[data-testid="mcp-operation-select"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="mcp-transport-value"]').text()).toContain('http')
    expect(wrapper.get('[data-testid="mcp-transport-hint"]').text()).toContain('stdio is planned')
    expect(wrapper.get('[data-testid="mcp-endpoint-value"]').text()).toContain('https://example.com/mcp')
    expect(wrapper.get('[data-testid="mcp-tool-name"]').text()).toContain('search')
    expect(wrapper.find('[data-testid="mcp-command-bar"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-url-bar-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-compose-body-host"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-params-stub"]').exists()).toBe(false)
  })

  it('forwards discover-tools from the mcp panel', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-discover-forward',
            name: 'MCP Discover',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: {},
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-discover-forward',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    await wrapper.get('[data-testid="mcp-discover-tools-button"]').trigger('click')

    expect(wrapper.emitted('discover-mcp-tools')).toHaveLength(1)
  })


  it('forwards discover-prompts from the mcp panel', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-discover-prompts',
            name: 'MCP Prompt Discover',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'prompts.get',
                input: {
                  promptName: 'summarize',
                  arguments: {},
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-discover-prompts',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    await wrapper.get('[data-testid="mcp-discover-prompts-button"]').trigger('click')

    expect(wrapper.emitted('discover-mcp-prompts')).toHaveLength(1)
  })

  it('forwards mcp panel edits through update-active-tab', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-edit',
            name: 'MCP Edit',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'initialize',
                input: {
                  clientName: 'ZenRequest',
                  clientVersion: '0.1.0',
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-edit',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    wrapper.findComponent(McpRequestPanel).vm.$emit('update:mcp', {
      connection: {
        transport: 'http',
        baseUrl: 'https://example.com/next-mcp',
        headers: [],
        auth: {
          type: 'none',
          bearerToken: '',
          username: '',
          password: '',
          apiKeyKey: 'X-API-Key',
          apiKeyValue: '',
          apiKeyPlacement: 'header',
        },
      },
      operation: {
        type: 'tools.call',
        input: {
          toolName: 'search',
          arguments: {},
        },
      },
    })
    await nextTick()

    const emitted = wrapper.emitted('update-active-tab') ?? []
    expect(emitted[emitted.length - 1]?.[0]).toMatchObject({
      requestKind: 'mcp',
      mcp: {
        connection: {
          baseUrl: 'https://example.com/next-mcp',
        },
        operation: {
          type: 'tools.call',
        },
      },
    })
  })

  it('sends mcp payloads through the shared send event', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-send',
            name: 'MCP Send',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: {},
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-send',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarSendStub,
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('send')?.[0]?.[0]).toMatchObject({
      requestKind: 'mcp',
      url: 'https://example.com/mcp',
      mcp: {
        operation: {
          type: 'tools.call',
        },
      },
    })
  })

  it('blocks mcp send when tools.call is missing a tool name', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-blocked',
            name: 'MCP Blocked',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: '',
                  arguments: {},
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-blocked',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-url-bar-send"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="mcp-request-panel"]').text()).toContain('Discover tools first')

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')

    expect(wrapper.emitted('send')).toBeUndefined()
  })


  it('blocks mcp initialize send when client identity is incomplete', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-init-blocked',
            name: 'MCP Init Blocked',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'initialize',
                input: {
                  clientName: '',
                  clientVersion: '',
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-init-blocked',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-url-bar-send"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="mcp-request-panel"]').text()).toContain('initialize')

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('blocks mcp tools.call when schema-required arguments are missing', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-required-args',
            name: 'MCP Required Args',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: {},
                  schema: {
                    name: 'search',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        query: { type: 'string' },
                        limit: { type: 'integer' },
                      },
                      required: ['query', 'limit'],
                    },
                  },
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-required-args',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="request-url-bar-send"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="mcp-request-panel"]').text()).toContain('query')
    expect(wrapper.get('[data-testid="mcp-request-panel"]').text()).toContain('limit')

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')

    expect(wrapper.emitted('send')).toBeUndefined()
  })


  it('renders structured mcp tool arguments when a flat schema is available', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-structured',
            name: 'MCP Structured',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: { query: 'orders' },
                  schema: {
                    name: 'search',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        query: { type: 'string', title: 'Query' },
                        limit: { type: 'integer' },
                      },
                      required: ['query'],
                    },
                  },
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-structured',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-arguments-mode"]').text()).toContain('Structured form')
    expect(wrapper.get('[data-testid="mcp-schema-name"]').text()).toContain('search')
    expect(wrapper.find('[data-testid="mcp-arg-input-query"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mcp-arg-input-limit"]').exists()).toBe(true)
  })

  it('falls back to raw json arguments when the schema is not flattenable', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-raw',
            name: 'MCP Raw',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: { filters: { tag: 'orders' } },
                  schema: {
                    name: 'search',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        filters: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-raw',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-arguments-mode"]').text()).toContain('Raw JSON')
    expect(wrapper.find('[data-testid="mcp-raw-arguments-input"]').exists()).toBe(true)
  })

  it('shows fallback reason when tool schema cannot be flattened', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-raw-reason',
            name: 'MCP Raw Reason',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: { filters: { tag: 'orders' } },
                  schema: {
                    name: 'search',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        filters: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-raw-reason',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-raw-arguments-fallback-reason"]').text()).toContain('nested or unsupported fields')
  })


  it('prefills tools.call from tools.list response artifacts', () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-mcp-tools-list-artifact',
            name: 'MCP Tools',
            requestKind: 'mcp',
            mcp: {
              connection: {
                transport: 'http',
                baseUrl: 'https://example.com/mcp',
                headers: [],
                auth: {
                  type: 'none',
                  bearerToken: '',
                  username: '',
                  password: '',
                  apiKeyKey: 'X-API-Key',
                  apiKeyValue: '',
                  apiKeyPlacement: 'header',
                },
              },
              operation: {
                type: 'tools.call',
                input: {
                  toolName: 'search',
                  arguments: {},
                },
              },
            },
            response: {
              responseBody: '{}',
              status: 200,
              statusText: 'OK',
              time: '10 ms',
              size: '1 KB',
              headers: [],
              contentType: 'application/json',
              requestMethod: 'POST',
              requestUrl: 'https://example.com/mcp',
              testResults: [],
              requestKind: 'mcp',
              mcpArtifact: {
                transport: 'http',
                operation: 'tools.list',
                protocolResponse: {
                  result: {
                    tools: [
                      {
                        name: 'search',
                        title: 'Search',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            query: { type: 'string', title: 'Query' },
                          },
                          required: ['query'],
                        },
                      },
                    ],
                  },
                },
              },
            },
          }),
        ],
        activeTabId: 'tab-mcp-tools-list-artifact',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/mcp',
      },
      global: {
        stubs: {
          RequestUrlBar: defineComponent({ template: '<div data-testid="request-url-bar-stub" />' }),
          RequestParams: defineComponent({ template: '<div data-testid="request-params-stub" />' }),
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-schema-name"]').text()).toContain('search')
    expect(wrapper.find('[data-testid="mcp-arg-input-query"]').exists()).toBe(true)
  })

  it('allows sending when the only incomplete params row is disabled', async () => {
    const wrapper = mount(RequestPanel, {
      props: {
        locale: 'en',
        tabs: [
          createTab({
            id: 'tab-disabled-param-row',
            url: 'https://example.com/orders',
            params: [
              { key: '', value: '1', description: '', enabled: false },
            ],
            bodyType: 'json',
            body: '{}',
          }),
        ],
        activeTabId: 'tab-disabled-param-row',
        activeEnvironmentName: 'Local',
        activeEnvironmentVariables: [],
        resolvedActiveUrl: 'https://example.com/orders',
      },
      global: {
        stubs: {
          RequestUrlBar: RequestUrlBarSendStub,
        },
      },
    })

    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('send')).toHaveLength(1)
    expect(wrapper.find('[data-testid="request-row-error-params-0"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-section-invalid-params"]').exists()).toBe(false)
  })
})

describe('McpRequestPanel discoverability', () => {
  it('renders MCP workbench copy in zh-CN locale', () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'zh-CN',
        requestName: 'MCP 调试',
        mcp: {
          connection: {
            transport: 'http',
            baseUrl: 'https://example.com/mcp',
            headers: [],
            auth: {
              type: 'none',
              bearerToken: '',
              username: '',
              password: '',
              apiKeyKey: 'X-API-Key',
              apiKeyValue: '',
              apiKeyPlacement: 'header',
            },
          },
          operation: {
            type: 'initialize',
            input: {
              clientName: 'ZenRequest',
              clientVersion: '0.1.0',
            },
          },
        },
      },
    })

    expect(wrapper.text()).toContain('MCP 工作台')
    expect(wrapper.text()).toContain('操作')
    expect(wrapper.get('[data-testid="mcp-transport-value"]').text()).toContain('http')
    expect(wrapper.get('[data-testid="mcp-transport-hint"]').text()).toContain('当前版本已支持 HTTP 传输')
  })

  it('shows HTTP active and stdio planned guidance in the transport hint', () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Debug',
        mcp: {
          connection: {
            transport: 'http',
            baseUrl: 'https://example.com/mcp',
            headers: [],
            auth: {
              type: 'none',
              bearerToken: '',
              username: '',
              password: '',
              apiKeyKey: 'X-API-Key',
              apiKeyValue: '',
              apiKeyPlacement: 'header',
            },
          },
          operation: {
            type: 'initialize',
            input: {
              clientName: 'ZenRequest',
              clientVersion: '0.1.0',
            },
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-transport-value"]').text()).toContain('http')
    expect(wrapper.get('[data-testid="mcp-transport-hint"]').text()).toContain('HTTP transport is available in this release')
    expect(wrapper.get('[data-testid="mcp-transport-hint"]').text()).toContain('stdio is planned')
  })
})
