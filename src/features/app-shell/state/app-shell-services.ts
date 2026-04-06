import { runtimeClient } from '@/lib/tauri-client'
import type {
  AppBootstrapPayload as RuntimeBootstrapPayload,
  AppError,
  ExportPackageScope,
  ImportConflictStrategy,
  OpenApiImportAnalysis,
  OpenApiImportApplyResult,
  SendRequestResult,
} from '@/lib/tauri-client'
import type {
  EnvironmentPreset,
  KeyValueItem,
  McpToolSchemaSnapshot,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  SendRequestPayload,
  WorkspaceSnapshot,
} from '@/types/request'
import { cloneCollection, cloneEnvironment, cloneItems, cloneTab, createPresetFromTab } from '@/lib/request-workspace'
import { resolveHttpRequestDraft } from '@/features/app-shell/domain/url-resolution'
import type { AppShellStore } from './app-shell-store'

export type ServiceResult<T = void> =
  | { ok: true; code: string; data?: T; message?: string }
  | { ok: false; code: string; message?: string }

interface AppShellServiceDeps {
  runtime: typeof runtimeClient
  store: AppShellStore
}

export interface AppShellServices {
  refreshRuntimeState: (snapshot?: WorkspaceSnapshot | null) => Promise<ServiceResult<RuntimeBootstrapPayload>>
  bootstrapApp: (input?: { snapshot?: WorkspaceSnapshot | null }) => Promise<ServiceResult<RuntimeBootstrapPayload>>
  switchWorkspace: (input: { workspaceId: string }) => Promise<ServiceResult<{ workspaceId: string }>>
  createWorkspace: (input: { name: string }) => Promise<ServiceResult<{ workspaceId: string; workspaceName: string }>>
  deleteWorkspace: (input: { workspaceId: string }) => Promise<ServiceResult<{ workspaceId: string }>>
  createCollection: (input: { name: string }) => Promise<ServiceResult<RequestCollection>>
  renameCollection: (input: { collectionId: string; name: string }) => Promise<ServiceResult<{ collectionId: string; previousName: string; nextName: string }>>
  deleteCollection: (input: { collectionId: string }) => Promise<ServiceResult<{ collectionId: string; collectionName: string }>>
  saveRequest: (input: {
    tabId: string
    requestName: string
    requestDescription: string
    requestTags: string[]
    targetCollectionName: string
  }) => Promise<ServiceResult<{ tabId: string; requestId: string; collection: RequestCollection; requestName: string }>>
  deleteRequest: (input: { collectionName: string; requestId: string }) => Promise<ServiceResult<{ requestId: string; collectionName: string }>>
  createEnvironment: (input: { name: string }) => Promise<ServiceResult<EnvironmentPreset>>
  renameEnvironment: (input: { environmentId: string; name: string }) => Promise<ServiceResult<{ environmentId: string; previousName: string; nextName: string }>>
  deleteEnvironment: (input: { environmentId: string }) => Promise<ServiceResult<{ environmentId: string }>>
  persistEnvironmentVariables: (input: { environmentId: string; variables: KeyValueItem[] }) => Promise<ServiceResult<EnvironmentPreset>>
  clearHistory: () => Promise<ServiceResult>
  removeHistoryItem: (input: { id: string }) => Promise<ServiceResult<{ id: string }>>
  exportWorkspace: (input: { scope: ExportPackageScope }) => Promise<ServiceResult<{ fileName: string; packageJson: string; scope: ExportPackageScope }>>
  importWorkspace: (input: { packageJson: string; strategy: ImportConflictStrategy }) => Promise<ServiceResult<{ scope: ExportPackageScope; importedWorkspaceCount: number; workspaceName: string }>>
  analyzeOpenApiImport: (input: { document: string }) => Promise<ServiceResult<OpenApiImportAnalysis>>
  applyOpenApiImport: (input: { analysis: OpenApiImportAnalysis }) => Promise<ServiceResult<OpenApiImportApplyResult>>
  importCurl: (input: { command: string }) => Promise<ServiceResult<RequestTabState>>
  discoverMcpTools: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<McpToolSchemaSnapshot[]>>
  sendRequest: (input: { payload: SendRequestPayload }) => Promise<ServiceResult<{ tabId: string; response: SendRequestResult }>>
}

