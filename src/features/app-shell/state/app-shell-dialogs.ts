import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { SCRATCH_PAD_NAME, getMessages } from '@/lib/i18n'
import { detectImportPackageMeta } from '@/lib/tauri-client'
import type {
  ExportPackageScope,
  ImportConflictStrategy,
  ImportPackageMeta,
  OpenApiImportAnalysis,
} from '@/lib/tauri-client'
import type { RequestPreset, RequestTabState } from '@/types/request'
import type { DialogState, ToastItem } from '../types'
import type { AppShellStore } from './app-shell-store'
import type { AppShellServices } from './app-shell-services'

interface AppShellDialogDeps {
  text: ComputedRef<ReturnType<typeof getMessages>>
  store: AppShellStore
  services: AppShellServices
  workspaceImportInput: Ref<HTMLInputElement | null>
  openApiImportInput: Ref<HTMLInputElement | null>
  canImportOpenApi: () => boolean
  closeTabImmediately: (tabId: string) => void
  triggerJsonDownload: (fileName: string, contents: string) => void
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  showErrorToast: (toast: Pick<ToastItem, 'title' | 'description'>, description?: string) => void
  buildOpenApiDialogDetails: (analysis: OpenApiImportAnalysis) => string
}

export interface AppShellDialogs {
  dialogState: Ref<DialogState | null>
  closeDialog: () => void
  openDialog: (state: DialogState) => void
  handleCreateCollection: () => void
  handleCreateWorkspace: () => void
  handleDeleteWorkspace: () => void
  handleRenameCollection: (name: string) => void
  handleDeleteCollection: (name: string) => void
  handleCreateEnvironment: () => void
  handleRenameEnvironment: () => void
  handleDeleteEnvironment: () => void
  handleSaveRequest: (tabId?: string) => void
  handleExportWorkspace: () => void
  handleImportWorkspaceClick: () => void
  handleImportOpenApiClick: () => void
  handleImportCurlClick: () => void
  handleWorkspaceImportChange: (event: Event) => Promise<void>
  handleOpenApiImportChange: (event: Event) => Promise<void>
  handleDialogSecondaryAction: () => void
  handleDialogSubmit: (payload: {
    nameValue: string
    detailsValue: string
    tagsValue: string
    selectValue: string
  }) => Promise<void>
}

