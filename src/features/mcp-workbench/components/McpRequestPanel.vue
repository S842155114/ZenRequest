<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Save } from 'lucide-vue-next'
import { getMessages } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildMcpSchemaFormModel, parseMcpStructuredArguments } from '@/features/mcp-workbench/lib/mcp-schema-form'
import type {
  AppLocale,
  McpExecutionArtifact,
  McpOperationInput,
  McpPromptSnapshot,
  McpRequestDefinition,
  McpResourceSnapshot,
  McpToolSchemaSnapshot,
  RequestTabExecutionState,
  RequestTabOriginKind,
  RequestTabPersistenceState,
} from '@/types/request'

const props = withDefaults(defineProps<{
  locale: AppLocale
  requestName: string
  requestKey?: string
  requestKind?: 'http' | 'mcp'
  originKind?: RequestTabOriginKind
  persistenceState?: RequestTabPersistenceState
  executionState?: RequestTabExecutionState
  isSending?: boolean
  disableSend?: boolean
  mcp?: McpRequestDefinition
  mcpArtifact?: McpExecutionArtifact
}>(), {
  requestName: '',
  requestKey: '',
  requestKind: 'mcp',
  originKind: 'scratch',
  persistenceState: 'unsaved',
  executionState: 'idle',
  isSending: false,
  disableSend: false,
  mcp: undefined,
  mcpArtifact: undefined,
})

const emit = defineEmits<{
  (e: 'update:mcp', value: McpRequestDefinition): void
  (e: 'discover-tools'): void
  (e: 'discover-resources'): void
  (e: 'discover-prompts'): void
  (e: 'update:request-kind', value: 'http' | 'mcp'): void
  (e: 'send'): void
  (e: 'save'): void
}>()

const defaultMcpDefinition = (): McpRequestDefinition => ({
  connection: {
    transport: 'http',
    baseUrl: '',
    headers: [],
    auth: {
      type: 'none',
      bearerToken: '',
      username: '',
      password: '',
      apiKeyKey: 'X-API-Key',
      apiKeyValue: '',
      apiKeyPlacement: 'header',
    },
  },
  operation: {
    type: 'initialize',
    input: {
      clientName: 'ZenRequest',
      clientVersion: '0.1.0',
    },
  },
})

const ensureMcpDefinition = (): McpRequestDefinition => props.mcp
  ? JSON.parse(JSON.stringify(props.mcp)) as McpRequestDefinition
  : defaultMcpDefinition()

const updateMcp = (updater: (current: McpRequestDefinition) => McpRequestDefinition) => {
  emit('update:mcp', updater(ensureMcpDefinition()))
}

const text = computed(() => getMessages(props.locale))
const currentOperation = computed<McpOperationInput['type']>(() => props.mcp?.operation.type ?? 'initialize')
const operationLabel = computed(() => props.mcp?.operation.type ?? 'initialize')
const transportLabel = computed(() => props.mcp?.connection.transport ?? 'http')
const baseUrl = computed(() => props.mcp?.connection.baseUrl ?? '')
const headerCount = computed(() => props.mcp?.connection.headers.filter((item) => item.enabled && item.key.trim()).length ?? 0)
const transportHint = computed(() => text.value.request.mcp.transportHint)

const originLabel = computed(() => {
  switch (props.originKind) {
    case 'resource': return text.value.request.resource
    case 'replay': return text.value.request.recovered
    case 'detached': return text.value.request.detached
    default: return text.value.request.scratch
  }
})

const persistenceLabel = computed(() => {
  switch (props.persistenceState) {
    case 'saved': return text.value.request.saved
    case 'unbound': return text.value.request.unbound
    default: return text.value.request.draft
  }
})

const executionLabel = computed(() => {
  switch (props.executionState) {
    case 'pending': return text.value.request.running
    case 'success': return text.value.request.success
    case 'http-error': return text.value.request.failed
    case 'transport-error': return text.value.request.error
    default: return text.value.request.ready
  }
})

const originBadgeClass = computed(() => {
  switch (props.originKind) {
    case 'resource': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'replay': return 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300'
    case 'detached': return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    default: return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }
})

const persistenceBadgeClass = computed(() => (
  props.persistenceState === 'saved'
    ? 'border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] text-[var(--zr-text-secondary)]'
    : props.persistenceState === 'unbound'
      ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
      : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
))

