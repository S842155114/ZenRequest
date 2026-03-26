<script setup lang="ts">
defineOptions({
  name: 'AppToastList',
})

defineProps<{
  items: Array<{
    id: string
    title: string
    description?: string
    tone?: 'info' | 'success' | 'error'
  }>
}>()

const emit = defineEmits<{
  (e: 'dismiss', id: string): void
}>()
</script>

<template>
  <teleport to="body">
    <div class="pointer-events-none fixed right-4 top-20 z-[60] flex w-full max-w-sm flex-col gap-3">
      <div
        v-for="item in items"
        :key="item.id"
        :class="[
          'pointer-events-auto zr-panel rounded-xl border px-4 py-3 shadow-[var(--zr-shadow)]',
          item.tone === 'success' && 'border-emerald-400/25',
          item.tone === 'error' && 'border-rose-400/25',
          (!item.tone || item.tone === 'info') && 'border-[color:var(--zr-border)]'
        ]"
      >
        <div class="flex items-start gap-3">
          <div
            :class="[
              'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
              item.tone === 'success' && 'bg-emerald-400',
              item.tone === 'error' && 'bg-rose-400',
              (!item.tone || item.tone === 'info') && 'bg-[#ff8b5f]'
            ]"
          />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-[var(--zr-text-primary)]">{{ item.title }}</div>
            <div v-if="item.description" class="mt-1 text-sm leading-6 text-[var(--zr-text-muted)]">{{ item.description }}</div>
          </div>
          <button
            class="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--zr-text-muted)] transition-colors hover:bg-[var(--zr-soft-hover)] hover:text-[var(--zr-text-primary)]"
            @click="emit('dismiss', item.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>
