<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getMessages } from '@/lib/i18n'
import CodeEditorSurface from '@/components/code/CodeEditorSurface.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { defaultAuthConfig, defaultRequestTest } from '@/lib/request-workspace'
import type {
  AppLocale,
  AuthConfig,
  FormDataFieldSnapshot,
  KeyValueItem,
  RequestBodyType,
  RequestMockState,
  RequestTestDefinition,
} from '@/types/request'

defineOptions({
  name: 'RequestParams'
})

const props = defineProps<{
  locale: AppLocale
  environmentName: string
  requestKey?: string
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
const mock = defineModel<RequestMockState | undefined>('mock')

type ComposeSection = 'params' | 'headers' | 'body' | 'mock' | 'auth' | 'tests' | 'env'
type TableSection = 'params' | 'headers' | 'env' | 'formdata'
type TextBodyMode = 'json' | 'raw' | 'binary'

const composeSections: ComposeSection[] = ['params', 'headers', 'body', 'mock', 'auth', 'tests', 'env']
const activeSection = ref<ComposeSection>('params')
const revealedRows = ref<Record<TableSection, boolean[]>>({
  params: [],
  headers: [],
  env: [],
  formdata: [],
})

const createItem = (): KeyValueItem => ({
  key: '',
  value: '',
  description: '',
  enabled: true
})

const toggleItem = (items: KeyValueItem[], index: number) => {
  items[index].enabled = !items[index].enabled
}

const removeItem = (items: KeyValueItem[], index: number, section: Exclude<TableSection, 'formdata'>) => {
  items.splice(index, 1)
  revealedRows.value[section].splice(index, 1)
}

const addItem = (items: KeyValueItem[], section: Exclude<TableSection, 'formdata'>) => {
  items.push(createItem())
  revealedRows.value[section].push(false)
}

const createFormDataField = (): FormDataFieldSnapshot => ({
  key: '',
  value: '',
  enabled: true,
})

const textBodyDraftsByRequest = ref<Record<string, Record<TextBodyMode, string>>>({})
const formDataDraftsByRequest = ref<Record<string, FormDataFieldSnapshot[]>>({})

const getRequestDraftKey = () => props.requestKey || '__default__'

const ensureTextBodyDrafts = () => {
  const requestKey = getRequestDraftKey()
  if (!textBodyDraftsByRequest.value[requestKey]) {
    textBodyDraftsByRequest.value[requestKey] = {
      json: '',
      raw: '',
      binary: '',
    }
  }
  return textBodyDraftsByRequest.value[requestKey]
}

const ensureFormDataDraft = () => {
  const requestKey = getRequestDraftKey()
  if (!formDataDraftsByRequest.value[requestKey]) {
    formDataDraftsByRequest.value[requestKey] = []
  }
  return formDataDraftsByRequest.value[requestKey]
}

const syncCurrentTextBodyDraft = () => {
  if (bodyType.value === 'formdata') return
  ensureTextBodyDrafts()[bodyType.value] = bodyContent.value
}

const cloneFormDataDraft = (fields: FormDataFieldSnapshot[]) => fields.map((field) => ({ ...field }))

const syncCurrentFormDataDraft = () => {
  if (bodyType.value !== 'formdata') return
  formDataDraftsByRequest.value[getRequestDraftKey()] = cloneFormDataDraft(formDataFields.value)
}

watch(
  () => props.requestKey,
  () => {
    syncCurrentTextBodyDraft()
    syncCurrentFormDataDraft()
  },
  { immediate: true },
)

watch(bodyContent, () => {
  syncCurrentTextBodyDraft()
})

const toggleFormDataField = (index: number) => {
  formDataFields.value[index].enabled = !formDataFields.value[index].enabled
}

const removeFormDataField = (index: number) => {
  formDataFields.value.splice(index, 1)
  revealedRows.value.formdata.splice(index, 1)
}

const addFormDataField = () => {
  formDataFields.value.push(createFormDataField())
  revealedRows.value.formdata.push(false)
}

const createMockState = (): RequestMockState => ({
  enabled: false,
  status: 200,
  statusText: 'OK',
  contentType: 'application/json',
  body: '',
  headers: [],
})

const createMockHeader = (): KeyValueItem => ({
  key: '',
  value: '',
  description: '',
  enabled: true,
})

const updateMock = (updater: (value: RequestMockState) => RequestMockState) => {
  mock.value = updater(mock.value ?? createMockState())
}

const toggleMockEnabled = () => {
  updateMock((current) => ({
    ...current,
    enabled: !current.enabled,
  }))
}

const updateMockStatus = (value: string | number) => {
  updateMock((current) => ({
    ...current,
    status: Number.parseInt(String(value), 10) || 0,
  }))
}

const updateMockStatusText = (value: string | number) => {
  updateMock((current) => ({
    ...current,
    statusText: String(value),
  }))
}

const updateMockContentType = (value: string | number) => {
  updateMock((current) => ({
    ...current,
    contentType: String(value),
  }))
}

const updateMockBody = (value: string) => {
  updateMock((current) => ({
    ...current,
    body: value,
  }))
}

const toggleMockHeader = (index: number) => {
  updateMock((current) => {
    const headers = current.headers.map((header) => ({ ...header }))
    headers[index].enabled = !headers[index].enabled
    return {
      ...current,
      headers,
    }
  })
}

const updateMockHeader = (index: number, patch: Partial<KeyValueItem>) => {
  updateMock((current) => {
    const headers = current.headers.map((header) => ({ ...header }))
    headers[index] = {
      ...headers[index],
      ...patch,
    }
    return {
      ...current,
      headers,
    }
  })
}

const addMockHeader = () => {
  updateMock((current) => ({
    ...current,
    headers: [...current.headers, createMockHeader()],
  }))
}

const removeMockHeader = (index: number) => {
  updateMock((current) => ({
    ...current,
    headers: current.headers.filter((_, headerIndex) => headerIndex !== index),
  }))
}

const setAuthType = (type: AuthConfig['type']) => {
  auth.value = {
    ...auth.value,
    type,
  }
}

const setApiKeyPlacement = (placement: NonNullable<AuthConfig['apiKeyPlacement']>) => {
  auth.value = {
    ...auth.value,
    apiKeyPlacement: placement,
  }
}

const trimValue = (value?: string) => value?.trim() ?? ''

const hasKeyValueRowContent = (item: KeyValueItem) => (
  trimValue(item.key).length > 0
  || trimValue(item.value).length > 0
  || trimValue(item.description).length > 0
)

const hasFormDataFieldContent = (field: FormDataFieldSnapshot) => (
  trimValue(field.key).length > 0
  || trimValue(field.value).length > 0
  || trimValue(field.fileName).length > 0
  || trimValue(field.mimeType).length > 0
)

const markRowRevealed = (section: TableSection, index: number) => {
  revealedRows.value[section][index] = true
}

const syncRevealedRows = (section: TableSection, length: number) => {
  revealedRows.value[section] = Array.from({ length }, () => false)
}

watch(() => params.value, (items) => {
  syncRevealedRows('params', items.length)
}, { immediate: true })

watch(() => headers.value, (items) => {
  syncRevealedRows('headers', items.length)
}, { immediate: true })

watch(() => environmentVariables.value, (items) => {
  syncRevealedRows('env', items.length)
}, { immediate: true })

watch(() => formDataFields.value, (items) => {
  syncRevealedRows('formdata', items.length)
}, { immediate: true })

watch(formDataFields, () => {
  syncCurrentFormDataDraft()
}, { deep: true })

const isKeyValueRowInvalid = (section: Exclude<TableSection, 'formdata'>, item: KeyValueItem, index: number) => (
  item.enabled
  && revealedRows.value[section][index]
  && hasKeyValueRowContent(item)
  && trimValue(item.key).length === 0
)

const isFormDataRowInvalid = (field: FormDataFieldSnapshot, index: number) => (
  field.enabled
  && revealedRows.value.formdata[index]
  && hasFormDataFieldContent(field)
  && trimValue(field.key).length === 0
)

const reconcileKeyValueSection = (section: Exclude<TableSection, 'formdata'>, items: KeyValueItem[]) => {
  const nextItems: KeyValueItem[] = []
  const nextRevealed: boolean[] = []

  items.forEach((item) => {
    if (!hasKeyValueRowContent(item)) return

    nextItems.push(item)
    nextRevealed.push(true)
  })

  items.splice(0, items.length, ...nextItems)
  revealedRows.value[section] = nextRevealed
}

const reconcileFormDataSection = () => {
  const nextFields: FormDataFieldSnapshot[] = []
  const nextRevealed: boolean[] = []

  formDataFields.value.forEach((field) => {
    if (!hasFormDataFieldContent(field)) return

    nextFields.push(field)
    nextRevealed.push(true)
  })

  formDataFields.value.splice(0, formDataFields.value.length, ...nextFields)
  revealedRows.value.formdata = nextRevealed
}

const reconcileSection = (section: ComposeSection | TableSection) => {
  switch (section) {
    case 'params':
      reconcileKeyValueSection('params', params.value)
      break
    case 'headers':
      reconcileKeyValueSection('headers', headers.value)
      break
    case 'env':
      reconcileKeyValueSection('env', environmentVariables.value)
      break
    case 'body':
    case 'formdata':
      if (bodyType.value === 'formdata') {
        reconcileFormDataSection()
      }
      break
    default:
      break
  }
}

const prepareForSubmit = () => {
  reconcileKeyValueSection('params', params.value)
  reconcileKeyValueSection('headers', headers.value)
  reconcileKeyValueSection('env', environmentVariables.value)

  if (bodyType.value === 'json' && jsonBodyError.value) {
    activeSection.value = 'body'
    return false
  }

  if (bodyType.value === 'formdata') {
    reconcileFormDataSection()
  }

  return invalidParamsCount.value + invalidHeadersCount.value + invalidEnvironmentVariablesCount.value + bodyInvalidCount.value === 0
}

const isComposeSection = (value: string): value is ComposeSection => composeSections.includes(value as ComposeSection)

const handleSectionChange = (nextSection: string | number) => {
  if (typeof nextSection !== 'string') return
  if (!isComposeSection(nextSection) || nextSection === activeSection.value) return

  reconcileSection(activeSection.value)
  activeSection.value = nextSection
}

const setBodyType = (nextType: RequestBodyType) => {
  if (bodyType.value === nextType) return

  syncCurrentTextBodyDraft()
  syncCurrentFormDataDraft()

  if (bodyType.value === 'formdata' && nextType !== 'formdata') {
    reconcileSection('formdata')
  }

  if (nextType === 'formdata') {
    bodyType.value = nextType
    const nextFields = cloneFormDataDraft(ensureFormDataDraft())
    formDataFields.value = nextFields.length > 0 ? nextFields : [createFormDataField()]
    bodyContent.value = serializeFormDataFields(formDataFields.value)
    return
  }

  bodyType.value = nextType

  const nextBody = ensureTextBodyDrafts()[nextType]
  bodyContent.value = nextBody
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

watch(formDataFields, (fields) => {
  if (bodyType.value !== 'formdata') return
  const nextBody = serializeFormDataFields(fields)
  if (nextBody === bodyContent.value) return
  bodyContent.value = nextBody
}, { deep: true })

watch([bodyType, bodyContent], ([nextBodyType, nextBody]) => {
  if (nextBodyType === 'raw' && !bodyContentType.value) {
    bodyContentType.value = 'text/plain'
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

const formatJsonBody = () => {
  if (bodyType.value !== 'json' || !bodyContent.value.trim() || jsonBodyError.value) return
  bodyContent.value = JSON.stringify(JSON.parse(bodyContent.value), null, 2)
}

const decodeBase64Size = (value: string) => {
  const normalized = value.replace(/\s+/g, '')
  if (!normalized) return 0
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding)
}

const binaryPayloadSize = computed(() => decodeBase64Size(bodyContent.value))

const enabledParamsCount = computed(() => params.value.filter((item) => item.enabled).length)
const enabledHeadersCount = computed(() => headers.value.filter((item) => item.enabled).length)
const enabledEnvironmentVariablesCount = computed(() => environmentVariables.value.filter((item) => item.enabled).length)
const enabledFormDataCount = computed(() => formDataFields.value.filter((field) => field.enabled && field.key.trim()).length)
const invalidParamsCount = computed(() => params.value.filter((item, index) => isKeyValueRowInvalid('params', item, index)).length)
const invalidHeadersCount = computed(() => headers.value.filter((item, index) => isKeyValueRowInvalid('headers', item, index)).length)
const invalidEnvironmentVariablesCount = computed(() => environmentVariables.value.filter((item, index) => isKeyValueRowInvalid('env', item, index)).length)
const invalidFormDataCount = computed(() => formDataFields.value.filter((field, index) => isFormDataRowInvalid(field, index)).length)
const bodyConfiguredCount = computed(() => {
  if (bodyType.value === 'formdata') {
    return enabledFormDataCount.value
  }

  if (bodyType.value === 'json' || bodyType.value === 'raw' || bodyType.value === 'binary') {
    return bodyContent.value.trim() ? 1 : 0
  }

  return 0
})
const authConfiguredCount = computed(() => (auth.value.type === 'none' ? 0 : 1))
const bodyInvalidCount = computed(() => (bodyType.value === 'formdata' ? invalidFormDataCount.value : 0))

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

defineExpose({
  prepareForSubmit,
})
</script>

<template>
  <Tabs
    data-testid="request-compose-body"
    :model-value="activeSection"
    class="flex min-h-0 flex-1 flex-col overflow-hidden"
    @update:model-value="handleSectionChange"
  >
    <TabsList data-testid="request-compose-rail" class="zr-input zr-compose-rail mx-3 mt-3 w-fit shrink-0 rounded-lg p-0.5">
      <TabsTrigger value="params" data-testid="request-section-trigger-params" class="zr-tab-trigger">
        {{ text.request.params }}
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
        {{ text.request.headers }}
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
        {{ text.request.body }}
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
        {{ text.request.mock }}
      </TabsTrigger>
      <TabsTrigger value="auth" data-testid="request-section-trigger-auth" data-request-secondary="true" class="zr-tab-trigger opacity-80">
        {{ text.request.auth }}
        <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ authConfiguredCount }}</Badge>
      </TabsTrigger>
      <TabsTrigger value="tests" data-testid="request-section-trigger-tests" data-request-secondary="true" class="zr-tab-trigger opacity-80">
        {{ text.request.tests }}
        <Badge variant="secondary" class="ml-1.5 rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-1.5 py-0 text-[9px] text-[var(--zr-text-secondary)]">{{ tests.length }}</Badge>
      </TabsTrigger>
      <TabsTrigger value="env" data-testid="request-section-trigger-env" data-request-secondary="true" class="zr-tab-trigger opacity-80">
        {{ text.request.env }}
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

    <div data-testid="request-compose-scroll-area" class="min-h-0 flex-1 overflow-y-auto">
      <TabsContent value="params" data-testid="request-section-content-params" class="mt-2.5 px-3 pb-3">
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
                <td class="py-1.5 align-top text-center">
                  <div class="flex h-9 items-center justify-center">
                    <button
                      :data-testid="`request-row-toggle-params-${idx}`"
                      :data-state="param.enabled ? 'on' : 'off'"
                      class="zr-toggle-badge"
                      type="button"
                      @click="toggleItem(params, idx)"
                    >
                      <span class="zr-toggle-dot" aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td class="py-1.5 align-top">
                  <Input
                    v-model="param.key"
                    :aria-invalid="isKeyValueRowInvalid('params', param, idx)"
                    :class="[
                      'zr-input h-9 rounded-lg text-xs font-mono shadow-none',
                      !param.enabled && 'opacity-50',
                      isKeyValueRowInvalid('params', param, idx) && 'border-rose-500/35 bg-rose-500/5',
                    ]"
                    @update:model-value="markRowRevealed('params', idx)"
                  />
                  <div
                    v-if="isKeyValueRowInvalid('params', param, idx)"
                    :data-testid="`request-row-error-params-${idx}`"
                    class="mt-1 text-[10px] text-rose-700 dark:text-rose-300"
                  >
                    {{ text.request.rowKeyRequired }}
                  </div>
                </td>
                <td class="py-1.5 align-top">
                  <Input
                    v-model="param.value"
                    :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !param.enabled && 'opacity-50']"
                    @update:model-value="markRowRevealed('params', idx)"
                  />
                </td>
                <td class="py-1.5 align-top">
                  <Input
                    v-model="param.description"
                    :class="['zr-input h-9 rounded-lg text-xs shadow-none', !param.enabled && 'opacity-50']"
                    @update:model-value="markRowRevealed('params', idx)"
                  />
                </td>
                <td class="py-1.5 align-top">
                  <div class="flex h-9 items-center justify-center">
                    <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeItem(params, idx, 'params')">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="ghost" size="sm" class="zr-dashed-button mt-2.5 rounded-lg text-xs" @click="addItem(params, 'params')">
          {{ text.request.addParameter }}
        </Button>
      </TabsContent>

      <TabsContent value="headers" data-testid="request-section-content-headers" class="mt-2.5 px-3 pb-3">
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
                <td class="py-1.5 align-top text-center">
                  <div class="flex h-9 items-center justify-center">
                    <button
                      :data-testid="`request-row-toggle-headers-${idx}`"
                      :data-state="header.enabled ? 'on' : 'off'"
                      class="zr-toggle-badge"
                      type="button"
                      @click="toggleItem(headers, idx)"
                    >
                      <span class="zr-toggle-dot" aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td class="py-1.5 align-top">
                  <Input
                    v-model="header.key"
                    :aria-invalid="isKeyValueRowInvalid('headers', header, idx)"
                    :class="[
                      'zr-input h-9 rounded-lg text-xs font-mono shadow-none',
                      !header.enabled && 'opacity-50',
                      isKeyValueRowInvalid('headers', header, idx) && 'border-rose-500/35 bg-rose-500/5',
                    ]"
                    @update:model-value="markRowRevealed('headers', idx)"
                  />
                  <div
                    v-if="isKeyValueRowInvalid('headers', header, idx)"
                    :data-testid="`request-row-error-headers-${idx}`"
                    class="mt-1 text-[10px] text-rose-700 dark:text-rose-300"
                  >
                    {{ text.request.rowKeyRequired }}
                  </div>
                </td>
                <td class="py-1.5 align-top">
                  <Input
                    v-model="header.value"
                    :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !header.enabled && 'opacity-50']"
                    @update:model-value="markRowRevealed('headers', idx)"
                  />
                </td>
                <td class="py-1.5 align-top">
                  <div class="flex h-9 items-center justify-center">
                    <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeItem(headers, idx, 'headers')">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="ghost" size="sm" class="zr-dashed-button mt-2.5 rounded-lg text-xs" @click="addItem(headers, 'headers')">
          {{ text.request.addHeader }}
        </Button>
      </TabsContent>

      <TabsContent value="body" data-testid="request-section-content-body" class="mt-2.5 px-3 pb-3">
      <div class="mb-2.5 flex items-center gap-1.5">
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'json' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setBodyType('json')">{{ text.request.json }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'formdata' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setBodyType('formdata')">{{ text.request.formData }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'raw' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setBodyType('raw')">{{ text.request.raw }}</Button>
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'binary' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setBodyType('binary')">{{ text.request.binary }}</Button>
      </div>
      <div class="zr-code-panel flex min-h-[18rem] flex-col overflow-hidden rounded-lg">
        <div
          data-testid="request-body-header"
          class="flex items-center justify-between border-b border-[color:var(--zr-border)] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]"
        >
          <span>{{ text.request.requestPayload }}</span>
          <div class="flex items-center gap-2">
            <Button
              v-if="bodyType === 'json'"
              data-testid="request-json-format"
              variant="ghost"
              size="sm"
              class="zr-tool-button h-7 rounded-md px-2.5 text-[10px]"
              :disabled="!bodyContent.trim() || Boolean(jsonBodyError)"
              @click="formatJsonBody"
            >
              {{ text.request.pretty }}
            </Button>
            <span class="zr-chip rounded-full px-2 py-1 text-[10px] tracking-[0.18em] text-[var(--zr-text-secondary)]">{{ bodyType }}</span>
          </div>
        </div>
        <template v-if="bodyType === 'formdata'">
          <div data-testid="request-formdata-editor" class="flex flex-col p-3">
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
                      <td class="px-3 py-1.5 align-top text-center">
                        <div class="flex h-9 items-center justify-center">
                          <button
                            :data-testid="`request-row-toggle-formdata-${idx}`"
                            :data-state="field.enabled ? 'on' : 'off'"
                            class="zr-toggle-badge"
                            type="button"
                            @click="toggleFormDataField(idx)"
                          >
                            <span class="zr-toggle-dot" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td class="px-3 py-1.5 align-top">
                        <Input
                          v-model="field.key"
                          :aria-invalid="isFormDataRowInvalid(field, idx)"
                          :class="[
                            'zr-input h-9 rounded-lg text-xs font-mono shadow-none',
                            !field.enabled && 'opacity-50',
                            isFormDataRowInvalid(field, idx) && 'border-rose-500/35 bg-rose-500/5',
                          ]"
                          @update:model-value="markRowRevealed('formdata', idx)"
                        />
                        <div
                          v-if="isFormDataRowInvalid(field, idx)"
                          :data-testid="`request-row-error-formdata-${idx}`"
                          class="mt-1 text-[10px] text-rose-700 dark:text-rose-300"
                        >
                          {{ text.request.rowKeyRequired }}
                        </div>
                      </td>
                      <td class="px-3 py-1.5 align-top">
                        <Input
                          v-model="field.value"
                          :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !field.enabled && 'opacity-50']"
                          @update:model-value="markRowRevealed('formdata', idx)"
                        />
                      </td>
                      <td class="px-3 py-1.5 align-top">
                        <div class="flex h-9 items-center justify-center">
                          <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeFormDataField(idx)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
          <div data-testid="request-binary-editor" class="flex flex-col gap-3 p-3">
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
          <CodeEditorSurface
            test-id="request-body-code-editor"
            :content="bodyContent"
            :language="bodyType === 'json' ? 'json' : 'text'"
            :read-only="false"
            @update:content="bodyContent = $event"
          />
          <div
            v-if="bodyType === 'json' && jsonBodyError"
            data-testid="request-json-error"
            class="border-t border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
          >
            {{ text.request.jsonInvalid }}: {{ jsonBodyError }}
          </div>
        </template>
      </div>
      </TabsContent>

      <TabsContent value="mock" data-testid="request-section-content-mock" class="mt-2.5 px-3 pb-3">
        <div class="zr-code-panel flex min-h-[18rem] flex-col gap-3 rounded-lg p-3">
          <template v-if="mock">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mock }}</div>
                <div class="mt-1 text-xs text-[var(--zr-text-secondary)]">{{ text.request.mockEnabled }}</div>
              </div>
              <button
                data-testid="request-mock-enabled"
                :data-state="mock.enabled ? 'on' : 'off'"
                class="zr-toggle-badge"
                type="button"
                @click="toggleMockEnabled"
              >
                <span class="zr-toggle-dot" aria-hidden="true" />
              </button>
            </div>

            <div class="grid gap-2.5 md:grid-cols-3">
              <div class="space-y-2">
                <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mockStatus }}</div>
                <Input
                  data-testid="request-mock-status"
                  :model-value="String(mock.status)"
                  class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
                  @update:model-value="updateMockStatus"
                />
              </div>
              <div class="space-y-2 md:col-span-2">
                <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mockStatusText }}</div>
                <Input
                  data-testid="request-mock-status-text"
                  :model-value="mock.statusText"
                  class="zr-input h-9 rounded-lg text-xs shadow-none"
                  @update:model-value="updateMockStatusText"
                />
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mockContentType }}</div>
              <Input
                data-testid="request-mock-content-type"
                :model-value="mock.contentType"
                class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
                @update:model-value="updateMockContentType"
              />
            </div>

            <div class="space-y-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mockHeaders }}</div>
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
                            @click="toggleMockHeader(idx)"
                          >
                            <span class="zr-toggle-dot" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td class="px-3 py-1.5 align-top">
                        <Input
                          :model-value="header.key"
                          class="zr-input h-9 rounded-lg text-xs font-mono shadow-none"
                          @update:model-value="updateMockHeader(idx, { key: String($event) })"
                        />
                      </td>
                      <td class="px-3 py-1.5 align-top">
                        <Input
                          :model-value="header.value"
                          class="zr-input h-9 rounded-lg text-xs font-mono shadow-none"
                          @update:model-value="updateMockHeader(idx, { value: String($event) })"
                        />
                      </td>
                      <td class="px-3 py-1.5 align-top">
                        <div class="flex h-9 items-center justify-center">
                          <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeMockHeader(idx)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="mock.headers.length === 0">
                      <td colspan="4" class="px-3 py-4 text-center text-xs text-[var(--zr-text-muted)]">{{ text.request.mockHeaders }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button variant="ghost" size="sm" class="zr-dashed-button rounded-lg text-xs" @click="addMockHeader">
                {{ text.request.addMockHeader }}
              </Button>
            </div>

            <div class="flex min-h-[14rem] flex-1 flex-col gap-2">
              <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mockBody }}</div>
              <div class="zr-code-panel flex min-h-[14rem] flex-1 overflow-hidden rounded-lg">
                <CodeEditorSurface
                  test-id="request-mock-body-editor"
                  :content="mock.body"
                  :language="mock.contentType.includes('json') ? 'json' : 'text'"
                  :read-only="false"
                  @update:content="updateMockBody"
                />
              </div>
            </div>
          </template>
          <div
            v-else
            class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center text-xs text-[var(--zr-text-muted)]"
          >
            {{ text.request.mockEmpty }}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="auth" data-testid="request-section-content-auth" class="mt-2.5 px-3 pb-3">
      <div class="mb-2.5 flex flex-wrap items-center gap-1.5">
        <Button variant="ghost" size="sm" :class="['h-7 rounded-lg text-[10px]', auth.type === 'none' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setAuthType('none')">{{ text.request.none }}</Button>
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
            <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', auth.apiKeyPlacement === 'header' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setApiKeyPlacement('header')">{{ text.request.header }}</Button>
            <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', auth.apiKeyPlacement === 'query' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="setApiKeyPlacement('query')">{{ text.request.query }}</Button>
          </div>
        </template>
        </div>
      </TabsContent>

      <TabsContent value="tests" data-testid="request-section-content-tests" class="mt-2.5 px-3 pb-3">
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
      </TabsContent>

      <TabsContent value="env" data-testid="request-section-content-env" class="mt-2.5 px-3 pb-3">
      <div class="mb-2.5 flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.activeEnvironment }}</div>
          <div class="mt-1 text-sm font-medium text-[var(--zr-text-primary)]">{{ props.environmentName }}</div>
        </div>
        <Badge variant="secondary" class="rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-2 py-0.5 text-[10px] text-[var(--zr-text-secondary)]">
          {{ text.request.vars(enabledEnvironmentVariablesCount) }}
        </Badge>
      </div>
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
                <td class="py-1.5 align-top text-center">
                  <div class="flex h-9 items-center justify-center">
                    <button
                      :data-testid="`request-row-toggle-env-${idx}`"
                      :data-state="variable.enabled ? 'on' : 'off'"
                      class="zr-toggle-badge"
                      type="button"
                      @click="toggleItem(environmentVariables, idx)"
                    >
                      <span class="zr-toggle-dot" aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td class="py-1.5 align-top">
                  <Input
                    v-model="variable.key"
                    :aria-invalid="isKeyValueRowInvalid('env', variable, idx)"
                    :class="[
                      'zr-input h-9 rounded-lg text-xs font-mono shadow-none',
                      !variable.enabled && 'opacity-50',
                      isKeyValueRowInvalid('env', variable, idx) && 'border-rose-500/35 bg-rose-500/5',
                    ]"
                    @update:model-value="markRowRevealed('env', idx)"
                  />
                  <div
                    v-if="isKeyValueRowInvalid('env', variable, idx)"
                    :data-testid="`request-row-error-env-${idx}`"
                    class="mt-1 text-[10px] text-rose-700 dark:text-rose-300"
                  >
                    {{ text.request.rowKeyRequired }}
                  </div>
                </td>
                <td class="py-1.5 align-top">
                  <Input v-model="variable.value" :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !variable.enabled && 'opacity-50']" @update:model-value="markRowRevealed('env', idx)" />
                </td>
                <td class="py-1.5 align-top">
                  <Input v-model="variable.description" :class="['zr-input h-9 rounded-lg text-xs shadow-none', !variable.enabled && 'opacity-50']" @update:model-value="markRowRevealed('env', idx)" />
                </td>
                <td class="py-1.5 align-top">
                  <div class="flex h-9 items-center justify-center">
                    <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="removeItem(environmentVariables, idx, 'env')">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="ghost" size="sm" class="zr-dashed-button mt-2.5 rounded-lg text-xs" @click="addItem(environmentVariables, 'env')">
          {{ text.request.addVariable }}
        </Button>
      </TabsContent>
    </div>
  </Tabs>
</template>
