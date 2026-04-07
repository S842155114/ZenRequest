import { computed, ref, watch } from 'vue'
import { getMessages, localizeScratchPadName } from '@/lib/i18n'
import { cloneAuth, cloneExecutionOptions, cloneItems, cloneMock, cloneTests, normalizeRequestTabState } from '@/lib/request-workspace'
import type {
  AppLocale,
  FormDataFieldSnapshot,
  KeyValueItem,
  RequestExecutionOptions,
  RequestMockState,
  RequestTabState,
  RequestTestDefinition,
  SendRequestPayload,
  WorkbenchActivityProjection,
} from '@/types/request'

export interface RequestPanelProps {
  locale: AppLocale
  tabs: RequestTabState[]
  activityProjection?: WorkbenchActivityProjection
  activeTabId: string
  activeEnvironmentName: string
  activeEnvironmentVariables: KeyValueItem[]
  resolvedActiveUrl: string
  showOpenApiImport?: boolean
  collapsed?: boolean
}

type RequestReadinessState = {
  blockers: string[]
  advisories: string[]
}

type CompactTabState = 'neutral' | 'dirty' | 'pending' | 'success' | 'error'

const cloneFormDataFields = (fields?: FormDataFieldSnapshot[]) => (fields ?? []).map((field) => ({ ...field }))

const templateTokenPattern = /\{\{\s*([^}]+?)\s*\}\}/g

const collectTemplateKeys = (value?: string) => {
  const keys = new Set<string>()
  if (!value) return keys

  for (const match of value.matchAll(templateTokenPattern)) {
    const key = match[1]?.trim()
    if (key) {
      keys.add(key)
    }
  }

  return keys
}

export const createDefaultActivityProjection = (): WorkbenchActivityProjection => ({
  requests: {},
  history: {},
  tabs: {},
  summary: {
    open: 0,
    dirty: 0,
    running: 0,
    recovered: 0,
  },
})

