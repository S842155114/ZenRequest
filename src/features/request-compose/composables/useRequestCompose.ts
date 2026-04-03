import { computed, ref, watch, type Ref } from 'vue'
import { getMessages } from '@/lib/i18n'
import { defaultAuthConfig, defaultExecutionOptions, defaultRequestTest } from '@/lib/request-workspace'
import type {
  AppLocale,
  AuthConfig,
  FormDataFieldSnapshot,
  KeyValueItem,
  RequestBodyType,
  RequestExecutionOptions,
  RequestMockState,
  RequestTestDefinition,
} from '@/types/request'
import {
  bytesToBase64,
  cloneFormDataDraft,
  createFormDataField,
  createKeyValueItem,
  createMockHeader,
  createMockState,
  decodeBase64Size,
  hasFormDataFieldContent,
  hasKeyValueRowContent,
  serializeFormDataFields,
  trimValue,
} from '../request-compose.helpers'
import { composeSections, type ComposeSection, type TableSection, type TextBodyMode } from '../request-compose.types'

interface UseRequestComposeOptions {
  locale: Ref<AppLocale>
  requestKey: Ref<string | undefined>
  params: Ref<KeyValueItem[]>
  headers: Ref<KeyValueItem[]>
  bodyContent: Ref<string>
  bodyType: Ref<RequestBodyType>
  bodyContentType: Ref<string>
  formDataFields: Ref<FormDataFieldSnapshot[]>
  binaryFileName: Ref<string>
  binaryMimeType: Ref<string>
  auth: Ref<AuthConfig>
  tests: Ref<RequestTestDefinition[]>
  environmentVariables: Ref<KeyValueItem[]>
  mock: Ref<RequestMockState | undefined>
  executionOptions?: Ref<RequestExecutionOptions | undefined>
}

