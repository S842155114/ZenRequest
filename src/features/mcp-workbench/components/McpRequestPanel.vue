<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import type { AppLocale, McpExecutionArtifact, McpOperationInput, McpRequestDefinition, McpToolSchemaSnapshot } from '@/types/request'

const props = withDefaults(defineProps<{
  locale: AppLocale
  requestName: string
  requestKey?: string
  mcp?: McpRequestDefinition
  mcpArtifact?: McpExecutionArtifact
}>(), {
  requestName: '',
  requestKey: '',
  mcp: undefined,
  mcpArtifact: undefined,
})

const emit = defineEmits<{
  (e: 'update:mcp', value: McpRequestDefinition): void
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

const operationLabel = computed(() => props.mcp?.operation.type ?? 'initialize')
const transportLabel = computed(() => props.mcp?.connection.transport ?? 'http')
const baseUrl = computed(() => props.mcp?.connection.baseUrl ?? '')
const headerCount = computed(() => props.mcp?.connection.headers.filter((item) => item.enabled && item.key.trim()).length ?? 0)
const toolName = computed(() => props.mcp?.operation.type === 'tools.call' ? props.mcp.operation.input.toolName : '')
const currentOperation = computed<McpOperationInput['type']>(() => props.mcp?.operation.type ?? 'initialize')

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
  if (props.mcp.operation.input.schema) return props.mcp.operation.input.schema
  return availableTools.value.find((tool) => tool.name === props.mcp?.operation.input.toolName)
})

const currentToolArguments = computed<Record<string, unknown>>(() => (
  props.mcp?.operation.type === 'tools.call' ? props.mcp.operation.input.arguments : {}
))
const text = computed(() => getMessages(props.locale))
const schemaForm = computed(() => buildMcpSchemaFormModel(selectedToolSchema.value, currentToolArguments.value, props.locale))
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

const transportHint = computed(() => text.value.request.mcp.transportHint)

const handleBaseUrlChange = (value: string | number) => {
  updateMcp((current) => ({
    ...current,
    connection: {
      ...current.connection,
      baseUrl: String(value),
    },
  }))
}

