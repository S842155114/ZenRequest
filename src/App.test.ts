import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/components/ui/resizable', () => {
  const ResizablePanelGroup = defineComponent({
    name: 'ResizablePanelGroup',
    template: '<div data-testid="resizable-group" v-bind="$attrs"><slot /></div>',
  })
  const ResizablePanel = defineComponent({
    name: 'ResizablePanel',
    props: {
      defaultSize: { type: Number, default: undefined },
      collapsedSize: { type: Number, default: undefined },
      collapsible: { type: Boolean, default: false },
    },
    emits: ['collapse', 'expand', 'resize'],
    setup(props, { expose, slots, attrs, emit }) {
      const collapsed = ref(false)
      const size = ref<number | undefined>(props.defaultSize)

      const collapse = () => {
        collapsed.value = true
        emit('collapse')
      }

      const expand = () => {
        collapsed.value = false
        emit('expand')
        emit('resize', size.value ?? props.defaultSize ?? 0, props.collapsedSize)
      }

      const resize = (nextSize: number) => {
        size.value = nextSize
        emit('resize', nextSize, undefined)
      }

      expose({ collapse, expand, resize })

      return () => h('div', {
        ...attrs,
        'data-testid': 'resizable-panel',
        'data-state': props.collapsible ? (collapsed.value ? 'collapsed' : 'expanded') : undefined,
      }, slots.default?.())
    },
  })
  const ResizableHandle = defineComponent({
    name: 'ResizableHandle',
    props: {
      withHandle: { type: Boolean, default: false },
    },
    template: '<div data-testid="resize-handle-stub" v-bind="$attrs" :data-with-handle="withHandle ? \'true\' : \'false\'"></div>',
  })

  return {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
  }
})

vi.mock('@/components/ui/sheet', () => {
  const Sheet = defineComponent({
    name: 'Sheet',
    props: {
      open: { type: Boolean, default: false },
    },
    emits: ['update:open'],
    setup(_props, { slots }) {
      return () => h('div', slots.default?.())
    },
  })

  const SheetContent = defineComponent({
    name: 'SheetContent',
    template: '<div><slot /></div>',
  })

  const SheetHeader = defineComponent({
    name: 'SheetHeader',
    template: '<div><slot /></div>',
  })

  const SheetTitle = defineComponent({
    name: 'SheetTitle',
    template: '<div><slot /></div>',
  })

  const SheetDescription = defineComponent({
    name: 'SheetDescription',
    template: '<div><slot /></div>',
  })

  return {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
  }
})

import App from './App.vue'
import { setRuntimeAdapter } from '@/lib/tauri-client'
import type {
  ApiEnvelope,
  AppBootstrapPayload,
  RuntimeAdapter,
  WorkspaceImportResult,
  WorkspaceSaveResult,
  WorkspaceExportResult,
  AppSettings,
  SendRequestPayloadDto,
} from '@/lib/tauri-client'
import type {
  EnvironmentPreset,
  HistoryItem,
  RequestCollection,
  RequestPreset,
  WorkspaceSessionSnapshot,
  WorkspaceSummary,
} from '@/types/request'

const ok = <T>(data: T): ApiEnvelope<T> => ({ ok: true, data })

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

const matchMediaStub = (query: string): MediaQueryList => ({
  matches: query.includes('dark'),
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})

