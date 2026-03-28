import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('./ResponseCodeViewer.vue', () => ({
  default: defineComponent({
    name: 'ResponseCodeViewer',
    props: {
      content: {
        type: String,
        required: true,
      },
      language: {
        type: String,
        required: true,
      },
    },
    template: '<div data-testid="response-code-viewer" :data-language="language" :data-content="content" />',
  }),
}))

vi.mock('./ResponseHtmlPreview.vue', () => ({
  default: defineComponent({
    name: 'ResponseHtmlPreview',
    props: {
      document: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        default: '',
      },
    },
    template: '<div data-testid="response-html-preview"><iframe data-testid="response-html-preview-frame" :srcdoc="document" :title="title" /></div>',
  }),
}))

import ResponsePanel from './ResponsePanel.vue'
import { getMessages } from '@/lib/i18n'

describe('ResponsePanel i18n copy', () => {
  it('renders collapsed summary labels from i18n in zh-CN locale', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'zh-CN',
        collapsed: true,
        status: 201,
        statusText: 'Created',
        time: '25 ms',
        size: '3 KB',
      },
    })

    expect(wrapper.text()).toContain('状态')
    expect(wrapper.text()).toContain('耗时')
    expect(wrapper.text()).toContain('大小')
  })

  it('renders the collapsed summary in a denser desktop-style grid', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'zh-CN',
        collapsed: true,
      },
    })

    const summaryGrid = wrapper.get('.grid')

    expect(summaryGrid.classes()).toEqual(
      expect.arrayContaining(['gap-1.5', 'px-3', 'py-3']),
    )
  })

  it('moves the active chrome to the selected response tab', async () => {
    const locale = 'en'
    const text = getMessages(locale)
    const wrapper = mount(ResponsePanel, {
      props: {
        locale,
      },
    })

    expect(wrapper.get('[data-testid="response-panel-root"]').classes()).toEqual(
      expect.arrayContaining(['zr-response-shell', 'zr-response-diagnostic']),
    )
    expect(wrapper.get('[data-testid="response-panel-tabs"]').classes()).toContain('zr-response-tab-strip')

    const tabLabels: string[] = [
      text.response.body,
      text.response.headers,
      text.response.cookies,
      text.response.tests,
    ]
    const tabButtons = wrapper.findAll('button').filter((button) =>
      tabLabels.includes(button.text()),
    )
    const bodyButton = tabButtons.find((button) => button.text() === text.response.body)
    const headersButton = tabButtons.find((button) => button.text() === text.response.headers)

    expect(bodyButton).toBeDefined()
    expect(headersButton).toBeDefined()

    await headersButton!.trigger('click')

    expect(bodyButton!.classes()).toContain('zr-tab-button')
    expect(bodyButton!.classes()).not.toContain('zr-tab-button-active')
    expect(bodyButton!.classes()).not.toContain('bg-secondary')
    expect(headersButton!.classes()).toContain('zr-tab-button-active')
  })

  it('renders the response body inside a read-only code viewer with detected language', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        contentType: 'application/xml',
        responseBody: '<root><item>1</item></root>',
      },
    })

    const viewer = wrapper.get('[data-testid="response-code-viewer"]')

    expect(viewer.attributes('data-language')).toBe('xml')
  })

  it('shows html preview mode controls and switches between source and preview', async () => {
    const responseBody = '<html><body><main><h1>Hello</h1></main></body></html>'
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        contentType: 'text/html',
        responseBody,
      },
    })

    expect(wrapper.get('[data-testid="response-body-mode-source"]').text()).toContain('Source')
    expect(wrapper.get('[data-testid="response-body-mode-preview"]').text()).toContain('Preview')
    expect(wrapper.find('[data-testid="response-html-preview"]').exists()).toBe(false)

    await wrapper.get('[data-testid="response-body-mode-preview"]').trigger('click')

    const iframe = wrapper.get('[data-testid="response-html-preview-frame"]')
    expect(iframe.attributes('srcdoc')).toBe(responseBody)
    expect(wrapper.find('[data-testid="response-code-viewer"]').exists()).toBe(false)

    await wrapper.get('[data-testid="response-body-mode-source"]').trigger('click')

    expect(wrapper.get('[data-testid="response-code-viewer"]').attributes('data-language')).toBe('html')
  })

  it('keeps non-html responses on the source-only path', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        contentType: 'application/json',
        responseBody: '{"ok":true}',
      },
    })

    expect(wrapper.find('[data-testid="response-body-mode-source"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="response-body-mode-preview"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="response-code-viewer"]').attributes('data-language')).toBe('json')
  })

  it('updates the preview when the active html response changes', async () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        contentType: 'text/html',
        responseBody: '<html><body><main>first</main></body></html>',
      },
    })

    await wrapper.get('[data-testid="response-body-mode-preview"]').trigger('click')
    await wrapper.setProps({
      responseBody: '<html><body><main>second</main></body></html>',
    })

    expect(wrapper.get('[data-testid="response-html-preview-frame"]').attributes('srcdoc')).toContain('second')
  })

  it('falls back to source mode when the active response stops being html', async () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        contentType: 'text/html',
        responseBody: '<html><body><main>Hello</main></body></html>',
      },
    })

    await wrapper.get('[data-testid="response-body-mode-preview"]').trigger('click')
    await wrapper.setProps({
      contentType: 'application/json',
      responseBody: '{"ok":true}',
    })

    expect(wrapper.find('[data-testid="response-body-mode-preview"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="response-code-viewer"]').attributes('data-language')).toBe('json')
  })

  it('renders an explicit idle empty state instead of presenting the response as successful by default', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        state: 'idle',
        status: 0,
        statusText: 'READY',
        responseBody: '',
      } as any,
    })

    expect(wrapper.get('[data-testid="response-panel-root"]').attributes('data-response-state')).toBe('idle')
    expect(wrapper.get('[data-testid="response-state-badge"]').text()).toContain('Ready')
    expect(wrapper.get('[data-testid="response-idle-state"]').text()).toContain('No response yet')
  })

  it('shows a stale marker when a new response is pending over retained content', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        state: 'pending',
        stale: true,
        status: 201,
        statusText: 'Created',
        responseBody: '{"ok":true}',
        contentType: 'application/json',
      } as any,
    })

    expect(wrapper.get('[data-testid="response-panel-root"]').attributes('data-response-state')).toBe('pending')
    expect(wrapper.get('[data-testid="response-state-badge"]').text()).toContain('Pending')
    expect(wrapper.get('[data-testid="response-stale-badge"]').text()).toContain('Stale')
    expect(wrapper.get('[data-testid="response-code-viewer"]').attributes('data-language')).toBe('json')
  })

  it('shows a create-mock-template action for completed responses and emits when clicked', async () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        state: 'success',
        status: 200,
        statusText: 'OK',
        responseBody: '{"ok":true}',
        contentType: 'application/json',
      } as any,
    })

    await wrapper.get('[data-testid="response-create-mock-template"]').trigger('click')

    expect(wrapper.emitted('create-mock-template')).toHaveLength(1)
  })

  it('renders a mock-source badge when the active response came from a request-local mock', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
        state: 'success',
        status: 200,
        statusText: 'OK',
        responseBody: '{"ok":true}',
        contentType: 'application/json',
        executionSource: 'mock',
      } as any,
    })

    expect(wrapper.get('[data-testid="response-source-badge"]').text()).toContain('Mock')
  })
})
