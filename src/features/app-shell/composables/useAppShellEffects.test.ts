import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useAppShellEffects } from './useAppShellEffects'

const createEffects = () => {
  const requestPanelCollapsed = ref(false)
  const responsePanelCollapsed = ref(false)

  const effects = useAppShellEffects({
    text: computed(() => ({
      toasts: {
        bootstrapCommandFailed: 'bootstrap failed',
        bootstrapFailed: { title: 'bootstrap failed', description: 'bootstrap failed' },
      },
    }) as any),
    store: {
      mutations: { setStartupState: vi.fn() },
      state: { runtime: { ready: true } },
      selectors: { buildWorkspaceSession: vi.fn(() => ({})) },
    } as any,
    services: {
      refreshRuntimeState: vi.fn(async () => ({ ok: true })),
      persistEnvironmentVariables: vi.fn(async () => undefined),
    } as any,
    startupSnapshot: ref(null),
    locale: ref('en') as any,
    themeMode: ref('system') as any,
    activeWorkspaceId: ref('workspace-1') as any,
    activeEnvironmentId: ref('env-1') as any,
    activeTabId: ref('tab-1') as any,
    openTabs: ref([]) as any,
    systemPrefersDark: ref(false),
    resolvedTheme: computed(() => 'light' as const),
    isCompactLayout: ref(false),
    mobileExplorerOpen: ref(false),
    requestPanelCollapsed,
    responsePanelCollapsed,
    requestDesktopExpandedSize: ref(52),
    responseDesktopExpandedSize: ref(48),
    requestCompactExpandedSize: ref(54),
    responseCompactExpandedSize: ref(46),
    showErrorToast: vi.fn(),
  })

  return { effects, requestPanelCollapsed, responsePanelCollapsed }
}

describe('useAppShellEffects collapse sync', () => {
  it('expands response panel when request panel is collapsed via toggle', () => {
    const { effects, requestPanelCollapsed, responsePanelCollapsed } = createEffects()
    responsePanelCollapsed.value = true

    effects.toggleRequestPanelCollapsed()

    expect(requestPanelCollapsed.value).toBe(true)
    expect(responsePanelCollapsed.value).toBe(false)
  })

  it('expands request panel when response panel is collapsed via toggle', () => {
    const { effects, requestPanelCollapsed, responsePanelCollapsed } = createEffects()
    requestPanelCollapsed.value = true

    effects.toggleResponsePanelCollapsed()

    expect(responsePanelCollapsed.value).toBe(true)
    expect(requestPanelCollapsed.value).toBe(false)
  })
})
