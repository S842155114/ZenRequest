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
import type { AppLocale, RequestTestResult, ResponseHeaderItem, ResolvedTheme } from '@/types/request'

defineOptions({
  name: 'ResponsePanel'
})

const props = withDefaults(defineProps<{
  locale: AppLocale
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
  collapsed?: boolean
}>(), {
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
  collapsed: false,
})

const emit = defineEmits<{
  (e: 'toggle-collapsed'): void
}>()

const activeTab = ref<'body' | 'headers' | 'cookies' | 'tests'>('body')
const bodyViewMode = ref<'source' | 'preview'>('source')

const cookieHeaders = computed(() => props.headers.filter((header) => header.key.toLowerCase() === 'set-cookie'))
const passedTestsCount = computed(() => props.testResults.filter((result) => result.passed).length)
const failedTestsCount = computed(() => props.testResults.length - passedTestsCount.value)
const text = computed(() => getMessages(props.locale))
const preparedResponseView = computed(() => prepareResponseCodeView(props.responseBody, props.contentType))
const canPreviewHtml = computed(() => preparedResponseView.value.canPreviewAsHtml)
const isHtmlPreviewMode = computed(() => canPreviewHtml.value && bodyViewMode.value === 'preview')

watch(canPreviewHtml, (value) => {
  if (!value) {
    bodyViewMode.value = 'source'
  }
})

const serializeTests = () => props.testResults
  .map((result) => `${result.passed ? text.value.response.testPass : text.value.response.testFail} ${result.name}: ${result.message}`)
  .join('\n')

const getActiveContent = () => {
  switch (activeTab.value) {
    case 'body':
      return isHtmlPreviewMode.value ? props.responseBody : preparedResponseView.value.content
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
  if (!navigator?.clipboard) return
  await navigator.clipboard.writeText(getActiveContent())
}

const downloadCurrentContent = () => {
  const content = getActiveContent()
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getDownloadName()
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="zr-panel zr-response-shell flex h-full min-h-0 flex-col overflow-hidden rounded-[0.7rem]">
    <div class="border-b border-[color:var(--zr-border)] bg-[var(--zr-response-accent)] p-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--zr-text-muted)]">
            <CheckCircle2 class="h-4 w-4 text-emerald-400" />
            {{ text.response.title }}
          </span>
          <Badge variant="outline" class="rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-emerald-300">
            {{ status }} {{ statusText }}
          </Badge>
        </div>
        <button
          class="zr-tool-button inline-flex h-7 w-7 items-center justify-center rounded-md"
          @click="emit('toggle-collapsed')"
        >
          <component :is="props.collapsed ? ChevronDown : ChevronUp" class="h-4 w-4" />
        </button>
      </div>
      <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span class="zr-chip inline-flex max-w-[320px] items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[var(--zr-text-secondary)]">
          <span class="font-semibold text-[#ffb295]">{{ requestMethod }}</span>
          <span class="truncate font-mono text-[var(--zr-text-primary)]">{{ requestUrl }}</span>
        </span>
        <span class="zr-chip inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[var(--zr-text-secondary)]">
          <Clock3 class="h-3.5 w-3.5 text-[#ff8b5f]" />
          <span class="font-mono text-[var(--zr-text-primary)]">{{ time }}</span>
        </span>
        <span class="zr-chip inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[var(--zr-text-secondary)]">
          <HardDrive class="h-3.5 w-3.5 text-[#ff8b5f]" />
          <span class="font-mono text-[var(--zr-text-primary)]">{{ size }}</span>
        </span>
      </div>
    </div>

    <template v-if="!props.collapsed">
      <div class="flex items-center gap-0.5 border-b border-[color:var(--zr-border-soft)] bg-[var(--zr-elevated)] px-2.5 py-1.5">
        <Button variant="ghost" size="sm" :class="['h-7 rounded-md px-2.5 text-[10px]', activeTab === 'body' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'body'">{{ text.response.body }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-md px-2.5 text-[10px]', activeTab === 'headers' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'headers'">{{ text.response.headers }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-md px-2.5 text-[10px]', activeTab === 'cookies' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'cookies'">{{ text.response.cookies }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-md px-2.5 text-[10px]', activeTab === 'tests' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="activeTab = 'tests'">{{ text.response.tests }}</Button>
        <div class="flex-1"></div>
        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md" @click="copyCurrentContent">
          <Copy class="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md" @click="downloadCurrentContent">
          <Download class="h-3 w-3" />
        </Button>
      </div>

      <template v-if="activeTab === 'body'">
        <div class="min-h-0 flex-1 p-2.5">
          <div class="zr-code-panel flex h-full min-h-0 flex-col rounded-lg p-2.5 pb-3 shadow-none">
            <div class="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="zr-chip rounded-full px-2 py-1">{{ contentType || 'text/plain' }}</span>
                <span v-if="!canPreviewHtml">{{ text.response.pretty }}</span>
              </div>
              <div
                v-if="canPreviewHtml"
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
            <ResponseCodeViewer
              v-if="!isHtmlPreviewMode"
              :content="preparedResponseView.content"
              :language="preparedResponseView.language"
              :theme="theme"
            />
            <ResponseHtmlPreview
              v-else
              :document="props.responseBody"
              :title="text.response.previewFrameTitle"
            />
          </div>
        </div>
      </template>
      <ScrollArea v-else class="min-h-0 flex-1 p-2.5">
        <div class="zr-code-panel rounded-lg p-2.5 pb-3 shadow-none">
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
                    <td class="px-3 py-2.5 font-mono text-xs text-[#ffb295]">{{ header.key }}</td>
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
                    <td class="px-3 py-2.5 font-mono text-xs text-[#ffb295]">{{ header.value.split('=')[0] || text.response.cookieFallback(index + 1) }}</td>
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
                class="rounded-lg border px-3 py-2.5"
                :class="result.passed ? 'border-emerald-500/20 bg-emerald-500/8' : 'border-rose-500/20 bg-rose-500/8'"
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

    <div v-else class="grid grid-cols-3 gap-1.5 px-3 py-3">
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
