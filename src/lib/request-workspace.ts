import type {
  AuthConfig,
  EnvironmentPreset,
  HistoryRequestSnapshot,
  HistoryItem,
  KeyValueItem,
  RequestCollection,
  RequestExecutionOptions,
  RequestKind,
  RequestMockState,
  RequestBodySnapshot,
  ReplayExplainability,
  ReplayLimitation,
  ReplaySourceNote,
  McpExecutionArtifact,
  McpRequestDefinition,
  McpRootSnapshot,
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
  WorkspaceSessionSnapshot,
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
  requestKind: 'http',
  mcpArtifact: undefined,
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

const REDACTED_SECRET_VALUE = '[REDACTED]'
const SENSITIVE_KEY_PATTERN = /(token|secret|password|cookie|api[-_]?key|apikey|authorization)/i

const isSensitiveKey = (key?: string) => SENSITIVE_KEY_PATTERN.test(key?.trim() ?? '')

const toSafeProjectionItem = (item: KeyValueItem): KeyValueItem => (
  isSensitiveKey(item.key) && item.value.trim()
    ? { ...item, value: REDACTED_SECRET_VALUE }
    : { ...item }
)

const toSafeProjectionAuth = (auth?: Partial<AuthConfig>): AuthConfig => {
  const next = cloneAuth(auth)
  if (next.bearerToken.trim()) next.bearerToken = REDACTED_SECRET_VALUE
  if (next.password.trim()) next.password = REDACTED_SECRET_VALUE
  if (next.apiKeyValue.trim()) next.apiKeyValue = REDACTED_SECRET_VALUE
  return next
}

const toSafeProjectionEnvironment = (environment: EnvironmentPreset): EnvironmentPreset => ({
  ...environment,
  variables: environment.variables.map(toSafeProjectionItem),
})

const toSafeProjectionHistorySnapshot = (snapshot: HistoryRequestSnapshot): HistoryRequestSnapshot => ({
  ...snapshot,
  params: cloneItems(snapshot.params),
  headers: snapshot.headers.map(toSafeProjectionItem),
  auth: toSafeProjectionAuth(snapshot.auth),
  tests: cloneTests(snapshot.tests),
  mock: cloneMock(snapshot.mock),
  executionOptions: cloneExecutionOptions(snapshot.executionOptions),
})

const toSafeProjectionTab = (tab: RequestTabState): RequestTabState => ({
  ...cloneTab(tab),
  headers: tab.headers.map(toSafeProjectionItem),
  auth: toSafeProjectionAuth(tab.auth),
})

const toSafeProjectionWorkspaceSnapshot = (snapshot: WorkspaceSnapshot): WorkspaceSnapshot => ({
  ...snapshot,
  environments: snapshot.environments.map(toSafeProjectionEnvironment),
  historyItems: snapshot.historyItems.map((item) => ({
    ...item,
    requestSnapshot: item.requestSnapshot ? toSafeProjectionHistorySnapshot(item.requestSnapshot) : undefined,
  })),
  openTabs: snapshot.openTabs.map(toSafeProjectionTab),
})

export const createSafeWorkspaceSessionSnapshot = (session: WorkspaceSessionSnapshot): WorkspaceSessionSnapshot => ({
  activeEnvironmentId: session.activeEnvironmentId,
  activeTabId: session.activeTabId,
  openTabs: session.openTabs.map(toSafeProjectionTab),
})

const clonePlainData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const cloneMcpExecutionArtifact = (artifact?: McpExecutionArtifact): McpExecutionArtifact | undefined => (
  artifact
    ? {
      ...artifact,
      sessionId: artifact.sessionId,
      protocolRequest: artifact.protocolRequest ? clonePlainData(artifact.protocolRequest) : undefined,
      protocolResponse: artifact.protocolResponse ? clonePlainData(artifact.protocolResponse) : undefined,
      selectedTool: artifact.selectedTool
        ? {
          ...artifact.selectedTool,
          inputSchema: artifact.selectedTool.inputSchema ? clonePlainData(artifact.selectedTool.inputSchema) : undefined,
        }
        : undefined,
      cachedTools: artifact.cachedTools
        ? artifact.cachedTools.map((tool) => ({
          ...tool,
          inputSchema: tool.inputSchema ? clonePlainData(tool.inputSchema) : undefined,
        }))
        : undefined,
      selectedResource: artifact.selectedResource
        ? { ...artifact.selectedResource }
        : undefined,
      cachedResources: artifact.cachedResources
        ? artifact.cachedResources.map((resource) => ({ ...resource }))
        : undefined,
      resourceContents: artifact.resourceContents
        ? artifact.resourceContents.map((content) => ({ ...content }))
        : undefined,
      selectedPrompt: artifact.selectedPrompt
        ? {
          ...artifact.selectedPrompt,
          arguments: artifact.selectedPrompt.arguments
            ? artifact.selectedPrompt.arguments.map((argument) => ({ ...argument }))
            : undefined,
        }
        : undefined,
      cachedPrompts: artifact.cachedPrompts
        ? artifact.cachedPrompts.map((prompt) => ({
          ...prompt,
          arguments: prompt.arguments ? prompt.arguments.map((argument) => ({ ...argument })) : undefined,
        }))
        : undefined,
      roots: artifact.roots
        ? artifact.roots.map((root) => ({ ...root }))
        : undefined,
    }
    : undefined
)

const cloneMcpRequestDefinition = (definition?: McpRequestDefinition): McpRequestDefinition | undefined => (
  definition
    ? {
      connection: {
        ...definition.connection,
        headers: cloneItems(definition.connection.headers),
        auth: cloneAuth(definition.connection.auth),
        stdio: definition.connection.stdio
          ? {
            command: definition.connection.stdio.command,
            args: [...definition.connection.stdio.args],
            cwd: definition.connection.stdio.cwd,
          }
          : undefined,
      },
      roots: definition.roots ? definition.roots.map((root) => ({ ...root })) : undefined,
      operation: definition.operation.type === 'tools.call'
        ? {
          type: 'tools.call',
          input: {
            ...definition.operation.input,
            arguments: clonePlainData(definition.operation.input.arguments),
            schema: definition.operation.input.schema
              ? {
                ...definition.operation.input.schema,
                inputSchema: definition.operation.input.schema.inputSchema
                  ? clonePlainData(definition.operation.input.schema.inputSchema)
                  : undefined,
              }
              : undefined,
          },
        }
        : definition.operation.type === 'prompts.get'
          ? {
            type: 'prompts.get',
            input: {
              ...definition.operation.input,
              arguments: clonePlainData(definition.operation.input.arguments),
              prompt: definition.operation.input.prompt
                ? {
                  ...definition.operation.input.prompt,
                  arguments: definition.operation.input.prompt.arguments
                    ? definition.operation.input.prompt.arguments.map((argument) => ({ ...argument }))
                    : undefined,
                }
                : undefined,
            },
          }
          : definition.operation.type === 'sampling'
            ? {
              type: 'sampling',
              input: {
                ...definition.operation.input,
                metadata: definition.operation.input.metadata
                  ? clonePlainData(definition.operation.input.metadata)
                  : undefined,
              },
            }
          : definition.operation.type === 'initialize'
            ? {
              type: 'initialize',
              input: {
                ...definition.operation.input,
                capabilities: definition.operation.input.capabilities
                  ? clonePlainData(definition.operation.input.capabilities)
                  : undefined,
              },
            }
            : definition.operation.type === 'resources.read'
              ? {
                type: 'resources.read',
                input: {
                  ...definition.operation.input,
                  resource: definition.operation.input.resource
                    ? { ...definition.operation.input.resource }
                    : undefined,
                },
              }
              : definition.operation.type === 'resources.list'
                ? {
                  type: 'resources.list',
                  input: { ...definition.operation.input },
                }
                : definition.operation.type === 'prompts.list'
                  ? {
                    type: 'prompts.list',
                    input: { ...definition.operation.input },
                  }
                  : {
                    type: 'tools.list',
                    input: { ...definition.operation.input },
                  },
    }
    : undefined
)

const resolveRequestKind = (payload: { requestKind?: RequestKind; mcp?: McpRequestDefinition }): RequestKind => (
  payload.requestKind ?? (payload.mcp ? 'mcp' : 'http')
)

export const cloneResponse = (response?: Partial<ResponseState>): ResponseState => {
  const merged = {
    ...defaultResponseState(),
    ...response,
  }

  return {
    ...merged,
    requestKind: response?.requestKind ?? merged.requestKind ?? 'http',
    mcpArtifact: cloneMcpExecutionArtifact(response?.mcpArtifact ?? merged.mcpArtifact),
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
  requestKind: resolveRequestKind(preset),
  mcp: cloneMcpRequestDefinition(preset.mcp),
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
  const requestKind = resolveRequestKind(tab)
  return {
    ...tab,
    requestKind,
    mcp: cloneMcpRequestDefinition(tab.mcp),
    origin,
    persistenceState: resolveTabPersistenceState(tab, origin),
    executionState: resolveTabExecutionState(tab, resolveResponseStateFromStatus),
    mock: cloneMock(tab.mock),
    executionOptions: cloneExecutionOptions(tab.executionOptions),
  }
}

export const createRequestTabFromPreset = (preset: RequestPreset): RequestTabState => ({
  ...applyRequestBodyDefinition(createRequestBodyDefinition(preset)),
  requestKind: resolveRequestKind(preset),
  mcp: cloneMcpRequestDefinition(preset.mcp),
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
    requestKind: resolveRequestKind(preset),
    requestMethod: preset.method,
    requestUrl: preset.url,
    executionSource: 'live',
  }),
  isSending: false,
  isDirty: false,
})

