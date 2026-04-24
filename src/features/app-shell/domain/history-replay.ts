import type { HistoryItem, ReplayLimitation, RequestCollection, RequestPreset, RequestTabState } from '@/types/request'
import {
  clonePreset,
  cloneResponse,
  createBlankRequestTab,
  createReplayExplainability,
  createRequestTabFromHistorySnapshot,
  createRequestTabFromPreset,
  createResponseStateFromHistoryItem,
} from '@/lib/request-workspace'

interface BuildHistoryReplayDraftInput {
  item: HistoryItem
  collections: RequestCollection[]
  recoveredDescription: string
  historyTag: string
}

const findRequestFromCollections = (
  collections: RequestCollection[],
  requestId?: string,
): RequestPreset | undefined => {
  if (!requestId) return undefined
  return collections.flatMap((collection) => collection.requests).find((request) => request.id === requestId)
}

export const buildHistoryReplayDraft = ({
  item,
  collections,
  recoveredDescription,
  historyTag,
}: BuildHistoryReplayDraftInput): RequestTabState => {
  const replayLimitations: ReplayLimitation[] = [...(item.explainability?.limitations ?? [])]
  const snapshot = item.requestSnapshot
  const requestFromCollection = findRequestFromCollections(collections, item.requestId)
  const fallbackPreset = requestFromCollection ? clonePreset(requestFromCollection) : undefined

  if (item.requestSnapshot?.auth?.bearerToken?.trim() === '[REDACTED]' || item.requestSnapshot?.auth?.password?.trim() === '[REDACTED]' || item.requestSnapshot?.auth?.apiKeyValue?.trim() === '[REDACTED]' || (item.requestSnapshot?.headers ?? []).some((header) => header.value.trim() === '[REDACTED]')) {
    replayLimitations.push({
      code: 'safe_projection_loss',
      label: 'Replay uses safe-projected values',
      detail: 'Sensitive values were redacted, so this replay cannot exactly reproduce the original execution.',
    })
  }
  const newTab = snapshot
    ? createRequestTabFromHistorySnapshot(snapshot, item.name, item.id)
    : fallbackPreset
      ? createRequestTabFromPreset(fallbackPreset)
      : createBlankRequestTab()

  if (!snapshot && fallbackPreset) {
    replayLimitations.push({
      code: 'recovered_from_saved_request',
      label: 'Replay recovered from saved request',
      detail: 'The original history snapshot is unavailable, so replay used the current saved request as the closest recovery source.',
    })
  }

  if (!snapshot && !fallbackPreset) {
    replayLimitations.push({
      code: 'missing_history_snapshot',
      label: 'Replay recovered without original request snapshot',
      detail: 'Neither the stored history snapshot nor a saved request resource was available, so replay starts from a blank draft.',
    })
  }

  const resolvedMethod = snapshot?.method || fallbackPreset?.method || item.method
  const resolvedUrl = snapshot?.url || fallbackPreset?.url || item.url

  newTab.name = snapshot?.name || fallbackPreset?.name || item.name
  newTab.description = snapshot?.description || fallbackPreset?.description || recoveredDescription
  newTab.tags = snapshot?.tags?.length
    ? [...snapshot.tags]
    : fallbackPreset?.tags?.length
      ? [...fallbackPreset.tags]
      : [historyTag]
  newTab.origin = {
    kind: 'replay',
    requestId: snapshot?.requestId ?? fallbackPreset?.id ?? item.requestId,
    historyItemId: item.id,
  }
  newTab.persistenceState = 'unsaved'
  newTab.isDirty = true
  newTab.method = resolvedMethod
  newTab.url = resolvedUrl
  newTab.response = cloneResponse(createResponseStateFromHistoryItem({
    ...item,
    explainability: createReplayExplainability({
      requestSnapshot: item.requestSnapshot,
      limitations: replayLimitations,
      extraSources: !snapshot && fallbackPreset
        ? [{ category: 'replay-recovered', label: 'saved request recovery', detail: 'Replay reconstructed from the current saved request resource.' }]
        : undefined,
    }),
  }, resolvedMethod, resolvedUrl))
  newTab.executionState = newTab.response.state ?? 'idle'

  return newTab
}
