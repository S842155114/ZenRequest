import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { defaultRequestPreset } from '@/data/request-presets'
import { SCRATCH_PAD_NAME, getMessages } from '@/lib/i18n'
import { isResourceContextMenuSurface, shouldBypassResourceContextMenu } from '@/lib/resource-context-menu'
import { detectImportPackageMeta, runtimeClient } from '@/lib/tauri-client'
import {
  HISTORY_LIMIT,
  applyThemeToDocument,
  clearWorkspaceSnapshot,
  cloneAuth,
  cloneCollection,
  cloneEnvironment,
  cloneItems,
  clonePreset,
  cloneResponse,
  cloneTests,
  cloneTab,
  createBlankRequestTab,
  createPresetFromTab,
  createRequestTabFromHistorySnapshot,
  createRequestTabFromPreset,
  createResponseStateFromHistoryItem,
  createWorkbenchActivityProjection,
  defaultEnvironments,
  formatBytes,
  readWorkspaceSnapshot,
  resolveResponseStateFromStatus,
  resolveTemplate,
  resolveVariablesMap,
} from '@/lib/request-workspace'
import type {
  AppLocale,
  EnvironmentPreset,
  HistoryItem,
  HistoryRequestSnapshot,
  KeyValueItem,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  SendRequestPayload,
  ThemeMode,
  WorkspaceSessionSnapshot,
  WorkspaceSnapshot,
  WorkspaceSummary,
} from '@/types/request'
import type {
  AppBootstrapPayload as RuntimeBootstrapPayload,
  ExportPackageScope,
  ImportConflictStrategy,
  ImportPackageMeta,
  OpenApiImportAnalysis,
} from '@/lib/tauri-client'
import type {
  DialogState,
  HeaderBindings,
  RequestPanelBindings,
  RequestPanelHandlers,
  ResponsePanelBindings,
  ResponsePanelHandlers,
  SidebarBindings,
  SidebarHandlers,
  StartupState,
  ToastItem,
  WorkbenchLayoutState,
  WorkspaceDialogBindings,
} from '../types'

const WORKBENCH_COMPACT_BREAKPOINT = 1180
const STARTUP_LAUNCH_SCREEN_ID = 'startup-launch-screen'

