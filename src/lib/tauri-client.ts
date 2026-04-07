import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import type {
  AssertionResultSet,
  EnvironmentPreset,
  ExecutionArtifact,
  FormDataFieldSnapshot,
  HistoryItem,
  McpExecutionArtifact,
  McpPromptSnapshot,
  McpRequestDefinition,
  McpResourceSnapshot,
  McpToolSchemaSnapshot,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  SendRequestPayload,
  WorkspaceSessionSnapshot,
  WorkspaceSnapshot,
  WorkspaceSummary,
} from '@/types/request'

export interface AppError {
  code: string
  message: string
  details?: string
}

export interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: AppError
}

export interface AppSettings {
  themeMode: 'light' | 'dark' | 'system'
  locale: 'en' | 'zh-CN'
}

export interface RuntimeCapabilityDescriptor {
  key: string
  kind: 'protocol' | 'mcp_transport' | 'import_adapter' | 'execution_hook' | 'tool_packaging' | 'plugin_manifest'
  displayName: string
  availability: 'active' | 'reserved'
}

export interface RuntimeProtocolCapability {
  key: string
  displayName: string
  schemes: string[]
  availability: 'active' | 'reserved'
}

export interface RuntimeImportAdapterCapability {
  key: string
  displayName: string
  availability: 'active' | 'reserved'
}

export interface RuntimeExecutionHookCapability {
  key: string
  displayName: string
  availability: 'active' | 'reserved'
}

export interface RuntimeToolPackagingCapability {
  key: string
  displayName: string
  availability: 'active' | 'reserved'
}

export interface RuntimePluginManifestCapability {
  key: string
  displayName: string
  availability: 'active' | 'reserved'
}

export interface RuntimeCapabilities {
  descriptors: RuntimeCapabilityDescriptor[]
  protocols: RuntimeProtocolCapability[]
  importAdapters: RuntimeImportAdapterCapability[]
  executionHooks: RuntimeExecutionHookCapability[]
  toolPackaging: RuntimeToolPackagingCapability[]
  pluginManifests: RuntimePluginManifestCapability[]
}

export interface AppBootstrapPayload {
  settings: AppSettings
  workspaces: WorkspaceSummary[]
  activeWorkspaceId?: string
  capabilities?: RuntimeCapabilities
  session?: WorkspaceSessionSnapshot | null
  collections: RequestCollection[]
  environments: EnvironmentPreset[]
  history: HistoryItem[]
}

export interface WorkspaceSaveResult {
  savedAtEpochMs: number
}

export interface SaveTextFileInput {
  fileName: string
  contents: string
  targetPath?: string
}

export interface SaveTextFileResult {
  path: string
}

export interface SaveDialogOptions {
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}


export type ExportPackageScope = 'workspace' | 'application'
export type ImportConflictStrategy = 'skip' | 'rename' | 'overwrite'

export interface WorkspaceExportResult {
  fileName: string
  packageJson: string
  scope: ExportPackageScope
}

export interface WorkspaceImportResult {
  scope: ExportPackageScope
  workspace: WorkspaceSummary
  importedWorkspaceCount: number
  activeWorkspaceId?: string
}

export interface ImportPackageMeta {
  scope: ExportPackageScope
  workspaceCount: number
}

export interface ImportDiagnostic {
  code: string
  severity: 'warning' | 'skipped' | 'fatal'
  message: string
  location?: string
}

export interface OpenApiImportCandidate {
  collectionName: string
  request: RequestPreset
}

export interface OpenApiCollectionSuggestion {
  name: string
  requestCount: number
}

export interface OpenApiImportSummary {
  totalOperationCount: number
  importableRequestCount: number
  skippedOperationCount: number
  warningDiagnosticCount: number
}

export interface OpenApiImportAnalysis {
  version: string
  workspaceId: string
  sourceKind: string
  summary: OpenApiImportSummary
  diagnostics: ImportDiagnostic[]
  groupingSuggestions: OpenApiCollectionSuggestion[]
  candidates: OpenApiImportCandidate[]
}

