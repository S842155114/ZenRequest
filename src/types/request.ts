export interface KeyValueItem {
  key: string
  value: string
  description?: string
  enabled: boolean
}

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type AppLocale = 'en' | 'zh-CN'
export type RequestBodyType = 'json' | 'formdata' | 'raw' | 'binary'
export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey'
export type RequestTestSource = 'status' | 'header' | 'body'
export type RequestTestOperator = 'equals' | 'contains' | 'exists'
export type ResponseLifecycleState = 'idle' | 'pending' | 'success' | 'http-error' | 'transport-error'
export type RequestExecutionSource = 'live' | 'mock'
export type RequestRedirectPolicy = 'follow' | 'manual' | 'error'
export type RequestProxyMode = 'inherit' | 'off' | 'custom'
export type RequestTabOriginKind = 'resource' | 'replay' | 'scratch' | 'detached'
export type RequestTabPersistenceState = 'saved' | 'unsaved' | 'unbound'
export type RequestTabExecutionState = ResponseLifecycleState
export type RequestKind = 'http' | 'mcp'
export type McpTransportKind = 'http' | 'stdio'
export type McpOperationType = 'initialize' | 'tools.list' | 'tools.call' | 'resources.list' | 'resources.read'

export interface WorkbenchActivitySignal {
  active: boolean
  open: boolean
  dirty: boolean
  running: boolean
  recovered: boolean
  result: RequestTabExecutionState
}

export interface WorkbenchActivitySummary {
  open: number
  dirty: number
  running: number
  recovered: number
}

export interface WorkbenchActivityProjection {
  requests: Record<string, WorkbenchActivitySignal>
  history: Record<string, WorkbenchActivitySignal>
  tabs: Record<string, WorkbenchActivitySignal>
  summary: WorkbenchActivitySummary
}

export interface FormDataFieldSnapshot {
  key: string
  value: string
  enabled: boolean
  kind?: 'text' | 'file'
  fileName?: string
  mimeType?: string
}

export interface RequestMockState {
  enabled: boolean
  status: number
  statusText: string
  contentType: string
  body: string
  headers: KeyValueItem[]
}

export type RequestProxySettings =
  | { mode: 'inherit' }
  | { mode: 'off' }
  | { mode: 'custom'; url: string }

export interface RequestExecutionOptions {
  timeoutMs?: number
  redirectPolicy: RequestRedirectPolicy
  proxy: RequestProxySettings
  verifySsl: boolean
}

export type RequestBodySnapshot =
  | { kind: 'json'; value: string }
  | { kind: 'raw'; value: string; contentType?: string }
  | { kind: 'formData'; fields: FormDataFieldSnapshot[] }
  | { kind: 'binary'; bytesBase64: string; fileName?: string; mimeType?: string }

export interface AuthConfig {
  type: AuthType
  bearerToken: string
  username: string
  password: string
  apiKeyKey: string
  apiKeyValue: string
  apiKeyPlacement: 'header' | 'query'
}

export interface RequestTestDefinition {
  id: string
  name: string
  source: RequestTestSource
  operator: RequestTestOperator
  target?: string
  expected?: string
}

export interface RequestTestResult {
  id: string
  name: string
  passed: boolean
  message: string
}

export interface AssertionResultSet {
  passed: boolean
  results: RequestTestResult[]
}

export interface CompiledRequest {
  protocolKey: string
  method: string
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  body: RequestBodySnapshot
  auth: AuthConfig
  tests: RequestTestDefinition[]
}

export interface NormalizedResponse {
  status: number
  statusText: string
  elapsedMs: number
  sizeBytes: number
  contentType: string
  body: string
  headers: ResponseHeaderItem[]
  truncated: boolean
}

export interface ExecutionArtifact {
  executionSource: RequestExecutionSource
  executedAtEpochMs?: number
  compiledRequest: CompiledRequest
  normalizedResponse: NormalizedResponse
  assertionResults: AssertionResultSet
}

export interface McpConnectionConfig {
  transport: McpTransportKind
  baseUrl: string
  headers: KeyValueItem[]
  auth: AuthConfig
  sessionId?: string
}

export interface McpInitializeInput {
  clientName: string
  clientVersion: string
  protocolVersion?: string
  capabilities?: Record<string, unknown>
}