export const useAppShell = () => {
  const legacySnapshot = readWorkspaceSnapshot()
  const initialEnvironments = defaultEnvironments().map(cloneEnvironment)
  const initialTabs = [createRequestTabFromPreset(defaultRequestPreset)]

  const locale = ref<AppLocale>(legacySnapshot?.locale ?? 'en')
  const themeMode = ref<ThemeMode>(legacySnapshot?.themeMode ?? 'dark')
  const workspaces = ref<WorkspaceSummary[]>([{ id: 'workspace-local', name: 'Local Workspace' }])
  const activeWorkspaceId = ref(workspaces.value[0].id)
  const activeEnvironmentId = ref(initialEnvironments[0].id)
  const environments = ref<EnvironmentPreset[]>(initialEnvironments)
  const collections = ref<RequestCollection[]>([])
  const historyItems = ref<HistoryItem[]>([])
  const openTabs = ref<RequestTabState[]>(initialTabs)
  const activeTabId = ref(initialTabs[0].id)

  const systemPrefersDark = ref(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  )
  const workspaceImportInput = ref<HTMLInputElement | null>(null)
  const openApiImportInput = ref<HTMLInputElement | null>(null)
  const dialogState = ref<DialogState | null>(null)
  const pendingCloseAfterSaveTabId = ref<string | null>(null)
  const pendingWorkspaceImport = ref<{ packageJson: string; fileName: string; meta: ImportPackageMeta } | null>(null)
  const pendingOpenApiImport = ref<{ fileName: string; analysis: OpenApiImportAnalysis } | null>(null)
  const searchQuery = ref('')
  const toasts = ref<ToastItem[]>([])
  const startupState = ref<StartupState>('loading')
  const startupErrorMessage = ref('')
  const startupSnapshot = ref<WorkspaceSnapshot | null>(legacySnapshot ?? null)
  const runtimeCapabilities = ref<RuntimeBootstrapPayload['capabilities']>(undefined)
  const runtimeReady = ref(false)
  const workbenchBusy = ref(false)
  const requestPanelCollapsed = ref(false)
  const responsePanelCollapsed = ref(false)
  const isCompactLayout = ref(false)
  const mobileExplorerOpen = ref(false)
  const requestDesktopExpandedSize = ref(52)
  const responseDesktopExpandedSize = ref(48)
  const requestCompactExpandedSize = ref(54)
  const responseCompactExpandedSize = ref(46)

  const activeWorkspace = computed(() => workspaces.value.find((item) => item.id === activeWorkspaceId.value) ?? workspaces.value[0])
  const activeTab = computed(() => openTabs.value.find((tab) => tab.id === activeTabId.value) ?? openTabs.value[0])
  const activeEnvironment = computed(() => environments.value.find((item) => item.id === activeEnvironmentId.value) ?? environments.value[0])
  const workbenchActivityProjection = computed(() => createWorkbenchActivityProjection(openTabs.value, activeTabId.value))
  const activeRequestResourceId = computed(() => activeTab.value?.origin?.requestId ?? activeTab.value?.requestId)
  const resolvedTheme = computed(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return themeMode.value
  })
  const text = computed(() => getMessages(locale.value))
  const resolvedActiveUrl = computed(() => {
    if (!activeTab.value || !activeEnvironment.value) return ''
    return resolveTemplate(activeTab.value.url, resolveVariablesMap(activeEnvironment.value.variables))
  })
  const isStartupReady = computed(() => startupState.value === 'ready')
  const isStartupLoading = computed(() => startupState.value === 'loading')
  const canImportOpenApi = computed(() => {
    const capabilities = runtimeCapabilities.value
    if (!capabilities) return false

    return capabilities.importAdapters.some((adapter) => (
      adapter.key === 'openapi' && adapter.availability === 'active'
    )) || capabilities.descriptors.some((descriptor) => (
      descriptor.key === 'import.openapi' && descriptor.availability === 'active'
    ))
  })

  const closeDialog = () => {
    if (dialogState.value?.kind === 'importWorkspace') {
      pendingWorkspaceImport.value = null
    }
    if (dialogState.value?.kind === 'importOpenApi') {
      pendingOpenApiImport.value = null
    }
    if (dialogState.value?.kind === 'saveRequest' || dialogState.value?.kind === 'confirmCloseDirtyTab') {
      pendingCloseAfterSaveTabId.value = null
    }
    dialogState.value = null
  }

  const openDialog = (state: DialogState) => {
    dialogState.value = state
  }

  const showToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    toasts.value = [...toasts.value, { id, ...toast }]
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((item) => item.id !== id)
    }, 3200)
  }

  const showErrorToast = (
    toast: Pick<ToastItem, 'title' | 'description'>,
    description?: string,
  ) => {
    showToast({
      ...toast,
      description: description ?? toast.description,
      tone: 'error',
    })
  }

  const dismissToast = (id: string) => {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  const triggerJsonDownload = (fileName: string, contents: string) => {
    const blob = new Blob([contents], { type: 'application/json;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const buildOpenApiDialogDetails = (analysis: OpenApiImportAnalysis) => {
    const lines = [
      `Summary`,
      `Total operations: ${analysis.summary.totalOperationCount}`,
      `Importable requests: ${analysis.summary.importableRequestCount}`,
      `Skipped operations: ${analysis.summary.skippedOperationCount}`,
      `Warnings: ${analysis.summary.warningDiagnosticCount}`,
    ]

    if (analysis.groupingSuggestions.length) {
      lines.push('', 'Collections')
      for (const suggestion of analysis.groupingSuggestions) {
        lines.push(`- ${suggestion.name} (${suggestion.requestCount})`)
      }
    }

    if (analysis.diagnostics.length) {
      lines.push('', 'Diagnostics')
      for (const diagnostic of analysis.diagnostics) {
        const location = diagnostic.location ? ` @ ${diagnostic.location}` : ''
        lines.push(`- [${diagnostic.severity}] ${diagnostic.code}${location}`)
        lines.push(`  ${diagnostic.message}`)
      }
    }

    return lines.join('\n')
  }

  const createWorkspaceSession = (): WorkspaceSessionSnapshot => ({
    activeEnvironmentId: activeEnvironmentId.value,
    openTabs: openTabs.value.map(cloneTab),
    activeTabId: activeTabId.value,
  })

  const applyBootstrapPayload = (payload: RuntimeBootstrapPayload) => {
    locale.value = payload.settings.locale
    themeMode.value = payload.settings.themeMode
    runtimeCapabilities.value = payload.capabilities
    workspaces.value = payload.workspaces.length ? payload.workspaces : [{ id: 'workspace-local', name: 'Local Workspace' }]
    activeWorkspaceId.value = payload.activeWorkspaceId ?? workspaces.value[0].id
    environments.value = payload.environments.length ? payload.environments.map(cloneEnvironment) : defaultEnvironments().map(cloneEnvironment)
    collections.value = payload.collections.length ? payload.collections.map(cloneCollection) : []
    historyItems.value = payload.history.slice(0, HISTORY_LIMIT).map((item) => ({ ...item }))
    openTabs.value = payload.session?.openTabs?.length
      ? payload.session.openTabs.map(cloneTab)
      : [createRequestTabFromPreset(defaultRequestPreset)]

    activeEnvironmentId.value = environments.value.some((environment) => environment.id === payload.session?.activeEnvironmentId)
      ? payload.session?.activeEnvironmentId ?? environments.value[0].id
      : environments.value[0]?.id ?? 'local'

    activeTabId.value = openTabs.value.some((tab) => tab.id === payload.session?.activeTabId)
      ? payload.session?.activeTabId ?? openTabs.value[0].id
      : openTabs.value[0]?.id ?? ''
  }

  const refreshRuntimeState = async (snapshot?: WorkspaceSnapshot | null) => {
    runtimeReady.value = false
    const bootstrapResult = await runtimeClient.bootstrapApp(snapshot)
    if (!bootstrapResult.ok || !bootstrapResult.data) {
      throw new Error(bootstrapResult.error?.message ?? text.value.toasts.bootstrapCommandFailed)
    }
    applyBootstrapPayload(bootstrapResult.data)
    runtimeReady.value = true
  }

  const removeStartupLaunchScreen = () => {
    if (typeof document === 'undefined') return
    document.getElementById(STARTUP_LAUNCH_SCREEN_ID)?.remove()
  }

  const completeStartupHandoff = async (nextState: StartupState) => {
    applyThemeToDocument(resolvedTheme.value)
    startupState.value = nextState
    await nextTick()
    removeStartupLaunchScreen()
  }

  const runStartupBootstrap = async () => {
    startupState.value = 'loading'
    startupErrorMessage.value = ''

    try {
      await refreshRuntimeState(startupSnapshot.value)
      if (startupSnapshot.value) {
        clearWorkspaceSnapshot()
        startupSnapshot.value = null
      }
      await completeStartupHandoff('ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      startupErrorMessage.value = message
      await completeStartupHandoff('failed')
      showErrorToast(text.value.toasts.bootstrapFailed, message)
    }
  }

  const runWithWorkbenchBusy = async <T>(operation: () => Promise<T>) => {
    workbenchBusy.value = true
    try {
      return await operation()
    } finally {
      workbenchBusy.value = false
    }
  }

  const updateTab = (tabId: string, updater: (tab: RequestTabState) => RequestTabState) => {
    openTabs.value = openTabs.value.map((tab) => (tab.id === tabId ? updater(tab) : tab))
  }

  const handleCreateMockTemplate = () => {
    if (!activeTab.value) return

    if (activeTab.value.mock && !window.confirm(text.value.request.mockOverwriteConfirm)) {
      return
    }

    updateTab(activeTab.value.id, (tab) => ({
      ...tab,
      mock: {
        enabled: false,
        status: tab.response.status,
        statusText: tab.response.statusText,
        contentType: tab.response.contentType,
        body: tab.response.responseBody,
        headers: tab.response.headers.map((header) => ({
          key: header.key,
          value: header.value,
          description: '',
          enabled: true,
        })),
      },
    }))
  }

  const setActiveTab = (tabId: string) => {
    if (openTabs.value.some((tab) => tab.id === tabId)) {
      activeTabId.value = tabId
    }
  }

  const handleSelectRequest = (request: RequestPreset) => {
    const existing = openTabs.value.find((tab) => tab.origin?.kind === 'resource' && tab.requestId === request.id)
    if (existing) {
      activeTabId.value = existing.id
      return
    }

    const newTab = createRequestTabFromPreset(request)
    openTabs.value = [...openTabs.value, newTab]
    activeTabId.value = newTab.id
  }

  const handleCreateTab = () => {
    const newTab = createBlankRequestTab()
    newTab.name = text.value.toasts.newRequestName
    openTabs.value = [...openTabs.value, newTab]
    activeTabId.value = newTab.id
  }

  const closeTabImmediately = (tabId: string) => {
    const index = openTabs.value.findIndex((tab) => tab.id === tabId)
    if (index < 0) return

    openTabs.value = openTabs.value.filter((tab) => tab.id !== tabId)
    if (activeTabId.value === tabId) {
      const fallback = openTabs.value[index] ?? openTabs.value[index - 1] ?? openTabs.value[0]
      if (fallback) activeTabId.value = fallback.id
    }
  }

  const handleCloseTab = (tabId: string) => {
    if (openTabs.value.length === 1) return

    const targetTab = openTabs.value.find((tab) => tab.id === tabId)
    if (!targetTab) return

    if (targetTab.isDirty || targetTab.persistenceState !== 'saved') {
      openDialog({
        kind: 'confirmCloseDirtyTab',
        title: text.value.dialogs.closeDirtyTab.title,
        description: text.value.dialogs.closeDirtyTab.description(targetTab.name),
        confirmText: text.value.dialogs.closeDirtyTab.confirm,
        secondaryActionText: text.value.dialogs.closeDirtyTab.secondary,
        variant: 'dirty-close',
        highlightLabel: text.value.dialogs.closeDirtyTab.eyebrow,
        contextBadges: [
          targetTab.method,
          targetTab.persistenceState === 'unbound'
            ? text.value.request.unbound
            : text.value.dialogs.closeDirtyTab.draftBadge,
          text.value.dialogs.closeDirtyTab.unsavedBadge,
        ],
        contextName: tabId,
      })
      return
    }

    closeTabImmediately(tabId)
  }

  const handleUpdateActiveTab = (payload: Partial<RequestTabState>) => {
    if (!activeTab.value) return

    updateTab(activeTab.value.id, (tab) => ({
      ...(payload.origin ? { origin: payload.origin } : {}),
      ...tab,
      ...payload,
      params: payload.params ? cloneItems(payload.params) : cloneItems(tab.params),
      headers: payload.headers ? cloneItems(payload.headers) : cloneItems(tab.headers),
      auth: payload.auth ? cloneAuth(payload.auth) : cloneAuth(tab.auth),
      tests: payload.tests ? cloneTests(payload.tests) : cloneTests(tab.tests),
      response: payload.response ? cloneResponse(payload.response) : cloneResponse(tab.response),
      isDirty: payload.isDirty ?? true,
      persistenceState: payload.persistenceState
        ?? (
          (payload.origin ?? tab.origin)?.kind === 'detached'
            ? 'unbound'
            : (payload.isDirty ?? true) ? 'unsaved' : 'saved'
        ),
      executionState: payload.executionState
        ?? payload.response?.state
        ?? tab.executionState,
    }))
  }

  let environmentPersistTimer: number | null = null
  const handleUpdateEnvironmentVariables = (items: KeyValueItem[]) => {
    const currentEnvironment = activeEnvironment.value
    if (!currentEnvironment || !activeWorkspaceId.value) return

    environments.value = environments.value.map((environment) => (
      environment.id === currentEnvironment.id
        ? { ...environment, variables: cloneItems(items) }
        : environment
    ))

    if (environmentPersistTimer !== null) {
      window.clearTimeout(environmentPersistTimer)
    }

    environmentPersistTimer = window.setTimeout(() => {
      void runtimeClient.updateEnvironmentVariables(activeWorkspaceId.value, currentEnvironment.id, cloneItems(items))
      environmentPersistTimer = null
    }, 400)
  }

  const handleCreateCollection = () => {
    openDialog({
      kind: 'createCollection',
      title: text.value.dialogs.createCollection.title,
      description: text.value.dialogs.createCollection.description,
      confirmText: text.value.dialogs.createCollection.confirm,
      nameLabel: text.value.dialogs.createCollection.nameLabel,
      namePlaceholder: text.value.dialogs.createCollection.namePlaceholder,
      nameValue: text.value.dialogs.createCollection.nameValue,
    })
  }

  const handleCreateWorkspace = () => {
    openDialog({
      kind: 'createWorkspace',
      title: text.value.dialogs.createWorkspace.title,
      description: text.value.dialogs.createWorkspace.description,
      confirmText: text.value.dialogs.createWorkspace.confirm,
      nameLabel: text.value.dialogs.createWorkspace.nameLabel,
      namePlaceholder: text.value.dialogs.createWorkspace.namePlaceholder,
      nameValue: text.value.dialogs.createWorkspace.nameValue,
    })
  }

  const handleDeleteWorkspace = () => {
    const current = activeWorkspace.value
    if (!current || workspaces.value.length <= 1) return

    openDialog({
      kind: 'deleteWorkspace',
      title: text.value.dialogs.deleteWorkspace.title,
      description: text.value.dialogs.deleteWorkspace.description(current.name),
      confirmText: text.value.dialogs.deleteWorkspace.confirm,
      destructive: true,
      contextName: current.id,
    })
  }

  const handleRenameCollection = (name: string) => {
    openDialog({
      kind: 'renameCollection',
      title: text.value.dialogs.renameCollection.title,
      description: text.value.dialogs.renameCollection.description,
      confirmText: text.value.dialogs.renameCollection.confirm,
      nameLabel: text.value.dialogs.renameCollection.nameLabel,
      nameValue: name,
      contextName: name,
    })
  }

  const handleDeleteCollection = (name: string) => {
    const target = collections.value.find((collection) => collection.name === name)
    if (!target) return

    openDialog({
      kind: 'deleteCollection',
      title: text.value.dialogs.deleteCollection.title,
      description: text.value.dialogs.deleteCollection.description(name, target.requests.length),
      confirmText: text.value.dialogs.deleteCollection.confirm,
      destructive: true,
      contextName: name,
    })
  }

  const handleDeleteRequest = async (payload: { collectionName: string; requestId: string }) => {
    if (!activeWorkspaceId.value) return

    const result = await runtimeClient.deleteRequest(activeWorkspaceId.value, payload.requestId)
    if (!result.ok) {
      showErrorToast(text.value.toasts.requestDeleteFailed, result.error?.message)
      return
    }

    collections.value = collections.value.map((collection) => (
      collection.name === payload.collectionName
        ? { ...collection, requests: collection.requests.filter((request) => request.id !== payload.requestId) }
        : collection
    ))
    openTabs.value = openTabs.value.map((tab) => (
      tab.requestId === payload.requestId
        ? {
            ...tab,
            requestId: undefined,
            collectionId: undefined,
            collectionName: SCRATCH_PAD_NAME,
            origin: {
              kind: 'detached',
              requestId: tab.origin?.requestId ?? payload.requestId,
            },
            persistenceState: 'unbound',
            isDirty: true,
          }
        : tab
    ))
    showToast({ ...text.value.toasts.requestRemoved(payload.collectionName), tone: 'success' })
  }

  const handleSelectHistory = (item: HistoryItem) => {
    const existing = openTabs.value.find((tab) => (
      tab.origin?.kind === 'replay' && tab.origin?.historyItemId === item.id
    ))
    if (existing) {
      activeTabId.value = existing.id
      return
    }

    const snapshot = item.requestSnapshot as HistoryRequestSnapshot | undefined
    const requestFromCollection = item.requestId
      ? collections.value.flatMap((collection) => collection.requests).find((request) => request.id === item.requestId)
      : undefined
    const fallbackPreset = requestFromCollection ? clonePreset(requestFromCollection) : undefined
    const newTab = snapshot
      ? createRequestTabFromHistorySnapshot(snapshot, item.name, item.id)
      : fallbackPreset
        ? createRequestTabFromPreset(fallbackPreset)
        : createBlankRequestTab()

    const resolvedMethod = snapshot?.method || fallbackPreset?.method || item.method
    const resolvedUrl = snapshot?.url || fallbackPreset?.url || item.url

    newTab.name = snapshot?.name || fallbackPreset?.name || item.name
    newTab.description = snapshot?.description || fallbackPreset?.description || text.value.toasts.recoveredFromHistory(item.time)
    newTab.tags = snapshot?.tags?.length
      ? [...snapshot.tags]
      : fallbackPreset?.tags?.length
        ? [...fallbackPreset.tags]
        : [text.value.toasts.historyTag]
    newTab.origin = {
      kind: 'replay',
      requestId: snapshot?.requestId ?? fallbackPreset?.id ?? item.requestId,
      historyItemId: item.id,
    }
    newTab.persistenceState = 'unsaved'
    newTab.isDirty = true
    newTab.method = resolvedMethod
    newTab.url = resolvedUrl
    newTab.response = cloneResponse(createResponseStateFromHistoryItem(item, resolvedMethod, resolvedUrl))
    newTab.executionState = newTab.response.state ?? 'idle'
    openTabs.value = [...openTabs.value, newTab]
    activeTabId.value = newTab.id
  }

  const handleRemoveHistory = async (id: string) => {
    if (!activeWorkspaceId.value) return

    const result = await runtimeClient.removeHistoryItem(activeWorkspaceId.value, id)
    if (!result.ok) {
      showErrorToast(text.value.toasts.historyRemoveFailed, result.error?.message)
      return
    }
    historyItems.value = historyItems.value.filter((item) => item.id !== id)
    showToast({ ...text.value.toasts.historyEntryRemoved, tone: 'info' })
  }

  const handleClearHistory = async () => {
    if (!activeWorkspaceId.value) return

    const result = await runtimeClient.clearHistory(activeWorkspaceId.value)
    if (!result.ok) {
      showErrorToast(text.value.toasts.historyClearFailed, result.error?.message)
      return
    }
    historyItems.value = []
    showToast({ ...text.value.toasts.historyCleared, tone: 'info' })
  }

  const handleCreateEnvironment = () => {
    openDialog({
      kind: 'createEnvironment',
      title: text.value.dialogs.createEnvironment.title,
      description: text.value.dialogs.createEnvironment.description,
      confirmText: text.value.dialogs.createEnvironment.confirm,
      nameLabel: text.value.dialogs.createEnvironment.nameLabel,
      nameValue: text.value.dialogs.createEnvironment.nameValue,
      namePlaceholder: text.value.dialogs.createEnvironment.namePlaceholder,
    })
  }

  const handleRenameEnvironment = () => {
    const current = activeEnvironment.value
    if (!current) return
    openDialog({
      kind: 'renameEnvironment',
      title: text.value.dialogs.renameEnvironment.title,
      description: text.value.dialogs.renameEnvironment.description,
      confirmText: text.value.dialogs.renameEnvironment.confirm,
      nameLabel: text.value.dialogs.renameEnvironment.nameLabel,
      nameValue: current.name,
      contextName: current.id,
    })
  }

  const handleDeleteEnvironment = () => {
    const current = activeEnvironment.value
    if (!current) return
    if (environments.value.length === 1) {
      showToast({ ...text.value.toasts.cannotDeleteEnvironment, tone: 'error' })
      return
    }
    openDialog({
      kind: 'deleteEnvironment',
      title: text.value.dialogs.deleteEnvironment.title,
      description: text.value.dialogs.deleteEnvironment.description(current.name),
      confirmText: text.value.dialogs.deleteEnvironment.confirm,
      destructive: true,
      contextName: current.id,
    })
  }

  const handleSaveRequest = (tabId?: string) => {
    const tab = tabId
      ? openTabs.value.find((item) => item.id === tabId) ?? activeTab.value
      : activeTab.value
    if (!tab) return

    openDialog({
      kind: 'saveRequest',
      title: text.value.dialogs.saveRequest.title,
      description: text.value.dialogs.saveRequest.description,
      confirmText: text.value.dialogs.saveRequest.confirm,
      nameLabel: text.value.dialogs.saveRequest.nameLabel,
      nameValue: tab.name,
      detailsLabel: text.value.dialogs.saveRequest.descriptionLabel,
      detailsPlaceholder: text.value.dialogs.saveRequest.descriptionPlaceholder,
      detailsValue: tab.description,
      tagsLabel: text.value.dialogs.saveRequest.tagsLabel,
      tagsPlaceholder: text.value.dialogs.saveRequest.tagsPlaceholder,
      tagsValue: tab.tags.join(', '),
      selectLabel: text.value.dialogs.saveRequest.collectionLabel,
      selectValue: tab.collectionName || collections.value[0]?.name || SCRATCH_PAD_NAME,
      selectOptions: collections.value.map((collection) => ({
        label: collection.name,
        value: collection.name,
      })),
      contextName: tab.id,
    })
  }

  const handleExportWorkspace = async () => {
    if (!activeWorkspaceId.value) return

    openDialog({
      kind: 'exportWorkspace',
      title: text.value.dialogs.exportWorkspace.title,
      description: text.value.dialogs.exportWorkspace.description(activeWorkspace.value?.name ?? text.value.common.workspace),
      confirmText: text.value.dialogs.exportWorkspace.confirm,
      selectLabel: text.value.dialogs.exportWorkspace.scopeLabel,
      selectValue: 'workspace',
      selectOptions: [
        { label: text.value.dialogs.exportWorkspace.scopeWorkspace, value: 'workspace' },
        { label: text.value.dialogs.exportWorkspace.scopeApplication, value: 'application' },
      ],
    })
  }

  const handleImportWorkspaceClick = () => {
    workspaceImportInput.value?.click()
  }

  const handleImportOpenApiClick = () => {
    if (!activeWorkspaceId.value || !canImportOpenApi.value) return
    openApiImportInput.value?.click()
  }

  const handleImportCurlClick = () => {
    if (!activeWorkspaceId.value) return

    openDialog({
      kind: 'importCurl',
      title: text.value.dialogs.importCurl.title,
      description: text.value.dialogs.importCurl.description,
      confirmText: text.value.dialogs.importCurl.confirm,
      detailsLabel: text.value.dialogs.importCurl.commandLabel,
      detailsPlaceholder: text.value.dialogs.importCurl.commandPlaceholder,
      detailsValue: '',
    })
  }

  const handleWorkspaceImportChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    try {
      const packageJson = await file.text()
      const meta = detectImportPackageMeta(packageJson)
      pendingWorkspaceImport.value = {
        packageJson,
        fileName: file.name,
        meta,
      }
      openDialog({
        kind: 'importWorkspace',
        title: text.value.dialogs.importWorkspace.title,
        description: meta.scope === 'application'
          ? text.value.dialogs.importWorkspace.applicationDescription(file.name, meta.workspaceCount)
          : text.value.dialogs.importWorkspace.description(file.name),
        confirmText: text.value.dialogs.importWorkspace.confirm,
        selectLabel: text.value.dialogs.importWorkspace.strategyLabel,
        selectValue: 'rename',
        selectOptions: [
          { label: text.value.dialogs.importWorkspace.strategyRename, value: 'rename' },
          { label: text.value.dialogs.importWorkspace.strategySkip, value: 'skip' },
          { label: text.value.dialogs.importWorkspace.strategyOverwrite, value: 'overwrite' },
        ],
      })
    } catch (error) {
      pendingWorkspaceImport.value = null
      showErrorToast(
        text.value.toasts.workspaceImportFailed,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const handleOpenApiImportChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file || !activeWorkspaceId.value) return

    try {
      const document = await file.text()
      const result = await runtimeClient.analyzeOpenApiImport(activeWorkspaceId.value, document)
      if (!result.ok || !result.data) {
        pendingOpenApiImport.value = null
        showErrorToast(text.value.toasts.openApiAnalyzeFailed, result.error?.message)
        return
      }

      pendingOpenApiImport.value = {
        fileName: file.name,
        analysis: result.data,
      }

      openDialog({
        kind: 'importOpenApi',
        title: text.value.dialogs.importOpenApi.title,
        description: text.value.dialogs.importOpenApi.description(
          file.name,
          result.data.summary.importableRequestCount,
          result.data.summary.skippedOperationCount,
          result.data.summary.warningDiagnosticCount,
        ),
        confirmText: text.value.dialogs.importOpenApi.confirm,
        detailsLabel: text.value.dialogs.importOpenApi.summaryLabel,
        detailsValue: buildOpenApiDialogDetails(result.data),
        detailsReadonly: true,
      })
    } catch (error) {
      pendingOpenApiImport.value = null
      showErrorToast(
        text.value.toasts.openApiAnalyzeFailed,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const handleDialogSecondaryAction = () => {
    const dialog = dialogState.value
    if (!dialog) return

    if (dialog.kind === 'confirmCloseDirtyTab' && dialog.contextName) {
      closeTabImmediately(dialog.contextName)
      closeDialog()
    }
  }

  const handleDialogSubmit = async (payload: {
    nameValue: string
    detailsValue: string
    tagsValue: string
    selectValue: string
  }) => {
    const dialog = dialogState.value
    if (!dialog || !activeWorkspaceId.value) return

    switch (dialog.kind) {
      case 'createWorkspace': {
        const name = payload.nameValue.trim()
        if (!name) break

        let createdWorkspaceName = name
        const created = await runWithWorkbenchBusy(async () => {
          if (activeWorkspaceId.value) {
            await runtimeClient.saveWorkspaceSession(activeWorkspaceId.value, createWorkspaceSession())
          }

          const result = await runtimeClient.createWorkspace(name)
          if (!result.ok || !result.data) {
            showErrorToast(text.value.toasts.workspaceCreateFailed, result.error?.message)
            return false
          }

          createdWorkspaceName = result.data.name
          const switchResult = await runtimeClient.setActiveWorkspace(result.data.id)
          if (!switchResult.ok) {
            showErrorToast(text.value.toasts.workspaceSwitchFailed, switchResult.error?.message)
            return false
          }

          await refreshRuntimeState(null)
          return true
        })
        if (created) {
          showToast({ ...text.value.toasts.workspaceCreated(createdWorkspaceName), tone: 'success' })
        }
        break
      }
      case 'deleteWorkspace': {
        const workspaceId = dialog.contextName
        if (!workspaceId || workspaces.value.length <= 1) break

        const target = workspaces.value.find((workspace) => workspace.id === workspaceId)
        const result = await runtimeClient.deleteWorkspace(workspaceId)
        if (!result.ok) {
          showErrorToast(text.value.toasts.workspaceDeleteFailed, result.error?.message)
          return
        }

        await runWithWorkbenchBusy(async () => {
          await refreshRuntimeState(null)
        })
        showToast({ ...text.value.toasts.workspaceDeleted(target?.name ?? text.value.common.workspace), tone: 'success' })
        break
      }
      case 'createCollection': {
        const name = payload.nameValue.trim()
        if (!name) break
        if (collections.value.some((collection) => collection.name === name)) {
          showToast({ ...text.value.toasts.collectionAlreadyExists(name), tone: 'info' })
          closeDialog()
          return
        }
        const result = await runtimeClient.createCollection(activeWorkspaceId.value, name)
        if (!result.ok || !result.data) {
          showErrorToast(text.value.toasts.collectionCreateFailed, result.error?.message)
          return
        }
        collections.value = [result.data, ...collections.value]
        showToast({ ...text.value.toasts.collectionCreated(name), tone: 'success' })
        break
      }
      case 'renameCollection': {
        const current = collections.value.find((collection) => collection.name === dialog.contextName)
        const nextName = payload.nameValue
        if (!current || !nextName || current.name === nextName) break
        const result = await runtimeClient.renameCollection(activeWorkspaceId.value, current.id, nextName)
        if (!result.ok || !result.data) {
          showErrorToast(text.value.toasts.collectionRenameFailed, result.error?.message)
          return
        }
        collections.value = collections.value.map((collection) => (
          collection.id === current.id ? { ...collection, name: result.data!.name } : collection
        ))
        openTabs.value = openTabs.value.map((tab) => (
          tab.collectionId === current.id ? { ...tab, collectionName: nextName } : tab
        ))
        showToast({ ...text.value.toasts.collectionRenamed(current.name, nextName), tone: 'success' })
        break
      }
      case 'deleteCollection': {
        const target = collections.value.find((collection) => collection.name === dialog.contextName)
        if (!target) break
        const result = await runtimeClient.deleteCollection(activeWorkspaceId.value, target.id)
        if (!result.ok) {
          showErrorToast(text.value.toasts.collectionDeleteFailed, result.error?.message)
          return
        }
        const deletedRequestIds = new Set(target.requests.map((request) => request.id))
        collections.value = collections.value.filter((collection) => collection.id !== target.id)
        openTabs.value = openTabs.value.map((tab) => (
          deletedRequestIds.has(tab.requestId ?? '')
            ? {
                ...tab,
                requestId: undefined,
                collectionId: undefined,
                collectionName: SCRATCH_PAD_NAME,
                origin: {
                  kind: 'detached',
                  requestId: tab.origin?.requestId ?? tab.requestId,
                },
                persistenceState: 'unbound',
                isDirty: true,
              }
            : tab
        ))
        showToast({ ...text.value.toasts.collectionDeleted(target.name), tone: 'success' })
        break
      }
      case 'confirmCloseDirtyTab': {
        if (!dialog.contextName) break
        pendingCloseAfterSaveTabId.value = dialog.contextName
        handleSaveRequest(dialog.contextName)
        return
      }
      case 'saveRequest': {
        const targetTabId = dialog.contextName
        const tab = targetTabId
          ? openTabs.value.find((item) => item.id === targetTabId) ?? activeTab.value
          : activeTab.value
        if (!tab) break

        const requestName = payload.nameValue
        const requestDescription = payload.detailsValue
        const requestTags = parseTags(payload.tagsValue)
        const targetCollectionName = payload.selectValue
        if (!requestName || !targetCollectionName) break

        let targetCollection = collections.value.find((collection) => collection.name === targetCollectionName)
        if (!targetCollection) {
          const createResult = await runtimeClient.createCollection(activeWorkspaceId.value, targetCollectionName)
          if (!createResult.ok || !createResult.data) {
            showErrorToast(text.value.toasts.collectionCreateFailed, createResult.error?.message)
            return
          }
          targetCollection = createResult.data
          collections.value = [targetCollection, ...collections.value]
        }

        const preset = createPresetFromTab({
          ...tab,
          name: requestName,
          description: requestDescription,
          tags: requestTags,
          collectionId: targetCollection.id,
          collectionName: targetCollection.name,
        })
        const saveResult = await runtimeClient.saveRequest(activeWorkspaceId.value, targetCollection.id, preset)
        if (!saveResult.ok || !saveResult.data) {
          showErrorToast(text.value.toasts.requestSaveFailed, saveResult.error?.message)
          return
        }

        collections.value = collections.value.map((collection) => {
          if (collection.id !== targetCollection.id) {
            return {
              ...collection,
              requests: collection.requests.filter((request) => request.id !== saveResult.data!.id),
            }
          }

          const nextRequest = saveResult.data!
          const existingIndex = collection.requests.findIndex((request) => request.id === saveResult.data!.id)
          const requests = existingIndex >= 0
            ? collection.requests.map((request, index) => (index === existingIndex ? nextRequest : request))
            : [nextRequest, ...collection.requests]
          return { ...collection, expanded: true, requests }
        })

        const savedRequestId = saveResult.data.id
        updateTab(tab.id, (currentTab) => ({
          ...currentTab,
          requestId: savedRequestId,
          name: requestName,
          description: requestDescription,
          tags: requestTags,
          collectionId: targetCollection.id,
          collectionName: targetCollection.name,
          origin: {
            kind: 'resource',
            requestId: savedRequestId,
          },
          persistenceState: 'saved',
          isDirty: false,
        }))

        const shouldCloseAfterSave = pendingCloseAfterSaveTabId.value === tab.id
        if (shouldCloseAfterSave) {
          pendingCloseAfterSaveTabId.value = null
          closeTabImmediately(tab.id)
        }

        showToast({ ...text.value.toasts.requestSaved(requestName, targetCollection.name), tone: 'success' })
        break
      }
      case 'exportWorkspace': {
        const scope = (payload.selectValue || 'workspace') as ExportPackageScope

        await runtimeClient.saveWorkspaceSession(activeWorkspaceId.value, createWorkspaceSession())
        const result = await runtimeClient.exportWorkspace(activeWorkspaceId.value, scope)
        if (!result.ok || !result.data) {
          showErrorToast(text.value.toasts.workspaceExportFailed, result.error?.message)
          return
        }

        triggerJsonDownload(result.data.fileName, result.data.packageJson)
        showToast(
          result.data.scope === 'application'
            ? { ...text.value.toasts.applicationExported(result.data.fileName), tone: 'success' }
            : { ...text.value.toasts.workspaceExported(result.data.fileName), tone: 'success' },
        )
        break
      }
      case 'importWorkspace': {
        if (!pendingWorkspaceImport.value) break

        const strategy = (payload.selectValue || 'rename') as ImportConflictStrategy
        const result = await runtimeClient.importWorkspace(pendingWorkspaceImport.value.packageJson, strategy)
        if (!result.ok || !result.data) {
          showErrorToast(text.value.toasts.workspaceImportFailed, result.error?.message)
          return
        }

        pendingWorkspaceImport.value = null
        await runWithWorkbenchBusy(async () => {
          await refreshRuntimeState(null)
        })
        showToast(
          result.data.scope === 'application'
            ? { ...text.value.toasts.applicationImported(result.data.importedWorkspaceCount), tone: 'success' }
            : { ...text.value.toasts.workspaceImported(result.data.workspace.name), tone: 'success' },
        )
        break
      }
      case 'importOpenApi': {
        if (!pendingOpenApiImport.value) break

        const applyResult = await runtimeClient.applyOpenApiImport(
          activeWorkspaceId.value,
          pendingOpenApiImport.value.analysis,
        )
        if (!applyResult.ok || !applyResult.data) {
          showErrorToast(text.value.toasts.openApiImportFailed, applyResult.error?.message)
          return
        }

        pendingOpenApiImport.value = null
        await runWithWorkbenchBusy(async () => {
          await runtimeClient.saveWorkspaceSession(activeWorkspaceId.value, createWorkspaceSession())
          await refreshRuntimeState(null)
        })
        showToast({
          ...text.value.toasts.openApiImported(
            applyResult.data.importedRequestCount,
            applyResult.data.skippedOperationCount,
            applyResult.data.warningDiagnosticCount,
          ),
          tone: 'success',
        })
        break
      }
      case 'importCurl': {
        const command = payload.detailsValue.trim()
        if (!command) break

        const result = await runtimeClient.importCurlRequest(activeWorkspaceId.value, command)
        if (!result.ok || !result.data) {
          showErrorToast(text.value.toasts.curlImportFailed, result.error?.message)
          return
        }

        const importedTab = cloneTab(result.data)
        openTabs.value = [...openTabs.value, importedTab]
        activeTabId.value = importedTab.id
        showToast({ ...text.value.toasts.curlImported(importedTab.name), tone: 'success' })
        break
      }
      case 'createEnvironment': {
        const name = payload.nameValue.trim()
        if (!name) break
        if (environments.value.some((environment) => environment.name === name)) {
          showToast({ ...text.value.toasts.environmentAlreadyExists(name), tone: 'info' })
          closeDialog()
          return
        }
        const result = await runtimeClient.createEnvironment(activeWorkspaceId.value, name)
        if (!result.ok || !result.data) {
          showErrorToast(text.value.toasts.environmentCreateFailed, result.error?.message)
          return
        }
        environments.value = [...environments.value, result.data]
        activeEnvironmentId.value = result.data.id
        showToast({ ...text.value.toasts.environmentCreated(name), tone: 'success' })
        break
      }
      case 'renameEnvironment': {
        const environmentId = dialog.contextName
        const current = environments.value.find((environment) => environment.id === environmentId)
        const nextName = payload.nameValue
        if (!environmentId || !current || !nextName) break
        const result = await runtimeClient.renameEnvironment(activeWorkspaceId.value, environmentId, nextName)
        if (!result.ok || !result.data) {
          showErrorToast(text.value.toasts.environmentRenameFailed, result.error?.message)
          return
        }
        environments.value = environments.value.map((environment) => (
          environment.id === environmentId ? result.data! : environment
        ))
        showToast({ ...text.value.toasts.environmentRenamed(current.name, nextName), tone: 'success' })
        break
      }
      case 'deleteEnvironment': {
        const environmentId = dialog.contextName
        if (!environmentId) break
        const result = await runtimeClient.deleteEnvironment(activeWorkspaceId.value, environmentId)
        if (!result.ok) {
          showErrorToast(text.value.toasts.environmentDeleteFailed, result.error?.message)
          return
        }
        environments.value = environments.value.filter((environment) => environment.id !== environmentId)
        activeEnvironmentId.value = environments.value[0]?.id ?? ''
        showToast({ ...text.value.toasts.environmentDeleted, tone: 'success' })
        break
      }
    }

    closeDialog()
  }

  const parseTags = (value: string) => value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const handleSend = async (payload: SendRequestPayload) => {
    const currentEnvironment = activeEnvironment.value
    if (!currentEnvironment || !activeWorkspaceId.value) return

    updateTab(payload.tabId, (tab) => ({
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

    try {
      const response = await runtimeClient.sendRequest(activeWorkspaceId.value, currentEnvironment.id, payload)
      if (!response.ok || !response.data) {
        throw new Error(response.error?.message || 'send_request failed')
      }

      const artifact = response.data.executionArtifact
      const normalizedResponse = artifact?.normalizedResponse
      const compiledRequest = artifact?.compiledRequest
      const assertionResults = response.data.assertionResults ?? artifact?.assertionResults

      updateTab(payload.tabId, (tab) => ({
        ...tab,
        isSending: false,
        executionState: resolveResponseStateFromStatus(normalizedResponse?.status ?? response.data!.status),
        response: {
          responseBody: normalizedResponse?.body || response.data!.responseBody || '{\n  "message": "Empty response body"\n}',
          status: normalizedResponse?.status ?? response.data!.status,
          statusText: normalizedResponse?.statusText || response.data!.statusText || 'OK',
          time: `${normalizedResponse?.elapsedMs ?? response.data!.elapsedMs} ms`,
          size: formatBytes(normalizedResponse?.sizeBytes ?? response.data!.sizeBytes),
          headers: normalizedResponse?.headers ?? response.data!.headers,
          contentType: normalizedResponse?.contentType ?? response.data!.contentType,
          requestMethod: compiledRequest?.method || response.data!.requestMethod || payload.method,
          requestUrl: compiledRequest?.url || response.data!.requestUrl || payload.url,
          testResults: assertionResults?.results ?? [],
          state: resolveResponseStateFromStatus(normalizedResponse?.status ?? response.data!.status),
          stale: false,
          executionSource: artifact?.executionSource ?? response.data!.executionSource ?? 'live',
        },
      }))

      if (response.data.historyItem) {
        historyItems.value = [response.data.historyItem, ...historyItems.value].slice(0, HISTORY_LIMIT)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      updateTab(payload.tabId, (tab) => ({
        ...tab,
        isSending: false,
        executionState: 'transport-error',
        response: {
          responseBody: JSON.stringify({ error: 'Request failed', message }, null, 2),
          status: 0,
          statusText: 'ERROR',
          time: '0 ms',
          size: formatBytes(new TextEncoder().encode(message).length),
          headers: [],
          contentType: 'application/json',
          requestMethod: payload.method,
          requestUrl: payload.url,
          testResults: [],
          state: 'transport-error',
          stale: false,
          executionSource: 'live',
        },
      }))
    }
  }

  const handleWorkspaceChange = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === activeWorkspaceId.value) return
    await runWithWorkbenchBusy(async () => {
      if (activeWorkspaceId.value) {
        await runtimeClient.saveWorkspaceSession(activeWorkspaceId.value, createWorkspaceSession())
      }
      const result = await runtimeClient.setActiveWorkspace(workspaceId)
      if (!result.ok) {
        showErrorToast(text.value.toasts.workspaceSwitchFailed, result.error?.message)
        return
      }
      await refreshRuntimeState(null)
    })
  }

  const handleRequestPanelResize = (size: number) => {
    if (requestPanelCollapsed.value) return
    if (isCompactLayout.value) {
      requestCompactExpandedSize.value = size
      return
    }
    requestDesktopExpandedSize.value = size
  }

  const handleResponsePanelResize = (size: number) => {
    if (responsePanelCollapsed.value) return
    if (isCompactLayout.value) {
      responseCompactExpandedSize.value = size
      return
    }
    responseDesktopExpandedSize.value = size
  }

  const toggleRequestPanelCollapsed = () => {
    requestPanelCollapsed.value = !requestPanelCollapsed.value
  }

  const toggleResponsePanelCollapsed = () => {
    responsePanelCollapsed.value = !responsePanelCollapsed.value
  }

  const setMobileExplorerOpen = (value: boolean) => {
    mobileExplorerOpen.value = value
  }

  const setRequestPanelCollapsed = (value: boolean) => {
    requestPanelCollapsed.value = value
  }

  const setResponsePanelCollapsed = (value: boolean) => {
    responsePanelCollapsed.value = value
  }

  const applyViewportLayout = () => {
    const nextCompact = window.innerWidth < WORKBENCH_COMPACT_BREAKPOINT
    isCompactLayout.value = nextCompact
    if (!nextCompact) {
      mobileExplorerOpen.value = false
    }
  }

  const handleViewportResize = () => {
    applyViewportLayout()
  }

  const handleToggleNavigation = () => {
    if (!isCompactLayout.value) return
    mobileExplorerOpen.value = !mobileExplorerOpen.value
  }

  watch(resolvedTheme, (theme) => {
    applyThemeToDocument(theme)
  }, { immediate: true })

  watch([locale, themeMode], ([nextLocale, nextThemeMode]) => {
    void runtimeClient.updateSettings({
      locale: nextLocale,
      themeMode: nextThemeMode,
    })
  })

  let mediaQuery: MediaQueryList | null = null
  let workspacePersistTimer: number | null = null
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches
  }

  const handleGlobalContextMenu = (event: MouseEvent) => {
    if (shouldBypassResourceContextMenu(event.target) || isResourceContextMenuSurface(event.target)) {
      return
    }

    event.preventDefault()
  }

  onMounted(() => {
    applyViewportLayout()
    window.addEventListener('resize', handleViewportResize)
    document.addEventListener('contextmenu', handleGlobalContextMenu)

    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDark.value = mediaQuery.matches
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    }

    void runStartupBootstrap()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleViewportResize)
    document.removeEventListener('contextmenu', handleGlobalContextMenu)
    mediaQuery?.removeEventListener('change', handleSystemThemeChange)
    if (workspacePersistTimer !== null) {
      window.clearTimeout(workspacePersistTimer)
    }
    if (environmentPersistTimer !== null) {
      window.clearTimeout(environmentPersistTimer)
    }
  })

  watch([activeEnvironmentId, openTabs, activeTabId], () => {
    if (!runtimeReady.value || !activeWorkspaceId.value || activeWorkspaceId.value === 'workspace-local') return
    if (workspacePersistTimer !== null) {
      window.clearTimeout(workspacePersistTimer)
    }
    workspacePersistTimer = window.setTimeout(() => {
      void runtimeClient.saveWorkspaceSession(activeWorkspaceId.value, createWorkspaceSession())
      workspacePersistTimer = null
    }, 400)
  }, { deep: true })

  const headerBindings = computed<HeaderBindings>(() => ({
    locale: locale.value,
    themeMode: themeMode.value,
    workspaces: workspaces.value,
    activeWorkspaceId: activeWorkspaceId.value,
    workspaceBusy: workbenchBusy.value,
    canDeleteWorkspace: workspaces.value.length > 1,
    environments: environments.value,
    activeEnvironmentId: activeEnvironmentId.value,
    isCompactLayout: isCompactLayout.value,
  }))

  const sidebarProps = computed<SidebarBindings>(() => ({
    locale: locale.value,
    collections: collections.value,
    historyItems: historyItems.value,
    activeRequestId: activeRequestResourceId.value,
    activityProjection: workbenchActivityProjection.value,
    searchQuery: searchQuery.value,
    runtimeReady: runtimeReady.value,
  }))

  const requestPanelProps = computed<RequestPanelBindings>(() => ({
    locale: locale.value,
    tabs: openTabs.value,
    activityProjection: workbenchActivityProjection.value,
    activeTabId: activeTabId.value,
    activeEnvironmentName: activeEnvironment.value?.name ?? environments.value[0]?.name ?? text.value.common.environment,
    activeEnvironmentVariables: activeEnvironment.value?.variables ?? [],
    resolvedActiveUrl: resolvedActiveUrl.value,
    showOpenApiImport: canImportOpenApi.value,
    collapsed: requestPanelCollapsed.value,
  }))

  const responsePanelProps = computed<ResponsePanelBindings>(() => ({
    locale: locale.value,
    responseBody: activeTab.value?.response.responseBody,
    status: activeTab.value?.response.status,
    statusText: activeTab.value?.response.statusText,
    time: activeTab.value?.response.time,
    size: activeTab.value?.response.size,
    headers: activeTab.value?.response.headers ?? [],
    testResults: activeTab.value?.response.testResults ?? [],
    configuredTestsCount: activeTab.value?.tests.length ?? 0,
    contentType: activeTab.value?.response.contentType,
    requestMethod: activeTab.value?.response.requestMethod,
    requestUrl: activeTab.value?.response.requestUrl,
    state: activeTab.value?.response.state,
    stale: activeTab.value?.response.stale,
    executionSource: activeTab.value?.response.executionSource,
    theme: resolvedTheme.value,
    collapsed: responsePanelCollapsed.value,
  }))

  const workbenchLayout = computed<WorkbenchLayoutState>(() => ({
    requestPanelCollapsed: requestPanelCollapsed.value,
    responsePanelCollapsed: responsePanelCollapsed.value,
    requestDesktopExpandedSize: requestDesktopExpandedSize.value,
    responseDesktopExpandedSize: responseDesktopExpandedSize.value,
    requestCompactExpandedSize: requestCompactExpandedSize.value,
    responseCompactExpandedSize: responseCompactExpandedSize.value,
  }))

  const workspaceDialogProps = computed<WorkspaceDialogBindings>(() => ({
    open: !!dialogState.value,
    title: dialogState.value?.title ?? '',
    description: dialogState.value?.description ?? '',
    confirmText: dialogState.value?.confirmText ?? text.value.common.save,
    cancelText: text.value.common.cancel,
    variant: dialogState.value?.variant ?? 'default',
    highlightLabel: dialogState.value?.highlightLabel ?? '',
    contextBadges: dialogState.value?.contextBadges ?? [],
    destructive: dialogState.value?.destructive ?? false,
    nameLabel: dialogState.value?.nameLabel ?? '',
    namePlaceholder: dialogState.value?.namePlaceholder ?? '',
    nameValue: dialogState.value?.nameValue ?? '',
    detailsLabel: dialogState.value?.detailsLabel ?? '',
    detailsPlaceholder: dialogState.value?.detailsPlaceholder ?? '',
    detailsValue: dialogState.value?.detailsValue ?? '',
    detailsReadonly: dialogState.value?.detailsReadonly ?? false,
    tagsLabel: dialogState.value?.tagsLabel ?? '',
    tagsPlaceholder: dialogState.value?.tagsPlaceholder ?? '',
    tagsValue: dialogState.value?.tagsValue ?? '',
    selectLabel: dialogState.value?.selectLabel ?? '',
    selectValue: dialogState.value?.selectValue ?? '',
    selectOptions: dialogState.value?.selectOptions ?? [],
    secondaryActionText: dialogState.value?.secondaryActionText ?? '',
  }))

  const sidebarHandlers: SidebarHandlers = {
    onSelectRequest: handleSelectRequest,
    onCreateRequest: handleCreateTab,
    onCreateCollection: handleCreateCollection,
    onRenameCollection: handleRenameCollection,
    onDeleteCollection: handleDeleteCollection,
    onDeleteRequest: handleDeleteRequest,
    onSelectHistory: handleSelectHistory,
    onRemoveHistory: handleRemoveHistory,
    onClearHistory: handleClearHistory,
    onUpdateSearchQuery: (value) => {
      searchQuery.value = value
    },
  }

  const requestPanelHandlers: RequestPanelHandlers = {
    onSelectTab: setActiveTab,
    onCloseTab: handleCloseTab,
    onCreateTab: handleCreateTab,
    onSaveTab: handleSaveRequest,
    onUpdateActiveTab: handleUpdateActiveTab,
    onUpdateEnvironmentVariables: handleUpdateEnvironmentVariables,
    onSend: handleSend,
    onSaveRequest: () => handleSaveRequest(),
    onImportWorkspace: handleImportWorkspaceClick,
    onImportOpenApi: handleImportOpenApiClick,
    onImportCurl: handleImportCurlClick,
    onExportWorkspace: handleExportWorkspace,
    onToggleCollapsed: toggleRequestPanelCollapsed,
  }

  const responsePanelHandlers: ResponsePanelHandlers = {
    onToggleCollapsed: toggleResponsePanelCollapsed,
    onCreateMockTemplate: handleCreateMockTemplate,
  }

  return {
    activeWorkspace,
    activeWorkspaceId,
    activeEnvironmentId,
    closeDialog,
    collections,
    dismissToast,
    handleCreateEnvironment,
    handleCreateWorkspace,
    handleDeleteEnvironment,
    handleDeleteWorkspace,
    handleDialogSecondaryAction,
    handleDialogSubmit,
    handleOpenApiImportChange,
    handleRenameEnvironment,
    handleToggleNavigation,
    handleWorkspaceChange,
    handleWorkspaceImportChange,
    headerBindings,
    historyItems,
    isCompactLayout,
    isStartupLoading,
    isStartupReady,
    locale,
    mobileExplorerOpen,
    openApiImportInput,
    openTabs,
    requestPanelHandlers,
    responsePanelHandlers,
    runStartupBootstrap,
    searchQuery,
    setMobileExplorerOpen,
    setRequestPanelCollapsed,
    setResponsePanelCollapsed,
    sidebarHandlers,
    sidebarProps,
    startupErrorMessage,
    text,
    themeMode,
    toasts,
    workbenchBusy,
    workbenchLayout,
    workspaces,
    workspaceDialogProps,
    workspaceImportInput,
    requestPanelProps,
    responsePanelProps,
    handleRequestPanelResize,
    handleResponsePanelResize,
  }
}
