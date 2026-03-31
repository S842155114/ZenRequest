<script setup lang="ts">
import CodeEditorSurface from '@/components/code/CodeEditorSurface.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMessages } from '@/lib/i18n'
import type { KeyValueItem, RequestMockState } from '@/types/request'

type RequestMessages = ReturnType<typeof getMessages>['request']

defineProps<{
  requestText: RequestMessages
  onToggleMockEnabled: () => void
  onUpdateMockStatus: (value: string | number) => void
  onUpdateMockStatusText: (value: string | number) => void
  onUpdateMockContentType: (value: string | number) => void
  onUpdateMockBody: (value: string) => void
  onToggleMockHeader: (index: number) => void
  onUpdateMockHeader: (index: number, patch: Partial<KeyValueItem>) => void
  onAddMockHeader: () => void
  onRemoveMockHeader: (index: number) => void
}>()

const mock = defineModel<RequestMockState | undefined>('mock', { required: true })
</script>

<template>
  <div class="zr-code-panel flex min-h-[18rem] flex-col gap-3 rounded-lg p-3">
    <template v-if="mock">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.mock }}</div>
          <div class="mt-1 text-xs text-[var(--zr-text-secondary)]">{{ requestText.mockEnabled }}</div>
        </div>
        <button
          data-testid="request-mock-enabled"
          :data-state="mock.enabled ? 'on' : 'off'"
          class="zr-toggle-badge"
          type="button"
          @click="onToggleMockEnabled"
        >
          <span class="zr-toggle-dot" aria-hidden="true" />
        </button>
      </div>

      <div class="grid gap-2.5 md:grid-cols-3">
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.mockStatus }}</div>
          <Input
            data-testid="request-mock-status"
            :model-value="String(mock.status)"
            class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
            @update:model-value="onUpdateMockStatus"
          />
        </div>
        <div class="space-y-2 md:col-span-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.mockStatusText }}</div>
          <Input
            data-testid="request-mock-status-text"
            :model-value="mock.statusText"
            class="zr-input h-9 rounded-lg text-xs shadow-none"
            @update:model-value="onUpdateMockStatusText"
          />
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.mockContentType }}</div>
        <Input
          data-testid="request-mock-content-type"
          :model-value="mock.contentType"
          class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
          @update:model-value="onUpdateMockContentType"
        />
      </div>

      <div class="space-y-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.mockHeaders }}</div>
        <div class="overflow-hidden rounded-lg border border-[color:var(--zr-border)]">
          <table class="w-full text-xs">
            <thead class="bg-[var(--zr-soft-bg)] text-left text-xs text-[var(--zr-text-muted)]">
              <tr>
                <th class="w-10 text-center"></th>
                <th class="w-[35%] px-3 py-2.5 font-medium">{{ requestText.key }}</th>
                <th class="w-[45%] px-3 py-2.5 font-medium">{{ requestText.value }}</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(header, idx) in mock.headers"
                :key="idx"
                class="group border-t border-[color:var(--zr-border-soft)] first:border-t-0"
              >
                <td class="px-3 py-1.5 align-top text-center">
                  <div class="flex h-9 items-center justify-center">
                    <button
                      :data-testid="`request-mock-row-toggle-${idx}`"
                      :data-state="header.enabled ? 'on' : 'off'"
                      class="zr-toggle-badge"
                      type="button"
                      @click="onToggleMockHeader(idx)"
                    >
                      <span class="zr-toggle-dot" aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td class="px-3 py-1.5 align-top">
                  <Input
                    :model-value="header.key"
                    class="zr-input h-9 rounded-lg text-xs font-mono shadow-none"
                    @update:model-value="onUpdateMockHeader(idx, { key: String($event) })"
                  />
                </td>
                <td class="px-3 py-1.5 align-top">
                  <Input
                    :model-value="header.value"
                    class="zr-input h-9 rounded-lg text-xs font-mono shadow-none"
                    @update:model-value="onUpdateMockHeader(idx, { value: String($event) })"
                  />
                </td>
                <td class="px-3 py-1.5 align-top">
                  <div class="flex h-9 items-center justify-center">
                    <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="onRemoveMockHeader(idx)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="mock.headers.length === 0">
                <td colspan="4" class="px-3 py-4 text-center text-xs text-[var(--zr-text-muted)]">{{ requestText.mockHeaders }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="ghost" size="sm" class="zr-dashed-button rounded-lg text-xs" @click="onAddMockHeader">
          {{ requestText.addMockHeader }}
        </Button>
      </div>

      <div class="flex min-h-[14rem] flex-1 flex-col gap-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.mockBody }}</div>
        <div class="zr-code-panel flex min-h-[14rem] flex-1 overflow-hidden rounded-lg">
          <CodeEditorSurface
            test-id="request-mock-body-editor"
            :content="mock.body"
            :language="mock.contentType.includes('json') ? 'json' : 'text'"
            :read-only="false"
            @update:content="onUpdateMockBody"
          />
        </div>
      </div>
    </template>

    <div
      v-else
      class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center text-xs text-[var(--zr-text-muted)]"
    >
      {{ requestText.mockEmpty }}
    </div>
  </div>
</template>
