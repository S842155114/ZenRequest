<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { getMessages } from '@/lib/i18n'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { AppLocale, HistoryItem, RequestCollection, RequestPreset } from '@/types/request'
import { getContextMenuTestIdKey, shouldBypassResourceContextMenu } from '@/lib/resource-context-menu'
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Clock3,
  Ellipsis,
  FolderKanban,
  History,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'

defineOptions({
  name: 'AppSidebar',
})

const props = withDefaults(defineProps<{
  locale: AppLocale
  collections?: RequestCollection[]
  historyItems?: HistoryItem[]
  activeRequestId?: string
  searchQuery?: string
  runtimeReady?: boolean
}>(), {
  collections: () => [],
  historyItems: () => [],
  searchQuery: '',
  runtimeReady: true,
})

const emit = defineEmits<{
  (e: 'select-request', request: RequestPreset): void
  (e: 'create-request'): void
  (e: 'create-collection'): void
  (e: 'rename-collection', name: string): void
  (e: 'delete-collection', name: string): void
  (e: 'delete-request', payload: { collectionName: string; requestId: string }): void
  (e: 'select-history', item: HistoryItem): void
  (e: 'remove-history', id: string): void
  (e: 'clear-history'): void
  (e: 'update:search-query', value: string): void
}>()

const activeSidebarTab = ref<'collections' | 'history'>('collections')
const expandedCollectionNames = ref<string[]>([])

watchEffect(() => {
  if (expandedCollectionNames.value.length > 0) return
  expandedCollectionNames.value = props.collections
    .filter((collection) => collection.expanded)
    .map((collection) => collection.name)
})

const filteredCollections = computed(() => {
  const query = props.searchQuery.trim().toLowerCase()
  const collections = props.collections.map((collection) => ({
    ...collection,
    expanded: expandedCollectionNames.value.includes(collection.name) || !!query,
  }))
  if (!query) return collections

  return collections
    .map((collection) => ({
      ...collection,
      requests: collection.requests.filter((request) =>
        request.name.toLowerCase().includes(query)
        || (request.description ?? '').toLowerCase().includes(query)
        || (request.tags ?? []).some((tag) => tag.toLowerCase().includes(query))
        || request.method.toLowerCase().includes(query)
        || collection.name.toLowerCase().includes(query),
      ),
    }))
    .filter((collection) => collection.requests.length > 0 || collection.name.toLowerCase().includes(query))
})

const filteredHistoryItems = computed(() => {
  const query = props.searchQuery.trim().toLowerCase()
  if (!query) return props.historyItems

  return props.historyItems.filter((entry) =>
    entry.name.toLowerCase().includes(query)
    || entry.method.toLowerCase().includes(query)
    || entry.url.toLowerCase().includes(query),
  )
})

const isCollectionExpanded = (name: string) => expandedCollectionNames.value.includes(name)

const toggleCollection = (name: string) => {
  expandedCollectionNames.value = expandedCollectionNames.value.includes(name)
    ? expandedCollectionNames.value.filter((item) => item !== name)
    : [...expandedCollectionNames.value, name]
}

const getMethodBadgeClass = (method: string) => {
  switch (method) {
    case 'GET': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'POST': return 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300'
    case 'PUT': return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300'
    case 'DELETE': return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    default: return 'border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] text-[var(--zr-text-secondary)]'
  }
}

const getStatusBadgeClass = (status: number) => (
  status < 300
    ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-300'
    : 'border-rose-500/25 bg-rose-500/12 text-rose-300'
)

type HistoryGroupKey = 'today' | 'yesterday' | 'earlier'

const getHistoryGroupKey = (executedAtEpochMs?: number): HistoryGroupKey => {
  if (!executedAtEpochMs || executedAtEpochMs <= 0) return 'earlier'

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000)

  if (executedAtEpochMs >= startOfToday) return 'today'
  if (executedAtEpochMs >= startOfYesterday) return 'yesterday'
  return 'earlier'
}

const getHistoryStatusMetaClass = (status: number) => (
  status < 300
    ? 'text-emerald-700/85 dark:text-emerald-300/85'
    : status < 400
      ? 'text-amber-700/85 dark:text-amber-300/85'
      : 'text-rose-700/85 dark:text-rose-300/85'
)

