import type {
  AuthConfig,
  EnvironmentPreset,
  HistoryRequestSnapshot,
  HistoryItem,
  KeyValueItem,
  RequestCollection,
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
  status: 200,
  statusText: 'READY',
  time: '0 ms',
  size: '0 B',
  headers: [],
  contentType: 'application/json',
  requestMethod: 'GET',
  requestUrl: '',
  testResults: [],
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

export const cloneResponse = (response?: Partial<ResponseState>): ResponseState => ({
  ...defaultResponseState(),
  ...response,
  headers: (response?.headers ?? []).map((header) => ({ ...header })),
  testResults: (response?.testResults ?? []).map((result) => ({ ...result })),
})

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
  auth: cloneAuth(preset.auth),
  tests: cloneTests(preset.tests),
})

export const cloneCollection = (collection: RequestCollection): RequestCollection => ({
  ...collection,
  requests: collection.requests.map((request) => clonePreset(request)),
})

export const createTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const createLegacyId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const createRequestTabFromPreset = (preset: RequestPreset): RequestTabState => ({
  id: createTabId(),
  requestId: preset.id,
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
  ...tab,
  description: tab.description ?? '',
  tags: [...(tab.tags ?? [])],
  params: cloneItems(tab.params),
  headers: cloneItems(tab.headers),
  auth: cloneAuth(tab.auth),
  tests: cloneTests(tab.tests),
  response: cloneResponse(tab.response),
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
  auth: cloneAuth(tab.auth),
  tests: cloneTests(tab.tests),
})

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
    return { body: payload.value, bodyType: 'raw' as const }
  }

  if (payload.kind === 'formData') {
    return {
      body: payload.fields
        .filter((field) => field.enabled && field.key.trim())
        .map((field) => `${field.key}=${field.value}`)
        .join('\n'),
      bodyType: 'formdata' as const,
    }
  }

  return { body: payload.bytesBase64, bodyType: 'binary' as const }
}

export const createRequestTabFromHistorySnapshot = (
  snapshot: HistoryRequestSnapshot,
  fallbackName: string,
): RequestTabState => {
  const body = requestBodyDtoToTabBody(snapshot.body)

  return {
    id: createTabId(),
    requestId: snapshot.requestId,
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
