import type {
  AppLocale,
  EnvironmentPreset,
  HistoryItem,
  RequestCollection,
  RequestPreset,
  RequestTabState,
  ResponseState,
  ResolvedTheme,
  SendRequestPayload,
  ThemeMode,
  WorkbenchActivityProjection,
  WorkspaceSummary,
} from '@/types/request'

export type StartupState = 'loading' | 'failed' | 'ready'

export type DialogKind =
  | 'createWorkspace'
  | 'deleteWorkspace'
  | 'createCollection'
  | 'renameCollection'
  | 'deleteCollection'
  | 'exportWorkspace'
  | 'importWorkspace'
  | 'importCurl'
  | 'importOpenApi'
  | 'confirmCloseDirtyTab'
  | 'saveRequest'
  | 'createEnvironment'
  | 'renameEnvironment'
  | 'deleteEnvironment'

export interface DialogState {
  kind: DialogKind
  title: string
  description?: string
  confirmText: string
  secondaryActionText?: string
  variant?: 'default' | 'dirty-close'
  highlightLabel?: string
  contextBadges?: string[]
  destructive?: boolean
  nameLabel?: string
  namePlaceholder?: string
  nameValue?: string
  detailsLabel?: string
  detailsPlaceholder?: string
  detailsValue?: string
  detailsReadonly?: boolean
  tagsLabel?: string
  tagsPlaceholder?: string
  tagsValue?: string
  selectLabel?: string
  selectValue?: string
  selectOptions?: Array<{ label: string; value: string }>
  contextName?: string
}

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone?: 'info' | 'success' | 'error'
}

export interface HeaderBindings {
  locale: AppLocale
  themeMode: ThemeMode
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  workspaceBusy: boolean
  canDeleteWorkspace: boolean
  environments: EnvironmentPreset[]
  activeEnvironmentId: string
  isCompactLayout: boolean
}

export interface SidebarBindings {
  locale: AppLocale
  collections: RequestCollection[]
  historyItems: HistoryItem[]
  activeRequestId?: string
  activityProjection: WorkbenchActivityProjection
  searchQuery: string
  runtimeReady: boolean
}

export interface RequestPanelBindings {
  locale: AppLocale
  tabs: RequestTabState[]
  activityProjection: WorkbenchActivityProjection
  activeTabId: string
  activeEnvironmentName: string
  activeEnvironmentVariables: HeaderBindings['environments'][number]['variables']
  resolvedActiveUrl: string
  showOpenApiImport: boolean
  collapsed: boolean
}

export interface ResponsePanelBindings extends Partial<Pick<
  ResponseState,
  'responseBody' | 'status' | 'statusText' | 'time' | 'size' | 'headers' | 'testResults' | 'contentType' | 'requestMethod' | 'requestUrl' | 'state' | 'stale' | 'executionSource'
>> {
  locale: AppLocale
  configuredTestsCount: number
  theme: ResolvedTheme
  collapsed: boolean
}

export interface WorkbenchLayoutState {
  requestPanelCollapsed: boolean
  responsePanelCollapsed: boolean
  requestDesktopExpandedSize: number
  responseDesktopExpandedSize: number
  requestCompactExpandedSize: number
  responseCompactExpandedSize: number
}

export interface SidebarHandlers {
  onSelectRequest: (request: RequestPreset) => void
  onCreateRequest: () => void
  onCreateCollection: () => void
  onRenameCollection: (name: string) => void
  onDeleteCollection: (name: string) => void
  onDeleteRequest: (payload: { collectionName: string; requestId: string }) => Promise<void>
  onSelectHistory: (item: HistoryItem) => void
  onRemoveHistory: (id: string) => Promise<void>
  onClearHistory: () => Promise<void>
  onUpdateSearchQuery: (value: string) => void
}

export interface RequestPanelHandlers {
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onCreateTab: () => void
  onSaveTab: (id: string) => void
  onUpdateActiveTab: (payload: Partial<RequestTabState>) => void
  onUpdateEnvironmentVariables: (items: HeaderBindings['environments'][number]['variables']) => void
  onSend: (payload: SendRequestPayload) => Promise<void>
  onSaveRequest: () => void
  onImportWorkspace: () => void
  onImportOpenApi: () => void
  onImportCurl: () => void
  onExportWorkspace: () => Promise<void>
  onToggleCollapsed: () => void
}

export interface ResponsePanelHandlers {
  onToggleCollapsed: () => void
  onCreateMockTemplate: () => void
  onCopyCompleted: (payload: { contentType: string }) => void
  onCopyFailed: (payload: { contentType: string }) => void
  onDownloadCompleted: (payload: { fileName: string; path?: string }) => void
  onDownloadFailed: (payload: { fileName: string }) => void
}

export interface WorkspaceDialogBindings {
  open: boolean
  title: string
  description: string
  confirmText: string
  cancelText: string
  variant: 'default' | 'dirty-close'
  highlightLabel: string
  contextBadges: string[]
  destructive: boolean
  nameLabel: string
  namePlaceholder: string
  nameValue: string
  detailsLabel: string
  detailsPlaceholder: string
  detailsValue: string
  detailsReadonly: boolean
  tagsLabel: string
  tagsPlaceholder: string
  tagsValue: string
  selectLabel: string
  selectValue: string
  selectOptions: Array<{ label: string; value: string }>
  secondaryActionText: string
}
