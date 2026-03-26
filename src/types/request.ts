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

export interface FormDataFieldSnapshot {
  key: string
  value: string
  enabled: boolean
  fileName?: string
  mimeType?: string
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

export type HistoryRequestSnapshot = Omit<SendRequestPayload, 'body' | 'bodyType'> & {
  body: string | RequestBodySnapshot
  bodyType?: RequestBodyType
}

export interface RequestPreset {
  id: string
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
  auth?: Partial<AuthConfig>
  tests?: RequestTestDefinition[]
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
  requestSnapshot?: HistoryRequestSnapshot
}

export interface ResponseHeaderItem {
  key: string
  value: string
}

export interface ResponseState {
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
}

export interface EnvironmentPreset {
  id: string
  name: string
  variables: KeyValueItem[]
}

export interface RequestTabState {
  id: string
  requestId?: string
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
  auth: AuthConfig
  tests: RequestTestDefinition[]
  response: ResponseState
  isSending: boolean
  isDirty?: boolean
}

export interface SendRequestPayload {
  tabId: string
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
  auth: AuthConfig
  tests: RequestTestDefinition[]
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
