import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/components/ui/resizable', () => {
  const ResizablePanelGroup = defineComponent({
    name: 'ResizablePanelGroup',
    template: '<div v-bind="$attrs"><slot /></div>',
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
      const collapse = () => { collapsed.value = true; emit('collapse') }
      const expand = () => {
        collapsed.value = false
        emit('expand')
        emit('resize', size.value ?? props.defaultSize ?? 0, props.collapsedSize)
      }
      const resize = (nextSize: number) => { size.value = nextSize; emit('resize', nextSize, undefined) }
      expose({ collapse, expand, resize })
      return () => h('div', { ...attrs, 'data-testid': 'resizable-panel' }, slots.default?.())
    },
  })
  const ResizableHandle = defineComponent({ name: 'ResizableHandle', template: '<div></div>' })
  return { ResizablePanelGroup, ResizablePanel, ResizableHandle }
})

vi.mock('@/components/ui/sheet', () => {
  const Sheet = defineComponent({
    name: 'Sheet',
    props: { open: { type: Boolean, default: false } },
    emits: ['update:open'],
    setup(_props, { slots }) { return () => h('div', slots.default?.()) },
  })
  const SheetContent = defineComponent({ name: 'SheetContent', setup(_p, { slots }) { return () => h('div', slots.default?.()) } })
  const SheetHeader = defineComponent({ name: 'SheetHeader', setup(_p, { slots }) { return () => h('div', slots.default?.()) } })
  const SheetTitle = defineComponent({ name: 'SheetTitle', setup(_p, { slots }) { return () => h('div', slots.default?.()) } })
  const SheetDescription = defineComponent({ name: 'SheetDescription', setup(_p, { slots }) { return () => h('div', slots.default?.()) } })
  return { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription }
})

vi.mock('@/components/AppHeader.vue', () => ({
  default: defineComponent({
    name: 'AppHeader',
    props: { workspaceBusy: { type: Boolean, default: false } },
    emits: ['toggle-navigation', 'update:active-workspace-id'],
    template: '<div data-testid="header-stub"></div>',
  }),
}))

const SidebarStub = defineComponent({
  name: 'AppSidebar',
  props: {
    collections: { type: Array, required: false, default: () => [] },
    historyItems: { type: Array, required: false, default: () => [] },
    activityProjection: {
      type: Object,
      required: false,
      default: () => ({ summary: { open: 0, dirty: 0, running: 0, recovered: 0 }, requests: {}, history: {}, tabs: {} }),
    },
  },
  emits: ['select-history', 'select-request', 'delete-request'],
  setup(props, { emit }) {
    return () => h('div', { 'data-testid': 'sidebar-stub' }, [
      h('button', {
        'data-testid': 'sidebar-select-history',
        onClick: () => {
          const first = (props.historyItems as Array<Record<string, unknown>>)[0]
          if (first) emit('select-history', first)
        },
      }, 'select-history'),
    ])
  },
})

vi.mock('@/components/AppSidebar.vue', () => ({ default: SidebarStub }))

const RequestPanelStub = defineComponent({
  name: 'RequestPanel',
  props: {
    activeTabId: { type: String, required: false, default: '' },
    tabs: { type: Array, required: false, default: () => [] },
    collapsed: { type: Boolean, required: false, default: false },
    activityProjection: {
      type: Object,
      required: false,
      default: () => ({ summary: { open: 0, dirty: 0, running: 0, recovered: 0 }, requests: {}, history: {}, tabs: {} }),
    },
  },
  emits: ['send', 'toggle-collapsed', 'save-tab', 'select-tab', 'close-tab', 'import-curl'],
  setup(props, { emit }) {
    return () => {
      const tabs = props.tabs as RequestTabState[]
      const current = tabs.find((tab) => tab.id === props.activeTabId)
      return h('div', { 'data-testid': 'request-panel-stub' }, [
        current?.name ?? 'no-active-tab',
        h('button', {
          'data-testid': 'request-panel-send',
          onClick: () => {
            if (!current) return
            emit('send', {
              tabId: current.id,
              requestId: current.requestId,
              name: current.name,
              description: '',
              tags: [],
              collectionName: 'Scratch Pad',
              method: current.method,
              url: current.url,
              params: [],
              headers: [],
              body: '',
              bodyType: current.bodyType,
              bodyContentType: current.bodyContentType,
              formDataFields: current.formDataFields,
              binaryFileName: current.binaryFileName,
              binaryMimeType: current.binaryMimeType,
              auth: current.auth,
              tests: current.tests,
              mock: current.mock,
            })
          },
        }, 'send'),
      ])
    }
  },
})

