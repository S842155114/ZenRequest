<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getMessages, localizeScratchPadName } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { BusySurface } from '@/components/ui/busy-surface'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import RequestUrlBar from './RequestUrlBar.vue'
import RequestParams from './RequestParams.vue'
import { cloneAuth, cloneItems, cloneTests, normalizeRequestTabState } from '@/lib/request-workspace'
import { getContextMenuTestIdKey, shouldBypassResourceContextMenu } from '@/lib/resource-context-menu'
import type {
  AppLocale,
  FormDataFieldSnapshot,
  KeyValueItem,
  RequestTabState,
  RequestTestDefinition,
  SendRequestPayload,
  WorkbenchActivityProjection,
} from '@/types/request'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-vue-next'

defineOptions({
  name: 'RequestPanel'
})

const props = withDefaults(defineProps<{
  locale: AppLocale
  tabs: RequestTabState[]
  activityProjection?: WorkbenchActivityProjection
  activeTabId: string
  activeEnvironmentName: string
  activeEnvironmentVariables: KeyValueItem[]
  resolvedActiveUrl: string
  collapsed?: boolean
}>(), {
  tabs: () => [],
  activityProjection: () => ({
    requests: {},
    history: {},
    tabs: {},
    summary: {
      open: 0,
      dirty: 0,
      running: 0,
      recovered: 0,
    },
  }),
  locale: 'en',
  activeTabId: '',
  activeEnvironmentName: '',
  activeEnvironmentVariables: () => [],
  resolvedActiveUrl: '',
  collapsed: false,
})

const emit = defineEmits<{
  (e: 'select-tab', id: string): void
  (e: 'close-tab', id: string): void
  (e: 'create-tab'): void
  (e: 'save-tab', id: string): void
  (e: 'update-active-tab', payload: Partial<RequestTabState>): void
  (e: 'update-environment-variables', items: KeyValueItem[]): void
  (e: 'send', payload: SendRequestPayload): void
  (e: 'save-request'): void
  (e: 'import-workspace'): void
  (e: 'export-workspace'): void
  (e: 'toggle-collapsed'): void
}>()

type RequestReadinessState = {
  blockers: string[]
  advisories: string[]
}

type CompactTabState = 'neutral' | 'dirty' | 'pending' | 'success' | 'error'

const normalizedTabs = computed(() => props.tabs.map((tab) => normalizeRequestTabState(tab)))
const activeTab = computed(() => normalizedTabs.value.find((tab) => tab.id === props.activeTabId) ?? normalizedTabs.value[0] ?? null)
const text = computed(() => getMessages(props.locale))
const requestPanelBusy = computed(() => activeTab.value?.isSending ?? false)

const method = ref('GET')
const url = ref('')
const params = ref<KeyValueItem[]>([])
const headers = ref<KeyValueItem[]>([])
const bodyContent = ref('')
const bodyType = ref<'json' | 'formdata' | 'raw' | 'binary'>('json')
const bodyContentType = ref('')
const formDataFields = ref<FormDataFieldSnapshot[]>([])
const binaryFileName = ref('')
const binaryMimeType = ref('')
const auth = ref(cloneAuth())
const tests = ref<RequestTestDefinition[]>([])
const environmentVariables = ref<KeyValueItem[]>([])

const cloneFormDataFields = (fields?: FormDataFieldSnapshot[]) => (fields ?? []).map((field) => ({ ...field }))

const applyTab = (tab: RequestTabState | null) => {
  if (!tab) return
  method.value = tab.method
  url.value = tab.url
  params.value = cloneItems(tab.params)
  headers.value = cloneItems(tab.headers)
  bodyContent.value = tab.body
  bodyType.value = tab.bodyType
  bodyContentType.value = tab.bodyContentType ?? ''
  formDataFields.value = cloneFormDataFields(tab.formDataFields)
  binaryFileName.value = tab.binaryFileName ?? ''
  binaryMimeType.value = tab.binaryMimeType ?? ''
  auth.value = cloneAuth(tab.auth)
  tests.value = cloneTests(tab.tests)
}

const applyEnvironmentVariables = (items: KeyValueItem[]) => {
  environmentVariables.value = cloneItems(items)
}

watch(() => props.activeTabId, () => {
  applyTab(activeTab.value)
}, { immediate: true })

watch(() => props.activeEnvironmentName, () => {
  applyEnvironmentVariables(props.activeEnvironmentVariables)
}, { immediate: true })

