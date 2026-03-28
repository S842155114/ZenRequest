import { invoke } from '@tauri-apps/api/core'
import type {
  EnvironmentPreset,
  FormDataFieldSnapshot,
  HistoryItem,
  RequestCollection,
  RequestPreset,
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

export interface AppBootstrapPayload {
  settings: AppSettings
  workspaces: WorkspaceSummary[]
  activeWorkspaceId?: string
  session?: WorkspaceSessionSnapshot | null
  collections: RequestCollection[]
  environments: EnvironmentPreset[]
  history: HistoryItem[]
}

export interface WorkspaceSaveResult {
  savedAtEpochMs: number
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

export interface FormDataFieldDto {
  key: string
  value: string
  enabled: boolean
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
  body: RequestBodyDto
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
}

const buildNotImplementedError = (command: string): AppError => ({
  code: 'NOT_IMPLEMENTED',
  message: `${command} is not implemented yet`,
})

const normalizeError = (error: unknown): AppError => {
  if (typeof error === 'string') {
    return { code: 'TAURI_INVOKE_ERROR', message: error }
  }

  if (error instanceof Error) {
    return { code: 'TAURI_INVOKE_ERROR', message: error.message }
  }

  return {
    code: 'TAURI_INVOKE_ERROR',
    message: 'Unknown invoke error',
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
  .map((line) => {
    const separatorIndex = line.indexOf('=')
    if (separatorIndex < 0) {
      return { key: line, value: '', enabled: true }
    }

    return {
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1),
      enabled: true,
    }
  })
  .filter((item) => item.key.length > 0)

export const toRequestBodyDto = (
  payload: Pick<SendRequestPayload, 'body' | 'bodyType' | 'bodyContentType' | 'formDataFields' | 'binaryFileName' | 'binaryMimeType'>,
): RequestBodyDto => {
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
  payload: SendRequestPayload,
): SendRequestPayloadDto => ({
  ...payload,
  workspaceId,
  body: toRequestBodyDto(payload),
})

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
  sendRequest: (workspaceId: string, payload: SendRequestPayload) => activeAdapter.sendRequest(toSendRequestPayloadDto(workspaceId, payload)),
}
