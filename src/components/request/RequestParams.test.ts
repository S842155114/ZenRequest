import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RequestParams from './RequestParams.vue'

describe('RequestParams compact chrome', () => {
  it('renders the tab rail with denser spacing for desktop-style layouts', () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'zh-CN',
        environmentName: '本地环境',
      },
    })

    const tabsList = wrapper.get('[role="tablist"]')

    expect(tabsList.classes()).toEqual(
      expect.arrayContaining(['mx-3', 'mt-3', 'rounded-lg', 'p-0.5']),
    )
  })

  it('keeps the tab workspace shrinkable so overflowing sections can scroll vertically', () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'zh-CN',
        environmentName: '本地环境',
      },
    })

    expect(wrapper.classes()).toContain('min-h-0')
  })
})
