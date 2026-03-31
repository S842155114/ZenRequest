<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMessages } from '@/lib/i18n'
import type { AuthConfig } from '@/types/request'

type RequestMessages = ReturnType<typeof getMessages>['request']

defineProps<{
  requestText: RequestMessages
  onSetAuthType: (type: AuthConfig['type']) => void
  onSetApiKeyPlacement: (placement: NonNullable<AuthConfig['apiKeyPlacement']>) => void
}>()

const auth = defineModel<AuthConfig>('auth', { required: true })
</script>

<template>
  <div class="mb-2.5 flex flex-wrap items-center gap-1.5">
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'none' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetAuthType('none')">{{ requestText.none }}</Button>
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'bearer' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetAuthType('bearer')">{{ requestText.bearerToken }}</Button>
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'basic' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetAuthType('basic')">{{ requestText.basicAuth }}</Button>
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'apiKey' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetAuthType('apiKey')">{{ requestText.apiKey }}</Button>
  </div>

  <div class="zr-code-panel flex min-h-[160px] flex-col rounded-lg p-3">
    <template v-if="auth.type === 'none'">
      <div class="flex h-full min-h-[160px] items-center justify-center text-xs text-[var(--zr-text-muted)]">
        {{ requestText.noAuthRequired }}
      </div>
    </template>

    <template v-else-if="auth.type === 'bearer'">
      <div class="space-y-2.5">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.authorizationHeader }}</div>
        <Input v-model="auth.bearerToken" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="requestText.bearerTokenPlaceholder" />
      </div>
    </template>

    <template v-else-if="auth.type === 'basic'">
      <div class="grid gap-2.5 md:grid-cols-2">
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.username }}</div>
          <Input v-model="auth.username" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="requestText.usernamePlaceholder" />
        </div>
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.password }}</div>
          <Input v-model="auth.password" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="requestText.passwordPlaceholder" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="grid gap-2.5 md:grid-cols-2">
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.keyName }}</div>
          <Input v-model="auth.apiKeyKey" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="requestText.apiKeyNamePlaceholder" />
        </div>
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.keyValue }}</div>
          <Input v-model="auth.apiKeyValue" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="requestText.apiKeyValuePlaceholder" />
        </div>
      </div>
      <div class="mt-3 flex items-center gap-1.5">
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', auth.apiKeyPlacement === 'header' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetApiKeyPlacement('header')">{{ requestText.header }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', auth.apiKeyPlacement === 'query' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetApiKeyPlacement('query')">{{ requestText.query }}</Button>
      </div>
    </template>
  </div>
</template>
