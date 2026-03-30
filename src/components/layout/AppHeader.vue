<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getMessages } from '@/lib/i18n'
import type { AppLocale, EnvironmentPreset, ThemeMode, WorkspaceSummary } from '@/types/request'
import {
  Ellipsis,
  Menu,
  PanelsTopLeft,
  Settings2,
  Workflow,
} from 'lucide-vue-next'

defineOptions({
  name: 'AppHeader',
})

const props = withDefaults(defineProps<{
  locale: AppLocale
  themeMode: ThemeMode
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  canDeleteWorkspace: boolean
  environments: EnvironmentPreset[]
  activeEnvironmentId: string
  isCompactLayout?: boolean
  workspaceBusy?: boolean
}>(), {
  isCompactLayout: false,
  workspaceBusy: false,
})

const emit = defineEmits<{
  (e: 'update:locale', value: AppLocale): void
  (e: 'update:theme-mode', value: ThemeMode): void
  (e: 'update:active-workspace-id', value: string): void
  (e: 'update:active-environment-id', value: string): void
  (e: 'create-workspace'): void
  (e: 'delete-workspace'): void
  (e: 'create-environment'): void
  (e: 'rename-environment'): void
  (e: 'delete-environment'): void
  (e: 'toggle-navigation'): void
}>()

const settingsSheetOpen = ref(false)

const text = computed(() => getMessages(props.locale))

const activeWorkspaceName = computed(() => (
  props.workspaces.find((workspace) => workspace.id === props.activeWorkspaceId)?.name
  ?? text.value.header.localWorkspace
))

const countEnabledVariables = (environment?: EnvironmentPreset) => (environment?.variables ?? [])
  .filter((item) => item.enabled && item.key.trim().length > 0)
  .length

const activeEnvironment = computed(() => (
  props.environments.find((environment) => environment.id === props.activeEnvironmentId)
  ?? props.environments[0]
))

const activeEnvironmentName = computed(() => (
  activeEnvironment.value?.name
  ?? text.value.common.environment
))

const activeEnvironmentVariableCount = computed(() => countEnabledVariables(activeEnvironment.value))
const workspaceContextDisabled = computed(() => Boolean(props.workspaceBusy))

watch(() => props.isCompactLayout, (isCompactLayout) => {
  if (!isCompactLayout) {
    settingsSheetOpen.value = false
  }
})
</script>

