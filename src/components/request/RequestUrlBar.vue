<script setup lang="ts">
import { computed } from 'vue'
import { getMessages, localizeScratchPadName } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type {
  AppLocale,
  RequestTabExecutionState,
  RequestTabOriginKind,
  RequestTabPersistenceState,
} from '@/types/request'
import { Download, Ellipsis, Globe, Save, Upload } from 'lucide-vue-next'

defineOptions({
  name: 'RequestUrlBar'
})

const props = withDefaults(defineProps<{
  locale: AppLocale
  method: string
  url: string
  isLoading: boolean
  requestName?: string
  originKind?: RequestTabOriginKind
  persistenceState?: RequestTabPersistenceState
  executionState?: RequestTabExecutionState
  readiness?: {
    blockers: string[]
    advisories: string[]
  }
  collectionName: string
  environmentName: string
  resolvedUrl: string
}>(), {
  requestName: '',
  originKind: 'scratch',
  persistenceState: 'unsaved',
  executionState: 'idle',
  readiness: () => ({
    blockers: [],
    advisories: [],
  }),
})

const emit = defineEmits<{
  (e: 'update:method', value: string): void
  (e: 'update:url', value: string): void
  (e: 'send'): void
  (e: 'save'): void
  (e: 'import-workspace'): void
  (e: 'export-workspace'): void
}>()

const methodColors: Record<string, string> = {
  GET: 'text-emerald-700 dark:text-emerald-300',
  POST: 'text-orange-700 dark:text-orange-300',
  PUT: 'text-sky-700 dark:text-sky-300',
  DELETE: 'text-rose-700 dark:text-rose-300',
  PATCH: 'text-cyan-700 dark:text-cyan-300'
}

const handleMethodChange = (value: any) => {
  if (value) {
    emit('update:method', String(value))
  }
}

const handleUrlChange = (value: string | number) => {
  emit('update:url', String(value))
}

const text = computed(() => getMessages(props.locale))
const displayCollectionName = computed(() => localizeScratchPadName(props.collectionName, props.locale))
const hasBlockingIssues = computed(() => props.readiness.blockers.length > 0)
const displayRequestName = computed(() => props.requestName.trim() || text.value.request.requestBuilder)

const originLabel = computed(() => {
  switch (props.originKind) {
    case 'resource': return text.value.request.resource
    case 'replay': return text.value.request.recovered
    case 'detached': return text.value.request.detached
    default: return text.value.request.scratch
  }
})

const persistenceLabel = computed(() => {
  switch (props.persistenceState) {
    case 'saved': return text.value.request.saved
    case 'unbound': return text.value.request.unbound
    default: return text.value.request.draft
  }
})

const executionLabel = computed(() => {
  switch (props.executionState) {
    case 'pending': return text.value.request.running
    case 'success': return text.value.request.success
    case 'http-error': return text.value.request.failed
    case 'transport-error': return text.value.request.error
    default: return text.value.request.ready
  }
})

const originBadgeClass = computed(() => {
  switch (props.originKind) {
    case 'resource': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'replay': return 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300'
    case 'detached': return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    default: return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }
})

const persistenceBadgeClass = computed(() => (
  props.persistenceState === 'saved'
    ? 'border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] text-[var(--zr-text-secondary)]'
    : props.persistenceState === 'unbound'
      ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
      : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
))

const executionBadgeClass = computed(() => {
  switch (props.executionState) {
    case 'pending': return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300'
    case 'success': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'http-error':
    case 'transport-error':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    default:
      return 'border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] text-[var(--zr-text-secondary)]'
  }
})
</script>

