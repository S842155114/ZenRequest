import type {
  RequestTabExecutionState,
  RequestTabOrigin,
  RequestTabOriginKind,
  RequestTabPersistenceState,
  RequestTabState,
} from '@/types/request'

export const cloneTabOrigin = (origin: RequestTabOrigin): RequestTabOrigin => ({
  kind: origin.kind,
  requestId: origin.requestId,
  historyItemId: origin.historyItemId,
})

export const resolveTabOriginKind = (tab: Partial<RequestTabState>): RequestTabOriginKind => {
  if (tab.origin?.kind) return tab.origin.kind
  if (tab.requestId) return 'resource'
  return 'scratch'
}

export const resolveTabOrigin = (tab: Partial<RequestTabState>): RequestTabOrigin => {
  const kind = resolveTabOriginKind(tab)
  return cloneTabOrigin({
    kind,
    requestId: tab.origin?.requestId ?? tab.requestId,
    historyItemId: tab.origin?.historyItemId,
  })
}

export const resolveTabPersistenceState = (
  tab: Partial<RequestTabState>,
  origin: RequestTabOrigin,
): RequestTabPersistenceState => {
  if (tab.persistenceState) return tab.persistenceState
  if (origin.kind === 'detached') return 'unbound'
  if (origin.kind === 'scratch' || origin.kind === 'replay') return 'unsaved'
  return tab.isDirty ? 'unsaved' : 'saved'
}

export const resolveTabExecutionState = (
  tab: Partial<RequestTabState>,
  resolveResponseStateFromStatus: (status: number) => RequestTabExecutionState,
): RequestTabExecutionState => (
  tab.executionState
  ?? tab.response?.state
  ?? resolveResponseStateFromStatus(tab.response?.status ?? 0)
)
