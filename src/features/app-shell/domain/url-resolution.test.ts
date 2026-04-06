import { describe, expect, it } from 'vitest'
import { resolveActiveRequestUrl, resolveHttpRequestDraft, resolveTemplate, resolveVariablesMap } from './url-resolution'

describe('url-resolution domain', () => {
  it('resolves only enabled environment variables', () => {
    const variables = [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
      { key: 'version', value: 'v1', enabled: true },
      { key: 'disabledKey', value: 'ignored', enabled: false },
    ]

    expect(resolveVariablesMap(variables)).toEqual({
      baseUrl: 'https://example.com',
      version: 'v1',
    })
    expect(resolveActiveRequestUrl('{{baseUrl}}/{{version}}/orders/{{disabledKey}}', variables)).toBe('https://example.com/v1/orders/')
  })

  it('leaves unknown variables empty during template substitution', () => {
    expect(resolveTemplate('{{baseUrl}}/orders/{{missing}}', { baseUrl: 'https://example.com' })).toBe('https://example.com/orders/')
  })
})


it('reports blocking issues for unresolved url and auth variables', () => {
  const result = resolveHttpRequestDraft({
    url: '{{baseUrl}}/orders/{{missingPath}}',
    params: [],
    headers: [],
    auth: {
      type: 'bearer',
      bearerToken: '{{token}}',
      username: '',
      password: '',
      apiKeyKey: 'X-API-Key',
      apiKeyValue: '',
      apiKeyPlacement: 'header',
    },
    variables: [
      { key: 'baseUrl', value: 'https://example.com', enabled: true },
    ],
  })

  expect(result.url).toBe('https://example.com/orders/')
  expect(result.blockingIssues.map((issue) => issue.key)).toEqual(['missingPath', 'token'])
})


it('treats redacted auth secrets as blocking send issues', () => {
  const result = resolveHttpRequestDraft({
    url: 'https://example.com/orders',
    params: [],
    headers: [],
    auth: {
      type: 'bearer',
      bearerToken: '[REDACTED]',
      username: '',
      password: '',
      apiKeyKey: 'X-API-Key',
      apiKeyValue: '',
      apiKeyPlacement: 'header',
    },
    variables: [],
  })

  expect(result.blockingIssues.map((issue) => issue.key)).toContain('bearerToken')
})
