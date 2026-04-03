import { computed, defineComponent, h, inject, provide, ref, watch } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RequestParams from './RequestParams.vue'

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

  it('uses a dedicated compose rail for primary and secondary request sections', () => {
    const wrapper = mountRequestParams()

    expect(wrapper.get('[data-testid="request-compose-rail"]').classes()).toContain('zr-compose-rail')
    expect(wrapper.get('[data-testid="request-section-trigger-mock"]').attributes('data-request-secondary')).toBe(
      'true',
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

  it('uses a code-editor surface for json and raw text body modes instead of a textarea', async () => {
    const wrapper = mountRequestParams({
      bodyType: 'json',
      body: '{"ok":true}',
    })

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')

    expect(wrapper.find('[data-testid="request-body-code-editor"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(false)

    await wrapper.findAll('button').find((button) => button.text() === 'Raw')!.trigger('click')

    expect(wrapper.find('[data-testid="request-body-code-editor"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('formats valid json bodies from the request editor without leaving json mode', async () => {
    const wrapper = mountRequestParams({
      bodyType: 'json',
      body: '{"ok":true,"items":[1,2]}',
    })

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.get('[data-testid="request-json-format"]').trigger('click')

    const bodyUpdates = wrapper.emitted('update:body') ?? []
    const lastBodyUpdate = bodyUpdates[bodyUpdates.length - 1]?.[0] as string

    expect(lastBodyUpdate).toContain('\n  "ok": true,')
    expect(lastBodyUpdate).toContain('\n  "items": [\n    1,\n    2\n  ]')
  })

  it('keeps form-data isolated from json drafts when switching modes', async () => {
    const wrapper = mountRequestParams({
      bodyType: 'json',
      body: '{\n  "232": "4444",\n  "ss": "sdasd",\n  "name": "vqlue"\n}',
    })

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Form Data')!.trigger('click')

    const formDataUpdates = wrapper.emitted('update:formDataFields') ?? []
    const lastFormDataUpdate = formDataUpdates[formDataUpdates.length - 1]?.[0] as Array<{ key: string; value: string }>
    const bodyUpdates = wrapper.emitted('update:body') ?? []
    const lastBodyUpdate = bodyUpdates[bodyUpdates.length - 1]?.[0] as string

    expect(lastFormDataUpdate).toEqual([
      { key: '', value: '', enabled: true, kind: 'text' },
    ])
    expect(lastBodyUpdate).toBe('')
  })

  it('restores the prior json draft when switching back from form-data mode to json', async () => {
    const originalJson = '{\n  "232": "4444",\n  "ss": "sdasd",\n  "name": "vqlue"\n}'
    const wrapper = mountRequestParams({
      bodyType: 'json',
      body: originalJson,
    })

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Form Data')!.trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'JSON')!.trigger('click')

    const bodyUpdates = wrapper.emitted('update:body') ?? []
    const lastBodyUpdate = bodyUpdates[bodyUpdates.length - 1]?.[0] as string

    expect(lastBodyUpdate).toBe(originalJson)
  })

  it('keeps raw text isolated from json drafts when switching between text modes', async () => {
    const originalJson = '{\n  "name": "value"\n}'
    const wrapper = mountRequestParams({
      bodyType: 'json',
      body: originalJson,
    })

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Raw')!.trigger('click')

    const bodyUpdatesAfterRaw = wrapper.emitted('update:body') ?? []
    const rawDraft = bodyUpdatesAfterRaw[bodyUpdatesAfterRaw.length - 1]?.[0] as string
    expect(rawDraft).toBe('')

    await wrapper.findAll('button').find((button) => button.text() === 'JSON')!.trigger('click')

    const bodyUpdatesAfterJson = wrapper.emitted('update:body') ?? []
    const restoredJson = bodyUpdatesAfterJson[bodyUpdatesAfterJson.length - 1]?.[0] as string
    expect(restoredJson).toBe(originalJson)
  })

  it('keeps the json format action in the payload header instead of giving it a full-width dedicated row', async () => {
    const wrapper = mountRequestParams({
      bodyType: 'json',
      body: '{"ok":true}',
    })

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')

    const header = wrapper.get('[data-testid="request-body-header"]')
    const formatButton = wrapper.get('[data-testid="request-json-format"]')

    expect(header.text()).toContain('Request Payload')
    expect(header.text()).toContain('json')
    expect(header.element.contains(formatButton.element)).toBe(true)
  })

  it('renders invalid json feedback inside the payload surface', async () => {
    const wrapper = mountRequestParams({
      bodyType: 'json',
      body: '{',
    })

    await wrapper.get('[data-testid="request-section-trigger-body"]').trigger('click')

    expect(wrapper.get('[data-testid="request-json-error"]').text()).toContain('Invalid JSON')
  })

  it('marks mock, execution, auth, tests, and env as secondary configuration tabs', () => {
    const wrapper = mountRequestParams()

    expect(wrapper.get('[data-testid="request-section-trigger-mock"]').attributes('data-request-secondary')).toBe('true')
    expect(wrapper.get('[data-testid="request-section-trigger-execution"]').attributes('data-request-secondary')).toBe('true')
    expect(wrapper.get('[data-testid="request-section-trigger-auth"]').attributes('data-request-secondary')).toBe('true')
    expect(wrapper.get('[data-testid="request-section-trigger-tests"]').attributes('data-request-secondary')).toBe('true')
    expect(wrapper.get('[data-testid="request-section-trigger-env"]').attributes('data-request-secondary')).toBe('true')
  })

  it('renders editable request-local mock fields when a mock template exists', async () => {
    const wrapper = mountRequestParams({
      mock: {
        enabled: true,
        status: 202,
        statusText: 'Accepted',
        contentType: 'application/json',
        body: '{"source":"mock"}',
        headers: [
          { key: 'X-Mock', value: 'enabled', description: '', enabled: true },
        ],
      },
    } as any)

    await wrapper.get('[data-testid="request-section-trigger-mock"]').trigger('click')

    expect(wrapper.get('[data-testid="request-mock-enabled"]').attributes('data-state')).toBe('on')
    expect(wrapper.get('[data-testid="request-mock-status"]').element).toBeTruthy()
    expect(wrapper.get('[data-testid="request-mock-status-text"]').element).toBeTruthy()
    expect(wrapper.get('[data-testid="request-mock-content-type"]').element).toBeTruthy()
    expect(wrapper.find('[data-testid="request-mock-body-editor"]').exists()).toBe(true)
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

  it('shows execution configuration counts and validates invalid execution settings in the execution section', async () => {
    const wrapper = mountRequestParams({
      executionOptions: {
        timeoutMs: 1000,
        redirectPolicy: 'manual',
        proxy: { mode: 'off' },
        verifySsl: false,
      },
    })

    expect(wrapper.get('[data-testid="request-section-trigger-execution"]').text()).toContain('4')

    await wrapper.get('[data-testid="request-section-trigger-execution"]').trigger('click')

    const timeoutInput = wrapper.get('[data-testid="request-execution-timeout"]')
    await timeoutInput.setValue('0')

    expect(wrapper.get('[data-testid="request-execution-error"]').text()).toContain('Execution options are invalid')
    expect(wrapper.get('[data-testid="request-section-invalid-execution"]').text()).toContain('1')

    const verifySslToggle = wrapper.get('[data-testid="request-execution-verify-ssl"]')
    expect(verifySslToggle.attributes('data-state')).toBe('off')
  })

  it('reveals custom proxy validation through the execution trigger when switching sections', async () => {
    const wrapper = mountRequestParams({
      executionOptions: {
        timeoutMs: undefined,
        redirectPolicy: 'follow',
        proxy: { mode: 'inherit' },
        verifySsl: true,
      },
    })

    await wrapper.get('[data-testid="request-section-trigger-execution"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Proxy: Custom')!.trigger('click')

    expect(wrapper.get('[data-testid="request-execution-error"]').text()).toContain('Execution options are invalid')

    await wrapper.get('[data-testid="request-section-trigger-headers"]').trigger('click')

    expect(wrapper.get('[data-testid="request-section-invalid-execution"]').text()).toContain('1')
  })
})
