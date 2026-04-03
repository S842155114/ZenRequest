import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ApiEnvelope,
  AppBootstrapPayload,
  AppSettings,
  ExportPackageScope,
  OpenApiImportAnalysis,
  OpenApiImportApplyResult,
  RuntimeAdapter,
  WorkspaceExportResult,
  WorkspaceImportResult,
  WorkspaceSaveResult,
} from './tauri-client'
import { detectImportPackageMeta, runtimeClient, setRuntimeAdapter, toRequestBodyDto, toSendRequestPayloadDto } from './tauri-client'
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

const createOpenApiAnalysis = (): OpenApiImportAnalysis => ({
  version: '1',
  workspaceId: 'workspace-1',
  sourceKind: 'openapi',
  summary: {
    totalOperationCount: 2,
    importableRequestCount: 1,
    skippedOperationCount: 1,
    warningDiagnosticCount: 1,
  },
  diagnostics: [
    {
      code: 'OPENAPI_MISSING_SERVER',
      severity: 'warning',
      message: 'no server definition found; request URL will stay path-relative',
      location: 'GET /pets',
    },
  ],
  groupingSuggestions: [
    { name: 'Petstore - Pets', requestCount: 1 },
  ],
  candidates: [
    {
      collectionName: 'Petstore - Pets',
      request: {
        id: 'request-openapi-candidate',
        name: 'List pets',
        description: '',
        tags: ['pets'],
        collectionId: 'collection-pets',
        collectionName: 'Petstore - Pets',
        method: 'GET',
        url: 'https://api.example.com/pets',
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
      },
    },
  ],
})

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
  analyzeOpenApiImport: async (_workspaceId: string, _document: string) => ok(createOpenApiAnalysis()),
  applyOpenApiImport: async (_workspaceId: string, _analysis: OpenApiImportAnalysis) =>
    ok<OpenApiImportApplyResult>({
      importedRequestCount: 1,
      skippedOperationCount: 1,
      warningDiagnosticCount: 1,
      collectionNames: ['Petstore - Pets'],
    }),
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

describe('runtimeClient OpenAPI import forwarding', () => {
  it('forwards the workspace id and document to OpenAPI analyze', async () => {
    const analyzeOpenApiImport = vi.fn<RuntimeAdapter['analyzeOpenApiImport']>(async (_workspaceId, _document) =>
      ok(createOpenApiAnalysis()))

    setRuntimeAdapter(createAdapter({ analyzeOpenApiImport }))

    await runtimeClient.analyzeOpenApiImport('workspace-1', 'openapi: 3.0.3')

    expect(analyzeOpenApiImport).toHaveBeenCalledWith('workspace-1', 'openapi: 3.0.3')
  })

  it('forwards the versioned analysis snapshot to OpenAPI apply', async () => {
    const analysis = createOpenApiAnalysis()
    const applyOpenApiImport = vi.fn<RuntimeAdapter['applyOpenApiImport']>(async (_workspaceId, _analysis) =>
      ok({
        importedRequestCount: 1,
        skippedOperationCount: 1,
        warningDiagnosticCount: 1,
        collectionNames: ['Petstore - Pets'],
      }))

    setRuntimeAdapter(createAdapter({ applyOpenApiImport }))

    await runtimeClient.applyOpenApiImport('workspace-1', analysis)

    expect(applyOpenApiImport).toHaveBeenCalledWith('workspace-1', analysis)
  })
})

describe('toRequestBodyDto', () => {
  it('prefers structured form-data fields when provided by the request editor', () => {
    expect(toRequestBodyDto({
      body: 'legacy=ignored',
      bodyType: 'formdata',
      formDataFields: [
        { key: 'alpha', value: '1', enabled: true, kind: 'text' },
        { key: 'beta', value: '2', enabled: false, kind: 'text' },
      ],
    } as any)).toEqual({
      kind: 'formData',
      fields: [
        { key: 'alpha', value: '1', enabled: true, kind: 'text' },
        { key: 'beta', value: '2', enabled: false, kind: 'text' },
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

describe('toSendRequestPayloadDto', () => {
  it('forwards execution options without merging them into executionSource', () => {
    const payload = toSendRequestPayloadDto('workspace-1', 'env-1', {
      tabId: 'tab-1',
      requestId: 'request-1',
      name: 'Proxy test',
      description: '',
      tags: [],
      collectionName: 'Demo',
      method: 'GET',
      url: 'https://example.com',
      params: [],
      headers: [],
      body: '',
      bodyType: 'raw',
      auth: {
        type: 'none',
        bearerToken: '',
        username: '',
        password: '',
        apiKeyKey: 'X-API-Key',
        apiKeyValue: '',
        apiKeyPlacement: 'header',
      },
      tests: [],
      executionOptions: {
        timeoutMs: 5000,
        redirectPolicy: 'manual',
        proxy: { mode: 'custom', url: 'http://127.0.0.1:8080' },
        verifySsl: false,
      },
    })

    expect(payload.executionOptions).toEqual({
      timeoutMs: 5000,
      redirectPolicy: 'manual',
      proxy: { mode: 'custom', url: 'http://127.0.0.1:8080' },
      verifySsl: false,
    })
    expect(payload).not.toHaveProperty('executionSource')
  })
})
