import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { AppLocale, KeyValueItem, RequestTabState, ResolvedTheme, ThemeMode, WorkspaceSnapshot } from '@/types/request'
import { getMessages } from '@/lib/i18n'
import { isResourceContextMenuSurface, shouldBypassResourceContextMenu } from '@/lib/resource-context-menu'
import { applyThemeToDocument, clearWorkspaceSnapshot } from '@/lib/request-workspace'
import { runtimeClient } from '@/lib/tauri-client'
import type { ToastItem } from '../types'
import type { AppShellStore } from '../state/app-shell-store'
import type { AppShellServices } from '../state/app-shell-services'

const WORKBENCH_COMPACT_BREAKPOINT = 1180
const STARTUP_LAUNCH_SCREEN_ID = 'startup-launch-screen'

type AppShellMessages = ReturnType<typeof getMessages>

interface AppShellEffectsDeps {
  text: ComputedRef<AppShellMessages>
  store: AppShellStore
  services: AppShellServices
  startupSnapshot: Ref<WorkspaceSnapshot | null>
  locale: Ref<AppLocale>
  themeMode: Ref<ThemeMode>
  activeWorkspaceId: Ref<string>
  activeEnvironmentId: Ref<string>
  activeTabId: Ref<string>
  openTabs: Ref<RequestTabState[]>
  systemPrefersDark: Ref<boolean>
  resolvedTheme: ComputedRef<ResolvedTheme>
  isCompactLayout: Ref<boolean>
  mobileExplorerOpen: Ref<boolean>
  requestPanelCollapsed: Ref<boolean>
  responsePanelCollapsed: Ref<boolean>
  requestDesktopExpandedSize: Ref<number>
  responseDesktopExpandedSize: Ref<number>
  requestCompactExpandedSize: Ref<number>
  responseCompactExpandedSize: Ref<number>
  showErrorToast: (toast: Pick<ToastItem, 'title' | 'description'>, description?: string) => void
}

export interface AppShellEffects {
  runStartupBootstrap: () => Promise<void>
  scheduleEnvironmentPersist: (environmentId: string, variables: KeyValueItem[]) => void
  handleRequestPanelResize: (size: number) => void
  handleResponsePanelResize: (size: number) => void
  handleToggleNavigation: () => void
  toggleRequestPanelCollapsed: () => void
  toggleResponsePanelCollapsed: () => void
  setMobileExplorerOpen: (value: boolean) => void
  setRequestPanelCollapsed: (value: boolean) => void
  setResponsePanelCollapsed: (value: boolean) => void
}

