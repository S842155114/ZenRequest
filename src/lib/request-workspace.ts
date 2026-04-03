import type {
  AuthConfig,
  EnvironmentPreset,
  HistoryRequestSnapshot,
  HistoryItem,
  KeyValueItem,
  RequestCollection,
  RequestExecutionOptions,
  RequestMockState,
  RequestBodySnapshot,
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
  WorkspaceSnapshot,
} from '@/types/request'
import {
  cloneTabOrigin,
  resolveTabExecutionState,
  resolveTabOrigin,
  resolveTabPersistenceState,
} from '@/features/app-shell/domain/request-session'

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

export const defaultExecutionOptions = (): RequestExecutionOptions => ({
  timeoutMs: undefined,
  redirectPolicy: 'follow',
  proxy: { mode: 'inherit' },
  verifySsl: true,
})

export const cloneExecutionOptions = (options?: Partial<RequestExecutionOptions>): RequestExecutionOptions => {
  const merged = {
    ...defaultExecutionOptions(),
    ...options,
  }

  const proxy = options?.proxy ?? merged.proxy

  return {
    ...merged,
    proxy: proxy.mode === 'custom'
      ? { mode: 'custom', url: proxy.url }
      : { mode: proxy.mode },
  }
}

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
  executionSource: 'live',
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
export const cloneMock = (mock?: RequestMockState): RequestMockState | undefined => (
  mock
    ? {
      ...mock,
      headers: cloneItems(mock.headers),
    }
    : undefined
)

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
    executionSource: response?.executionSource ?? merged.executionSource ?? 'live',
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
  bodyDefinition: preset.bodyDefinition ? cloneBodyDefinition(preset.bodyDefinition) : createRequestBodyDefinition(preset),
  formDataFields: (preset.formDataFields ?? []).map((field) => ({ ...field })),
  auth: cloneAuth(preset.auth),
  tests: cloneTests(preset.tests),
  mock: cloneMock(preset.mock),
  executionOptions: cloneExecutionOptions(preset.executionOptions),
})

export const cloneCollection = (collection: RequestCollection): RequestCollection => ({
  ...collection,
  requests: collection.requests.map((request) => clonePreset(request)),
})

export const createTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const createLegacyId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const cloneBodyDefinition = (bodyDefinition: RequestBodySnapshot): RequestBodySnapshot => {
  if (bodyDefinition.kind === 'json') {
    return { kind: 'json', value: bodyDefinition.value }
  }

  if (bodyDefinition.kind === 'raw') {
    return {
      kind: 'raw',
      value: bodyDefinition.value,
      contentType: bodyDefinition.contentType,
    }
  }

  if (bodyDefinition.kind === 'formData') {
    return {
      kind: 'formData',
      fields: bodyDefinition.fields.map((field: { key: string; value: string; enabled: boolean; fileName?: string; mimeType?: string }) => ({ ...field })),
    }
  }

  return {
    kind: 'binary',
    bytesBase64: bodyDefinition.bytesBase64,
    fileName: bodyDefinition.fileName,
    mimeType: bodyDefinition.mimeType,
  }
}

export const createRequestBodyDefinition = (
  payload: Pick<RequestPreset | RequestTabState | SendRequestPayload, 'body' | 'bodyType' | 'bodyContentType' | 'formDataFields' | 'binaryFileName' | 'binaryMimeType'> & {
    bodyDefinition?: RequestBodySnapshot
  },
): RequestBodySnapshot => {
  if (payload.bodyDefinition) {
    return cloneBodyDefinition(payload.bodyDefinition)
  }

  switch (payload.bodyType) {
    case 'raw':
      return {
        kind: 'raw',
        value: payload.body ?? '',
        contentType: payload.bodyContentType,
      }
    case 'formdata':
      return {
        kind: 'formData',
        fields: (payload.formDataFields ?? []).map((field: { key: string; value: string; enabled: boolean; fileName?: string; mimeType?: string }) => ({ ...field })),
      }
    case 'binary':
      return {
        kind: 'binary',
        bytesBase64: payload.body ?? '',
        fileName: payload.binaryFileName,
        mimeType: payload.binaryMimeType,
      }
    case 'json':
    default:
      return {
        kind: 'json',
        value: payload.body ?? '',
      }
  }
}

