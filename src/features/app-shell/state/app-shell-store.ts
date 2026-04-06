import { defaultRequestPreset } from '@/data/request-presets'
import type {
  AppLocale,
  EnvironmentPreset,
  HistoryItem,
  KeyValueItem,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  SendRequestPayload,
  ThemeMode,
  WorkspaceSessionSnapshot,
  WorkspaceSnapshot,
  WorkspaceSummary,
  WorkbenchActivityProjection,
} from '@/types/request'
import type {
  AppBootstrapPayload as RuntimeBootstrapPayload,
  RuntimeCapabilities,
  SendMcpRequestResult,
  SendRequestResult,
} from '@/lib/tauri-client'
import type { StartupState } from '../types'
import { createWorkbenchActivityProjection } from '../domain/request-activity'
import { resolveActiveRequestUrl, resolveHttpRequestDraft } from '../domain/url-resolution'
import {
  HISTORY_LIMIT,
  cloneAuth,
  cloneCollection,
  cloneEnvironment,
  cloneItems,
  cloneResponse,
  cloneTab,
  cloneTests,
  createHistoryEntry,
  createRequestTabFromPreset,
  defaultEnvironments,
  formatBytes,
  resolveResponseStateFromStatus,
} from '@/lib/request-workspace'

const DEFAULT_WORKSPACE: WorkspaceSummary = { id: 'workspace-local', name: 'Local Workspace' }
const SCRATCH_PAD_COLLECTION_NAME = 'Scratch Pad'

export interface AppShellState {
  settings: {
    locale: AppLocale
    themeMode: ThemeMode
  }
  runtime: {
    capabilities?: RuntimeCapabilities
    ready: boolean
    startupState: StartupState
    startupErrorMessage: string
    workbenchBusy: boolean
  }
  workspace: {
    items: WorkspaceSummary[]
    activeId: string
  }
  environment: {
    items: EnvironmentPreset[]
    activeId: string
  }
  request: {
    collections: RequestCollection[]
    historyItems: HistoryItem[]
    openTabs: RequestTabState[]
    activeTabId: string
  }
}

export interface SendSuccessInput {
  payload: SendRequestPayload
  response: SendRequestResult | SendMcpRequestResult
}

export interface SaveRequestMutationInput {
  tabId: string
  request: RequestPreset
  collection: RequestCollection
  requestName: string
  requestDescription: string
  requestTags: string[]
}

export interface AppShellStore {
  state: AppShellState
  selectors: {
    getActiveWorkspace: () => WorkspaceSummary | undefined
    getActiveEnvironment: () => EnvironmentPreset | undefined
    getActiveTab: () => RequestTabState | undefined
    getTabById: (tabId: string) => RequestTabState | undefined
    getCollectionById: (collectionId: string) => RequestCollection | undefined
    getCollectionByName: (name: string) => RequestCollection | undefined
    getActiveRequestResourceId: () => string | undefined
    getWorkbenchActivityProjection: () => WorkbenchActivityProjection
    getResolvedActiveUrl: () => string
    canDeleteWorkspace: () => boolean
    canImportOpenApi: () => boolean
    buildWorkspaceSession: () => WorkspaceSessionSnapshot
  }
  mutations: {
    setRuntimeReady: (value: boolean) => void
    setWorkbenchBusy: (value: boolean) => void
    setStartupState: (state: StartupState, message?: string) => void
    applySettings: (settings: { locale: AppLocale; themeMode: ThemeMode }) => void
    applyBootstrapPayload: (payload: RuntimeBootstrapPayload) => void
    selectWorkspace: (workspaceId: string) => void
    selectEnvironment: (environmentId: string) => void
    selectTab: (tabId: string) => void
    updateTab: (tabId: string, updater: (tab: RequestTabState) => RequestTabState) => void
    appendAndActivateTab: (tab: RequestTabState) => void
    closeTabWithFallback: (tabId: string) => void
    prependCollection: (collection: RequestCollection) => void
    replaceCollection: (collection: RequestCollection) => void
    removeCollection: (collectionId: string) => void
    renameTabCollectionReference: (collectionId: string, nextName: string) => void
    detachTabsForDeletedRequest: (requestId: string) => void
    detachTabsForDeletedCollection: (input: {
      collectionId: string
      requestIds: string[]
      fallbackCollectionName: string
    }) => void
    applySavedRequest: (input: SaveRequestMutationInput) => void
    appendEnvironment: (environment: EnvironmentPreset) => void
    replaceEnvironment: (environment: EnvironmentPreset) => void
    removeEnvironment: (input: { environmentId: string; fallbackEnvironmentId?: string }) => void
    updateEnvironmentVariables: (environmentId: string, variables: KeyValueItem[]) => void
    prependHistoryItem: (item: HistoryItem, limit?: number) => void
    removeHistoryItem: (id: string) => void
    clearHistory: () => void
    detachTabsForDeletedHistoryItem: (id: string) => void
    detachTabsForClearedHistory: () => void
    applySendPending: (payload: SendRequestPayload) => void
    applySendSuccess: (input: SendSuccessInput) => void
    applySendFailure: (input: { payload: SendRequestPayload; message: string }) => void
  }
}

