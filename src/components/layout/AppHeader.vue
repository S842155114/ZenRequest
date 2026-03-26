<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
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
  Languages,
  Laptop,
  Menu,
  MoonStar,
  PanelsTopLeft,
  Settings2,
  SunMedium,
  Workflow,
} from 'lucide-vue-next'

defineOptions({
  name: 'AppHeader',
})

const props = defineProps<{
  locale: AppLocale
  themeMode: ThemeMode
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  canDeleteWorkspace: boolean
  environments: EnvironmentPreset[]
  activeEnvironmentId: string
  openTabCount: number
  isCompactLayout?: boolean
  workspaceBusy?: boolean
}>()

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

const activeThemeIcon = computed(() => {
  if (props.themeMode === 'light') return SunMedium
  if (props.themeMode === 'system') return Laptop
  return MoonStar
})

const text = computed(() => getMessages(props.locale))

const activeWorkspaceName = computed(() => (
  props.workspaces.find((workspace) => workspace.id === props.activeWorkspaceId)?.name
  ?? text.value.header.localWorkspace
))
</script>

<template>
  <TooltipProvider>
    <header class="zr-shell-header relative z-10 mx-1.5 mt-1.5 flex h-12 items-center gap-2 rounded-[0.625rem] px-2.5 md:px-3">
      <div class="flex min-w-0 items-center gap-2.5">
        <Tooltip v-if="isCompactLayout">
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="zr-tool-button h-8 w-8 rounded-md"
              :aria-label="text.header.openExplorer"
              @click="emit('toggle-navigation')"
            >
              <Menu class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ text.header.openExplorer }}</TooltipContent>
        </Tooltip>

        <div class="zr-brand-badge">ZR</div>

        <div class="hidden min-w-0 sm:block">
          <div class="truncate text-[13px] font-semibold leading-none tracking-[0.01em] text-[var(--zr-text-primary)]">
            {{ text.header.appName }}
          </div>
          <div class="mt-0.5 truncate text-[9px] uppercase tracking-[0.14em] text-[var(--zr-text-muted)]">
            {{ activeWorkspaceName }}
          </div>
        </div>
      </div>

      <div class="ml-auto flex min-w-0 items-center gap-2">
        <div class="hidden items-center gap-2 lg:flex">
          <div class="zr-toolbar-chip flex items-center gap-1.5 rounded-md px-1.5">
            <PanelsTopLeft class="h-3.5 w-3.5 text-[#ff8b5f]" />
            <Select :model-value="activeWorkspaceId" :disabled="workspaceBusy" @update:model-value="emit('update:active-workspace-id', String($event))">
              <SelectTrigger :disabled="workspaceBusy" class="h-7 min-w-[132px] border-0 bg-transparent px-1 text-[11px] font-medium text-[var(--zr-text-primary)] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent class="zr-dropdown">
                <SelectItem v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
                  {{ workspace.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Separator orientation="vertical" class="h-5 bg-[var(--zr-border)]" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md" :disabled="workspaceBusy">
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

          <div class="zr-toolbar-chip flex items-center gap-1.5 rounded-md px-1.5">
            <Workflow class="h-3.5 w-3.5 text-[#ff8b5f]" />
            <Select :model-value="activeEnvironmentId" @update:model-value="emit('update:active-environment-id', String($event))">
              <SelectTrigger class="h-7 min-w-[128px] border-0 bg-transparent px-1 text-[11px] font-medium text-[var(--zr-text-primary)] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent class="zr-dropdown">
                <SelectItem v-for="environment in environments" :key="environment.id" :value="environment.id">
                  {{ environment.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Separator orientation="vertical" class="h-5 bg-[var(--zr-border)]" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon-sm" class="zr-tool-button h-7 w-7 rounded-md">
                  <Ellipsis class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="zr-dropdown min-w-[190px]">
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

        <!-- <div class="zr-toolbar-chip hidden items-center gap-2 rounded-md px-2.5 md:flex">
          <span class="text-[10px] uppercase tracking-[0.14em] text-[var(--zr-text-muted)]">
            {{ text.header.tabs(openTabCount) }}
          </span>
        </div> -->

        <Select :model-value="locale" @update:model-value="emit('update:locale', $event as AppLocale)">
          <SelectTrigger class="zr-select-shell h-8 w-[98px] rounded-md px-2.5 text-[11px] font-medium text-[var(--zr-text-primary)]">
            <div class="flex items-center gap-2">
              <Languages class="h-3 w-3 text-[#ff8b5f]" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent class="zr-dropdown">
            <SelectItem value="en">{{ text.header.language.english }}</SelectItem>
            <SelectItem value="zh-CN">{{ text.header.language.chinese }}</SelectItem>
          </SelectContent>
        </Select>

        <Select :model-value="themeMode" @update:model-value="emit('update:theme-mode', $event as ThemeMode)">
          <SelectTrigger class="zr-select-shell h-8 w-[104px] rounded-md px-2.5 text-[11px] font-medium text-[var(--zr-text-primary)]">
            <div class="flex items-center gap-2">
              <component :is="activeThemeIcon" class="h-3 w-3 text-[#ff8b5f]" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent class="zr-dropdown">
            <SelectItem value="dark">{{ text.header.theme.dark }}</SelectItem>
            <SelectItem value="light">{{ text.header.theme.light }}</SelectItem>
            <SelectItem value="system">{{ text.header.theme.system }}</SelectItem>
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="zr-tool-button h-8 w-8 rounded-md">
              <Settings2 class="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ text.header.settings }}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  </TooltipProvider>
</template>
