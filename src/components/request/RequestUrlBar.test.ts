import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import RequestUrlBar from './RequestUrlBar.vue'

const DropdownMenuStub = defineComponent({
  name: 'DropdownMenu',
  template: '<div><slot /></div>',
})

const DropdownMenuTriggerStub = defineComponent({
  name: 'DropdownMenuTrigger',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const DropdownMenuContentStub = defineComponent({
  name: 'DropdownMenuContent',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const DropdownMenuItemStub = defineComponent({
  name: 'DropdownMenuItem',
  inheritAttrs: false,
  emits: ['select'],
  template: '<button v-bind="$attrs" @click="$emit(\'select\')"><slot /></button>',
})

const mountUrlBar = (props: Record<string, unknown> = {}) => mount(RequestUrlBar, {
  props: {
    locale: 'en',
    method: 'POST',
    url: 'https://example.com/orders',
    isLoading: false,
    collectionName: 'Orders',
    environmentName: 'Local',
    resolvedUrl: 'https://example.com/orders',
    requestName: 'Orders Lookup',
    originKind: 'resource',
    persistenceState: 'saved',
    executionState: 'success',
    readiness: {
      blockers: [],
      advisories: [],
    },
    ...props,
  },
  global: {
    stubs: {
      DropdownMenu: DropdownMenuStub,
      DropdownMenuTrigger: DropdownMenuTriggerStub,
      DropdownMenuContent: DropdownMenuContentStub,
      DropdownMenuItem: DropdownMenuItemStub,
    },
  },
})

describe('RequestUrlBar', () => {
  it('moves import and export into an overflow menu instead of the primary command lane', async () => {
    const wrapper = mountUrlBar({
      readiness: {
        blockers: [],
        advisories: ['Unsaved changes'],
      },
    })

    expect(wrapper.find('[data-testid="request-command-import-primary"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-command-export-primary"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-command-overflow-trigger"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="request-identity-origin"]').text()).toContain('Resource')

    await wrapper.get('[data-testid="request-command-overflow-import"]').trigger('click')
    await wrapper.get('[data-testid="request-command-overflow-import-curl"]').trigger('click')
    await wrapper.get('[data-testid="request-command-overflow-export"]').trigger('click')

    expect(wrapper.emitted('import-workspace')).toHaveLength(1)
    expect(wrapper.emitted('import-curl')).toHaveLength(1)
    expect(wrapper.emitted('export-workspace')).toHaveLength(1)
  })

  it('shows readiness blockers and disables send until the request is runnable', () => {
    const wrapper = mountUrlBar({
      readiness: {
        blockers: ['Enter a request URL', 'JSON body is invalid'],
        advisories: ['Unsaved changes'],
      },
      url: '',
      persistenceState: 'unsaved',
      executionState: 'idle',
    })

    expect(wrapper.get('[data-testid="request-readiness-blockers"]').text()).toContain('Enter a request URL')
    expect(wrapper.get('[data-testid="request-readiness-blockers"]').text()).toContain('JSON body is invalid')
    expect(wrapper.get('[data-testid="request-readiness-advisories"]').text()).toContain('Unsaved changes')
    expect(wrapper.get('[data-testid="request-command-send"]').attributes('disabled')).toBeDefined()
  })

  it('keeps origin and persistence semantics separate for dirty canonical request tabs', () => {
    const wrapper = mountUrlBar({
      originKind: 'resource',
      persistenceState: 'unsaved',
      executionState: 'idle',
      readiness: {
        blockers: [],
        advisories: ['Unsaved changes'],
      },
    })

    expect(wrapper.get('[data-testid="request-identity-origin"]').text()).toContain('Resource')
    expect(wrapper.get('[data-testid="request-identity-origin"]').text()).not.toContain('Saved')
    expect(wrapper.get('[data-testid="request-identity-persistence"]').text()).toContain('Draft')
  })
})
