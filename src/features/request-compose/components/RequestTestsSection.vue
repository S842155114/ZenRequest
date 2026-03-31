<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMessages } from '@/lib/i18n'
import type { RequestTestDefinition } from '@/types/request'

type RequestMessages = ReturnType<typeof getMessages>['request']

defineProps<{
  requestText: RequestMessages
  onAddTest: () => void
  onRemoveTest: (index: number) => void
}>()

const tests = defineModel<RequestTestDefinition[]>('tests', { required: true })
</script>

<template>
  <div class="space-y-2.5">
    <div
      v-for="(test, idx) in tests"
      :key="test.id"
      class="zr-code-panel rounded-lg p-3"
    >
      <div class="flex items-center justify-between gap-2.5">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
          {{ requestText.testCase }} {{ idx + 1 }}
        </div>
        <button class="text-[var(--zr-text-muted)] transition-colors hover:text-rose-300" @click="onRemoveTest(idx)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
        </button>
      </div>

      <div class="mt-2.5 grid gap-2.5 md:grid-cols-2">
        <div class="space-y-2 md:col-span-2">
          <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ requestText.testName }}</label>
          <Input v-model="test.name" class="zr-input h-9 rounded-lg text-xs shadow-none" />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ requestText.source }}</label>
          <select v-model="test.source" class="zr-input h-9 w-full rounded-lg px-3 text-xs shadow-none outline-none">
            <option value="status">{{ requestText.sourceStatus }}</option>
            <option value="header">{{ requestText.sourceHeader }}</option>
            <option value="body">{{ requestText.sourceBody }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ requestText.operator }}</label>
          <select v-model="test.operator" class="zr-input h-9 w-full rounded-lg px-3 text-xs shadow-none outline-none">
            <option value="equals">{{ requestText.operatorEquals }}</option>
            <option value="contains">{{ requestText.operatorContains }}</option>
            <option value="exists">{{ requestText.operatorExists }}</option>
          </select>
        </div>

        <div v-if="test.source === 'header'" class="space-y-2">
          <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ requestText.target }}</label>
          <Input v-model="test.target" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="requestText.headerName" />
        </div>

        <div v-if="test.operator !== 'exists'" :class="['space-y-2', test.source === 'header' ? '' : 'md:col-span-2']">
          <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ requestText.expected }}</label>
          <Input v-model="test.expected" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="requestText.expectedValue" />
        </div>
      </div>
    </div>

    <div v-if="tests.length === 0" class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center text-xs text-[var(--zr-text-muted)]">
      {{ requestText.noTestsConfigured }}
    </div>

    <Button variant="ghost" size="sm" class="zr-dashed-button rounded-lg text-xs" @click="onAddTest">
      {{ requestText.addTest }}
    </Button>
  </div>
</template>