const createBootstrapPayload = (): AppBootstrapPayload => ({
  settings: { themeMode: 'dark', locale: 'en' },
  workspaces: [{ id: 'workspace-1', name: 'Primary Workspace' }],
  activeWorkspaceId: 'workspace-1',
  collections: [],
  environments: [{ id: 'env-local', name: 'Local', variables: [] }],
  history: [],
  session: {
    activeEnvironmentId: 'env-local',
    activeTabId: 'tab-orders',
    openTabs: [
      {
        id: 'tab-scratch',
        name: 'Scratch Pad',
        description: '',
        tags: [],
        collectionName: 'Scratch Pad',
        method: 'GET',
        url: 'https://example.com/health',
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
          requestUrl: 'https://example.com/health',
          testResults: [],
        },
        isSending: false,
        isDirty: false,
      },
      {
        id: 'tab-orders',
        name: 'Orders Lookup',
        description: '',
        tags: ['orders'],
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
          responseBody: '{"ok":true}',
          status: 201,
          statusText: 'Created',
          time: '20 ms',
          size: '2 KB',
          headers: [],
          contentType: 'application/json',
          requestMethod: 'POST',
          requestUrl: 'https://example.com/orders',
          testResults: [],
        },
        isSending: false,
        isDirty: false,
      },
    ],
  },
})

const createAdapter = (
  bootstrapPayload: AppBootstrapPayload = createBootstrapPayload(),
  overrides: Partial<RuntimeAdapter> = {},
): RuntimeAdapter => ({
  bootstrapApp: async () => ok(bootstrapPayload),
  saveWorkspaceSession: async (_workspaceId: string, _session: WorkspaceSessionSnapshot) =>
    ok<WorkspaceSaveResult>({ savedAtEpochMs: Date.now() }),
  setActiveWorkspace: async (_workspaceId: string) => ok({ message: 'ok' }),
  createWorkspace: async (name: string) => ok<WorkspaceSummary>({ id: `workspace-${name}`, name }),
  deleteWorkspace: async (_workspaceId: string) => ok({ message: 'ok' }),
  exportWorkspace: async (_workspaceId: string) =>
    ok<WorkspaceExportResult>({ fileName: 'zenrequest.json', packageJson: '{}', scope: 'workspace' }),
  importWorkspace: async (_packageJson: string) =>
    ok<WorkspaceImportResult>({
      scope: 'workspace',
      workspace: { id: 'workspace-1', name: 'Imported Workspace' },
      importedWorkspaceCount: 1,
      activeWorkspaceId: 'workspace-1',
    }),
  createCollection: async (_workspaceId: string, name: string) =>
    ok<RequestCollection>({ id: `collection-${name}`, name, expanded: true, requests: [] }),
  renameCollection: async (_workspaceId: string, collectionId: string, name: string) =>
    ok<RequestCollection>({ id: collectionId, name, expanded: true, requests: [] }),
  deleteCollection: async (_workspaceId: string, _collectionId: string) => ok({ message: 'ok' }),
  saveRequest: async (_workspaceId: string, _collectionId: string, request: RequestPreset) => ok(request),
  deleteRequest: async (_workspaceId: string, _requestId: string) => ok({ message: 'ok' }),
  createEnvironment: async (_workspaceId: string, name: string) =>
    ok<EnvironmentPreset>({ id: `env-${name}`, name, variables: [] }),
  renameEnvironment: async (_workspaceId: string, environmentId: string, name: string) =>
    ok<EnvironmentPreset>({ id: environmentId, name, variables: [] }),
  deleteEnvironment: async (_workspaceId: string, _environmentId: string) => ok({ message: 'ok' }),
  updateEnvironmentVariables: async (_workspaceId: string, environmentId: string, variables) =>
    ok<EnvironmentPreset>({ id: environmentId, name: 'Environment', variables }),
  clearHistory: async (_workspaceId: string) => ok({ message: 'ok' }),
  removeHistoryItem: async (_workspaceId: string, _id: string) => ok({ message: 'ok' }),
  getSettings: async () => ok<AppSettings>({ themeMode: 'dark', locale: 'en' }),
  updateSettings: async (payload: AppSettings) => ok(payload),
  sendRequest: async (_payload: SendRequestPayloadDto) =>
    ({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'send_request is not implemented yet' } }),
  ...overrides,
})

