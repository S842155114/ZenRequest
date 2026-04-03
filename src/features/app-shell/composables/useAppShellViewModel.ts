import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type {
  AppLocale,
  EnvironmentPreset,
  HistoryItem,
  KeyValueItem,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  ResolvedTheme,
  SendRequestPayload,
  ThemeMode,
  WorkbenchActivityProjection,
  WorkspaceSummary,
} from '@/types/request'
import { getMessages } from '@/lib/i18n'
import { buildHistoryReplayDraft } from '../domain/history-replay'
import { resolveTabOrigin } from '../domain/request-session'
import {
  cloneAuth,
  cloneItems,
  cloneResponse,
  cloneTests,
  createBlankRequestTab,
  createRequestTabFromPreset,
} from '@/lib/request-workspace'
import type {
  HeaderBindings,
  RequestPanelBindings,
  RequestPanelHandlers,
  ResponsePanelBindings,
  ResponsePanelHandlers,
  SidebarBindings,
  SidebarHandlers,
  ToastItem,
  WorkbenchLayoutState,
  WorkspaceDialogBindings,
} from '../types'
import type { AppShellDialogs } from '../state/app-shell-dialogs'
import type { AppShellServices } from '../state/app-shell-services'
import type { AppShellStore } from '../state/app-shell-store'

type AppShellMessages = ReturnType<typeof getMessages>

interface AppShellViewModelDeps {
  store: AppShellStore
  services: AppShellServices
  dialogs: AppShellDialogs
  text: ComputedRef<AppShellMessages>
  locale: Ref<AppLocale>
  themeMode: Ref<ThemeMode>
  workspaces: Ref<WorkspaceSummary[]>
  activeWorkspace: ComputedRef<WorkspaceSummary | undefined>
  activeWorkspaceId: Ref<string>
  environments: Ref<EnvironmentPreset[]>
  activeEnvironment: ComputedRef<EnvironmentPreset | undefined>
  activeEnvironmentId: Ref<string>
  collections: Ref<RequestCollection[]>
  historyItems: Ref<HistoryItem[]>
  openTabs: Ref<RequestTabState[]>
  activeTab: ComputedRef<RequestTabState | undefined>
  runtimeReady: Ref<boolean>
  workbenchBusy: Ref<boolean>
  startupErrorMessage: Ref<string>
  isStartupReady: ComputedRef<boolean>
  isStartupLoading: ComputedRef<boolean>
  activeRequestResourceId: ComputedRef<string | undefined>
  workbenchActivityProjection: ComputedRef<WorkbenchActivityProjection>
  resolvedTheme: ComputedRef<ResolvedTheme>
  resolvedActiveUrl: ComputedRef<string>
  canImportOpenApi: ComputedRef<boolean>
  searchQuery: Ref<string>
  toasts: Ref<ToastItem[]>
  isCompactLayout: Ref<boolean>
  mobileExplorerOpen: Ref<boolean>
  requestPanelCollapsed: Ref<boolean>
  responsePanelCollapsed: Ref<boolean>
  requestDesktopExpandedSize: Ref<number>
  responseDesktopExpandedSize: Ref<number>
  requestCompactExpandedSize: Ref<number>
  responseCompactExpandedSize: Ref<number>
  workspaceImportInput: Ref<HTMLInputElement | null>
  openApiImportInput: Ref<HTMLInputElement | null>
  closeTabImmediately: (tabId: string) => void
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  showErrorToast: (toast: Pick<ToastItem, 'title' | 'description'>, description?: string) => void
  dismissToast: (id: string) => void
  scheduleEnvironmentPersist: (environmentId: string, variables: KeyValueItem[]) => void
  runStartupBootstrap: () => Promise<void>
  handleRequestPanelResize: (size: number) => void
  handleResponsePanelResize: (size: number) => void
  handleToggleNavigation: () => void
  setMobileExplorerOpen: (value: boolean) => void
  setRequestPanelCollapsed: (value: boolean) => void
  setResponsePanelCollapsed: (value: boolean) => void
  toggleRequestPanelCollapsed: () => void
  toggleResponsePanelCollapsed: () => void
}

