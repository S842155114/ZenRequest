import type { KeyValueItem } from '@/types/request'

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