export interface OpenApiImportApplyResult {
  importedRequestCount: number
  skippedOperationCount: number
  warningDiagnosticCount: number
  collectionNames: string[]
}

export interface FormDataFieldDto {
  key: string
  value: string
  enabled: boolean
  kind?: 'text' | 'file'
  fileName?: string
  mimeType?: string
}

export type RequestBodyDto =
  | { kind: 'json'; value: string }
  | { kind: 'raw'; value: string; contentType?: string }
  | { kind: 'formData'; fields: FormDataFieldDto[] }
  | { kind: 'binary'; bytesBase64: string; fileName?: string; mimeType?: string }

export type SendRequestPayloadDto = Omit<SendRequestPayload, 'body' | 'bodyType'> & {
  workspaceId: string
  activeEnvironmentId?: string
  body: RequestBodyDto
}

export interface SendMcpRequestPayloadDto {
  workspaceId: string
  activeEnvironmentId?: string
  tabId: string
  requestId?: string
  name: string
  description: string
  tags: string[]
  collectionName: string
  requestKind: 'mcp'
  mcp: McpRequestDefinition
}

export interface SendRequestResult {
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
  executionSource?: 'live' | 'mock'
  assertionResults?: AssertionResultSet
  executionArtifact?: ExecutionArtifact
  historyItem?: HistoryItem
}

export interface SendMcpRequestResult {
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
  executionSource?: 'live' | 'mock'
  mcpArtifact?: McpExecutionArtifact
  historyItem?: HistoryItem
}

export interface RuntimeAdapter {
  bootstrapApp(legacySnapshot?: WorkspaceSnapshot | null): Promise<ApiEnvelope<AppBootstrapPayload>>
  saveWorkspaceSession(workspaceId: string, session: WorkspaceSessionSnapshot): Promise<ApiEnvelope<WorkspaceSaveResult>>
  setActiveWorkspace(workspaceId: string): Promise<ApiEnvelope<{ message: string }>>
  createWorkspace(name: string): Promise<ApiEnvelope<WorkspaceSummary>>
  deleteWorkspace(workspaceId: string): Promise<ApiEnvelope<{ message: string }>>
  exportWorkspace(workspaceId: string, scope?: ExportPackageScope): Promise<ApiEnvelope<WorkspaceExportResult>>
  importWorkspace(packageJson: string, conflictStrategy?: ImportConflictStrategy): Promise<ApiEnvelope<WorkspaceImportResult>>
  importCurlRequest(workspaceId: string, command: string): Promise<ApiEnvelope<RequestTabState>>
  analyzeOpenApiImport(workspaceId: string, document: string): Promise<ApiEnvelope<OpenApiImportAnalysis>>
  applyOpenApiImport(workspaceId: string, analysis: OpenApiImportAnalysis): Promise<ApiEnvelope<OpenApiImportApplyResult>>
  createCollection(workspaceId: string, name: string): Promise<ApiEnvelope<RequestCollection>>
  renameCollection(workspaceId: string, collectionId: string, name: string): Promise<ApiEnvelope<RequestCollection>>
  deleteCollection(workspaceId: string, collectionId: string): Promise<ApiEnvelope<{ message: string }>>
  saveRequest(workspaceId: string, collectionId: string, request: RequestPreset): Promise<ApiEnvelope<RequestPreset>>
  deleteRequest(workspaceId: string, requestId: string): Promise<ApiEnvelope<{ message: string }>>
  createEnvironment(workspaceId: string, name: string): Promise<ApiEnvelope<EnvironmentPreset>>
  renameEnvironment(workspaceId: string, environmentId: string, name: string): Promise<ApiEnvelope<EnvironmentPreset>>
  deleteEnvironment(workspaceId: string, environmentId: string): Promise<ApiEnvelope<{ message: string }>>
  updateEnvironmentVariables(workspaceId: string, environmentId: string, variables: EnvironmentPreset['variables']): Promise<ApiEnvelope<EnvironmentPreset>>
  clearHistory(workspaceId: string): Promise<ApiEnvelope<{ message: string }>>
  removeHistoryItem(workspaceId: string, id: string): Promise<ApiEnvelope<{ message: string }>>
  getSettings(): Promise<ApiEnvelope<AppSettings>>
  updateSettings(payload: AppSettings): Promise<ApiEnvelope<AppSettings>>
  sendRequest(payload: SendRequestPayloadDto): Promise<ApiEnvelope<SendRequestResult>>
  sendMcpRequest(payload: SendMcpRequestPayloadDto): Promise<ApiEnvelope<SendMcpRequestResult>>
  discoverMcpTools(payload: SendMcpRequestPayloadDto): Promise<ApiEnvelope<McpToolSchemaSnapshot[]>>
  discoverMcpResources(payload: SendMcpRequestPayloadDto): Promise<ApiEnvelope<McpResourceSnapshot[]>>
  discoverMcpPrompts(payload: SendMcpRequestPayloadDto): Promise<ApiEnvelope<McpPromptSnapshot[]>>
  saveTextFile(input: SaveTextFileInput): Promise<ApiEnvelope<SaveTextFileResult>>
  promptSavePath(options?: SaveDialogOptions): Promise<string | null>
}

