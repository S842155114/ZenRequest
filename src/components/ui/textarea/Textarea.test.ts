import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

import Textarea from './Textarea.vue'

describe('Textarea', () => {
  it('supports v-model so dialog detail fields can persist edited text', async () => {
    const TestHarness = defineComponent({
      components: { Textarea },
      setup() {
        const value = ref('')
        return { value }
      },
      template: '<Textarea v-model="value" data-testid="textarea-input" />',
    })

    const wrapper = mount(TestHarness)

    await wrapper.get('[data-testid="textarea-input"]').setValue('Saved request description')

    expect((wrapper.vm as { value: string }).value).toBe('Saved request description')
  })
})
