<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { BusySurface } from '@/components/ui/busy-surface'
import { AppSidebar } from '@/components/layout'
import { RequestPanel } from '@/components/request'
import { ResponsePanel } from '@/components/response'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type {
  RequestPanelHandlers,
  ResponsePanelHandlers,
  SidebarBindings,
  SidebarHandlers,
  RequestPanelBindings,
  ResponsePanelBindings,
  WorkbenchLayoutState,
} from '../types'

interface PanelController {
  collapse: () => void
  expand: () => void
  resize: (size: number) => void
}

const props = defineProps<{
  sidebarProps: SidebarBindings
  sidebarHandlers: SidebarHandlers
  requestPanelProps: RequestPanelBindings
  requestPanelHandlers: RequestPanelHandlers
  responsePanelProps: ResponsePanelBindings
  responsePanelHandlers: ResponsePanelHandlers
  layout: WorkbenchLayoutState
  isCompactLayout: boolean
  mobileExplorerOpen: boolean
  mobileExplorerTitle: string
  mobileExplorerDescription: string
  workbenchBusy: boolean
  workbenchBusyTitle: string
  workbenchBusyDescription: string
  onUpdateMobileExplorerOpen: (value: boolean) => void
  onRequestPanelResize: (size: number) => void
  onResponsePanelResize: (size: number) => void
  onUpdateRequestPanelCollapsed: (value: boolean) => void
  onUpdateResponsePanelCollapsed: (value: boolean) => void
}>()

const requestWorkbenchPanel = ref<PanelController | null>(null)
const responseWorkbenchPanel = ref<PanelController | null>(null)

const getRequestExpandedSize = () => (
  props.isCompactLayout ? props.layout.requestCompactExpandedSize : props.layout.requestDesktopExpandedSize
)

const getResponseExpandedSize = () => (
  props.isCompactLayout ? props.layout.responseCompactExpandedSize : props.layout.responseDesktopExpandedSize
)

const syncWorkbenchPanelStates = () => {
  if (requestWorkbenchPanel.value) {
    if (props.layout.requestPanelCollapsed) {
      requestWorkbenchPanel.value.collapse()
    } else {
      requestWorkbenchPanel.value.expand()
      requestWorkbenchPanel.value.resize(getRequestExpandedSize())
    }
  }

  if (responseWorkbenchPanel.value) {
    if (props.layout.responsePanelCollapsed) {
      responseWorkbenchPanel.value.collapse()
    } else {
      responseWorkbenchPanel.value.expand()
      responseWorkbenchPanel.value.resize(getResponseExpandedSize())
    }
  }
}

