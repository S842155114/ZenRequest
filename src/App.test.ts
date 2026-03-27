import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, watch } from 'vue'
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
  ThemeMode,
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

const createStoredSnapshot = (themeMode: ThemeMode = 'light') => {
  const payload = createBootstrapPayload()
  const session = payload.session!

  return {
    locale: payload.settings.locale,
    themeMode,
    activeEnvironmentId: session.activeEnvironmentId,
    environments: payload.environments,
    collections: payload.collections,
    historyItems: payload.history,
    openTabs: session.openTabs,
    activeTabId: session.activeTabId,
  }
}

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
    collections: { type: Array, required: false, default: () => [] },
    historyItems: { type: Array, required: false, default: () => [] },
    activityProjection: {
      type: Object,
      required: false,
      default: () => ({
        summary: { open: 0, dirty: 0, running: 0, recovered: 0 },
        requests: {},
        history: {},
        tabs: {},
      }),
    },
  },
  emits: ['select-history', 'select-request', 'delete-request'],
  setup(props, { emit }) {
    return () => h('div', { 'data-testid': 'sidebar-stub' }, [
      'sidebar',
      h('div', {
        'data-testid': 'resource-context-surface',
        'data-resource-context-menu-surface': 'true',
      }, 'resource-surface'),
      h('button', {
        'data-testid': 'sidebar-select-request',
        onClick: () => {
          const firstCollection = (props.collections as RequestCollection[])[0]
          const firstRequest = firstCollection?.requests[0]
          if (firstCollection && firstRequest) {
            emit('select-request', firstRequest)
          }
        },
      }, 'select-request'),
      h('button', {
        'data-testid': 'sidebar-delete-request',
        onClick: () => {
          const firstCollection = (props.collections as RequestCollection[])[0]
          const firstRequest = firstCollection?.requests[0]
          if (firstCollection && firstRequest) {
            emit('delete-request', { collectionName: firstCollection.name, requestId: firstRequest.id })
          }
        },
      }, 'delete-request'),
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
    activityProjection: {
      type: Object,
      required: false,
      default: () => ({
        summary: { open: 0, dirty: 0, running: 0, recovered: 0 },
        requests: {},
        history: {},
        tabs: {},
      }),
    },
  },
  emits: ['send', 'toggle-collapsed', 'save-tab', 'select-tab', 'close-tab'],
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
        h('input', {
          'data-testid': 'native-context-input',
          'data-native-context-menu': 'true',
        }),
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
        ...((props.tabs as Array<{ id: string; name: string }>).map((tab) => h('button', {
          'data-testid': `request-panel-save-${tab.id}`,
          onClick: () => emit('save-tab', tab.id),
        }, `save-${tab.id}`))),
        ...((props.tabs as Array<{ id: string; name: string }>).map((tab) => h('button', {
          'data-testid': `request-panel-close-${tab.id}`,
          onClick: () => emit('close-tab', tab.id),
        }, `close-${tab.id}`))),
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
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    confirmText: { type: String, default: '' },
    nameValue: { type: String, default: '' },
    detailsValue: { type: String, default: '' },
    tagsValue: { type: String, default: '' },
    selectValue: { type: String, default: '' },
    secondaryActionText: { type: String, default: '' },
    variant: { type: String, default: 'default' },
    highlightLabel: { type: String, default: '' },
    contextBadges: { type: Array, default: () => [] },
  },
  emits: ['submit', 'close', 'secondary-action'],
  setup(props, { emit }) {
    const localName = ref(props.nameValue)
    const localDetails = ref(props.detailsValue)
    const localTags = ref(props.tagsValue)
    const localSelect = ref(props.selectValue)

    watch(
      () => [props.open, props.nameValue, props.detailsValue, props.tagsValue, props.selectValue],
      () => {
        localName.value = props.nameValue
        localDetails.value = props.detailsValue
        localTags.value = props.tagsValue
        localSelect.value = props.selectValue
      },
      { immediate: true },
    )

    return () => h('div', {
      'data-testid': 'dialog-stub',
      'data-open': props.open ? 'true' : 'false',
      'data-title': props.title,
      'data-description': props.description,
      'data-confirm-text': props.confirmText,
      'data-details-value': localDetails.value,
      'data-secondary-action-text': props.secondaryActionText,
      'data-variant': props.variant,
      'data-highlight-label': props.highlightLabel,
      'data-context-badges': JSON.stringify(props.contextBadges),
    }, [
      h('input', {
        'data-testid': 'dialog-name-input',
        value: localName.value,
        onInput: (event: Event) => {
          localName.value = (event.target as HTMLInputElement).value
        },
      }),
      h('textarea', {
        'data-testid': 'dialog-details-input',
        value: localDetails.value,
        onInput: (event: Event) => {
          localDetails.value = (event.target as HTMLTextAreaElement).value
        },
      }),
      h('button', {
        'data-testid': 'dialog-submit',
        onClick: () => emit('submit', {
          nameValue: localName.value,
          detailsValue: localDetails.value,
          tagsValue: localTags.value,
          selectValue: localSelect.value,
        }),
      }, 'submit'),
      h('button', {
        'data-testid': 'dialog-secondary-action',
        onClick: () => emit('secondary-action'),
      }, props.secondaryActionText || 'secondary'),
    ])
  },
})