const AppHeaderStub = defineComponent({
  name: 'AppHeader',
  props: {
    workspaceBusy: { type: Boolean, default: false },
  },
  emits: ['toggle-navigation', 'update:active-workspace-id'],
  template: `
    <div data-testid="header-stub" :data-workspace-busy="workspaceBusy ? 'true' : 'false'">
      <button data-testid="header-nav-toggle" @click="$emit('toggle-navigation')">toggle</button>
      <button data-testid="header-switch-workspace" @click="$emit('update:active-workspace-id', 'workspace-2')">switch-workspace</button>
    </div>
  `,
})

const AppSidebarStub = defineComponent({
  name: 'AppSidebar',
  props: {
    historyItems: { type: Array, required: false, default: () => [] },
  },
  emits: ['select-history'],
  setup(props, { emit }) {
    return () => h('div', { 'data-testid': 'sidebar-stub' }, [
      'sidebar',
      h('button', {
        'data-testid': 'sidebar-select-history',
        onClick: () => {
          const first = (props.historyItems as HistoryItem[])[0]
          if (first) {
            emit('select-history', first)
          }
        },
      }, 'select-history'),
    ])
  },
})

const RequestPanelStub = defineComponent({
  name: 'RequestPanel',
  props: {
    activeTabId: { type: String, required: false, default: '' },
    tabs: { type: Array, required: false, default: () => [] },
    collapsed: { type: Boolean, required: false, default: false },
  },
  emits: ['send', 'toggle-collapsed'],
  setup(props, { emit }) {
    const baseAuth = {
      type: 'none',
      bearerToken: '',
      username: '',
      password: '',
      apiKeyKey: '',
      apiKeyValue: '',
      apiKeyPlacement: 'header' as const,
    }

    return () => {
      const current = (props.tabs as Array<{ id: string; name: string; method?: string; url?: string }>).find((tab) => tab.id === props.activeTabId)

      return h('div', { 'data-testid': 'request-panel-stub' }, [
        current?.name ?? 'no-active-tab',
        h('div', { 'data-testid': 'request-panel-collapsed-state' }, props.collapsed ? 'collapsed' : 'expanded'),
        h('button', {
          'data-testid': 'request-panel-send',
          onClick: () => {
            if (!current) return
            emit('send', {
              tabId: current.id,
              name: current.name,
              description: '',
              tags: [],
              collectionName: 'Scratch Pad',
              method: current.method ?? 'GET',
              url: current.url ?? 'https://example.com/health',
              params: [],
              headers: [],
              body: '',
              bodyType: 'json',
              auth: baseAuth,
              tests: [],
            })
          },
        }, 'send'),
        h('button', {
          'data-testid': 'request-panel-toggle-collapse',
          onClick: () => emit('toggle-collapsed'),
        }, 'toggle-collapse'),
      ])
    }
  },
})

const ResponsePanelStub = defineComponent({
  name: 'ResponsePanel',
  props: {
    responseBody: { type: String, required: false, default: '' },
    status: { type: Number, required: false, default: 0 },
    requestMethod: { type: String, required: false, default: '' },
    requestUrl: { type: String, required: false, default: '' },
    headers: { type: Array, required: false, default: () => [] },
    state: { type: String, required: false, default: 'idle' },
    stale: { type: Boolean, required: false, default: false },
    collapsed: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    return () => h('div', {
      'data-testid': 'response-panel-stub',
      'data-state': props.state,
      'data-stale': props.stale ? 'true' : 'false',
      'data-collapsed': props.collapsed ? 'true' : 'false',
    }, [
      props.status,
      ' ',
      props.requestMethod,
      ' ',
      props.requestUrl,
      ' ',
      props.responseBody,
      ' ',
      JSON.stringify(props.headers),
    ])
  },
})

const WorkspaceDialogStub = defineComponent({
  name: 'WorkspaceDialog',
  template: '<div data-testid="dialog-stub"></div>',
})

const AppToastListStub = defineComponent({
  name: 'AppToastList',
  template: '<div data-testid="toast-stub"></div>',
})

