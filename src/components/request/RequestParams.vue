<script setup lang="ts">
import { computed, watch } from 'vue'
import { getMessages } from '@/lib/i18n'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { defaultAuthConfig, defaultRequestTest } from '@/lib/request-workspace'
import type {
  AppLocale,
  AuthConfig,
  FormDataFieldSnapshot,
  KeyValueItem,
  RequestBodyType,
  RequestTestDefinition,
} from '@/types/request'

defineOptions({
  name: 'RequestParams'
})

const props = defineProps<{
  locale: AppLocale
  environmentName: string
}>()

const params = defineModel<KeyValueItem[]>('params', { default: () => [] })
const headers = defineModel<KeyValueItem[]>('headers', { default: () => [] })
const bodyContent = defineModel<string>('body', { default: '' })
const bodyType = defineModel<RequestBodyType>('bodyType', { default: 'json' })
const bodyContentType = defineModel<string>('bodyContentType', { default: '' })
const formDataFields = defineModel<FormDataFieldSnapshot[]>('formDataFields', { default: () => [] })
const binaryFileName = defineModel<string>('binaryFileName', { default: '' })
const binaryMimeType = defineModel<string>('binaryMimeType', { default: '' })
const auth = defineModel<AuthConfig>('auth', { default: () => defaultAuthConfig() })
const tests = defineModel<RequestTestDefinition[]>('tests', { default: () => [] })
const environmentVariables = defineModel<KeyValueItem[]>('environmentVariables', { default: () => [] })

const createItem = (): KeyValueItem => ({
  key: '',
  value: '',
  description: '',
  enabled: true
})

const toggleItem = (items: KeyValueItem[], index: number) => {
  items[index].enabled = !items[index].enabled
}

const removeItem = (items: KeyValueItem[], index: number) => {
  items.splice(index, 1)
}

const addItem = (items: KeyValueItem[]) => {
  items.push(createItem())
}

const createFormDataField = (): FormDataFieldSnapshot => ({
  key: '',
  value: '',
  enabled: true,
})

const toggleFormDataField = (index: number) => {
  formDataFields.value[index].enabled = !formDataFields.value[index].enabled
}

const removeFormDataField = (index: number) => {
  formDataFields.value.splice(index, 1)
}

const addFormDataField = () => {
  formDataFields.value.push(createFormDataField())
}

const setAuthType = (type: AuthConfig['type']) => {
  auth.value.type = type
}

const addTest = () => {
  tests.value.push(defaultRequestTest())
}

const removeTest = (index: number) => {
  tests.value.splice(index, 1)
}

const parseFormDataBody = (raw: string): FormDataFieldSnapshot[] => raw
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const separatorIndex = line.indexOf('=')
    if (separatorIndex < 0) {
      return {
        ...createFormDataField(),
        key: line,
      }
    }

    return {
      ...createFormDataField(),
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1),
    }
  })
  .filter((field) => field.key.length > 0)

const serializeFormDataFields = (fields: FormDataFieldSnapshot[]) => fields
  .filter((field) => field.enabled && field.key.trim())
  .map((field) => `${field.key}=${field.value}`)
  .join('\n')

let syncingFormDataBody = false
watch(formDataFields, (fields) => {
  if (bodyType.value !== 'formdata') return
  const nextBody = serializeFormDataFields(fields)
  if (nextBody === bodyContent.value) return
  syncingFormDataBody = true
  bodyContent.value = nextBody
  queueMicrotask(() => {
    syncingFormDataBody = false
  })
}, { deep: true })

watch([bodyType, bodyContent], ([nextBodyType, nextBody]) => {
  if (nextBodyType === 'raw' && !bodyContentType.value) {
    bodyContentType.value = 'text/plain'
  }

  if (nextBodyType !== 'formdata' || syncingFormDataBody) return

  const parsedFields = parseFormDataBody(nextBody)
  if (parsedFields.length === 0) {
    if (formDataFields.value.length === 0) {
      formDataFields.value = [createFormDataField()]
    }
    return
  }

  const current = JSON.stringify(formDataFields.value)
  const next = JSON.stringify(parsedFields)
  if (current !== next) {
    formDataFields.value = parsedFields
  }
}, { immediate: true })

