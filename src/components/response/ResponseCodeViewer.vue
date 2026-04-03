<script setup lang="ts">
import { ref } from 'vue'
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

const codeSurface = ref<InstanceType<typeof CodeEditorSurface> | null>(null)

const focusContent = () => {
  codeSurface.value?.focusEditor()
}

const selectAllContent = () => {
  codeSurface.value?.selectAllContent()
}

defineExpose({
  focusContent,
  selectAllContent,
})
</script>

<template>
  <CodeEditorSurface
    ref="codeSurface"
    test-id="response-code-viewer"
    :content="content"
    :language="language"
    :theme="theme"
    :read-only="true"
  />
</template>
