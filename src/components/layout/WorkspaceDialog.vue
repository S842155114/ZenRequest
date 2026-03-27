<script setup lang="ts">
import { ref, watch } from 'vue'
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
    <DialogContent class="zr-dialog-shell max-w-xl border-[var(--zr-border)] bg-[var(--zr-elevated)] p-0 text-[var(--zr-text-primary)] shadow-[var(--zr-shadow)] sm:rounded-lg">
      <DialogHeader class="space-y-2 border-b border-[var(--zr-border)] px-6 py-5">
        <DialogTitle class="text-lg font-semibold text-[var(--zr-text-primary)]">
          {{ title }}
        </DialogTitle>
        <DialogDescription v-if="description" class="text-sm leading-6 text-[var(--zr-text-muted)]">
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 px-6 py-5">
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

      <DialogFooter class="border-t border-[var(--zr-border)] px-6 py-4 sm:justify-end">
        <Button
          variant="ghost"
          class="zr-tool-button rounded-lg px-4 text-[var(--zr-text-secondary)] hover:text-[var(--zr-text-primary)]"
          @click="emit('close')"
        >
          {{ cancelText }}
        </Button>
        <Button
          v-if="secondaryActionText"
          variant="outline"
          class="rounded-lg border-[var(--zr-border)] bg-transparent px-4 text-[var(--zr-text-secondary)] hover:text-[var(--zr-text-primary)]"
          @click="emit('secondary-action')"
        >
          {{ secondaryActionText }}
        </Button>
        <Button
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
