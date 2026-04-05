import { getMessages } from '@/lib/i18n'
import type { AppLocale, McpToolSchemaSnapshot } from '@/types/request'

export interface McpSchemaField {
  key: string
  label: string
  description?: string
  type: 'string' | 'number' | 'integer' | 'boolean'
  required: boolean
  defaultValue: string
  options?: string[]
}

export interface McpSchemaFormModel {
  mode: 'structured' | 'raw'
  fields: McpSchemaField[]
  initialRaw: string
  fallbackReason?: string
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const buildRawFormModel = (
  currentArguments: Record<string, unknown>,
  fallbackReason: string,
): McpSchemaFormModel => ({
  mode: 'raw',
  fields: [],
  initialRaw: JSON.stringify(currentArguments, null, 2),
  fallbackReason,
})

const normalizeDefaultValue = (value: unknown, type: McpSchemaField['type']) => {
  if (value === undefined || value === null) return ''
  if (type === 'boolean') return value ? 'true' : 'false'
  if (type === 'number' || type === 'integer') return String(value)
  return typeof value === 'string' ? value : JSON.stringify(value)
}

const extractStringEnumOptions = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined
  if (!value.every((item) => typeof item === 'string')) return undefined
  return value
}

const extractField = (
  key: string,
  schema: Record<string, unknown>,
  requiredKeys: Set<string>,
): McpSchemaField | null => {
  const schemaType = schema.type
  if (schemaType !== 'string' && schemaType !== 'number' && schemaType !== 'integer' && schemaType !== 'boolean') {
    return null
  }

  return {
    key,
    label: typeof schema.title === 'string' && schema.title.trim() ? schema.title : key,
    description: typeof schema.description === 'string' && schema.description.trim() ? schema.description : undefined,
    type: schemaType,
    required: requiredKeys.has(key),
    defaultValue: normalizeDefaultValue(schema.default, schemaType),
    options: schemaType === 'string' ? extractStringEnumOptions(schema.enum) : undefined,
  }
}

export const buildMcpSchemaFormModel = (
  schema?: McpToolSchemaSnapshot,
  currentArguments: Record<string, unknown> = {},
  locale: AppLocale = 'en',
): McpSchemaFormModel => {
  const text = getMessages(locale)
  const inputSchema = schema?.inputSchema
  if (!isPlainObject(inputSchema)) {
    return buildRawFormModel(currentArguments, text.request.mcp.schemaUnavailable)
  }

  if (inputSchema.type !== 'object' || !isPlainObject(inputSchema.properties)) {
    return buildRawFormModel(currentArguments, text.request.mcp.schemaObjectOnly)
  }

  const properties = inputSchema.properties as Record<string, unknown>
  const requiredKeys = new Set(Array.isArray(inputSchema.required) ? inputSchema.required.filter((item): item is string => typeof item === 'string') : [])
  const fields = Object.entries(properties)
    .map(([key, value]) => isPlainObject(value) ? extractField(key, value, requiredKeys) : null)
    .filter((field): field is McpSchemaField => field !== null)

  if (fields.length !== Object.keys(properties).length) {
    return buildRawFormModel(currentArguments, text.request.mcp.schemaFallback)
  }

  return {
    mode: 'structured',
    fields: fields.map((field) => ({
      ...field,
      defaultValue: currentArguments[field.key] !== undefined
        ? normalizeDefaultValue(currentArguments[field.key], field.type)
        : field.defaultValue,
    })),
    initialRaw: JSON.stringify(currentArguments, null, 2),
  }
}

export const parseMcpStructuredArguments = (
  fields: McpSchemaField[],
  values: Record<string, string>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const field of fields) {
    const rawValue = (values[field.key] ?? '').trim()
    if (!rawValue) {
      continue
    }

    switch (field.type) {
      case 'boolean':
        result[field.key] = rawValue === 'true'
        break
      case 'number':
      case 'integer':
        result[field.key] = Number(rawValue)
        break
      default:
        result[field.key] = rawValue
        break
    }
  }

  return result
}
