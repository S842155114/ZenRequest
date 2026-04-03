import type {
  RequestTabExecutionState,
  RequestTabState,
  WorkbenchActivityProjection,
  WorkbenchActivitySignal,
} from '@/types/request'
import { resolveTabExecutionState, resolveTabOrigin } from './request-session'

const activityResultPriority: Record<RequestTabExecutionState, number> = {
  idle: 0,
  success: 1,
  'http-error': 2,
  'transport-error': 3,
  pending: 4,
}

const mergeActivitySignals = (
  current: WorkbenchActivitySignal,
  next: WorkbenchActivitySignal,
): WorkbenchActivitySignal => ({
  active: current.active || next.active,
  open: current.open || next.open,
  dirty: current.dirty || next.dirty,
  running: current.running || next.running,
  recovered: current.recovered || next.recovered,
  result: activityResultPriority[next.result] >= activityResultPriority[current.result]
    ? next.result
    : current.result,
})

const createTabActivitySignal = (
  tab: RequestTabState,
  activeTabId: string,
  resolveResponseStateFromStatus: (status: number) => RequestTabExecutionState,
): WorkbenchActivitySignal => {
  const origin = resolveTabOrigin(tab)
  const executionState = resolveTabExecutionState(tab, resolveResponseStateFromStatus)

  return {
    active: tab.id === activeTabId,
    open: true,
    dirty: tab.isDirty ?? tab.persistenceState !== 'saved',
    running: tab.isSending || executionState === 'pending',
    recovered: origin.kind === 'replay',
    result: executionState,
  }
}

export const createWorkbenchActivityProjection = (
  tabs: RequestTabState[],
  activeTabId: string,
  resolveResponseStateFromStatus: (status: number) => RequestTabExecutionState,
): WorkbenchActivityProjection => {
  const projection: WorkbenchActivityProjection = {
    requests: {},
    history: {},
    tabs: {},
    summary: {
      open: 0,
      dirty: 0,
      running: 0,
      recovered: 0,
    },
  }

  for (const tab of tabs) {
    const signal = createTabActivitySignal(tab, activeTabId, resolveResponseStateFromStatus)
    const origin = resolveTabOrigin(tab)
    projection.tabs[tab.id] = signal

    projection.summary.open += 1
    projection.summary.dirty += signal.dirty ? 1 : 0
    projection.summary.running += signal.running ? 1 : 0
    projection.summary.recovered += signal.recovered ? 1 : 0

    const requestKey = origin.requestId ?? tab.requestId
    if (requestKey) {
      projection.requests[requestKey] = requestKey in projection.requests
        ? mergeActivitySignals(projection.requests[requestKey], signal)
        : signal
    }

    if (origin.kind === 'replay' && origin.historyItemId) {
      projection.history[origin.historyItemId] = origin.historyItemId in projection.history
        ? mergeActivitySignals(projection.history[origin.historyItemId], signal)
        : signal
    }
  }

  return projection
}
