<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getMessages, localizeScratchPadName } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { BusySurface } from '@/components/ui/busy-surface'
import RequestUrlBar from './RequestUrlBar.vue'
import RequestParams from './RequestParams.vue'
import { cloneAuth, cloneItems, cloneTests } from '@/lib/request-workspace'
import type {
  AppLocale,
  FormDataFieldSnapshot,
  KeyValueItem,
  RequestTabState,
  RequestTestDefinition,
  SendRequestPayload,
} from '@/types/request'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-vue-next'

defineOptions({
  name: 'RequestPanel'
})

const props = withDefaults(defineProps<{
  locale: AppLocale
  tabs: RequestTabState[]
  activeTabId: string
  activeEnvironmentName: string
  activeEnvironmentVariables: KeyValueItem[]
  resolvedActiveUrl: string
  collapsed?: boolean
}>(), {
  tabs: () => [],
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
  (e: 'update-active-tab', payload: Partial<RequestTabState>): void
  (e: 'update-environment-variables', items: KeyValueItem[]): void
  (e: 'send', payload: SendRequestPayload): void
  (e: 'save-request'): void
  (e: 'import-workspace'): void
  (e: 'export-workspace'): void
  (e: 'toggle-collapsed'): void
}>()

const activeTab = computed(() => props.tabs.find((tab) => tab.id === props.activeTabId) ?? props.tabs[0] ?? null)
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
</script>

<template>
  <section class="zr-panel zr-editor-shell flex h-full min-h-0 flex-col overflow-hidden rounded-[0.7rem]">
    <div class="border-b border-[color:var(--zr-border)] px-3 pt-3">
      <div class="mb-2.5 flex items-center justify-between gap-2.5">
        <div class="min-w-0">
          <div class="text-[11px] uppercase tracking-[0.22em] text-[var(--zr-text-muted)]">{{ text.request.workspaceTitle }}</div>
          <div class="mt-1 truncate text-base font-semibold text-[var(--zr-text-primary)]">
            {{ activeTab?.name ?? text.request.requestBuilder }}
          </div>
        </div>
        <button
          class="zr-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md"
          @click="emit('toggle-collapsed')"
        >
          <component :is="props.collapsed ? ChevronDown : ChevronUp" class="h-4 w-4" />
        </button>
      </div>

      <div v-if="!props.collapsed" data-testid="request-panel-tabs" class="flex items-center gap-1.5 overflow-x-auto pb-3">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            'group flex min-w-[188px] items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
            tab.id === activeTabId
              ? 'border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)]'
              : 'border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] hover:bg-[var(--zr-soft-hover)]'
          ]"
          @click="emit('select-tab', tab.id)"
        >
          <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb295]">{{ tab.method }}</span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-[var(--zr-text-primary)]">{{ tab.name }}</div>
            <div class="truncate text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ localizeScratchPadName(tab.collectionName, props.locale) }}</div>
          </div>
          <button
            class="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--zr-text-muted)] transition-colors hover:bg-[var(--zr-soft-hover)] hover:text-[var(--zr-text-primary)]"
            :disabled="tabs.length === 1"
            @click.stop="emit('close-tab', tab.id)"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-8 w-8 shrink-0 rounded-md" @click="emit('create-tab')">
          <Plus class="h-4 w-4" />
        </Button>
      </div>

      <div v-else class="grid grid-cols-3 gap-1.5 pb-3">
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryMethod }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab?.method ?? method }}</div>
        </div>
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryEnvironment }}</div>
          <div class="mt-1 truncate text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeEnvironmentName }}</div>
        </div>
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryTabs }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ tabs.length }}</div>
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