export const useAppShellEffects = (deps: AppShellEffectsDeps): AppShellEffects => {
  const removeStartupLaunchScreen = () => {
    if (typeof document === 'undefined') return
    document.getElementById(STARTUP_LAUNCH_SCREEN_ID)?.remove()
  }

  const completeStartupHandoff = async (nextState: 'loading' | 'failed' | 'ready', message = '') => {
    applyThemeToDocument(deps.resolvedTheme.value)
    deps.store.mutations.setStartupState(nextState, message)
    await nextTick()
    removeStartupLaunchScreen()
  }

  const runStartupBootstrap = async () => {
    deps.store.mutations.setStartupState('loading')

    try {
      const result = await deps.services.refreshRuntimeState(deps.startupSnapshot.value)
      if (!result.ok) {
        throw new Error(result.message ?? deps.text.value.toasts.bootstrapCommandFailed)
      }

      if (deps.startupSnapshot.value) {
        clearWorkspaceSnapshot()
        deps.startupSnapshot.value = null
      }

      await completeStartupHandoff('ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await completeStartupHandoff('failed', message)
      deps.showErrorToast(deps.text.value.toasts.bootstrapFailed, message)
    }
  }

  const normalizePanelSize = (size: number, minimum: number) => {
    if (!Number.isFinite(size)) return minimum
    return Math.max(minimum, Math.round(size * 100) / 100)
  }

  const handleRequestPanelResize = (size: number) => {
    if (deps.requestPanelCollapsed.value) return
    const nextSize = normalizePanelSize(size, deps.isCompactLayout.value ? 32 : 30)
    if (deps.isCompactLayout.value) {
      if (deps.requestCompactExpandedSize.value === nextSize) return
      deps.requestCompactExpandedSize.value = nextSize
      return
    }
    if (deps.requestDesktopExpandedSize.value === nextSize) return
    deps.requestDesktopExpandedSize.value = nextSize
  }

  const handleResponsePanelResize = (size: number) => {
    if (deps.responsePanelCollapsed.value) return
    const nextSize = normalizePanelSize(size, deps.isCompactLayout.value ? 14 : 10)
    if (deps.isCompactLayout.value) {
      if (deps.responseCompactExpandedSize.value === nextSize) return
      deps.responseCompactExpandedSize.value = nextSize
      return
    }
    if (deps.responseDesktopExpandedSize.value === nextSize) return
    deps.responseDesktopExpandedSize.value = nextSize
  }

  const toggleRequestPanelCollapsed = () => {
    const nextCollapsed = !deps.requestPanelCollapsed.value
    deps.requestPanelCollapsed.value = nextCollapsed
    if (nextCollapsed) {
      deps.responsePanelCollapsed.value = false
    }
  }

  const toggleResponsePanelCollapsed = () => {
    const nextCollapsed = !deps.responsePanelCollapsed.value
    deps.responsePanelCollapsed.value = nextCollapsed
    if (nextCollapsed) {
      deps.requestPanelCollapsed.value = false
    }
  }

  const setMobileExplorerOpen = (value: boolean) => {
    deps.mobileExplorerOpen.value = value
  }

  const setRequestPanelCollapsed = (value: boolean) => {
    deps.requestPanelCollapsed.value = value
  }

  const setResponsePanelCollapsed = (value: boolean) => {
    deps.responsePanelCollapsed.value = value
  }

  const applyViewportLayout = () => {
    if (typeof window === 'undefined') return

    const nextCompact = window.innerWidth < WORKBENCH_COMPACT_BREAKPOINT
    deps.isCompactLayout.value = nextCompact
    if (!nextCompact) {
      deps.mobileExplorerOpen.value = false
    }
  }

  const handleViewportResize = () => {
    applyViewportLayout()
  }

  const handleToggleNavigation = () => {
    if (!deps.isCompactLayout.value) return
    deps.mobileExplorerOpen.value = !deps.mobileExplorerOpen.value
  }

  watch(deps.resolvedTheme, (theme) => {
    applyThemeToDocument(theme)
  }, { immediate: true })

  watch([deps.locale, deps.themeMode], ([nextLocale, nextThemeMode]) => {
    void runtimeClient.updateSettings({
      locale: nextLocale,
      themeMode: nextThemeMode,
    })
  })

  let mediaQuery: MediaQueryList | null = null
  let workspacePersistTimer: number | null = null
  let environmentPersistTimer: number | null = null

  const scheduleEnvironmentPersist = (environmentId: string, variables: KeyValueItem[]) => {
    if (environmentPersistTimer !== null) {
      window.clearTimeout(environmentPersistTimer)
    }

    environmentPersistTimer = window.setTimeout(() => {
      void deps.services.persistEnvironmentVariables({ environmentId, variables })
      environmentPersistTimer = null
    }, 400)
  }

  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    deps.systemPrefersDark.value = event.matches
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
      deps.systemPrefersDark.value = mediaQuery.matches
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

  watch([deps.activeEnvironmentId, deps.openTabs, deps.activeTabId], () => {
    if (!deps.store.state.runtime.ready || !deps.activeWorkspaceId.value || deps.activeWorkspaceId.value === 'workspace-local') return
    if (workspacePersistTimer !== null) {
      window.clearTimeout(workspacePersistTimer)
    }
    workspacePersistTimer = window.setTimeout(() => {
      void runtimeClient.saveWorkspaceSession(deps.activeWorkspaceId.value, deps.store.selectors.buildWorkspaceSession())
      workspacePersistTimer = null
    }, 400)
  }, { deep: true })

  return {
    runStartupBootstrap,
    scheduleEnvironmentPersist,
    handleRequestPanelResize,
    handleResponsePanelResize,
    handleToggleNavigation,
    toggleRequestPanelCollapsed,
    toggleResponsePanelCollapsed,
    setMobileExplorerOpen,
    setRequestPanelCollapsed,
    setResponsePanelCollapsed,
  }
}