vi.mock('@/components/RequestPanel.vue', () => ({ default: RequestPanelStub }))

vi.mock('@/components/ResponsePanel.vue', () => ({
  default: defineComponent({
    name: 'ResponsePanel',
    props: {
      status: { type: Number, required: false, default: 0 },
      responseBody: { type: String, required: false, default: '' },
      headers: { type: Array, required: false, default: () => [] },
      testResults: { type: Array, required: false, default: () => [] },
      state: { type: String, required: false, default: 'idle' },
      stale: { type: Boolean, required: false, default: false },
      executionSource: { type: String, required: false, default: 'live' },
      collapsed: { type: Boolean, required: false, default: false },
    },
    emits: ['create-mock-template'],
    setup(props) {
      return () => h('div', { 'data-testid': 'response-panel-stub', 'data-state': props.state })
    },
  }),
}))

vi.mock('@/components/WorkspaceNavigationDrawer.vue', () => ({
  default: defineComponent({ name: 'WorkspaceNavigationDrawer', template: '<div></div>' }),
}))

vi.mock('@/components/EnvironmentManager.vue', () => ({
  default: defineComponent({ name: 'EnvironmentManager', template: '<div></div>' }),
}))

import App from './App.vue'
import { setRuntimeAdapter } from '@/lib/tauri-client'
import type {
  ApiEnvelope,
  AppBootstrapPayload,
  AppSettings,
  OpenApiImportAnalysis,
  OpenApiImportApplyResult,
  RuntimeAdapter,
  RuntimeCapabilityDescriptor,
  SendRequestPayloadDto,
  WorkspaceExportResult,
  WorkspaceImportResult,
  WorkspaceSaveResult,
} from '@/lib/tauri-client'
import type {
  EnvironmentPreset,
  HistoryItem,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  WorkspaceSessionSnapshot,
  WorkspaceSummary,
} from '@/types/request'

const ok = <T>(data: T): ApiEnvelope<T> => ({ ok: true, data })

const baseAuth = {
  type: 'none' as const,
  bearerToken: '',
  username: '',
  password: '',
  apiKeyKey: '',
  apiKeyValue: '',
  apiKeyPlacement: 'header' as const,
}