export interface AppShellViewModel {
  activeWorkspace: ComputedRef<WorkspaceSummary | undefined>
  activeWorkspaceId: Ref<string>
  activeEnvironmentId: Ref<string>
  closeDialog: () => void
  collections: Ref<RequestCollection[]>
  dismissToast: (id: string) => void
  handleCreateEnvironment: () => void
  handleCreateWorkspace: () => void
  handleDeleteEnvironment: () => void
  handleDeleteWorkspace: () => void
  handleDialogSecondaryAction: () => void
  handleDialogSubmit: (payload: {
    nameValue: string
    detailsValue: string
    tagsValue: string
    selectValue: string
  }) => Promise<void>
  handleOpenApiImportChange: (event: Event) => Promise<void>
  handleRenameEnvironment: () => void
  handleToggleNavigation: () => void
  handleWorkspaceChange: (workspaceId: string) => Promise<void>
  handleWorkspaceImportChange: (event: Event) => Promise<void>
  headerBindings: ComputedRef<HeaderBindings>
  historyItems: Ref<HistoryItem[]>
  isCompactLayout: Ref<boolean>
  isStartupLoading: ComputedRef<boolean>
  isStartupReady: ComputedRef<boolean>
  locale: Ref<AppLocale>
  mobileExplorerOpen: Ref<boolean>
  openApiImportInput: Ref<HTMLInputElement | null>
  openTabs: Ref<RequestTabState[]>
  requestPanelHandlers: RequestPanelHandlers
  responsePanelHandlers: ResponsePanelHandlers
  runStartupBootstrap: () => Promise<void>
  searchQuery: Ref<string>
  setMobileExplorerOpen: (value: boolean) => void
  setRequestPanelCollapsed: (value: boolean) => void
  setResponsePanelCollapsed: (value: boolean) => void
  sidebarHandlers: SidebarHandlers
  sidebarProps: ComputedRef<SidebarBindings>
  startupErrorMessage: Ref<string>
  text: ComputedRef<AppShellMessages>
  themeMode: Ref<ThemeMode>
  toasts: Ref<ToastItem[]>
  workbenchBusy: Ref<boolean>
  workbenchLayout: ComputedRef<WorkbenchLayoutState>
  workspaces: Ref<WorkspaceSummary[]>
  workspaceDialogProps: ComputedRef<WorkspaceDialogBindings>
  workspaceImportInput: Ref<HTMLInputElement | null>
  requestPanelProps: ComputedRef<RequestPanelBindings>
  responsePanelProps: ComputedRef<ResponsePanelBindings>
  handleRequestPanelResize: (size: number) => void
  handleResponsePanelResize: (size: number) => void
}

