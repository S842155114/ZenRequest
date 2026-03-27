import { computed, defineComponent, h, inject, provide, ref, watch } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RequestParams from './RequestParams.vue'

const tabsContextKey = Symbol('request-params-tabs')

const tabsStubs = {
  Tabs: defineComponent({
    inheritAttrs: false,
    props: {
      defaultValue: {
        type: String,
        default: '',
      },
      modelValue: {
        type: String,
        default: undefined,
      },
    },
    emits: ['update:modelValue'],
    setup(props, { attrs, emit, slots }) {
      const activeValue = ref(props.modelValue ?? props.defaultValue ?? '')

      watch(() => props.modelValue, (value) => {
        if (value !== undefined) {
          activeValue.value = value
        }
      })

      const setValue = (value: string) => {
        activeValue.value = value
        emit('update:modelValue', value)
      }

      provide(tabsContextKey, {
        activeValue,
        setValue,
      })

      return () => h('div', attrs, slots.default?.())
    },
  }),
  TabsList: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { role: 'tablist' }, slots.default?.())
    },
  }),
  TabsTrigger: defineComponent({
    inheritAttrs: false,
    props: {
      value: {
        type: String,
        required: true,
      },
    },
    setup(props, { attrs, slots }) {
      const context = inject<{
        activeValue: { value: string }
        setValue: (value: string) => void
      }>(tabsContextKey)

      if (!context) {
        throw new Error('TabsTrigger stub requires Tabs context')
      }

      const state = computed(() => (context.activeValue.value === props.value ? 'active' : 'inactive'))

      return () => h('button', {
        ...attrs,
        'data-state': state.value,
        onClick: () => context.setValue(props.value),
      }, slots.default?.())
    },
  }),
  TabsContent: defineComponent({
    inheritAttrs: false,
    props: {
      value: {
        type: String,
        required: true,
      },
    },
    setup(props, { attrs, slots }) {
      const context = inject<{
        activeValue: { value: string }
      }>(tabsContextKey)

      if (!context) {
        throw new Error('TabsContent stub requires Tabs context')
      }

      return () => context.activeValue.value === props.value
        ? h('div', attrs, slots.default?.())
        : null
    },
  }),
}

const mountRequestParams = (props: Record<string, unknown> = {}) => mount(RequestParams, {
  props: {
    locale: 'en',
    environmentName: 'Local',
    ...props,
  },
  global: {
    stubs: tabsStubs,
  },
})