watch(
  [method, url, params, headers, bodyContent, bodyType, bodyContentType, formDataFields, binaryFileName, binaryMimeType, auth, tests],
  () => {
    if (!activeTab.value) return
    emit('update-active-tab', {
      method: method.value,
      url: url.value,
      params: cloneItems(params.value),
      headers: cloneItems(headers.value),
      body: bodyContent.value,
      bodyType: bodyType.value,
      bodyContentType: bodyContentType.value || undefined,
      formDataFields: cloneFormDataFields(formDataFields.value),
      binaryFileName: binaryFileName.value || undefined,
      binaryMimeType: binaryMimeType.value || undefined,
      auth: cloneAuth(auth.value),
      tests: cloneTests(tests.value),
    })
  },
  { deep: true }
)

watch(environmentVariables, (items) => {
  emit('update-environment-variables', cloneItems(items))
}, { deep: true })

const handleSend = () => {
  if (!activeTab.value) return
  if (requestReadiness.value.blockers.length > 0) return

  emit('send', {
    tabId: activeTab.value.id,
    requestId: activeTab.value.requestId,
    name: activeTab.value.name,
    description: activeTab.value.description,
    tags: [...activeTab.value.tags],
    collectionName: activeTab.value.collectionName,
    method: method.value,
    url: url.value,
    params: cloneItems(params.value),
    headers: cloneItems(headers.value),
    body: bodyContent.value,
    bodyType: bodyType.value,
    bodyContentType: bodyContentType.value || undefined,
    formDataFields: cloneFormDataFields(formDataFields.value),
    binaryFileName: binaryFileName.value || undefined,
    binaryMimeType: binaryMimeType.value || undefined,
    auth: cloneAuth(auth.value),
    tests: cloneTests(tests.value),
  })
}

const handleResourceContextMenuGuard = (event: MouseEvent) => {
  if (shouldBypassResourceContextMenu(event.target)) {
    event.stopPropagation()
  }
}

const getTabMethodClass = (value: string) => {
  switch (value) {
    case 'GET': return 'text-emerald-700 dark:text-emerald-300'
    case 'POST': return 'text-orange-700 dark:text-orange-300'
    case 'PUT': return 'text-sky-700 dark:text-sky-300'
    case 'DELETE': return 'text-rose-700 dark:text-rose-300'
    case 'PATCH': return 'text-cyan-700 dark:text-cyan-300'
    default: return 'text-[var(--zr-text-secondary)]'
  }
}

const getTabOriginKind = (tab: RequestTabState) => tab.origin?.kind ?? (tab.requestId ? 'resource' : 'scratch')

const getOriginLabel = (tab: RequestTabState) => {
  switch (getTabOriginKind(tab)) {
    case 'resource': return text.value.request.resource
    case 'replay': return text.value.request.recovered
    case 'detached': return text.value.request.detached
    default: return text.value.request.scratch
  }
}

const getPersistenceLabel = (tab: RequestTabState) => {
  switch (tab.persistenceState) {
    case 'saved': return text.value.request.saved
    case 'unbound': return text.value.request.unbound
    default: return text.value.request.draft
  }
}

const getExecutionStateLabel = (tab: RequestTabState) => {
  const state = props.activityProjection.tabs[tab.id]?.result ?? tab.executionState ?? 'idle'
  switch (state) {
    case 'pending': return text.value.request.running
    case 'success': return text.value.request.success
    case 'http-error': return text.value.request.failed
    case 'transport-error': return text.value.request.error
    default: return text.value.request.ready
  }
}

const getExecutionState = (tab: RequestTabState) => {
  const state = props.activityProjection.tabs[tab.id]?.result ?? tab.executionState ?? 'idle'
  return state
}

const getCompactTabState = (tab: RequestTabState): CompactTabState => {
  const state = getExecutionState(tab)

  if (tab.isSending || state === 'pending') return 'pending'
  if (state === 'http-error' || state === 'transport-error') return 'error'
  if (tab.isDirty || tab.persistenceState !== 'saved') return 'dirty'
  if (state === 'success') return 'success'
  return 'neutral'
}

const getCompactTabStateLabel = (tab: RequestTabState) => {
  switch (getCompactTabState(tab)) {
    case 'pending':
      return text.value.request.running
    case 'error':
      return text.value.request.failed
    case 'dirty':
      return getPersistenceLabel(tab)
    case 'success':
      return text.value.request.success
    default:
      return text.value.request.ready
  }
}

