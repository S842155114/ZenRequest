<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getMessages } from '@/lib/i18n'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ResponseCodeViewer from './ResponseCodeViewer.vue'
import ResponseHtmlPreview from './ResponseHtmlPreview.vue'
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, Copy, Download, HardDrive, XCircle } from 'lucide-vue-next'
import { prepareResponseCodeView } from '@/lib/response-code-viewer'
import { runtimeClient } from '@/lib/tauri-client'
import type {
  AppLocale,
  McpExecutionArtifact,
  RequestExecutionSource,
  RequestKind,
  RequestTestResult,
  ResponseHeaderItem,
  ResolvedTheme,
  ResponseLifecycleState,
} from '@/types/request'

defineOptions({
  name: 'ResponsePanel'
})

const props = withDefaults(defineProps<{
  locale: AppLocale
  requestKind?: RequestKind
  mcpArtifact?: McpExecutionArtifact
  responseBody?: string
  status?: number
  statusText?: string
  time?: string
  size?: string
  headers?: ResponseHeaderItem[]
  testResults?: RequestTestResult[]
  configuredTestsCount?: number
  contentType?: string
  requestMethod?: string
  requestUrl?: string
  theme?: ResolvedTheme
  state?: ResponseLifecycleState
  stale?: boolean
  executionSource?: RequestExecutionSource
  collapsed?: boolean
}>(), {
  requestKind: 'http',
  mcpArtifact: undefined,
  responseBody: `{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}`,
  status: 200,
  statusText: 'OK',
  time: '247 ms',
  size: '1.2 KB',
  headers: () => [],
  testResults: () => [],
  configuredTestsCount: 0,
  contentType: 'application/json',
  requestMethod: 'GET',
  requestUrl: 'https://jsonplaceholder.typicode.com/todos/1',
  theme: 'dark',
  state: 'success',
  stale: false,
  executionSource: 'live',
  collapsed: false,
})

const emit = defineEmits<{
  (e: 'toggle-collapsed'): void
  (e: 'create-mock-template'): void
  (e: 'copy-completed', payload: { contentType: string }): void
  (e: 'copy-failed', payload: { contentType: string }): void
  (e: 'download-completed', payload: { fileName: string; path?: string }): void
  (e: 'download-failed', payload: { fileName: string }): void
}>()

const activeTab = ref<'body' | 'headers' | 'cookies' | 'tests'>('body')
const bodyViewMode = ref<'source' | 'preview' | 'result' | 'protocol'>('source')
const responseCodeViewer = ref<InstanceType<typeof ResponseCodeViewer> | null>(null)
const responseHtmlPreview = ref<InstanceType<typeof ResponseHtmlPreview> | null>(null)
const nonBodyContent = ref<HTMLElement | null>(null)

