import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { EditorView } from '@codemirror/view'

import CodeEditorSurface from './CodeEditorSurface.vue'

if (typeof Range !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: function * iterator() {},
    } as unknown as DOMRectList)
  }

  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => ({}),
    } as DOMRect)
  }
}

const Harness = defineComponent({
  components: { CodeEditorSurface },
  setup() {
    const content = ref('{"ok":true}')
    return {
      content,
    }
  },
  template: `
    <CodeEditorSurface
      test-id="code-editor-surface"
      :content="content"
      language="json"
      :read-only="false"
      @update:content="content = $event"
    />
  `,
})

describe('CodeEditorSurface', () => {
  it('preserves the cursor position when editable content syncs back through v-model', async () => {
    const wrapper = mount(Harness, {
      attachTo: document.body,
    })

    const editorRoot = wrapper.get('.cm-editor').element as HTMLElement
    const view = EditorView.findFromDOM(editorRoot)

    expect(view).toBeTruthy()

    const cursorPos = 2
    view!.dispatch({
      selection: { anchor: cursorPos },
    })

    view!.dispatch({
      changes: { from: cursorPos, insert: 'X' },
      selection: { anchor: cursorPos + 1 },
    })

    await nextTick()

    expect(view!.state.doc.toString()).toBe('{"Xok":true}')
    expect(view!.state.selection.main.head).toBe(cursorPos + 1)
  })
})
