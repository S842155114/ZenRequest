import type { AuthConfig, KeyValueItem } from '@/types/request'

export const resolveVariablesMap = (variables: KeyValueItem[]) => {
  const output: Record<string, string> = {}

  for (const item of variables) {
    if (item.enabled && item.key.trim()) {
      output[item.key.trim()] = item.value
    }
  }

  return output
}

export const resolveTemplate = (template: string, variables: Record<string, string>) => (
  template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => variables[key.trim()] ?? '')
)

export const resolveActiveRequestUrl = (url: string, variables: KeyValueItem[]) => (
  resolveTemplate(url, resolveVariablesMap(variables))
)


const TEMPLATE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g
const REDACTED_SECRET_VALUE = '[REDACTED]'
const SENSITIVE_KEY_PATTERN = /(token|secret|password|cookie|api[-_]?key|apikey|authorization)/i

const isSensitiveKey = (key: string) => SENSITIVE_KEY_PATTERN.test(key.trim())

export interface TemplateResolutionIssue {
  key: string
  template: string
}

export interface ResolvedHttpRequestDraft {
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  auth: AuthConfig
  issues: TemplateResolutionIssue[]
  blockingIssues: TemplateResolutionIssue[]
}

const collectMissingTemplateKeys = (template: string, variables: Record<string, string>) => {
  const issues: TemplateResolutionIssue[] = []
  const seen = new Set<string>()

  template.replace(TEMPLATE_PATTERN, (_, rawKey: string) => {
    const key = rawKey.trim()
    if (!key || key in variables || seen.has(`${template}::${key}`)) {
      return ''
    }
    seen.add(`${template}::${key}`)
    issues.push({ key, template })
    return ''
  })

  return issues
}

const resolveItemList = (items: KeyValueItem[], variables: Record<string, string>) => (
  items.map((item) => ({
    ...item,
    key: resolveTemplate(item.key, variables),
    value: resolveTemplate(item.value, variables),
  }))
)

const resolveAuth = (auth: AuthConfig, variables: Record<string, string>): AuthConfig => ({
  ...auth,
  bearerToken: resolveTemplate(auth.bearerToken, variables),
  username: resolveTemplate(auth.username, variables),
  password: resolveTemplate(auth.password, variables),
  apiKeyKey: resolveTemplate(auth.apiKeyKey, variables),
  apiKeyValue: resolveTemplate(auth.apiKeyValue, variables),
})

export const resolveHttpRequestDraft = (input: {
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  auth: AuthConfig
  variables: KeyValueItem[]
}): ResolvedHttpRequestDraft => {
  const variableMap = resolveVariablesMap(input.variables)
  const issues = [
    ...collectMissingTemplateKeys(input.url, variableMap),
    ...input.params.flatMap((item) => [
      ...collectMissingTemplateKeys(item.key, variableMap),
      ...collectMissingTemplateKeys(item.value, variableMap),
    ]),
    ...input.headers.flatMap((item) => [
      ...collectMissingTemplateKeys(item.key, variableMap),
      ...collectMissingTemplateKeys(item.value, variableMap),
    ]),
    ...collectMissingTemplateKeys(input.auth.bearerToken, variableMap),
    ...collectMissingTemplateKeys(input.auth.username, variableMap),
    ...collectMissingTemplateKeys(input.auth.password, variableMap),
    ...collectMissingTemplateKeys(input.auth.apiKeyKey, variableMap),
    ...collectMissingTemplateKeys(input.auth.apiKeyValue, variableMap),
  ]

  const dedupedIssues = issues.filter((issue, index, list) => (
    list.findIndex((entry) => entry.key == issue.key && entry.template == issue.template) == index
  ))
  const resolvedAuth = resolveAuth(input.auth, variableMap)

  const resolvedParams = resolveItemList(input.params, variableMap)
  const resolvedHeaders = resolveItemList(input.headers, variableMap)

  const blockingIssues = [
    ...dedupedIssues.filter((issue) => {
      if (issue.template == input.url) return true
      if (input.auth.type == 'bearer' && issue.template == input.auth.bearerToken) return true
      if (input.auth.type == 'basic' && (issue.template == input.auth.username || issue.template == input.auth.password)) return true
      if (input.auth.type == 'apiKey' && (issue.template == input.auth.apiKeyKey || issue.template == input.auth.apiKeyValue)) return true
      return false
    }),
    ...resolvedHeaders
      .filter((item) => item.enabled && isSensitiveKey(item.key) && item.value.trim() == REDACTED_SECRET_VALUE)
      .map((item) => ({ key: item.key.trim() || 'headerSecret', template: item.value })),
    ...resolvedParams
      .filter((item) => item.enabled && isSensitiveKey(item.key) && item.value.trim() == REDACTED_SECRET_VALUE)
      .map((item) => ({ key: item.key.trim() || 'paramSecret', template: item.value })),
    ...(input.auth.type == 'bearer' && resolvedAuth.bearerToken.trim() == REDACTED_SECRET_VALUE
      ? [{ key: 'bearerToken', template: input.auth.bearerToken || REDACTED_SECRET_VALUE }]
      : []),
    ...(input.auth.type == 'basic' && (
      resolvedAuth.username.trim() == REDACTED_SECRET_VALUE
      || resolvedAuth.password.trim() == REDACTED_SECRET_VALUE
    )
      ? [{ key: 'basicAuth', template: `${input.auth.username}:${input.auth.password}` || REDACTED_SECRET_VALUE }]
      : []),
    ...(input.auth.type == 'apiKey' && (
      resolvedAuth.apiKeyKey.trim() == REDACTED_SECRET_VALUE
      || resolvedAuth.apiKeyValue.trim() == REDACTED_SECRET_VALUE
    )
      ? [{ key: 'apiKey', template: input.auth.apiKeyValue || REDACTED_SECRET_VALUE }]
      : []),
  ]

  return {
    url: resolveTemplate(input.url, variableMap),
    params: resolvedParams,
    headers: resolvedHeaders,
    auth: resolvedAuth,
    issues: dedupedIssues,
    blockingIssues,
  }
}
