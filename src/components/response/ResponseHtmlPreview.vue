<script setup lang="ts">
defineOptions({
  name: 'ResponseHtmlPreview',
})

withDefaults(defineProps<{
  document: string
  title?: string
}>(), {
  document: '',
  title: 'HTML Preview',
})
</script>

<template>
  <div
    data-testid="response-html-preview"
    class="min-h-0 flex-1 overflow-hidden rounded-[inherit] border border-[color:var(--zr-border-soft)] bg-white/95 shadow-inner"
  >
    <iframe
      data-testid="response-html-preview-frame"
      :srcdoc="document"
      :title="title"
      referrerpolicy="no-referrer"
      sandbox=""
      class="h-full min-h-0 w-full border-0 bg-white"
    />
  </div>
</template>
