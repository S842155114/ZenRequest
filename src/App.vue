<script setup lang="ts">
import { AppHeader, AppToastList, WorkspaceDialog } from '@/components/layout'
import { StartupScreen, WorkbenchShell, useAppShell } from '@/features/app-shell'

defineOptions({
  name: 'App',
})

const {
  activeEnvironmentId,
  activeWorkspace,
  closeDialog,
  dismissToast,
  handleCreateEnvironment,
  handleCreateWorkspace,
  handleDeleteEnvironment,
  handleDeleteWorkspace,
  handleDialogSecondaryAction,
  handleDialogSubmit,
  handleRenameEnvironment,
  handleRequestPanelResize,
  handleResponsePanelResize,
  handleToggleNavigation,
  handleWorkspaceChange,
  handleWorkspaceImportChange,
  headerBindings,
  isCompactLayout,
  isStartupLoading,
  isStartupReady,
  locale,
  mobileExplorerOpen,
  requestPanelHandlers,
  requestPanelProps,
  responsePanelHandlers,
  responsePanelProps,
  runStartupBootstrap,
  setMobileExplorerOpen,
  setRequestPanelCollapsed,
  setResponsePanelCollapsed,
  sidebarHandlers,
  sidebarProps,
  startupErrorMessage,
  text,
  themeMode,
  toasts,
  workbenchBusy,
  workbenchLayout,
  workspaceDialogProps,
  workspaceImportInput,
} = useAppShell()
</script>

<template>
  <div class="zr-shell relative flex h-screen w-screen flex-col overflow-hidden bg-transparent text-foreground">
    <div class="zr-app-glow pointer-events-none absolute inset-0 opacity-80" />

    <StartupScreen
      v-if="!isStartupReady"
      :messages="text"
      :is-loading="isStartupLoading"
      :error-message="startupErrorMessage"
      @retry="runStartupBootstrap"
    />

    <template v-else>
      <input
        ref="workspaceImportInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="handleWorkspaceImportChange"
      >

      <AppHeader
        v-bind="headerBindings"
        @update:locale="locale = $event"
        @update:theme-mode="themeMode = $event"
        @update:active-workspace-id="handleWorkspaceChange"
        @update:active-environment-id="activeEnvironmentId = $event"
        @create-workspace="handleCreateWorkspace"
        @delete-workspace="handleDeleteWorkspace"
        @create-environment="handleCreateEnvironment"
        @rename-environment="handleRenameEnvironment"
        @delete-environment="handleDeleteEnvironment"
        @toggle-navigation="handleToggleNavigation"
      />

      <WorkbenchShell
        :sidebar-props="sidebarProps"
        :sidebar-handlers="sidebarHandlers"
        :request-panel-props="requestPanelProps"
        :request-panel-handlers="requestPanelHandlers"
        :response-panel-props="responsePanelProps"
        :response-panel-handlers="responsePanelHandlers"
        :layout="workbenchLayout"
        :is-compact-layout="isCompactLayout"
        :mobile-explorer-open="mobileExplorerOpen"
        :mobile-explorer-title="text.header.openExplorer"
        :mobile-explorer-description="activeWorkspace?.name ?? text.common.workspace"
        :workbench-busy="workbenchBusy"
        :workbench-busy-title="text.busy.workspaceLoadingTitle"
        :workbench-busy-description="text.busy.workspaceLoadingDescription"
        :on-update-mobile-explorer-open="setMobileExplorerOpen"
        :on-request-panel-resize="handleRequestPanelResize"
        :on-response-panel-resize="handleResponsePanelResize"
        :on-update-request-panel-collapsed="setRequestPanelCollapsed"
        :on-update-response-panel-collapsed="setResponsePanelCollapsed"
      />

      <WorkspaceDialog
        v-bind="workspaceDialogProps"
        @close="closeDialog"
        @secondary-action="handleDialogSecondaryAction"
        @submit="handleDialogSubmit"
      />
    </template>

    <AppToastList :items="toasts" @dismiss="dismissToast" />
  </div>
</template>
