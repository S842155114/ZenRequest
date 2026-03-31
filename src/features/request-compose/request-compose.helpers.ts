import type { FormDataFieldSnapshot, KeyValueItem, RequestMockState } from '@/types/request'

export const createKeyValueItem = (): KeyValueItem => ({
  key: '',
  value: '',
  description: '',
  enabled: true,
})

export const createFormDataField = (): FormDataFieldSnapshot => ({
  key: '',
  value: '',
  enabled: true,
})

export const cloneFormDataDraft = (fields: FormDataFieldSnapshot[]) => fields.map((field) => ({ ...field }))

export const createMockState = (): RequestMockState => ({
  enabled: false,
  status: 200,
  statusText: 'OK',
  contentType: 'application/json',
  body: '',
  headers: [],
})

export const createMockHeader = (): KeyValueItem => ({
  key: '',
  value: '',
  description: '',
  enabled: true,
})

export const trimValue = (value?: string) => value?.trim() ?? ''

export const hasKeyValueRowContent = (item: KeyValueItem) => (
  trimValue(item.key).length > 0
  || trimValue(item.value).length > 0
  || trimValue(item.description).length > 0
)

export const hasFormDataFieldContent = (field: FormDataFieldSnapshot) => (
  trimValue(field.key).length > 0
  || trimValue(field.value).length > 0
  || trimValue(field.fileName).length > 0
  || trimValue(field.mimeType).length > 0
)

export const parseFormDataBody = (raw: string): FormDataFieldSnapshot[] => raw
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

export const serializeFormDataFields = (fields: FormDataFieldSnapshot[]) => fields
  .filter((field) => field.enabled && field.key.trim())
  .map((field) => `${field.key}=${field.value}`)
  .join('\n')

export const decodeBase64Size = (value: string) => {
  const normalized = value.replace(/\s+/g, '')
  if (!normalized) return 0

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding)
}

export const bytesToBase64 = (value: Uint8Array) => {
  let output = ''
  const chunkSize = 0x8000

  for (let index = 0; index < value.length; index += chunkSize) {
    output += String.fromCharCode(...value.subarray(index, index + chunkSize))
  }

  return btoa(output)
}
