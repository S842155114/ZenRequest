<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

defineOptions({
  name: 'WorkspaceDialog',
})

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  confirmText?: string
  secondaryActionText?: string
  cancelText?: string
  variant?: 'default' | 'dirty-close'
  highlightLabel?: string
  contextBadges?: string[]
  destructive?: boolean
  nameLabel?: string
  namePlaceholder?: string
  nameValue?: string
  detailsLabel?: string
  detailsPlaceholder?: string
  detailsValue?: string
  tagsLabel?: string
  tagsPlaceholder?: string
  tagsValue?: string
  selectLabel?: string
  selectValue?: string
  selectOptions?: Array<{ label: string; value: string }>
}>(), {
  description: '',
  confirmText: 'Confirm',
  secondaryActionText: '',
  cancelText: 'Cancel',
  variant: 'default',
  highlightLabel: '',
  contextBadges: () => [],
  destructive: false,
  nameLabel: '',
  namePlaceholder: '',
  nameValue: '',
  detailsLabel: '',
  detailsPlaceholder: '',
  detailsValue: '',
  tagsLabel: '',
  tagsPlaceholder: '',
  tagsValue: '',
  selectLabel: '',
  selectValue: '',
  selectOptions: () => [],
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'secondary-action'): void
  (e: 'submit', payload: {
    nameValue: string
    detailsValue: string
    tagsValue: string
    selectValue: string
  }): void
}>()

const localName = ref('')
const localDetails = ref('')
const localTags = ref('')
const localSelect = ref('')
const isDirtyCloseDialog = computed(() => props.variant === 'dirty-close')
const hasFormFields = computed(() => (
  Boolean(props.nameLabel)
  || Boolean(props.detailsLabel)
  || Boolean(props.tagsLabel)
  || Boolean(props.selectLabel && props.selectOptions.length > 0)
))

watch(
  () => [props.open, props.nameValue, props.detailsValue, props.tagsValue, props.selectValue],
  () => {
    localName.value = props.nameValue
    localDetails.value = props.detailsValue
    localTags.value = props.tagsValue
    localSelect.value = props.selectValue
  },
  { immediate: true },
)

const handleSubmit = () => {
  emit('submit', {
    nameValue: localName.value.trim(),
    detailsValue: localDetails.value.trim(),
    tagsValue: localTags.value,
    selectValue: localSelect.value,
  })
}

