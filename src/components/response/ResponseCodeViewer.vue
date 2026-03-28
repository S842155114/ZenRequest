<script setup lang="ts">
import CodeEditorSurface from '@/components/code/CodeEditorSurface.vue'
import type { ResolvedTheme } from '@/types/request'
import type { ResponseCodeLanguage } from '@/lib/response-code-viewer'

defineOptions({
  name: 'ResponseCodeViewer',
})

const props = withDefaults(defineProps<{
  content: string
  language: ResponseCodeLanguage
  theme?: ResolvedTheme
}>(), {
  content: '',
  theme: 'dark',
})
</script>

<template>
  <CodeEditorSurface
    test-id="response-code-viewer"
    :content="content"
    :language="language"
    :theme="theme"
    :read-only="true"
  />
</template>