export const useRequestPanelState = (
  props: RequestPanelProps,
  emit: (...args: any[]) => void,
) => {
  const activityProjection = computed(() => props.activityProjection ?? createDefaultActivityProjection())
  const normalizedTabs = computed(() => props.tabs.map((tab) => normalizeRequestTabState(tab)))
  const activeTab = computed(() => normalizedTabs.value.find((tab) => tab.id === props.activeTabId) ?? normalizedTabs.value[0] ?? null)
  const text = computed(() => getMessages(props.locale))
  const requestPanelBusy = computed(() => activeTab.value?.isSending ?? false)
  const requestParamsRef = ref<{ prepareForSubmit?: () => boolean } | null>(null)

  const method = ref('GET')
  const url = ref('')
  const params = ref<KeyValueItem[]>([])
  const headers = ref<KeyValueItem[]>([])
  const bodyContent = ref('')
  const bodyType = ref<'json' | 'formdata' | 'raw' | 'binary'>('json')
  const bodyContentType = ref('')
  const formDataFields = ref<FormDataFieldSnapshot[]>([])
  const binaryFileName = ref('')
  const binaryMimeType = ref('')
  const auth = ref(cloneAuth())
  const tests = ref<RequestTestDefinition[]>([])
  const environmentVariables = ref<KeyValueItem[]>([])
  const mock = ref<RequestMockState | undefined>(undefined)
  const executionOptions = ref<RequestExecutionOptions>(cloneExecutionOptions())

  const applyTab = (tab: RequestTabState | null) => {
    if (!tab) return

    method.value = tab.method
    url.value = tab.url
    params.value = cloneItems(tab.params)
    headers.value = cloneItems(tab.headers)
    bodyContent.value = tab.body
    bodyType.value = tab.bodyType
    bodyContentType.value = tab.bodyContentType ?? ''
    formDataFields.value = cloneFormDataFields(tab.formDataFields)
    binaryFileName.value = tab.binaryFileName ?? ''
    binaryMimeType.value = tab.binaryMimeType ?? ''
    auth.value = cloneAuth(tab.auth)
    tests.value = cloneTests(tab.tests)
    mock.value = cloneMock(tab.mock)
    executionOptions.value = cloneExecutionOptions(tab.executionOptions)
  }

  const applyEnvironmentVariables = (items: KeyValueItem[]) => {
    environmentVariables.value = cloneItems(items)
  }

  watch(() => props.activeTabId, () => {
    applyTab(activeTab.value)
  }, { immediate: true })

  watch(() => props.activeEnvironmentName, () => {
    applyEnvironmentVariables(props.activeEnvironmentVariables)
  }, { immediate: true })

  watch(
    [method, url, params, headers, bodyContent, bodyType, bodyContentType, formDataFields, binaryFileName, binaryMimeType, auth, tests, mock, executionOptions],
    () => {
      if (!activeTab.value) return

      emit('update-active-tab', {
        method: method.value,
        url: url.value,
        params: cloneItems(params.value),
        headers: cloneItems(headers.value),
        body: bodyContent.value,
        bodyType: bodyType.value,
        bodyContentType: bodyContentType.value || undefined,
        formDataFields: cloneFormDataFields(formDataFields.value),
        binaryFileName: binaryFileName.value || undefined,
        binaryMimeType: binaryMimeType.value || undefined,
        auth: cloneAuth(auth.value),
        tests: cloneTests(tests.value),
        mock: cloneMock(mock.value),
        executionOptions: cloneExecutionOptions(executionOptions.value),
      })
    },
    { deep: true },
  )

  watch(environmentVariables, (items) => {
    emit('update-environment-variables', cloneItems(items))
  }, { deep: true })

  const handleSend = () => {
    if (!activeTab.value) return

    if (activeTab.value.requestKind !== 'mcp') {
      const composeValidationPassed = requestParamsRef.value?.prepareForSubmit?.() ?? true
      if (!composeValidationPassed) return
    }

    if (requestReadiness.value.blockers.length > 0) return

    if (activeTab.value.requestKind === 'mcp') {
      emit('send', {
        tabId: activeTab.value.id,
        requestKind: 'mcp',
        mcp: activeTab.value.mcp,
        requestId: activeTab.value.requestId,
        name: activeTab.value.name,
        description: activeTab.value.description,
        tags: [...activeTab.value.tags],
        collectionName: activeTab.value.collectionName,
        method: method.value,
        url: activeTab.value.mcp?.connection.baseUrl ?? url.value,
        params: [],
        headers: [],
        body: '',
        bodyType: 'json',
        auth: cloneAuth(auth.value),
        tests: cloneTests(tests.value),
        mock: cloneMock(mock.value),
        executionOptions: cloneExecutionOptions(executionOptions.value),
      } satisfies SendRequestPayload)
      return
    }

    emit('send', {
      tabId: activeTab.value.id,
      requestId: activeTab.value.requestId,
      name: activeTab.value.name,
      description: activeTab.value.description,
      tags: [...activeTab.value.tags],
      collectionName: activeTab.value.collectionName,
      method: method.value,
      url: url.value,
      params: cloneItems(params.value),
      headers: cloneItems(headers.value),
      body: bodyContent.value,
      bodyType: bodyType.value,
      bodyContentType: bodyContentType.value || undefined,
      formDataFields: cloneFormDataFields(formDataFields.value),
      binaryFileName: binaryFileName.value || undefined,
      binaryMimeType: binaryMimeType.value || undefined,
      auth: cloneAuth(auth.value),
      tests: cloneTests(tests.value),
      mock: cloneMock(mock.value),
      executionOptions: cloneExecutionOptions(executionOptions.value),
    } satisfies SendRequestPayload)
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

  const requestReadiness = computed<RequestReadinessState>(() => {
    if (!activeTab.value) {
      return {
        blockers: [],
        advisories: [],
      }
    }

    const blockers: string[] = []
    const advisories: string[] = []
    const availableVariables = new Map(
      props.activeEnvironmentVariables
        .filter((item) => item.enabled && item.key.trim() && item.value.trim())
        .map((item) => [item.key.trim(), item.value.trim()]),
    )

    const isMcpRequest = activeTab.value.requestKind === 'mcp'

    if (isMcpRequest) {
      const baseUrl = activeTab.value.mcp?.connection.baseUrl?.trim() ?? ''
      const operation = activeTab.value.mcp?.operation
      if (!baseUrl) {
        blockers.push(text.value.request.mcp.endpointNotConfigured)
      }

      if (operation?.type === 'initialize') {
        if (!operation.input.clientName.trim()) {
          blockers.push(text.value.request.mcp.blockerClientName)
        }
        if (!operation.input.clientVersion.trim()) {
          blockers.push(text.value.request.mcp.blockerClientVersion)
        }
      }

      if (operation?.type === 'tools.call') {
        if (!operation.input.toolName.trim()) {
          blockers.push(text.value.request.mcp.blockerSelectTool)
        }

        const requiredKeys = Array.isArray(operation.input.schema?.inputSchema?.required)
          ? operation.input.schema.inputSchema.required.filter((item): item is string => typeof item === 'string')
          : []
        const missingRequiredKeys = requiredKeys.filter((key) => {
          const value = operation.input.arguments[key]
          if (typeof value === 'string') return !value.trim()
          return value === undefined || value === null
        })

        if (missingRequiredKeys.length > 0) {
          blockers.push(text.value.request.mcp.blockerRequiredArguments(missingRequiredKeys.join(', ')))
        }
      }

      if (operation?.type === 'resources.read' && !operation.input.uri.trim()) {
        blockers.push(text.value.request.mcp.blockerResourceUri)
      }

      if (operation?.type === 'prompts.get' && !operation.input.promptName.trim()) {
        blockers.push(text.value.request.mcp.blockerPromptName)
      }
    } else if (!url.value.trim()) {
      blockers.push(text.value.request.emptyUrlBlocker)
    }

    const unresolvedKeys = new Set<string>()
    const stringSources = [
      ...(activeTab.value.requestKind === 'mcp' ? [activeTab.value.mcp?.connection.baseUrl ?? ''] : [url.value]),
      bodyType.value === 'json' || bodyType.value === 'raw' ? bodyContent.value : '',
      bodyContentType.value,
      binaryFileName.value,
      binaryMimeType.value,
      ...params.value.flatMap((item) => [item.key, item.value]),
      ...headers.value.flatMap((item) => [item.key, item.value]),
      auth.value.bearerToken,
      auth.value.username,
      auth.value.password,
      auth.value.apiKeyKey,
      auth.value.apiKeyValue,
      ...tests.value.flatMap((test) => [test.name, test.target ?? '', test.expected ?? '']),
      executionOptions.value.proxy.mode === 'custom' ? executionOptions.value.proxy.url : '',
    ]

    if (bodyType.value === 'formdata') {
      stringSources.push(
        ...formDataFields.value.flatMap((field) => [
          field.key,
          field.value,
          field.fileName ?? '',
          field.mimeType ?? '',
        ]),
      )
    }

    for (const source of stringSources) {
      for (const key of collectTemplateKeys(source)) {
        if (!availableVariables.has(key)) {
          unresolvedKeys.add(key)
        }
      }
    }

    if (unresolvedKeys.size > 0) {
      blockers.push(text.value.request.missingVariablesBlocker([...unresolvedKeys].join(', ')))
    }

    if (activeTab.value.requestKind !== 'mcp' && bodyType.value === 'binary' && !bodyContent.value.trim()) {
      blockers.push(text.value.request.missingBinaryPayloadBlocker)
    }

    if (activeTab.value.isDirty || activeTab.value.persistenceState !== 'saved') {
      advisories.push(text.value.request.unsavedChangesAdvisory)
    }

    if (activeTab.value.requestKind !== 'mcp' && bodyType.value === 'json' && jsonBodyError.value) {
      blockers.push(text.value.request.jsonInvalid)
    }

    return {
      blockers,
      advisories,
    }
  })

  const getTabMethodClass = (value: string) => {
    switch (value) {
      case 'GET': return 'text-emerald-700 dark:text-emerald-300'
      case 'POST': return 'text-orange-700 dark:text-orange-300'
      case 'PUT': return 'text-sky-700 dark:text-sky-300'
      case 'DELETE': return 'text-rose-700 dark:text-rose-300'
      case 'PATCH': return 'text-cyan-700 dark:text-cyan-300'
      default: return 'text-[var(--zr-text-secondary)]'
    }
  }

  const getTabOriginKind = (tab: RequestTabState) => tab.origin?.kind ?? (tab.requestId ? 'resource' : 'scratch')

  const getOriginLabel = (tab: RequestTabState) => {
    switch (getTabOriginKind(tab)) {
      case 'resource': return text.value.request.resource
      case 'replay': return text.value.request.recovered
      case 'detached': return text.value.request.detached
      default: return text.value.request.scratch
    }
  }

  const getPersistenceLabel = (tab: RequestTabState) => {
    switch (tab.persistenceState) {
      case 'saved': return text.value.request.saved
      case 'unbound': return text.value.request.unbound
      default: return text.value.request.draft
    }
  }

  const getExecutionStateLabel = (tab: RequestTabState) => {
    const state = activityProjection.value.tabs[tab.id]?.result ?? tab.executionState ?? 'idle'
    switch (state) {
      case 'pending': return text.value.request.running
      case 'success': return text.value.request.success
      case 'http-error': return text.value.request.failed
      case 'transport-error': return text.value.request.error
      default: return text.value.request.ready
    }
  }

  const getExecutionState = (tab: RequestTabState) => activityProjection.value.tabs[tab.id]?.result ?? tab.executionState ?? 'idle'

  const getCompactTabState = (tab: RequestTabState): CompactTabState => {
    const state = getExecutionState(tab)

    if (tab.isSending || state === 'pending') return 'pending'
    if (state === 'http-error' || state === 'transport-error') return 'error'
    if (tab.isDirty || tab.persistenceState !== 'saved') return 'dirty'
    if (state === 'success') return 'success'
    return 'neutral'
  }

  const getCompactTabStateLabel = (tab: RequestTabState) => {
    switch (getCompactTabState(tab)) {
      case 'pending':
        return text.value.request.running
      case 'error':
        return text.value.request.failed
      case 'dirty':
        return getPersistenceLabel(tab)
      case 'success':
        return text.value.request.success
      default:
        return text.value.request.ready
    }
  }

  const getCompactTabTitle = (tab: RequestTabState) => [
    tab.method,
    tab.name,
    localizeScratchPadName(tab.collectionName, props.locale),
    getCompactTabStateLabel(tab),
  ].join(' · ')

  return {
    activeTab,
    auth,
    binaryFileName,
    binaryMimeType,
    bodyContent,
    bodyContentType,
    bodyType,
    environmentVariables,
    executionOptions,
    formDataFields,
    getCompactTabState,
    getCompactTabStateLabel,
    getCompactTabTitle,
    getExecutionStateLabel,
    getOriginLabel,
    getPersistenceLabel,
    getTabMethodClass,
    handleSend,
    headers,
    method,
    mock,
    normalizedTabs,
    params,
    requestPanelBusy,
    requestParamsRef,
    requestReadiness,
    tests,
    text,
    url,
  }
}