const buildNotImplementedError = (command: string): AppError => ({
  code: 'NOT_IMPLEMENTED',
  message: `${command} is not implemented yet`,
})

const normalizeError = (error: unknown): AppError => {
  if (typeof error === 'string') {
    return {
      code: 'TAURI_INVOKE_ERROR',
      message: error.trim() || 'Unexpected desktop invoke failure',
    }
  }

  if (error instanceof Error) {
    return {
      code: 'TAURI_INVOKE_ERROR',
      message: error.message.trim() || 'Unexpected desktop invoke failure',
    }
  }

  return {
    code: 'TAURI_INVOKE_ERROR',
    message: 'Unexpected desktop invoke failure',
    details: JSON.stringify(error),
  }
}

const isEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
  if (!value || typeof value !== 'object') return false
  return typeof (value as { ok?: unknown }).ok === 'boolean'
}

const invokeEnvelope = async <T>(command: string, args?: Record<string, unknown>): Promise<ApiEnvelope<T>> => {
  try {
    const result = await invoke<unknown>(command, args)
    if (isEnvelope<T>(result)) {
      return result
    }

    return {
      ok: true,
      data: result as T,
    }
  } catch (error) {
    return {
      ok: false,
      error: normalizeError(error),
    }
  }
}

const isTauriEnvironment = () => {
  if (typeof window === 'undefined') return false
  const globalWindow = window as unknown as Record<string, unknown>
  return '__TAURI_INTERNALS__' in globalWindow || '__TAURI__' in globalWindow
}

const parseFormDataBody = (raw: string): FormDataFieldDto[] => raw
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map<FormDataFieldDto>((line) => {
    const separatorIndex = line.indexOf('=')
    if (separatorIndex < 0) {
      return { key: line, value: '', enabled: true, kind: 'text' }
    }

    return {
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1),
      enabled: true,
      kind: 'text',
    }
  })
  .filter((item) => item.key.length > 0)

