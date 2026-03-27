export const RESOURCE_CONTEXT_MENU_TYPES = ['collection', 'request', 'tab'] as const

export type ResourceContextMenuTargetType = (typeof RESOURCE_CONTEXT_MENU_TYPES)[number]

export type ResourceContextMenuTarget =
  | {
      type: 'collection'
      collectionId: string
      collectionName: string
    }
  | {
      type: 'request'
      requestId: string
      collectionName: string
      requestName: string
      collectionId?: string
    }
  | {
      type: 'tab'
      tabId: string
      tabName: string
      collectionName: string
      requestId?: string
    }

export const RESOURCE_CONTEXT_MENU_SURFACES = [
  'sidebar-collection',
  'sidebar-request',
  'request-tab',
] as const

const EDITABLE_CONTEXT_MENU_SELECTOR = [
  'input',
  'textarea',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[data-native-context-menu="true"]',
].join(', ')

const RESOURCE_CONTEXT_MENU_SURFACE_SELECTOR = '[data-resource-context-menu-surface="true"]'

export const getContextMenuTestIdKey = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const isEditableContextMenuTarget = (target: EventTarget | null): boolean => (
  target instanceof Element && target.closest(EDITABLE_CONTEXT_MENU_SELECTOR) !== null
)

export const isResourceContextMenuSurface = (target: EventTarget | null): boolean => (
  target instanceof Element && target.closest(RESOURCE_CONTEXT_MENU_SURFACE_SELECTOR) !== null
)

export const shouldBypassResourceContextMenu = (target: EventTarget | null): boolean => (
  isEditableContextMenuTarget(target)
)