const getTestIdKey = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const text = computed(() => getMessages(props.locale))

const handleResourceContextMenuGuard = (event: MouseEvent) => {
  if (shouldBypassResourceContextMenu(event.target)) {
    event.stopPropagation()
  }
}

const activeSidebarMeta = computed(() => (
  activeSidebarTab.value === 'collections'
    ? {
        title: text.value.sidebar.collections,
        description: text.value.sidebar.collectionsDescription,
        searchPlaceholder: text.value.sidebar.collectionsSearchPlaceholder,
      }
    : {
        title: text.value.sidebar.history,
        description: text.value.sidebar.historyDescription,
        searchPlaceholder: text.value.sidebar.historySearchPlaceholder,
      }
))

const isCollectionSearchActive = computed(() => props.searchQuery.trim().length > 0)

const groupedHistoryItems = computed(() => {
  const groups: Record<HistoryGroupKey, HistoryItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }

  for (const item of filteredHistoryItems.value) {
    groups[getHistoryGroupKey(item.executedAtEpochMs)].push(item)
  }

  const orderedKeys: HistoryGroupKey[] = ['today', 'yesterday', 'earlier']
  return orderedKeys
    .filter((key) => groups[key].length > 0)
    .map((key) => ({
      key,
      label: text.value.sidebar.historyGroups[key],
      items: groups[key],
    }))
})
</script>