export const createBlankRequestTab = (): RequestTabState => ({
  id: createTabId(),
  requestKind: 'http',
  mcp: undefined,
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

export const cloneTab = (tab: RequestTabState): RequestTabState => {
  const requestKind = resolveRequestKind(tab)

  return ({
    ...normalizeRequestTabState(tab),
    requestKind,
    mcp: cloneMcpRequestDefinition(tab.mcp),
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
    response: cloneResponse({ ...tab.response, requestKind, mcpArtifact: tab.response?.mcpArtifact }),
    origin: cloneTabOrigin(resolveTabOrigin(tab)),
    isDirty: tab.isDirty ?? false,
  })
}

export const createPresetFromTab = (tab: RequestTabState): RequestPreset => ({
  id: tab.requestId ?? `request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  requestKind: resolveRequestKind(tab),
  mcp: cloneMcpRequestDefinition(tab.mcp),
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

const createExplainabilitySummary = (sources: ReplaySourceNote[], limitations: ReplayLimitation[]): string => {
  if (limitations.length > 0) {
    return limitations[0]?.label ?? 'Replay limitations detected'
  }

  if (sources.length > 0) {
    return `Execution composed from ${sources.map((item) => item.label).join(' · ')}`
  }

  return 'Execution details available'
}

export const createReplayExplainability = (payload: {
  requestSnapshot?: HistoryItem['requestSnapshot']
  limitations?: ReplayLimitation[]
  extraSources?: ReplaySourceNote[]
}): ReplayExplainability => {
  const sources: ReplaySourceNote[] = [
    { category: 'authored', label: 'authored input', detail: 'Replay starts from the stored authored request shape.' },
  ]

  if (payload.requestSnapshot?.url.includes('{{')) {
    sources.push({ category: 'template', label: 'template resolution', detail: 'The original request contained template placeholders.' })
  }

  const secretBearing = [
    ...(payload.requestSnapshot?.headers ?? []),
    ...(payload.requestSnapshot?.params ?? []),
  ].some((item) => item.value?.trim() === REDACTED_SECRET_VALUE)
    || payload.requestSnapshot?.auth?.bearerToken?.trim() === REDACTED_SECRET_VALUE
    || payload.requestSnapshot?.auth?.password?.trim() === REDACTED_SECRET_VALUE
    || payload.requestSnapshot?.auth?.apiKeyValue?.trim() === REDACTED_SECRET_VALUE

  if (secretBearing) {
    sources.push({
      category: 'safe-projected',
      label: 'safe projection',
      detail: 'Sensitive values were redacted before this replayable snapshot was stored.',
    })
  }

  if (payload.extraSources?.length) {
    sources.push(...payload.extraSources)
  }

  const limitations = payload.limitations ?? []

  return {
    summary: createExplainabilitySummary(sources, limitations),
    sources,
    limitations,
  }
}

export const createHistoryEntry = (payload: {
  requestId?: string
  requestSnapshot?: HistoryItem['requestSnapshot']
  executionSource?: HistoryItem['executionSource']
  mcpArtifact?: HistoryItem['mcpArtifact']
  name: string
  method: string
  url: string
  status: number
  statusText?: string
  elapsedMs?: number
  sizeBytes?: number
  contentType?: string
  truncated?: boolean
  responseHeaders?: HistoryItem['responseHeaders']
  responsePreview?: string
  mcpSummary?: HistoryItem['mcpSummary']
  explainability?: HistoryItem['explainability']
}): HistoryItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  requestId: payload.requestId,
  name: payload.name,
  method: payload.method,
  time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  status: payload.status,
  statusText: payload.statusText,
  elapsedMs: payload.elapsedMs,
  sizeBytes: payload.sizeBytes,
  contentType: payload.contentType,
  truncated: payload.truncated,
  responseHeaders: payload.responseHeaders ? clonePlainData(payload.responseHeaders) : undefined,
  responsePreview: payload.responsePreview,
  url: payload.url,
  requestSnapshot: payload.requestSnapshot ? toSafeProjectionHistorySnapshot(clonePlainData(payload.requestSnapshot)) : undefined,
  explainability: payload.explainability ?? createReplayExplainability({
    requestSnapshot: payload.requestSnapshot ? toSafeProjectionHistorySnapshot(clonePlainData(payload.requestSnapshot)) : undefined,
  }),
  executionSource: payload.executionSource ?? 'live',
  mcpArtifact: payload.mcpArtifact ? cloneMcpExecutionArtifact(payload.mcpArtifact) : undefined,
  mcpSummary: payload.mcpSummary ? { ...payload.mcpSummary } : undefined,
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
    requestKind: resolveRequestKind(snapshot),
    mcp: cloneMcpRequestDefinition(snapshot.mcp),
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
      requestKind: resolveRequestKind(snapshot),
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
  requestKind: item.requestSnapshot?.requestKind ?? 'http',
  mcpArtifact: cloneMcpExecutionArtifact(item.mcpArtifact),
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
  explainability: item.explainability,
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

export type SnapshotValidationResult =
  | { ok: true; snapshot: WorkspaceSnapshot }
  | {
    ok: false
    reason: 'missing' | 'parse_failed' | 'invalid'
    message: string
    degraded: boolean
    userVisible: boolean
    ignoredSource?: 'browser_snapshot'
  }

export const readWorkspaceSnapshotResult = (): SnapshotValidationResult => {
  if (typeof window === 'undefined') {
    return {
      ok: false,
      reason: 'missing',
      message: 'Workspace snapshot unavailable outside browser runtime',
      degraded: false,
      userVisible: false,
    }
  }

  const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
  if (!raw) {
    return {
      ok: false,
      reason: 'missing',
      message: 'No saved workspace snapshot found',
      degraded: false,
      userVisible: false,
    }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>
    const snapshot = sanitizeSnapshot(parsed)

    if (!snapshot) {
      return {
        ok: false,
        reason: 'invalid',
        message: 'Saved browser snapshot was ignored because it is invalid. ZenRequest will restore from more reliable persisted state when available.',
        degraded: true,
        userVisible: true,
        ignoredSource: 'browser_snapshot',
      }
    }

    return { ok: true, snapshot }
  } catch {
    return {
      ok: false,
      reason: 'parse_failed',
      message: 'Saved browser snapshot could not be parsed and was ignored. ZenRequest will restore from more reliable persisted state when available.',
      degraded: true,
      userVisible: true,
      ignoredSource: 'browser_snapshot',
    }
  }
}

export const readWorkspaceSnapshot = (): WorkspaceSnapshot | null => {
  const result = readWorkspaceSnapshotResult()
  return result.ok ? result.snapshot : null
}

export const writeWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(toSafeProjectionWorkspaceSnapshot(snapshot)))
}

export const clearWorkspaceSnapshot = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(WORKSPACE_STORAGE_KEY)
}