const executionBadgeClass = computed(() => {
  switch (props.executionState) {
    case 'pending': return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300'
    case 'success': return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'http-error':
    case 'transport-error':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    default:
      return 'border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] text-[var(--zr-text-secondary)]'
  }
})

const toolName = computed(() => props.mcp?.operation.type === 'tools.call' ? props.mcp.operation.input.toolName : '')
const resourceUri = computed(() => props.mcp?.operation.type === 'resources.read' ? props.mcp.operation.input.uri : '')
const promptName = computed(() => props.mcp?.operation.type === 'prompts.get' ? props.mcp.operation.input.promptName : '')

const availableTools = computed<McpToolSchemaSnapshot[]>(() => {
  if (Array.isArray(props.mcpArtifact?.cachedTools) && props.mcpArtifact.cachedTools.length > 0) {
    return props.mcpArtifact.cachedTools.map((tool) => ({
      ...tool,
      inputSchema: tool.inputSchema ? JSON.parse(JSON.stringify(tool.inputSchema)) as Record<string, unknown> : undefined,
    }))
  }

  const response = props.mcpArtifact?.protocolResponse
  if (!response || typeof response !== 'object') return []
  const result = (response as Record<string, unknown>).result
  if (!result || typeof result !== 'object') return []
  const tools = (result as Record<string, unknown>).tools
  if (!Array.isArray(tools)) return []

  return tools
    .filter((tool): tool is Record<string, unknown> => typeof tool === 'object' && tool !== null)
    .map((tool) => ({
      name: typeof tool.name === 'string' ? tool.name : '',
      title: typeof tool.title === 'string' ? tool.title : undefined,
      description: typeof tool.description === 'string' ? tool.description : undefined,
      inputSchema: typeof tool.inputSchema === 'object' && tool.inputSchema !== null
        ? JSON.parse(JSON.stringify(tool.inputSchema)) as Record<string, unknown>
        : undefined,
    }))
    .filter((tool) => tool.name.trim().length > 0)
})

const selectedToolSchema = computed<McpToolSchemaSnapshot | undefined>(() => {
  if (props.mcp?.operation.type !== 'tools.call') return undefined
  return availableTools.value.find((tool) => tool.name === toolName.value) ?? props.mcp.operation.input.schema
})

const availableResources = computed<McpResourceSnapshot[]>(() => {
  if (Array.isArray(props.mcpArtifact?.cachedResources) && props.mcpArtifact.cachedResources.length > 0) {
    return props.mcpArtifact.cachedResources.map((resource) => ({ ...resource }))
  }

  const response = props.mcpArtifact?.protocolResponse
  if (!response || typeof response !== 'object') return []
  const result = (response as Record<string, unknown>).result
  if (!result || typeof result !== 'object') return []
  const resources = (result as Record<string, unknown>).resources
  if (!Array.isArray(resources)) return []

  return resources
    .filter((resource): resource is Record<string, unknown> => typeof resource === 'object' && resource !== null)
    .map((resource) => ({
      uri: typeof resource.uri === 'string' ? resource.uri : '',
      name: typeof resource.name === 'string' ? resource.name : undefined,
      title: typeof resource.title === 'string' ? resource.title : undefined,
      description: typeof resource.description === 'string' ? resource.description : undefined,
      mimeType: typeof resource.mimeType === 'string' ? resource.mimeType : undefined,
    }))
    .filter((resource) => resource.uri.trim().length > 0)
})

const selectedResource = computed<McpResourceSnapshot | undefined>(() => {
  if (props.mcp?.operation.type !== 'resources.read') return undefined
  return availableResources.value.find((resource) => resource.uri === resourceUri.value) ?? props.mcp.operation.input.resource
})