export const toRequestBodyDto = (
  payload: Pick<SendRequestPayload, 'body' | 'bodyType' | 'bodyDefinition' | 'bodyContentType' | 'formDataFields' | 'binaryFileName' | 'binaryMimeType'>,
): RequestBodyDto => {
  if (payload.bodyDefinition) {
    switch (payload.bodyDefinition.kind) {
      case 'json':
        return { kind: 'json', value: payload.bodyDefinition.value }
      case 'raw':
        return {
          kind: 'raw',
          value: payload.bodyDefinition.value,
          contentType: payload.bodyDefinition.contentType,
        }
      case 'formData':
        return {
          kind: 'formData',
          fields: payload.bodyDefinition.fields.map((field) => ({ ...field })) as FormDataFieldDto[],
        }
      case 'binary':
        return {
          kind: 'binary',
          bytesBase64: payload.bodyDefinition.bytesBase64,
          fileName: payload.bodyDefinition.fileName,
          mimeType: payload.bodyDefinition.mimeType,
        }
    }
  }

  switch (payload.bodyType) {
    case 'json':
      return { kind: 'json', value: payload.body }
    case 'raw':
      return {
        kind: 'raw',
        value: payload.body,
        contentType: payload.bodyContentType?.trim() || undefined,
      }
    case 'formdata':
      return {
        kind: 'formData',
        fields: (payload.formDataFields?.length
          ? payload.formDataFields
          : parseFormDataBody(payload.body)) as FormDataFieldDto[],
      }
    case 'binary':
      return {
        kind: 'binary',
        bytesBase64: payload.body,
        fileName: payload.binaryFileName?.trim() || undefined,
        mimeType: payload.binaryMimeType?.trim() || undefined,
      }
    default:
      return { kind: 'raw', value: payload.body }
  }
}

export const toSendRequestPayloadDto = (
  workspaceId: string,
  activeEnvironmentId: string | undefined,
  payload: SendRequestPayload,
): SendRequestPayloadDto => ({
  ...payload,
  workspaceId,
  activeEnvironmentId,
  body: toRequestBodyDto(payload),
})

export const toSendMcpRequestPayloadDto = (
  workspaceId: string,
  activeEnvironmentId: string | undefined,
  payload: SendRequestPayload,
): SendMcpRequestPayloadDto => {
  if (payload.requestKind !== 'mcp' || !payload.mcp) {
    throw new Error('MCP payload requires requestKind="mcp" and an mcp definition')
  }

  return {
    workspaceId,
    activeEnvironmentId,
    tabId: payload.tabId,
    requestId: payload.requestId,
    name: payload.name,
    description: payload.description,
    tags: [...payload.tags],
    collectionName: payload.collectionName,
    requestKind: 'mcp',
    mcp: payload.mcp,
  }
}

export const detectImportPackageMeta = (packageJson: string): ImportPackageMeta => {
  const parsed = JSON.parse(packageJson) as Record<string, unknown>
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Import package must be a JSON object')
  }

  if (parsed.scope === 'application') {
    return {
      scope: 'application',
      workspaceCount: Array.isArray(parsed.workspaces) ? parsed.workspaces.length : 0,
    }
  }

  return {
    scope: 'workspace',
    workspaceCount: 1,
  }
}

