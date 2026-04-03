import { describe, expect, it } from 'vitest'
import { resolveActiveRequestUrl, resolveTemplate, resolveVariablesMap } from './url-resolution'

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