const handleOperationChange = (value: string) => {
  updateMcp((current) => {
    if (value === current.operation.type) return current

    if (value === 'tools.list') {
      return {
        ...current,
        operation: {
          type: 'tools.list',
          input: {
            cursor: '',
          },
        },
      }
    }

    if (value === 'tools.call') {
      const firstTool = availableTools.value[0]
      return {
        ...current,
        operation: {
          type: 'tools.call',
          input: {
            toolName: firstTool?.name ?? '',
            arguments: {},
            schema: firstTool,
          },
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

const handleToolSelection = (nextToolName: string) => {
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

const handleStructuredFieldChange = (key: string, value: string | number) => {
  const nextValues = {
    ...structuredValues.value,
    [key]: String(value),
  }
  structuredValues.value = nextValues

  updateMcp((current) => {
    if (current.operation.type !== 'tools.call') return current

    return {
      ...current,
      operation: {
        ...current.operation,
        input: {
          ...current.operation.input,
          arguments: parseMcpStructuredArguments(schemaForm.value.fields, nextValues),
          schema: selectedToolSchema.value,
        },
      },
    }
  })
}

const handleRawArgumentsChange = (value: string | number) => {
  const nextRaw = String(value)
  rawArguments.value = nextRaw

  updateMcp((current) => {
    if (current.operation.type !== 'tools.call') return current

    let parsedArguments = current.operation.input.arguments
    try {
      parsedArguments = nextRaw.trim() ? JSON.parse(nextRaw) as Record<string, unknown> : {}
    } catch {
      parsedArguments = current.operation.input.arguments
    }

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
  })
}
</script>

<template>
  <div
    data-testid="mcp-request-panel"
    class="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-[color:var(--zr-border)] bg-[color:var(--zr-editor-bg)]"
  >
    <div class="border-b border-[color:var(--zr-border)] px-4 py-3">
      <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">
        <span>{{ text.request.mcp.workbenchTitle }}</span>
        <Badge variant="outline" data-testid="mcp-transport-badge">{{ transportLabel }}</Badge>
      </div>
      <div class="mt-2 text-sm font-semibold text-[var(--zr-text-primary)]" data-testid="mcp-request-title">
        {{ requestName || text.request.mcp.requestTitle }}
      </div>
    </div>

    <div data-testid="mcp-request-scroll-area" class="relative min-h-0 flex-1 overflow-y-auto">
      <div aria-hidden="true" class="pointer-events-none sticky top-0 z-10 h-4 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--zr-editor-bg)_96%,transparent),transparent)]" />
      <div class="grid gap-3 px-4 py-2 pb-4 sm:grid-cols-2">
      <div class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] px-3 py-2.5">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.transport }}</div>
        <div data-testid="mcp-transport-value" class="mt-2 text-sm font-medium text-[var(--zr-text-primary)]">{{ transportLabel }}</div>
        <div data-testid="mcp-transport-hint" class="mt-2 text-xs text-[var(--zr-text-secondary)]">{{ transportHint }}</div>
      </div>

      <div class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] px-3 py-2.5">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.operation }}</div>
        <Select :model-value="currentOperation" @update:model-value="handleOperationChange">
          <SelectTrigger data-testid="mcp-operation-select" class="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="initialize">initialize</SelectItem>
            <SelectItem value="tools.list">tools.list</SelectItem>
            <SelectItem value="tools.call">tools.call</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] px-3 py-2.5 sm:col-span-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.endpoint }}</div>
        <Input
          data-testid="mcp-base-url-input"
          class="mt-2"
          :model-value="baseUrl"
          placeholder="https://example.com/mcp"
          @update:model-value="handleBaseUrlChange"
        />
        <div data-testid="mcp-endpoint-value" class="mt-2 break-all text-xs text-[var(--zr-text-secondary)]">{{ baseUrl || text.request.mcp.endpointNotConfigured }}</div>
      </div>

      <div class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] px-3 py-2.5">
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.headers }}</div>
        <div data-testid="mcp-header-count" class="mt-1 text-sm font-medium text-[var(--zr-text-primary)]">{{ headerCount }}</div>
      </div>

      <div
        v-if="currentOperation === 'tools.call'"
        class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] px-3 py-2.5"
      >
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.tool }}</div>
        <Select
          v-if="availableTools.length > 0"
          :model-value="toolName"
          @update:model-value="handleToolSelection"
        >
          <SelectTrigger data-testid="mcp-tool-select" class="mt-2 w-full">
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
          class="mt-2"
          :model-value="toolName"
          placeholder="search"
          @update:model-value="handleToolNameChange"
        />
        <div data-testid="mcp-tool-name" class="mt-2 text-xs text-[var(--zr-text-secondary)]">{{ toolName || text.request.mcp.toolNotSelected }}</div>
      </div>

      <div
        v-else
        class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] px-3 py-2.5"
      >
        <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.mode }}</div>
        <div data-testid="mcp-operation-value" class="mt-1 text-sm font-medium text-[var(--zr-text-primary)]">{{ operationLabel }}</div>
      </div>

      <div
        v-if="currentOperation === 'tools.call'"
        class="rounded-lg border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-control-bg)] px-3 py-2.5 sm:col-span-2"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ text.request.mcp.arguments }}</div>
            <div data-testid="mcp-arguments-mode" class="mt-1 text-xs text-[var(--zr-text-secondary)]">
              {{ schemaForm.mode === 'structured' ? text.request.mcp.structuredForm : text.request.mcp.rawJson }}
            </div>
          </div>
          <div
            v-if="selectedToolSchema?.name"
            data-testid="mcp-schema-name"
            class="text-xs font-medium text-[var(--zr-text-primary)]"
          >
            {{ selectedToolSchema.name }}
          </div>
        </div>

        <div v-if="schemaForm.mode === 'structured'" class="mt-3 grid gap-3 sm:grid-cols-2">
          <div
            v-for="field in schemaForm.fields"
            :key="field.key"
            class="rounded-md border border-[color:var(--zr-border-soft)] bg-[color:var(--zr-editor-bg)] px-3 py-2"
          >
            <label :for="`mcp-arg-${field.key}`" class="text-xs font-medium text-[var(--zr-text-primary)]">
              {{ field.label }}<span v-if="field.required"> *</span>
            </label>
            <div v-if="field.description" class="mt-1 text-[11px] text-[var(--zr-text-secondary)]">{{ field.description }}</div>
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
            class="mb-2 text-xs text-[var(--zr-text-secondary)]"
          >
            {{ schemaForm.fallbackReason }}
          </div>
          <Textarea
            data-testid="mcp-raw-arguments-input"
            class="min-h-[180px] font-mono text-xs"
            :model-value="rawArguments"
            @update:model-value="handleRawArgumentsChange"
          />
          <div
            data-testid="mcp-raw-arguments-error"
            class="mt-2 text-xs text-rose-500"
          >
            {{ rawArgumentsError }}
          </div>
        </div>
      </div>
      </div>
      <div aria-hidden="true" class="pointer-events-none sticky bottom-0 z-10 h-5 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--zr-editor-bg)_96%,transparent),transparent)]" />
    </div>
  </div>
</template>
