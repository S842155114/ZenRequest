<script setup lang="ts">
import { computed } from 'vue'
import { getMessages, localizeScratchPadName } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AppLocale } from '@/types/request'
import { Download, Globe, Save, Upload } from 'lucide-vue-next'

defineOptions({
  name: 'RequestUrlBar'
})

const props = defineProps<{
  locale: AppLocale
  method: string
  url: string
  isLoading: boolean
  collectionName: string
  environmentName: string
  resolvedUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:method', value: string): void
  (e: 'update:url', value: string): void
  (e: 'send'): void
  (e: 'save'): void
  (e: 'import-workspace'): void
  (e: 'export-workspace'): void
}>()

const methodColors: Record<string, string> = {
  GET: 'text-emerald-300',
  POST: 'text-orange-300',
  PUT: 'text-sky-300',
  DELETE: 'text-rose-300',
  PATCH: 'text-cyan-300'
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
</script>

<template>
  <div class="border-b border-[color:var(--zr-border)] bg-[var(--zr-editor-accent)]">
    <div class="flex items-center justify-between gap-2.5 px-3 pt-3">
      <div class="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--zr-text-muted)]">
        <Globe class="h-3 w-3 text-[#ff8b5f]" />
        {{ text.request.requestBuilder }}
      </div>
      <div class="hidden items-center gap-2 md:flex">
        <Button variant="ghost" size="sm" class="zr-tool-button h-7 rounded-md px-2.5 text-[11px] text-[var(--zr-text-secondary)] hover:text-[var(--zr-text-primary)]" @click="emit('import-workspace')">
          <Upload class="h-3 w-3" />
          {{ text.common.importJson }}
        </Button>
        <Button variant="ghost" size="sm" class="zr-tool-button h-7 rounded-md px-2.5 text-[11px] text-[var(--zr-text-secondary)] hover:text-[var(--zr-text-primary)]" @click="emit('export-workspace')">
          <Download class="h-3 w-3" />
          {{ text.common.exportJson }}
        </Button>
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
          <SelectItem value="GET" class="font-semibold text-emerald-300 focus:text-emerald-200">GET</SelectItem>
          <SelectItem value="POST" class="font-semibold text-orange-300 focus:text-orange-200">POST</SelectItem>
          <SelectItem value="PUT" class="font-semibold text-sky-300 focus:text-sky-200">PUT</SelectItem>
          <SelectItem value="DELETE" class="font-semibold text-rose-300 focus:text-rose-200">DELETE</SelectItem>
          <SelectItem value="PATCH" class="font-semibold text-cyan-300 focus:text-cyan-200">PATCH</SelectItem>
        </SelectContent>
      </Select>

      <div class="relative flex-1">
        <Input
          :model-value="url"
          @update:model-value="handleUrlChange"
          :placeholder="text.request.urlPlaceholder"
          class="zr-input h-9 rounded-md pr-18 text-[13px] font-mono shadow-none focus-visible:border-[#ff6c37]/45 focus-visible:ring-[#ff6c37]/30"
        />
        <div class="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1 md:hidden">
          <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md" @click="emit('import-workspace')">
            <Upload class="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md" @click="emit('export-workspace')">
            <Download class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button
          @click="emit('send')"
          :disabled="isLoading"
          class="h-9 rounded-md bg-[#ff6c37] px-4 text-[13px] font-semibold text-white shadow-none transition-colors hover:bg-[#ff5a20] disabled:opacity-50"
        >
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? text.request.sending : text.request.send }}
        </Button>

        <Button variant="ghost" size="icon" class="zr-tool-button h-9 w-9 rounded-md" @click="emit('save')">
          <Save class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 border-t border-[color:var(--zr-border-soft)] px-3 py-1.5 text-[10px] text-[var(--zr-text-muted)]">
      <span class="zr-chip rounded-full px-2 py-0.5">{{ text.request.collection }}: {{ displayCollectionName }}</span>
      <span class="rounded-full border border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)] px-2 py-0.5 text-[#ff9d74]">{{ text.request.environment }}: {{ environmentName }}</span>
      <span class="zr-chip max-w-full truncate rounded-full px-2 py-0.5 font-mono">{{ text.request.resolved }}: {{ resolvedUrl }}</span>
    </div>
  </div>
</template>