const jsonBodyError = computed(() => {
  if (bodyType.value !== 'json' || !bodyContent.value.trim()) return ''

  try {
    JSON.parse(bodyContent.value)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
})

const decodeBase64Size = (value: string) => {
  const normalized = value.replace(/\s+/g, '')
  if (!normalized) return 0
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding)
}

const binaryPayloadSize = computed(() => decodeBase64Size(bodyContent.value))

const bytesToBase64 = (value: Uint8Array) => {
  let output = ''
  const chunkSize = 0x8000

  for (let index = 0; index < value.length; index += chunkSize) {
    output += String.fromCharCode(...value.subarray(index, index + chunkSize))
  }

  return btoa(output)
}

const handleBinaryFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const buffer = await file.arrayBuffer()
  bodyContent.value = bytesToBase64(new Uint8Array(buffer))
  binaryFileName.value = file.name
  binaryMimeType.value = file.type || 'application/octet-stream'
  input.value = ''
}

const text = computed(() => getMessages(props.locale))
</script>

<template>
  <Tabs default-value="params" class="flex min-h-0 flex-1 flex-col">
    <TabsList class="zr-input mx-3 mt-3 w-fit rounded-lg p-0.5">
      <TabsTrigger value="params" class="zr-tab-trigger">
        {{ text.request.params }}
        <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ params.filter(p => p.enabled).length }}</Badge>
      </TabsTrigger>
      <TabsTrigger value="headers" class="zr-tab-trigger">
        {{ text.request.headers }}
        <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ headers.filter(h => h.enabled).length }}</Badge>
      </TabsTrigger>
      <TabsTrigger value="body" class="zr-tab-trigger">{{ text.request.body }}</TabsTrigger>
      <TabsTrigger value="auth" class="zr-tab-trigger">{{ text.request.auth }}</TabsTrigger>
      <TabsTrigger value="tests" class="zr-tab-trigger">
        {{ text.request.tests }}
        <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ tests.length }}</Badge>
      </TabsTrigger>
      <TabsTrigger value="env" class="zr-tab-trigger">{{ text.request.env }}</TabsTrigger>
    </TabsList>
    
    <TabsContent value="params" class="mt-2.5 flex-1 px-3 pb-3">
      <ScrollArea class="h-full">
        <div class="zr-code-panel overflow-hidden rounded-lg">
          <table class="w-full text-xs">
            <thead>
              <tr class="zr-table-head text-xs">
                <th class="w-10 text-center"></th>
                <th class="w-[30%] py-2.5 text-left font-medium">{{ text.request.key }}</th>
                <th class="w-[35%] py-2.5 text-left font-medium">{{ text.request.value }}</th>
                <th class="w-[25%] py-2.5 text-left font-medium">{{ text.request.description }}</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(param, idx) in params" :key="idx" class="group border-b border-[color:var(--zr-border-soft)] last:border-b-0">
                <td class="text-center">
                  <button class="zr-toggle-badge" @click="toggleItem(params, idx)">
                    {{ param.enabled ? text.common.enabled : '' }}
                  </button>
                </td>
                <td class="py-1.5">
                  <Input 
                    v-model="param.key" 
                    :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !param.enabled && 'opacity-50']"
                  />
                </td>
                <td class="py-1.5">
                  <Input 
                    v-model="param.value" 
                    :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !param.enabled && 'opacity-50']"
                  />
                </td>
                <td class="py-1.5">
                  <Input 
                    v-model="param.description" 
                    :class="['zr-input h-9 rounded-lg text-xs shadow-none', !param.enabled && 'opacity-50']"
                  />
                </td>
                <td>
                  <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeItem(params, idx)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="ghost" size="sm" class="zr-dashed-button mt-2.5 rounded-lg text-xs" @click="addItem(params)">
          {{ text.request.addParameter }}
        </Button>
      </ScrollArea>
    </TabsContent>
    
    <TabsContent value="headers" class="mt-2.5 flex-1 px-3 pb-3">
      <ScrollArea class="h-full">
        <div class="zr-code-panel overflow-hidden rounded-lg">
          <table class="w-full text-xs">
            <thead>
              <tr class="zr-table-head text-xs">
                <th class="w-10 text-center"></th>
                <th class="w-[30%] py-2.5 text-left font-medium">{{ text.request.key }}</th>
                <th class="w-[45%] py-2.5 text-left font-medium">{{ text.request.value }}</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(header, idx) in headers" :key="idx" class="group border-b border-[color:var(--zr-border-soft)] last:border-b-0">
                <td class="text-center">
                  <button class="zr-toggle-badge" @click="toggleItem(headers, idx)">
                    {{ header.enabled ? text.common.enabled : '' }}
                  </button>
                </td>
                <td class="py-1.5">
                  <Input 
                    v-model="header.key" 
                    :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !header.enabled && 'opacity-50']"
                  />
                </td>
                <td class="py-1.5">
                  <Input 
                    v-model="header.value" 
                    :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !header.enabled && 'opacity-50']"
                  />
                </td>
                <td>
                  <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeItem(headers, idx)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="ghost" size="sm" class="zr-dashed-button mt-2.5 rounded-lg text-xs" @click="addItem(headers)">
          {{ text.request.addHeader }}
        </Button>
      </ScrollArea>
    </TabsContent>
    
    <TabsContent value="body" class="mt-2.5 flex-1 px-3 pb-3">
      <div class="mb-2.5 flex items-center gap-1.5">
        <Button variant="secondary" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'json' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="bodyType = 'json'">{{ text.request.json }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'formdata' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="bodyType = 'formdata'">{{ text.request.formData }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'raw' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="bodyType = 'raw'">{{ text.request.raw }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'binary' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="bodyType = 'binary'">{{ text.request.binary }}</Button>
      </div>
      <div class="zr-code-panel flex h-[calc(100%-40px)] min-h-[160px] flex-col overflow-hidden rounded-lg">
        <div class="flex items-center justify-between border-b border-[color:var(--zr-border)] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
          <span>{{ text.request.requestPayload }}</span>
          <span class="zr-chip rounded-full px-2 py-1 text-[10px] tracking-[0.18em] text-[var(--zr-text-secondary)]">{{ bodyType }}</span>
        </div>
        <template v-if="bodyType === 'formdata'">
          <div data-testid="request-formdata-editor" class="flex min-h-0 flex-1 flex-col p-3">
            <ScrollArea class="min-h-0 flex-1">
              <div class="overflow-hidden rounded-lg border border-[color:var(--zr-border)]">
                <table class="w-full text-xs">
                  <thead class="bg-[var(--zr-soft-bg)] text-left text-xs text-[var(--zr-text-muted)]">
                    <tr>
                      <th class="w-10 text-center"></th>
                      <th class="w-[35%] px-3 py-2.5 font-medium">{{ text.request.key }}</th>
                      <th class="w-[45%] px-3 py-2.5 font-medium">{{ text.request.value }}</th>
                      <th class="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(field, idx) in formDataFields"
                      :key="idx"
                      class="group border-t border-[color:var(--zr-border-soft)] first:border-t-0"
                    >
                      <td class="px-3 text-center">
                        <button class="zr-toggle-badge" @click="toggleFormDataField(idx)">
                          {{ field.enabled ? text.common.enabled : '' }}
                        </button>
                      </td>
                      <td class="px-3 py-1.5">
                        <Input
                          v-model="field.key"
                          :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !field.enabled && 'opacity-50']"
                        />
                      </td>
                      <td class="px-3 py-1.5">
                        <Input
                          v-model="field.value"
                          :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !field.enabled && 'opacity-50']"
                        />
                      </td>
                      <td class="px-3">
                        <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeFormDataField(idx)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ScrollArea>
            <Button
              data-testid="request-formdata-add-field"
              variant="ghost"
              size="sm"
              class="zr-dashed-button mt-2.5 self-start rounded-lg text-xs"
              @click="addFormDataField"
            >
              {{ text.request.addFormDataField }}
            </Button>
          </div>
        </template>
        <template v-else-if="bodyType === 'binary'">
          <div data-testid="request-binary-editor" class="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.binaryUpload }}</div>
              <input
                data-testid="request-binary-file-input"
                type="file"
                class="zr-input h-10 w-full rounded-lg px-3 text-xs shadow-none file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-[var(--zr-text-primary)]"
                @change="handleBinaryFileChange"
              >
            </div>

            <div class="grid gap-2.5 md:grid-cols-2">
              <div class="space-y-2">
                <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.binaryFileName }}</div>
                <Input v-model="binaryFileName" class="zr-input h-9 rounded-lg text-xs shadow-none" />
              </div>
              <div class="space-y-2">
                <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.binaryMimeType }}</div>
                <Input v-model="binaryMimeType" class="zr-input h-9 rounded-lg text-xs shadow-none" :placeholder="text.request.binaryMimeTypePlaceholder" />
              </div>
            </div>

            <div
              v-if="bodyContent"
              class="rounded-lg border border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)] px-3 py-2 text-xs text-[var(--zr-text-secondary)]"
            >
              {{ text.request.binaryReady(binaryPayloadSize) }}
            </div>
            <div
              v-else
              class="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center text-xs text-[var(--zr-text-muted)]"
            >
              {{ text.request.binaryEmpty }}
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-if="bodyType === 'raw'"
            class="border-b border-[color:var(--zr-border)] px-3 py-3"
          >
            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.rawContentType }}</div>
              <Input
                v-model="bodyContentType"
                data-testid="request-raw-content-type"
                class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
                :placeholder="text.request.rawContentTypePlaceholder"
              />
            </div>
          </div>
          <textarea
            v-model="bodyContent"
            class="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-5 text-[var(--zr-text-primary)] outline-none"
          />
          <div
            v-if="bodyType === 'json' && jsonBodyError"
            class="border-t border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-200"
          >
            {{ text.request.jsonInvalid }}: {{ jsonBodyError }}
          </div>
        </template>
      </div>
    </TabsContent>
    
    <TabsContent value="auth" class="mt-2.5 flex-1 px-3 pb-3">
      <div class="mb-2.5 flex flex-wrap items-center gap-1.5">
        <Button variant="secondary" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'none' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setAuthType('none')">{{ text.request.none }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'bearer' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setAuthType('bearer')">{{ text.request.bearerToken }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'basic' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setAuthType('basic')">{{ text.request.basicAuth }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'apiKey' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setAuthType('apiKey')">{{ text.request.apiKey }}</Button>
      </div>

      <div class="zr-code-panel flex min-h-[160px] flex-col rounded-lg p-3">
        <template v-if="auth.type === 'none'">
          <div class="flex h-full min-h-[160px] items-center justify-center text-xs text-[var(--zr-text-muted)]">
            {{ text.request.noAuthRequired }}
          </div>
        </template>

        <template v-else-if="auth.type === 'bearer'">
          <div class="space-y-2.5">
            <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.authorizationHeader }}</div>
            <Input v-model="auth.bearerToken" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="text.request.bearerTokenPlaceholder" />
          </div>
        </template>

        <template v-else-if="auth.type === 'basic'">
          <div class="grid gap-2.5 md:grid-cols-2">
            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.username }}</div>
              <Input v-model="auth.username" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="text.request.usernamePlaceholder" />
            </div>
            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.password }}</div>
              <Input v-model="auth.password" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="text.request.passwordPlaceholder" />
            </div>
          </div>
        </template>

        <template v-else>
          <div class="grid gap-2.5 md:grid-cols-2">
            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.keyName }}</div>
              <Input v-model="auth.apiKeyKey" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="text.request.apiKeyNamePlaceholder" />
            </div>
            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.keyValue }}</div>
              <Input v-model="auth.apiKeyValue" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="text.request.apiKeyValuePlaceholder" />
            </div>
          </div>
          <div class="mt-3 flex items-center gap-1.5">
            <Button variant="secondary" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', auth.apiKeyPlacement === 'header' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="auth.apiKeyPlacement = 'header'">{{ text.request.header }}</Button>
            <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', auth.apiKeyPlacement === 'query' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="auth.apiKeyPlacement = 'query'">{{ text.request.query }}</Button>
          </div>
        </template>
      </div>
    </TabsContent>

    <TabsContent value="tests" class="mt-2.5 flex-1 px-3 pb-3">
      <ScrollArea class="h-full">
        <div class="space-y-2.5">
          <div
            v-for="(test, idx) in tests"
            :key="test.id"
            class="zr-code-panel rounded-lg p-3"
          >
            <div class="flex items-center justify-between gap-2.5">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
                {{ text.request.testCase }} {{ idx + 1 }}
              </div>
              <button class="text-[var(--zr-text-muted)] transition-colors hover:text-rose-300" @click="removeTest(idx)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            <div class="mt-2.5 grid gap-2.5 md:grid-cols-2">
              <div class="space-y-2 md:col-span-2">
                <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.testName }}</label>
                <Input v-model="test.name" class="zr-input h-9 rounded-lg text-xs shadow-none" />
              </div>

              <div class="space-y-2">
                <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.source }}</label>
                <select v-model="test.source" class="zr-input h-9 w-full rounded-lg px-3 text-xs shadow-none outline-none">
                  <option value="status">{{ text.request.sourceStatus }}</option>
                  <option value="header">{{ text.request.sourceHeader }}</option>
                  <option value="body">{{ text.request.sourceBody }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.operator }}</label>
                <select v-model="test.operator" class="zr-input h-9 w-full rounded-lg px-3 text-xs shadow-none outline-none">
                  <option value="equals">{{ text.request.operatorEquals }}</option>
                  <option value="contains">{{ text.request.operatorContains }}</option>
                  <option value="exists">{{ text.request.operatorExists }}</option>
                </select>
              </div>

              <div v-if="test.source === 'header'" class="space-y-2">
                <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.target }}</label>
                <Input v-model="test.target" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="text.request.headerName" />
              </div>

              <div v-if="test.operator !== 'exists'" :class="['space-y-2', test.source === 'header' ? '' : 'md:col-span-2']">
                <label class="text-[10px] uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.expected }}</label>
                <Input v-model="test.expected" class="zr-input h-9 rounded-lg font-mono text-xs shadow-none" :placeholder="text.request.expectedValue" />
              </div>
            </div>
          </div>

          <div v-if="tests.length === 0" class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center text-xs text-[var(--zr-text-muted)]">
            {{ text.request.noTestsConfigured }}
          </div>

          <Button variant="ghost" size="sm" class="zr-dashed-button rounded-lg text-xs" @click="addTest">
            {{ text.request.addTest }}
          </Button>
        </div>
      </ScrollArea>
    </TabsContent>

    <TabsContent value="env" class="mt-2.5 flex-1 px-3 pb-3">
      <div class="mb-2.5 flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.activeEnvironment }}</div>
          <div class="mt-1 text-sm font-medium text-[var(--zr-text-primary)]">{{ props.environmentName }}</div>
        </div>
        <Badge variant="secondary" class="rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-2 py-0.5 text-[10px] text-[var(--zr-text-secondary)]">
          {{ text.request.vars(environmentVariables.filter(v => v.enabled).length) }}
        </Badge>
      </div>
      <ScrollArea class="h-[calc(100%-48px)]">
        <div class="zr-code-panel overflow-hidden rounded-lg">
          <table class="w-full text-xs">
            <thead>
              <tr class="zr-table-head text-xs">
                <th class="w-10 text-center"></th>
                <th class="w-[28%] py-2.5 text-left font-medium">{{ text.request.variable }}</th>
                <th class="w-[32%] py-2.5 text-left font-medium">{{ text.request.value }}</th>
                <th class="w-[28%] py-2.5 text-left font-medium">{{ text.request.description }}</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(variable, idx) in environmentVariables" :key="idx" class="group border-b border-[color:var(--zr-border-soft)] last:border-b-0">
                <td class="text-center">
                  <button class="zr-toggle-badge" @click="toggleItem(environmentVariables, idx)">
                    {{ variable.enabled ? text.common.enabled : '' }}
                  </button>
                </td>
                <td class="py-1.5">
                  <Input v-model="variable.key" :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !variable.enabled && 'opacity-50']" />
                </td>
                <td class="py-1.5">
                  <Input v-model="variable.value" :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !variable.enabled && 'opacity-50']" />
                </td>
                <td class="py-1.5">
                  <Input v-model="variable.description" :class="['zr-input h-9 rounded-lg text-xs shadow-none', !variable.enabled && 'opacity-50']" />
                </td>
                <td>
                  <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeItem(environmentVariables, idx)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="ghost" size="sm" class="zr-dashed-button mt-2.5 rounded-lg text-xs" @click="addItem(environmentVariables)">
          {{ text.request.addVariable }}
        </Button>
      </ScrollArea>
    </TabsContent>
  </Tabs>
</template>