const success = <T>(code: string, data?: T): ServiceResult<T> => ({ ok: true, code, data })
const failure = <T>(code: string, message?: string): ServiceResult<T> => ({ ok: false, code, message })

const mapWorkspaceImportFailureCode = (runtimeCode?: string) => {
  switch (runtimeCode) {
    case 'INVALID_IMPORT_PACKAGE':
      return 'workspace.import_invalid_package'
    case 'UNSUPPORTED_IMPORT_PACKAGE':
      return 'workspace.import_unsupported_package'
    default:
      return 'workspace.import_failed'
  }
}

const formatWorkspaceImportFailureMessage = (error?: AppError, fallback = 'Workspace import failed') => {
  const family = classifyErrorFamily(error?.code)
  const baseMessage = error?.message?.trim() || fallback
  const advice = family === 'import'
    ? 'Check the package contents, selected conflict strategy, and local workspace state before retrying.'
    : buildRecoveryAdvice(family)
  return `${baseMessage} ${advice}`
}

const classifyErrorFamily = (runtimeCode?: string) => {
  const normalized = runtimeCode?.trim().toUpperCase() ?? ''
  if (!normalized) return 'request'
  if (normalized.includes('IMPORT')) return 'import'
  if (normalized.includes('EXPORT')) return 'import'
  if (normalized.includes('BOOTSTRAP') || normalized.includes('STARTUP') || normalized.includes('SNAPSHOT') || normalized.includes('RESTORE')) return 'recovery'
  if (normalized.includes('DB') || normalized.includes('SQLITE') || normalized.includes('STORAGE') || normalized.includes('HISTORY') || normalized.includes('PERSIST')) return 'persistence'
  return 'request'
}

const buildRecoveryAdvice = (family: ReturnType<typeof classifyErrorFamily>) => {
  switch (family) {
    case 'import':
      return 'Check the import file format or conflict strategy, then retry.'
    case 'persistence':
      return 'Check local data health or retry the action after reopening the workspace.'
    case 'recovery':
      return 'Retry startup. If it persists, rebuild the workspace from a known-good export.'
    default:
      return 'Check the request configuration and network target, then retry.'
  }
}

const classifyMcpErrorLayer = (runtimeCode?: string, protocolResponse?: Record<string, unknown>) => {
  const normalized = runtimeCode?.trim().toUpperCase() ?? ''
  if (normalized.includes('TRANSPORT') || normalized.includes('REQUEST_FAILED') || normalized.includes('READ_BODY') || normalized.includes('INVALID_MCP_URL')) {
    return 'transport' as const
  }
  if (normalized.includes('SESSION') || normalized.includes('INITIALIZE')) {
    return 'session' as const
  }

  const errorObject = protocolResponse?.error
  if (errorObject && typeof errorObject === 'object') {
    const message = String((errorObject as Record<string, unknown>).message ?? '').toLowerCase()
    if (message.includes('session') || message.includes('initialize')) {
      return 'session' as const
    }
    return 'tool-call' as const
  }

  return 'tool-call' as const
}

const buildMcpErrorAdvice = (layer: ReturnType<typeof classifyMcpErrorLayer>) => {
  switch (layer) {
    case 'session':
      return 'Re-run initialize or verify the server session state before retrying the MCP action.'
    case 'tool-call':
      return 'Check the selected tool, arguments, and server tool response before retrying.'
    default:
      return 'Check MCP transport connectivity, target URL, and server availability, then retry.'
  }
}

const normalizeMcpErrorCategory = (category?: string) => {
  switch (category) {
    case 'initialize':
      return 'session' as const
    case 'tool_execution':
      return 'tool-call' as const
    case 'transport':
    case 'session':
    case 'tool-call':
      return category
    case 'protocol':
      return 'tool-call' as const
    default:
      return undefined
  }
}

