import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import AppHeader from './AppHeader.vue'
import type { EnvironmentPreset, WorkspaceSummary } from '@/types/request'

const ButtonStub = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
})

const SelectStub = defineComponent({
  name: 'Select',
  template: '<div><slot /></div>',
})

const SelectTriggerStub = defineComponent({
  name: 'SelectTrigger',
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})

const SelectContentStub = defineComponent({
  name: 'SelectContent',
  template: '<div><slot /></div>',
})

const SelectItemStub = defineComponent({
  name: 'SelectItem',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

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

const DropdownMenuLabelStub = defineComponent({
  name: 'DropdownMenuLabel',
  template: '<div><slot /></div>',
})

const DropdownMenuSeparatorStub = defineComponent({
  name: 'DropdownMenuSeparator',
  template: '<div />',
})

const DropdownMenuRadioGroupStub = defineComponent({
  name: 'DropdownMenuRadioGroup',
  template: '<div><slot /></div>',
})

const DropdownMenuRadioItemStub = defineComponent({
  name: 'DropdownMenuRadioItem',
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})

const SheetStub = defineComponent({
  name: 'Sheet',
  template: '<div><slot /></div>',
})

const SheetContentStub = defineComponent({
  name: 'SheetContent',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const SheetHeaderStub = defineComponent({
  name: 'SheetHeader',
  template: '<div><slot /></div>',
})

const SheetTitleStub = defineComponent({
  name: 'SheetTitle',
  template: '<div><slot /></div>',
})

const SheetDescriptionStub = defineComponent({
  name: 'SheetDescription',
  template: '<div><slot /></div>',
})

const TooltipProviderStub = defineComponent({
  name: 'TooltipProvider',
  template: '<div><slot /></div>',
})

const TooltipStub = defineComponent({
  name: 'Tooltip',
  template: '<div><slot /></div>',
})

const TooltipTriggerStub = defineComponent({
  name: 'TooltipTrigger',
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const TooltipContentStub = defineComponent({
  name: 'TooltipContent',
  template: '<div><slot /></div>',
})

const SeparatorStub = defineComponent({
  name: 'Separator',
  template: '<div />',
})

const workspaces: WorkspaceSummary[] = [
  { id: 'workspace-primary', name: 'Primary Workspace' },
]

const environments: EnvironmentPreset[] = [
  {
    id: 'env-local',
    name: 'Local',
    variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
      { key: 'token', value: 'demo-token', enabled: true },
      { key: 'disabled', value: 'nope', enabled: false },
    ],
  },
  {
    id: 'env-custom',
    name: 'Custom',
    variables: [],
  },
]

const mountHeader = (props: Record<string, unknown> = {}) => mount(AppHeader, {
  props: {
    locale: 'en',
    themeMode: 'dark',
    workspaces,
    activeWorkspaceId: 'workspace-primary',
    canDeleteWorkspace: true,
    environments,
    activeEnvironmentId: 'env-local',
    isCompactLayout: false,
    workspaceBusy: false,
    ...props,
  },
  global: {
    stubs: {
      Button: ButtonStub,
      Select: SelectStub,
      SelectTrigger: SelectTriggerStub,
      SelectContent: SelectContentStub,
      SelectItem: SelectItemStub,
      DropdownMenu: DropdownMenuStub,
      DropdownMenuTrigger: DropdownMenuTriggerStub,
      DropdownMenuContent: DropdownMenuContentStub,
      DropdownMenuItem: DropdownMenuItemStub,
      DropdownMenuLabel: DropdownMenuLabelStub,
      DropdownMenuSeparator: DropdownMenuSeparatorStub,
      DropdownMenuRadioGroup: DropdownMenuRadioGroupStub,
      DropdownMenuRadioItem: DropdownMenuRadioItemStub,
      Sheet: SheetStub,
      SheetContent: SheetContentStub,
      SheetHeader: SheetHeaderStub,
      SheetTitle: SheetTitleStub,
      SheetDescription: SheetDescriptionStub,
      TooltipProvider: TooltipProviderStub,
      Tooltip: TooltipStub,
      TooltipTrigger: TooltipTriggerStub,
      TooltipContent: TooltipContentStub,
      Separator: SeparatorStub,
    },
  },
})

describe('AppHeader', () => {
  it('renders separate brand, context, and utility zones with environment metadata and settings-hosted preferences', () => {
    const wrapper = mountHeader()

    expect(wrapper.find('[data-testid="header-brand-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-context-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-utilities-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-workspace-switcher"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-environment-switcher"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-settings-trigger"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Primary Workspace')
    expect(wrapper.text()).toContain('Local')
    expect(wrapper.text()).toContain('2 vars')
    expect(wrapper.text()).toContain('Custom')
    expect(wrapper.text()).toContain('0 vars')
    expect(wrapper.text()).toContain('Language')
    expect(wrapper.text()).toContain('Theme')
  })

  it('keeps workspace and environment visible on compact layouts and opens settings sheet content from the top trigger', async () => {
    const wrapper = mountHeader({
      isCompactLayout: true,
    })

    expect(wrapper.find('[data-testid="header-nav-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-workspace-switcher"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-environment-switcher"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('ZenRequest')
    expect(wrapper.find('[data-testid="header-settings-sheet"]').exists()).toBe(false)

    await wrapper.get('[data-testid="header-settings-trigger"]').trigger('click')

    expect(wrapper.find('[data-testid="header-settings-sheet"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Adjust language and theme for the workbench shell.')
    expect(wrapper.text()).toContain('Language')
    expect(wrapper.text()).toContain('Theme')

    await wrapper.get('[data-testid="header-settings-theme-light"]').trigger('click')
    await wrapper.get('[data-testid="header-settings-locale-zh-CN"]').trigger('click')

    expect(wrapper.emitted('update:theme-mode')?.[0]).toEqual(['light'])
    expect(wrapper.emitted('update:locale')?.[0]).toEqual(['zh-CN'])
  })

  it('disables both workspace and environment context controls while workspace data is reloading', () => {
    const wrapper = mountHeader({
      workspaceBusy: true,
    })

    expect(wrapper.get('[data-testid="header-workspace-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="header-environment-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="header-workspace-actions"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="header-environment-actions"]').attributes('disabled')).toBeDefined()
  })
})