const availablePrompts = computed<McpPromptSnapshot[]>(() => {
  if (Array.isArray(props.mcpArtifact?.cachedPrompts) && props.mcpArtifact.cachedPrompts.length > 0) {
    return props.mcpArtifact.cachedPrompts.map((prompt) => ({
      ...prompt,
      arguments: prompt.arguments ? prompt.arguments.map((argument) => ({ ...argument })) : undefined,
    }))
  }

  const response = props.mcpArtifact?.protocolResponse
  if (!response || typeof response !== 'object') return []
  const result = (response as Record<string, unknown>).result
  if (!result || typeof result !== 'object') return []
  const prompts = (result as Record<string, unknown>).prompts
  if (!Array.isArray(prompts)) return []

  return prompts
    .filter((prompt): prompt is Record<string, unknown> => typeof prompt === 'object' && prompt !== null)
    .map((prompt) => ({
      name: typeof prompt.name === 'string' ? prompt.name : '',
      title: typeof prompt.title === 'string' ? prompt.title : undefined,
      description: typeof prompt.description === 'string' ? prompt.description : undefined,
      arguments: Array.isArray(prompt.arguments)
        ? prompt.arguments
          .filter((argument): argument is Record<string, unknown> => typeof argument === 'object' && argument !== null)
          .map((argument) => ({
            name: typeof argument.name === 'string' ? argument.name : '',
            title: typeof argument.title === 'string' ? argument.title : undefined,
            description: typeof argument.description === 'string' ? argument.description : undefined,
            required: typeof argument.required === 'boolean' ? argument.required : undefined,
          }))
          .filter((argument) => argument.name.trim().length > 0)
        : undefined,
    }))
    .filter((prompt) => prompt.name.trim().length > 0)
})

const selectedPrompt = computed<McpPromptSnapshot | undefined>(() => {
  if (props.mcp?.operation.type !== 'prompts.get') return undefined
  return availablePrompts.value.find((prompt) => prompt.name === promptName.value) ?? props.mcp.operation.input.prompt
})

const hasDiscoveredTools = computed(() => availableTools.value.length > 0)
const hasDiscoveredResources = computed(() => availableResources.value.length > 0)
const hasDiscoveredPrompts = computed(() => availablePrompts.value.length > 0)

const discoveryActionLabel = computed(() => hasDiscoveredTools.value ? text.value.request.mcp.refreshTools : text.value.request.mcp.discoverTools)
const resourceDiscoveryActionLabel = computed(() => hasDiscoveredResources.value ? text.value.request.mcp.refreshResources : text.value.request.mcp.discoverResources)
const promptDiscoveryActionLabel = computed(() => hasDiscoveredPrompts.value ? text.value.request.mcp.refreshPrompts : text.value.request.mcp.discoverPrompts)

const showDiscoveryRecommendation = computed(() => currentOperation.value === 'tools.call' && !hasDiscoveredTools.value)
const showResourceDiscoveryRecommendation = computed(() => currentOperation.value === 'resources.read' && !hasDiscoveredResources.value)
const showPromptDiscoveryRecommendation = computed(() => currentOperation.value === 'prompts.get' && !hasDiscoveredPrompts.value)

const currentArguments = computed<Record<string, unknown>>(() => {
  if (props.mcp?.operation.type === 'tools.call') return props.mcp.operation.input.arguments
  if (props.mcp?.operation.type === 'prompts.get') return props.mcp.operation.input.arguments
  return {}
})

const selectedArgumentSchema = computed(() => {
  if (props.mcp?.operation.type === 'tools.call') return selectedToolSchema.value
  if (props.mcp?.operation.type !== 'prompts.get') return undefined
  const args = selectedPrompt.value?.arguments ?? []
  return {
    name: selectedPrompt.value?.name ?? '',
    inputSchema: {
      type: 'object',
      properties: Object.fromEntries(args.map((argument) => [argument.name, {
        type: 'string',
        title: argument.title,
        description: argument.description,
      }])),
      required: args.filter((argument) => argument.required).map((argument) => argument.name),
    },
  }
})

const schemaForm = computed(() => buildMcpSchemaFormModel(selectedArgumentSchema.value, currentArguments.value, props.locale))
const rawArguments = ref(schemaForm.value.initialRaw)
const structuredValues = ref<Record<string, string>>({})

watch(schemaForm, (next) => {
  rawArguments.value = next.initialRaw
  structuredValues.value = Object.fromEntries(next.fields.map((field) => [field.key, field.defaultValue]))
}, { immediate: true })

const rawArgumentsError = computed(() => {
  if (schemaForm.value.mode !== 'raw') return ''
  const value = rawArguments.value.trim()
  if (!value) return ''

  try {
    JSON.parse(value)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
})

const handleBaseUrlChange = (value: string | number) => {
  updateMcp((current) => ({
    ...current,
    connection: {
      ...current.connection,
      baseUrl: String(value),
    },
  }))
}

const handleInitializeClientNameChange = (value: string | number) => {
  updateMcp((current) => {
    if (current.operation.type !== 'initialize') return current
    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          clientName: String(value),
        },
      },
    }
  })
}