const mountApp = async () => {
  const wrapper = mount(App, {
    global: {
      stubs: {
        AppHeader: AppHeaderStub,
        AppSidebar: AppSidebarStub,
        RequestPanel: RequestPanelStub,
        ResponsePanel: ResponsePanelStub,
        WorkspaceDialog: WorkspaceDialogStub,
        AppToastList: AppToastListStub,
      },
    },
  })

  await flushPromises()
  await nextTick()
  return wrapper
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaStub,
  })
})

afterEach(() => {
  setRuntimeAdapter(createAdapter())
})

describe('App workbench shell', () => {
  it('shows an app-owned startup screen while the initial bootstrap is pending', async () => {
    window.innerWidth = 1440

    const pendingBootstrap = deferred<ApiEnvelope<AppBootstrapPayload>>()
    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockImplementation(() => pendingBootstrap.promise)

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      bootstrapApp,
    }))

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="startup-screen"]').text()).toContain('Loading ZenRequest')
    expect(wrapper.find('[data-testid="header-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(false)

    pendingBootstrap.resolve(ok(createBootstrapPayload()))
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
  })

  it('removes the static launch placeholder when the app takes over startup rendering', async () => {
    window.innerWidth = 1440

    const pendingBootstrap = deferred<ApiEnvelope<AppBootstrapPayload>>()
    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      bootstrapApp: async () => pendingBootstrap.promise,
    }))

    const launchScreen = document.createElement('div')
    launchScreen.id = 'startup-launch-screen'
    document.body.appendChild(launchScreen)

    const wrapper = await mountApp()

    expect(document.getElementById('startup-launch-screen')).toBeNull()
    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(true)

    pendingBootstrap.resolve(ok(createBootstrapPayload()))
    await flushPromises()
    await nextTick()
  })

  it('shows a startup failure screen and retries bootstrap in place', async () => {
    window.innerWidth = 1440

    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'BOOTSTRAP_FAILED', message: 'Runtime bootstrap failed' },
      })
      .mockResolvedValueOnce(ok(createBootstrapPayload()))

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      bootstrapApp,
    }))

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="startup-screen"]').text()).toContain('Unable to start ZenRequest')
    expect(wrapper.get('[data-testid="startup-retry"]').text()).toContain('Retry startup')
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(false)

    await wrapper.get('[data-testid="startup-retry"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(bootstrapApp).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
  })

  it('shows a workbench-scoped busy overlay while switching workspaces', async () => {
    window.innerWidth = 1440

    const workspaceSwitchDeferred: {
      resolve: (value: ApiEnvelope<{ message: string }>) => void
    } = {
      resolve: () => undefined,
    }
    const workspaceSwitchPromise = new Promise<ApiEnvelope<{ message: string }>>((resolve) => {
      workspaceSwitchDeferred.resolve = resolve
    })

    const initialPayload = createBootstrapPayload()
    initialPayload.workspaces = [
      { id: 'workspace-1', name: 'Primary Workspace' },
      { id: 'workspace-2', name: 'Reports Workspace' },
    ]

    const secondaryPayload = createBootstrapPayload()
    secondaryPayload.workspaces = [
      { id: 'workspace-1', name: 'Primary Workspace' },
      { id: 'workspace-2', name: 'Reports Workspace' },
    ]
    secondaryPayload.activeWorkspaceId = 'workspace-2'

    const bootstrapApp = vi.fn<RuntimeAdapter['bootstrapApp']>()
      .mockResolvedValueOnce(ok(initialPayload))
      .mockResolvedValueOnce(ok(secondaryPayload))

    setRuntimeAdapter(createAdapter(initialPayload, {
      bootstrapApp,
      setActiveWorkspace: async () => workspaceSwitchPromise,
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="header-switch-workspace"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="workbench-busy-overlay"]').text()).toContain('Loading workspace')
    expect(wrapper.get('[data-testid="workbench-busy-surface"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('[data-testid="request-panel-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="response-panel-stub"]').exists()).toBe(true)

    workspaceSwitchDeferred.resolve(ok({ message: 'ok' }))
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="workbench-busy-overlay"]').exists()).toBe(false)
  })

  it('keeps the header interactive while a request is sending', async () => {
    window.innerWidth = 1440

    const requestDeferred = deferred<ApiEnvelope<{
      requestMethod: string
      requestUrl: string
      status: number
      statusText: string
      elapsedMs: number
      sizeBytes: number
      contentType: string
      responseBody: string
      headers: Array<{ key: string; value: string }>
      truncated: boolean
    }>>()

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), {
      sendRequest: async () => requestDeferred.promise,
    }))

    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="header-stub"]').attributes('data-workspace-busy')).toBe('false')
    expect(wrapper.find('[data-testid="workbench-busy-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="response-panel-stub"]').attributes('data-state')).toBe('pending')
    expect(wrapper.get('[data-testid="response-panel-stub"]').attributes('data-stale')).toBe('true')

    requestDeferred.resolve(ok({
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
    }))
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[data-testid="header-stub"]').attributes('data-workspace-busy')).toBe('false')
  })

  it('collapses the request pane as a layout state and restores it on the next toggle', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()
    const panels = () => wrapper.findAll('[data-testid="resizable-panel"]')

    expect(panels()[2]?.attributes('data-state')).toBe('expanded')

    await wrapper.get('[data-testid="request-panel-toggle-collapse"]').trigger('click')
    await nextTick()

    expect(panels()[2]?.attributes('data-state')).toBe('collapsed')
    expect(wrapper.get('[data-testid="request-panel-collapsed-state"]').text()).toBe('collapsed')

    await wrapper.get('[data-testid="request-panel-toggle-collapse"]').trigger('click')
    await nextTick()

    expect(panels()[2]?.attributes('data-state')).toBe('expanded')
    expect(wrapper.get('[data-testid="request-panel-collapsed-state"]').text()).toBe('expanded')
  })

  it('renders distinct desktop workbench regions after bootstrap', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="workbench-sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-response"]').exists()).toBe(true)
  })

  it('preserves the active request context when toggling compact navigation', async () => {
    window.innerWidth = 960
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="workbench-sidebar"]').exists()).toBe(false)

    await wrapper.get('[data-testid="header-nav-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-explorer-sheet"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="request-panel-stub"]').text()).toContain('Orders Lookup')

    await wrapper.get('[data-testid="header-nav-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="request-panel-stub"]').text()).toContain('Orders Lookup')
    expect(wrapper.find('[data-testid="workbench-response"]').exists()).toBe(true)
  })

  it('renders splitter lines without handle buttons', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    const handles = wrapper.findAll('[data-testid="resize-handle-stub"]')

    expect(handles.length).toBeGreaterThan(0)
    expect(handles.every((handle) => handle.attributes('data-with-handle') === 'false')).toBe(true)
  })

  it('renders tighter splitter gaps after removing handle buttons', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    const groups = wrapper.findAll('[data-testid="resizable-group"]')
    const handles = wrapper.findAll('[data-testid="resize-handle-stub"]')

    expect(groups.length).toBe(2)
    expect(groups.every((group) => group.classes().includes('gap-1'))).toBe(true)
    expect(handles[0]?.classes()).toContain('w-1')
    expect(handles[1]?.classes()).toContain('h-1')
  })

  it('keeps the three workbench regions shrinkable for internal vertical scrolling', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="workbench-sidebar"]').classes()).toContain('min-h-0')
    expect(wrapper.get('[data-testid="workbench-request"]').classes()).toContain('min-h-0')
    expect(wrapper.get('[data-testid="workbench-response"]').classes()).toContain('min-h-0')
  })

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
})