const cookieHeaders = computed(() => props.headers.filter((header) => header.key.toLowerCase() === 'set-cookie'))
const passedTestsCount = computed(() => props.testResults.filter((result) => result.passed).length)
const failedTestsCount = computed(() => props.testResults.length - passedTestsCount.value)
const text = computed(() => getMessages(props.locale))
const preparedResponseView = computed(() => prepareResponseCodeView(props.responseBody, props.contentType))
const canPreviewHtml = computed(() => preparedResponseView.value.canPreviewAsHtml)
const mcpProtocolContent = computed(() => JSON.stringify({
  request: props.mcpArtifact?.protocolRequest ?? null,
  response: props.mcpArtifact?.protocolResponse ?? null,
}, null, 2))
const activeBodyContent = computed(() => (
  isMcpResponse.value && bodyViewMode.value === 'protocol'
    ? mcpProtocolContent.value
    : preparedResponseView.value.content
))
const activeBodyLanguage = computed(() => (
  isMcpResponse.value && bodyViewMode.value === 'protocol' ? 'json' : preparedResponseView.value.language
))
const isHtmlPreviewMode = computed(() => canPreviewHtml.value && bodyViewMode.value === 'preview')
const activeState = computed<ResponseLifecycleState>(() => props.state)
const showCreateMockAction = computed(() => (
  activeState.value !== 'idle'
  && activeState.value !== 'pending'
  && props.responseBody.trim().length > 0
))
const stateBadgeLabel = computed(() => {
  if (activeState.value === 'idle') return text.value.response.ready
  if (activeState.value === 'pending') return text.value.response.pending
  if (!props.status || props.status <= 0) return props.statusText
  return `${props.status} ${props.statusText}`.trim()
})
const stateMeta = computed(() => {
  switch (activeState.value) {
    case 'idle':
      return {
        icon: Clock3,
        iconClass: 'text-slate-600 dark:text-slate-400',
        badgeClass: 'zr-status-pill zr-status-pill-neutral',
      }
    case 'pending':
      return {
        icon: Clock3,
        iconClass: 'text-amber-600 dark:text-amber-300',
        badgeClass: 'zr-status-pill zr-status-pill-warn',
      }
    case 'http-error':
    case 'transport-error':
      return {
        icon: XCircle,
        iconClass: 'text-rose-600 dark:text-rose-300',
        badgeClass: 'zr-status-pill zr-status-pill-error',
      }
    default:
      return {
        icon: CheckCircle2,
        iconClass: 'text-emerald-600 dark:text-emerald-400',
        badgeClass: 'zr-status-pill zr-status-pill-success',
      }
  }
})
const showIdleState = computed(() => activeTab.value === 'body' && activeState.value === 'idle')
const showPendingState = computed(() => activeTab.value === 'body' && activeState.value === 'pending' && !props.stale)
const isMcpResponse = computed(() => props.requestKind === 'mcp')
const visibleResponseTabs = computed(() => (isMcpResponse.value ? ['body', 'headers'] : ['body', 'headers', 'cookies', 'tests']))
const responseRequestReadoutLabel = computed(() => (isMcpResponse.value ? `${mcpOperationLabel.value} · ${mcpTransportLabel.value}` : props.requestMethod))
const responseRequestReadoutToneClass = computed(() => (isMcpResponse.value ? 'text-sky-700 dark:text-sky-300' : 'text-orange-700 dark:text-orange-300'))
const mcpOperationLabel = computed(() => props.mcpArtifact?.operation ?? 'unknown')
const mcpTransportLabel = computed(() => props.mcpArtifact?.transport ?? 'unknown')
const mcpErrorCategoryLabel = computed(() => props.mcpArtifact?.errorCategory ?? 'none')
const hasMcpProtocolEnvelope = computed(() => Boolean(props.mcpArtifact?.protocolRequest || props.mcpArtifact?.protocolResponse))
const showMcpErrorNotice = computed(() => isMcpResponse.value && mcpErrorCategoryLabel.value !== 'none')
const mcpProtocolError = computed(() => {
  const error = props.mcpArtifact?.protocolResponse && typeof props.mcpArtifact.protocolResponse === 'object'
    ? (props.mcpArtifact.protocolResponse as Record<string, unknown>).error
    : undefined
  return error && typeof error === 'object' ? error as Record<string, unknown> : undefined
})
const mcpErrorNoticeTitle = computed(() => {
  switch (mcpErrorCategoryLabel.value) {
    case 'transport':
      return 'Transport error'
    case 'session':
      return 'Session error'
    case 'tool-call':
      return 'Tool call error'
    default:
      return 'MCP error'
  }
})
const mcpErrorCode = computed(() => {
  const code = mcpProtocolError.value?.code
  return typeof code === 'number' || typeof code === 'string' ? String(code) : ''
})
const mcpErrorMessage = computed(() => {
  const message = mcpProtocolError.value?.message
  return typeof message === 'string' ? message : ''
})
const mcpFailurePhaseLabel = computed(() => props.mcpArtifact?.failurePhase ?? '')
const mcpSessionStateLabel = computed(() => props.mcpArtifact?.sessionState ?? '')
const mcpStderrSummary = computed(() => props.mcpArtifact?.stderrSummary?.trim() ?? '')
const showMcpRuntimeDiagnostics = computed(() => (
  isMcpResponse.value
  && Boolean(mcpFailurePhaseLabel.value || mcpSessionStateLabel.value || mcpStderrSummary.value)
))