const handleInitializeClientVersionChange = (value: string | number) => {
  updateMcp((current) => {
    if (current.operation.type !== 'initialize') return current
    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          clientVersion: String(value),
        },
      },
    }
  })
}

const handleOperationChange = (value: unknown) => {
  if (typeof value !== 'string') return
  updateMcp((current) => {
    if (value === current.operation.type) return current

    if (value === 'tools.list') {
      return { ...current, operation: { type: 'tools.list', input: { cursor: '' } } }
    }

    if (value === 'tools.call') {
      const firstTool = availableTools.value[0]
      return {
        ...current,
        operation: {
          type: 'tools.call',
          input: { toolName: firstTool?.name ?? '', arguments: {}, schema: firstTool },
        },
      }
    }

    if (value === 'resources.list') {
      return { ...current, operation: { type: 'resources.list', input: { cursor: '' } } }
    }

    if (value === 'resources.read') {
      const firstResource = availableResources.value[0]
      return {
        ...current,
        operation: {
          type: 'resources.read',
          input: { uri: firstResource?.uri ?? '', resource: firstResource },
        },
      }
    }

    if (value === 'prompts.list') {
      return { ...current, operation: { type: 'prompts.list', input: { cursor: '' } } }
    }

    if (value === 'prompts.get') {
      const firstPrompt = availablePrompts.value[0]
      return {
        ...current,
        operation: {
          type: 'prompts.get',
          input: { promptName: firstPrompt?.name ?? '', arguments: {}, prompt: firstPrompt },
        },
      }
    }

    return {
      ...current,
      operation: {
        type: 'initialize',
        input: {
          clientName: 'ZenRequest',
          clientVersion: '0.1.0',
        },
      },
    }
  })
}

const handleToolSelection = (nextToolName: unknown) => {
  if (typeof nextToolName !== 'string' || nextToolName.length === 0) return
  updateMcp((current) => {
    if (current.operation.type !== 'tools.call') return current
    const matchedTool = availableTools.value.find((tool) => tool.name === nextToolName)

    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          toolName: nextToolName,
          schema: matchedTool,
          arguments: {},
        },
      },
    }
  })
}

const handleToolNameChange = (value: string | number) => {
  const nextToolName = String(value)
  if (availableTools.value.some((tool) => tool.name === nextToolName)) {
    handleToolSelection(nextToolName)
    return
  }

  updateMcp((current) => {
    if (current.operation.type !== 'tools.call') return current
    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          toolName: nextToolName,
        },
      },
    }
  })
}

const handleResourceSelection = (nextUri: unknown) => {
  if (typeof nextUri !== 'string' || nextUri.length === 0) return
  updateMcp((current) => {
    if (current.operation.type !== 'resources.read') return current
    const matchedResource = availableResources.value.find((resource) => resource.uri === nextUri)

    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          uri: nextUri,
          resource: matchedResource,
        },
      },
    }
  })
}

const handleResourceUriChange = (value: string | number) => {
  const nextUri = String(value)
  if (availableResources.value.some((resource) => resource.uri === nextUri)) {
    handleResourceSelection(nextUri)
    return
  }

  updateMcp((current) => {
    if (current.operation.type !== 'resources.read') return current
    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          uri: nextUri,
          resource: current.operation.input.resource?.uri === nextUri ? current.operation.input.resource : undefined,
        },
      },
    }
  })
}

const handlePromptSelection = (nextPromptName: unknown) => {
  if (typeof nextPromptName !== 'string' || nextPromptName.length === 0) return
  updateMcp((current) => {
    if (current.operation.type !== 'prompts.get') return current
    const matchedPrompt = availablePrompts.value.find((prompt) => prompt.name === nextPromptName)

    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          promptName: nextPromptName,
          prompt: matchedPrompt,
          arguments: {},
        },
      },
    }
  })
}

const handlePromptNameChange = (value: string | number) => {
  const nextPromptName = String(value)
  if (availablePrompts.value.some((prompt) => prompt.name === nextPromptName)) {
    handlePromptSelection(nextPromptName)
    return
  }

  updateMcp((current) => {
    if (current.operation.type !== 'prompts.get') return current
    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          promptName: nextPromptName,
          prompt: current.operation.input.prompt?.name === nextPromptName ? current.operation.input.prompt : undefined,
        },
      },
    }
  })
}