<template>
  <div
    data-testid="request-url-shell"
    class="zr-request-command-bar border-b border-[color:var(--zr-border)] bg-[var(--zr-editor-accent)]"
  >
    <div class="zr-request-command-header flex items-start justify-between gap-2.5 px-3 pt-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--zr-text-muted)]">
          <Globe class="h-3 w-3 text-[#ff8b5f]" />
          {{ text.request.requestBuilder }}
        </div>
        <div class="mt-1 truncate text-sm font-semibold text-[var(--zr-text-primary)]">
          {{ displayRequestName }}
        </div>
        <div data-testid="request-command-identity" class="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            data-testid="request-identity-origin"
            :class="[
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
              originBadgeClass,
            ]"
          >
            {{ originLabel }}
          </span>
          <span
            data-testid="request-identity-persistence"
            :class="[
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
              persistenceBadgeClass,
            ]"
          >
            {{ persistenceLabel }}
          </span>
          <span
            data-testid="request-identity-execution"
            :class="[
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
              executionBadgeClass,
            ]"
          >
            {{ executionLabel }}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon-sm"
            data-testid="request-command-overflow-trigger"
            class="zr-secondary-action h-8 w-8 shrink-0 rounded-md"
            :aria-label="text.request.requestActions"
          >
            <Ellipsis class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="zr-dropdown min-w-[180px]">
          <DropdownMenuItem
            data-testid="request-command-overflow-import"
            @select="emit('import-workspace')"
          >
            <Upload class="mr-2 h-3.5 w-3.5" />
            {{ text.common.importJson }}
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid="request-command-overflow-export"
            @select="emit('export-workspace')"
          >
            <Download class="mr-2 h-3.5 w-3.5" />
            {{ text.common.exportJson }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div
      v-if="props.readiness.blockers.length || props.readiness.advisories.length"
      class="px-3 pt-2.5"
    >
      <div
        v-if="props.readiness.blockers.length"
        data-testid="request-readiness-blockers"
        class="flex flex-wrap items-center gap-1.5"
      >
        <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
          {{ text.request.blockers }}
        </span>
        <span
          v-for="blocker in props.readiness.blockers"
          :key="blocker"
          class="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300"
        >
          {{ blocker }}
        </span>
      </div>
      <div
        v-if="props.readiness.advisories.length"
        data-testid="request-readiness-advisories"
        class="mt-1.5 flex flex-wrap items-center gap-1.5"
      >
        <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
          {{ text.request.advisories }}
        </span>
        <span
          v-for="advisory in props.readiness.advisories"
          :key="advisory"
          class="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
        >
          {{ advisory }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-2 p-3 pt-2.5 xl:flex-row">
      <Select :model-value="method" @update:model-value="handleMethodChange">
        <SelectTrigger
          :class="[
            'zr-input h-9 w-full rounded-md font-semibold shadow-none transition-colors xl:w-[110px]',
            methodColors[method] || 'text-green-600'
          ]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent class="zr-dropdown">
          <SelectItem value="GET" class="font-semibold text-emerald-700 focus:text-emerald-800 dark:text-emerald-300 dark:focus:text-emerald-200">GET</SelectItem>
          <SelectItem value="POST" class="font-semibold text-orange-700 focus:text-orange-800 dark:text-orange-300 dark:focus:text-orange-200">POST</SelectItem>
          <SelectItem value="PUT" class="font-semibold text-sky-700 focus:text-sky-800 dark:text-sky-300 dark:focus:text-sky-200">PUT</SelectItem>
          <SelectItem value="DELETE" class="font-semibold text-rose-700 focus:text-rose-800 dark:text-rose-300 dark:focus:text-rose-200">DELETE</SelectItem>
          <SelectItem value="PATCH" class="font-semibold text-cyan-700 focus:text-cyan-800 dark:text-cyan-300 dark:focus:text-cyan-200">PATCH</SelectItem>
        </SelectContent>
      </Select>

      <div class="relative flex-1">
        <Input
          :model-value="url"
          @update:model-value="handleUrlChange"
          :placeholder="text.request.urlPlaceholder"
          data-native-context-menu="true"
          class="zr-input h-9 rounded-md text-[13px] font-mono shadow-none focus-visible:border-[#ff6c37]/45 focus-visible:ring-[#ff6c37]/30"
        />
      </div>

      <div class="flex items-center gap-2">
        <Button
          data-testid="request-command-send"
          @click="emit('send')"
          :disabled="isLoading || hasBlockingIssues"
          class="zr-primary-action h-9 rounded-md px-4 text-[13px] font-semibold disabled:opacity-50"
        >
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? text.request.sending : text.request.send }}
        </Button>

        <Button variant="ghost" size="icon" class="zr-secondary-action h-9 w-9 rounded-md" @click="emit('save')">
          <Save class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <div class="zr-request-command-meta flex flex-wrap items-center gap-1.5 border-t border-[color:var(--zr-border-soft)] px-3 py-1.5 text-[10px] text-[var(--zr-text-muted)]">
      <span class="zr-chip rounded-full px-2 py-0.5">{{ text.request.collection }}: {{ displayCollectionName }}</span>
      <span class="rounded-full border border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)] px-2 py-0.5 text-orange-700 dark:text-orange-300">{{ text.request.environment }}: {{ environmentName }}</span>
      <span class="zr-chip max-w-full truncate rounded-full px-2 py-0.5 font-mono">{{ text.request.resolved }}: {{ resolvedUrl }}</span>
    </div>
  </div>
</template>