const getCompactTabTitle = (tab: RequestTabState) => [
  tab.method,
  tab.name,
  localizeScratchPadName(tab.collectionName, props.locale),
  getCompactTabStateLabel(tab),
].join(' · ')

const templateTokenPattern = /\{\{\s*([^}]+?)\s*\}\}/g

const collectTemplateKeys = (value?: string) => {
  const keys = new Set<string>()
  if (!value) return keys

  for (const match of value.matchAll(templateTokenPattern)) {
    const key = match[1]?.trim()
    if (key) {
      keys.add(key)
    }
  }

  return keys
}

const jsonBodyError = computed(() => {
  if (bodyType.value !== 'json' || !bodyContent.value.trim()) return ''

  try {
    JSON.parse(bodyContent.value)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
})

const requestReadiness = computed<RequestReadinessState>(() => {
  if (!activeTab.value) {
    return {
      blockers: [],
      advisories: [],
    }
  }

  const blockers: string[] = []
  const advisories: string[] = []
  const availableVariables = new Map(
    props.activeEnvironmentVariables
      .filter((item) => item.enabled && item.key.trim() && item.value.trim())
      .map((item) => [item.key.trim(), item.value.trim()]),
  )

  if (!url.value.trim()) {
    blockers.push(text.value.request.emptyUrlBlocker)
  }

  const unresolvedKeys = new Set<string>()
  const stringSources = [
    url.value,
    bodyType.value === 'json' || bodyType.value === 'raw' ? bodyContent.value : '',
    bodyContentType.value,
    binaryFileName.value,
    binaryMimeType.value,
    ...params.value.flatMap((item) => [item.key, item.value]),
    ...headers.value.flatMap((item) => [item.key, item.value]),
    auth.value.bearerToken,
    auth.value.username,
    auth.value.password,
    auth.value.apiKeyKey,
    auth.value.apiKeyValue,
    ...tests.value.flatMap((test) => [test.name, test.target ?? '', test.expected ?? '']),
  ]

  if (bodyType.value === 'formdata') {
    stringSources.push(
      ...formDataFields.value.flatMap((field) => [
        field.key,
        field.value,
        field.fileName ?? '',
        field.mimeType ?? '',
      ]),
    )
  }

  for (const source of stringSources) {
    for (const key of collectTemplateKeys(source)) {
      if (!availableVariables.has(key)) {
        unresolvedKeys.add(key)
      }
    }
  }

  if (unresolvedKeys.size > 0) {
    blockers.push(text.value.request.missingVariablesBlocker([...unresolvedKeys].join(', ')))
  }

  if (bodyType.value === 'json' && jsonBodyError.value) {
    blockers.push(text.value.request.invalidJsonBlocker)
  }

  if (bodyType.value === 'binary' && !bodyContent.value.trim()) {
    blockers.push(text.value.request.missingBinaryPayloadBlocker)
  }

  if (activeTab.value.isDirty || activeTab.value.persistenceState !== 'saved') {
    advisories.push(text.value.request.unsavedChangesAdvisory)
  }

  return {
    blockers,
    advisories,
  }
})
</script>

<template>
  <section
    data-testid="request-panel-root"
    class="zr-panel zr-editor-shell zr-request-shell flex h-full min-h-0 flex-col overflow-hidden rounded-[0.7rem]"
  >
    <div data-testid="request-panel-header" class="zr-request-shell-header border-b border-[color:var(--zr-border)] px-3 pt-3">
      <div class="mb-2.5 flex items-center justify-between gap-2.5">
        <div class="min-w-0">
          <div class="text-[11px] uppercase tracking-[0.22em] text-[var(--zr-text-muted)]">{{ text.request.workspaceTitle }}</div>
        </div>
        <button
          class="zr-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md"
          @click="emit('toggle-collapsed')"
        >
          <component :is="props.collapsed ? ChevronDown : ChevronUp" class="h-4 w-4" />
        </button>
      </div>

      <div
        v-if="!props.collapsed"
        data-testid="request-panel-tabs"
        class="zr-request-tab-strip flex items-center gap-1 overflow-x-auto pb-2.5"
      >
        <ContextMenu
          v-for="tab in normalizedTabs"
          :key="tab.id"
        >
          <ContextMenuTrigger as-child>
            <div
              :data-testid="`request-tab-${getContextMenuTestIdKey(tab.id)}`"
              data-resource-context-menu-surface="true"
              :title="getCompactTabTitle(tab)"
              :class="[
                'zr-request-tab group flex min-w-[156px] shrink-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                tab.id === activeTabId ? 'zr-request-tab-active' : 'zr-request-tab-idle',
              ]"
              @click="emit('select-tab', tab.id)"
              @contextmenu.capture="handleResourceContextMenuGuard"
            >
              <span :class="['shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em]', getTabMethodClass(tab.method)]">{{ tab.method }}</span>
              <div class="min-w-0 flex-1 truncate text-[13px] font-medium leading-5 text-[var(--zr-text-primary)]">{{ tab.name }}</div>
              <span
                :data-testid="`request-tab-status-${getContextMenuTestIdKey(tab.id)}`"
                :data-state="getCompactTabState(tab)"
                :aria-label="getCompactTabStateLabel(tab)"
                class="zr-request-tab-status shrink-0"
              />
              <button
                class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--zr-text-muted)] transition-colors hover:bg-[var(--zr-soft-hover)] hover:text-[var(--zr-text-primary)]"
                :disabled="normalizedTabs.length === 1"
                @click.stop="emit('close-tab', tab.id)"
              >
                <X class="h-3 w-3" />
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent data-testid="request-tab-context-menu" class="zr-dropdown min-w-[180px]">
            <ContextMenuItem
              :data-testid="`request-tab-context-save-${getContextMenuTestIdKey(tab.id)}`"
              @select="emit('save-tab', tab.id)"
            >
              {{ text.common.save }}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              :data-testid="`request-tab-context-close-${getContextMenuTestIdKey(tab.id)}`"
              :disabled="normalizedTabs.length === 1"
              @select="emit('close-tab', tab.id)"
            >
              {{ text.common.close }}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 shrink-0 rounded-md" @click="emit('create-tab')">
          <Plus class="h-3.5 w-3.5" />
        </Button>
      </div>

      <div v-else class="zr-request-summary-grid grid grid-cols-3 gap-1.5 pb-3">
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryMethod }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab?.method ?? method }}</div>
        </div>
        <div data-testid="request-summary-origin" class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryOrigin }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab ? getOriginLabel(activeTab) : text.request.scratch }}</div>
        </div>
        <div data-testid="request-summary-persistence" class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryPersistence }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab ? getPersistenceLabel(activeTab) : text.request.draft }}</div>
        </div>
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryEnvironment }}</div>
          <div class="mt-1 truncate text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeEnvironmentName }}</div>
        </div>
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryTabs }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ normalizedTabs.length }}</div>
        </div>
        <div data-testid="request-summary-result" class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryResult }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab ? getExecutionStateLabel(activeTab) : text.request.ready }}</div>
        </div>
      </div>
    </div>

    <template v-if="activeTab && !props.collapsed">
      <BusySurface
        :busy="requestPanelBusy"
        :title="text.busy.requestSendingTitle"
        :description="text.busy.requestSendingDescription"
        surface-test-id="request-panel-busy-surface"
        overlay-test-id="request-panel-busy-overlay"
        class="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <RequestUrlBar
            :locale="locale"
            :method="method"
            :url="url"
            :is-loading="activeTab.isSending"
            :request-name="activeTab.name"
            :origin-kind="activeTab.origin?.kind"
            :persistence-state="activeTab.persistenceState"
            :execution-state="props.activityProjection.tabs[activeTab.id]?.result ?? activeTab.executionState"
            :readiness="requestReadiness"
            :collection-name="activeTab.collectionName"
            :environment-name="activeEnvironmentName"
            :resolved-url="resolvedActiveUrl"
            @update:method="method = $event"
            @update:url="url = $event"
            @send="handleSend"
            @save="emit('save-request')"
            @import-workspace="emit('import-workspace')"
            @export-workspace="emit('export-workspace')"
          />

          <RequestParams
            :locale="locale"
            v-model:params="params"
            v-model:headers="headers"
            v-model:body="bodyContent"
            v-model:body-type="bodyType"
            v-model:body-content-type="bodyContentType"
            v-model:form-data-fields="formDataFields"
            v-model:binary-file-name="binaryFileName"
            v-model:binary-mime-type="binaryMimeType"
            v-model:auth="auth"
            v-model:tests="tests"
            v-model:environment-variables="environmentVariables"
            :environment-name="activeEnvironmentName"
          />
        </div>
      </BusySurface>
    </template>
  </section>
</template>