export const createAppShellDialogs = (deps: AppShellDialogDeps): AppShellDialogs => {
  const dialogState = ref<DialogState | null>(null)
  const pendingCloseAfterSaveTabId = ref<string | null>(null)
  const pendingWorkspaceImport = ref<{ packageJson: string; fileName: string; meta: ImportPackageMeta } | null>(null)
  const pendingOpenApiImport = ref<{ fileName: string; analysis: OpenApiImportAnalysis } | null>(null)

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

  const parseTags = (value: string) => value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const handleCreateCollection = () => {
    openDialog({
      kind: 'createCollection',
      title: deps.text.value.dialogs.createCollection.title,
      description: deps.text.value.dialogs.createCollection.description,
      confirmText: deps.text.value.dialogs.createCollection.confirm,
      nameLabel: deps.text.value.dialogs.createCollection.nameLabel,
      namePlaceholder: deps.text.value.dialogs.createCollection.namePlaceholder,
      nameValue: deps.text.value.dialogs.createCollection.nameValue,
    })
  }

  const handleCreateWorkspace = () => {
    openDialog({
      kind: 'createWorkspace',
      title: deps.text.value.dialogs.createWorkspace.title,
      description: deps.text.value.dialogs.createWorkspace.description,
      confirmText: deps.text.value.dialogs.createWorkspace.confirm,
      nameLabel: deps.text.value.dialogs.createWorkspace.nameLabel,
      namePlaceholder: deps.text.value.dialogs.createWorkspace.namePlaceholder,
      nameValue: deps.text.value.dialogs.createWorkspace.nameValue,
    })
  }

  const handleDeleteWorkspace = () => {
    const current = deps.store.selectors.getActiveWorkspace()
    if (!current || !deps.store.selectors.canDeleteWorkspace()) return

    openDialog({
      kind: 'deleteWorkspace',
      title: deps.text.value.dialogs.deleteWorkspace.title,
      description: deps.text.value.dialogs.deleteWorkspace.description(current.name),
      confirmText: deps.text.value.dialogs.deleteWorkspace.confirm,
      destructive: true,
      contextName: current.id,
    })
  }

  const handleRenameCollection = (name: string) => {
    openDialog({
      kind: 'renameCollection',
      title: deps.text.value.dialogs.renameCollection.title,
      description: deps.text.value.dialogs.renameCollection.description,
      confirmText: deps.text.value.dialogs.renameCollection.confirm,
      nameLabel: deps.text.value.dialogs.renameCollection.nameLabel,
      nameValue: name,
      contextName: name,
    })
  }

  const handleDeleteCollection = (name: string) => {
    const target = deps.store.selectors.getCollectionByName(name)
    if (!target) return

    openDialog({
      kind: 'deleteCollection',
      title: deps.text.value.dialogs.deleteCollection.title,
      description: deps.text.value.dialogs.deleteCollection.description(name, target.requests.length),
      confirmText: deps.text.value.dialogs.deleteCollection.confirm,
      destructive: true,
      contextName: name,
    })
  }

  const handleCreateEnvironment = () => {
    openDialog({
      kind: 'createEnvironment',
      title: deps.text.value.dialogs.createEnvironment.title,
      description: deps.text.value.dialogs.createEnvironment.description,
      confirmText: deps.text.value.dialogs.createEnvironment.confirm,
      nameLabel: deps.text.value.dialogs.createEnvironment.nameLabel,
      nameValue: deps.text.value.dialogs.createEnvironment.nameValue,
      namePlaceholder: deps.text.value.dialogs.createEnvironment.namePlaceholder,
    })
  }

  const handleRenameEnvironment = () => {
    const current = deps.store.selectors.getActiveEnvironment()
    if (!current) return

    openDialog({
      kind: 'renameEnvironment',
      title: deps.text.value.dialogs.renameEnvironment.title,
      description: deps.text.value.dialogs.renameEnvironment.description,
      confirmText: deps.text.value.dialogs.renameEnvironment.confirm,
      nameLabel: deps.text.value.dialogs.renameEnvironment.nameLabel,
      nameValue: current.name,
      contextName: current.id,
    })
  }

  const handleDeleteEnvironment = () => {
    const current = deps.store.selectors.getActiveEnvironment()
    if (!current) return
    if (deps.store.state.environment.items.length === 1) {
      deps.showToast({ ...deps.text.value.toasts.cannotDeleteEnvironment, tone: 'error' })
      return
    }

    openDialog({
      kind: 'deleteEnvironment',
      title: deps.text.value.dialogs.deleteEnvironment.title,
      description: deps.text.value.dialogs.deleteEnvironment.description(current.name),
      confirmText: deps.text.value.dialogs.deleteEnvironment.confirm,
      destructive: true,
      contextName: current.id,
    })
  }

  const handleSaveRequest = (tabId?: string) => {
    const tab = tabId
      ? deps.store.selectors.getTabById(tabId) ?? deps.store.selectors.getActiveTab()
      : deps.store.selectors.getActiveTab()
    if (!tab) return

    openDialog({
      kind: 'saveRequest',
      title: deps.text.value.dialogs.saveRequest.title,
      description: deps.text.value.dialogs.saveRequest.description,
      confirmText: deps.text.value.dialogs.saveRequest.confirm,
      nameLabel: deps.text.value.dialogs.saveRequest.nameLabel,
      nameValue: tab.name,
      detailsLabel: deps.text.value.dialogs.saveRequest.descriptionLabel,
      detailsPlaceholder: deps.text.value.dialogs.saveRequest.descriptionPlaceholder,
      detailsValue: tab.description,
      tagsLabel: deps.text.value.dialogs.saveRequest.tagsLabel,
      tagsPlaceholder: deps.text.value.dialogs.saveRequest.tagsPlaceholder,
      tagsValue: tab.tags.join(', '),
      selectLabel: deps.text.value.dialogs.saveRequest.collectionLabel,
      selectValue: tab.collectionName || deps.store.state.request.collections[0]?.name || SCRATCH_PAD_NAME,
      selectOptions: deps.store.state.request.collections.map((collection) => ({
        label: collection.name,
        value: collection.name,
      })),
      contextName: tab.id,
    })
  }

  const handleExportWorkspace = () => {
    const activeWorkspace = deps.store.selectors.getActiveWorkspace()
    if (!activeWorkspace?.id) return

    openDialog({
      kind: 'exportWorkspace',
      title: deps.text.value.dialogs.exportWorkspace.title,
      description: deps.text.value.dialogs.exportWorkspace.description(activeWorkspace.name ?? deps.text.value.common.workspace),
      confirmText: deps.text.value.dialogs.exportWorkspace.confirm,
      selectLabel: deps.text.value.dialogs.exportWorkspace.scopeLabel,
      selectValue: 'workspace',
      selectOptions: [
        { label: deps.text.value.dialogs.exportWorkspace.scopeWorkspace, value: 'workspace' },
        { label: deps.text.value.dialogs.exportWorkspace.scopeApplication, value: 'application' },
      ],
    })
  }

  const handleImportWorkspaceClick = () => {
    deps.workspaceImportInput.value?.click()
  }

  const handleImportOpenApiClick = () => {
    if (!deps.store.state.workspace.activeId || !deps.canImportOpenApi()) return
    deps.openApiImportInput.value?.click()
  }

  const handleImportCurlClick = () => {
    if (!deps.store.state.workspace.activeId) return

    openDialog({
      kind: 'importCurl',
      title: deps.text.value.dialogs.importCurl.title,
      description: deps.text.value.dialogs.importCurl.description,
      confirmText: deps.text.value.dialogs.importCurl.confirm,
      detailsLabel: deps.text.value.dialogs.importCurl.commandLabel,
      detailsPlaceholder: deps.text.value.dialogs.importCurl.commandPlaceholder,
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
        title: deps.text.value.dialogs.importWorkspace.title,
        description: meta.scope === 'application'
          ? deps.text.value.dialogs.importWorkspace.applicationDescription(file.name, meta.workspaceCount)
          : deps.text.value.dialogs.importWorkspace.description(file.name),
        confirmText: deps.text.value.dialogs.importWorkspace.confirm,
        selectLabel: deps.text.value.dialogs.importWorkspace.strategyLabel,
        selectValue: 'rename',
        selectOptions: [
          { label: deps.text.value.dialogs.importWorkspace.strategyRename, value: 'rename' },
          { label: deps.text.value.dialogs.importWorkspace.strategySkip, value: 'skip' },
          { label: deps.text.value.dialogs.importWorkspace.strategyOverwrite, value: 'overwrite' },
        ],
      })
    } catch (error) {
      pendingWorkspaceImport.value = null
      deps.showErrorToast(
        deps.text.value.toasts.workspaceImportFailed,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const handleOpenApiImportChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file || !deps.store.state.workspace.activeId) return

    try {
      const document = await file.text()
      const result = await deps.services.analyzeOpenApiImport({ document })
      if (!result.ok || !result.data) {
        pendingOpenApiImport.value = null
        deps.showErrorToast(deps.text.value.toasts.openApiAnalyzeFailed, result.message)
        return
      }

      pendingOpenApiImport.value = {
        fileName: file.name,
        analysis: result.data,
      }

      openDialog({
        kind: 'importOpenApi',
        title: deps.text.value.dialogs.importOpenApi.title,
        description: deps.text.value.dialogs.importOpenApi.description(
          file.name,
          result.data.summary.importableRequestCount,
          result.data.summary.skippedOperationCount,
          result.data.summary.warningDiagnosticCount,
        ),
        confirmText: deps.text.value.dialogs.importOpenApi.confirm,
        detailsLabel: deps.text.value.dialogs.importOpenApi.summaryLabel,
        detailsValue: deps.buildOpenApiDialogDetails(result.data),
        detailsReadonly: true,
      })
    } catch (error) {
      pendingOpenApiImport.value = null
      deps.showErrorToast(
        deps.text.value.toasts.openApiAnalyzeFailed,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const handleDialogSecondaryAction = () => {
    const dialog = dialogState.value
    if (!dialog) return

    if (dialog.kind === 'confirmCloseDirtyTab' && dialog.contextName) {
      deps.closeTabImmediately(dialog.contextName)
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
    if (!dialog || !deps.store.state.workspace.activeId) return

    switch (dialog.kind) {
      case 'createWorkspace': {
        const name = payload.nameValue.trim()
        if (!name) break

        const result = await deps.services.createWorkspace({ name })
        if (!result.ok || !result.data) {
          deps.showErrorToast(deps.text.value.toasts.workspaceCreateFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.workspaceCreated(result.data.workspaceName), tone: 'success' })
        break
      }
      case 'deleteWorkspace': {
        const workspaceId = dialog.contextName
        if (!workspaceId || !deps.store.selectors.canDeleteWorkspace()) break

        const target = deps.store.state.workspace.items.find((workspace) => workspace.id === workspaceId)
        const result = await deps.services.deleteWorkspace({ workspaceId })
        if (!result.ok) {
          deps.showErrorToast(deps.text.value.toasts.workspaceDeleteFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.workspaceDeleted(target?.name ?? deps.text.value.common.workspace), tone: 'success' })
        break
      }
      case 'createCollection': {
        const name = payload.nameValue.trim()
        if (!name) break
        if (deps.store.state.request.collections.some((collection) => collection.name === name)) {
          deps.showToast({ ...deps.text.value.toasts.collectionAlreadyExists(name), tone: 'info' })
          closeDialog()
          return
        }

        const result = await deps.services.createCollection({ name })
        if (!result.ok) {
          deps.showErrorToast(deps.text.value.toasts.collectionCreateFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.collectionCreated(name), tone: 'success' })
        break
      }
      case 'renameCollection': {
        const current = deps.store.selectors.getCollectionByName(dialog.contextName ?? '')
        const nextName = payload.nameValue
        if (!current || !nextName || current.name === nextName) break

        const result = await deps.services.renameCollection({
          collectionId: current.id,
          name: nextName,
        })
        if (!result.ok || !result.data) {
          deps.showErrorToast(deps.text.value.toasts.collectionRenameFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.collectionRenamed(result.data.previousName, result.data.nextName), tone: 'success' })
        break
      }
      case 'deleteCollection': {
        const target = deps.store.selectors.getCollectionByName(dialog.contextName ?? '')
        if (!target) break

        const result = await deps.services.deleteCollection({ collectionId: target.id })
        if (!result.ok) {
          deps.showErrorToast(deps.text.value.toasts.collectionDeleteFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.collectionDeleted(target.name), tone: 'success' })
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
        const requestName = payload.nameValue
        const requestDescription = payload.detailsValue
        const requestTags = parseTags(payload.tagsValue)
        const targetCollectionName = payload.selectValue
        if (!targetTabId || !requestName || !targetCollectionName) break

        const result = await deps.services.saveRequest({
          tabId: targetTabId,
          requestName,
          requestDescription,
          requestTags,
          targetCollectionName,
        })
        if (!result.ok || !result.data) {
          const errorToast = result.code === 'collection.create_failed'
            ? deps.text.value.toasts.collectionCreateFailed
            : deps.text.value.toasts.requestSaveFailed
          deps.showErrorToast(errorToast, result.message)
          return
        }

        const shouldCloseAfterSave = pendingCloseAfterSaveTabId.value === targetTabId
        if (shouldCloseAfterSave) {
          pendingCloseAfterSaveTabId.value = null
          deps.closeTabImmediately(targetTabId)
        }

        deps.showToast({ ...deps.text.value.toasts.requestSaved(requestName, result.data.collection.name), tone: 'success' })
        break
      }
      case 'exportWorkspace': {
        const scope = (payload.selectValue || 'workspace') as ExportPackageScope
        const result = await deps.services.exportWorkspace({ scope })
        if (!result.ok || !result.data) {
          deps.showErrorToast(deps.text.value.toasts.workspaceExportFailed, result.message)
          return
        }

        deps.triggerJsonDownload(result.data.fileName, result.data.packageJson)
        deps.showToast(
          result.data.scope === 'application'
            ? { ...deps.text.value.toasts.applicationExported(result.data.fileName), tone: 'success' }
            : { ...deps.text.value.toasts.workspaceExported(result.data.fileName), tone: 'success' },
        )
        break
      }
      case 'importWorkspace': {
        if (!pendingWorkspaceImport.value) break

        const strategy = (payload.selectValue || 'rename') as ImportConflictStrategy
        const result = await deps.services.importWorkspace({
          packageJson: pendingWorkspaceImport.value.packageJson,
          strategy,
        })
        if (!result.ok || !result.data) {
          deps.showErrorToast(deps.text.value.toasts.workspaceImportFailed, result.message)
          return
        }

        pendingWorkspaceImport.value = null
        deps.showToast(
          result.data.scope === 'application'
            ? { ...deps.text.value.toasts.applicationImported(result.data.importedWorkspaceCount), tone: 'success' }
            : { ...deps.text.value.toasts.workspaceImported(result.data.workspaceName), tone: 'success' },
        )
        break
      }
      case 'importOpenApi': {
        if (!pendingOpenApiImport.value) break

        const result = await deps.services.applyOpenApiImport({
          analysis: pendingOpenApiImport.value.analysis,
        })
        if (!result.ok || !result.data) {
          deps.showErrorToast(deps.text.value.toasts.openApiImportFailed, result.message)
          return
        }

        pendingOpenApiImport.value = null
        deps.showToast({
          ...deps.text.value.toasts.openApiImported(
            result.data.importedRequestCount,
            result.data.skippedOperationCount,
            result.data.warningDiagnosticCount,
          ),
          tone: 'success',
        })
        break
      }
      case 'importCurl': {
        const command = payload.detailsValue.trim()
        if (!command) break

        const result = await deps.services.importCurl({ command })
        if (!result.ok || !result.data) {
          deps.showErrorToast(deps.text.value.toasts.curlImportFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.curlImported(result.data.name), tone: 'success' })
        break
      }
      case 'createEnvironment': {
        const name = payload.nameValue.trim()
        if (!name) break
        if (deps.store.state.environment.items.some((environment) => environment.name === name)) {
          deps.showToast({ ...deps.text.value.toasts.environmentAlreadyExists(name), tone: 'info' })
          closeDialog()
          return
        }

        const result = await deps.services.createEnvironment({ name })
        if (!result.ok) {
          deps.showErrorToast(deps.text.value.toasts.environmentCreateFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.environmentCreated(name), tone: 'success' })
        break
      }
      case 'renameEnvironment': {
        const environmentId = dialog.contextName
        const current = deps.store.state.environment.items.find((environment) => environment.id === environmentId)
        const nextName = payload.nameValue
        if (!environmentId || !current || !nextName) break

        const result = await deps.services.renameEnvironment({ environmentId, name: nextName })
        if (!result.ok || !result.data) {
          deps.showErrorToast(deps.text.value.toasts.environmentRenameFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.environmentRenamed(result.data.previousName, result.data.nextName), tone: 'success' })
        break
      }
      case 'deleteEnvironment': {
        const environmentId = dialog.contextName
        if (!environmentId) break

        const result = await deps.services.deleteEnvironment({ environmentId })
        if (!result.ok) {
          deps.showErrorToast(deps.text.value.toasts.environmentDeleteFailed, result.message)
          return
        }

        deps.showToast({ ...deps.text.value.toasts.environmentDeleted, tone: 'success' })
        break
      }
    }

    closeDialog()
  }

  return {
    dialogState,
    closeDialog,
    openDialog,
    handleCreateCollection,
    handleCreateWorkspace,
    handleDeleteWorkspace,
    handleRenameCollection,
    handleDeleteCollection,
    handleCreateEnvironment,
    handleRenameEnvironment,
    handleDeleteEnvironment,
    handleSaveRequest,
    handleExportWorkspace,
    handleImportWorkspaceClick,
    handleImportOpenApiClick,
    handleImportCurlClick,
    handleWorkspaceImportChange,
    handleOpenApiImportChange,
    handleDialogSecondaryAction,
    handleDialogSubmit,
  }
}
