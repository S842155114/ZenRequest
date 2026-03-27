<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BusySurface } from '@/components/ui/busy-surface'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AppHeader, AppSidebar, AppToastList, WorkspaceDialog } from '@/components/layout'
import { RequestPanel } from '@/components/request'
import { ResponsePanel } from '@/components/response'
import { defaultRequestPreset } from '@/data/request-presets'
import { SCRATCH_PAD_NAME, getMessages } from '@/lib/i18n'
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
  createResponseStateFromHistoryItem,
  cloneTests,
  cloneTab,
  createBlankRequestTab,
  createRequestTabFromHistorySnapshot,
  createRequestTabFromPreset,
  createPresetFromTab,
  defaultEnvironments,
  evaluateResponseTests,
  formatBytes,
  readWorkspaceSnapshot,
  resolveTemplate,
  resolveResponseStateFromStatus,
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
} from '@/lib/tauri-client'

defineOptions({
  name: 'App',
})

const WORKBENCH_COMPACT_BREAKPOINT = 1180
const STARTUP_LAUNCH_SCREEN_ID = 'startup-launch-screen'

type StartupState = 'loading' | 'failed' | 'ready'

type DialogKind =
  | 'createWorkspace'
  | 'deleteWorkspace'
  | 'createCollection'
  | 'renameCollection'
  | 'deleteCollection'
  | 'exportWorkspace'
  | 'importWorkspace'
  | 'saveRequest'
  | 'createEnvironment'
  | 'renameEnvironment'
  | 'deleteEnvironment'

interface DialogState {
  kind: DialogKind
  title: string
  description?: string
  confirmText: string
  destructive?: boolean
  nameLabel?: string
  namePlaceholder?: string
  nameValue?: string
  detailsLabel?: string
  detailsPlaceholder?: string
  detailsValue?: string
  tagsLabel?: string
  tagsPlaceholder?: string
  tagsValue?: string
  selectLabel?: string
  selectValue?: string
  selectOptions?: Array<{ label: string; value: string }>
  contextName?: string
}

interface ToastItem {
  id: string
  title: string
  description?: string
  tone?: 'info' | 'success' | 'error'
}

const legacySnapshot = readWorkspaceSnapshot()
const initialEnvironments = defaultEnvironments().map(cloneEnvironment)
const initialTabs = [createRequestTabFromPreset(defaultRequestPreset)]

const locale = ref<AppLocale>('en')
const themeMode = ref<ThemeMode>('dark')
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
const dialogState = ref<DialogState | null>(null)
const pendingWorkspaceImport = ref<{ packageJson: string; fileName: string; meta: ImportPackageMeta } | null>(null)
const searchQuery = ref('')
const toasts = ref<ToastItem[]>([])
const startupState = ref<StartupState>('loading')
const startupErrorMessage = ref('')
const startupSnapshot = ref<WorkspaceSnapshot | null>(legacySnapshot ?? null)
const runtimeReady = ref(false)
const workbenchBusy = ref(false)
const requestPanelCollapsed = ref(false)
const responsePanelCollapsed = ref(false)
const isCompactLayout = ref(false)
const mobileExplorerOpen = ref(false)

interface PanelController {
  collapse: () => void
  expand: () => void
  resize: (size: number) => void
}

const requestWorkbenchPanel = ref<PanelController | null>(null)
const responseWorkbenchPanel = ref<PanelController | null>(null)
const requestDesktopExpandedSize = ref(52)
const responseDesktopExpandedSize = ref(48)
const requestCompactExpandedSize = ref(54)
const responseCompactExpandedSize = ref(46)

const activeWorkspace = computed(() => workspaces.value.find((item) => item.id === activeWorkspaceId.value) ?? workspaces.value[0])
const activeTab = computed(() => openTabs.value.find((tab) => tab.id === activeTabId.value) ?? openTabs.value[0])
const activeEnvironment = computed(() => environments.value.find((item) => item.id === activeEnvironmentId.value) ?? environments.value[0])
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

