<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMessages } from '@/lib/i18n'
import type { KeyValueItem } from '@/types/request'

type RequestMessages = ReturnType<typeof getMessages>['request']

const props = withDefaults(defineProps<{
  section: 'params' | 'headers' | 'env'
  requestText: RequestMessages
  addLabel: string
  keyHeaderLabel: string
  valueHeaderLabel: string
  descriptionHeaderLabel?: string
  showDescription?: boolean
  keyColumnClass?: string
  valueColumnClass?: string
  descriptionColumnClass?: string
  onToggleRow: (index: number) => void
  onRemoveRow: (index: number) => void
  onAddRow: () => void
  onRevealRow: (index: number) => void
  isRowInvalid: (item: KeyValueItem, index: number) => boolean
}>(), {
  showDescription: true,
  keyColumnClass: 'w-[30%]',
  valueColumnClass: 'w-[35%]',
  descriptionColumnClass: 'w-[25%]',
})

const rows = defineModel<KeyValueItem[]>('rows', { required: true })
</script>

<template>
  <div class="zr-code-panel overflow-hidden rounded-lg">
    <table class="w-full text-xs">
      <thead>
        <tr class="zr-table-head text-xs">
          <th class="w-10 text-center"></th>
          <th :class="[keyColumnClass, 'py-2.5 text-left font-medium']">{{ keyHeaderLabel }}</th>
          <th :class="[valueColumnClass, 'py-2.5 text-left font-medium']">{{ valueHeaderLabel }}</th>
          <th v-if="showDescription" :class="[descriptionColumnClass, 'py-2.5 text-left font-medium']">{{ descriptionHeaderLabel ?? requestText.description }}</th>
          <th class="w-8"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in rows" :key="idx" class="group border-b border-[color:var(--zr-border-soft)] last:border-b-0">
          <td class="py-1.5 align-top text-center">
            <div class="flex h-9 items-center justify-center">
              <button
                :data-testid="`request-row-toggle-${section}-${idx}`"
                :data-state="row.enabled ? 'on' : 'off'"
                class="zr-toggle-badge"
                type="button"
                @click="onToggleRow(idx)"
              >
                <span class="zr-toggle-dot" aria-hidden="true" />
              </button>
            </div>
          </td>
          <td class="py-1.5 align-top">
            <Input
              v-model="row.key"
              :aria-invalid="isRowInvalid(row, idx)"
              :class="[
                'zr-input h-9 rounded-lg text-xs font-mono shadow-none',
                !row.enabled && 'opacity-50',
                isRowInvalid(row, idx) && 'border-rose-500/35 bg-rose-500/5',
              ]"
              @update:model-value="onRevealRow(idx)"
            />
            <div
              v-if="isRowInvalid(row, idx)"
              :data-testid="`request-row-error-${section}-${idx}`"
              class="mt-1 text-[10px] text-rose-700 dark:text-rose-300"
            >
              {{ requestText.rowKeyRequired }}
            </div>
          </td>
          <td class="py-1.5 align-top">
            <Input
              v-model="row.value"
              :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !row.enabled && 'opacity-50']"
              @update:model-value="onRevealRow(idx)"
            />
          </td>
          <td v-if="showDescription" class="py-1.5 align-top">
            <Input
              v-model="row.description"
              :class="['zr-input h-9 rounded-lg text-xs shadow-none', !row.enabled && 'opacity-50']"
              @update:model-value="onRevealRow(idx)"
            />
          </td>
          <td class="py-1.5 align-top">
            <div class="flex h-9 items-center justify-center">
              <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="onRemoveRow(idx)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <Button variant="ghost" size="sm" class="zr-dashed-button mt-2.5 rounded-lg text-xs" @click="onAddRow">
    {{ addLabel }}
  </Button>
</template>
