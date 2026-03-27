import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RequestParams from './RequestParams.vue'

const tabsStubs = {
  Tabs: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
  TabsList: defineComponent({ template: '<div role="tablist"><slot /></div>' }),
  TabsTrigger: defineComponent({
    inheritAttrs: false,
    template: '<button v-bind="$attrs"><slot /></button>',
  }),
  TabsContent: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
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

  it('keeps the compose body as the shrinkable scroll boundary for request sections', () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'zh-CN',
        environmentName: '本地环境',
      },
      global: {
        stubs: tabsStubs,
      },
    })

    expect(wrapper.get('[data-testid="request-compose-body"]').classes()).toEqual(
      expect.arrayContaining(['flex', 'min-h-0', 'flex-1', 'flex-col', 'overflow-hidden']),
    )
    expect(wrapper.get('[data-testid="request-compose-scroll-area"]').classes()).toEqual(
      expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-y-auto']),
    )
    expect(wrapper.findAll('[data-testid="request-compose-scroll-area"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="request-section-content-params"]').classes()).not.toContain('flex-1')
    expect(wrapper.get('[data-testid="request-section-content-params"]').classes()).not.toContain('overflow-hidden')
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

  it('marks auth, tests, and env as secondary configuration tabs', () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'en',
        environmentName: 'Local',
      },
      global: {
        stubs: tabsStubs,
      },
    })

    for (const label of ['Auth', 'Tests', 'Env']) {
      const trigger = wrapper.findAll('button').find((button) => button.text().includes(label))
      expect(trigger?.attributes('data-request-secondary')).toBe('true')
    }
  })

  it('shows count badges for body, auth, tests, and env using effective configured scope', () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'en',
        environmentName: 'Local',
        bodyType: 'formdata',
        formDataFields: [
          { key: 'file', value: 'avatar.png', enabled: true },
          { key: 'ignored', value: 'draft', enabled: false },
        ],
        auth: {
          type: 'bearer',
          bearerToken: 'Bearer token',
          username: '',
          password: '',
          apiKeyKey: '',
          apiKeyValue: '',
          apiKeyPlacement: 'header',
        },
        tests: [
          { id: 'test-1', name: 'Status is 200', source: 'status', operator: 'equals', expected: '200' },
        ],
        environmentVariables: [
          { key: 'baseUrl', value: 'https://example.com', description: '', enabled: true },
          { key: 'draft', value: 'x', description: '', enabled: false },
        ],
      },
      global: {
        stubs: tabsStubs,
      },
    })

    expect(wrapper.get('[data-testid="request-section-trigger-body"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="request-section-trigger-auth"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="request-section-trigger-tests"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="request-section-trigger-env"]').text()).toContain('1')
  })

  it('renders low-noise row toggles without repeating ON labels in request tables', () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'en',
        environmentName: 'Local',
        params: [
          { key: 'page', value: '1', description: '', enabled: true },
        ],
      },
      global: {
        stubs: tabsStubs,
      },
    })

    const toggle = wrapper.get('[data-testid="request-row-toggle-params-0"]')
    expect(toggle.text()).toBe('')
  })

  it('uses a single active treatment for body and auth segmented controls after switching', async () => {
    const wrapper = mount(RequestParams, {
      props: {
        locale: 'en',
        environmentName: 'Local',
      },
      global: {
        stubs: tabsStubs,
      },
    })

    const rawButton = wrapper.findAll('button').find((button) => button.text() === 'Raw')!
    await rawButton.trigger('click')

    const jsonButton = wrapper.findAll('button').find((button) => button.text() === 'JSON')!
    expect(jsonButton.classes()).not.toContain('bg-secondary')
    expect(jsonButton.classes()).not.toContain('zr-tab-button-active')
    expect(rawButton.classes()).toContain('zr-tab-button-active')

    const bearerButton = wrapper.findAll('button').find((button) => button.text() === 'Bearer Token')!
    await bearerButton.trigger('click')

    const noneButton = wrapper.findAll('button').find((button) => button.text() === 'None')!
    expect(noneButton.classes()).not.toContain('bg-secondary')
    expect(noneButton.classes()).not.toContain('zr-tab-button-active')
    expect(bearerButton.classes()).toContain('zr-tab-button-active')
  })
})