const formatStructuredMcpErrorMessage = (
  error?: AppError,
  fallback = 'send_mcp_request failed',
  protocolResponse?: Record<string, unknown>,
) => {
  const layer = classifyMcpErrorLayer(error?.code, protocolResponse)
  const baseMessage = error?.message?.trim() || fallback
  const advice = buildMcpErrorAdvice(layer)
  return {
    layer,
    code: error?.code ?? 'MCP_REQUEST_FAILED',
    message: `${baseMessage} ${advice}`,
    responseBody: JSON.stringify({
      error: 'mcp',
      layer,
      code: error?.code ?? 'MCP_REQUEST_FAILED',
      message: baseMessage,
      advice,
      protocolResponse: protocolResponse ?? null,
    }, null, 2),
  }
}

const formatStructuredErrorMessage = (error?: AppError, fallback = 'Unexpected failure') => {
  const family = classifyErrorFamily(error?.code)
  const baseMessage = error?.message?.trim() || fallback
  const advice = buildRecoveryAdvice(family)
  return {
    family,
    code: error?.code ?? 'UNKNOWN_ERROR',
    message: `${baseMessage} ${advice}`,
    responseBody: JSON.stringify({
      error: family,
      code: error?.code ?? 'UNKNOWN_ERROR',
      message: baseMessage,
      advice,
    }, null, 2),
  }
}