<template>
  <TooltipProvider>
    <Sheet :open="settingsSheetOpen" @update:open="settingsSheetOpen = $event">
      <header
        data-testid="header-shell"
        class="zr-shell-header zr-header-shell relative z-10 mx-1.5 mt-1.5 flex h-12 items-center gap-2 overflow-hidden rounded-[0.625rem] px-2.5 md:px-3"
      >
        <div
          data-testid="header-brand-zone"
          class="zr-header-zone zr-header-brand-zone flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <Tooltip v-if="isCompactLayout">
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                class="zr-tool-button h-8 w-8 rounded-md"
                :aria-label="text.header.openExplorer"
                data-testid="header-nav-toggle"
                @click="emit('toggle-navigation')"
              >
                <Menu class="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ text.header.openExplorer }}</TooltipContent>
          </Tooltip>

          <div
            v-if="isCompactLayout"
            data-testid="header-brand-compact-mark"
            class="zr-brand-compact-mark"
          >
            ZR
          </div>

          <div v-else class="min-w-0">
            <div
              data-testid="header-brand-wordmark"
              class="zr-brand-wordmark truncate"
            >
              {{ text.header.appName }}
            </div>
            <div class="zr-brand-context mt-0.5 truncate">
              {{ activeWorkspaceName }}
            </div>
          </div>
        </div>

        <div
          data-testid="header-context-zone"
          class="zr-header-zone zr-header-context-zone flex min-w-0 flex-1 items-center justify-end gap-1.5 md:justify-center md:gap-2"
        >
          <div
            data-testid="header-workspace-switcher"
            class="zr-toolbar-chip zr-header-context-card flex min-w-0 items-center gap-1 rounded-md px-1.5"
          >
            <PanelsTopLeft class="h-3.5 w-3.5 shrink-0 text-[#ff8b5f]" />
            <Select
              :model-value="activeWorkspaceId"
              :disabled="workspaceContextDisabled"
              @update:model-value="emit('update:active-workspace-id', String($event))"
            >
              <SelectTrigger
                :disabled="workspaceContextDisabled"
                data-testid="header-workspace-trigger"
                :class="[
                  'h-7 min-w-0 border-0 bg-transparent px-1 text-[11px] font-medium text-[var(--zr-text-primary)] shadow-none focus:ring-0',
                  isCompactLayout ? 'max-w-[8.5rem]' : 'max-w-[13rem] md:max-w-[14rem] xl:max-w-[16rem]',
                ]"
              >
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="hidden text-[9px] uppercase tracking-[0.14em] text-[var(--zr-text-muted)] xl:block">
                    {{ text.header.workspace }}
                  </span>
                  <span class="truncate">{{ activeWorkspaceName }}</span>
                </div>
              </SelectTrigger>
              <SelectContent class="zr-dropdown min-w-[220px]">
                <SelectItem v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
                  <span class="block truncate">{{ workspace.name }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="zr-toolbar-action-button ml-0.5 h-7 w-7 rounded-[0.55rem]"
                  :aria-label="text.header.workspaceActions"
                  :disabled="workspaceContextDisabled"
                  data-testid="header-workspace-actions"
                >
                  <Ellipsis class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="zr-dropdown min-w-[190px]">
                <DropdownMenuItem @select="emit('create-workspace')">
                  {{ text.dialogs.createWorkspace.title }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem :disabled="!canDeleteWorkspace" @select="emit('delete-workspace')">
                  {{ text.dialogs.deleteWorkspace.title }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            data-testid="header-environment-switcher"
            class="zr-toolbar-chip zr-header-context-card flex min-w-0 items-center gap-1 rounded-md px-1.5"
          >
            <Workflow class="h-3.5 w-3.5 shrink-0 text-[#ff8b5f]" />
            <Select
              :model-value="activeEnvironmentId"
              :disabled="workspaceContextDisabled"
              @update:model-value="emit('update:active-environment-id', String($event))"
            >
              <SelectTrigger
                :disabled="workspaceContextDisabled"
                data-testid="header-environment-trigger"
                :class="[
                  'h-7 min-w-0 border-0 bg-transparent px-1 text-[11px] font-medium text-[var(--zr-text-primary)] shadow-none focus:ring-0',
                  isCompactLayout ? 'max-w-[10.5rem]' : 'max-w-[14rem] md:max-w-[15rem] xl:max-w-[18rem]',
                ]"
              >
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="hidden text-[9px] uppercase tracking-[0.14em] text-[var(--zr-text-muted)] xl:block">
                    {{ text.common.environment }}
                  </span>
                  <span class="truncate">{{ activeEnvironmentName }}</span>
                  <span class="shrink-0 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] leading-4 text-[var(--zr-text-secondary)]">
                    {{ text.header.vars(activeEnvironmentVariableCount) }}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent class="zr-dropdown min-w-[240px]">
                <SelectItem
                  v-for="environment in environments"
                  :key="environment.id"
                  :value="environment.id"
                >
                  <div class="flex min-w-0 items-center justify-between gap-3">
                    <span class="truncate">{{ environment.name }}</span>
                    <span class="shrink-0 text-[10px] text-[var(--zr-text-muted)]">
                      {{ text.header.vars(countEnabledVariables(environment)) }}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="zr-toolbar-action-button ml-0.5 h-7 w-7 rounded-[0.55rem]"
                  :aria-label="text.header.environmentActions"
                  :disabled="workspaceContextDisabled"
                  data-testid="header-environment-actions"
                >
                  <Ellipsis class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="zr-dropdown min-w-[200px]">
                <DropdownMenuItem @select="emit('create-environment')">
                  {{ text.dialogs.createEnvironment.title }}
                </DropdownMenuItem>
                <DropdownMenuItem @select="emit('rename-environment')">
                  {{ text.dialogs.renameEnvironment.title }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @select="emit('delete-environment')">
                  {{ text.dialogs.deleteEnvironment.title }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          data-testid="header-utilities-zone"
          class="zr-header-zone zr-header-utility-zone flex shrink-0 items-center gap-1.5"
        >
          <template v-if="!isCompactLayout">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="zr-tool-button h-8 w-8 rounded-md"
                  :aria-label="text.header.openSettings"
                  data-testid="header-settings-trigger"
                >
                  <Settings2 class="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="zr-dropdown w-[240px] p-1"
                data-testid="header-settings-menu"
              >
                <DropdownMenuLabel class="px-2 py-1.5 text-xs font-semibold text-[var(--zr-text-primary)]">
                  {{ text.header.settings }}
                </DropdownMenuLabel>
                <div class="px-2 pb-2 text-[11px] leading-5 text-[var(--zr-text-muted)]">
                  {{ text.header.settingsDescription }}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel class="px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--zr-text-muted)]">
                  {{ text.header.languageLabel }}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  :model-value="locale"
                  @update:model-value="emit('update:locale', $event as AppLocale)"
                >
                  <DropdownMenuRadioItem value="en">
                    {{ text.header.language.english }}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zh-CN">
                    {{ text.header.language.chinese }}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel class="px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--zr-text-muted)]">
                  {{ text.header.themeLabel }}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  :model-value="themeMode"
                  @update:model-value="emit('update:theme-mode', $event as ThemeMode)"
                >
                  <DropdownMenuRadioItem value="dark">
                    {{ text.header.theme.dark }}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light">
                    {{ text.header.theme.light }}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    {{ text.header.theme.system }}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>

          <template v-else>
            <Button
              variant="ghost"
              size="icon-sm"
              class="zr-tool-button h-8 w-8 rounded-md"
              :aria-label="text.header.openSettings"
              data-testid="header-settings-trigger"
              @click="settingsSheetOpen = true"
            >
              <Settings2 class="h-3.5 w-3.5" />
            </Button>
          </template>
        </div>
      </header>

      <SheetContent
        v-if="isCompactLayout && settingsSheetOpen"
        side="right"
        class="w-[min(92vw,320px)] border-[var(--zr-border)] bg-[var(--zr-panel-bg)] p-0 text-[var(--zr-text-primary)]"
        data-testid="header-settings-sheet"
      >
        <SheetHeader class="border-b border-[var(--zr-border)] px-4 py-4 text-left">
          <SheetTitle class="text-base font-semibold text-[var(--zr-text-primary)]">
            {{ text.header.settings }}
          </SheetTitle>
          <SheetDescription class="text-sm text-[var(--zr-text-muted)]">
            {{ text.header.settingsDescription }}
          </SheetDescription>
        </SheetHeader>

        <div class="space-y-5 px-4 py-4">
          <section>
            <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
              {{ text.header.languageLabel }}
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <Button
                data-testid="header-settings-locale-en"
                :variant="locale === 'en' ? 'secondary' : 'ghost'"
                :class="[
                  'h-9 rounded-md text-xs',
                  locale === 'en' ? 'zr-tab-button-active' : 'zr-tool-button',
                ]"
                @click="emit('update:locale', 'en')"
              >
                {{ text.header.language.english }}
              </Button>
              <Button
                data-testid="header-settings-locale-zh-CN"
                :variant="locale === 'zh-CN' ? 'secondary' : 'ghost'"
                :class="[
                  'h-9 rounded-md text-xs',
                  locale === 'zh-CN' ? 'zr-tab-button-active' : 'zr-tool-button',
                ]"
                @click="emit('update:locale', 'zh-CN')"
              >
                {{ text.header.language.chinese }}
              </Button>
            </div>
          </section>

          <section>
            <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
              {{ text.header.themeLabel }}
            </div>
            <div class="mt-2 grid grid-cols-3 gap-2">
              <Button
                data-testid="header-settings-theme-dark"
                :variant="themeMode === 'dark' ? 'secondary' : 'ghost'"
                :class="[
                  'h-9 rounded-md text-xs',
                  themeMode === 'dark' ? 'zr-tab-button-active' : 'zr-tool-button',
                ]"
                @click="emit('update:theme-mode', 'dark')"
              >
                {{ text.header.theme.dark }}
              </Button>
              <Button
                data-testid="header-settings-theme-light"
                :variant="themeMode === 'light' ? 'secondary' : 'ghost'"
                :class="[
                  'h-9 rounded-md text-xs',
                  themeMode === 'light' ? 'zr-tab-button-active' : 'zr-tool-button',
                ]"
                @click="emit('update:theme-mode', 'light')"
              >
                {{ text.header.theme.light }}
              </Button>
              <Button
                data-testid="header-settings-theme-system"
                :variant="themeMode === 'system' ? 'secondary' : 'ghost'"
                :class="[
                  'h-9 rounded-md text-xs',
                  themeMode === 'system' ? 'zr-tab-button-active' : 'zr-tool-button',
                ]"
                @click="emit('update:theme-mode', 'system')"
              >
                {{ text.header.theme.system }}
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  </TooltipProvider>
</template>
