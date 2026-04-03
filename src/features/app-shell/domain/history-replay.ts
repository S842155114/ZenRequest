import type { HistoryItem, RequestCollection, RequestPreset, RequestTabState } from '@/types/request'
import {
  clonePreset,
  cloneResponse,
  createBlankRequestTab,
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
  const snapshot = item.requestSnapshot
  const requestFromCollection = findRequestFromCollections(collections, item.requestId)
  const fallbackPreset = requestFromCollection ? clonePreset(requestFromCollection) : undefined
  const newTab = snapshot
    ? createRequestTabFromHistorySnapshot(snapshot, item.name, item.id)
    : fallbackPreset
      ? createRequestTabFromPreset(fallbackPreset)
      : createBlankRequestTab()

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
  newTab.response = cloneResponse(createResponseStateFromHistoryItem(item, resolvedMethod, resolvedUrl))
  newTab.executionState = newTab.response.state ?? 'idle'

  return newTab
}
