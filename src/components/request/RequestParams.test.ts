import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RequestParams from './RequestParams.vue'

const tabsStubs = {
  Tabs: defineComponent({ template: '<div><slot /></div>' }),
  TabsList: defineComponent({ template: '<div role="tablist"><slot /></div>' }),
  TabsTrigger: defineComponent({ template: '<button><slot /></button>' }),
  TabsContent: defineComponent({ template: '<div><slot /></div>' }),
}

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

  it('switches the body editor to a structured form-data surface instead of a generic textarea', async () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'en',
        environmentName: 'Local',
      },
      global: {
        stubs: tabsStubs,
      },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Form Data')!.trigger('click')

    expect(wrapper.find('[data-testid="request-formdata-editor"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('switches the body editor to a binary upload surface with file metadata controls', async () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'en',
        environmentName: 'Local',
      },
      global: {
        stubs: tabsStubs,
      },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Binary')!.trigger('click')

    expect(wrapper.find('[data-testid="request-binary-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="request-binary-file-input"]').exists()).toBe(true)
  })

  it('provides a raw content type control when raw body mode is selected', async () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'en',
        environmentName: 'Local',
      },
      global: {
        stubs: tabsStubs,
      },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Raw')!.trigger('click')

    expect(wrapper.find('[data-testid="request-raw-content-type"]').exists()).toBe(true)
  })
})
