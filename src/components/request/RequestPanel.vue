<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { BusySurface } from '@/components/ui/busy-surface'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import RequestUrlBar from './RequestUrlBar.vue'
import RequestParams from './RequestParams.vue'
import McpRequestPanel from '@/features/mcp-workbench/components/McpRequestPanel.vue'
import { createDefaultActivityProjection, type RequestPanelProps, useRequestPanelState } from '@/features/request-workbench/composables/useRequestPanelState'
import { getContextMenuTestIdKey, shouldBypassResourceContextMenu } from '@/lib/resource-context-menu'
import type {
  KeyValueItem,
  RequestTabState,
  SendRequestPayload,
} from '@/types/request'
import { ChevronDown, ChevronUp, Plus, Save, X } from 'lucide-vue-next'

defineOptions({
  name: 'RequestPanel'
})

const props = withDefaults(defineProps<RequestPanelProps>(), {
  tabs: () => [],
  activityProjection: createDefaultActivityProjection,
  locale: 'en',
  activeTabId: '',
  activeEnvironmentName: '',
  activeEnvironmentVariables: () => [],
  resolvedActiveUrl: '',
  collapsed: false,
})

const emit = defineEmits<{
  (e: 'select-tab', id: string): void
  (e: 'close-tab', id: string): void
  (e: 'create-tab'): void
  (e: 'save-tab', id: string): void
  (e: 'update-active-tab', payload: Partial<RequestTabState>): void
  (e: 'update-environment-variables', items: KeyValueItem[]): void
  (e: 'send', payload: SendRequestPayload): void
  (e: 'save-request'): void
  (e: 'discover-mcp-tools'): void
  (e: 'discover-mcp-resources'): void
  (e: 'import-workspace'): void
  (e: 'import-openapi'): void
  (e: 'import-curl'): void
  (e: 'export-workspace'): void
  (e: 'toggle-collapsed'): void
}>()

const handleResourceContextMenuGuard = (event: MouseEvent) => {
  if (shouldBypassResourceContextMenu(event.target)) {
    event.stopPropagation()
  }
}
const {
  activeTab,
  auth,
  binaryFileName,
  binaryMimeType,
  bodyContent,
  bodyContentType,
  bodyType,
  environmentVariables,
  executionOptions,
  formDataFields,
  getCompactTabState,
  getCompactTabStateLabel,
  getCompactTabTitle,
  getExecutionStateLabel,
  getOriginLabel,
  getPersistenceLabel,
  getTabMethodClass,
  handleSend,
  headers,
  method,
  mock,
  normalizedTabs,
  params,
  requestPanelBusy,
  requestParamsRef,
  requestReadiness,
  tests,
  text,
  url,
} = useRequestPanelState(props, emit)


const createDefaultMcpDefinition = () => ({
  connection: {
    transport: 'http' as const,
    baseUrl: '',
    headers: [],
    auth: {
      type: 'none' as const,
      bearerToken: '',
      username: '',
      password: '',
      apiKeyKey: 'X-API-Key',
      apiKeyValue: '',
      apiKeyPlacement: 'header' as const,
    },
  },
  operation: {
    type: 'initialize' as const,
    input: {
      clientName: 'ZenRequest',
      clientVersion: '0.1.0',
    },
  },
})

const handleRequestKindChange = (requestKind: 'http' | 'mcp') => {
  if (!activeTab.value || activeTab.value.requestKind === requestKind) return

  emit('update-active-tab', requestKind === 'mcp'
    ? {
        requestKind: 'mcp',
        mcp: activeTab.value.mcp ?? createDefaultMcpDefinition(),
      }
    : {
        requestKind: 'http',
      })
}

