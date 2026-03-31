<script setup lang="ts">
import { getMessages } from '@/lib/i18n'

type Messages = ReturnType<typeof getMessages>

defineProps<{
  messages: Messages
  isLoading: boolean
  errorMessage: string
}>()

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div
    data-testid="startup-screen"
    class="zr-startup-shell relative z-10 flex flex-1 items-center justify-center px-5 py-8"
    :aria-busy="isLoading ? 'true' : 'false'"
    :aria-live="isLoading ? 'polite' : 'assertive'"
  >
    <section class="zr-startup-panel w-full max-w-md rounded-[1.2rem] p-6 sm:p-7">
      <div class="mb-6 flex items-center gap-4">
        <div class="zr-brand-badge h-12 w-12 rounded-2xl text-sm">ZR</div>
        <div class="space-y-1">
          <div class="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--zr-text-muted)]">
            {{ messages.header.appName }}
          </div>
          <h1 class="text-2xl font-semibold text-[var(--zr-text-primary)]">
            {{ isLoading ? messages.startup.loadingTitle : messages.startup.errorTitle }}
          </h1>
        </div>
      </div>

      <div v-if="isLoading" class="space-y-4">
        <div class="flex items-center gap-3 rounded-2xl border border-[var(--zr-border)] bg-[var(--zr-elevated)] px-4 py-3">
          <div class="zr-startup-spinner" aria-hidden="true" />
          <div class="space-y-1">
            <p class="text-sm font-medium text-[var(--zr-text-primary)]">{{ messages.startup.loadingLabel }}</p>
            <p class="text-sm text-[var(--zr-text-secondary)]">{{ messages.startup.loadingDescription }}</p>
          </div>
        </div>
      </div>

      <div v-else class="space-y-4">
        <p class="text-sm leading-6 text-[var(--zr-text-secondary)]">
          {{ messages.startup.errorDescription }}
        </p>
        <div class="rounded-2xl border border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)] px-4 py-3">
          <div class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--zr-text-muted)]">
            {{ messages.startup.errorLabel }}
          </div>
          <p class="text-sm text-[var(--zr-text-primary)]">{{ errorMessage }}</p>
        </div>
        <button
          type="button"
          data-testid="startup-retry"
          class="zr-tool-button inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[var(--zr-text-primary)]"
          @click="$emit('retry')"
        >
          {{ messages.startup.retry }}
        </button>
      </div>
    </section>
  </div>
</template>
