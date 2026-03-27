import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/components/ui/resizable', () => {
  const ResizablePanelGroup = defineComponent({
    name: 'ResizablePanelGroup',
    template: '<div data-testid="resizable-group" v-bind="$attrs"><slot /></div>',
  })
  const ResizablePanel = defineComponent({
    name: 'ResizablePanel',
    template: '<div data-testid="resizable-panel" v-bind="$attrs"><slot /></div>',
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
  emits: ['toggle-navigation', 'update:active-workspace-id'],
  template: `
    <div data-testid="header-stub">
      <button data-testid="header-nav-toggle" @click="$emit('toggle-navigation')">toggle</button>
      <button data-testid="header-switch-workspace" @click="$emit('update:active-workspace-id', 'workspace-2')">switch-workspace</button>
    </div>
  `,
})

const AppSidebarStub = defineComponent({
  name: 'AppSidebar',
  template: `
    <div data-testid="sidebar-stub">
      <div data-testid="resource-context-surface" data-resource-context-menu-surface="true">resource-surface</div>
    </div>
  `,
})

const RequestPanelStub = defineComponent({
  name: 'RequestPanel',
  props: {
    activeTabId: { type: String, required: false, default: '' },
    tabs: { type: Array, required: false, default: () => [] },
  },
  setup(props) {
    return () => {
      const current = (props.tabs as Array<{ id: string; name: string }>).find((tab) => tab.id === props.activeTabId)
      return h('div', { 'data-testid': 'request-panel-stub' }, [
        h('div', current?.name ?? 'no-active-tab'),
        h('input', {
          'data-testid': 'native-context-input',
          'data-native-context-menu': 'true',
        }),
      ])
    }
  },
})

const ResponsePanelStub = defineComponent({
  name: 'ResponsePanel',
  template: '<div data-testid="response-panel-stub">response</div>',
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

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaStub,
  })
})

afterEach(() => {
  setRuntimeAdapter(createAdapter())
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
})
