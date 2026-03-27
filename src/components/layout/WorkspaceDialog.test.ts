import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import WorkspaceDialog from './WorkspaceDialog.vue'

const dialogStubs = {
  Dialog: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
  DialogContent: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
  DialogHeader: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
  DialogTitle: defineComponent({
    inheritAttrs: false,
    template: '<h2 v-bind="$attrs"><slot /></h2>',
  }),
  DialogDescription: defineComponent({
    inheritAttrs: false,
    template: '<p v-bind="$attrs"><slot /></p>',
  }),
  DialogFooter: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
}

const controlStubs = {
  Button: defineComponent({
    inheritAttrs: false,
    template: '<button v-bind="$attrs"><slot /></button>',
  }),
  Input: defineComponent({
    inheritAttrs: false,
    props: {
      modelValue: { type: String, default: '' },
    },
    template: '<input v-bind="$attrs" :value="modelValue" />',
  }),
  Textarea: defineComponent({
    inheritAttrs: false,
    props: {
      modelValue: { type: String, default: '' },
    },
    template: '<textarea v-bind="$attrs">{{ modelValue }}</textarea>',
  }),
  Select: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
  SelectContent: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
  SelectItem: defineComponent({
    inheritAttrs: false,
    template: '<div v-bind="$attrs"><slot /></div>',
  }),
  SelectTrigger: defineComponent({
    inheritAttrs: false,
    template: '<button v-bind="$attrs"><slot /></button>',
  }),
  SelectValue: defineComponent({
    inheritAttrs: false,
    template: '<span v-bind="$attrs"><slot /></span>',
  }),
}

describe('WorkspaceDialog', () => {
  it('renders the dirty-close variant with emphasized context badges and action labels', () => {
    const wrapper = mount(WorkspaceDialog, {
      props: {
        open: true,
        variant: 'dirty-close',
        highlightLabel: 'Before Closing',
        title: 'Unsaved Request',
        description: 'Save "Dirty Request" before closing this tab?',
        cancelText: 'Cancel',
        secondaryActionText: "Don't Save",
        confirmText: 'Save and Close',
        contextBadges: ['POST', 'Draft', 'Unsaved Changes'],
      },
      global: {
        stubs: {
          ...dialogStubs,
          ...controlStubs,
        },
      },
    })

    expect(wrapper.get('[data-testid="workspace-dialog-highlight"]').text()).toContain('!')
    expect(wrapper.get('[data-testid="workspace-dialog-title"]').text()).toBe('Unsaved Request')
    expect(wrapper.get('[data-testid="workspace-dialog-description"]').text()).toContain('Dirty Request')
    expect(wrapper.get('[data-testid="workspace-dialog-context-badges"]').text()).toContain('POST')
    expect(wrapper.get('[data-testid="workspace-dialog-context-badges"]').text()).toContain('Draft')
    expect(wrapper.get('[data-testid="workspace-dialog-secondary"]').text()).toBe("Don't Save")
    expect(wrapper.get('[data-testid="workspace-dialog-confirm"]').text()).toBe('Save and Close')
  })

  it('keeps the default dialog layout for form-driven workspace flows', () => {
    const wrapper = mount(WorkspaceDialog, {
      props: {
        open: true,
        title: 'Save Request',
        description: 'Store the current tab as a reusable request.',
        confirmText: 'Save',
        cancelText: 'Cancel',
        nameLabel: 'Request Name',
        nameValue: 'Orders Lookup',
      },
      global: {
        stubs: {
          ...dialogStubs,
          ...controlStubs,
        },
      },
    })

    expect(wrapper.find('[data-testid="workspace-dialog-highlight"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="workspace-dialog-title"]').text()).toBe('Save Request')
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workspace-dialog-confirm"]').text()).toBe('Save')
  })
})