const mcpOperationLabel = computed(() => activeTab.value?.mcp?.operation.type ?? 'initialize')
const mcpTransportLabel = computed(() => activeTab.value?.mcp?.connection.transport ?? 'http')
const mcpEndpointLabel = computed(() => activeTab.value?.mcp?.connection.baseUrl?.trim() || text.value.request.mcp.endpointNotConfigured)
const requestModeBadge = computed(() => activeTab.value?.requestKind === 'mcp' ? 'MCP' : 'HTTP')
const requestModeTitle = computed(() => {
  if (!activeTab.value) return text.value.request.workspaceTitle
  if (activeTab.value.requestKind === 'mcp') {
    return activeTab.value.name || text.value.request.mcp.workbenchTitle
  }
  return activeTab.value.name || text.value.request.workspaceTitle
})
const requestModeCaption = computed(() => activeTab.value?.requestKind === 'mcp'
  ? text.value.request.mcp.requestTitle
  : text.value.request.workspaceTitle)
</script>

<template>
  <section
    data-testid="request-panel-root"
    class="zr-panel zr-editor-shell zr-request-shell flex h-full min-h-0 flex-col overflow-hidden rounded-[0.7rem]"
  >
    <div data-testid="request-panel-header" class="zr-request-shell-header border-b border-[color:var(--zr-border)] px-3 pt-3.5">
      <div class="mb-2.5 flex items-center justify-between gap-2.5">
        <div class="min-w-0">
          <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.workspaceTitle }}</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="zr-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md"
            @click="emit('toggle-collapsed')"
          >
            <component :is="props.collapsed ? ChevronDown : ChevronUp" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        v-if="!props.collapsed"
        data-testid="request-panel-tabs"
        class="zr-request-tab-strip flex items-center gap-1.5 overflow-x-auto pb-3"
      >
        <ContextMenu
          v-for="tab in normalizedTabs"
          :key="tab.id"
        >
          <ContextMenuTrigger as-child>
            <div
              :data-testid="`request-tab-${getContextMenuTestIdKey(tab.id)}`"
              data-resource-context-menu-surface="true"
              :title="getCompactTabTitle(tab)"
              :class="[
                'zr-request-tab group flex min-w-[164px] shrink-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors',
                tab.id === activeTabId ? 'zr-request-tab-active' : 'zr-request-tab-idle',
              ]"
              @click="emit('select-tab', tab.id)"
              @contextmenu.capture="handleResourceContextMenuGuard"
            >
              <span :class="['shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em]', getTabMethodClass(tab.method)]">{{ tab.method }}</span>
              <div class="min-w-0 flex-1 truncate text-[13px] font-medium leading-5 text-[var(--zr-text-primary)]">{{ tab.name }}</div>
              <span
                :data-testid="`request-tab-status-${getContextMenuTestIdKey(tab.id)}`"
                :data-state="getCompactTabState(tab)"
                :aria-label="getCompactTabStateLabel(tab)"
                class="zr-request-tab-status shrink-0"
              />
              <button
                class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--zr-text-muted)] transition-colors hover:bg-[var(--zr-soft-hover)] hover:text-[var(--zr-text-primary)]"
                :disabled="normalizedTabs.length === 1"
                @click.stop="emit('close-tab', tab.id)"
              >
                <X class="h-3 w-3" />
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent class="zr-dropdown min-w-[180px]">
            <ContextMenuItem
              :data-testid="`request-tab-context-save-${getContextMenuTestIdKey(tab.id)}`"
              @select="emit('save-tab', tab.id)"
            >
              {{ text.common.save }}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              :data-testid="`request-tab-context-close-${getContextMenuTestIdKey(tab.id)}`"
              :disabled="normalizedTabs.length === 1"
              @select="emit('close-tab', tab.id)"
            >
              {{ text.common.close }}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-8 w-8 shrink-0 rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)]" @click="emit('create-tab')">
          <Plus class="h-3.5 w-3.5" />
        </Button>
      </div>

      <div v-else class="zr-request-summary-grid grid grid-cols-3 gap-1.5 pb-3">
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryMethod }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab?.method ?? method }}</div>
        </div>
        <div data-testid="request-summary-origin" class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryOrigin }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab ? getOriginLabel(activeTab) : text.request.scratch }}</div>
        </div>
        <div data-testid="request-summary-persistence" class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryPersistence }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab ? getPersistenceLabel(activeTab) : text.request.draft }}</div>
        </div>
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryEnvironment }}</div>
          <div class="mt-1 truncate text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeEnvironmentName }}</div>
        </div>
        <div class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryTabs }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ normalizedTabs.length }}</div>
        </div>
        <div data-testid="request-summary-result" class="zr-summary-card px-3 py-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.summaryResult }}</div>
          <div class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ activeTab ? getExecutionStateLabel(activeTab) : text.request.ready }}</div>
        </div>
      </div>
    </div>

    <template v-if="activeTab && !props.collapsed">
      <BusySurface
        :busy="requestPanelBusy"
        :title="text.busy.requestSendingTitle"
        :description="text.busy.requestSendingDescription"
        surface-test-id="request-panel-busy-surface"
        overlay-test-id="request-panel-busy-overlay"
        class="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div data-testid="request-compose-shell" class="flex h-full min-h-0 flex-col overflow-hidden">
          <div
            data-testid="request-compose-mode-switch"
            class="border-b border-[color:var(--zr-border-soft)] bg-[color:color-mix(in srgb, var(--zr-editor-accent) 72%, transparent)] px-3 py-2.5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.modeLabel }}</div>
                <div class="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestModeCaption }}</div>
                <div class="mt-1 truncate text-[15px] font-semibold leading-5 text-[var(--zr-text-primary)]">{{ requestModeTitle }}</div>
                <p class="mt-1 text-xs leading-5 text-[var(--zr-text-secondary)]">{{ text.request.modeHint }}</p>
              </div>
              <div
                data-testid="request-kind-toggle"
                class="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[color:color-mix(in srgb, var(--zr-accent) 28%, var(--zr-border-soft))] bg-[color:color-mix(in srgb, var(--zr-accent-soft) 30%, var(--zr-control-bg))] p-1 shadow-sm"
              >
                <button
                  data-testid="request-kind-http"
                  :class="[
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zr-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--zr-panel)]',
                    activeTab?.requestKind !== 'mcp'
                      ? 'bg-[var(--zr-accent)] text-white shadow-sm'
                      : 'text-[var(--zr-text-primary)] hover:bg-[var(--zr-soft-hover)]',
                  ]"
                  @click="handleRequestKindChange('http')"
                >
                  {{ text.request.modeHttp }}
                </button>
                <button
                  data-testid="request-kind-mcp"
                  :class="[
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zr-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--zr-panel)]',
                    activeTab?.requestKind === 'mcp'
                      ? 'bg-[var(--zr-accent)] text-white shadow-sm'
                      : 'text-[var(--zr-text-primary)] hover:bg-[var(--zr-soft-hover)]',
                  ]"
                  @click="handleRequestKindChange('mcp')"
                >
                  {{ text.request.modeMcp }}
                </button>
              </div>
            </div>
          </div>

          <template v-if="activeTab.requestKind !== 'mcp'">
            <RequestUrlBar
              :locale="locale"
              :method="method"
              :url="url"
              :is-loading="activeTab.isSending"
              :request-name="activeTab.name"
              :origin-kind="activeTab.origin?.kind"
              :persistence-state="activeTab.persistenceState"
              :execution-state="props.activityProjection.tabs[activeTab.id]?.result ?? activeTab.executionState"
              :readiness="requestReadiness"
              :collection-name="activeTab.collectionName"
              :environment-name="activeEnvironmentName"
              :resolved-url="resolvedActiveUrl"
              :show-open-api-import="props.showOpenApiImport"
              @update:method="method = $event"
              @update:url="url = $event"
              @send="handleSend"
              @save="emit('save-request')"
              @import-workspace="emit('import-workspace')"
              @import-openapi="emit('import-openapi')"
              @import-curl="emit('import-curl')"
              @export-workspace="emit('export-workspace')"
            />

            <div data-testid="request-compose-body-host" class="flex min-h-0 flex-1 overflow-hidden">
              <RequestParams
                ref="requestParamsRef"
                :locale="locale"
                :request-key="activeTab.id"
                v-model:params="params"
                v-model:headers="headers"
                v-model:body="bodyContent"
                v-model:body-type="bodyType"
                v-model:body-content-type="bodyContentType"
                v-model:form-data-fields="formDataFields"
                v-model:binary-file-name="binaryFileName"
                v-model:binary-mime-type="binaryMimeType"
                v-model:auth="auth"
                v-model:tests="tests"
                v-model:mock="mock"
                v-model:execution-options="executionOptions"
                v-model:environment-variables="environmentVariables"
                :environment-name="activeEnvironmentName"
              />
            </div>
          </template>

          <template v-else>
            <div
              data-testid="mcp-command-bar"
              class="border-b border-[color:var(--zr-border-soft)] bg-[var(--zr-editor-accent)] px-3 py-3"
            >
              <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3">
                <div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-3" data-testid="mcp-command-summary">
                  <div class="rounded-xl border border-[color:var(--zr-border-soft)] bg-[var(--zr-control-bg)] px-3 py-2.5">
                    <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.transport }}</div>
                    <div data-testid="mcp-command-transport" class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ mcpTransportLabel }}</div>
                  </div>
                  <div class="rounded-xl border border-[color:var(--zr-border-soft)] bg-[var(--zr-control-bg)] px-3 py-2.5">
                    <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.operation }}</div>
                    <div data-testid="mcp-command-operation" class="mt-1 text-sm font-semibold text-[var(--zr-text-primary)]">{{ mcpOperationLabel }}</div>
                  </div>
                  <div class="rounded-xl border border-[color:var(--zr-border-soft)] bg-[var(--zr-control-bg)] px-3 py-2.5">
                    <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.endpoint }}</div>
                    <div data-testid="mcp-command-endpoint" class="mt-1 truncate text-sm font-semibold text-[var(--zr-text-primary)]">{{ mcpEndpointLabel }}</div>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2 xl:shrink-0" data-testid="mcp-command-actions">
                  <Button
                    data-testid="request-url-bar-send"
                    :disabled="activeTab.isSending || requestReadiness.blockers.length > 0"
                    class="zr-primary-action h-9 rounded-md px-4 text-[13px] font-semibold disabled:opacity-50"
                    @click="handleSend"
                  >
                    {{ activeTab.isSending ? text.request.sending : text.request.send }}
                  </Button>
                  <Button
                    data-testid="request-command-save"
                    variant="ghost"
                    size="icon"
                    class="zr-secondary-action h-9 w-9 rounded-md"
                    :aria-label="text.common.save"
                    @click="emit('save-request')"
                  >
                    <Save class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div v-if="requestReadiness.blockers.length || requestReadiness.advisories.length" class="pt-2.5">
                <div
                  v-if="requestReadiness.blockers.length"
                  data-testid="request-url-bar-blockers"
                  class="flex flex-wrap items-center gap-1.5"
                >
                  <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">{{ text.request.blockers }}</span>
                  <span
                    v-for="blocker in requestReadiness.blockers"
                    :key="blocker"
                    class="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300"
                  >
                    {{ blocker }}
                  </span>
                </div>
                <div
                  v-if="requestReadiness.advisories.length"
                  data-testid="request-url-bar-advisories"
                  class="mt-1.5 flex flex-wrap items-center gap-1.5"
                >
                  <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">{{ text.request.advisories }}</span>
                  <span
                    v-for="advisory in requestReadiness.advisories"
                    :key="advisory"
                    class="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                  >
                    {{ advisory }}
                  </span>
                </div>
              </div>
            </div>

            <McpRequestPanel
              :locale="locale"
              :request-name="activeTab.name"
              :request-key="activeTab.id"
              :mcp="activeTab.mcp"
              :mcp-artifact="activeTab.response?.mcpArtifact"
              @update:mcp="emit('update-active-tab', { requestKind: 'mcp', mcp: $event })"
              @discover-tools="emit('discover-mcp-tools')"
              @discover-resources="emit('discover-mcp-resources')"
            />
          </template>
        </div>
      </BusySurface>
    </template>
  </section>
</template>