<template>
  <aside data-testid="sidebar-root" class="zr-sidebar-shell zr-sidebar-browser flex h-full min-h-0 flex-col overflow-hidden rounded-[0.7rem]">
    <div class="zr-sidebar-browser-header px-3 pt-3">
      <div class="mb-2.5 flex items-start justify-between gap-2.5">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--zr-text-muted)]">
            <Sparkles class="h-3.5 w-3.5 text-[#ff8b5f]" />
            {{ text.header.openExplorer }}
          </div>
          <div data-testid="sidebar-title" class="mt-1.5 text-[13px] font-semibold text-[var(--zr-text-primary)]">
            {{ activeSidebarMeta.title }}
          </div>
          <div data-testid="sidebar-description" class="mt-1 text-[11px] leading-5 text-[var(--zr-text-secondary)]">
            {{ activeSidebarMeta.description }}
          </div>
        </div>
        <Button
          size="sm"
          class="zr-primary-action h-8 rounded-md px-2.5 text-[11px] font-semibold"
          :disabled="!props.runtimeReady"
          @click="emit('create-request')"
        >
          <Plus class="mr-1 h-3.5 w-3.5" />
          {{ text.sidebar.createRequest }}
        </Button>
      </div>

      <div data-testid="sidebar-mode-switcher" class="zr-sidebar-mode-switch mt-2.5 flex items-center gap-1.5">
        <Button
          size="sm"
          data-testid="sidebar-collections-tab"
          :class="[
            'zr-section-tab flex-1 rounded-lg',
            activeSidebarTab === 'collections' ? 'zr-section-tab-active' : 'zr-section-tab-idle'
          ]"
          @click="activeSidebarTab = 'collections'"
        >
          <Boxes class="h-3.5 w-3.5" />
          {{ text.sidebar.collections }}
        </Button>
        <Button
          size="sm"
          data-testid="sidebar-history-tab"
          :class="[
            'zr-section-tab flex-1 rounded-lg',
            activeSidebarTab === 'history' ? 'zr-section-tab-active' : 'zr-section-tab-idle'
          ]"
          @click="activeSidebarTab = 'history'"
        >
          <History class="h-3.5 w-3.5" />
          {{ text.sidebar.history }}
        </Button>
      </div>

      <div data-testid="sidebar-search" class="zr-search-bar zr-sidebar-search mt-2.5 flex items-center gap-2 rounded-md px-2.5">
        <Search class="h-3.5 w-3.5 text-[var(--zr-text-muted)]" />
        <input
          data-testid="sidebar-search-input"
          data-native-context-menu="true"
          :value="props.searchQuery"
          class="w-full bg-transparent py-1.5 text-[13px] text-[var(--zr-text-primary)] outline-none placeholder:text-[var(--zr-text-muted)]"
          :placeholder="activeSidebarMeta.searchPlaceholder"
          @input="emit('update:search-query', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <Separator class="mt-3 bg-[var(--zr-border)]" />

    <ScrollArea v-if="activeSidebarTab === 'collections'" class="min-h-0 flex-1">
      <div class="space-y-2.5 p-3">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[11px] uppercase tracking-[0.2em] text-[var(--zr-text-muted)]">
            {{ filteredCollections.length }} {{ text.sidebar.collections }}
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="zr-tool-button h-7 rounded-md px-2 text-[11px]"
            :disabled="!props.runtimeReady"
            @click="emit('create-collection')"
          >
            <FolderKanban class="mr-1 h-3 w-3" />
            {{ text.sidebar.createCollection }}
          </Button>
        </div>

        <Collapsible
          v-for="collection in filteredCollections"
          :key="collection.id"
          :open="isCollectionExpanded(collection.name) || collection.expanded"
          class="zr-sidebar-card"
          @update:open="toggleCollection(collection.name)"
        >
          <ContextMenu>
            <ContextMenuTrigger as-child>
              <div
                :data-testid="`sidebar-collection-surface-${getContextMenuTestIdKey(collection.name)}`"
                data-resource-context-menu-surface="true"
                class="px-2.5 py-2.5"
                @contextmenu.capture="handleResourceContextMenuGuard"
              >
                <div class="flex items-center gap-2">
                  <CollapsibleTrigger class="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <div class="zr-folder-icon">
                      <FolderKanban class="h-3.5 w-3.5" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-[13px] font-medium text-[var(--zr-text-primary)]">{{ collection.name }}</div>
                      <div class="mt-0.5 text-[10px] text-[var(--zr-text-muted)]">{{ text.sidebar.requestsCount(collection.requests.length) }}</div>
                    </div>
                    <component
                      :is="isCollectionExpanded(collection.name) || collection.expanded ? ChevronDown : ChevronRight"
                      class="h-4 w-4 shrink-0 text-[var(--zr-text-muted)]"
                    />
                  </CollapsibleTrigger>

                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        class="zr-toolbar-action-button h-7 w-7 rounded-md"
                        :aria-label="text.sidebar.collectionActions"
                        :data-testid="`collection-actions-${getTestIdKey(collection.name)}`"
                      >
                        <Ellipsis class="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="zr-dropdown min-w-[190px]">
                      <DropdownMenuItem
                        :data-testid="`collection-action-rename-${getTestIdKey(collection.name)}`"
                        @select="emit('rename-collection', collection.name)"
                      >
                        {{ text.dialogs.renameCollection.title }}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        :data-testid="`collection-action-delete-${getTestIdKey(collection.name)}`"
                        @select="emit('delete-collection', collection.name)"
                      >
                        {{ text.dialogs.deleteCollection.title }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent data-testid="collection-context-menu" class="zr-dropdown min-w-[180px]">
              <ContextMenuItem
                :data-testid="`collection-context-rename-${getContextMenuTestIdKey(collection.name)}`"
                @select="emit('rename-collection', collection.name)"
              >
                {{ text.common.rename }}
              </ContextMenuItem>
              <ContextMenuItem
                :data-testid="`collection-context-delete-${getContextMenuTestIdKey(collection.name)}`"
                @select="emit('delete-collection', collection.name)"
              >
                {{ text.common.delete }}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <CollapsibleContent>
            <Separator class="bg-[var(--zr-border)]" />
            <div class="space-y-0.5 px-1.5 py-1.5">
              <ContextMenu
                v-for="request in collection.requests"
                :key="request.id"
              >
                <ContextMenuTrigger as-child>
                  <div
                    :data-testid="`sidebar-request-surface-${getContextMenuTestIdKey(request.id)}`"
                    data-resource-context-menu-surface="true"
                    @contextmenu.capture="handleResourceContextMenuGuard"
                  >
                    <button
                      :data-testid="`request-row-${getTestIdKey(request.id)}`"
                      :aria-current="props.activeRequestId === request.id ? 'true' : undefined"
                      :class="[
                        'zr-request-row group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        props.activeRequestId === request.id
                          ? 'zr-request-row-active'
                          : 'zr-request-row-idle'
                      ]"
                      @click="emit('select-request', request)"
                    >
                      <Badge
                        variant="outline"
                        :class="['mt-0.5 min-w-[2.8rem] justify-center rounded-md border text-[10px] font-semibold tracking-[0.16em]', getMethodBadgeClass(request.method)]"
                      >
                        {{ request.method.substring(0, 3) }}
                      </Badge>
                      <div class="min-w-0 flex-1">
                        <div
                          v-if="isCollectionSearchActive"
                          :data-testid="`request-search-context-${getTestIdKey(request.id)}`"
                          class="zr-request-row-context mb-1 inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]"
                        >
                          {{ collection.name }}
                        </div>
                        <div class="truncate text-[12px] font-medium text-[var(--zr-text-primary)]">{{ request.name }}</div>
                        <div v-if="request.description" class="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[var(--zr-text-muted)]">
                          {{ request.description }}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        class="zr-tool-button h-5 w-5 rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-300"
                        @click.stop="emit('delete-request', { collectionName: collection.name, requestId: request.id })"
                      >
                        <Trash2 class="h-3 w-3" />
                      </Button>
                    </button>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent data-testid="request-context-menu" class="zr-dropdown min-w-[180px]">
                  <ContextMenuItem
                    :data-testid="`request-context-open-${getContextMenuTestIdKey(request.id)}`"
                    @select="emit('select-request', request)"
                  >
                    {{ text.common.open }}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    :data-testid="`request-context-delete-${getContextMenuTestIdKey(request.id)}`"
                    @select="emit('delete-request', { collectionName: collection.name, requestId: request.id })"
                  >
                    {{ text.common.delete }}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>

    <ScrollArea v-else class="min-h-0 flex-1">
      <div class="space-y-2.5 p-3">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[11px] uppercase tracking-[0.2em] text-[var(--zr-text-muted)]">
            {{ text.sidebar.recentRequests }}
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="zr-tool-button h-7 rounded-md px-2 text-[11px]"
            @click="emit('clear-history')"
          >
            <RotateCcw class="mr-1 h-3 w-3" />
            {{ text.sidebar.clear }}
          </Button>
        </div>

        <div v-if="groupedHistoryItems.length === 0" class="zr-sidebar-empty">
          <div class="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--zr-border)] bg-[var(--zr-chip-bg)]">
            <Clock3 class="h-3.5 w-3.5 text-[var(--zr-text-muted)]" />
          </div>
          <div class="mt-2 text-[13px] font-medium text-[var(--zr-text-primary)]">
            {{ props.searchQuery ? text.sidebar.noHistoryMatch : text.sidebar.noHistory }}
          </div>
        </div>

        <section
          v-for="group in groupedHistoryItems"
          :key="group.key"
          class="space-y-1.5"
        >
          <div
            :data-testid="`history-group-${group.key}`"
            class="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]"
          >
            {{ group.label }}
          </div>

          <button
            v-for="item in group.items"
            :key="item.id"
            class="zr-history-row group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left"
            @click="emit('select-history', item)"
          >
            <div class="zr-history-icon">
              <Clock3 class="h-3.5 w-3.5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <Badge
                  variant="outline"
                  :class="['rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em]', getMethodBadgeClass(item.method)]"
                >
                  {{ item.method }}
                </Badge>
                <span
                  :data-testid="`history-status-${item.id}`"
                  :class="['text-[10px] font-medium', getHistoryStatusMetaClass(item.status)]"
                >
                  {{ item.status }}
                </span>
                <span class="text-[10px] text-[var(--zr-text-muted)]">
                  {{ item.time }}
                </span>
              </div>
              <div class="mt-1.5 truncate text-[13px] font-medium text-[var(--zr-text-primary)]">{{ item.name }}</div>
              <div class="mt-0.5 truncate font-mono text-[10px] text-[var(--zr-text-muted)]">{{ item.url }}</div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              class="zr-tool-button h-6 w-6 rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-300"
              @click.stop="emit('remove-history', item.id)"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </button>
        </section>
      </div>
    </ScrollArea>
  </aside>
</template>