const createBootstrapPayload = (): AppBootstrapPayload => ({
  settings: { themeMode: 'dark', locale: 'en' },
  workspaces: [{ id: 'workspace-1', name: 'Primary Workspace' }],
  activeWorkspaceId: 'workspace-1',
  collections: [],
  environments: [{ id: 'env-local', name: 'Local', variables: [] }],
  history: [],
  session: {
    activeEnvironmentId: 'env-local',
    activeTabId: 'tab-1',
    openTabs: [
      {
        id: 'tab-1',
        name: 'Orders',
        description: '',
        tags: [],
        collectionName: 'Scratch Pad',
        method: 'POST',
        url: 'https://example.com/orders',
        params: [],
        headers: [],
        body: '',
        bodyType: 'json',
        auth: baseAuth,
        tests: [],
        response: {
          responseBody: '{}',
          status: 0,
          statusText: 'READY',
          time: '0 ms',
          size: '0 B',
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
    ok<WorkspaceExportResult>({ fileName: 'export.json', packageJson: '{}', scope: 'workspace' }),
  importWorkspace: async (_packageJson: string) => ok<WorkspaceImportResult>({
    scope: 'workspace',
    workspace: { id: 'workspace-1', name: 'Imported' },
    importedWorkspaceCount: 1,
    activeWorkspaceId: 'workspace-1',
  }),
  importCurlRequest: async (_workspaceId: string, _command: string) => ok<RequestTabState>({
    id: 'tab-curl',
    name: 'Curl',
    description: '',
    tags: [],
    collectionName: 'Scratch Pad',
    method: 'GET',
    url: 'https://example.com',
    params: [],
    headers: [],
    body: '',
    bodyType: 'json' as const,
    auth: baseAuth,
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
      requestUrl: 'https://example.com',
      testResults: [],
    },
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
  analyzeOpenApiImport: async (_workspaceId: string, _document: string) => ok<OpenApiImportAnalysis>({
    version: '1',
    workspaceId: 'workspace-1',
    sourceKind: 'openapi',
    summary: {
      totalOperationCount: 1,
      importableRequestCount: 1,
      skippedOperationCount: 0,
      warningDiagnosticCount: 0,
    },
    diagnostics: [],
    groupingSuggestions: [],
    candidates: [],
  }),
  applyOpenApiImport: async (_workspaceId: string, _analysis: OpenApiImportAnalysis) =>
    ok<OpenApiImportApplyResult>({
      importedRequestCount: 1,
      skippedOperationCount: 0,
      warningDiagnosticCount: 0,
      collectionNames: ['Imported OpenAPI'],
    }),
  getSettings: async () => ok<AppSettings>({ themeMode: 'dark', locale: 'en' }),
  updateSettings: async (payload: AppSettings) => ok(payload),
  sendRequest: async (_payload: SendRequestPayloadDto) =>
    ({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } }),
  ...overrides,
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
        AppHeader: defineComponent({ name: 'AppHeader', props: { workspaceBusy: { type: Boolean, default: false } }, emits: ['toggle-navigation', 'update:active-workspace-id'], template: '<div data-testid="header-stub"></div>' }),
        AppSidebar: SidebarStub,
        RequestPanel: RequestPanelStub,
        ResponsePanel: defineComponent({ name: 'ResponsePanel', props: { state: { type: String, default: 'idle' } }, emits: ['create-mock-template'], template: '<div data-testid="response-panel-stub"></div>' }),
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
  wrapper.findComponent(RequestPanelStub).props('tabs') as RequestTabState[]

const getActiveRequestPanelTab = (wrapper: Awaited<ReturnType<typeof mountApp>>) => {
  const activeTabId = wrapper.findComponent(RequestPanelStub).props('activeTabId') as string
  return getRequestPanelTabs(wrapper).find((tab) => tab.id === activeTabId)
}

const matchMediaStub = (query: string) => ({
  matches: query === '(prefers-color-scheme: dark)',
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})

beforeEach(() => {
  const storage = new Map<string, string>()
  Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaStub })
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
      clear: () => { storage.clear() },
    },
  })
  window.localStorage.clear()
  window.innerWidth = 1440
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.startupTheme
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Stage Gate Tests', () => {
  // ---------------------------------------------------------------------------
  // Gate B: Contract Parity
  // Non-default canonical fields (bodyContentType, formDataFields,
  // binaryFileName, auth, tests) must survive the send → history round-trip.
  // ---------------------------------------------------------------------------
  it('[Gate B: Contract Parity] history snapshot preserves all canonical request fields after send', async () => {
    const payload = createBootstrapPayload()
    payload.session!.openTabs[0] = {
      ...payload.session!.openTabs[0],
      bodyType: 'formdata',
      formDataFields: [{ key: 'file', value: '', enabled: true, fileName: 'report.csv', mimeType: 'text/csv' }],
      auth: {
        type: 'bearer',
        bearerToken: 'my-token',
        username: '',
        password: '',
        apiKeyKey: '',
        apiKeyValue: '',
        apiKeyPlacement: 'header' as const,
      },
      tests: [{ id: 'test-1', name: 'Status is 200', source: 'status', operator: 'equals', expected: '200' }],
    }

    const historyItem: HistoryItem = {
      id: 'history-gate-b-1',
      name: 'Orders',
      method: 'POST',
      time: '10:00:00',
      status: 200,
      url: 'https://example.com/orders',
      statusText: 'OK',
      elapsedMs: 10,
      sizeBytes: 32,
      contentType: 'application/json',
      truncated: false,
      responseHeaders: [],
      responsePreview: '{"ok":true}',
      executionSource: 'live' as const,
      requestSnapshot: {
        workspaceId: 'workspace-1',
        activeEnvironmentId: 'env-local',
        tabId: 'tab-1',
        name: 'Orders',
        description: '',
        tags: [],
        collectionName: 'Scratch Pad',
        method: 'POST',
        url: 'https://example.com/orders',
        params: [],
        headers: [],
        body: {
          kind: 'formData' as const,
          fields: [{ key: 'file', value: '', enabled: true, fileName: 'report.csv', mimeType: 'text/csv' }],
        },
        bodyType: 'formdata' as const,
        auth: {
          type: 'bearer',
          bearerToken: 'my-token',
          username: '',
          password: '',
          apiKeyKey: '',
          apiKeyValue: '',
          apiKeyPlacement: 'header' as const,
        },
        tests: [{ id: 'test-1', name: 'Status is 200', source: 'status', operator: 'equals', expected: '200' }],
      },
    } as unknown as HistoryItem

    const sendRequest = vi.fn(async () => ok({
      requestMethod: 'POST',
      requestUrl: 'https://example.com/orders',
      status: 200,
      statusText: 'OK',
      elapsedMs: 10,
      sizeBytes: 32,
      contentType: 'application/json',
      responseBody: '{"ok":true}',
      headers: [],
      truncated: false,
      executionSource: 'live' as const,
      historyItem,
    }))

    setRuntimeAdapter(createAdapter(payload, { sendRequest }))
    const wrapper = await mountApp()

    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await flushPromises()
    await nextTick()

    // History list must contain the new entry
    const historyItems = wrapper.findComponent(SidebarStub).props('historyItems') as HistoryItem[]
    expect(historyItems).toHaveLength(1)
    expect(historyItems[0]?.id).toBe('history-gate-b-1')

    // Restore from history — restored tab must carry all canonical fields
    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await nextTick()

    const restoredTab = getActiveRequestPanelTab(wrapper)
    expect(restoredTab?.bodyType).toBe('formdata')
    expect(restoredTab?.formDataFields).toEqual([{ key: 'file', value: '', enabled: true, fileName: 'report.csv', mimeType: 'text/csv' }])
    expect(restoredTab?.auth.type).toBe('bearer')
    expect(restoredTab?.auth.bearerToken).toBe('my-token')
    expect(restoredTab?.tests).toEqual([{ id: 'test-1', name: 'Status is 200', source: 'status', operator: 'equals', expected: '200' }])
  })

  // ---------------------------------------------------------------------------
  // Gate C: Mainline Loop
  // bootstrap → tab present → send → history entry appears →
  // history restore → restored tab state matches the sent request
  // ---------------------------------------------------------------------------
  it('[Gate C: Mainline Loop] full round-trip from bootstrap through send to history restore', async () => {
    const historyItem: HistoryItem = {
      id: 'history-gate-c-1',
      name: 'Orders',
      method: 'POST',
      time: '10:00:00',
      status: 201,
      url: 'https://example.com/orders',
      statusText: 'Created',
      elapsedMs: 15,
      sizeBytes: 24,
      contentType: 'application/json',
      truncated: false,
      responseHeaders: [],
      responsePreview: '{"ok":true}',
      executionSource: 'live' as const,
      requestSnapshot: {
        workspaceId: 'workspace-1',
        activeEnvironmentId: 'env-local',
        tabId: 'tab-1',
        name: 'Orders',
        description: '',
        tags: [],
        collectionName: 'Scratch Pad',
        method: 'POST',
        url: 'https://example.com/orders',
        params: [],
        headers: [],
        body: { kind: 'json', value: '' },
        bodyType: 'json',
        auth: baseAuth,
        tests: [],
      },
    } as unknown as HistoryItem

    const sendRequest = vi.fn(async () => ok({
      requestMethod: 'POST',
      requestUrl: 'https://example.com/orders',
      status: 201,
      statusText: 'Created',
      elapsedMs: 15,
      sizeBytes: 24,
      contentType: 'application/json',
      responseBody: '{"ok":true}',
      headers: [],
      truncated: false,
      executionSource: 'live' as const,
      historyItem,
    }))

    setRuntimeAdapter(createAdapter(createBootstrapPayload(), { sendRequest }))
    const wrapper = await mountApp()

    // 1. bootstrap — tab is present
    const tabs = getRequestPanelTabs(wrapper)
    expect(tabs.length).toBeGreaterThan(0)
    expect(tabs[0]?.['id']).toBe('tab-1')

    // 2. send
    await wrapper.get('[data-testid="request-panel-send"]').trigger('click')
    await flushPromises()
    await nextTick()

    // 3. history entry appears in sidebar
    const historyItems = wrapper.findComponent(SidebarStub).props('historyItems') as HistoryItem[]
    expect(historyItems).toHaveLength(1)
    expect(historyItems[0]?.id).toBe('history-gate-c-1')

    // 4. restore from history
    await wrapper.get('[data-testid="sidebar-select-history"]').trigger('click')
    await nextTick()

    // 5. restored tab state matches what was sent
    const restoredTab = getActiveRequestPanelTab(wrapper)
    expect(restoredTab?.['method']).toBe('POST')
    expect(restoredTab?.['url']).toBe('https://example.com/orders')
    expect(restoredTab?.['origin']?.['kind']).toBe('replay')
    expect(restoredTab?.['origin']?.['historyItemId']).toBe('history-gate-c-1')
  })

  // ---------------------------------------------------------------------------
  // Gate D: Stage Discipline (frontend)
  // Only implemented import adapters may be active; future seams must stay non-active.
  // ---------------------------------------------------------------------------
  it('[Gate D: Stage Discipline] bootstrap descriptors contain implemented OpenAPI import and no active future-stage capabilities', async () => {
    const payload = createBootstrapPayload()
    payload.capabilities = {
      descriptors: [
        { key: 'protocol.http', kind: 'protocol', displayName: 'HTTP', availability: 'active' },
        { key: 'import.backup', kind: 'import_adapter', displayName: 'Backup Restore', availability: 'active' },
        { key: 'import.curl', kind: 'import_adapter', displayName: 'Curl Import', availability: 'active' },
        { key: 'import.openapi', kind: 'import_adapter', displayName: 'OpenAPI Import', availability: 'active' },
        { key: 'execution_hook.reserved', kind: 'execution_hook', displayName: 'Execution Hook Seam', availability: 'reserved' },
        { key: 'tool_packaging.reserved', kind: 'tool_packaging', displayName: 'Tool Packaging Seam', availability: 'reserved' },
        { key: 'plugin_manifest.reserved', kind: 'plugin_manifest', displayName: 'Plugin Manifest Seam', availability: 'reserved' },
      ],
      protocols: [{ key: 'http', displayName: 'HTTP', schemes: ['http', 'https'], availability: 'active' }],
      importAdapters: [
        { key: 'backup', displayName: 'Backup Restore', availability: 'active' },
        { key: 'curl', displayName: 'Curl Import', availability: 'active' },
        { key: 'openapi', displayName: 'OpenAPI Import', availability: 'active' },
      ],
      executionHooks: [],
      toolPackaging: [{ key: 'tool_packaging.reserved', displayName: 'Tool Packaging Seam', availability: 'reserved' }],
      pluginManifests: [{ key: 'plugin_manifest.reserved', displayName: 'Plugin Manifest Seam', availability: 'reserved' }],
    }

    setRuntimeAdapter(createAdapter(payload))
    const wrapper = await mountApp()

    // App must have bootstrapped successfully
    expect(wrapper.find('[data-testid="request-panel-stub"]').exists()).toBe(true)

    // No future-stage capability kind may be active
    const futureKinds: RuntimeCapabilityDescriptor['kind'][] = ['execution_hook', 'tool_packaging', 'plugin_manifest']
    const activeFuture = payload.capabilities!.descriptors.filter(
      (d) => futureKinds.includes(d.kind) && d.availability === 'active',
    )
    expect(activeFuture).toHaveLength(0)

    const openapiDescriptors = payload.capabilities!.descriptors.filter(
      (d) => d.key === 'import.openapi' && d.availability === 'active',
    )
    expect(openapiDescriptors).toHaveLength(1)
  })
})