const handleStructuredFieldChange = (key: string, value: string | number) => {
  const nextValues = {
    ...structuredValues.value,
    [key]: String(value),
  }
  structuredValues.value = nextValues

  const nextArguments = parseMcpStructuredArguments(schemaForm.value.fields, nextValues)

  updateMcp((current) => {
    if (current.operation.type === 'tools.call') {
      return {
        ...current,
        operation: {
          ...current.operation,
          input: {
            ...current.operation.input,
            arguments: nextArguments,
            schema: selectedToolSchema.value,
          },
        },
      }
    }

    if (current.operation.type === 'prompts.get') {
      return {
        ...current,
        operation: {
          ...current.operation,
          input: {
            ...current.operation.input,
            arguments: nextArguments,
            prompt: selectedPrompt.value,
          },
        },
      }
    }

    return current
  })
}

const handleRawArgumentsChange = (value: string | number) => {
  const nextRaw = String(value)
  rawArguments.value = nextRaw

  updateMcp((current) => {
    if (current.operation.type !== 'tools.call' && current.operation.type !== 'prompts.get') return current

    let parsedArguments = current.operation.input.arguments
    try {
      parsedArguments = nextRaw.trim() ? JSON.parse(nextRaw) as Record<string, unknown> : {}
    } catch {
      parsedArguments = current.operation.input.arguments
    }

    if (current.operation.type === 'tools.call') {
      return {
        ...current,
        operation: {
          ...current.operation,
          input: {
            ...current.operation.input,
            arguments: parsedArguments,
            schema: selectedToolSchema.value,
          },
        },
      }
    }

    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          arguments: parsedArguments,
          prompt: selectedPrompt.value,
        },
      },
    }
  })
}

const handleDiscoverTools = () => emit('discover-tools')
const handleDiscoverResources = () => emit('discover-resources')
const handleDiscoverPrompts = () => emit('discover-prompts')
</script>