const AppToastListStub = defineComponent({
  name: 'AppToastList',
  template: '<div data-testid="toast-stub"></div>',
})

const mountApp = async () => {
  const wrapper = mount(App, {
    attachTo: document.body,
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

const getRequestPanelTabs = (wrapper: Awaited<ReturnType<typeof mountApp>>) =>
  wrapper.findComponent(RequestPanelStub).props('tabs') as Array<Record<string, any>>

const getActiveRequestPanelTab = (wrapper: Awaited<ReturnType<typeof mountApp>>) => {
  const activeTabId = wrapper.findComponent(RequestPanelStub).props('activeTabId') as string
  return getRequestPanelTabs(wrapper).find((tab) => tab.id === activeTabId)
}

beforeEach(() => {
  const storage = new Map<string, string>()

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaStub,
  })
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    },
  })
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.startupTheme
})

afterEach(() => {
  setRuntimeAdapter(createAdapter())
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.startupTheme
  document.body.innerHTML = ''
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

  it('keeps the static launch placeholder until runtime theme alignment completes', async () => {
    window.innerWidth = 1440

    const pendingBootstrap = deferred<ApiEnvelope<AppBootstrapPayload>>()
    const lightPayload = createBootstrapPayload()
    lightPayload.settings.themeMode = 'light'
    window.localStorage.setItem('zenrequest.workspace', JSON.stringify(createStoredSnapshot('light')))

    setRuntimeAdapter(createAdapter(lightPayload, {
      bootstrapApp: async () => pendingBootstrap.promise,
    }))

    const launchScreen = document.createElement('div')
    launchScreen.id = 'startup-launch-screen'
    document.body.appendChild(launchScreen)

    const wrapper = await mountApp()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.startupTheme).toBe('light')
    expect(document.getElementById('startup-launch-screen')).not.toBeNull()
    expect(wrapper.find('[data-testid="startup-screen"]').exists()).toBe(true)

    pendingBootstrap.resolve(ok(lightPayload))
    await flushPromises()
    await nextTick()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.startupTheme).toBe('light')
    expect(document.getElementById('startup-launch-screen')).toBeNull()
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
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

    const launchScreen = document.createElement('div')
    launchScreen.id = 'startup-launch-screen'
    document.body.appendChild(launchScreen)

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="startup-screen"]').text()).toContain('Unable to start ZenRequest')
    expect(wrapper.get('[data-testid="startup-retry"]').text()).toContain('Retry startup')
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(false)
    expect(document.getElementById('startup-launch-screen')).toBeNull()

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

    expect(wrapper.find('[data-testid="workbench-carrier"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workbench-carrier"]').classes()).toContain('zr-workbench-carrier')
    expect(wrapper.get('[data-testid="workbench-layout-desktop"]').classes()).toContain('zr-workbench-layout-desktop')
    expect(wrapper.find('[data-testid="workbench-sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-request"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-response"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workbench-sidebar"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-sidebar']),
    )
    expect(wrapper.get('[data-testid="workbench-request"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-request']),
    )
    expect(wrapper.get('[data-testid="workbench-response"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-response']),
    )
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

    const handles = [
      wrapper.get('[data-testid="workbench-seam-sidebar-request"]'),
      wrapper.get('[data-testid="workbench-seam-request-response"]'),
    ]

    expect(handles.length).toBeGreaterThan(0)
    expect(handles.every((handle) => handle.attributes('data-with-handle') === 'false')).toBe(true)
  })

  it('renders tighter splitter gaps after removing handle buttons', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    const groups = [
      wrapper.get('[data-testid="workbench-layout-desktop"]'),
      wrapper.get('[data-testid="workbench-stack-desktop"]'),
    ]
    const sidebarSeam = wrapper.get('[data-testid="workbench-seam-sidebar-request"]')
    const responseSeam = wrapper.get('[data-testid="workbench-seam-request-response"]')

    expect(groups.length).toBe(2)
    expect(groups.every((group) => group.classes().includes('gap-[var(--zr-workbench-seam-gap)]'))).toBe(true)
    expect(sidebarSeam.classes()).toEqual(
      expect.arrayContaining(['zr-workbench-seam', 'zr-workbench-seam-vertical', 'w-[var(--zr-workbench-seam-size)]']),
    )
    expect(responseSeam.classes()).toEqual(
      expect.arrayContaining(['zr-workbench-seam', 'zr-workbench-seam-horizontal', 'h-[var(--zr-workbench-seam-size)]']),
    )
  })

  it('keeps the three workbench regions shrinkable for internal vertical scrolling', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="workbench-sidebar"]').classes()).toContain('min-h-0')
    expect(wrapper.get('[data-testid="workbench-request"]').classes()).toContain('min-h-0')
    expect(wrapper.get('[data-testid="workbench-response"]').classes()).toContain('min-h-0')
  })

  it('keeps the connected docked-segment language in compact layout', async () => {
    window.innerWidth = 960
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    expect(wrapper.get('[data-testid="workbench-carrier"]').classes()).toContain('zr-workbench-carrier')
    expect(wrapper.get('[data-testid="workbench-layout-compact"]').classes()).toContain('zr-workbench-layout-compact')
    expect(wrapper.get('[data-testid="workbench-request"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-request']),
    )
    expect(wrapper.get('[data-testid="workbench-response"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-segment', 'zr-workbench-segment-response']),
    )
    expect(wrapper.get('[data-testid="workbench-seam-request-response"]').classes()).toEqual(
      expect.arrayContaining(['zr-workbench-seam', 'zr-workbench-seam-horizontal']),
    )
  })

  it('suppresses global context menus on unsupported surfaces while allowing whitelisted targets', async () => {
    window.innerWidth = 1440
    setRuntimeAdapter(createAdapter())

    const wrapper = await mountApp()

    const blockedEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    wrapper.get('[data-testid="workbench-response"]').element.dispatchEvent(blockedEvent)
    expect(blockedEvent.defaultPrevented).toBe(true)

    const allowedEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    wrapper.get('[data-testid="resource-context-surface"]').element.dispatchEvent(allowedEvent)
    expect(allowedEvent.defaultPrevented).toBe(false)

    const nativeInputEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    wrapper.get('[data-testid="native-context-input"]').element.dispatchEvent(nativeInputEvent)
    expect(nativeInputEvent.defaultPrevented).toBe(false)
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