const isBodyTab = computed(() => activeTab.value === 'body')

const focusBodyContent = () => {
  if (isHtmlPreviewMode.value) {
    responseHtmlPreview.value?.focusContent()
    return
  }

  responseCodeViewer.value?.focusContent()
}

const focusActiveContent = () => {
  if (isBodyTab.value) {
    focusBodyContent()
    return
  }

  nonBodyContent.value?.focus()
}

const isSelectAllKey = (event: KeyboardEvent) => (
  (event.ctrlKey || event.metaKey)
  && !event.altKey
  && event.key.toLowerCase() === 'a'
)

const handleScopedSelectAll = (event: KeyboardEvent) => {
  if (!isSelectAllKey(event)) {
    return
  }

  event.preventDefault()

  if (isBodyTab.value && !isHtmlPreviewMode.value) {
    responseCodeViewer.value?.selectAllContent()
  }
}

const handleNonBodyKeydown = (event: KeyboardEvent) => {
  if (!isSelectAllKey(event)) {
    return
  }

  event.preventDefault()
}

const handleTabsKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' || event.shiftKey) {
    return
  }

  event.preventDefault()
  focusActiveContent()
}

watch(canPreviewHtml, (value) => {
  if (!value && bodyViewMode.value === 'preview') {
    bodyViewMode.value = isMcpResponse.value ? 'result' : 'source'
  }
})

watch(activeTab, () => {
  if (activeTab.value !== 'body') {
    bodyViewMode.value = isMcpResponse.value ? 'result' : 'source'
  }
})

watch(isMcpResponse, (value) => {
  bodyViewMode.value = value ? 'result' : 'source'
}, { immediate: true })

const serializeTests = () => props.testResults
  .map((result) => `${result.passed ? text.value.response.testPass : text.value.response.testFail} ${result.name}: ${result.message}`)
  .join('\n')

const getActiveContent = () => {
  switch (activeTab.value) {
    case 'body':
      return isHtmlPreviewMode.value ? props.responseBody : activeBodyContent.value
    case 'headers':
      return props.headers.map((header) => `${header.key}: ${header.value}`).join('\n')
    case 'cookies':
      return cookieHeaders.value.map((header) => header.value).join('\n')
    default:
      return serializeTests()
  }
}

const getDownloadName = () => {
  switch (activeTab.value) {
    case 'body':
      return text.value.response.bodyDownloadName
    case 'headers':
      return text.value.response.headersDownloadName
    case 'cookies':
      return text.value.response.cookiesDownloadName
    default:
      return text.value.response.testsDownloadName
  }
}

const copyCurrentContent = async () => {
  if (!navigator?.clipboard) {
    console.error('[response-panel] clipboard API unavailable')
    emit('copy-failed', {
      contentType: activeTab.value,
    })
    return
  }

  try {
    await navigator.clipboard.writeText(getActiveContent())
    emit('copy-completed', {
      contentType: activeTab.value,
    })
  } catch (error) {
    console.error('[response-panel] failed to copy content', error)
    emit('copy-failed', {
      contentType: activeTab.value,
    })
  }
}

const downloadCurrentContent = async () => {
  const fileName = getDownloadName()
  const content = getActiveContent()

  try {
    const targetPath = await runtimeClient.promptSavePath({
      defaultPath: fileName,
      filters: [
        {
          name: 'Text',
          extensions: ['txt', 'json', 'html', 'xml', 'log'],
        },
      ],
    })

    if (!targetPath) {
      return
    }

    const result = await runtimeClient.saveTextFile({
      fileName,
      contents: content,
      targetPath,
    })

    if (result.ok) {
      emit('download-completed', {
        fileName,
        path: result.data?.path,
      })
      return
    }

    console.error('[response-panel] failed to save response', result.error)
  } catch (error) {
    console.error('[response-panel] failed to select save path', error)
  }

  emit('download-failed', {
    fileName,
  })
}
</script>

