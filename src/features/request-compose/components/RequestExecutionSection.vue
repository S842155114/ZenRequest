<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMessages } from '@/lib/i18n'
import type { RequestExecutionOptions, RequestProxyMode, RequestRedirectPolicy } from '@/types/request'

type RequestMessages = ReturnType<typeof getMessages>['request']

defineProps<{
  requestText: RequestMessages
  executionInvalidCount: number
  onSetTimeout: (value: string | number) => void
  onSetRedirectPolicy: (value: RequestRedirectPolicy) => void
  onSetProxyMode: (value: RequestProxyMode) => void
  onSetProxyUrl: (value: string | number) => void
  onSetVerifySsl: (value: boolean) => void
}>()

const executionOptions = defineModel<RequestExecutionOptions>('executionOptions', { required: true })
</script>

<template>
  <div class="space-y-3">
    <div class="zr-code-panel rounded-lg p-3">
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-2">
          <label class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.executionTimeout }}</label>
          <Input
            data-testid="request-execution-timeout"
            :model-value="executionOptions.timeoutMs === undefined ? '' : String(executionOptions.timeoutMs)"
            class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
            :placeholder="requestText.executionTimeoutPlaceholder"
            @update:model-value="onSetTimeout"
          />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.executionRedirectPolicy }}</label>
          <select
            data-testid="request-execution-redirect-policy"
            :model-value="executionOptions.redirectPolicy"
            class="zr-input h-9 w-full rounded-lg px-3 text-xs shadow-none outline-none"
            @change="onSetRedirectPolicy(($event.target as HTMLSelectElement).value as RequestRedirectPolicy)"
          >
            <option value="follow">{{ requestText.executionRedirectFollow }}</option>
            <option value="manual">{{ requestText.executionRedirectManual }}</option>
            <option value="error">{{ requestText.executionRedirectError }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="zr-code-panel rounded-lg p-3">
      <div class="mb-2.5 flex items-center gap-1.5">
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', executionOptions.proxy.mode === 'inherit' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetProxyMode('inherit')">{{ requestText.executionProxyInherit }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', executionOptions.proxy.mode === 'off' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetProxyMode('off')">{{ requestText.executionProxyOff }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', executionOptions.proxy.mode === 'custom' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetProxyMode('custom')">{{ requestText.executionProxyCustom }}</Button>
      </div>

      <div v-if="executionOptions.proxy.mode === 'custom'" class="space-y-2">
        <label class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.executionProxyUrl }}</label>
        <Input
          data-testid="request-execution-proxy-url"
          :model-value="executionOptions.proxy.mode === 'custom' ? executionOptions.proxy.url : ''"
          class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
          :placeholder="requestText.executionProxyUrlPlaceholder"
          @update:model-value="onSetProxyUrl"
        />
      </div>
    </div>

    <div class="zr-code-panel rounded-lg p-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.executionVerifySsl }}</div>
          <div class="mt-1 text-xs text-[var(--zr-text-secondary)]">{{ requestText.executionVerifySslHint }}</div>
        </div>
        <button
          data-testid="request-execution-verify-ssl"
          :data-state="executionOptions.verifySsl ? 'on' : 'off'"
          class="zr-toggle-badge"
          type="button"
          @click="onSetVerifySsl(!executionOptions.verifySsl)"
        >
          <span class="zr-toggle-dot" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      v-if="executionInvalidCount > 0"
      data-testid="request-execution-error"
      class="rounded-lg border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
    >
      {{ requestText.executionInvalid }}
    </div>
  </div>
</template>
