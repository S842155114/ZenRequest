<script setup lang="ts">
defineOptions({
  name: 'BusySurface',
})

withDefaults(defineProps<{
  busy?: boolean
  title: string
  description?: string
  surfaceTestId?: string
  overlayTestId?: string
}>(), {
  busy: false,
  description: '',
  surfaceTestId: undefined,
  overlayTestId: undefined,
})
</script>

<template>
  <div
    :data-testid="surfaceTestId"
    :aria-busy="busy ? 'true' : 'false'"
    class="relative h-full min-h-0"
  >
    <div
      :inert="busy || undefined"
      :class="[
        'h-full min-h-0',
        busy ? 'pointer-events-none select-none' : '',
      ]"
    >
      <slot />
    </div>

    <div
      v-if="busy"
      :data-testid="overlayTestId"
      class="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-[color:var(--zr-panel-bg)]/72 p-4 backdrop-blur-[2px]"
    >
      <div
        role="status"
        aria-live="polite"
        class="flex max-w-[18rem] flex-col items-center gap-2 rounded-xl border border-[color:var(--zr-border)] bg-[var(--zr-elevated)]/96 px-4 py-3 text-center shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
      >
        <svg
          class="h-5 w-5 animate-spin text-[#ff8b5f]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div class="text-sm font-semibold text-[var(--zr-text-primary)]">{{ title }}</div>
        <div v-if="description" class="text-xs leading-5 text-[var(--zr-text-muted)]">{{ description }}</div>
      </div>
    </div>
  </div>
</template>