export const applyRequestBodyDefinition = (bodyDefinition: RequestBodySnapshot): Pick<RequestTabState, 'body' | 'bodyType' | 'bodyContentType' | 'formDataFields' | 'binaryFileName' | 'binaryMimeType'> => {
  if (bodyDefinition.kind === 'json') {
    return {
      body: bodyDefinition.value,
      bodyType: 'json',
      bodyContentType: undefined,
      formDataFields: [],
      binaryFileName: undefined,
      binaryMimeType: undefined,
    }
  }

  if (bodyDefinition.kind === 'raw') {
    return {
      body: bodyDefinition.value,
      bodyType: 'raw',
      bodyContentType: bodyDefinition.contentType,
      formDataFields: [],
      binaryFileName: undefined,
      binaryMimeType: undefined,
    }
  }

  if (bodyDefinition.kind === 'formData') {
    return {
      body: bodyDefinition.fields
        .filter((field: { key: string; value: string; enabled: boolean }) => field.enabled && field.key.trim())
        .map((field: { key: string; value: string }) => `${field.key}=${field.value}`)
        .join('\n'),
      bodyType: 'formdata',
      bodyContentType: undefined,
      formDataFields: bodyDefinition.fields.map((field) => ({ ...field })),
      binaryFileName: undefined,
      binaryMimeType: undefined,
    }
  }

  return {
    body: bodyDefinition.bytesBase64,
    bodyType: 'binary',
    bodyContentType: undefined,
    formDataFields: [],
    binaryFileName: bodyDefinition.fileName,
    binaryMimeType: bodyDefinition.mimeType,
  }
}

export const normalizeRequestTabState = (tab: RequestTabState): RequestTabState => {
  const origin = resolveTabOrigin(tab)
  return {
    ...tab,
    origin,
    persistenceState: resolveTabPersistenceState(tab, origin),
    executionState: resolveTabExecutionState(tab, resolveResponseStateFromStatus),
    mock: cloneMock(tab.mock),
    executionOptions: cloneExecutionOptions(tab.executionOptions),
  }
}

export const createRequestTabFromPreset = (preset: RequestPreset): RequestTabState => ({
  ...applyRequestBodyDefinition(createRequestBodyDefinition(preset)),
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
  bodyDefinition: createRequestBodyDefinition(preset),
  auth: cloneAuth(preset.auth),
  tests: cloneTests(preset.tests),
  mock: cloneMock(preset.mock),
  executionOptions: cloneExecutionOptions(preset.executionOptions),
  response: defaultResponseState({
    requestMethod: preset.method,
    requestUrl: preset.url,
    executionSource: 'live',
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
  executionOptions: defaultExecutionOptions(),
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
  bodyDefinition: createRequestBodyDefinition(tab),
  auth: cloneAuth(tab.auth),
  tests: cloneTests(tab.tests),
  formDataFields: (tab.formDataFields ?? []).map((field) => ({ ...field })),
  mock: cloneMock(tab.mock),
  executionOptions: cloneExecutionOptions(tab.executionOptions),
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
  bodyDefinition: createRequestBodyDefinition(tab),
  bodyContentType: tab.bodyContentType,
  formDataFields: (tab.formDataFields ?? []).map((field) => ({ ...field })),
  binaryFileName: tab.binaryFileName,
  binaryMimeType: tab.binaryMimeType,
  auth: cloneAuth(tab.auth),
  tests: cloneTests(tab.tests),
  mock: cloneMock(tab.mock),
  executionOptions: cloneExecutionOptions(tab.executionOptions),
})

export const resolveResponseStateFromStatus = (status: number): ResponseLifecycleState => {
  if (status >= 400) return 'http-error'
  if (status > 0) return 'success'
  return 'idle'
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
  executionSource: 'live',
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

export const createRequestTabFromHistorySnapshot = (
  snapshot: HistoryRequestSnapshot,
  fallbackName: string,
  historyItemId?: string,
): RequestTabState => {
  const bodyDefinition = typeof snapshot.body === 'string'
    ? createRequestBodyDefinition({
      body: snapshot.body,
      bodyType: snapshot.bodyType ?? 'raw',
    } as Pick<RequestTabState, 'body' | 'bodyType'>)
    : cloneBodyDefinition(snapshot.body)
  const body = applyRequestBodyDefinition(bodyDefinition)

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
    bodyDefinition,
    bodyContentType: 'bodyContentType' in body ? body.bodyContentType : undefined,
    formDataFields: 'formDataFields' in body ? body.formDataFields : [],
    binaryFileName: 'binaryFileName' in body ? body.binaryFileName : undefined,
    binaryMimeType: 'binaryMimeType' in body ? body.binaryMimeType : undefined,
    auth: cloneAuth(snapshot.auth),
    tests: cloneTests(snapshot.tests),
    mock: cloneMock(snapshot.mock),
    executionOptions: cloneExecutionOptions(snapshot.executionOptions),
    response: defaultResponseState({
      requestMethod: snapshot.method,
      requestUrl: snapshot.url,
      executionSource: 'live',
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
  executionSource: item.executionSource ?? 'live',
})

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
      executionSource: item?.executionSource ?? 'live',
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
