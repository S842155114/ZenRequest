<script setup lang="ts">
import { EditorSelection, EditorState } from '@codemirror/state'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { ResolvedTheme } from '@/types/request'
import type { ResponseCodeLanguage } from '@/lib/response-code-viewer'

defineOptions({
  name: 'CodeEditorSurface',
})

const props = withDefaults(defineProps<{
  content: string
  language: ResponseCodeLanguage
  theme?: ResolvedTheme
  readOnly?: boolean
  testId?: string
}>(), {
  content: '',
  theme: 'dark',
  readOnly: true,
  testId: 'code-editor-surface',
})

const emit = defineEmits<{
  (e: 'update:content', value: string): void
}>()

const host = ref<HTMLDivElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)
let syncingFromProps = false

const isSelectAllKey = (event: KeyboardEvent) => (
  (event.ctrlKey || event.metaKey)
  && !event.altKey
  && event.key.toLowerCase() === 'a'
)

const createLanguageExtension = (language: ResponseCodeLanguage) => {
  switch (language) {
    case 'json':
      return json()
    case 'html':
      return html()
    case 'xml':
      return xml()
    default:
      return []
  }
}

const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--zr-text-primary)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
    lineHeight: '1.6',
  },
  '.cm-content': {
    minHeight: '100%',
    padding: '0.75rem 0 1rem',
  },
  '.cm-line': {
    padding: '0 1rem 0 0.25rem',
  },
  '.cm-gutters': {
    minWidth: '3rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--zr-text-muted)',
  },
  '.cm-gutterElement': {
    padding: '0 0.625rem 0 0.75rem',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 108, 55, 0.08)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--zr-text-secondary)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(255, 108, 55, 0.18) !important',
  },
})

const readOnlyTheme = EditorView.theme({
  '.cm-cursor, .cm-dropCursor': {
    display: 'none',
  },
})

const editableTheme = EditorView.theme({
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--zr-text-primary)',
  },
})

const lightTheme = EditorView.theme({
  '&': {
    color: '#172033',
  },
}, { dark: false })

const darkTheme = EditorView.theme({
  '&': {
    color: '#e6ebf2',
  },
  '.cm-gutters': {
    color: '#8f98a8',
  },
}, { dark: true })

const readOnlyFocusableAttributes = [
  EditorView.contentAttributes.of({ tabindex: '0' }),
]

const readOnlySelectAllKeymap = keymap.of([
  {
    key: 'Mod-a',
    run: (view) => {
      if (!props.readOnly) {
        return false
      }

      view.dispatch({
        selection: EditorSelection.single(0, view.state.doc.length),
      })
      view.focus()
      return true
    },
  },
])

const buildEditorState = (
  doc: string,
  selection?: EditorSelection,
) => EditorState.create({
  doc,
  selection,
  extensions: [
    EditorState.readOnly.of(props.readOnly),
    EditorView.editable.of(!props.readOnly),
    lineNumbers(),
    readOnlySelectAllKeymap,
    highlightActiveLineGutter(),
    highlightActiveLine(),
    drawSelection(),
    createLanguageExtension(props.language),
    ...(props.readOnly ? readOnlyFocusableAttributes : []),
    baseTheme,
    props.readOnly ? readOnlyTheme : editableTheme,
    EditorView.updateListener.of((update) => {
      if (!props.readOnly && update.docChanged && !syncingFromProps) {
        emit('update:content', update.state.doc.toString())
      }
    }),
    props.theme === 'dark'
      ? [oneDark, darkTheme]
      : [lightTheme, syntaxHighlighting(defaultHighlightStyle, { fallback: true })],
  ],
})

const mountEditor = () => {
  if (!host.value) return

  editorView.value?.destroy()
  editorView.value = new EditorView({
    state: buildEditorState(props.content),
    parent: host.value,
  })
}

const focusEditor = () => {
  editorView.value?.focus()
}

const selectAllContent = () => {
  if (!editorView.value) return

  const documentLength = editorView.value.state.doc.length
  editorView.value.dispatch({
    selection: EditorSelection.single(0, documentLength),
  })
  editorView.value.focus()
}

defineExpose({
  focusEditor,
  selectAllContent,
})

watch(
  () => props.content,
  () => {
    if (!editorView.value) return

    const currentContent = editorView.value.state.doc.toString()
    if (currentContent === props.content) {
      return
    }

    syncingFromProps = true
    editorView.value.dispatch({
      changes: {
        from: 0,
        to: currentContent.length,
        insert: props.content,
      },
      selection: {
        anchor: Math.min(editorView.value.state.selection.main.anchor, props.content.length),
        head: Math.min(editorView.value.state.selection.main.head, props.content.length),
      },
    })
    syncingFromProps = false
  },
)

watch(
  () => [props.language, props.theme, props.readOnly] as const,
  () => {
    if (!editorView.value) return

    const currentState = editorView.value.state
    editorView.value.setState(buildEditorState(
      currentState.doc.toString(),
      EditorSelection.create(currentState.selection.ranges, currentState.selection.mainIndex),
    ))
  },
)

onMounted(() => {
  mountEditor()
})

onBeforeUnmount(() => {
  editorView.value?.destroy()
  editorView.value = null
})
</script>

<template>
  <div
    :data-testid="testId"
    :data-language="language"
    :data-read-only="readOnly ? 'true' : 'false'"
    class="min-h-0 flex-1 overflow-hidden rounded-[inherit]"
  >
    <div ref="host" class="h-full min-h-0" />
  </div>
</template>
