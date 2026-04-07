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
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-vue-next'

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
  (e: 'discover-mcp-prompts'): void
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

</script>

<template>
  <section
    data-testid="request-panel-root"
    class="zr-panel zr-editor-shell zr-request-shell flex h-full min-h-0 flex-col overflow-hidden rounded-[0.7rem]"
  >
    <div data-testid="request-panel-header" class="zr-request-shell-header border-b border-[color:var(--zr-border)] px-3 pt-3">
      <div class="mb-2 flex items-center justify-between gap-2.5">
        <div class="min-w-0">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.workspaceTitle }}</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="zr-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--zr-text-muted)] transition-colors hover:text-[var(--zr-text-primary)]"
            @click="emit('toggle-collapsed')"
          >
            <component :is="props.collapsed ? ChevronDown : ChevronUp" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        v-if="!props.collapsed"
        data-testid="request-panel-tabs"
        class="zr-request-tab-strip flex items-center gap-1.5 overflow-x-auto pb-2.5"
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
                'zr-request-tab group flex min-w-[164px] shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors',
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

        <Button variant="ghost" size="icon-sm" class="zr-tool-button h-8 w-8 shrink-0 rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] text-[var(--zr-text-muted)] shadow-none transition-colors hover:text-[var(--zr-text-primary)]" @click="emit('create-tab')">
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
          <template v-if="activeTab.requestKind !== 'mcp'">
            <RequestUrlBar
              :show-mode-switch="true"
              request-kind="http"
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
              @update:request-kind="handleRequestKindChange"
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
            <McpRequestPanel
              :locale="locale"
              :request-name="activeTab.name"
              :request-key="activeTab.id"
              request-kind="mcp"
              :origin-kind="activeTab.origin?.kind"
              :persistence-state="activeTab.persistenceState"
              :execution-state="props.activityProjection.tabs[activeTab.id]?.result ?? activeTab.executionState"
              :is-sending="activeTab.isSending"
              :disable-send="activeTab.isSending || requestReadiness.blockers.length > 0"
              :mcp="activeTab.mcp"
              :mcp-artifact="activeTab.response?.mcpArtifact"
              @update:mcp="emit('update-active-tab', { requestKind: 'mcp', mcp: $event })"
              @discover-tools="emit('discover-mcp-tools')"
              @discover-resources="emit('discover-mcp-resources')"
              @discover-prompts="emit('discover-mcp-prompts')"
              @update:request-kind="handleRequestKindChange"
              @send="handleSend"
              @save="emit('save-request')"
            />
          </template>
        </div>
      </BusySurface>
    </template>
  </section>
</template>