const getRequestExpandedSize = () => (isCompactLayout.value ? requestCompactExpandedSize.value : requestDesktopExpandedSize.value)
const getResponseExpandedSize = () => (isCompactLayout.value ? responseCompactExpandedSize.value : responseDesktopExpandedSize.value)

const syncWorkbenchPanelStates = () => {
  if (requestWorkbenchPanel.value) {
    if (requestPanelCollapsed.value) {
      requestWorkbenchPanel.value.collapse()
    } else {
      requestWorkbenchPanel.value.expand()
      requestWorkbenchPanel.value.resize(getRequestExpandedSize())
    }
  }

  if (responseWorkbenchPanel.value) {
    if (responsePanelCollapsed.value) {
      responseWorkbenchPanel.value.collapse()
    } else {
      responseWorkbenchPanel.value.expand()
      responseWorkbenchPanel.value.resize(getResponseExpandedSize())
    }
  }
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

const toggleRequestPanelCollapsed = async () => {
  requestPanelCollapsed.value = !requestPanelCollapsed.value
  await nextTick()
  syncWorkbenchPanelStates()
}

const toggleResponsePanelCollapsed = async () => {
  responsePanelCollapsed.value = !responsePanelCollapsed.value
  await nextTick()
  syncWorkbenchPanelStates()
}

const parseTags = (value: string) => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const closeDialog = () => {
  if (dialogState.value?.kind === 'importWorkspace') {
    pendingWorkspaceImport.value = null
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

const createWorkspaceSession = (): WorkspaceSessionSnapshot => ({
  activeEnvironmentId: activeEnvironmentId.value,
  openTabs: openTabs.value.map(cloneTab),
  activeTabId: activeTabId.value,
})

const applyBootstrapPayload = (payload: RuntimeBootstrapPayload) => {
  locale.value = payload.settings.locale
  themeMode.value = payload.settings.themeMode
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

const runStartupBootstrap = async () => {
  startupState.value = 'loading'
  startupErrorMessage.value = ''
  removeStartupLaunchScreen()

  try {
    await refreshRuntimeState(startupSnapshot.value)
    if (startupSnapshot.value) {
      clearWorkspaceSnapshot()
      startupSnapshot.value = null
    }
    startupState.value = 'ready'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    startupErrorMessage.value = message
    startupState.value = 'failed'
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

const setActiveTab = (tabId: string) => {
  if (openTabs.value.some((tab) => tab.id === tabId)) {
    activeTabId.value = tabId
  }
}

const handleSelectRequest = (request: RequestPreset) => {
  const existing = openTabs.value.find((tab) => tab.requestId === request.id)
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

const handleCloseTab = (tabId: string) => {
  if (openTabs.value.length === 1) return
  const index = openTabs.value.findIndex((tab) => tab.id === tabId)
  openTabs.value = openTabs.value.filter((tab) => tab.id !== tabId)
  if (activeTabId.value === tabId) {
    const fallback = openTabs.value[index] ?? openTabs.value[index - 1] ?? openTabs.value[0]
    if (fallback) activeTabId.value = fallback.id
  }
}

const handleUpdateActiveTab = (payload: Partial<RequestTabState>) => {
  if (!activeTab.value) return

  updateTab(activeTab.value.id, (tab) => ({
    ...tab,
    ...payload,
    params: payload.params ? cloneItems(payload.params) : cloneItems(tab.params),
    headers: payload.headers ? cloneItems(payload.headers) : cloneItems(tab.headers),
    auth: payload.auth ? cloneAuth(payload.auth) : cloneAuth(tab.auth),
    tests: payload.tests ? cloneTests(payload.tests) : cloneTests(tab.tests),
    response: payload.response ? cloneResponse(payload.response) : cloneResponse(tab.response),
    isDirty: payload.isDirty ?? true,
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
      ? { ...tab, requestId: undefined, collectionId: undefined, collectionName: SCRATCH_PAD_NAME, isDirty: true }
      : tab
  ))
  showToast({ ...text.value.toasts.requestRemoved(payload.collectionName), tone: 'success' })
}

const handleSelectHistory = (item: HistoryItem) => {
  const snapshot = item.requestSnapshot as HistoryRequestSnapshot | undefined
  const requestFromCollection = item.requestId
    ? collections.value.flatMap((collection) => collection.requests).find((request) => request.id === item.requestId)
    : undefined
  const fallbackPreset = requestFromCollection ? clonePreset(requestFromCollection) : undefined
  const newTab = snapshot
    ? createRequestTabFromHistorySnapshot(snapshot, item.name)
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
  newTab.method = resolvedMethod
  newTab.url = resolvedUrl
  newTab.response = cloneResponse(createResponseStateFromHistoryItem(item, resolvedMethod, resolvedUrl))
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

const handleSaveRequest = () => {
  const tab = activeTab.value
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
          ? { ...tab, requestId: undefined, collectionId: undefined, collectionName: SCRATCH_PAD_NAME, isDirty: true }
          : tab
      ))
      showToast({ ...text.value.toasts.collectionDeleted(target.name), tone: 'success' })
      break
    }
    case 'saveRequest': {
      const tab = activeTab.value
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

      handleUpdateActiveTab({
        requestId: saveResult.data.id,
        name: requestName,
        description: requestDescription,
        tags: requestTags,
        collectionId: targetCollection.id,
        collectionName: targetCollection.name,
        isDirty: false,
      })

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

const resolvePayloadTemplates = (payload: SendRequestPayload, variables: Record<string, string>): SendRequestPayload => ({
  ...payload,
  url: resolveTemplate(payload.url, variables),
  params: payload.params.map((item) => ({
    ...item,
    key: resolveTemplate(item.key, variables),
    value: resolveTemplate(item.value, variables),
  })),
  headers: payload.headers.map((item) => ({
    ...item,
    key: resolveTemplate(item.key, variables),
    value: resolveTemplate(item.value, variables),
  })),
  body: resolveTemplate(payload.body, variables),
  bodyContentType: payload.bodyContentType ? resolveTemplate(payload.bodyContentType, variables) : undefined,
  formDataFields: payload.formDataFields?.map((field) => ({
    ...field,
    key: resolveTemplate(field.key, variables),
    value: resolveTemplate(field.value, variables),
    fileName: field.fileName ? resolveTemplate(field.fileName, variables) : undefined,
    mimeType: field.mimeType ? resolveTemplate(field.mimeType, variables) : undefined,
  })),
  binaryFileName: payload.binaryFileName ? resolveTemplate(payload.binaryFileName, variables) : undefined,
  binaryMimeType: payload.binaryMimeType ? resolveTemplate(payload.binaryMimeType, variables) : undefined,
  auth: {
    ...cloneAuth(payload.auth),
    bearerToken: resolveTemplate(payload.auth.bearerToken, variables),
    username: resolveTemplate(payload.auth.username, variables),
    password: resolveTemplate(payload.auth.password, variables),
    apiKeyKey: resolveTemplate(payload.auth.apiKeyKey, variables),
    apiKeyValue: resolveTemplate(payload.auth.apiKeyValue, variables),
  },
  tests: payload.tests.map((test) => ({
    ...test,
    name: resolveTemplate(test.name, variables),
    target: resolveTemplate(test.target ?? '', variables),
    expected: resolveTemplate(test.expected ?? '', variables),
  })),
})

const handleSend = async (payload: SendRequestPayload) => {
  const currentEnvironment = activeEnvironment.value
  if (!currentEnvironment || !activeWorkspaceId.value) return

  const variables = resolveVariablesMap(currentEnvironment.variables)
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
    isSending: true,
    response: cloneResponse({
      ...tab.response,
      state: 'pending',
      stale: tab.response.state !== 'idle',
    }),
  }))

  try {
    const resolvedPayload = resolvePayloadTemplates(payload, variables)
    const response = await runtimeClient.sendRequest(activeWorkspaceId.value, resolvedPayload)
    if (!response.ok || !response.data) {
      throw new Error(response.error?.message || 'send_request failed')
    }

    updateTab(payload.tabId, (tab) => ({
      ...tab,
      isSending: false,
      isDirty: false,
      response: {
        responseBody: response.data!.responseBody || '{\n  "message": "Empty response body"\n}',
        status: response.data!.status,
        statusText: response.data!.statusText || 'OK',
        time: `${response.data!.elapsedMs} ms`,
        size: formatBytes(response.data!.sizeBytes),
        headers: response.data!.headers,
        contentType: response.data!.contentType,
        requestMethod: response.data!.requestMethod || payload.method,
        requestUrl: response.data!.requestUrl || resolvedPayload.url,
        testResults: evaluateResponseTests(resolvedPayload.tests, {
          status: response.data!.status,
          headers: response.data!.headers,
          responseBody: response.data!.responseBody || '',
        }),
        state: resolveResponseStateFromStatus(response.data!.status),
        stale: false,
      },
    }))

    if (response.data.historyItem) {
      historyItems.value = [response.data.historyItem, ...historyItems.value].slice(0, HISTORY_LIMIT)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const fallbackUrl = resolveTemplate(payload.url, variables)

    updateTab(payload.tabId, (tab) => ({
      ...tab,
      isSending: false,
      response: {
        responseBody: JSON.stringify({ error: 'Request failed', message }, null, 2),
        status: 0,
        statusText: 'ERROR',
        time: '0 ms',
        size: formatBytes(new TextEncoder().encode(message).length),
        headers: [],
        contentType: 'application/json',
        requestMethod: payload.method,
        requestUrl: fallbackUrl,
        testResults: [],
        state: 'transport-error',
        stale: false,
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

onMounted(() => {
  applyViewportLayout()
  window.addEventListener('resize', handleViewportResize)

  if (window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  }

  void runStartupBootstrap()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportResize)
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

watch(isCompactLayout, async () => {
  await nextTick()
  syncWorkbenchPanelStates()
})
</script>

<template>
  <div class="zr-shell relative flex h-screen w-screen flex-col overflow-hidden bg-transparent text-foreground">
    <div class="zr-app-glow pointer-events-none absolute inset-0 opacity-80" />

    <div
      v-if="!isStartupReady"
      data-testid="startup-screen"
      class="zr-startup-shell relative z-10 flex flex-1 items-center justify-center px-5 py-8"
      :aria-busy="isStartupLoading ? 'true' : 'false'"
      :aria-live="isStartupLoading ? 'polite' : 'assertive'"
    >
      <section class="zr-startup-panel w-full max-w-md rounded-[1.2rem] p-6 sm:p-7">
        <div class="mb-6 flex items-center gap-4">
          <div class="zr-brand-badge h-12 w-12 rounded-2xl text-sm">ZR</div>
          <div class="space-y-1">
            <div class="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--zr-text-muted)]">
              {{ text.header.appName }}
            </div>
            <h1 class="text-2xl font-semibold text-[var(--zr-text-primary)]">
              {{ isStartupLoading ? text.startup.loadingTitle : text.startup.errorTitle }}
            </h1>
          </div>
        </div>

        <div v-if="isStartupLoading" class="space-y-4">
          <div class="flex items-center gap-3 rounded-2xl border border-[var(--zr-border)] bg-[var(--zr-elevated)] px-4 py-3">
            <div class="zr-startup-spinner" aria-hidden="true" />
            <div class="space-y-1">
              <p class="text-sm font-medium text-[var(--zr-text-primary)]">{{ text.startup.loadingLabel }}</p>
              <p class="text-sm text-[var(--zr-text-secondary)]">{{ text.startup.loadingDescription }}</p>
            </div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <p class="text-sm leading-6 text-[var(--zr-text-secondary)]">
            {{ text.startup.errorDescription }}
          </p>
          <div class="rounded-2xl border border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)] px-4 py-3">
            <div class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--zr-text-muted)]">
              {{ text.startup.errorLabel }}
            </div>
            <p class="text-sm text-[var(--zr-text-primary)]">{{ startupErrorMessage }}</p>
          </div>
          <button
            type="button"
            data-testid="startup-retry"
            class="zr-tool-button inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[var(--zr-text-primary)]"
            @click="runStartupBootstrap"
          >
            {{ text.startup.retry }}
          </button>
        </div>
      </section>
    </div>

    <template v-else>
      <input
        ref="workspaceImportInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="handleWorkspaceImportChange"
      >

      <AppHeader
        :locale="locale"
        :theme-mode="themeMode"
        :workspaces="workspaces"
        :active-workspace-id="activeWorkspaceId"
        :workspace-busy="workbenchBusy"
        :can-delete-workspace="workspaces.length > 1"
        :environments="environments"
        :active-environment-id="activeEnvironmentId"
        :is-compact-layout="isCompactLayout"
        @update:locale="locale = $event"
        @update:theme-mode="themeMode = $event"
        @update:active-workspace-id="handleWorkspaceChange"
        @update:active-environment-id="activeEnvironmentId = $event"
        @create-workspace="handleCreateWorkspace"
        @delete-workspace="handleDeleteWorkspace"
        @create-environment="handleCreateEnvironment"
        @rename-environment="handleRenameEnvironment"
        @delete-environment="handleDeleteEnvironment"
        @toggle-navigation="handleToggleNavigation"
      />

      <Sheet :open="mobileExplorerOpen" @update:open="mobileExplorerOpen = $event">
        <SheetContent
          v-if="isCompactLayout"
          side="left"
          class="w-[min(92vw,360px)] border-[var(--zr-border)] bg-[var(--zr-panel-bg)] p-0 text-[var(--zr-text-primary)]"
          data-testid="mobile-explorer-sheet"
        >
          <SheetHeader class="border-b border-[var(--zr-border)] px-4 py-4 text-left">
            <SheetTitle class="text-base font-semibold text-[var(--zr-text-primary)]">
              {{ text.header.openExplorer }}
            </SheetTitle>
            <SheetDescription class="text-sm text-[var(--zr-text-muted)]">
              {{ activeWorkspace?.name ?? text.common.workspace }}
            </SheetDescription>
          </SheetHeader>
          <BusySurface
            :busy="workbenchBusy"
            :title="text.busy.workspaceLoadingTitle"
            :description="text.busy.workspaceLoadingDescription"
            class="h-[calc(100%-4.5rem)]"
          >
            <div class="h-full p-1.5">
              <AppSidebar
                :locale="locale"
                :collections="collections"
                :history-items="historyItems"
                :active-request-id="activeTab?.requestId"
                :search-query="searchQuery"
                :runtime-ready="runtimeReady"
                @select-request="handleSelectRequest"
                @create-request="handleCreateTab"
                @create-collection="handleCreateCollection"
                @rename-collection="handleRenameCollection"
                @delete-collection="handleDeleteCollection"
                @delete-request="handleDeleteRequest"
                @select-history="handleSelectHistory"
                @remove-history="handleRemoveHistory"
                @clear-history="handleClearHistory"
                @update:search-query="searchQuery = $event"
              />
            </div>
          </BusySurface>
        </SheetContent>
      </Sheet>

      <BusySurface
        :busy="workbenchBusy"
        :title="text.busy.workspaceLoadingTitle"
        :description="text.busy.workspaceLoadingDescription"
        class="zr-workbench flex-1 min-h-0 px-1.5 pb-1.5"
        surface-test-id="workbench-busy-surface"
        overlay-test-id="workbench-busy-overlay"
      >
        <ResizablePanelGroup v-if="!isCompactLayout" direction="horizontal" class="relative h-full min-h-0 gap-1">
          <ResizablePanel :default-size="20" :min-size="16" class="h-full min-h-0 min-w-[252px]">
            <div data-testid="workbench-sidebar" class="h-full min-h-0">
              <AppSidebar
                :locale="locale"
                :collections="collections"
                :history-items="historyItems"
                :active-request-id="activeTab?.requestId"
                :search-query="searchQuery"
                :runtime-ready="runtimeReady"
                @select-request="handleSelectRequest"
                @create-request="handleCreateTab"
                @create-collection="handleCreateCollection"
                @rename-collection="handleRenameCollection"
                @delete-collection="handleDeleteCollection"
                @delete-request="handleDeleteRequest"
                @select-history="handleSelectHistory"
                @remove-history="handleRemoveHistory"
                @clear-history="handleClearHistory"
                @update:search-query="searchQuery = $event"
              />
            </div>
          </ResizablePanel>

          <ResizableHandle
            class="w-1 rounded-full bg-transparent transition-colors before:bg-[var(--zr-handle-bg)] hover:before:bg-[var(--zr-handle-active)]"
          />

          <ResizablePanel :default-size="80" class="h-full min-h-0 min-w-0">
            <ResizablePanelGroup direction="vertical" class="h-full min-h-0 gap-1">
              <ResizablePanel
                ref="requestWorkbenchPanel"
                :default-size="requestDesktopExpandedSize"
                :min-size="30"
                :collapsed-size="12"
                collapsible
                class="min-h-0"
                @resize="handleRequestPanelResize"
                @collapse="requestPanelCollapsed = true"
                @expand="requestPanelCollapsed = false"
              >
                <div data-testid="workbench-request" class="h-full min-h-0">
                  <RequestPanel
                    :locale="locale"
                    :tabs="openTabs"
                    :active-tab-id="activeTabId"
                    :active-environment-name="activeEnvironment?.name ?? environments[0]?.name ?? text.common.environment"
                    :active-environment-variables="activeEnvironment?.variables ?? []"
                    :resolved-active-url="resolvedActiveUrl"
                    :collapsed="requestPanelCollapsed"
                    @select-tab="setActiveTab"
                    @close-tab="handleCloseTab"
                    @create-tab="handleCreateTab"
                    @update-active-tab="handleUpdateActiveTab"
                    @update-environment-variables="handleUpdateEnvironmentVariables"
                    @send="handleSend"
                    @save-request="handleSaveRequest"
                    @import-workspace="handleImportWorkspaceClick"
                    @export-workspace="handleExportWorkspace"
                    @toggle-collapsed="toggleRequestPanelCollapsed"
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle
                class="h-1 rounded-full bg-transparent transition-colors before:bg-[var(--zr-handle-bg)] hover:before:bg-[var(--zr-handle-active)]"
              />

              <ResizablePanel
                ref="responseWorkbenchPanel"
                :default-size="responseDesktopExpandedSize"
                :min-size="10"
                :collapsed-size="12"
                collapsible
                class="min-h-0"
                @resize="handleResponsePanelResize"
                @collapse="responsePanelCollapsed = true"
                @expand="responsePanelCollapsed = false"
              >
                <div data-testid="workbench-response" class="h-full min-h-0">
                  <ResponsePanel
                    :locale="locale"
                    :response-body="activeTab?.response.responseBody"
                    :status="activeTab?.response.status"
                    :status-text="activeTab?.response.statusText"
                    :time="activeTab?.response.time"
                    :size="activeTab?.response.size"
                    :headers="activeTab?.response.headers"
                    :test-results="activeTab?.response.testResults"
                    :configured-tests-count="activeTab?.tests.length ?? 0"
                    :content-type="activeTab?.response.contentType"
                    :request-method="activeTab?.response.requestMethod"
                    :request-url="activeTab?.response.requestUrl"
                    :state="activeTab?.response.state"
                    :stale="activeTab?.response.stale"
                    :theme="resolvedTheme"
                    :collapsed="responsePanelCollapsed"
                    @toggle-collapsed="toggleResponsePanelCollapsed"
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>

        <ResizablePanelGroup v-else direction="vertical" class="relative h-full min-h-0 gap-1">
          <ResizablePanel
            ref="requestWorkbenchPanel"
            :default-size="requestCompactExpandedSize"
            :min-size="32"
            :collapsed-size="18"
            collapsible
            class="min-h-0"
            @resize="handleRequestPanelResize"
            @collapse="requestPanelCollapsed = true"
            @expand="requestPanelCollapsed = false"
          >
            <div data-testid="workbench-request" class="h-full min-h-0">
              <RequestPanel
                :locale="locale"
                :tabs="openTabs"
                :active-tab-id="activeTabId"
                :active-environment-name="activeEnvironment?.name ?? environments[0]?.name ?? text.common.environment"
                :active-environment-variables="activeEnvironment?.variables ?? []"
                :resolved-active-url="resolvedActiveUrl"
                :collapsed="requestPanelCollapsed"
                @select-tab="setActiveTab"
                @close-tab="handleCloseTab"
                @create-tab="handleCreateTab"
                @update-active-tab="handleUpdateActiveTab"
                @update-environment-variables="handleUpdateEnvironmentVariables"
                @send="handleSend"
                @save-request="handleSaveRequest"
                @import-workspace="handleImportWorkspaceClick"
                @export-workspace="handleExportWorkspace"
                @toggle-collapsed="toggleRequestPanelCollapsed"
              />
            </div>
          </ResizablePanel>

          <ResizableHandle
            class="h-1 rounded-full bg-transparent transition-colors before:bg-[var(--zr-handle-bg)] hover:before:bg-[var(--zr-handle-active)]"
          />

          <ResizablePanel
            ref="responseWorkbenchPanel"
            :default-size="responseCompactExpandedSize"
            :min-size="14"
            :collapsed-size="18"
            collapsible
            class="min-h-0"
            @resize="handleResponsePanelResize"
            @collapse="responsePanelCollapsed = true"
            @expand="responsePanelCollapsed = false"
          >
            <div data-testid="workbench-response" class="h-full min-h-0">
              <ResponsePanel
                :locale="locale"
                :response-body="activeTab?.response.responseBody"
                :status="activeTab?.response.status"
                :status-text="activeTab?.response.statusText"
                :time="activeTab?.response.time"
                :size="activeTab?.response.size"
                :headers="activeTab?.response.headers"
                :test-results="activeTab?.response.testResults"
                :configured-tests-count="activeTab?.tests.length ?? 0"
                :content-type="activeTab?.response.contentType"
                :request-method="activeTab?.response.requestMethod"
                :request-url="activeTab?.response.requestUrl"
                :state="activeTab?.response.state"
                :stale="activeTab?.response.stale"
                :theme="resolvedTheme"
                :collapsed="responsePanelCollapsed"
                @toggle-collapsed="toggleResponsePanelCollapsed"
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </BusySurface>

      <WorkspaceDialog
        :open="!!dialogState"
        :title="dialogState?.title ?? ''"
        :description="dialogState?.description ?? ''"
        :confirm-text="dialogState?.confirmText ?? text.common.save"
        :cancel-text="text.common.cancel"
        :destructive="dialogState?.destructive ?? false"
        :name-label="dialogState?.nameLabel ?? ''"
        :name-placeholder="dialogState?.namePlaceholder ?? ''"
        :name-value="dialogState?.nameValue ?? ''"
        :details-label="dialogState?.detailsLabel ?? ''"
        :details-placeholder="dialogState?.detailsPlaceholder ?? ''"
        :details-value="dialogState?.detailsValue ?? ''"
        :tags-label="dialogState?.tagsLabel ?? ''"
        :tags-placeholder="dialogState?.tagsPlaceholder ?? ''"
        :tags-value="dialogState?.tagsValue ?? ''"
        :select-label="dialogState?.selectLabel ?? ''"
        :select-value="dialogState?.selectValue ?? ''"
        :select-options="dialogState?.selectOptions ?? []"
        @close="closeDialog"
        @submit="handleDialogSubmit"
      />
    </template>

    <AppToastList :items="toasts" @dismiss="dismissToast" />
  </div>
</template>