export const useRequestCompose = ({
  locale,
  requestKey,
  params,
  headers,
  bodyContent,
  bodyType,
  bodyContentType,
  formDataFields,
  binaryFileName,
  binaryMimeType,
  auth,
  tests,
  environmentVariables,
  mock,
  executionOptions,
}: UseRequestComposeOptions) => {
  const activeSection = ref<ComposeSection>('params')
  const revealedRows = ref<Record<TableSection, boolean[]>>({
    params: [],
    headers: [],
    env: [],
    formdata: [],
  })

  const textBodyDraftsByRequest = ref<Record<string, Record<TextBodyMode, string>>>({})
  const formDataDraftsByRequest = ref<Record<string, FormDataFieldSnapshot[]>>({})
  const resolvedExecutionOptions = computed(() => executionOptions?.value ?? defaultExecutionOptions())

  const getRequestDraftKey = () => requestKey.value || '__default__'

  const ensureTextBodyDrafts = () => {
    const nextRequestKey = getRequestDraftKey()
    if (!textBodyDraftsByRequest.value[nextRequestKey]) {
      textBodyDraftsByRequest.value[nextRequestKey] = {
        json: '',
        raw: '',
        binary: '',
      }
    }
    return textBodyDraftsByRequest.value[nextRequestKey]
  }

  const ensureFormDataDraft = () => {
    const nextRequestKey = getRequestDraftKey()
    if (!formDataDraftsByRequest.value[nextRequestKey]) {
      formDataDraftsByRequest.value[nextRequestKey] = []
    }
    return formDataDraftsByRequest.value[nextRequestKey]
  }

  const syncCurrentTextBodyDraft = () => {
    if (bodyType.value === 'formdata') return
    ensureTextBodyDrafts()[bodyType.value] = bodyContent.value
  }

  const syncCurrentFormDataDraft = () => {
    if (bodyType.value !== 'formdata') return
    formDataDraftsByRequest.value[getRequestDraftKey()] = cloneFormDataDraft(formDataFields.value)
  }

  watch(requestKey, () => {
    syncCurrentTextBodyDraft()
    syncCurrentFormDataDraft()
  }, { immediate: true })

  watch(bodyContent, () => {
    syncCurrentTextBodyDraft()
  })

  const toggleItem = (items: KeyValueItem[], index: number) => {
    items[index].enabled = !items[index].enabled
  }

  const removeItem = (items: KeyValueItem[], index: number, section: Exclude<TableSection, 'formdata'>) => {
    items.splice(index, 1)
    revealedRows.value[section].splice(index, 1)
  }

  const addItem = (items: KeyValueItem[], section: Exclude<TableSection, 'formdata'>) => {
    items.push(createKeyValueItem())
    revealedRows.value[section].push(false)
  }

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
      const nextHeaders = current.headers.map((header) => ({ ...header }))
      nextHeaders[index].enabled = !nextHeaders[index].enabled
      return {
        ...current,
        headers: nextHeaders,
      }
    })
  }

  const updateMockHeader = (index: number, patch: Partial<KeyValueItem>) => {
    updateMock((current) => {
      const nextHeaders = current.headers.map((header) => ({ ...header }))
      nextHeaders[index] = {
        ...nextHeaders[index],
        ...patch,
      }
      return {
        ...current,
        headers: nextHeaders,
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
      ...(auth.value ?? defaultAuthConfig()),
      type,
    }
  }

  const setApiKeyPlacement = (placement: NonNullable<AuthConfig['apiKeyPlacement']>) => {
    auth.value = {
      ...(auth.value ?? defaultAuthConfig()),
      apiKeyPlacement: placement,
    }
  }

  const setExecutionTimeout = (value: string | number) => {
    const raw = String(value).trim()
    if (!executionOptions) return
    executionOptions.value = {
      ...resolvedExecutionOptions.value,
      timeoutMs: raw ? Number.parseInt(raw, 10) || 0 : undefined,
    }
  }

  const setExecutionRedirectPolicy = (value: RequestExecutionOptions['redirectPolicy']) => {
    if (!executionOptions) return
    executionOptions.value = {
      ...resolvedExecutionOptions.value,
      redirectPolicy: value,
    }
  }

  const setExecutionProxyMode = (value: RequestExecutionOptions['proxy']['mode']) => {
    if (!executionOptions) return
    executionOptions.value = {
      ...resolvedExecutionOptions.value,
      proxy: value === 'custom'
        ? {
          mode: 'custom',
          url: resolvedExecutionOptions.value.proxy.mode === 'custom' ? resolvedExecutionOptions.value.proxy.url : '',
        }
        : { mode: value },
    }
  }

  const setExecutionProxyUrl = (value: string | number) => {
    if (!executionOptions) return
    executionOptions.value = {
      ...resolvedExecutionOptions.value,
      proxy: {
        mode: 'custom',
        url: String(value),
      },
    }
  }

  const setVerifySsl = (value: boolean) => {
    if (!executionOptions) return
    executionOptions.value = {
      ...resolvedExecutionOptions.value,
      verifySsl: value,
    }
  }

  const markRowRevealed = (section: TableSection, index: number) => {
    revealedRows.value[section][index] = true
  }

  const syncRevealedRows = (section: TableSection, length: number) => {
    revealedRows.value[section] = Array.from({ length }, () => false)
  }

  watch(params, (items) => {
    syncRevealedRows('params', items.length)
  }, { immediate: true })

  watch(headers, (items) => {
    syncRevealedRows('headers', items.length)
  }, { immediate: true })

  watch(environmentVariables, (items) => {
    syncRevealedRows('env', items.length)
  }, { immediate: true })

  watch(formDataFields, (items) => {
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

  const jsonBodyError = computed(() => {
    if (bodyType.value !== 'json' || !bodyContent.value.trim()) return ''

    try {
      JSON.parse(bodyContent.value)
      return ''
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })

  const executionInvalidCount = computed(() => {
    let count = 0

    if (resolvedExecutionOptions.value.timeoutMs !== undefined && resolvedExecutionOptions.value.timeoutMs <= 0) {
      count += 1
    }

    if (resolvedExecutionOptions.value.proxy.mode === 'custom' && !resolvedExecutionOptions.value.proxy.url.trim()) {
      count += 1
    }

    return count
  })

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

    if (executionInvalidCount.value > 0) {
      activeSection.value = 'execution'
      return false
    }

    return invalidParamsCount.value
      + invalidHeadersCount.value
      + invalidEnvironmentVariablesCount.value
      + bodyInvalidCount.value
      + executionInvalidCount.value === 0
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
    bodyContent.value = ensureTextBodyDrafts()[nextType]
  }

  const addTest = () => {
    tests.value.push(defaultRequestTest())
  }

  const removeTest = (index: number) => {
    tests.value.splice(index, 1)
  }

  watch(formDataFields, (fields) => {
    if (bodyType.value !== 'formdata') return

    const nextBody = serializeFormDataFields(fields)
    if (nextBody === bodyContent.value) return
    bodyContent.value = nextBody
  }, { deep: true })

  watch([bodyType, bodyContent], ([nextBodyType]) => {
    if (nextBodyType === 'raw' && !bodyContentType.value) {
      bodyContentType.value = 'text/plain'
    }
  }, { immediate: true })

  watch(() => executionOptions?.value, (value) => {
    if (!executionOptions) return
    if (!value) {
      executionOptions.value = defaultExecutionOptions()
    }
  }, { immediate: true, deep: true })

  const formatJsonBody = () => {
    if (bodyType.value !== 'json' || !bodyContent.value.trim() || jsonBodyError.value) return
    bodyContent.value = JSON.stringify(JSON.parse(bodyContent.value), null, 2)
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
  const executionConfiguredCount = computed(() => {
    let count = 0

    if (resolvedExecutionOptions.value.timeoutMs !== undefined) count += 1
    if (resolvedExecutionOptions.value.redirectPolicy !== 'follow') count += 1
    if (resolvedExecutionOptions.value.proxy.mode !== 'inherit') count += 1
    if (!resolvedExecutionOptions.value.verifySsl) count += 1

    return count
  })
  const bodyInvalidCount = computed(() => (bodyType.value === 'formdata' ? invalidFormDataCount.value : 0))

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

  const text = computed(() => getMessages(locale.value))
  const requestText = computed(() => text.value.request)

  return {
    activeSection,
    authConfiguredCount,
    bodyConfiguredCount,
    bodyInvalidCount,
    binaryPayloadSize,
    enabledEnvironmentVariablesCount,
    enabledHeadersCount,
    enabledParamsCount,
    executionConfiguredCount,
    executionInvalidCount,
    handleBinaryFileChange,
    handleSectionChange,
    invalidEnvironmentVariablesCount,
    invalidHeadersCount,
    invalidParamsCount,
    isFormDataRowInvalid,
    isKeyValueRowInvalid,
    jsonBodyError,
    markRowRevealed,
    prepareForSubmit,
    requestText,
    setApiKeyPlacement,
    setAuthType,
    setBodyType,
    setExecutionRedirectPolicy,
    setExecutionProxyMode,
    setExecutionProxyUrl,
    setExecutionTimeout,
    setVerifySsl,
    text,
    addFormDataField,
    addItem,
    addMockHeader,
    addTest,
    formatJsonBody,
    removeFormDataField,
    removeItem,
    removeMockHeader,
    removeTest,
    toggleFormDataField,
    toggleItem,
    toggleMockEnabled,
    toggleMockHeader,
    updateMockBody,
    updateMockContentType,
    updateMockHeader,
    updateMockStatus,
    updateMockStatusText,
  }
}