export const createInitialAppShellState = (legacySnapshot?: WorkspaceSnapshot | null): AppShellState => {
  const initialEnvironments = defaultEnvironments().map(cloneEnvironment)
  const initialTabs = [createRequestTabFromPreset(defaultRequestPreset)]

  return {
    settings: {
      locale: legacySnapshot?.locale ?? 'en',
      themeMode: legacySnapshot?.themeMode ?? 'dark',
    },
    runtime: {
      capabilities: undefined,
      ready: false,
      startupState: 'loading',
      startupErrorMessage: '',
      workbenchBusy: false,
    },
    workspace: {
      items: [DEFAULT_WORKSPACE],
      activeId: DEFAULT_WORKSPACE.id,
    },
    environment: {
      items: initialEnvironments,
      activeId: initialEnvironments[0]?.id ?? 'local',
    },
    request: {
      collections: [],
      historyItems: [],
      openTabs: initialTabs,
      activeTabId: initialTabs[0]?.id ?? '',
    },
  }
}

export const createAppShellStore = (state: AppShellState): AppShellStore => {
  const selectors = {
    getActiveWorkspace: () => (
      state.workspace.items.find((item) => item.id === state.workspace.activeId)
      ?? state.workspace.items[0]
    ),
    getActiveEnvironment: () => (
      state.environment.items.find((item) => item.id === state.environment.activeId)
      ?? state.environment.items[0]
    ),
    getActiveTab: () => (
      state.request.openTabs.find((tab) => tab.id === state.request.activeTabId)
      ?? state.request.openTabs[0]
    ),
    getTabById: (tabId: string) => state.request.openTabs.find((tab) => tab.id === tabId),
    getCollectionById: (collectionId: string) => state.request.collections.find((collection) => collection.id === collectionId),
    getCollectionByName: (name: string) => state.request.collections.find((collection) => collection.name === name),
    getActiveRequestResourceId: () => {
      const activeTab = selectors.getActiveTab()
      return activeTab?.origin?.requestId ?? activeTab?.requestId
    },
    getWorkbenchActivityProjection: () => createWorkbenchActivityProjection(
      state.request.openTabs,
      state.request.activeTabId,
      resolveResponseStateFromStatus,
    ),
    getResolvedActiveUrl: () => {
      const activeTab = selectors.getActiveTab()
      const activeEnvironment = selectors.getActiveEnvironment()
      if (!activeTab || !activeEnvironment) return ''
      return resolveHttpRequestDraft({
        url: activeTab.url,
        params: activeTab.params,
        headers: activeTab.headers,
        auth: activeTab.auth,
        variables: activeEnvironment.variables,
      }).url
    },
    canDeleteWorkspace: () => state.workspace.items.length > 1,
    canImportOpenApi: () => {
      const capabilities = state.runtime.capabilities
      if (!capabilities) return false

      return capabilities.importAdapters.some((adapter) => (
        adapter.key === 'openapi' && adapter.availability === 'active'
      )) || capabilities.descriptors.some((descriptor) => (
        descriptor.key === 'import.openapi' && descriptor.availability === 'active'
      ))
    },
    buildWorkspaceSession: () => ({
      activeEnvironmentId: state.environment.activeId,
      openTabs: state.request.openTabs.map(cloneTab),
      activeTabId: state.request.activeTabId,
    }),
  }

  const mutations: AppShellStore['mutations'] = {
    setRuntimeReady: (value) => {
      state.runtime.ready = value
    },
    setWorkbenchBusy: (value) => {
      state.runtime.workbenchBusy = value
    },
    setStartupState: (nextState, message = '') => {
      state.runtime.startupState = nextState
      state.runtime.startupErrorMessage = message
    },
    applySettings: (settings) => {
      state.settings.locale = settings.locale
      state.settings.themeMode = settings.themeMode
    },
    applyBootstrapPayload: (payload) => {
      state.settings.locale = payload.settings.locale
      state.settings.themeMode = payload.settings.themeMode
      state.runtime.capabilities = payload.capabilities
      state.workspace.items = payload.workspaces.length
        ? payload.workspaces.map((workspace) => ({ ...workspace }))
        : [{ ...DEFAULT_WORKSPACE }]
      state.workspace.activeId = payload.activeWorkspaceId ?? state.workspace.items[0]?.id ?? DEFAULT_WORKSPACE.id
      state.environment.items = payload.environments.length
        ? payload.environments.map(cloneEnvironment)
        : defaultEnvironments().map(cloneEnvironment)
      state.request.collections = payload.collections.length
        ? payload.collections.map(cloneCollection)
        : []
      state.request.historyItems = payload.history.slice(0, HISTORY_LIMIT).map((item) => ({ ...item }))
      state.request.openTabs = payload.session?.openTabs?.length
        ? payload.session.openTabs.map(cloneTab)
        : [createRequestTabFromPreset(defaultRequestPreset)]

      state.environment.activeId = state.environment.items.some((environment) => environment.id === payload.session?.activeEnvironmentId)
        ? payload.session?.activeEnvironmentId ?? state.environment.items[0]?.id ?? 'local'
        : state.environment.items[0]?.id ?? 'local'

      state.request.activeTabId = state.request.openTabs.some((tab) => tab.id === payload.session?.activeTabId)
        ? payload.session?.activeTabId ?? state.request.openTabs[0]?.id ?? ''
        : state.request.openTabs[0]?.id ?? ''
    },
    selectWorkspace: (workspaceId) => {
      if (state.workspace.items.some((workspace) => workspace.id === workspaceId)) {
        state.workspace.activeId = workspaceId
      }
    },
    selectEnvironment: (environmentId) => {
      if (state.environment.items.some((environment) => environment.id === environmentId)) {
        state.environment.activeId = environmentId
      }
    },
    selectTab: (tabId) => {
      if (state.request.openTabs.some((tab) => tab.id === tabId)) {
        state.request.activeTabId = tabId
      }
    },
    updateTab: (tabId, updater) => {
      state.request.openTabs = state.request.openTabs.map((tab) => (tab.id === tabId ? updater(tab) : tab))
    },
    appendAndActivateTab: (tab) => {
      state.request.openTabs = [...state.request.openTabs, tab]
      state.request.activeTabId = tab.id
    },
    closeTabWithFallback: (tabId) => {
      const index = state.request.openTabs.findIndex((tab) => tab.id === tabId)
      if (index < 0) return

      state.request.openTabs = state.request.openTabs.filter((tab) => tab.id !== tabId)
      if (state.request.activeTabId === tabId) {
        const fallback = state.request.openTabs[index] ?? state.request.openTabs[index - 1] ?? state.request.openTabs[0]
        if (fallback) {
          state.request.activeTabId = fallback.id
        }
      }
    },
    prependCollection: (collection) => {
      state.request.collections = [cloneCollection(collection), ...state.request.collections]
    },
    replaceCollection: (collection) => {
      state.request.collections = state.request.collections.map((item) => (
        item.id === collection.id ? cloneCollection(collection) : item
      ))
    },
    removeCollection: (collectionId) => {
      state.request.collections = state.request.collections.filter((collection) => collection.id !== collectionId)
    },
    renameTabCollectionReference: (collectionId, nextName) => {
      state.request.openTabs = state.request.openTabs.map((tab) => (
        tab.collectionId === collectionId ? { ...tab, collectionName: nextName } : tab
      ))
    },
    detachTabsForDeletedRequest: (requestId) => {
      state.request.openTabs = state.request.openTabs.map((tab) => (
        tab.requestId === requestId
          ? {
              ...tab,
              requestId: undefined,
              collectionId: undefined,
              collectionName: SCRATCH_PAD_COLLECTION_NAME,
              origin: {
                kind: 'detached',
                requestId: tab.origin?.requestId ?? requestId,
              },
              persistenceState: 'unbound',
              isDirty: true,
            }
          : tab
      ))
    },
    detachTabsForDeletedCollection: (input) => {
      const deletedRequestIds = new Set(input.requestIds)
      state.request.openTabs = state.request.openTabs.map((tab) => (
        deletedRequestIds.has(tab.requestId ?? '')
          ? {
              ...tab,
              requestId: undefined,
              collectionId: undefined,
              collectionName: input.fallbackCollectionName,
              origin: {
                kind: 'detached',
                requestId: tab.origin?.requestId ?? tab.requestId,
              },
              persistenceState: 'unbound',
              isDirty: true,
            }
          : tab
      ))
    },
    applySavedRequest: (input) => {
      state.request.collections = state.request.collections.map((collection) => {
        if (collection.id !== input.collection.id) {
          return {
            ...collection,
            requests: collection.requests.filter((request) => request.id !== input.request.id),
          }
        }

        const existingIndex = collection.requests.findIndex((request) => request.id === input.request.id)
        const requests = existingIndex >= 0
          ? collection.requests.map((request, index) => (index === existingIndex ? input.request : request))
          : [input.request, ...collection.requests]

        return {
          ...collection,
          expanded: true,
          requests,
        }
      })

      mutations.updateTab(input.tabId, (tab) => ({
        ...tab,
        requestId: input.request.id,
        name: input.requestName,
        description: input.requestDescription,
        tags: input.requestTags,
        collectionId: input.collection.id,
        collectionName: input.collection.name,
        origin: {
          kind: 'resource',
          requestId: input.request.id,
        },
        persistenceState: 'saved',
        isDirty: false,
      }))
    },
    appendEnvironment: (environment) => {
      state.environment.items = [...state.environment.items, cloneEnvironment(environment)]
    },
    replaceEnvironment: (environment) => {
      state.environment.items = state.environment.items.map((item) => (
        item.id === environment.id ? cloneEnvironment(environment) : item
      ))
    },
    removeEnvironment: (input) => {
      state.environment.items = state.environment.items.filter((environment) => environment.id !== input.environmentId)
      state.environment.activeId = input.fallbackEnvironmentId ?? state.environment.items[0]?.id ?? ''
    },
    updateEnvironmentVariables: (environmentId, variables) => {
      state.environment.items = state.environment.items.map((environment) => (
        environment.id === environmentId
          ? { ...environment, variables: cloneItems(variables) }
          : environment
      ))
    },
    prependHistoryItem: (item, limit = HISTORY_LIMIT) => {
      state.request.historyItems = [{ ...item }, ...state.request.historyItems].slice(0, limit)
    },
    removeHistoryItem: (id) => {
      state.request.historyItems = state.request.historyItems.filter((item) => item.id !== id)
    },
    clearHistory: () => {
      state.request.historyItems = []
    },
    detachTabsForDeletedHistoryItem: (id) => {
      state.request.openTabs = state.request.openTabs.map((tab) => (
        tab.origin?.kind === 'replay' && tab.origin.historyItemId === id
          ? {
              ...tab,
              origin: {
                kind: 'detached',
                requestId: tab.origin.requestId,
              },
              persistenceState: 'unbound',
              isDirty: true,
            }
          : tab
      ))
    },
    detachTabsForClearedHistory: () => {
      state.request.openTabs = state.request.openTabs.map((tab) => (
        tab.origin?.kind === 'replay'
          ? {
              ...tab,
              origin: {
                kind: 'detached',
                requestId: tab.origin.requestId,
              },
              persistenceState: 'unbound',
              isDirty: true,
            }
          : tab
      ))
    },
    applySendPending: (payload) => {
      mutations.updateTab(payload.tabId, (tab) => ({
        ...tab,
        name: payload.name,
        description: payload.description,
        tags: [...payload.tags],
        method: payload.method,
        url: payload.url,
        params: cloneItems(payload.params),
        headers: cloneItems(payload.headers),
        body: payload.body,
        bodyType: payload.bodyType,
        bodyContentType: payload.bodyContentType,
        formDataFields: payload.formDataFields?.map((field) => ({ ...field })) ?? [],
        binaryFileName: payload.binaryFileName,
        binaryMimeType: payload.binaryMimeType,
        auth: cloneAuth(payload.auth),
        tests: cloneTests(payload.tests),
        mock: payload.mock ? {
          ...payload.mock,
          headers: cloneItems(payload.mock.headers),
        } : undefined,
        isSending: true,
        executionState: 'pending',
        response: cloneResponse({
          ...tab.response,
          state: 'pending',
          stale: tab.response.state !== 'idle',
        }),
      }))
    },
    applySendSuccess: (input) => {
      const artifact = 'executionArtifact' in input.response ? input.response.executionArtifact : undefined
      const mcpArtifact = 'mcpArtifact' in input.response ? input.response.mcpArtifact : undefined
      const normalizedResponse = artifact?.normalizedResponse
      const compiledRequest = artifact?.compiledRequest
      const assertionResults = 'assertionResults' in input.response
        ? input.response.assertionResults ?? artifact?.assertionResults
        : artifact?.assertionResults
      const status = normalizedResponse?.status ?? input.response.status

      mutations.updateTab(input.payload.tabId, (tab) => {
        const responseTools = mcpArtifact?.protocolResponse && typeof mcpArtifact.protocolResponse === 'object'
          ? (((mcpArtifact.protocolResponse as Record<string, unknown>).result as Record<string, unknown> | undefined)?.tools as typeof mcpArtifact.cachedTools | undefined)
          : undefined
        const nextMcpArtifact = mcpArtifact
          ? {
            ...mcpArtifact,
            cachedTools: mcpArtifact.cachedTools ?? responseTools ?? tab.response.mcpArtifact?.cachedTools,
          }
          : tab.response.mcpArtifact

        return {
        ...tab,
        isSending: false,
        executionState: resolveResponseStateFromStatus(status),
        response: {
          requestKind: input.payload.requestKind ?? 'http',
          mcpArtifact: nextMcpArtifact,
          responseBody: normalizedResponse?.body || input.response.responseBody || '{\n  "message": "Empty response body"\n}',
          status,
          statusText: normalizedResponse?.statusText || input.response.statusText || 'OK',
          time: `${normalizedResponse?.elapsedMs ?? input.response.elapsedMs} ms`,
          size: formatBytes(normalizedResponse?.sizeBytes ?? input.response.sizeBytes),
          headers: normalizedResponse?.headers ?? input.response.headers,
          contentType: normalizedResponse?.contentType ?? input.response.contentType,
          requestMethod: compiledRequest?.method || input.response.requestMethod || input.payload.method,
          requestUrl: compiledRequest?.url || input.response.requestUrl || input.payload.url,
          testResults: assertionResults?.results ?? [],
          state: resolveResponseStateFromStatus(status),
          stale: false,
          executionSource: artifact?.executionSource ?? input.response.executionSource ?? 'live',
        },
      }
      })

      if (input.response.historyItem) {
        mutations.prependHistoryItem(input.response.historyItem)
      } else if (input.payload.requestKind !== 'mcp') {
        mutations.prependHistoryItem(createHistoryEntry({
          requestId: input.payload.requestId,
          requestSnapshot: input.payload,
          name: input.payload.name,
          method: input.response.requestMethod || input.payload.method,
          url: input.response.requestUrl || input.payload.url,
          status,
          statusText: normalizedResponse?.statusText || input.response.statusText,
          elapsedMs: normalizedResponse?.elapsedMs ?? input.response.elapsedMs,
          sizeBytes: normalizedResponse?.sizeBytes ?? input.response.sizeBytes,
          contentType: normalizedResponse?.contentType ?? input.response.contentType,
          responseHeaders: normalizedResponse?.headers ?? input.response.headers,
          responsePreview: normalizedResponse?.body || input.response.responseBody,
          executionSource: artifact?.executionSource ?? input.response.executionSource ?? 'live',
        }))
      } else if (input.payload.requestKind === 'mcp' && mcpArtifact) {
        mutations.prependHistoryItem(createHistoryEntry({
          requestId: input.payload.requestId,
          requestSnapshot: input.payload,
          name: input.payload.name,
          method: input.response.requestMethod || input.payload.method,
          url: input.response.requestUrl || input.payload.url,
          status,
          mcpSummary: {
            operation: mcpArtifact.operation,
            transport: mcpArtifact.transport,
            errorCategory: mcpArtifact.errorCategory,
          },
        }))
      }
    },
    applySendFailure: (input) => {
      const responseBody = input.responseBody ?? JSON.stringify({ error: 'Request failed', message: input.message }, null, 2)
      mutations.updateTab(input.payload.tabId, (tab) => ({
        ...tab,
        isSending: false,
        executionState: 'transport-error',
        response: {
          responseBody,
          status: 0,
          statusText: 'ERROR',
          time: '0 ms',
          size: formatBytes(new TextEncoder().encode(responseBody).length),
          headers: [],
          contentType: 'application/json',
          requestMethod: input.payload.method,
          requestUrl: input.payload.url,
          testResults: [],
          state: 'transport-error',
          stale: false,
          executionSource: 'live',
        },
      }))
    },
  }

  return {
    state,
    selectors,
    mutations,
  }
}
