import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ApiEnvelope,
  AppBootstrapPayload,
  AppSettings,
  ExportPackageScope,
  RuntimeAdapter,
  WorkspaceExportResult,
  WorkspaceImportResult,
  WorkspaceSaveResult,
} from './tauri-client'
import { detectImportPackageMeta, runtimeClient, setRuntimeAdapter, toRequestBodyDto } from './tauri-client'
import type {
  EnvironmentPreset,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  SendRequestPayload,
  WorkspaceSessionSnapshot,
  WorkspaceSnapshot,
  WorkspaceSummary,
} from '@/types/request'

const ok = <T>(data: T): ApiEnvelope<T> => ({ ok: true, data })

const createAdapter = (
  overrides: Partial<RuntimeAdapter> = {},
): RuntimeAdapter => ({
  bootstrapApp: async (_legacySnapshot?: WorkspaceSnapshot | null) =>
    ok<AppBootstrapPayload>({
      settings: { themeMode: 'dark', locale: 'en' },
      workspaces: [],
      collections: [],
      environments: [],
      history: [],
    }),
  saveWorkspaceSession: async (_workspaceId: string, _session: WorkspaceSessionSnapshot) =>
    ok<WorkspaceSaveResult>({ savedAtEpochMs: Date.now() }),
  setActiveWorkspace: async (_workspaceId: string) => ok({ message: 'ok' }),
  createWorkspace: async (name: string) => ok<WorkspaceSummary>({ id: `workspace-${name}`, name }),
  deleteWorkspace: async (_workspaceId: string) => ok({ message: 'ok' }),
  exportWorkspace: async (_workspaceId: string, scope: ExportPackageScope = 'workspace') =>
    ok<WorkspaceExportResult>({
      fileName: 'zenrequest.json',
      packageJson: '{}',
      scope,
    }),
  importWorkspace: async (_packageJson: string) =>
    ok<WorkspaceImportResult>({
      scope: 'workspace',
      workspace: { id: 'workspace-1', name: 'Imported Workspace' },
      importedWorkspaceCount: 1,
      activeWorkspaceId: 'workspace-1',
    }),
  importCurlRequest: async (_workspaceId: string, _command: string) =>
    ok<RequestTabState>({
      id: 'tab-imported-curl',
      name: 'Imported Curl Request',
      description: '',
      tags: [],
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
      origin: { kind: 'scratch' },
      persistenceState: 'unsaved',
      executionState: 'idle',
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
  getSettings: async () => ok<AppSettings>({ themeMode: 'dark', locale: 'en' }),
  updateSettings: async (payload: AppSettings) => ok(payload),
  sendRequest: async (_payload) =>
    ({
      ok: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'send_request is not implemented yet' },
    }),
  ...overrides,
})

afterEach(() => {
  setRuntimeAdapter(createAdapter())
})

describe('detectImportPackageMeta', () => {
  it('treats legacy packages without scope as workspace imports', () => {
    expect(
      detectImportPackageMeta(
        JSON.stringify({
          formatVersion: 1,
          workspace: { id: 'workspace-1', name: 'Workspace 1' },
        }),
      ),
    ).toEqual({
      scope: 'workspace',
      workspaceCount: 1,
    })
  })

  it('detects application packages and counts workspaces', () => {
    expect(
      detectImportPackageMeta(
        JSON.stringify({
          scope: 'application',
          workspaces: [{ workspace: { id: 'workspace-1' } }, { workspace: { id: 'workspace-2' } }],
        }),
      ),
    ).toEqual({
      scope: 'application',
      workspaceCount: 2,
    })
  })
})

describe('runtimeClient export scope forwarding', () => {
  it('forwards the requested export scope to the active runtime adapter', async () => {
    const exportWorkspace = vi.fn<RuntimeAdapter['exportWorkspace']>(async (_workspaceId, scope = 'workspace') =>
      ok({
        fileName: 'zenrequest-backup.json',
        packageJson: '{}',
        scope,
      }))

    setRuntimeAdapter(createAdapter({ exportWorkspace }))

    await runtimeClient.exportWorkspace('workspace-1', 'application')

    expect(exportWorkspace).toHaveBeenCalledWith('workspace-1', 'application')
  })
})

describe('runtimeClient curl import forwarding', () => {
  it('forwards the workspace id and curl command to the active runtime adapter', async () => {
    const importCurlRequest = vi.fn<RuntimeAdapter['importCurlRequest']>(async (_workspaceId, _command) =>
      ok({
        id: 'tab-imported-curl',
        name: 'Imported Curl Request',
        description: '',
        tags: [],
        collectionName: 'Scratch Pad',
        method: 'GET',
        url: 'https://example.com/imported',
        params: [],
        headers: [],
        body: '',
        bodyType: 'json' as const,
        auth: {
          type: 'none' as const,
          bearerToken: '',
          username: '',
          password: '',
          apiKeyKey: '',
          apiKeyValue: '',
          apiKeyPlacement: 'header' as const,
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
      }))

    setRuntimeAdapter(createAdapter({ importCurlRequest }))

    await runtimeClient.importCurlRequest('workspace-1', 'curl https://example.com/imported')

    expect(importCurlRequest).toHaveBeenCalledWith('workspace-1', 'curl https://example.com/imported')
  })
})

describe('toRequestBodyDto', () => {
  it('prefers structured form-data fields when provided by the request editor', () => {
    expect(toRequestBodyDto({
      body: 'legacy=ignored',
      bodyType: 'formdata',
      formDataFields: [
        { key: 'alpha', value: '1', enabled: true },
        { key: 'beta', value: '2', enabled: false },
      ],
    } as any)).toEqual({
      kind: 'formData',
      fields: [
        { key: 'alpha', value: '1', enabled: true },
        { key: 'beta', value: '2', enabled: false },
      ],
    })
  })

  it('forwards binary metadata alongside the encoded payload', () => {
    expect(toRequestBodyDto({
      body: 'ZmFrZS1ieXRlcw==',
      bodyType: 'binary',
      binaryFileName: 'demo.bin',
      binaryMimeType: 'application/octet-stream',
    } as any)).toEqual({
      kind: 'binary',
      bytesBase64: 'ZmFrZS1ieXRlcw==',
      fileName: 'demo.bin',
      mimeType: 'application/octet-stream',
    })
  })
})
