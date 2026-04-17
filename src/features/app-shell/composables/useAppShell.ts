import { computed, reactive, ref, toRef } from 'vue'
import type { ResolvedTheme } from '@/types/request'
import { getMessages } from '@/lib/i18n'
import type { OpenApiImportAnalysis } from '@/lib/tauri-client'
import { runtimeClient } from '@/lib/tauri-client'
import { readWorkspaceSnapshotResult } from '@/lib/request-workspace'
import type { ToastItem } from '../types'
import { createAppShellDialogs } from '../state/app-shell-dialogs'
import { createAppShellServices } from '../state/app-shell-services'
import { createInitialAppShellState, createAppShellStore } from '../state/app-shell-store'
import { useAppShellEffects } from './useAppShellEffects'
import { createAppShellViewModel, type AppShellViewModel } from './useAppShellViewModel'

export const useAppShell = (): AppShellViewModel => {
  const snapshotResult = readWorkspaceSnapshotResult()
  const legacySnapshot = snapshotResult.ok ? snapshotResult.snapshot : null
  const state = reactive(createInitialAppShellState(legacySnapshot))
  const store = createAppShellStore(state)

  const locale = toRef(state.settings, 'locale')
  const themeMode = toRef(state.settings, 'themeMode')
  const workspaces = toRef(state.workspace, 'items')
  const activeWorkspaceId = toRef(state.workspace, 'activeId')
  const environments = toRef(state.environment, 'items')
  const activeEnvironmentId = toRef(state.environment, 'activeId')
  const collections = toRef(state.request, 'collections')
  const historyItems = toRef(state.request, 'historyItems')
  const openTabs = toRef(state.request, 'openTabs')
  const activeTabId = toRef(state.request, 'activeTabId')
  const runtimeReady = toRef(state.runtime, 'ready')
  const startupState = toRef(state.runtime, 'startupState')
  const startupErrorMessage = toRef(state.runtime, 'startupErrorMessage')
  const workbenchBusy = toRef(state.runtime, 'workbenchBusy')

  const systemPrefersDark = ref(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  )
  const workspaceImportInput = ref<HTMLInputElement | null>(null)
  const openApiImportInput = ref<HTMLInputElement | null>(null)
  const searchQuery = ref('')
  const toasts = ref<ToastItem[]>([])
  const startupSnapshot = ref(legacySnapshot ?? null)
  const requestPanelCollapsed = ref(false)
  const responsePanelCollapsed = ref(false)
  const isCompactLayout = ref(false)
  const mobileExplorerOpen = ref(false)
  const requestDesktopExpandedSize = ref(52)
  const responseDesktopExpandedSize = ref(48)
  const requestCompactExpandedSize = ref(54)
  const responseCompactExpandedSize = ref(46)

  const activeWorkspace = computed(() => store.selectors.getActiveWorkspace())
  const activeEnvironment = computed(() => store.selectors.getActiveEnvironment())
  const activeTab = computed(() => store.selectors.getActiveTab())
  const activeRequestResourceId = computed(() => store.selectors.getActiveRequestResourceId())
  const workbenchActivityProjection = computed(() => store.selectors.getWorkbenchActivityProjection())
  const text = computed(() => getMessages(locale.value))
  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }

    return themeMode.value
  })
  const resolvedActiveUrl = computed(() => store.selectors.getResolvedActiveUrl())
  const isStartupReady = computed(() => startupState.value === 'ready')
  const isStartupLoading = computed(() => startupState.value === 'loading')
  const canImportOpenApi = computed(() => store.selectors.canImportOpenApi())

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


  const showRecoveryNoticeToast = (message: string) => {
    showToast({
      title: 'Recovery notice',
      description: message,
      tone: 'info',
    })
  }


  const services = createAppShellServices({
    runtime: runtimeClient,
    store,
    onBootstrapRecoveryNotice: showRecoveryNoticeToast,
  })


  if (!snapshotResult.ok && snapshotResult.degraded) {
    state.runtime.startupState = 'degraded'
    state.runtime.startupErrorMessage = snapshotResult.message
    showRecoveryNoticeToast(snapshotResult.message)
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
      'Summary',
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

  const closeTabImmediately = (tabId: string) => {
    store.mutations.closeTabWithFallback(tabId)
  }

  const dialogs = createAppShellDialogs({
    text,
    store,
    services,
    workspaceImportInput,
    openApiImportInput,
    canImportOpenApi: () => canImportOpenApi.value,
    closeTabImmediately,
    triggerJsonDownload,
    showToast,
    showErrorToast,
    buildOpenApiDialogDetails,
  })

  const effects = useAppShellEffects({
    text,
    store,
    services,
    startupSnapshot,
    locale,
    themeMode,
    activeWorkspaceId,
    activeEnvironmentId,
    activeTabId,
    openTabs,
    systemPrefersDark,
    resolvedTheme,
    isCompactLayout,
    mobileExplorerOpen,
    requestPanelCollapsed,
    responsePanelCollapsed,
    requestDesktopExpandedSize,
    responseDesktopExpandedSize,
    requestCompactExpandedSize,
    responseCompactExpandedSize,
    showErrorToast,
  })

  return createAppShellViewModel({
    store,
    services,
    dialogs,
    text,
    locale,
    themeMode,
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    environments,
    activeEnvironment,
    activeEnvironmentId,
    collections,
    historyItems,
    openTabs,
    activeTab,
    runtimeReady,
    workbenchBusy,
    startupErrorMessage,
    isStartupReady,
    isStartupLoading,
    activeRequestResourceId,
    workbenchActivityProjection,
    resolvedTheme,
    resolvedActiveUrl,
    canImportOpenApi,
    searchQuery,
    toasts,
    isCompactLayout,
    mobileExplorerOpen,
    requestPanelCollapsed,
    responsePanelCollapsed,
    requestDesktopExpandedSize,
    responseDesktopExpandedSize,
    requestCompactExpandedSize,
    responseCompactExpandedSize,
    workspaceImportInput,
    openApiImportInput,
    closeTabImmediately,
    showToast,
    showErrorToast,
    dismissToast,
    scheduleEnvironmentPersist: effects.scheduleEnvironmentPersist,
    runStartupBootstrap: async () => {
      const result = await effects.runStartupBootstrap()
      return result
    },
    handleRequestPanelResize: effects.handleRequestPanelResize,
    handleResponsePanelResize: effects.handleResponsePanelResize,
    handleToggleNavigation: effects.handleToggleNavigation,
    setMobileExplorerOpen: effects.setMobileExplorerOpen,
    setRequestPanelCollapsed: effects.setRequestPanelCollapsed,
    setResponsePanelCollapsed: effects.setResponsePanelCollapsed,
    toggleRequestPanelCollapsed: effects.toggleRequestPanelCollapsed,
    toggleResponsePanelCollapsed: effects.toggleResponsePanelCollapsed,
  })
}