watch(
  () => ({
    ...props.layout,
    isCompactLayout: props.isCompactLayout,
  }),
  async () => {
    await nextTick()
    syncWorkbenchPanelStates()
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <Sheet :open="mobileExplorerOpen" @update:open="onUpdateMobileExplorerOpen">
    <SheetContent
      v-if="isCompactLayout"
      side="left"
      class="w-[min(92vw,360px)] border-[var(--zr-border)] bg-[var(--zr-panel-bg)] p-0 text-[var(--zr-text-primary)]"
      data-testid="mobile-explorer-sheet"
    >
      <SheetHeader class="border-b border-[var(--zr-border)] px-4 py-4 text-left">
        <SheetTitle class="text-base font-semibold text-[var(--zr-text-primary)]">
          {{ mobileExplorerTitle }}
        </SheetTitle>
        <SheetDescription class="text-sm text-[var(--zr-text-muted)]">
          {{ mobileExplorerDescription }}
        </SheetDescription>
      </SheetHeader>
      <BusySurface
        :busy="workbenchBusy"
        :title="workbenchBusyTitle"
        :description="workbenchBusyDescription"
        class="h-[calc(100%-4.5rem)]"
      >
        <div class="h-full p-1.5">
          <AppSidebar
            v-bind="sidebarProps"
            @select-request="sidebarHandlers.onSelectRequest"
            @create-request="sidebarHandlers.onCreateRequest"
            @create-collection="sidebarHandlers.onCreateCollection"
            @rename-collection="sidebarHandlers.onRenameCollection"
            @delete-collection="sidebarHandlers.onDeleteCollection"
            @delete-request="sidebarHandlers.onDeleteRequest"
            @select-history="sidebarHandlers.onSelectHistory"
            @remove-history="sidebarHandlers.onRemoveHistory"
            @clear-history="sidebarHandlers.onClearHistory"
            @update:search-query="sidebarHandlers.onUpdateSearchQuery"
          />
        </div>
      </BusySurface>
    </SheetContent>
  </Sheet>

  <BusySurface
    :busy="workbenchBusy"
    :title="workbenchBusyTitle"
    :description="workbenchBusyDescription"
    class="zr-workbench flex-1 min-h-0 px-1.5 pb-1.5"
    surface-test-id="workbench-busy-surface"
    overlay-test-id="workbench-busy-overlay"
  >
    <div data-testid="workbench-carrier" class="zr-workbench-carrier h-full min-h-0">
      <ResizablePanelGroup
        v-if="!isCompactLayout"
        data-testid="workbench-layout-desktop"
        direction="horizontal"
        class="zr-workbench-layout zr-workbench-layout-desktop relative h-full min-h-0 gap-[var(--zr-workbench-seam-gap)]"
      >
        <ResizablePanel :default-size="20" :min-size="16" class="h-full min-h-0 min-w-[252px]">
          <div
            data-testid="workbench-sidebar"
            class="zr-workbench-segment zr-workbench-segment-sidebar h-full min-h-0 overflow-hidden"
          >
            <AppSidebar
              v-bind="sidebarProps"
              @select-request="sidebarHandlers.onSelectRequest"
              @create-request="sidebarHandlers.onCreateRequest"
              @create-collection="sidebarHandlers.onCreateCollection"
              @rename-collection="sidebarHandlers.onRenameCollection"
              @delete-collection="sidebarHandlers.onDeleteCollection"
              @delete-request="sidebarHandlers.onDeleteRequest"
              @select-history="sidebarHandlers.onSelectHistory"
              @remove-history="sidebarHandlers.onRemoveHistory"
              @clear-history="sidebarHandlers.onClearHistory"
              @update:search-query="sidebarHandlers.onUpdateSearchQuery"
            />
          </div>
        </ResizablePanel>

        <ResizableHandle
          data-testid="workbench-seam-sidebar-request"
          class="zr-workbench-seam zr-workbench-seam-vertical w-[var(--zr-workbench-seam-size)]"
        />

        <ResizablePanel :default-size="80" class="h-full min-h-0 min-w-0">
          <ResizablePanelGroup
            data-testid="workbench-stack-desktop"
            direction="vertical"
            class="zr-workbench-layout zr-workbench-layout-stack h-full min-h-0 gap-[var(--zr-workbench-seam-gap)]"
          >
            <ResizablePanel
              ref="requestWorkbenchPanel"
              :default-size="layout.requestDesktopExpandedSize"
              :min-size="30"
              :collapsed-size="12"
              collapsible
              class="min-h-0"
              @resize="onRequestPanelResize"
              @collapse="onUpdateRequestPanelCollapsed(true)"
              @expand="onUpdateRequestPanelCollapsed(false)"
            >
              <div
                data-testid="workbench-request"
                class="zr-workbench-segment zr-workbench-segment-request h-full min-h-0 overflow-hidden"
              >
                <RequestPanel
                  v-bind="requestPanelProps"
                  @select-tab="requestPanelHandlers.onSelectTab"
                  @close-tab="requestPanelHandlers.onCloseTab"
                  @create-tab="requestPanelHandlers.onCreateTab"
                  @save-tab="requestPanelHandlers.onSaveTab"
                  @update-active-tab="requestPanelHandlers.onUpdateActiveTab"
                  @update-environment-variables="requestPanelHandlers.onUpdateEnvironmentVariables"
                  @send="requestPanelHandlers.onSend"
                  @save-request="requestPanelHandlers.onSaveRequest"
                  @import-workspace="requestPanelHandlers.onImportWorkspace"
                  @import-openapi="requestPanelHandlers.onImportOpenApi"
                  @import-curl="requestPanelHandlers.onImportCurl"
                  @export-workspace="requestPanelHandlers.onExportWorkspace"
                  @toggle-collapsed="requestPanelHandlers.onToggleCollapsed"
                />
              </div>
            </ResizablePanel>

            <ResizableHandle
              data-testid="workbench-seam-request-response"
              class="zr-workbench-seam zr-workbench-seam-horizontal h-[var(--zr-workbench-seam-size)]"
            />

            <ResizablePanel
              ref="responseWorkbenchPanel"
              :default-size="layout.responseDesktopExpandedSize"
              :min-size="10"
              :collapsed-size="12"
              collapsible
              class="min-h-0"
              @resize="onResponsePanelResize"
              @collapse="onUpdateResponsePanelCollapsed(true)"
              @expand="onUpdateResponsePanelCollapsed(false)"
            >
              <div
                data-testid="workbench-response"
                class="zr-workbench-segment zr-workbench-segment-response h-full min-h-0 overflow-hidden"
              >
                <ResponsePanel
                  v-bind="responsePanelProps"
                  @toggle-collapsed="responsePanelHandlers.onToggleCollapsed"
                  @create-mock-template="responsePanelHandlers.onCreateMockTemplate"
                  @copy-completed="responsePanelHandlers.onCopyCompleted"
                  @copy-failed="responsePanelHandlers.onCopyFailed"
                  @download-completed="responsePanelHandlers.onDownloadCompleted"
                  @download-failed="responsePanelHandlers.onDownloadFailed"
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ResizablePanelGroup
        v-else
        data-testid="workbench-layout-compact"
        direction="vertical"
        class="zr-workbench-layout zr-workbench-layout-compact relative h-full min-h-0 gap-[var(--zr-workbench-seam-gap)]"
      >
        <ResizablePanel
          ref="requestWorkbenchPanel"
          :default-size="layout.requestCompactExpandedSize"
          :min-size="32"
          :collapsed-size="18"
          collapsible
          class="min-h-0"
          @resize="onRequestPanelResize"
          @collapse="onUpdateRequestPanelCollapsed(true)"
          @expand="onUpdateRequestPanelCollapsed(false)"
        >
          <div
            data-testid="workbench-request"
            class="zr-workbench-segment zr-workbench-segment-request h-full min-h-0 overflow-hidden"
          >
            <RequestPanel
              v-bind="requestPanelProps"
              @select-tab="requestPanelHandlers.onSelectTab"
              @close-tab="requestPanelHandlers.onCloseTab"
              @create-tab="requestPanelHandlers.onCreateTab"
              @save-tab="requestPanelHandlers.onSaveTab"
              @update-active-tab="requestPanelHandlers.onUpdateActiveTab"
              @update-environment-variables="requestPanelHandlers.onUpdateEnvironmentVariables"
              @send="requestPanelHandlers.onSend"
              @save-request="requestPanelHandlers.onSaveRequest"
              @import-workspace="requestPanelHandlers.onImportWorkspace"
              @import-openapi="requestPanelHandlers.onImportOpenApi"
              @import-curl="requestPanelHandlers.onImportCurl"
              @export-workspace="requestPanelHandlers.onExportWorkspace"
              @toggle-collapsed="requestPanelHandlers.onToggleCollapsed"
            />
          </div>
        </ResizablePanel>

        <ResizableHandle
          data-testid="workbench-seam-request-response"
          class="zr-workbench-seam zr-workbench-seam-horizontal h-[var(--zr-workbench-seam-size)]"
        />

        <ResizablePanel
          ref="responseWorkbenchPanel"
          :default-size="layout.responseCompactExpandedSize"
          :min-size="14"
          :collapsed-size="18"
          collapsible
          class="min-h-0"
          @resize="onResponsePanelResize"
          @collapse="onUpdateResponsePanelCollapsed(true)"
          @expand="onUpdateResponsePanelCollapsed(false)"
        >
          <div
            data-testid="workbench-response"
            class="zr-workbench-segment zr-workbench-segment-response h-full min-h-0 overflow-hidden"
          >
            <ResponsePanel
              v-bind="responsePanelProps"
              @toggle-collapsed="responsePanelHandlers.onToggleCollapsed"
              @create-mock-template="responsePanelHandlers.onCreateMockTemplate"
              @copy-completed="responsePanelHandlers.onCopyCompleted"
              @copy-failed="responsePanelHandlers.onCopyFailed"
              @download-completed="responsePanelHandlers.onDownloadCompleted"
              @download-failed="responsePanelHandlers.onDownloadFailed"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  </BusySurface>
</template>
