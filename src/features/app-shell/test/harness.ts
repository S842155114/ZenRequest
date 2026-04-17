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

import App from '@/App.vue'
import { setRuntimeAdapter } from '@/lib/tauri-client'
import type {
  ApiEnvelope,
  AppBootstrapPayload,
  OpenApiImportAnalysis,
  OpenApiImportApplyResult,
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

const createOpenApiAnalysis = (): OpenApiImportAnalysis => ({
  version: '1',
  workspaceId: 'workspace-1',
  sourceKind: 'openapi',
  summary: {
    totalOperationCount: 2,
    importableRequestCount: 1,
    skippedOperationCount: 1,
    warningDiagnosticCount: 1,
  },
  diagnostics: [
    {
      code: 'OPENAPI_MISSING_SERVER',
      severity: 'warning',
      message: 'no server definition found; request URL will stay path-relative',
      location: 'GET /pets',
    },
  ],
  groupingSuggestions: [{ name: 'Petstore - Pets', requestCount: 1 }],
  candidates: [
    {
      collectionName: 'Petstore - Pets',
      request: {
        id: 'request-openapi-candidate',
        name: 'List pets',
        description: '',
        tags: ['pets'],
        collectionId: 'collection-pets',
        collectionName: 'Petstore - Pets',
        method: 'GET',
        url: 'https://api.example.com/pets',
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
    },
  ],
})

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
  importCurlRequest: async (_workspaceId: string, _command: string) =>
    ok({
      id: 'tab-imported-curl',
      name: 'Imported Curl Request',
      description: '',
      tags: ['imported'],
      collectionName: 'Scratch Pad',
      method: 'GET',
      url: 'https://example.com/imported',
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
        status: 0,
        statusText: 'READY',
        time: '0 ms',
        size: '0 B',
        headers: [],
        contentType: 'application/json',
        requestMethod: 'GET',
        requestUrl: 'https://example.com/imported',
        testResults: [],
      },
      origin: { kind: 'scratch' as const },
      persistenceState: 'unsaved' as const,
      executionState: 'idle' as const,
      isSending: false,
      isDirty: true,
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
  analyzeOpenApiImport: async (_workspaceId: string, _document: string) => ok(createOpenApiAnalysis()),
  applyOpenApiImport: async (_workspaceId: string, _analysis: OpenApiImportAnalysis) =>
    ok<OpenApiImportApplyResult>({
      importedRequestCount: 1,
      skippedOperationCount: 1,
      warningDiagnosticCount: 1,
      collectionNames: ['Petstore - Pets'],
    }),
  getSettings: async () => ok<AppSettings>({ themeMode: 'dark', locale: 'en' }),
  updateSettings: async (payload: AppSettings) => ok(payload),
  saveTextFile: async (input) => ok({ path: input.targetPath ?? input.fileName }),
  promptSavePath: async (options) => options?.defaultPath ?? null,
  sendMcpRequest: async (_payload) =>
    ({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'send_mcp_request is not implemented yet' } }),
  discoverMcpTools: async (_payload) => ok([]),
  discoverMcpResources: async (_payload) => ok([]),
  discoverMcpPrompts: async (_payload) => ok([]),
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
    showOpenApiImport: { type: Boolean, required: false, default: false },
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
  emits: ['send', 'toggle-collapsed', 'save-tab', 'select-tab', 'close-tab', 'import-curl', 'import-openapi'],
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
              requestId: (current as { requestId?: string }).requestId,
              requestKind: (current as { requestKind?: 'http' | 'mcp' }).requestKind,
              mcp: (current as { mcp?: unknown }).mcp,
              name: current.name,
              description: (current as { description?: string }).description ?? '',
              tags: (current as { tags?: string[] }).tags ?? [],
              collectionName: (current as { collectionName?: string }).collectionName ?? 'Scratch Pad',
              method: current.method ?? 'GET',
              url: current.url ?? 'https://example.com/health',
              params: (current as { params?: unknown[] }).params ?? [],
              headers: (current as { headers?: unknown[] }).headers ?? [],
              body: (current as { body?: string }).body ?? '',
              bodyType: (current as { bodyType?: string }).bodyType ?? 'json',
              auth: (current as { auth?: typeof baseAuth }).auth ?? baseAuth,
              tests: (current as { tests?: unknown[] }).tests ?? [],
              executionOptions: (current as { executionOptions?: unknown }).executionOptions,
              mock: (current as { mock?: unknown }).mock,
            })
          },
        }, 'send'),
        h('button', {
          'data-testid': 'request-panel-toggle-collapse',
          onClick: () => emit('toggle-collapsed'),
        }, 'toggle-collapse'),
        h('button', {
          'data-testid': 'request-panel-import-curl',
          onClick: () => emit('import-curl'),
        }, 'import-curl'),
        props.showOpenApiImport
          ? h('button', {
              'data-testid': 'request-panel-import-openapi',
              onClick: () => emit('import-openapi'),
            }, 'import-openapi')
          : null,
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
    testResults: { type: Array, required: false, default: () => [] },
    state: { type: String, required: false, default: 'idle' },
    stale: { type: Boolean, required: false, default: false },
    executionSource: { type: String, required: false, default: 'live' },
    collapsed: { type: Boolean, required: false, default: false },
  },
  emits: ['create-mock-template'],
  setup(props, { emit }) {
    return () => h('div', {
      'data-testid': 'response-panel-stub',
      'data-state': props.state,
      'data-stale': props.stale ? 'true' : 'false',
      'data-execution-source': props.executionSource,
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
      ' ',
      JSON.stringify(props.testResults),
      h('button', {
        'data-testid': 'response-panel-create-mock',
        onClick: () => emit('create-mock-template'),
      }, 'create-mock'),
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
    detailsReadonly: { type: Boolean, default: false },
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
        'data-testid': 'dialog-close',
        onClick: () => emit('close'),
      }, 'close'),
      h('button', {
        'data-testid': 'dialog-secondary-action',
        onClick: () => emit('secondary-action'),
      }, props.secondaryActionText || 'secondary'),
    ])
  },
})

const AppToastListStub = defineComponent({
  name: 'AppToastList',
  props: { items: { type: Array, required: false, default: () => [] } },
  template: '<div data-testid="toast-stub">{{ JSON.stringify(items) }}</div>',
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


export {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  defineComponent,
  h,
  nextTick,
  ref,
  watch,
  flushPromises,
  mount,
  ok,
  deferred,
  matchMediaStub,
  createBootstrapPayload,
  createStoredSnapshot,
  createAdapter,
  createOpenApiAnalysis,
  AppHeaderStub,
  AppSidebarStub,
  RequestPanelStub,
  ResponsePanelStub,
  WorkspaceDialogStub,
  AppToastListStub,
  mountApp,
  getRequestPanelTabs,
  getActiveRequestPanelTab,
  setRuntimeAdapter,
}

export type {
  ApiEnvelope,
  AppBootstrapPayload,
  RuntimeAdapter,
  ThemeMode,
  HistoryItem,
  RequestCollection,
  RequestPreset,
  WorkspaceSessionSnapshot,
  WorkspaceSummary,
}
