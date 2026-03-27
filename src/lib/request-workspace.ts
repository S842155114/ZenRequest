import type {
  AuthConfig,
  EnvironmentPreset,
  HistoryRequestSnapshot,
  HistoryItem,
  KeyValueItem,
  RequestCollection,
  RequestTabExecutionState,
  RequestTabOrigin,
  RequestTabOriginKind,
  RequestTabPersistenceState,
  ResponseLifecycleState,
  RequestPreset,
  RequestTestDefinition,
  RequestTestResult,
  RequestTabState,
  SendRequestPayload,
  ResponseState,
  ResponseHeaderItem,
  ResolvedTheme,
  ThemeMode,
  WorkbenchActivityProjection,
  WorkbenchActivitySignal,
  WorkspaceSnapshot,
} from '@/types/request'

export const WORKSPACE_STORAGE_KEY = 'zenrequest.workspace'
export const HISTORY_LIMIT = 20

export const defaultAuthConfig = (): AuthConfig => ({
  type: 'none',
  bearerToken: '',
  username: '',
  password: '',
  apiKeyKey: 'X-API-Key',
  apiKeyValue: '',
  apiKeyPlacement: 'header',
})

export const createRequestTestId = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const defaultRequestTest = (): RequestTestDefinition => ({
  id: createRequestTestId(),
  name: 'Status is 200',
  source: 'status',
  operator: 'equals',
  target: '',
  expected: '200',
})

export const defaultResponseState = (overrides?: Partial<ResponseState>): ResponseState => ({
  responseBody: `{
  "message": "Ready to send",
  "hint": "Select a request from the sidebar or edit the current one."
}`,
  status: 0,
  statusText: 'READY',
  time: '0 ms',
  size: '0 B',
  headers: [],
  contentType: 'application/json',
  requestMethod: 'GET',
  requestUrl: '',
  testResults: [],
  state: 'idle',
  stale: false,
  ...overrides,
})

