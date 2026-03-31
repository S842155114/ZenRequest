<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getMessages } from '@/lib/i18n'

type RequestMessages = ReturnType<typeof getMessages>['request']

defineProps<{
  requestText: RequestMessages
  enabledParamsCount: number
  invalidParamsCount: number
  enabledHeadersCount: number
  invalidHeadersCount: number
  bodyConfiguredCount: number
  bodyInvalidCount: number
  authConfiguredCount: number
  testsCount: number
  enabledEnvironmentVariablesCount: number
  invalidEnvironmentVariablesCount: number
}>()
</script>

<template>
  <TabsList data-testid="request-compose-rail" class="zr-input zr-compose-rail mx-3 mt-3 w-fit shrink-0 rounded-lg p-0.5">
    <TabsTrigger value="params" data-testid="request-section-trigger-params" class="zr-tab-trigger">
      {{ requestText.params }}
      <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ enabledParamsCount }}</Badge>
      <Badge
        v-if="invalidParamsCount > 0"
        data-testid="request-section-invalid-params"
        variant="secondary"
        class="ml-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0 text-[9px] text-rose-700 dark:text-rose-300"
      >
        {{ invalidParamsCount }}
      </Badge>
    </TabsTrigger>
    <TabsTrigger value="headers" data-testid="request-section-trigger-headers" class="zr-tab-trigger">
      {{ requestText.headers }}
      <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ enabledHeadersCount }}</Badge>
      <Badge
        v-if="invalidHeadersCount > 0"
        data-testid="request-section-invalid-headers"
        variant="secondary"
        class="ml-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0 text-[9px] text-rose-700 dark:text-rose-300"
      >
        {{ invalidHeadersCount }}
      </Badge>
    </TabsTrigger>
    <TabsTrigger value="body" data-testid="request-section-trigger-body" class="zr-tab-trigger">
      {{ requestText.body }}
      <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ bodyConfiguredCount }}</Badge>
      <Badge
        v-if="bodyInvalidCount > 0"
        data-testid="request-section-invalid-body"
        variant="secondary"
        class="ml-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0 text-[9px] text-rose-700 dark:text-rose-300"
      >
        {{ bodyInvalidCount }}
      </Badge>
    </TabsTrigger>
    <span class="mx-1 h-5 w-px self-center bg-[color:var(--zr-border)]" />
    <TabsTrigger value="mock" data-testid="request-section-trigger-mock" data-request-secondary="true" class="zr-tab-trigger opacity-80">
      {{ requestText.mock }}
    </TabsTrigger>
    <TabsTrigger value="auth" data-testid="request-section-trigger-auth" data-request-secondary="true" class="zr-tab-trigger opacity-80">
      {{ requestText.auth }}
      <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ authConfiguredCount }}</Badge>
    </TabsTrigger>
    <TabsTrigger value="tests" data-testid="request-section-trigger-tests" data-request-secondary="true" class="zr-tab-trigger opacity-80">
      {{ requestText.tests }}
      <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ testsCount }}</Badge>
    </TabsTrigger>
    <TabsTrigger value="env" data-testid="request-section-trigger-env" data-request-secondary="true" class="zr-tab-trigger opacity-80">
      {{ requestText.env }}
      <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ enabledEnvironmentVariablesCount }}</Badge>
      <Badge
        v-if="invalidEnvironmentVariablesCount > 0"
        data-testid="request-section-invalid-env"
        variant="secondary"
        class="ml-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0 text-[9px] text-rose-700 dark:text-rose-300"
      >
        {{ invalidEnvironmentVariablesCount }}
      </Badge>
    </TabsTrigger>
  </TabsList>
</template>