export const createAppShellViewModel = (deps: AppShellViewModelDeps): AppShellViewModel => {
  const handleCreateMockTemplate = () => {
    const activeTab = deps.activeTab.value
    if (!activeTab) return

    if (activeTab.mock && !window.confirm(deps.text.value.request.mockOverwriteConfirm)) {
      return
    }

    deps.store.mutations.updateTab(activeTab.id, (tab) => ({
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
    deps.store.mutations.selectTab(tabId)
  }

  const handleSelectRequest = (request: RequestPreset) => {
    const existing = deps.openTabs.value.find((tab) => (
      tab.origin?.kind === 'resource' && tab.requestId === request.id
    ))
    if (existing) {
      deps.store.mutations.selectTab(existing.id)
      return
    }

    deps.store.mutations.appendAndActivateTab(createRequestTabFromPreset(request))
  }

  const handleCreateTab = () => {
    const newTab = createBlankRequestTab()
    newTab.name = deps.text.value.toasts.newRequestName
    deps.store.mutations.appendAndActivateTab(newTab)
  }

  const handleCloseTab = (tabId: string) => {
    if (deps.openTabs.value.length === 1) return

    const targetTab = deps.store.selectors.getTabById(tabId)
    if (!targetTab) return

    if (targetTab.isDirty || targetTab.persistenceState !== 'saved') {
      deps.dialogs.openDialog({
        kind: 'confirmCloseDirtyTab',
        title: deps.text.value.dialogs.closeDirtyTab.title,
        description: deps.text.value.dialogs.closeDirtyTab.description(targetTab.name),
        confirmText: deps.text.value.dialogs.closeDirtyTab.confirm,
        secondaryActionText: deps.text.value.dialogs.closeDirtyTab.secondary,
        variant: 'dirty-close',
        highlightLabel: deps.text.value.dialogs.closeDirtyTab.eyebrow,
        contextBadges: [
          targetTab.method,
          targetTab.persistenceState === 'unbound'
            ? deps.text.value.request.unbound
            : deps.text.value.dialogs.closeDirtyTab.draftBadge,
          deps.text.value.dialogs.closeDirtyTab.unsavedBadge,
        ],
        contextName: tabId,
      })
      return
    }

    deps.closeTabImmediately(tabId)
  }

  const handleUpdateActiveTab = (payload: Partial<RequestTabState>) => {
    const activeTab = deps.activeTab.value
    if (!activeTab) return

    deps.store.mutations.updateTab(activeTab.id, (tab) => ({
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
        ?? (resolveTabOrigin({ ...tab, ...payload }).kind === 'detached'
          ? 'unbound'
          : (payload.isDirty ?? true) ? 'unsaved' : 'saved'),
      executionState: payload.executionState
        ?? payload.response?.state
        ?? tab.executionState,
    }))
  }

  const handleUpdateEnvironmentVariables = (items: KeyValueItem[]) => {
    const currentEnvironment = deps.activeEnvironment.value
    if (!currentEnvironment || !deps.activeWorkspaceId.value) return

    deps.store.mutations.updateEnvironmentVariables(currentEnvironment.id, items)
    deps.scheduleEnvironmentPersist(currentEnvironment.id, items)
  }

  const handleDeleteRequest = async (payload: { collectionName: string; requestId: string }) => {
    const result = await deps.services.deleteRequest(payload)
    if (!result.ok) {
      deps.showErrorToast(deps.text.value.toasts.requestDeleteFailed, result.message)
      return
    }

    deps.showToast({ ...deps.text.value.toasts.requestRemoved(payload.collectionName), tone: 'success' })
  }

  const handleSelectHistory = (item: HistoryItem) => {
    const existing = deps.openTabs.value.find((tab) => (
      tab.origin?.kind === 'replay' && tab.origin?.historyItemId === item.id
    ))
    if (existing) {
      deps.store.mutations.selectTab(existing.id)
      return
    }

    const newTab = buildHistoryReplayDraft({
      item,
      collections: deps.collections.value,
      recoveredDescription: deps.text.value.toasts.recoveredFromHistory(item.time),
      historyTag: deps.text.value.toasts.historyTag,
    })

    deps.store.mutations.appendAndActivateTab(newTab)
  }

  const handleRemoveHistory = async (id: string) => {
    const result = await deps.services.removeHistoryItem({ id })
    if (!result.ok) {
      deps.showErrorToast(deps.text.value.toasts.historyRemoveFailed, result.message)
      return
    }

    deps.showToast({ ...deps.text.value.toasts.historyEntryRemoved, tone: 'info' })
  }

  const handleClearHistory = async () => {
    const result = await deps.services.clearHistory()
    if (!result.ok) {
      deps.showErrorToast(deps.text.value.toasts.historyClearFailed, result.message)
      return
    }

    deps.showToast({ ...deps.text.value.toasts.historyCleared, tone: 'info' })
  }

  const handleSend = async (payload: SendRequestPayload) => {
    if (!deps.activeEnvironment.value || !deps.activeWorkspaceId.value) return
    await deps.services.sendRequest({ payload })
  }

  const handleWorkspaceChange = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === deps.activeWorkspaceId.value) return

    const result = await deps.services.switchWorkspace({ workspaceId })
    if (!result.ok) {
      deps.showErrorToast(deps.text.value.toasts.workspaceSwitchFailed, result.message)
    }
  }

  const headerBindings = computed<HeaderBindings>(() => ({
    locale: deps.locale.value,
    themeMode: deps.themeMode.value,
    workspaces: deps.workspaces.value,
    activeWorkspaceId: deps.activeWorkspaceId.value,
    workspaceBusy: deps.workbenchBusy.value,
    canDeleteWorkspace: deps.store.selectors.canDeleteWorkspace(),
    environments: deps.environments.value,
    activeEnvironmentId: deps.activeEnvironmentId.value,
    isCompactLayout: deps.isCompactLayout.value,
  }))

  const sidebarProps = computed<SidebarBindings>(() => ({
    locale: deps.locale.value,
    collections: deps.collections.value,
    historyItems: deps.historyItems.value,
    activeRequestId: deps.activeRequestResourceId.value,
    activityProjection: deps.workbenchActivityProjection.value,
    searchQuery: deps.searchQuery.value,
    runtimeReady: deps.runtimeReady.value,
  }))

  const requestPanelProps = computed<RequestPanelBindings>(() => ({
    locale: deps.locale.value,
    tabs: deps.openTabs.value,
    activityProjection: deps.workbenchActivityProjection.value,
    activeTabId: deps.store.state.request.activeTabId,
    activeEnvironmentName: deps.activeEnvironment.value?.name ?? deps.environments.value[0]?.name ?? deps.text.value.common.environment,
    activeEnvironmentVariables: deps.activeEnvironment.value?.variables ?? [],
    resolvedActiveUrl: deps.resolvedActiveUrl.value,
    showOpenApiImport: deps.canImportOpenApi.value,
    collapsed: deps.requestPanelCollapsed.value,
  }))

  const responsePanelProps = computed<ResponsePanelBindings>(() => ({
    locale: deps.locale.value,
    responseBody: deps.activeTab.value?.response.responseBody,
    status: deps.activeTab.value?.response.status,
    statusText: deps.activeTab.value?.response.statusText,
    time: deps.activeTab.value?.response.time,
    size: deps.activeTab.value?.response.size,
    headers: deps.activeTab.value?.response.headers ?? [],
    testResults: deps.activeTab.value?.response.testResults ?? [],
    configuredTestsCount: deps.activeTab.value?.tests.length ?? 0,
    contentType: deps.activeTab.value?.response.contentType,
    requestMethod: deps.activeTab.value?.response.requestMethod,
    requestUrl: deps.activeTab.value?.response.requestUrl,
    state: deps.activeTab.value?.response.state,
    stale: deps.activeTab.value?.response.stale,
    executionSource: deps.activeTab.value?.response.executionSource,
    theme: deps.resolvedTheme.value,
    collapsed: deps.responsePanelCollapsed.value,
  }))

  const workbenchLayout = computed<WorkbenchLayoutState>(() => ({
    requestPanelCollapsed: deps.requestPanelCollapsed.value,
    responsePanelCollapsed: deps.responsePanelCollapsed.value,
    requestDesktopExpandedSize: deps.requestDesktopExpandedSize.value,
    responseDesktopExpandedSize: deps.responseDesktopExpandedSize.value,
    requestCompactExpandedSize: deps.requestCompactExpandedSize.value,
    responseCompactExpandedSize: deps.responseCompactExpandedSize.value,
  }))

  const workspaceDialogProps = computed<WorkspaceDialogBindings>(() => ({
    open: !!deps.dialogs.dialogState.value,
    title: deps.dialogs.dialogState.value?.title ?? '',
    description: deps.dialogs.dialogState.value?.description ?? '',
    confirmText: deps.dialogs.dialogState.value?.confirmText ?? deps.text.value.common.save,
    cancelText: deps.text.value.common.cancel,
    variant: deps.dialogs.dialogState.value?.variant ?? 'default',
    highlightLabel: deps.dialogs.dialogState.value?.highlightLabel ?? '',
    contextBadges: deps.dialogs.dialogState.value?.contextBadges ?? [],
    destructive: deps.dialogs.dialogState.value?.destructive ?? false,
    nameLabel: deps.dialogs.dialogState.value?.nameLabel ?? '',
    namePlaceholder: deps.dialogs.dialogState.value?.namePlaceholder ?? '',
    nameValue: deps.dialogs.dialogState.value?.nameValue ?? '',
    detailsLabel: deps.dialogs.dialogState.value?.detailsLabel ?? '',
    detailsPlaceholder: deps.dialogs.dialogState.value?.detailsPlaceholder ?? '',
    detailsValue: deps.dialogs.dialogState.value?.detailsValue ?? '',
    detailsReadonly: deps.dialogs.dialogState.value?.detailsReadonly ?? false,
    tagsLabel: deps.dialogs.dialogState.value?.tagsLabel ?? '',
    tagsPlaceholder: deps.dialogs.dialogState.value?.tagsPlaceholder ?? '',
    tagsValue: deps.dialogs.dialogState.value?.tagsValue ?? '',
    selectLabel: deps.dialogs.dialogState.value?.selectLabel ?? '',
    selectValue: deps.dialogs.dialogState.value?.selectValue ?? '',
    selectOptions: deps.dialogs.dialogState.value?.selectOptions ?? [],
    secondaryActionText: deps.dialogs.dialogState.value?.secondaryActionText ?? '',
  }))

  const sidebarHandlers: SidebarHandlers = {
    onSelectRequest: handleSelectRequest,
    onCreateRequest: handleCreateTab,
    onCreateCollection: deps.dialogs.handleCreateCollection,
    onRenameCollection: deps.dialogs.handleRenameCollection,
    onDeleteCollection: deps.dialogs.handleDeleteCollection,
    onDeleteRequest: handleDeleteRequest,
    onSelectHistory: handleSelectHistory,
    onRemoveHistory: handleRemoveHistory,
    onClearHistory: handleClearHistory,
    onUpdateSearchQuery: (value) => {
      deps.searchQuery.value = value
    },
  }

  const requestPanelHandlers: RequestPanelHandlers = {
    onSelectTab: setActiveTab,
    onCloseTab: handleCloseTab,
    onCreateTab: handleCreateTab,
    onSaveTab: (tabId) => deps.dialogs.handleSaveRequest(tabId),
    onUpdateActiveTab: handleUpdateActiveTab,
    onUpdateEnvironmentVariables: handleUpdateEnvironmentVariables,
    onSend: handleSend,
    onSaveRequest: () => deps.dialogs.handleSaveRequest(),
    onImportWorkspace: deps.dialogs.handleImportWorkspaceClick,
    onImportOpenApi: deps.dialogs.handleImportOpenApiClick,
    onImportCurl: deps.dialogs.handleImportCurlClick,
    onExportWorkspace: async () => {
      deps.dialogs.handleExportWorkspace()
    },
    onToggleCollapsed: deps.toggleRequestPanelCollapsed,
  }

  const responsePanelHandlers: ResponsePanelHandlers = {
    onToggleCollapsed: deps.toggleResponsePanelCollapsed,
    onCreateMockTemplate: handleCreateMockTemplate,
  }

  return {
    activeWorkspace: deps.activeWorkspace,
    activeWorkspaceId: deps.activeWorkspaceId,
    activeEnvironmentId: deps.activeEnvironmentId,
    closeDialog: deps.dialogs.closeDialog,
    collections: deps.collections,
    dismissToast: deps.dismissToast,
    handleCreateEnvironment: deps.dialogs.handleCreateEnvironment,
    handleCreateWorkspace: deps.dialogs.handleCreateWorkspace,
    handleDeleteEnvironment: deps.dialogs.handleDeleteEnvironment,
    handleDeleteWorkspace: deps.dialogs.handleDeleteWorkspace,
    handleDialogSecondaryAction: deps.dialogs.handleDialogSecondaryAction,
    handleDialogSubmit: deps.dialogs.handleDialogSubmit,
    handleOpenApiImportChange: deps.dialogs.handleOpenApiImportChange,
    handleRenameEnvironment: deps.dialogs.handleRenameEnvironment,
    handleToggleNavigation: deps.handleToggleNavigation,
    handleWorkspaceChange,
    handleWorkspaceImportChange: deps.dialogs.handleWorkspaceImportChange,
    headerBindings,
    historyItems: deps.historyItems,
    isCompactLayout: deps.isCompactLayout,
    isStartupLoading: deps.isStartupLoading,
    isStartupReady: deps.isStartupReady,
    locale: deps.locale,
    mobileExplorerOpen: deps.mobileExplorerOpen,
    openApiImportInput: deps.openApiImportInput,
    openTabs: deps.openTabs,
    requestPanelHandlers,
    responsePanelHandlers,
    runStartupBootstrap: deps.runStartupBootstrap,
    searchQuery: deps.searchQuery,
    setMobileExplorerOpen: deps.setMobileExplorerOpen,
    setRequestPanelCollapsed: deps.setRequestPanelCollapsed,
    setResponsePanelCollapsed: deps.setResponsePanelCollapsed,
    sidebarHandlers,
    sidebarProps,
    startupErrorMessage: deps.startupErrorMessage,
    text: deps.text,
    themeMode: deps.themeMode,
    toasts: deps.toasts,
    workbenchBusy: deps.workbenchBusy,
    workbenchLayout,
    workspaces: deps.workspaces,
    workspaceDialogProps,
    workspaceImportInput: deps.workspaceImportInput,
    requestPanelProps,
    responsePanelProps,
    handleRequestPanelResize: deps.handleRequestPanelResize,
    handleResponsePanelResize: deps.handleResponsePanelResize,
  }
}
