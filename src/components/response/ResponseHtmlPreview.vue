<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

defineOptions({
  name: 'ResponseHtmlPreview',
})

const emit = defineEmits<{
  (e: 'scoped-select-all', event: KeyboardEvent): void
}>()

const props = withDefaults(defineProps<{
  document: string
  title?: string
}>(), {
  document: '',
  title: 'HTML Preview',
})

const root = ref<HTMLDivElement | null>(null)
const frame = ref<HTMLIFrameElement | null>(null)
let removeFrameKeydownListener: (() => void) | null = null

const isSelectAllKey = (event: KeyboardEvent) => (
  (event.ctrlKey || event.metaKey)
  && !event.altKey
  && event.key.toLowerCase() === 'a'
)

const selectPreviewContent = () => {
  const frameDocument = frame.value?.contentDocument
  if (!frameDocument) {
    return
  }

  const selection = frameDocument.defaultView?.getSelection()
  if (!selection) {
    return
  }

  const range = frameDocument.createRange()
  range.selectNodeContents(frameDocument.body ?? frameDocument.documentElement)
  selection.removeAllRanges()
  selection.addRange(range)
}

const handleScopedSelectAll = (event: KeyboardEvent) => {
  if (!isSelectAllKey(event)) {
    return
  }

  event.preventDefault()
  selectPreviewContent()
  emit('scoped-select-all', event)
}

const bindFrameKeydownListener = () => {
  removeFrameKeydownListener?.()
  removeFrameKeydownListener = null

  try {
    const frameDocument = frame.value?.contentDocument
    if (!frameDocument) {
      return
    }

    frameDocument.addEventListener('keydown', handleScopedSelectAll)
    removeFrameKeydownListener = () => {
      frameDocument.removeEventListener('keydown', handleScopedSelectAll)
    }
  }
  catch {
    removeFrameKeydownListener = null
  }
}

const handleFrameLoad = async () => {
  await nextTick()
  bindFrameKeydownListener()
}

watch(
  () => props.document,
  () => {
    void handleFrameLoad()
  },
)

const focusContent = () => {
  root.value?.focus()
}

defineExpose({
  focusContent,
})

onBeforeUnmount(() => {
  removeFrameKeydownListener?.()
  removeFrameKeydownListener = null
})
</script>

<template>
  <div
    ref="root"
    data-testid="response-html-preview"
    tabindex="0"
    class="min-h-0 flex-1 overflow-hidden rounded-[inherit] border border-[color:var(--zr-border-soft)] bg-white/95 shadow-inner"
    @keydown="handleScopedSelectAll"
  >
    <iframe
      ref="frame"
      data-testid="response-html-preview-frame"
      :srcdoc="props.document"
      :title="props.title"
      referrerpolicy="no-referrer"
      sandbox="allow-same-origin"
      tabindex="-1"
      class="h-full min-h-0 w-full border-0 bg-white"
      @load="handleFrameLoad"
    />
  </div>
</template>
