import { describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref } from 'vue'
import { getMessages } from '@/lib/i18n'
import { createAppShellDialogs } from './app-shell-dialogs'
import type { AppShellServices } from './app-shell-services'
import { createAppShellStore, createInitialAppShellState } from './app-shell-store'

describe('app-shell dialogs', () => {
  it('keeps duplicate collection handling in the dialog layer without calling services', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'
    state.request.collections = [{
      id: 'collection-orders',
      name: 'Orders',
      expanded: true,
      requests: [],
    }]

    const store = createAppShellStore(state)
    const createCollection = vi.fn()
    const showToast = vi.fn()
    const showErrorToast = vi.fn()

    const dialogs = createAppShellDialogs({
      text: computed(() => getMessages('en')),
      store,
      services: {
        createCollection,
      } as unknown as AppShellServices,
      workspaceImportInput: ref(null),
      openApiImportInput: ref(null),
      canImportOpenApi: () => false,
      closeTabImmediately: vi.fn(),
      triggerJsonDownload: vi.fn(),
      showToast,
      showErrorToast,
      buildOpenApiDialogDetails: vi.fn(() => ''),
    })

    dialogs.handleCreateCollection()
    await dialogs.handleDialogSubmit({
      nameValue: 'Orders',
      detailsValue: '',
      tagsValue: '',
      selectValue: '',
    })

    expect(createCollection).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      tone: 'info',
      title: getMessages('en').toasts.collectionAlreadyExists('Orders').title,
    }))
    expect(showErrorToast).not.toHaveBeenCalled()
    expect(dialogs.dialogState.value).toBeNull()
  })


  it('shows an import error toast when workspace import file parsing fails', async () => {
    const state = reactive(createInitialAppShellState())
    state.workspace.items = [{ id: 'workspace-1', name: 'Primary Workspace' }]
    state.workspace.activeId = 'workspace-1'

    const store = createAppShellStore(state)
    const showToast = vi.fn()
    const showErrorToast = vi.fn()
    const importWorkspace = vi.fn()

    const dialogs = createAppShellDialogs({
      text: computed(() => getMessages('en')),
      store,
      services: {
        importWorkspace,
      } as unknown as AppShellServices,
      workspaceImportInput: ref(null),
      openApiImportInput: ref(null),
      canImportOpenApi: () => false,
      closeTabImmediately: vi.fn(),
      triggerJsonDownload: vi.fn(),
      showToast,
      showErrorToast,
      buildOpenApiDialogDetails: vi.fn(() => ''),
    })

    const file = new File(['{invalid'], 'broken.json', { type: 'application/json' })
    await dialogs.handleWorkspaceImportChange({
      target: {
        files: [file],
        value: 'broken.json',
      },
    } as unknown as Event)

    expect(importWorkspace).not.toHaveBeenCalled()
    expect(showErrorToast).toHaveBeenCalledTimes(1)
    expect(showErrorToast.mock.calls[0]?.[0]).toEqual(getMessages('en').toasts.workspaceImportFailed)
    expect(String(showErrorToast.mock.calls[0]?.[1] ?? '')).toContain('JSON')
    expect(showToast).not.toHaveBeenCalled()
    expect(dialogs.dialogState.value).toBeNull()
  })

})