const tauriAdapter: RuntimeAdapter = {
  bootstrapApp: (legacySnapshot) => invokeEnvelope<AppBootstrapPayload>('bootstrap_app', { legacySnapshot }),
  saveWorkspaceSession: (workspaceId, session) => invokeEnvelope<WorkspaceSaveResult>('save_workspace', {
    payload: { workspaceId, session },
  }),
  setActiveWorkspace: (workspaceId) => invokeEnvelope<{ message: string }>('set_active_workspace', {
    payload: { workspaceId },
  }),
  createWorkspace: (name) => invokeEnvelope<WorkspaceSummary>('create_workspace', {
    payload: { name },
  }),
  deleteWorkspace: (workspaceId) => invokeEnvelope<{ message: string }>('delete_workspace', {
    payload: { workspaceId },
  }),
  exportWorkspace: (workspaceId, scope = 'workspace') => invokeEnvelope<WorkspaceExportResult>('export_workspace', {
    payload: { workspaceId, scope },
  }),
  importWorkspace: (packageJson, conflictStrategy = 'rename') => invokeEnvelope<WorkspaceImportResult>('import_workspace', {
    payload: { packageJson, conflictStrategy },
  }),
  importCurlRequest: (workspaceId, command) => invokeEnvelope<RequestTabState>('import_curl_request', {
    payload: { workspaceId, command },
  }),
  analyzeOpenApiImport: (workspaceId, document) => invokeEnvelope<OpenApiImportAnalysis>('analyze_openapi_import', {
    payload: { workspaceId, document },
  }),
  applyOpenApiImport: (workspaceId, analysis) => invokeEnvelope<OpenApiImportApplyResult>('apply_openapi_import', {
    payload: { workspaceId, analysis },
  }),
  createCollection: (workspaceId, name) => invokeEnvelope<RequestCollection>('create_collection', {
    payload: { workspaceId, name },
  }),
  renameCollection: (workspaceId, collectionId, name) => invokeEnvelope<RequestCollection>('rename_collection', {
    payload: { workspaceId, collectionId, name },
  }),
  deleteCollection: (workspaceId, collectionId) => invokeEnvelope<{ message: string }>('delete_collection', {
    payload: { workspaceId, collectionId },
  }),
  saveRequest: (workspaceId, collectionId, request) => invokeEnvelope<RequestPreset>('save_request', {
    payload: { workspaceId, collectionId, request },
  }),
  deleteRequest: (workspaceId, requestId) => invokeEnvelope<{ message: string }>('delete_request', {
    payload: { workspaceId, requestId },
  }),
  createEnvironment: (workspaceId, name) => invokeEnvelope<EnvironmentPreset>('create_environment', {
    payload: { workspaceId, name },
  }),
  renameEnvironment: (workspaceId, environmentId, name) => invokeEnvelope<EnvironmentPreset>('rename_environment', {
    payload: { workspaceId, environmentId, name },
  }),
  deleteEnvironment: (workspaceId, environmentId) => invokeEnvelope<{ message: string }>('delete_environment', {
    payload: { workspaceId, environmentId },
  }),
  updateEnvironmentVariables: (workspaceId, environmentId, variables) => invokeEnvelope<EnvironmentPreset>('update_environment_variables', {
    payload: { workspaceId, environmentId, variables },
  }),
  clearHistory: (workspaceId) => invokeEnvelope<{ message: string }>('clear_history', {
    payload: { workspaceId },
  }),
  removeHistoryItem: (workspaceId, id) => invokeEnvelope<{ message: string }>('remove_history_item', {
    payload: { workspaceId, id },
  }),
  getSettings: () => invokeEnvelope<AppSettings>('get_settings'),
  updateSettings: (payload) => invokeEnvelope<AppSettings>('update_settings', { payload }),
  sendRequest: (payload) => invokeEnvelope<SendRequestResult>('send_request', { payload }),
  sendMcpRequest: (payload) => invokeEnvelope<SendMcpRequestResult>('send_mcp_request', { payload }),
  discoverMcpTools: async (payload) => {
    const result = await invokeEnvelope<SendMcpRequestResult>('send_mcp_request', {
      payload: {
        ...payload,
        mcp: {
          ...payload.mcp,
          operation: { type: 'tools.list', input: { cursor: '' } },
        },
      },
    })
    if (!result.ok || !result.data) return { ok: false, error: result.error }
    const tools = (((result.data.mcpArtifact?.protocolResponse as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined)?.tools)
    if (!Array.isArray(tools)) return { ok: true, data: [] }
    return {
      ok: true,
      data: tools
        .filter((tool): tool is Record<string, unknown> => typeof tool === 'object' && tool !== null)
        .map((tool) => ({
          name: typeof tool.name === 'string' ? tool.name : '',
          title: typeof tool.title === 'string' ? tool.title : undefined,
          description: typeof tool.description === 'string' ? tool.description : undefined,
          inputSchema: typeof tool.inputSchema === 'object' && tool.inputSchema !== null
            ? JSON.parse(JSON.stringify(tool.inputSchema)) as Record<string, unknown>
            : undefined,
        }))
        .filter((tool) => tool.name.trim().length > 0),
    }
  },
  discoverMcpResources: async (payload) => {
    const result = await invokeEnvelope<SendMcpRequestResult>('send_mcp_request', {
      payload: {
        ...payload,
        mcp: {
          ...payload.mcp,
          operation: { type: 'resources.list', input: { cursor: '' } },
        },
      },
    })
    if (!result.ok || !result.data) return { ok: false, error: result.error }
    const resources = (((result.data.mcpArtifact?.protocolResponse as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined)?.resources)
    if (!Array.isArray(resources)) return { ok: true, data: [] }
    return {
      ok: true,
      data: resources
        .filter((resource): resource is Record<string, unknown> => typeof resource === 'object' && resource !== null)
        .map((resource) => ({
          uri: typeof resource.uri === 'string' ? resource.uri : '',
          name: typeof resource.name === 'string' ? resource.name : undefined,
          title: typeof resource.title === 'string' ? resource.title : undefined,
          description: typeof resource.description === 'string' ? resource.description : undefined,
          mimeType: typeof resource.mimeType === 'string' ? resource.mimeType : undefined,
        }))
        .filter((resource) => resource.uri.trim().length > 0),
    }
  },
  discoverMcpPrompts: async (payload) => {
    const result = await invokeEnvelope<SendMcpRequestResult>('send_mcp_request', {
      payload: {
        ...payload,
        mcp: {
          ...payload.mcp,
          operation: { type: 'prompts.list', input: { cursor: '' } },
        },
      },
    })
    if (!result.ok || !result.data) return { ok: false, error: result.error }
    const prompts = (((result.data.mcpArtifact?.protocolResponse as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined)?.prompts)
    if (!Array.isArray(prompts)) return { ok: true, data: [] }
    return {
      ok: true,
      data: prompts
        .filter((prompt): prompt is Record<string, unknown> => typeof prompt === 'object' && prompt !== null)
        .map((prompt) => ({
          name: typeof prompt.name === 'string' ? prompt.name : '',
          title: typeof prompt.title === 'string' ? prompt.title : undefined,
          description: typeof prompt.description === 'string' ? prompt.description : undefined,
          arguments: Array.isArray(prompt.arguments)
            ? prompt.arguments.filter((argument): argument is Record<string, unknown> => typeof argument === 'object' && argument !== null).map((argument) => ({
                name: typeof argument.name === 'string' ? argument.name : '',
                title: typeof argument.title === 'string' ? argument.title : undefined,
                description: typeof argument.description === 'string' ? argument.description : undefined,
                required: typeof argument.required === 'boolean' ? argument.required : undefined,
              })).filter((argument) => argument.name.trim().length > 0)
            : undefined,
        }))
        .filter((prompt) => prompt.name.trim().length > 0),
    }
  },
  saveTextFile: (input) => invokeEnvelope<SaveTextFileResult>('save_text_file', { payload: input }),
  promptSavePath: async (options = {}) => {
    const selected = await save({
      defaultPath: options.defaultPath,
      filters: options.filters,
    })

    return typeof selected === 'string' ? selected : null
  },
}

const mockAdapter: RuntimeAdapter = {
  bootstrapApp: async () => ({
    ok: true,
    data: {
      settings: { themeMode: 'dark', locale: 'en' },
      workspaces: [{ id: 'workspace-demo', name: 'Demo Workspace' }],
      activeWorkspaceId: 'workspace-demo',
      session: {
        activeEnvironmentId: 'local',
        activeTabId: undefined,
        openTabs: [],
      },
      collections: [],
      environments: [],
      history: [],
    },
  }),
  saveWorkspaceSession: async () => ({ ok: true, data: { savedAtEpochMs: Date.now() } }),
  setActiveWorkspace: async () => ({ ok: true, data: { message: 'ok' } }),
  createWorkspace: async (name) => ({ ok: true, data: { id: `workspace-${Date.now()}`, name } }),
  deleteWorkspace: async () => ({ ok: true, data: { message: 'ok' } }),
  exportWorkspace: async (workspaceId) => ({
    ok: true,
    data: {
      fileName: `${workspaceId}.json`,
      packageJson: JSON.stringify({ workspaceId }, null, 2),
      scope: 'workspace',
    },
  }),
  importWorkspace: async () => ({
    ok: true,
    data: {
      scope: 'workspace',
      workspace: { id: `workspace-${Date.now()}`, name: 'Imported Workspace' },
      importedWorkspaceCount: 1,
      activeWorkspaceId: `workspace-${Date.now()}`,
    },
  }),
  importCurlRequest: async () => ({ ok: false, error: buildNotImplementedError('import_curl_request') }),
  analyzeOpenApiImport: async () => ({ ok: false, error: buildNotImplementedError('analyze_openapi_import') }),
  applyOpenApiImport: async () => ({ ok: false, error: buildNotImplementedError('apply_openapi_import') }),
  createCollection: async (_workspaceId, name) => ({
    ok: true,
    data: { id: `collection-${Date.now()}`, name, expanded: true, requests: [] },
  }),
  renameCollection: async (_workspaceId, collectionId, name) => ({
    ok: true,
    data: { id: collectionId, name, expanded: true, requests: [] },
  }),
  deleteCollection: async () => ({ ok: true, data: { message: 'ok' } }),
  saveRequest: async (_workspaceId, collectionId, request) => ({
    ok: true,
    data: { ...request, collectionId },
  }),
  deleteRequest: async () => ({ ok: true, data: { message: 'ok' } }),
  createEnvironment: async (_workspaceId, name) => ({ ok: true, data: { id: `env-${Date.now()}`, name, variables: [] } }),
  renameEnvironment: async (_workspaceId, environmentId, name) => ({ ok: true, data: { id: environmentId, name, variables: [] } }),
  deleteEnvironment: async () => ({ ok: true, data: { message: 'ok' } }),
  updateEnvironmentVariables: async (_workspaceId, environmentId, variables) => ({
    ok: true,
    data: { id: environmentId, name: 'Environment', variables },
  }),
  clearHistory: async () => ({ ok: true, data: { message: 'ok' } }),
  removeHistoryItem: async () => ({ ok: true, data: { message: 'ok' } }),
  getSettings: async () => ({ ok: true, data: { themeMode: 'dark', locale: 'en' } }),
  updateSettings: async (payload) => ({ ok: true, data: payload }),
  sendRequest: async () => ({ ok: false, error: buildNotImplementedError('send_request') }),
  sendMcpRequest: async () => ({ ok: false, error: buildNotImplementedError('send_mcp_request') }),
  discoverMcpTools: async () => ({ ok: false, error: buildNotImplementedError('discover_mcp_tools') }),
  discoverMcpResources: async () => ({ ok: false, error: buildNotImplementedError('discover_mcp_resources') }),
  discoverMcpPrompts: async () => ({ ok: false, error: buildNotImplementedError('discover_mcp_prompts') }),
  saveTextFile: async (input) => ({ ok: true, data: { path: input.targetPath ?? input.fileName } }),
  promptSavePath: async (options) => options?.defaultPath ?? null,
}

let activeAdapter: RuntimeAdapter = isTauriEnvironment() ? tauriAdapter : mockAdapter

export const setRuntimeAdapter = (adapter: RuntimeAdapter) => {
  activeAdapter = adapter
}

export const runtimeClient = {
  bootstrapApp: (legacySnapshot?: WorkspaceSnapshot | null) => activeAdapter.bootstrapApp(legacySnapshot),
  saveWorkspaceSession: (workspaceId: string, session: WorkspaceSessionSnapshot) => activeAdapter.saveWorkspaceSession(workspaceId, session),
  setActiveWorkspace: (workspaceId: string) => activeAdapter.setActiveWorkspace(workspaceId),
  createWorkspace: (name: string) => activeAdapter.createWorkspace(name),
  deleteWorkspace: (workspaceId: string) => activeAdapter.deleteWorkspace(workspaceId),
  exportWorkspace: (workspaceId: string, scope: ExportPackageScope = 'workspace') => activeAdapter.exportWorkspace(workspaceId, scope),
  importWorkspace: (packageJson: string, conflictStrategy: ImportConflictStrategy = 'rename') => activeAdapter.importWorkspace(packageJson, conflictStrategy),
  importCurlRequest: (workspaceId: string, command: string) => activeAdapter.importCurlRequest(workspaceId, command),
  analyzeOpenApiImport: (workspaceId: string, document: string) => activeAdapter.analyzeOpenApiImport(workspaceId, document),
  applyOpenApiImport: (workspaceId: string, analysis: OpenApiImportAnalysis) => activeAdapter.applyOpenApiImport(workspaceId, analysis),
  createCollection: (workspaceId: string, name: string) => activeAdapter.createCollection(workspaceId, name),
  renameCollection: (workspaceId: string, collectionId: string, name: string) => activeAdapter.renameCollection(workspaceId, collectionId, name),
  deleteCollection: (workspaceId: string, collectionId: string) => activeAdapter.deleteCollection(workspaceId, collectionId),
  saveRequest: (workspaceId: string, collectionId: string, request: RequestPreset) => activeAdapter.saveRequest(workspaceId, collectionId, request),
  deleteRequest: (workspaceId: string, requestId: string) => activeAdapter.deleteRequest(workspaceId, requestId),
  createEnvironment: (workspaceId: string, name: string) => activeAdapter.createEnvironment(workspaceId, name),
  renameEnvironment: (workspaceId: string, environmentId: string, name: string) => activeAdapter.renameEnvironment(workspaceId, environmentId, name),
  deleteEnvironment: (workspaceId: string, environmentId: string) => activeAdapter.deleteEnvironment(workspaceId, environmentId),
  updateEnvironmentVariables: (workspaceId: string, environmentId: string, variables: EnvironmentPreset['variables']) => activeAdapter.updateEnvironmentVariables(workspaceId, environmentId, variables),
  clearHistory: (workspaceId: string) => activeAdapter.clearHistory(workspaceId),
  removeHistoryItem: (workspaceId: string, id: string) => activeAdapter.removeHistoryItem(workspaceId, id),
  getSettings: () => activeAdapter.getSettings(),
  updateSettings: (payload: AppSettings) => activeAdapter.updateSettings(payload),
  sendRequest: (workspaceId: string, activeEnvironmentId: string | undefined, payload: SendRequestPayload) =>
    activeAdapter.sendRequest(toSendRequestPayloadDto(workspaceId, activeEnvironmentId, payload)),
  sendMcpRequest: (workspaceId: string, activeEnvironmentId: string | undefined, payload: SendRequestPayload) =>
    activeAdapter.sendMcpRequest(toSendMcpRequestPayloadDto(workspaceId, activeEnvironmentId, payload)),
  discoverMcpTools: (workspaceId: string, activeEnvironmentId: string | undefined, payload: SendRequestPayload) =>
    activeAdapter.discoverMcpTools(toSendMcpRequestPayloadDto(workspaceId, activeEnvironmentId, payload)),
  discoverMcpResources: (workspaceId: string, activeEnvironmentId: string | undefined, payload: SendRequestPayload) =>
    activeAdapter.discoverMcpResources(toSendMcpRequestPayloadDto(workspaceId, activeEnvironmentId, payload)),
  discoverMcpPrompts: (workspaceId: string, activeEnvironmentId: string | undefined, payload: SendRequestPayload) =>
    activeAdapter.discoverMcpPrompts(toSendMcpRequestPayloadDto(workspaceId, activeEnvironmentId, payload)),
  saveTextFile: (input: SaveTextFileInput) => activeAdapter.saveTextFile(input),
  promptSavePath: (options: SaveDialogOptions = {}) => activeAdapter.promptSavePath(options),
}