export const defaultEnvironments = (): EnvironmentPreset[] => ([
  {
    id: 'local',
    name: 'Local',
    variables: [
      { key: 'baseUrl', value: 'https://jsonplaceholder.typicode.com', description: 'Primary API host', enabled: true },
      { key: 'token', value: 'demo-token-123', description: 'Bearer token', enabled: true },
      { key: 'clientId', value: 'zenrequest-desktop', description: 'Client identifier', enabled: true },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    variables: [
      { key: 'baseUrl', value: '', description: 'Override API host', enabled: true },
      { key: 'apiKey', value: '', description: 'API key', enabled: true },
    ],
  },
])

export const cloneItems = (items?: KeyValueItem[]) => (items ?? []).map((item) => ({ ...item }))
export const cloneTests = (tests?: RequestTestDefinition[]) => (tests ?? []).map((test) => ({ ...test }))

export const cloneAuth = (auth?: Partial<AuthConfig>): AuthConfig => ({
  ...defaultAuthConfig(),
  ...auth,
})

export const cloneResponse = (response?: Partial<ResponseState>): ResponseState => {
  const merged = {
    ...defaultResponseState(),
    ...response,
  }

  return {
    ...merged,
    state: response?.state ?? resolveResponseStateFromStatus(merged.status),
    stale: response?.stale ?? false,
    headers: (response?.headers ?? []).map((header) => ({ ...header })),
    testResults: (response?.testResults ?? []).map((result) => ({ ...result })),
  }
}

export const cloneEnvironment = (environment: EnvironmentPreset): EnvironmentPreset => ({
  ...environment,
  variables: cloneItems(environment.variables),
})

export const clonePreset = (preset: RequestPreset): RequestPreset => ({
  ...preset,
  description: preset.description ?? '',
  tags: [...(preset.tags ?? [])],
  params: cloneItems(preset.params),
  headers: cloneItems(preset.headers),
  formDataFields: (preset.formDataFields ?? []).map((field) => ({ ...field })),
  auth: cloneAuth(preset.auth),
  tests: cloneTests(preset.tests),
})

export const cloneCollection = (collection: RequestCollection): RequestCollection => ({
  ...collection,
  requests: collection.requests.map((request) => clonePreset(request)),
})

export const createTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const createLegacyId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const cloneTabOrigin = (origin: RequestTabOrigin): RequestTabOrigin => ({
  kind: origin.kind,
  requestId: origin.requestId,
  historyItemId: origin.historyItemId,
})

const resolveTabOriginKind = (tab: Partial<RequestTabState>): RequestTabOriginKind => {
  if (tab.origin?.kind) return tab.origin.kind
  if (tab.requestId) return 'resource'
  return 'scratch'
}

const resolveTabOrigin = (tab: Partial<RequestTabState>): RequestTabOrigin => {
  const kind = resolveTabOriginKind(tab)
  return cloneTabOrigin({
    kind,
    requestId: tab.origin?.requestId ?? tab.requestId,
    historyItemId: tab.origin?.historyItemId,
  })
}

const resolveTabPersistenceState = (tab: Partial<RequestTabState>, origin: RequestTabOrigin): RequestTabPersistenceState => {
  if (tab.persistenceState) return tab.persistenceState
  if (origin.kind === 'detached') return 'unbound'
  if (origin.kind === 'scratch' || origin.kind === 'replay') return 'unsaved'
  return tab.isDirty ? 'unsaved' : 'saved'
}

const resolveTabExecutionState = (tab: Partial<RequestTabState>): RequestTabExecutionState => (
  tab.executionState
  ?? tab.response?.state
  ?? resolveResponseStateFromStatus(tab.response?.status ?? 0)
)

export const normalizeRequestTabState = (tab: RequestTabState): RequestTabState => {
  const origin = resolveTabOrigin(tab)
  return {
    ...tab,
    origin,
    persistenceState: resolveTabPersistenceState(tab, origin),
    executionState: resolveTabExecutionState(tab),
  }
}

export const createRequestTabFromPreset = (preset: RequestPreset): RequestTabState => ({
  id: createTabId(),
  requestId: preset.id,
  origin: {
    kind: 'resource',
    requestId: preset.id,
  },
  persistenceState: 'saved',
  executionState: 'idle',
  name: preset.name,
  description: preset.description ?? '',
  tags: [...(preset.tags ?? [])],
  collectionId: preset.collectionId,
  collectionName: preset.collectionName ?? 'Scratch Pad',
  method: preset.method,
  url: preset.url,
  params: cloneItems(preset.params),
  headers: cloneItems(preset.headers),
  body: preset.body ?? '',
  bodyType: preset.bodyType ?? 'json',
  bodyContentType: preset.bodyContentType,
  formDataFields: (preset.formDataFields ?? []).map((field) => ({ ...field })),
  binaryFileName: preset.binaryFileName,
  binaryMimeType: preset.binaryMimeType,
  auth: cloneAuth(preset.auth),
  tests: cloneTests(preset.tests),
  response: defaultResponseState({
    requestMethod: preset.method,
    requestUrl: preset.url,
  }),
  isSending: false,
  isDirty: false,
})

export const createBlankRequestTab = (): RequestTabState => ({
  id: createTabId(),
  requestId: undefined,
  origin: {
    kind: 'scratch',
  },
  persistenceState: 'unsaved',
  executionState: 'idle',
  name: 'New Request',
  description: '',
  tags: [],
  collectionId: undefined,
  collectionName: 'Scratch Pad',
  method: 'GET',
  url: '{{baseUrl}}/todos/1',
  params: [],
  headers: [
    { key: 'Accept', value: 'application/json', description: '', enabled: true },
  ],
  body: '',
  bodyType: 'json',
  formDataFields: [],
  auth: defaultAuthConfig(),
  tests: [],
  response: defaultResponseState({
    requestMethod: 'GET',
    requestUrl: '{{baseUrl}}/todos/1',
  }),
  isSending: false,
  isDirty: true,
})

export const cloneTab = (tab: RequestTabState): RequestTabState => ({
  ...normalizeRequestTabState(tab),
  description: tab.description ?? '',
  tags: [...(tab.tags ?? [])],
  params: cloneItems(tab.params),
  headers: cloneItems(tab.headers),
  auth: cloneAuth(tab.auth),
  tests: cloneTests(tab.tests),
  formDataFields: (tab.formDataFields ?? []).map((field) => ({ ...field })),
  response: cloneResponse(tab.response),
  origin: cloneTabOrigin(resolveTabOrigin(tab)),
  isDirty: tab.isDirty ?? false,
})

export const createPresetFromTab = (tab: RequestTabState): RequestPreset => ({
  id: tab.requestId ?? `request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: tab.name,
  description: tab.description,
  tags: [...tab.tags],
  collectionId: tab.collectionId,
  method: tab.method,
  url: tab.url,
  collectionName: tab.collectionName,
  params: cloneItems(tab.params),
  headers: cloneItems(tab.headers),
  body: tab.body,
  bodyType: tab.bodyType,
  bodyContentType: tab.bodyContentType,
  formDataFields: (tab.formDataFields ?? []).map((field) => ({ ...field })),
  binaryFileName: tab.binaryFileName,
  binaryMimeType: tab.binaryMimeType,
  auth: cloneAuth(tab.auth),
  tests: cloneTests(tab.tests),
})

export const resolveResponseStateFromStatus = (status: number): ResponseLifecycleState => {
  if (status >= 400) return 'http-error'
  if (status > 0) return 'success'
  return 'idle'
}

const activityResultPriority: Record<RequestTabExecutionState, number> = {
  idle: 0,
  success: 1,
  'http-error': 2,
  'transport-error': 3,
  pending: 4,
}

const createEmptyActivitySignal = (): WorkbenchActivitySignal => ({
  active: false,
  open: false,
  dirty: false,
  running: false,
  recovered: false,
  result: 'idle',
})

const mergeActivitySignals = (
  current: WorkbenchActivitySignal,
  next: WorkbenchActivitySignal,
): WorkbenchActivitySignal => ({
  active: current.active || next.active,
  open: current.open || next.open,
  dirty: current.dirty || next.dirty,
  running: current.running || next.running,
  recovered: current.recovered || next.recovered,
  result: activityResultPriority[next.result] >= activityResultPriority[current.result]
    ? next.result
    : current.result,
})

const createTabActivitySignal = (
  tab: RequestTabState,
  activeTabId: string,
): WorkbenchActivitySignal => {
  const normalizedTab = normalizeRequestTabState(tab)
  const normalizedOrigin = normalizedTab.origin ?? resolveTabOrigin(normalizedTab)
  const executionState = normalizedTab.executionState ?? resolveTabExecutionState(normalizedTab)
  return {
    active: normalizedTab.id === activeTabId,
    open: true,
    dirty: normalizedTab.isDirty ?? normalizedTab.persistenceState !== 'saved',
    running: normalizedTab.isSending || executionState === 'pending',
    recovered: normalizedOrigin.kind === 'replay',
    result: executionState,
  }
}

export const createWorkbenchActivityProjection = (
  tabs: RequestTabState[],
  activeTabId: string,
): WorkbenchActivityProjection => {
  const projection: WorkbenchActivityProjection = {
    requests: {},
    history: {},
    tabs: {},
    summary: {
      open: 0,
      dirty: 0,
      running: 0,
      recovered: 0,
    },
  }

  for (const tab of tabs.map((item) => normalizeRequestTabState(item))) {
    const signal = createTabActivitySignal(tab, activeTabId)
    const normalizedOrigin = tab.origin ?? resolveTabOrigin(tab)
    projection.tabs[tab.id] = signal

    projection.summary.open += 1
    projection.summary.dirty += signal.dirty ? 1 : 0
    projection.summary.running += signal.running ? 1 : 0
    projection.summary.recovered += signal.recovered ? 1 : 0

    const requestKey = normalizedOrigin.requestId ?? tab.requestId
    if (requestKey) {
      projection.requests[requestKey] = requestKey in projection.requests
        ? mergeActivitySignals(projection.requests[requestKey], signal)
        : signal
    }

    if (normalizedOrigin.kind === 'replay' && normalizedOrigin.historyItemId) {
      projection.history[normalizedOrigin.historyItemId] = normalizedOrigin.historyItemId in projection.history
        ? mergeActivitySignals(projection.history[normalizedOrigin.historyItemId], signal)
        : signal
    }
  }

  return projection
}

export const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

export const createHistoryEntry = (payload: {
  requestId?: string
  name: string
  method: string
  url: string
  status: number
}): HistoryItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  requestId: payload.requestId,
  name: payload.name,
  method: payload.method,
  time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  status: payload.status,
  url: payload.url,
})

const getHeaderValue = (headers: ResponseHeaderItem[], target: string) => {
  const normalized = target.trim().toLowerCase()
  return headers.find((header) => header.key.trim().toLowerCase() === normalized)?.value ?? ''
}

export const evaluateResponseTests = (
  tests: RequestTestDefinition[],
  response: Pick<ResponseState, 'status' | 'headers' | 'responseBody'>,
): RequestTestResult[] => tests.map((test) => {
  const name = test.name.trim() || 'Unnamed test'
  const target = test.target?.trim() ?? ''
  const expected = test.expected?.trim() ?? ''
  let passed = false
  let actual = ''

  if (test.source === 'status') {
    actual = String(response.status)
    passed = test.operator === 'equals'
      ? actual === expected
      : test.operator === 'contains'
        ? actual.includes(expected)
        : actual.length > 0
  } else if (test.source === 'header') {
    actual = getHeaderValue(response.headers, target)
    passed = test.operator === 'exists'
      ? actual.length > 0
      : test.operator === 'contains'
        ? actual.includes(expected)
        : actual === expected
  } else {
    actual = response.responseBody
    passed = test.operator === 'exists'
      ? actual.length > 0
      : test.operator === 'equals'
        ? actual === expected
        : actual.includes(expected)
  }

  const qualifier = test.source === 'header' && target ? ` (${target})` : ''
  return {
    id: test.id,
    name,
    passed,
    message: passed
      ? `Passed${qualifier}`
      : `Expected ${test.operator}${qualifier}${expected ? ` ${expected}` : ''}, got ${actual || 'empty'}`,
  }
})

const requestBodyDtoToTabBody = (payload: HistoryRequestSnapshot['body']) => {
  if (typeof payload === 'string') {
    return { body: payload, bodyType: 'raw' as const }
  }

  if (payload.kind === 'json') {
    return { body: payload.value, bodyType: 'json' as const }
  }

  if (payload.kind === 'raw') {
    return {
      body: payload.value,
      bodyType: 'raw' as const,
      bodyContentType: payload.contentType,
    }
  }

  if (payload.kind === 'formData') {
    return {
      body: payload.fields
        .filter((field) => field.enabled && field.key.trim())
        .map((field) => `${field.key}=${field.value}`)
        .join('\n'),
      bodyType: 'formdata' as const,
      formDataFields: payload.fields.map((field) => ({ ...field })),
    }
  }

  return {
    body: payload.bytesBase64,
    bodyType: 'binary' as const,
    binaryFileName: payload.fileName,
    binaryMimeType: payload.mimeType,
  }
}

export const createRequestTabFromHistorySnapshot = (
  snapshot: HistoryRequestSnapshot,
  fallbackName: string,
  historyItemId?: string,
): RequestTabState => {
  const body = requestBodyDtoToTabBody(snapshot.body)

  return {
    id: createTabId(),
    requestId: snapshot.requestId,
    origin: {
      kind: 'replay',
      requestId: snapshot.requestId,
      historyItemId,
    },
    persistenceState: 'unsaved',
    executionState: 'idle',
    name: snapshot.name || fallbackName,
    description: snapshot.description,
    tags: [...snapshot.tags],
    collectionId: undefined,
    collectionName: snapshot.collectionName || 'Scratch Pad',
    method: snapshot.method,
    url: snapshot.url,
    params: cloneItems(snapshot.params),
    headers: cloneItems(snapshot.headers),
    body: body.body,
    bodyType: snapshot.bodyType ?? body.bodyType,
    bodyContentType: 'bodyContentType' in body ? body.bodyContentType : undefined,
    formDataFields: 'formDataFields' in body ? body.formDataFields : [],
    binaryFileName: 'binaryFileName' in body ? body.binaryFileName : undefined,
    binaryMimeType: 'binaryMimeType' in body ? body.binaryMimeType : undefined,
    auth: cloneAuth(snapshot.auth),
    tests: cloneTests(snapshot.tests),
    response: defaultResponseState({
      requestMethod: snapshot.method,
      requestUrl: snapshot.url,
    }),
    isSending: false,
    isDirty: true,
  }
}

export const createResponseStateFromHistoryItem = (
  item: HistoryItem,
  requestMethod: string,
  requestUrl: string,
): ResponseState => defaultResponseState({
  responseBody: item.responsePreview || defaultResponseState().responseBody,
  status: item.status,
  statusText: item.statusText || 'OK',
  time: item.elapsedMs !== undefined ? `${item.elapsedMs} ms` : item.time,
  size: item.sizeBytes !== undefined ? formatBytes(item.sizeBytes) : defaultResponseState().size,
  headers: (item.responseHeaders ?? []).map((header) => ({ ...header })),
  contentType: item.contentType || 'text/plain',
  requestMethod,
  requestUrl,
  state: resolveResponseStateFromStatus(item.status),
  stale: false,
})

export const resolveVariablesMap = (variables: KeyValueItem[]) => {
  const output: Record<string, string> = {}

  for (const item of variables) {
    if (item.enabled && item.key.trim()) {
      output[item.key.trim()] = item.value
    }
  }

  return output
}

export const resolveTemplate = (template: string, variables: Record<string, string>) =>
  template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => variables[key.trim()] ?? '')

export const applyThemeToDocument = (theme: ResolvedTheme) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.startupTheme = theme
}

export const resolveThemeMode = (themeMode: ThemeMode): ResolvedTheme => {
  if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return themeMode === 'light' ? 'light' : 'dark'
}

export const sanitizeSnapshot = (snapshot: Partial<WorkspaceSnapshot> | null | undefined): WorkspaceSnapshot | null => {
  if (!snapshot) return null
  if (!snapshot.activeTabId) return null
  if (!Array.isArray(snapshot.openTabs) || snapshot.openTabs.length === 0) return null

  const environments = Array.isArray(snapshot.environments)
    ? snapshot.environments.map((environment) => ({
      ...cloneEnvironment(environment),
      id: environment?.id || createLegacyId('env'),
    }))
    : defaultEnvironments()

  const collections = Array.isArray(snapshot.collections)
    ? snapshot.collections.map((collection) => {
      const collectionId = collection?.id || createLegacyId('collection')
      return {
        ...cloneCollection(collection),
        id: collectionId,
        requests: (collection.requests ?? []).map((request) => ({
          ...clonePreset(request),
          id: request?.id || createLegacyId('request'),
          collectionId,
          collectionName: request?.collectionName ?? collection.name,
        })),
      }
    })
    : []

  const historyItems = Array.isArray(snapshot.historyItems)
    ? snapshot.historyItems.slice(0, HISTORY_LIMIT).map((item) => ({
      ...item,
      id: item?.id || createLegacyId('history'),
      executedAtEpochMs: item?.executedAtEpochMs ?? 0,
    }))
    : []

  const openTabs = snapshot.openTabs.map((tab) => ({
    ...cloneTab(tab),
    id: tab?.id || createTabId(),
  }))

  const activeEnvironmentId = environments.some((environment) => environment.id === snapshot.activeEnvironmentId)
    ? snapshot.activeEnvironmentId ?? environments[0]?.id ?? 'local'
    : environments[0]?.id ?? 'local'

  const activeTabId = openTabs.some((tab) => tab.id === snapshot.activeTabId)
    ? snapshot.activeTabId
    : openTabs[0]?.id

  return {
    locale: snapshot.locale === 'zh-CN' || snapshot.locale === 'en'
      ? snapshot.locale
      : 'en',
    themeMode: snapshot.themeMode === 'light' || snapshot.themeMode === 'dark' || snapshot.themeMode === 'system'
      ? snapshot.themeMode
      : 'dark',
    activeEnvironmentId,
    environments,
    collections,
    historyItems,
    openTabs,
    activeTabId: activeTabId ?? '',
  }
}

export const readWorkspaceSnapshot = (): WorkspaceSnapshot | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!raw) return null
    return sanitizeSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

export const writeWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot))
}

export const clearWorkspaceSnapshot = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(WORKSPACE_STORAGE_KEY)
}