export interface McpToolSchemaSnapshot {
  name: string
  title?: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface McpResourceContentSnapshot {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export interface McpResourceSnapshot {
  uri: string
  name?: string
  title?: string
  description?: string
  mimeType?: string
}

export interface McpToolsListInput {
  cursor?: string
}

export interface McpResourcesListInput {
  cursor?: string
}

export interface McpResourceReadInput {
  uri: string
  resource?: McpResourceSnapshot
}

export interface McpToolCallInput {
  toolName: string
  arguments: Record<string, unknown>
  schema?: McpToolSchemaSnapshot
}

export type McpOperationInput =
  | { type: 'initialize'; input: McpInitializeInput }
  | { type: 'tools.list'; input: McpToolsListInput }
  | { type: 'tools.call'; input: McpToolCallInput }
  | { type: 'resources.list'; input: McpResourcesListInput }
  | { type: 'resources.read'; input: McpResourceReadInput }

export interface McpRequestDefinition {
  connection: McpConnectionConfig
  operation: McpOperationInput
}

export interface McpExecutionArtifact {
  transport: McpTransportKind
  operation: McpOperationType
  protocolRequest?: Record<string, unknown>
  protocolResponse?: Record<string, unknown>
  selectedTool?: McpToolSchemaSnapshot
  cachedTools?: McpToolSchemaSnapshot[]
  selectedResource?: McpResourceSnapshot
  cachedResources?: McpResourceSnapshot[]
  resourceContents?: McpResourceContentSnapshot[]
  sessionId?: string
  errorCategory?: 'transport' | 'session' | 'tool-call' | 'initialize' | 'tool_execution'
}

export type HistoryRequestSnapshot = Omit<SendRequestPayload, 'body' | 'bodyType'> & {
  body: string | RequestBodySnapshot
  bodyType?: RequestBodyType
}

export interface RequestPreset {
  id: string
  requestKind?: RequestKind
  mcp?: McpRequestDefinition
  name: string
  description?: string
  tags?: string[]
  method: string
  url: string
  workspaceId?: string
  collectionId?: string
  collectionName?: string
  params?: KeyValueItem[]
  headers?: KeyValueItem[]
  body?: string
  bodyType?: RequestBodyType
  bodyDefinition?: RequestBodySnapshot
  bodyContentType?: string
  formDataFields?: FormDataFieldSnapshot[]
  binaryFileName?: string
  binaryMimeType?: string
  auth?: Partial<AuthConfig>
  tests?: RequestTestDefinition[]
  mock?: RequestMockState
  executionOptions?: RequestExecutionOptions
}

export interface RequestCollection {
  id: string
  name: string
  expanded: boolean
  requests: RequestPreset[]
}

export interface HistoryItem {
  id: string
  name: string
  method: string
  time: string
  status: number
  url: string
  requestId?: string
  executedAtEpochMs?: number
  statusText?: string
  elapsedMs?: number
  sizeBytes?: number
  contentType?: string
  truncated?: boolean
  responseHeaders?: ResponseHeaderItem[]
  responsePreview?: string
  requestSnapshot?: HistoryRequestSnapshot
  executionSource?: RequestExecutionSource
  mcpArtifact?: McpExecutionArtifact
  mcpSummary?: {
    operation: McpOperationType
    transport: McpTransportKind
    errorCategory?: McpExecutionArtifact['errorCategory']
    toolName?: string
    resourceUri?: string
    sessionId?: string
  }
}

export interface ResponseHeaderItem {
  key: string
  value: string
}

export interface ResponseState {
  requestKind?: RequestKind
  mcpArtifact?: McpExecutionArtifact
  responseBody: string
  status: number
  statusText: string
  time: string
  size: string
  headers: ResponseHeaderItem[]
  contentType: string
  requestMethod: string
  requestUrl: string
  testResults: RequestTestResult[]
  state?: ResponseLifecycleState
  stale?: boolean
  executionSource?: RequestExecutionSource
}

export interface EnvironmentPreset {
  id: string
  name: string
  variables: KeyValueItem[]
}

export interface RequestTabOrigin {
  kind: RequestTabOriginKind
  requestId?: string
  historyItemId?: string
}

export interface RequestTabState {
  id: string
  requestKind?: RequestKind
  mcp?: McpRequestDefinition
  requestId?: string
  origin?: RequestTabOrigin
  persistenceState?: RequestTabPersistenceState
  executionState?: RequestTabExecutionState
  name: string
  description: string
  tags: string[]
  collectionName: string
  collectionId?: string
  method: string
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  body: string
  bodyType: RequestBodyType
  bodyDefinition?: RequestBodySnapshot
  bodyContentType?: string
  formDataFields?: FormDataFieldSnapshot[]
  binaryFileName?: string
  binaryMimeType?: string
  auth: AuthConfig
  tests: RequestTestDefinition[]
  mock?: RequestMockState
  executionOptions?: RequestExecutionOptions
  response: ResponseState
  isSending: boolean
  isDirty?: boolean
}

export interface SendRequestPayload {
  tabId: string
  requestKind?: RequestKind
  mcp?: McpRequestDefinition
  requestId?: string
  name: string
  description: string
  tags: string[]
  collectionName: string
  method: string
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  body: string
  bodyType: RequestBodyType
  bodyDefinition?: RequestBodySnapshot
  bodyContentType?: string
  formDataFields?: FormDataFieldSnapshot[]
  binaryFileName?: string
  binaryMimeType?: string
  auth: AuthConfig
  tests: RequestTestDefinition[]
  mock?: RequestMockState
  executionOptions?: RequestExecutionOptions
}

export interface WorkspaceSnapshot {
  locale: AppLocale
  themeMode: ThemeMode
  activeEnvironmentId: string
  environments: EnvironmentPreset[]
  collections: RequestCollection[]
  historyItems: HistoryItem[]
  openTabs: RequestTabState[]
  activeTabId: string
}

export interface WorkspaceSummary {
  id: string
  name: string
  description?: string
  sourceTemplateId?: string
}

export interface WorkspaceSessionSnapshot {
  activeEnvironmentId?: string
  openTabs: RequestTabState[]
  activeTabId?: string
}