describe('RequestParams compact chrome', () => {
  it('renders the tab rail with denser spacing for desktop-style layouts', () => {
    const wrapper = mountRequestParams({
      locale: 'zh-CN',
      environmentName: '本地环境',
    })

    const tabsList = wrapper.get('[role="tablist"]')

    expect(tabsList.classes()).toEqual(
      expect.arrayContaining(['mx-3', 'mt-3', 'rounded-lg', 'p-0.5']),
    )
  })

  it('keeps the compose body as the shrinkable scroll boundary for request sections', () => {
    const wrapper = mountRequestParams({
      locale: 'zh-CN',
      environmentName: '本地环境',
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
    const wrapper = mountRequestParams()

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Form Data')!.trigger('click')

    expect(wrapper.find('[data-testid="request-formdata-editor"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('switches the body editor to a binary upload surface with file metadata controls', async () => {
    const wrapper = mountRequestParams()

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Binary')!.trigger('click')

    expect(wrapper.find('[data-testid="request-binary-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="request-binary-file-input"]').exists()).toBe(true)
  })

  it('provides a raw content type control when raw body mode is selected', async () => {
    const wrapper = mountRequestParams()

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Raw')!.trigger('click')

    expect(wrapper.find('[data-testid="request-raw-content-type"]').exists()).toBe(true)
  })

  it('marks auth, tests, and env as secondary configuration tabs', () => {
    const wrapper = mountRequestParams()

    for (const label of ['Auth', 'Tests', 'Env']) {
      const trigger = wrapper.findAll('button').find((button) => button.text().includes(label))
      expect(trigger?.attributes('data-request-secondary')).toBe('true')
    }
  })

  it('shows count badges for body, auth, tests, and env using effective configured scope', () => {
    const wrapper = mountRequestParams({
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
    })

    expect(wrapper.get('[data-testid="request-section-trigger-body"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="request-section-trigger-auth"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="request-section-trigger-tests"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="request-section-trigger-env"]').text()).toContain('1')
  })

  it('renders low-noise row toggles without repeating ON labels in request tables', () => {
    const wrapper = mountRequestParams({
      params: [
        { key: 'page', value: '1', description: '', enabled: true },
      ],
    })

    const toggle = wrapper.get('[data-testid="request-row-toggle-params-0"]')
    expect(toggle.text()).toBe('')
  })

  it('uses a single active treatment for body and auth segmented controls after switching', async () => {
    const wrapper = mountRequestParams()

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    const rawButton = wrapper.findAll('button').find((button) => button.text() === 'Raw')!
    await rawButton.trigger('click')

    const jsonButton = wrapper.findAll('button').find((button) => button.text() === 'JSON')!
    expect(jsonButton.classes()).not.toContain('bg-secondary')
    expect(jsonButton.classes()).not.toContain('zr-tab-button-active')
    expect(rawButton.classes()).toContain('zr-tab-button-active')

    await wrapper.get('[data-testid="request-section-trigger-auth"]').trigger('click')
    const bearerButton = wrapper.findAll('button').find((button) => button.text() === 'Bearer Token')!
    await bearerButton.trigger('click')

    const noneButton = wrapper.findAll('button').find((button) => button.text() === 'None')!
    expect(noneButton.classes()).not.toContain('bg-secondary')
    expect(noneButton.classes()).not.toContain('zr-tab-button-active')
    expect(bearerButton.classes()).toContain('zr-tab-button-active')
  })

  it('does not show a validation error for a newly added untouched params row', async () => {
    const wrapper = mountRequestParams()

    await wrapper.findAll('button').find((button) => button.text() === '+ Add Parameter')!.trigger('click')

    expect(wrapper.find('[data-testid="request-row-error-params-0"]').exists()).toBe(false)
  })

  it('does not validate disabled params rows even when they contain a value without a key', async () => {
    const wrapper = mountRequestParams({
      params: [
        { key: '', value: '1', description: '', enabled: false },
      ],
    })

    await wrapper.get('[data-testid="request-section-trigger-headers"]').trigger('click')
    await wrapper.get('[data-testid="request-section-trigger-params"]').trigger('click')

    expect(wrapper.find('[data-testid="request-row-error-params-0"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-section-invalid-params"]').exists()).toBe(false)
  })

  it('removes untouched blank params rows when switching to another top-level section', async () => {
    const wrapper = mountRequestParams({
      params: [
        { key: '', value: '', description: '', enabled: true },
      ],
    })

    expect(wrapper.findAll('[data-testid="request-section-content-params"] tbody tr')).toHaveLength(1)

    await wrapper.get('[data-testid="request-section-trigger-headers"]').trigger('click')
    await wrapper.get('[data-testid="request-section-trigger-params"]').trigger('click')

    expect(wrapper.findAll('[data-testid="request-section-content-params"] tbody tr')).toHaveLength(0)
  })

  it('keeps partially edited invalid params rows visible across section switches and clears the error after fixing the key', async () => {
    const wrapper = mountRequestParams({
      params: [
        { key: '', value: '', description: '', enabled: true },
      ],
    })

    const valueInput = wrapper.findAll('[data-testid="request-section-content-params"] input')[1]
    await valueInput.setValue('1')

    expect(wrapper.get('[data-testid="request-row-error-params-0"]').text()).toContain('Key is required')

    await wrapper.get('[data-testid="request-section-trigger-headers"]').trigger('click')

    expect(wrapper.get('[data-testid="request-section-invalid-params"]').text()).toContain('1')

    await wrapper.get('[data-testid="request-section-trigger-params"]').trigger('click')

    const keyInput = wrapper.findAll('[data-testid="request-section-content-params"] input')[0]
    await keyInput.setValue('page')

    expect(wrapper.find('[data-testid="request-row-error-params-0"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-section-invalid-params"]').exists()).toBe(false)
  })

  it('keeps params input cells top-aligned while utility controls stay centered in a fixed control lane when validation feedback increases row height', async () => {
    const wrapper = mountRequestParams({
      params: [
        { key: '', value: '', description: '', enabled: true },
      ],
    })

    const valueInput = wrapper.findAll('[data-testid="request-section-content-params"] input')[1]
    await valueInput.setValue('1')

    const cells = wrapper.findAll('[data-testid="request-section-content-params"] tbody tr')[0].findAll('td')
    const firstControlLane = cells[0].find('div')
    const lastControlLane = cells[4].find('div')

    expect(cells).toHaveLength(5)
    expect(cells[0].classes()).toContain('align-top')
    expect(cells[4].classes()).toContain('align-top')
    expect(cells[1].classes()).toContain('align-top')
    expect(cells[2].classes()).toContain('align-top')
    expect(cells[3].classes()).toContain('align-top')
    expect(firstControlLane.classes()).toEqual(expect.arrayContaining(['flex', 'h-9', 'items-center', 'justify-center']))
    expect(lastControlLane.classes()).toEqual(expect.arrayContaining(['flex', 'h-9', 'items-center', 'justify-center']))
  })

  it('surfaces invalid form-data rows through the body trigger when body mode is form-data', async () => {
    const wrapper = mountRequestParams()

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Form Data')!.trigger('click')

    const valueInput = wrapper.findAll('[data-testid="request-formdata-editor"] input')[1]
    await valueInput.setValue('avatar.png')

    expect(wrapper.get('[data-testid="request-row-error-formdata-0"]').text()).toContain('Key is required')

    await wrapper.get('[data-testid="request-section-trigger-headers"]').trigger('click')

    expect(wrapper.get('[data-testid="request-section-invalid-body"]').text()).toContain('1')
  })
})
