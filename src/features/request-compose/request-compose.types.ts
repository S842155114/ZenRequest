export type ComposeSection = 'params' | 'headers' | 'body' | 'mock' | 'auth' | 'tests' | 'env'
export type TableSection = 'params' | 'headers' | 'env' | 'formdata'
export type TextBodyMode = 'json' | 'raw' | 'binary'

export const composeSections: ComposeSection[] = ['params', 'headers', 'body', 'mock', 'auth', 'tests', 'env']