<template>
  <section
    data-testid="response-panel-root"
    :data-response-state="activeState"
    class="zr-panel zr-response-shell zr-response-diagnostic flex h-full min-h-0 flex-col overflow-hidden rounded-[0.7rem]"
  >
    <div class="zr-response-header border-b border-[color:var(--zr-border)] bg-[var(--zr-response-accent)] px-3 py-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">
            <component :is="stateMeta.icon" :class="['h-4 w-4', stateMeta.iconClass]" />
            {{ text.response.title }}
          </span>
          <Badge
            data-testid="response-state-badge"
            variant="outline"
            :class="['rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]', stateMeta.badgeClass]"
          >
            {{ stateBadgeLabel }}
          </Badge>
          <Badge
            v-if="props.stale"
            data-testid="response-stale-badge"
            variant="outline"
            class="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-amber-700 dark:text-amber-200"
          >
            {{ text.response.stale }}
          </Badge>
          <Badge
            v-if="props.executionSource === 'mock'"
            data-testid="response-source-badge"
            variant="outline"
            class="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-sky-700 dark:text-sky-200"
          >
            {{ text.response.mockSource }}
          </Badge>
        </div>
        <button
          class="zr-tool-button inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--zr-text-muted)] transition-colors hover:text-[var(--zr-text-primary)]"
          @click="emit('toggle-collapsed')"
        >
          <component :is="props.collapsed ? ChevronDown : ChevronUp" class="h-4 w-4" />
        </button>
      </div>
      <div class="zr-response-meta-strip mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span
          data-testid="response-readout-request"
          class="zr-response-readout inline-flex max-w-[360px] items-center gap-1.5 rounded-full px-2 py-0.5"
        >
          <span :class="['font-semibold', responseRequestReadoutToneClass]">{{ responseRequestReadoutLabel }}</span>
          <span class="truncate font-mono text-[var(--zr-text-primary)]">{{ requestUrl }}</span>
        </span>
        <span
          data-testid="response-readout-time"
          class="zr-response-readout inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
        >
          <Clock3 class="h-3.5 w-3.5 text-[var(--zr-signal-strong)]" />
          <span class="font-mono text-[var(--zr-text-primary)]">{{ time }}</span>
        </span>
        <span
          data-testid="response-readout-size"
          class="zr-response-readout inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
        >
          <HardDrive class="h-3.5 w-3.5 text-[var(--zr-text-muted)]" />
          <span class="font-mono text-[var(--zr-text-primary)]">{{ size }}</span>
        </span>
      </div>
    </div>

    <div
      v-if="isMcpResponse"
      data-testid="response-mcp-summary"
      class="border-b border-[color:var(--zr-border-soft)] bg-[var(--zr-elevated)] px-3 py-1.5"
    >
      <div class="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">
        <span>mcp</span>
        <Badge data-testid="response-mcp-operation" variant="outline" class="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em]">
          {{ mcpOperationLabel }}
        </Badge>
        <Badge data-testid="response-mcp-transport" variant="outline" class="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em]">
          {{ mcpTransportLabel }}
        </Badge>
        <Badge data-testid="response-mcp-error-category" variant="outline" class="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em]">
          {{ mcpErrorCategoryLabel }}
        </Badge>
        <Badge
          v-if="hasMcpProtocolEnvelope"
          data-testid="response-mcp-protocol-badge"
          variant="outline"
          class="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em]"
        >
          protocol captured
        </Badge>
      </div>
    </div>

    <template v-if="!props.collapsed">
      <div
        data-testid="response-panel-tabs"
        class="zr-response-tab-strip flex items-center gap-1 border-b border-[color:var(--zr-border-soft)] bg-[var(--zr-elevated)] px-3 py-1.5"
        @keydown="handleTabsKeydown"
      >
        <Button v-if="visibleResponseTabs.includes('body')" variant="ghost" size="sm" :class="['h-8 rounded-lg px-3 text-[11px] font-medium', activeTab === 'body' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'body'">{{ isMcpResponse ? 'result' : text.response.body }}</Button>
        <Button v-if="visibleResponseTabs.includes('headers')" variant="ghost" size="sm" :class="['h-8 rounded-lg px-3 text-[11px] font-medium', activeTab === 'headers' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'headers'">{{ isMcpResponse ? 'transport headers' : text.response.headers }}</Button>
        <Button v-if="visibleResponseTabs.includes('cookies')" variant="ghost" size="sm" :class="['h-8 rounded-lg px-3 text-[11px] font-medium', activeTab === 'cookies' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'cookies'">{{ text.response.cookies }}</Button>
        <Button v-if="visibleResponseTabs.includes('tests')" variant="ghost" size="sm" :class="['h-8 rounded-lg px-3 text-[11px] font-medium', activeTab === 'tests' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'tests'">{{ text.response.tests }}</Button>
        <div class="flex-1"></div>
        <Button
          v-if="showCreateMockAction"
          data-testid="response-create-mock-template"
          variant="ghost"
          size="sm"
          class="zr-tool-button h-7 rounded-md px-2.5 text-[10px]"
          @click="emit('create-mock-template')"
        >
          {{ text.response.createMockTemplate }}
        </Button>
        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md" @click="copyCurrentContent">
          <Copy class="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md" @click="void downloadCurrentContent()">
          <Download class="h-3 w-3" />
        </Button>
      </div>

      <template v-if="activeTab === 'body'">
        <div class="min-h-0 flex-1 p-2.5">
          <div class="zr-code-panel zr-response-panel-surface flex h-full min-h-0 flex-col rounded-lg p-2.5 pb-3 shadow-none">
            <div class="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="zr-chip rounded-full px-2 py-1">{{ contentType || 'text/plain' }}</span>
                <span v-if="!canPreviewHtml">{{ text.response.pretty }}</span>
              </div>
              <div
                v-if="isMcpResponse"
                class="inline-flex items-center gap-1 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] p-1"
              >
                <Button
                  data-testid="response-body-mode-result"
                  variant="ghost"
                  size="sm"
                  :class="['h-7 rounded-full px-2.5 text-[10px]', bodyViewMode === 'result' ? 'zr-tab-button-active' : 'zr-tab-button']"
                  @click="bodyViewMode = 'result'"
                >
                  result
                </Button>
                <Button
                  data-testid="response-body-mode-protocol"
                  variant="ghost"
                  size="sm"
                  :class="['h-7 rounded-full px-2.5 text-[10px]', bodyViewMode === 'protocol' ? 'zr-tab-button-active' : 'zr-tab-button']"
                  @click="bodyViewMode = 'protocol'"
                >
                  protocol
                </Button>
              </div>
              <div
                v-else-if="canPreviewHtml"
                class="inline-flex items-center gap-1 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] p-1"
              >
                <Button
                  data-testid="response-body-mode-source"
                  variant="ghost"
                  size="sm"
                  :class="['h-7 rounded-full px-2.5 text-[10px]', !isHtmlPreviewMode ? 'zr-tab-button-active' : 'zr-tab-button']"
                  @click="bodyViewMode = 'source'"
                >
                  {{ text.response.source }}
                </Button>
                <Button
                  data-testid="response-body-mode-preview"
                  variant="ghost"
                  size="sm"
                  :class="['h-7 rounded-full px-2.5 text-[10px]', isHtmlPreviewMode ? 'zr-tab-button-active' : 'zr-tab-button']"
                  @click="bodyViewMode = 'preview'"
                >
                  {{ text.response.preview }}
                </Button>
              </div>
            </div>
            <div
              v-if="showIdleState"
              data-testid="response-idle-state"
              class="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center"
            >
              <div class="space-y-1.5">
                <div class="text-sm font-medium text-[var(--zr-text-primary)]">{{ text.response.idleTitle }}</div>
                <div class="text-xs leading-5 text-[var(--zr-text-muted)]">{{ text.response.idleDescription }}</div>
              </div>
            </div>
            <div
              v-else-if="showPendingState"
              data-testid="response-pending-state"
              class="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-amber-500/25 bg-amber-500/8 px-5 text-center"
            >
              <div class="space-y-1.5">
                <div class="text-sm font-medium text-[var(--zr-text-primary)]">{{ text.response.pendingTitle }}</div>
                <div class="text-xs leading-5 text-[var(--zr-text-muted)]">{{ text.response.pendingDescription }}</div>
              </div>
            </div>
            <div
              v-if="showMcpErrorNotice && !showIdleState && !showPendingState"
              data-testid="response-mcp-error-notice"
              class="mb-2 rounded-lg border border-rose-500/20 bg-rose-500/8 px-3 py-2"
            >
              <div class="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">{{ mcpErrorNoticeTitle }}</div>
              <div class="mt-1 text-xs text-[var(--zr-text-muted)]">Category: {{ mcpErrorCategoryLabel }}</div>
              <div v-if="mcpErrorCode" data-testid="response-mcp-error-code" class="mt-1 font-mono text-xs text-[var(--zr-text-primary)]">Code: {{ mcpErrorCode }}</div>
              <div v-if="mcpErrorMessage" data-testid="response-mcp-error-message" class="mt-1 text-xs text-[var(--zr-text-primary)]">{{ mcpErrorMessage }}</div>
            </div>
            <div
              v-if="showMcpRuntimeDiagnostics && !showIdleState && !showPendingState"
              data-testid="response-mcp-runtime-diagnostics"
              class="mb-2 rounded-lg border border-[color:var(--zr-border-soft)] bg-[var(--zr-soft-bg)] px-3 py-2"
            >
              <div class="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--zr-text-muted)]">
                <span>stdio diagnostics</span>
                <Badge v-if="mcpFailurePhaseLabel" data-testid="response-mcp-failure-phase" variant="outline" class="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em]">
                  phase: {{ mcpFailurePhaseLabel }}
                </Badge>
                <Badge v-if="mcpSessionStateLabel" data-testid="response-mcp-session-state" variant="outline" class="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em]">
                  state: {{ mcpSessionStateLabel }}
                </Badge>
              </div>
              <pre
                v-if="mcpStderrSummary"
                data-testid="response-mcp-stderr-summary"
                class="mt-2 whitespace-pre-wrap break-words rounded-md bg-[var(--zr-surface)] px-2.5 py-2 font-mono text-[11px] leading-5 text-[var(--zr-text-primary)]"
              >{{ mcpStderrSummary }}</pre>
            </div>
            <ResponseCodeViewer
              ref="responseCodeViewer"
              v-if="!showIdleState && !showPendingState && !isHtmlPreviewMode"
              :content="activeBodyContent"
              :language="activeBodyLanguage"
              :theme="theme"
            />
            <ResponseHtmlPreview
              ref="responseHtmlPreview"
              v-else-if="!showIdleState && !showPendingState"
              :document="props.responseBody"
              :title="text.response.previewFrameTitle"
              @scoped-select-all="handleScopedSelectAll"
            />
          </div>
        </div>
      </template>
      <ScrollArea v-else class="min-h-0 flex-1 p-2.5">
        <div
          ref="nonBodyContent"
          data-testid="response-non-body-content"
          tabindex="0"
          class="zr-code-panel zr-response-panel-surface rounded-lg p-2.5 pb-3 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--zr-focus-ring)]"
          @keydown="handleNonBodyKeydown"
        >
          <div class="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
            <span class="zr-chip rounded-full px-2 py-1">{{ contentType || 'text/plain' }}</span>
            <span>
              {{
                activeTab === 'headers'
                  ? text.response.metadata
                  : activeTab === 'cookies'
                    ? text.response.session
                    : text.response.validation
              }}
            </span>
          </div>
          <template v-if="activeTab === 'headers'">
            <div class="overflow-hidden rounded-lg border border-[color:var(--zr-border)]">
              <table class="w-full text-xs">
                <thead class="bg-[var(--zr-soft-bg)] text-left text-xs text-[var(--zr-text-muted)]">
                  <tr>
                    <th class="px-3 py-2.5 font-medium">{{ text.response.header }}</th>
                    <th class="px-3 py-2.5 font-medium">{{ text.response.value }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="header in headers" :key="header.key" class="border-t border-[color:var(--zr-border-soft)] align-top">
                    <td class="px-3 py-2.5 font-mono text-xs text-orange-700 dark:text-orange-300">{{ header.key }}</td>
                    <td class="px-3 py-2.5 font-mono text-xs text-[var(--zr-text-primary)]">{{ header.value }}</td>
                  </tr>
                  <tr v-if="headers.length === 0">
                    <td colspan="2" class="px-3 py-6 text-center text-xs text-[var(--zr-text-muted)]">{{ text.response.noHeaders }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template v-else-if="activeTab === 'cookies'">
            <div class="overflow-hidden rounded-lg border border-[color:var(--zr-border)]">
              <table class="w-full text-xs">
                <thead class="bg-[var(--zr-soft-bg)] text-left text-xs text-[var(--zr-text-muted)]">
                  <tr>
                    <th class="px-3 py-2.5 font-medium">{{ text.response.cookie }}</th>
                    <th class="px-3 py-2.5 font-medium">{{ text.response.rawValue }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(header, index) in cookieHeaders" :key="`${header.key}-${index}`" class="border-t border-[color:var(--zr-border-soft)] align-top">
                    <td class="px-3 py-2.5 font-mono text-xs text-orange-700 dark:text-orange-300">{{ header.value.split('=')[0] || text.response.cookieFallback(index + 1) }}</td>
                    <td class="px-3 py-2.5 font-mono text-xs break-all text-[var(--zr-text-primary)]">{{ header.value }}</td>
                  </tr>
                  <tr v-if="cookieHeaders.length === 0">
                    <td colspan="2" class="px-3 py-6 text-center text-xs text-[var(--zr-text-muted)]">{{ text.response.noCookies }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template v-else>
            <div v-if="configuredTestsCount === 0" class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center">
              <div class="space-y-1.5">
                <div class="text-sm font-medium text-[var(--zr-text-primary)]">{{ text.response.noTests }}</div>
                <div class="text-xs leading-5 text-[var(--zr-text-muted)]">
                  {{ text.response.noTestsDescription }}
                </div>
              </div>
            </div>
            <div v-else-if="testResults.length === 0" class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center">
              <div class="space-y-1.5">
                <div class="text-sm font-medium text-[var(--zr-text-primary)]">{{ text.response.testsPending }}</div>
                <div class="text-xs leading-5 text-[var(--zr-text-muted)]">
                  {{ text.response.testsPendingDescription }}
                </div>
              </div>
            </div>
            <div v-else class="space-y-2.5">
              <div class="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" class="rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-emerald-300">
                  {{ text.response.testsPassed(passedTestsCount) }}
                </Badge>
                <Badge variant="outline" class="rounded-full border border-rose-500/25 bg-rose-500/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-rose-200">
                  {{ text.response.testsFailed(failedTestsCount) }}
                </Badge>
              </div>
              <div
                v-for="result in testResults"
                :key="result.id"
                class="zr-response-test-card rounded-lg border px-3 py-2.5"
                :class="result.passed ? 'zr-response-test-card-pass' : 'zr-response-test-card-fail'"
              >
                <div class="flex items-start gap-2.5">
                  <component :is="result.passed ? CheckCircle2 : XCircle" :class="result.passed ? 'mt-0.5 h-4 w-4 text-emerald-400' : 'mt-0.5 h-4 w-4 text-rose-300'" />
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-[var(--zr-text-primary)]">{{ result.name }}</div>
                    <div class="mt-0.5 text-xs leading-5 text-[var(--zr-text-muted)]">{{ result.message }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </ScrollArea>
    </template>

    <div v-else class="zr-response-summary-grid grid grid-cols-3 gap-1.5 px-3 py-3">
      <div class="zr-summary-card px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.response.summaryStatus }}</div>
        <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ status }} {{ statusText }}</div>
      </div>
      <div class="zr-summary-card px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.response.summaryTime }}</div>
        <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ time }}</div>
      </div>
      <div class="zr-summary-card px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.response.summarySize }}</div>
        <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ size }}</div>
      </div>
    </div>
  </section>
</template>