const handleOpenChange = (nextOpen: boolean) => {
  if (!nextOpen) {
    emit('close')
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent
      :class="[
        'zr-dialog-shell max-w-xl border-[var(--zr-border)] bg-[var(--zr-elevated)] p-0 text-[var(--zr-text-primary)] shadow-[var(--zr-shadow)] sm:rounded-lg',
        isDirtyCloseDialog && 'overflow-hidden sm:max-w-[36rem]',
      ]"
    >
      <DialogHeader
        :class="[
          'space-y-2 border-b border-[var(--zr-border)] px-6 py-5',
          isDirtyCloseDialog && 'space-y-0 border-b-0 px-0 py-0',
        ]"
      >
        <template v-if="isDirtyCloseDialog">
          <div class="border-b border-[var(--zr-border)] bg-[linear-gradient(135deg,rgba(255,108,55,0.12)_0%,rgba(255,255,255,0.04)_100%)] px-6 py-5">
            <div class="flex items-start gap-3">
              <div
                data-testid="workspace-dialog-highlight"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--zr-accent-border)] bg-[linear-gradient(135deg,#ff8b5f_0%,#ff6c37_60%,#df5523_100%)] text-lg font-semibold text-white shadow-[0_14px_28px_rgba(255,108,55,0.22)]"
              >
                !
              </div>
              <div class="min-w-0 flex-1">
                <div
                  v-if="highlightLabel"
                  class="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--zr-text-muted)]"
                >
                  {{ highlightLabel }}
                </div>
                <DialogTitle
                  data-testid="workspace-dialog-title"
                  class="mt-1 text-[1.35rem] font-semibold tracking-[-0.01em] text-[var(--zr-text-primary)]"
                >
                  {{ title }}
                </DialogTitle>
                <DialogDescription
                  v-if="description"
                  data-testid="workspace-dialog-description"
                  class="mt-2 text-sm leading-6 text-[var(--zr-text-secondary)]"
                >
                  {{ description }}
                </DialogDescription>
              </div>
            </div>

            <div
              v-if="contextBadges.length"
              data-testid="workspace-dialog-context-badges"
              class="mt-4 flex flex-wrap gap-2"
            >
              <span
                v-for="badge in contextBadges"
                :key="badge"
                class="zr-chip inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
              >
                {{ badge }}
              </span>
            </div>
          </div>
        </template>
        <template v-else>
          <DialogTitle data-testid="workspace-dialog-title" class="text-lg font-semibold text-[var(--zr-text-primary)]">
            {{ title }}
          </DialogTitle>
          <DialogDescription
            v-if="description"
            data-testid="workspace-dialog-description"
            class="text-sm leading-6 text-[var(--zr-text-muted)]"
          >
            {{ description }}
          </DialogDescription>
        </template>
      </DialogHeader>

      <div v-if="hasFormFields" class="space-y-4 px-6 py-5">
        <div v-if="nameLabel" class="space-y-2">
          <label class="text-[11px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ nameLabel }}</label>
          <Input
            v-model="localName"
            :placeholder="namePlaceholder"
            class="zr-input h-11 rounded-lg shadow-none"
          />
        </div>

        <div v-if="detailsLabel" class="space-y-2">
          <label class="text-[11px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ detailsLabel }}</label>
          <Textarea
            v-model="localDetails"
            :placeholder="detailsPlaceholder"
            class="zr-input min-h-[120px] rounded-lg px-3 py-2.5 text-sm shadow-none resize-none"
          />
        </div>

        <div v-if="tagsLabel" class="space-y-2">
          <label class="text-[11px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ tagsLabel }}</label>
          <Input
            v-model="localTags"
            :placeholder="tagsPlaceholder"
            class="zr-input h-11 rounded-lg shadow-none"
          />
        </div>

        <div v-if="selectLabel && selectOptions.length" class="space-y-2">
          <label class="text-[11px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ selectLabel }}</label>
          <Select :model-value="localSelect" @update:model-value="localSelect = String($event)">
            <SelectTrigger class="zr-input h-11 rounded-lg shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent class="zr-dropdown">
              <SelectItem
                v-for="option in selectOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter
        :class="[
          'border-t border-[var(--zr-border)] px-6 py-4 sm:justify-end',
          isDirtyCloseDialog && 'sm:items-center sm:justify-between',
        ]"
      >
        <Button
          variant="ghost"
          data-testid="workspace-dialog-cancel"
          :class="[
            'zr-tool-button rounded-lg px-4 text-[var(--zr-text-secondary)] hover:text-[var(--zr-text-primary)]',
            isDirtyCloseDialog && 'sm:mr-auto',
          ]"
          @click="emit('close')"
        >
          {{ cancelText }}
        </Button>
        <Button
          v-if="secondaryActionText"
          variant="outline"
          data-testid="workspace-dialog-secondary"
          :class="[
            'rounded-lg border-[var(--zr-border)] bg-transparent px-4 text-[var(--zr-text-secondary)] hover:text-[var(--zr-text-primary)]',
            isDirtyCloseDialog && 'border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)] text-[#d65728] hover:bg-[var(--zr-accent-soft)] hover:text-[#c84b20]',
          ]"
          @click="emit('secondary-action')"
        >
          {{ secondaryActionText }}
        </Button>
        <Button
          data-testid="workspace-dialog-confirm"
          :class="[
            'rounded-lg px-4 text-white',
            destructive
              ? 'bg-[linear-gradient(135deg,#f97373_0%,#e23d3d_55%,#c22b2b_100%)] shadow-[0_14px_28px_rgba(226,61,61,0.22)]'
              : 'bg-[linear-gradient(135deg,#ff8b5f_0%,#ff6c37_55%,#df5523_100%)] shadow-[0_14px_28px_rgba(255,108,55,0.22)]'
          ]"
          @click="handleSubmit"
        >
          {{ confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