export const createAppShellServices = (deps: AppShellServiceDeps): AppShellServices => {
  const withWorkbenchBusy = async <T>(operation: () => Promise<ServiceResult<T>>) => {
    deps.store.mutations.setWorkbenchBusy(true)
    try {
      return await operation()
    } finally {
      deps.store.mutations.setWorkbenchBusy(false)
    }
  }

  const getActiveWorkspaceId = () => deps.store.state.workspace.activeId

  const refreshRuntimeState = async (snapshot?: WorkspaceSnapshot | null): Promise<ServiceResult<RuntimeBootstrapPayload>> => {
    deps.store.mutations.setRuntimeReady(false)
    deps.store.mutations.setStartupState('loading')

    const bootstrapResult = await deps.runtime.bootstrapApp(snapshot)
    if (!bootstrapResult.ok || !bootstrapResult.data) {
      const structured = formatStructuredErrorMessage(bootstrapResult.error, 'Failed to restore workspace state')
      deps.store.mutations.setStartupState('degraded', structured.message)
      return failure('runtime.bootstrap_failed', structured.message)
    }

    deps.store.mutations.applyBootstrapPayload(bootstrapResult.data)
    deps.store.mutations.setRuntimeReady(true)
    deps.store.mutations.setStartupState('ready')
    return success('runtime.bootstrap_ready', bootstrapResult.data)
  }

  return {
    refreshRuntimeState,
    bootstrapApp: async (input) => refreshRuntimeState(input?.snapshot),
    switchWorkspace: async ({ workspaceId }) => {
      const currentWorkspaceId = getActiveWorkspaceId()
      if (!workspaceId || workspaceId === currentWorkspaceId) {
        return success('workspace.switch_skipped', { workspaceId: currentWorkspaceId })
      }

      return withWorkbenchBusy(async () => {
        if (currentWorkspaceId) {
          await deps.runtime.saveWorkspaceSession(currentWorkspaceId, deps.store.selectors.buildWorkspaceSession())
        }

        const result = await deps.runtime.setActiveWorkspace(workspaceId)
        if (!result.ok) {
          return failure('workspace.switch_failed', result.error?.message)
        }

        const refresh = await refreshRuntimeState(null)
        if (!refresh.ok) return refresh
        return success('workspace.switched', { workspaceId })
      })
    },
    createWorkspace: async ({ name }) => withWorkbenchBusy(async () => {
      const currentWorkspaceId = getActiveWorkspaceId()
      if (currentWorkspaceId) {
        await deps.runtime.saveWorkspaceSession(currentWorkspaceId, deps.store.selectors.buildWorkspaceSession())
      }

      const createResult = await deps.runtime.createWorkspace(name)
      if (!createResult.ok || !createResult.data) {
        return failure('workspace.create_failed', createResult.error?.message)
      }

      const switchResult = await deps.runtime.setActiveWorkspace(createResult.data.id)
      if (!switchResult.ok) {
        return failure('workspace.switch_failed', switchResult.error?.message)
      }

      const refresh = await refreshRuntimeState(null)
      if (!refresh.ok) return refresh

      return success('workspace.created', {
        workspaceId: createResult.data.id,
        workspaceName: createResult.data.name,
      })
    }),
    deleteWorkspace: async ({ workspaceId }) => withWorkbenchBusy(async () => {
      const result = await deps.runtime.deleteWorkspace(workspaceId)
      if (!result.ok) {
        return failure('workspace.delete_failed', result.error?.message)
      }

      const refresh = await refreshRuntimeState(null)
      if (!refresh.ok) return refresh
      return success('workspace.deleted', { workspaceId })
    }),
    createCollection: async ({ name }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('collection.create_failed', 'No active workspace')
      }

      const result = await deps.runtime.createCollection(workspaceId, name)
      if (!result.ok || !result.data) {
        return failure('collection.create_failed', result.error?.message)
      }

      deps.store.mutations.prependCollection(result.data)
      return success('collection.created', cloneCollection(result.data))
    },
    renameCollection: async ({ collectionId, name }) => {
      const workspaceId = getActiveWorkspaceId()
      const currentCollection = deps.store.selectors.getCollectionById(collectionId)
      if (!workspaceId || !currentCollection) {
        return failure('collection.rename_failed', 'Collection not found')
      }

      const result = await deps.runtime.renameCollection(workspaceId, collectionId, name)
      if (!result.ok || !result.data) {
        return failure('collection.rename_failed', result.error?.message)
      }

      deps.store.mutations.replaceCollection({
        ...currentCollection,
        name: result.data.name,
      })
      deps.store.mutations.renameTabCollectionReference(collectionId, result.data.name)
      return success('collection.renamed', {
        collectionId,
        previousName: currentCollection.name,
        nextName: result.data.name,
      })
    },
    deleteCollection: async ({ collectionId }) => {
      const workspaceId = getActiveWorkspaceId()
      const currentCollection = deps.store.selectors.getCollectionById(collectionId)
      if (!workspaceId || !currentCollection) {
        return failure('collection.delete_failed', 'Collection not found')
      }

      const result = await deps.runtime.deleteCollection(workspaceId, collectionId)
      if (!result.ok) {
        return failure('collection.delete_failed', result.error?.message)
      }

      deps.store.mutations.removeCollection(collectionId)
      deps.store.mutations.detachTabsForDeletedCollection({
        collectionId,
        requestIds: currentCollection.requests.map((request) => request.id),
        fallbackCollectionName: 'Scratch Pad',
      })

      return success('collection.deleted', {
        collectionId,
        collectionName: currentCollection.name,
      })
    },
    saveRequest: async ({ tabId, requestName, requestDescription, requestTags, targetCollectionName }) => {
      const workspaceId = getActiveWorkspaceId()
      const tab = deps.store.selectors.getTabById(tabId) ?? deps.store.selectors.getActiveTab()
      if (!workspaceId || !tab) {
        return failure('request.save_failed', 'Request tab not found')
      }

      let targetCollection = deps.store.selectors.getCollectionByName(targetCollectionName)
      if (!targetCollection) {
        const createResult = await deps.runtime.createCollection(workspaceId, targetCollectionName)
        if (!createResult.ok || !createResult.data) {
          return failure('collection.create_failed', createResult.error?.message)
        }

        deps.store.mutations.prependCollection(createResult.data)
        targetCollection = cloneCollection(createResult.data)
      }

      const preset = createPresetFromTab({
        ...tab,
        name: requestName,
        description: requestDescription,
        tags: requestTags,
        collectionId: targetCollection.id,
        collectionName: targetCollection.name,
      })

      const saveResult = await deps.runtime.saveRequest(workspaceId, targetCollection.id, preset)
      if (!saveResult.ok || !saveResult.data) {
        return failure('request.save_failed', saveResult.error?.message)
      }

      deps.store.mutations.applySavedRequest({
        tabId: tab.id,
        request: saveResult.data,
        collection: targetCollection,
        requestName,
        requestDescription,
        requestTags,
      })

      return success('request.saved', {
        tabId: tab.id,
        requestId: saveResult.data.id,
        collection: targetCollection,
        requestName,
      })
    },
    deleteRequest: async ({ collectionName, requestId }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('request.delete_failed', 'No active workspace')
      }

      const result = await deps.runtime.deleteRequest(workspaceId, requestId)
      if (!result.ok) {
        return failure('request.delete_failed', result.error?.message)
      }

      const targetCollection = deps.store.selectors.getCollectionByName(collectionName)
      if (targetCollection) {
        deps.store.mutations.replaceCollection({
          ...targetCollection,
          requests: targetCollection.requests.filter((request) => request.id !== requestId),
        })
      }
      deps.store.mutations.detachTabsForDeletedRequest(requestId)
      return success('request.deleted', { requestId, collectionName })
    },
    createEnvironment: async ({ name }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('environment.create_failed', 'No active workspace')
      }

      const result = await deps.runtime.createEnvironment(workspaceId, name)
      if (!result.ok || !result.data) {
        return failure('environment.create_failed', result.error?.message)
      }

      deps.store.mutations.appendEnvironment(result.data)
      deps.store.mutations.selectEnvironment(result.data.id)
      return success('environment.created', cloneEnvironment(result.data))
    },
    renameEnvironment: async ({ environmentId, name }) => {
      const workspaceId = getActiveWorkspaceId()
      const currentEnvironment = deps.store.state.environment.items.find((environment) => environment.id === environmentId)
      if (!workspaceId || !currentEnvironment) {
        return failure('environment.rename_failed', 'Environment not found')
      }

      const result = await deps.runtime.renameEnvironment(workspaceId, environmentId, name)
      if (!result.ok || !result.data) {
        return failure('environment.rename_failed', result.error?.message)
      }

      deps.store.mutations.replaceEnvironment(result.data)
      return success('environment.renamed', {
        environmentId,
        previousName: currentEnvironment.name,
        nextName: result.data.name,
      })
    },
    deleteEnvironment: async ({ environmentId }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('environment.delete_failed', 'No active workspace')
      }

      const result = await deps.runtime.deleteEnvironment(workspaceId, environmentId)
      if (!result.ok) {
        return failure('environment.delete_failed', result.error?.message)
      }

      const remaining = deps.store.state.environment.items.filter((environment) => environment.id !== environmentId)
      deps.store.mutations.removeEnvironment({
        environmentId,
        fallbackEnvironmentId: remaining[0]?.id,
      })
      return success('environment.deleted', { environmentId })
    },
    persistEnvironmentVariables: async ({ environmentId, variables }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('environment.persist_failed', 'No active workspace')
      }

      const result = await deps.runtime.updateEnvironmentVariables(workspaceId, environmentId, cloneItems(variables))
      if (!result.ok || !result.data) {
        return failure('environment.persist_failed', result.error?.message)
      }

      deps.store.mutations.replaceEnvironment(result.data)
      return success('environment.persisted', cloneEnvironment(result.data))
    },
    clearHistory: async () => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('history.clear_failed', 'No active workspace')
      }

      const result = await deps.runtime.clearHistory(workspaceId)
      if (!result.ok) {
        const structured = formatStructuredErrorMessage(result.error, 'Failed to clear history')
        return failure('history.clear_failed', structured.message)
      }

      deps.store.mutations.clearHistory()
      deps.store.mutations.detachTabsForClearedHistory()
      return success('history.cleared')
    },
    removeHistoryItem: async ({ id }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('history.remove_failed', 'No active workspace')
      }

      const result = await deps.runtime.removeHistoryItem(workspaceId, id)
      if (!result.ok) {
        const structured = formatStructuredErrorMessage(result.error, 'Failed to remove history item')
        return failure('history.remove_failed', structured.message)
      }

      deps.store.mutations.removeHistoryItem(id)
      deps.store.mutations.detachTabsForDeletedHistoryItem(id)
      return success('history.removed', { id })
    },
    exportWorkspace: async ({ scope }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('workspace.export_failed', 'No active workspace')
      }

      await deps.runtime.saveWorkspaceSession(workspaceId, deps.store.selectors.buildWorkspaceSession())
      const result = await deps.runtime.exportWorkspace(workspaceId, scope)
      if (!result.ok || !result.data) {
        return failure('workspace.export_failed', result.error?.message)
      }

      return success('workspace.exported', {
        fileName: result.data.fileName,
        packageJson: result.data.packageJson,
        scope: result.data.scope,
      })
    },
    importWorkspace: async ({ packageJson, strategy }) => withWorkbenchBusy(async () => {
      const result = await deps.runtime.importWorkspace(packageJson, strategy)
      if (!result.ok || !result.data) {
        return failure(mapWorkspaceImportFailureCode(result.error?.code), formatWorkspaceImportFailureMessage(result.error))
      }

      const refresh = await refreshRuntimeState(null)
      if (!refresh.ok) return refresh

      return success('workspace.imported', {
        scope: result.data.scope,
        importedWorkspaceCount: result.data.importedWorkspaceCount,
        workspaceName: result.data.workspace.name,
      })
    }),
    analyzeOpenApiImport: async ({ document }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('openapi.analyze_failed', 'No active workspace')
      }

      const result = await deps.runtime.analyzeOpenApiImport(workspaceId, document)
      if (!result.ok || !result.data) {
        return failure('openapi.analyze_failed', result.error?.message)
      }

      return success('openapi.analyzed', result.data)
    },
    applyOpenApiImport: async ({ analysis }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('openapi.apply_failed', 'No active workspace')
      }

      const applyResult = await deps.runtime.applyOpenApiImport(workspaceId, analysis)
      if (!applyResult.ok || !applyResult.data) {
        return failure('openapi.apply_failed', applyResult.error?.message)
      }

      const refresh = await withWorkbenchBusy(async () => {
        await deps.runtime.saveWorkspaceSession(workspaceId, deps.store.selectors.buildWorkspaceSession())
        return refreshRuntimeState(null)
      })
      if (!refresh.ok) return refresh

      return success('openapi.applied', applyResult.data)
    },
    discoverMcpTools: async ({ payload }) => {
      const workspaceId = getActiveWorkspaceId()
      const activeEnvironmentId = deps.store.state.environment.activeId
      if (!workspaceId || !activeEnvironmentId) {
        return failure('mcp.discover_failed', 'Missing active workspace or environment')
      }

      if (payload.requestKind !== 'mcp' || !payload.mcp) {
        return failure('mcp.discover_failed', 'discoverMcpTools requires an MCP payload')
      }

      const response = await deps.runtime.discoverMcpTools(workspaceId, activeEnvironmentId, payload)
      if (!response.ok || !response.data) {
        return failure('mcp.discover_failed', response.error?.message)
      }

      return success('mcp.discovered', response.data)
    },
    importCurl: async ({ command }) => {
      const workspaceId = getActiveWorkspaceId()
      if (!workspaceId) {
        return failure('curl.import_failed', 'No active workspace')
      }

      const result = await deps.runtime.importCurlRequest(workspaceId, command)
      if (!result.ok || !result.data) {
        return failure('curl.import_failed', result.error?.message)
      }

      const importedTab = cloneTab(result.data)
      deps.store.mutations.appendAndActivateTab(importedTab)
      return success('curl.imported', importedTab)
    },
    sendRequest: async ({ payload }) => {
      const workspaceId = getActiveWorkspaceId()
      const activeEnvironmentId = deps.store.state.environment.activeId
      if (!workspaceId || !activeEnvironmentId) {
        return failure('request.send_failed', 'Missing active workspace or environment')
      }

      const activeEnvironment = deps.store.state.environment.items.find((environment) => environment.id === activeEnvironmentId)
      const resolvedPayload = payload.requestKind !== 'mcp' && activeEnvironment
        ? (() => {
            const resolved = resolveHttpRequestDraft({
              url: payload.url,
              params: payload.params,
              headers: payload.headers,
              auth: payload.auth,
              variables: activeEnvironment.variables,
            })

            if (resolved.blockingIssues.length) {
              const keys = resolved.blockingIssues.map((issue) => issue.key).join(', ')
              deps.store.mutations.applySendFailure({
                payload,
                message: `Missing required variables: ${keys}`,
              })
              return failure('request.send_failed', `Missing required variables: ${keys}`)
            }

            return {
              ...payload,
              url: resolved.url,
              params: resolved.params,
              headers: resolved.headers,
              auth: resolved.auth,
            }
          })()
        : payload

      if (!('tabId' in resolvedPayload)) {
        return resolvedPayload
      }

      deps.store.mutations.applySendPending(payload)

      try {
        const response = payload.requestKind === 'mcp'
          ? await deps.runtime.sendMcpRequest(workspaceId, activeEnvironmentId, payload)
          : await deps.runtime.sendRequest(workspaceId, activeEnvironmentId, resolvedPayload)

        if (!response.ok || !response.data) {
          const structured = payload.requestKind === 'mcp'
            ? formatStructuredMcpErrorMessage(response.error, 'send_mcp_request failed')
            : formatStructuredErrorMessage(response.error, 'send_request failed')
          deps.store.mutations.applySendFailure({
            payload,
            message: structured.message,
            responseBody: structured.responseBody,
          })
          return failure('request.send_failed', structured.message)
        }

        if (payload.requestKind !== 'mcp' && !response.data.historyItem && !('executionArtifact' in response.data && response.data.executionArtifact)) {
          const structured = formatStructuredErrorMessage({
            code: 'PERSISTENCE_HISTORY_MISSING',
            message: 'HTTP request completed without a history snapshot',
          }, 'HTTP request completed without a history snapshot')
          deps.store.mutations.applySendFailure({
            payload,
            message: structured.message,
            responseBody: structured.responseBody,
          })
          return failure('request.send_failed', structured.message)
        }

        deps.store.mutations.applySendSuccess({
          payload,
          response: response.data,
        })

        if (payload.requestKind === 'mcp') {
          const activeTab = deps.store.selectors.getTabById(payload.tabId)
          const normalized = normalizeMcpErrorCategory(activeTab?.response.mcpArtifact?.errorCategory)
          if (normalized && activeTab) {
            deps.store.mutations.updateTab(payload.tabId, (tab) => ({
              ...tab,
              response: {
                ...tab.response,
                mcpArtifact: tab.response.mcpArtifact
                  ? { ...tab.response.mcpArtifact, errorCategory: normalized }
                  : tab.response.mcpArtifact,
              },
            }))
          }
        }

        return success('request.sent', {
          tabId: payload.tabId,
          response: response.data,
        })
      } catch (error) {
        const structured = payload.requestKind === 'mcp'
          ? formatStructuredMcpErrorMessage(
              error instanceof Error ? { code: 'MCP_TRANSPORT_INVOKE_ERROR', message: error.message } : undefined,
              error instanceof Error ? error.message : String(error),
            )
          : formatStructuredErrorMessage(
              error instanceof Error ? { code: 'TAURI_INVOKE_ERROR', message: error.message } : undefined,
              error instanceof Error ? error.message : String(error),
            )
        deps.store.mutations.applySendFailure({
          payload,
          message: structured.message,
          responseBody: structured.responseBody,
        })
        return failure('request.send_failed', structured.message)
      }
    },
  }
}