<template>
  <div
    data-testid="mcp-request-panel"
    class="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-[color:var(--zr-border)] bg-[color:var(--zr-editor-bg)]"
  >
    <div class="bg-[var(--zr-editor-accent)] px-3 pt-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
            <span>{{ text.request.mcp.workbenchTitle }}</span>
            <Badge variant="outline" data-testid="mcp-operation-badge">{{ operationLabel }}</Badge>
          </div>
          <div class="mt-1 truncate text-[15px] font-semibold leading-5 text-[var(--zr-text-primary)]" data-testid="mcp-request-title">
            {{ requestName || text.request.mcp.requestTitle }}
          </div>
          <div data-testid="mcp-request-context" class="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              data-testid="request-identity-origin"
              :class="[
                'zr-status-pill rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                originBadgeClass,
              ]"
            >
              {{ originLabel }}
            </span>
            <span
              data-testid="request-identity-persistence"
              :class="[
                'zr-status-pill rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                persistenceBadgeClass,
              ]"
            >
              {{ persistenceLabel }}
            </span>
            <span
              data-testid="request-identity-execution"
              :class="[
                'zr-status-pill rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                executionBadgeClass,
              ]"
            >
              {{ executionLabel }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div
            data-testid="request-kind-toggle"
            class="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[color:color-mix(in srgb, var(--zr-accent) 22%, var(--zr-border-soft))] bg-[color:color-mix(in srgb, var(--zr-accent-soft) 22%, var(--zr-control-bg))] p-1 shadow-none"
          >
            <button
              data-testid="request-kind-http"
              :class="requestKind === 'http'
                ? 'rounded-lg bg-[var(--zr-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zr-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--zr-panel)]'
                : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--zr-text-primary)] transition-colors hover:bg-[var(--zr-soft-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zr-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--zr-panel)]'"
              @click="emit('update:request-kind', 'http')"
            >
              {{ text.request.modeHttp }}
            </button>
            <button
              data-testid="request-kind-mcp"
              :class="requestKind === 'mcp'
                ? 'rounded-lg bg-[var(--zr-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zr-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--zr-panel)]'
                : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--zr-text-primary)] transition-colors hover:bg-[var(--zr-soft-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zr-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--zr-panel)]'"
              @click="emit('update:request-kind', 'mcp')"
            >
              {{ text.request.modeMcp }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div data-testid="mcp-request-scroll-area" class="relative min-h-0 flex-1 overflow-y-auto">
      <div aria-hidden="true" class="pointer-events-none sticky top-0 z-10 h-3 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--zr-editor-bg)_96%,transparent),transparent)]" />
      <div class="grid gap-3 px-3 pb-4 pt-0">
        <section class="grid gap-2 bg-[var(--zr-editor-accent)] px-0 pb-2.5 pt-1.5">
          <div class="grid gap-2 xl:grid-cols-[180px_minmax(0,1fr)_auto] xl:items-center">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)] xl:hidden">{{ text.request.mcp.operation }}</div>
              <Select :model-value="currentOperation" @update:model-value="handleOperationChange">
                <SelectTrigger data-testid="mcp-operation-select" class="zr-input mt-2 h-9 w-full rounded-md shadow-none transition-colors xl:mt-0 xl:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initialize">initialize</SelectItem>
                  <SelectItem value="tools.list">tools.list</SelectItem>
                  <SelectItem value="tools.call">tools.call</SelectItem>
                  <SelectItem value="resources.list">resources.list</SelectItem>
                  <SelectItem value="resources.read">resources.read</SelectItem>
                  <SelectItem value="prompts.list">prompts.list</SelectItem>
                  <SelectItem value="prompts.get">prompts.get</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="min-w-0">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)] xl:hidden">{{ text.request.mcp.endpoint }}</div>
              <Input
                data-testid="mcp-base-url-input"
                class="zr-input mt-2 h-9 rounded-md text-[13px] font-mono shadow-none focus-visible:border-[#ff6c37]/45 focus-visible:ring-[#ff6c37]/30 xl:mt-0"
                :model-value="baseUrl"
                placeholder="https://example.com/mcp"
                @update:model-value="handleBaseUrlChange"
              />
            </div>
            <div data-testid="request-command-actions" class="flex items-center justify-end gap-2">
              <button
                data-testid="request-url-bar-send"
                :disabled="props.isSending || props.disableSend"
                class="zr-primary-action inline-flex h-9 items-center rounded-md px-4 text-[13px] font-semibold disabled:opacity-50"
                @click="emit('send')"
              >
                {{ props.isSending ? text.request.sending : text.request.send }}
              </button>
              <button
                data-testid="request-command-save"
                class="zr-secondary-action inline-flex h-9 w-9 items-center justify-center rounded-md"
                :aria-label="text.common.save"
                @click="emit('save')"
              >
                <Save class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div class="zr-request-command-meta flex flex-wrap items-center gap-1.5 border-t border-[color:var(--zr-border-soft)] px-0 py-1.5 text-xs text-[var(--zr-text-muted)]">
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                data-testid="mcp-header-count"
                class="zr-status-pill rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--zr-text-secondary)]"
              >
                {{ text.request.mcp.headers }} · {{ headerCount }}
              </span>
              <span
                data-testid="mcp-transport-value"
                class="zr-status-pill rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--zr-text-secondary)]"
              >
                {{ transportLabel }}
              </span>
              <div data-testid="mcp-endpoint-value" class="zr-chip min-w-0 truncate rounded-full px-2 py-0.5 font-mono text-[var(--zr-text-muted)]">{{ text.request.mcp.endpoint }}: {{ baseUrl || text.request.mcp.endpointNotConfigured }}</div>
            </div>
            <div data-testid="mcp-transport-hint" class="text-xs leading-5 text-[var(--zr-text-muted)]">{{ transportHint }}</div>
          </div>
        </section>

        <section
          v-if="currentOperation === 'initialize'"
          data-testid="mcp-initialize-panel"
          class="grid gap-3 rounded-xl border border-[color:var(--zr-border-soft)] bg-[color:color-mix(in_srgb,var(--zr-control-bg)_88%,var(--zr-editor-bg))] p-3.5 md:grid-cols-2"
        >
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">Client Name</div>
            <Input
              data-testid="mcp-client-name-input"
              class="mt-2"
              :model-value="props.mcp?.operation.type === 'initialize' ? props.mcp.operation.input.clientName : ''"
              placeholder="ZenRequest"
              @update:model-value="handleInitializeClientNameChange"
            />
          </div>
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">Client Version</div>
            <Input
              data-testid="mcp-client-version-input"
              class="mt-2"
              :model-value="props.mcp?.operation.type === 'initialize' ? props.mcp.operation.input.clientVersion : ''"
              placeholder="0.1.0"
              @update:model-value="handleInitializeClientVersionChange"
            />
          </div>
        </section>

        <section
          v-else-if="currentOperation === 'tools.call'"
          class="grid gap-3 rounded-xl border border-[color:var(--zr-border-soft)] bg-[color:color-mix(in_srgb,var(--zr-control-bg)_88%,var(--zr-editor-bg))] p-3.5"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.mcp.tool }}</div>
            <button
              type="button"
              data-testid="mcp-discover-tools-button"
              class="inline-flex items-center rounded-md border border-[color:var(--zr-border-soft)] px-2.5 py-1 text-xs font-medium text-[var(--zr-text-secondary)] transition-colors hover:border-[color:var(--zr-border)] hover:bg-[color:var(--zr-editor-bg)] hover:text-[var(--zr-text-primary)]"
              @click="handleDiscoverTools"
            >
              {{ discoveryActionLabel }}
            </button>
          </div>
          <Select
            v-if="availableTools.length > 0"
            :model-value="toolName"
            @update:model-value="handleToolSelection"
          >
            <SelectTrigger data-testid="mcp-tool-select" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="tool in availableTools" :key="tool.name" :value="tool.name">
                {{ tool.title || tool.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-else
            data-testid="mcp-tool-name-input"
            :model-value="toolName"
            placeholder="search"
            @update:model-value="handleToolNameChange"
          />
          <div data-testid="mcp-tool-name" class="text-sm leading-5 text-[var(--zr-text-secondary)]">{{ toolName || text.request.mcp.toolNotSelected }}</div>
          <div
            v-if="showDiscoveryRecommendation"
            data-testid="mcp-discovery-recommendation"
            class="text-sm leading-5 text-[var(--zr-text-secondary)]"
          >
            {{ text.request.mcp.discoveryRecommended }}
          </div>
        </section>

        <section
          v-else-if="currentOperation === 'resources.read'"
          class="grid gap-3 rounded-xl border border-[color:var(--zr-border-soft)] bg-[color:color-mix(in_srgb,var(--zr-control-bg)_88%,var(--zr-editor-bg))] p-3.5"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.mcp.resource }}</div>
            <button
              type="button"
              data-testid="mcp-discover-resources-button"
              class="inline-flex items-center rounded-md border border-[color:var(--zr-border-soft)] px-2.5 py-1 text-xs font-medium text-[var(--zr-text-secondary)] transition-colors hover:border-[color:var(--zr-border)] hover:bg-[color:var(--zr-editor-bg)] hover:text-[var(--zr-text-primary)]"
              @click="handleDiscoverResources"
            >
              {{ resourceDiscoveryActionLabel }}
            </button>
          </div>
          <Select
            v-if="availableResources.length > 0"
            :model-value="resourceUri"
            @update:model-value="handleResourceSelection"
          >
            <SelectTrigger data-testid="mcp-resource-select" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="resource in availableResources" :key="resource.uri" :value="resource.uri">
                {{ resource.title || resource.name || resource.uri }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            data-testid="mcp-resource-uri-input"
            :model-value="resourceUri"
            placeholder="file:///docs/readme.md"
            @update:model-value="handleResourceUriChange"
          />
          <div data-testid="mcp-resource-uri" class="text-sm leading-5 text-[var(--zr-text-secondary)]">{{ resourceUri || text.request.mcp.resourceNotSelected }}</div>
          <div
            v-if="showResourceDiscoveryRecommendation"
            data-testid="mcp-resource-discovery-recommendation"
            class="text-sm leading-5 text-[var(--zr-text-secondary)]"
          >
            {{ text.request.mcp.resourceDiscoveryRecommended }}
          </div>
        </section>

        <section
          v-else-if="currentOperation === 'prompts.get'"
          class="grid gap-3 rounded-xl border border-[color:var(--zr-border-soft)] bg-[color:color-mix(in_srgb,var(--zr-control-bg)_88%,var(--zr-editor-bg))] p-3.5"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.mcp.prompt }}</div>
            <button
              type="button"
              data-testid="mcp-discover-prompts-button"
              class="inline-flex items-center rounded-md border border-[color:var(--zr-border-soft)] px-2.5 py-1 text-xs font-medium text-[var(--zr-text-secondary)] transition-colors hover:border-[color:var(--zr-border)] hover:bg-[color:var(--zr-editor-bg)] hover:text-[var(--zr-text-primary)]"
              @click="handleDiscoverPrompts"
            >
              {{ promptDiscoveryActionLabel }}
            </button>
          </div>
          <Select
            v-if="availablePrompts.length > 0"
            :model-value="promptName"
            @update:model-value="handlePromptSelection"
          >
            <SelectTrigger data-testid="mcp-prompt-select" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="prompt in availablePrompts" :key="prompt.name" :value="prompt.name">
                {{ prompt.title || prompt.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            data-testid="mcp-prompt-name-input"
            :model-value="promptName"
            placeholder="summarize"
            @update:model-value="handlePromptNameChange"
          />
          <div data-testid="mcp-prompt-name" class="text-sm leading-5 text-[var(--zr-text-secondary)]">{{ promptName || text.request.mcp.promptNotSelected }}</div>
          <div
            v-if="showPromptDiscoveryRecommendation"
            data-testid="mcp-prompt-discovery-recommendation"
            class="text-sm leading-5 text-[var(--zr-text-secondary)]"
          >
            {{ text.request.mcp.promptDiscoveryRecommended }}
          </div>
        </section>

        <section
          v-else
          class="rounded-xl border border-[color:var(--zr-border-soft)] bg-[color:color-mix(in_srgb,var(--zr-control-bg)_88%,var(--zr-editor-bg))] p-3.5"
        >
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.mcp.mode }}</div>
          <div data-testid="mcp-operation-value" class="mt-1 text-sm font-medium text-[var(--zr-text-primary)]">{{ operationLabel }}</div>
        </section>

        <section
          v-if="currentOperation === 'tools.call' || currentOperation === 'prompts.get'"
          class="rounded-xl border border-[color:var(--zr-border-soft)] bg-[color:color-mix(in_srgb,var(--zr-control-bg)_88%,var(--zr-editor-bg))] p-3.5"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zr-text-muted)]">{{ text.request.mcp.arguments }}</div>
              <div data-testid="mcp-arguments-mode" class="mt-1 text-sm leading-6 text-[var(--zr-text-secondary)]">
                {{ schemaForm.mode === 'structured' ? text.request.mcp.structuredForm : text.request.mcp.rawJson }}
              </div>
            </div>
            <div
              v-if="currentOperation === 'tools.call' ? selectedToolSchema?.name : selectedPrompt?.name"
              data-testid="mcp-schema-name"
              class="text-sm font-medium text-[var(--zr-text-primary)]"
            >
              {{ currentOperation === 'tools.call' ? selectedToolSchema?.name : selectedPrompt?.name }}
            </div>
          </div>

          <div v-if="schemaForm.mode === 'structured'" class="mt-3 grid gap-3 sm:grid-cols-2">
            <div
              v-for="field in schemaForm.fields"
              :key="field.key"
              class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-editor-bg)] px-3 py-2.5"
            >
              <label :for="`mcp-arg-${field.key}`" class="text-sm font-medium text-[var(--zr-text-primary)]">
                {{ field.label }}<span v-if="field.required"> *</span>
              </label>
              <div v-if="field.description" class="mt-1 text-sm leading-6 text-[var(--zr-text-secondary)]">{{ field.description }}</div>
              <Input
                :id="`mcp-arg-${field.key}`"
                :data-testid="`mcp-arg-input-${field.key}`"
                class="mt-2"
                :model-value="structuredValues[field.key] ?? ''"
                :placeholder="field.type"
                @update:model-value="handleStructuredFieldChange(field.key, $event)"
              />
            </div>
          </div>

          <div v-else class="mt-3">
            <div
              v-if="schemaForm.fallbackReason"
              data-testid="mcp-raw-arguments-fallback-reason"
              class="mb-2 text-sm leading-6 text-[var(--zr-text-secondary)]"
            >
              {{ schemaForm.fallbackReason }}
            </div>
            <Textarea
              :data-testid="currentOperation === 'prompts.get' ? 'mcp-prompt-arguments-raw' : 'mcp-raw-arguments-input'"
              class="min-h-[180px] font-mono text-sm"
              :model-value="rawArguments"
              @update:model-value="handleRawArgumentsChange"
            />
            <div
              data-testid="mcp-raw-arguments-error"
              class="mt-2 text-sm text-rose-500"
            >
              {{ rawArgumentsError }}
            </div>
          </div>
        </section>
      </div>
      <div aria-hidden="true" class="pointer-events-none sticky bottom-0 z-10 h-5 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--zr-editor-bg)_96%,transparent),transparent)]" />
    </div>
  </div>
</template>
