import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import McpRequestPanel from './McpRequestPanel.vue'

const baseMcp = {
  connection: {
    transport: 'http' as const,
    baseUrl: 'https://example.com/mcp',
    headers: [],
    auth: {
      type: 'none' as const,
      bearerToken: '',
      username: '',
      password: '',
      apiKeyKey: 'X-API-Key',
      apiKeyValue: '',
      apiKeyPlacement: 'header' as const,
    },
  },
  operation: {
    type: 'tools.call' as const,
    input: {
      toolName: 'search',
      arguments: {},
    },
  },
}

describe('McpRequestPanel', () => {
  it('keeps the tool selector when cached tools exist without protocol tool results', () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Search',
        requestKey: 'tab-mcp',
        mcp: baseMcp,
        mcpArtifact: {
          transport: 'http',
          operation: 'tools.call',
          protocolResponse: {
            result: {
              content: [],
            },
          },
          cachedTools: [
            {
              name: 'search',
              title: 'Search',
              inputSchema: {
                type: 'object',
                properties: {
                  q: { type: 'string' },
                },
              },
            },
          ],
        },
      },
    })

    expect(wrapper.find('[data-testid="mcp-tool-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mcp-tool-name-input"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="mcp-schema-name"]').text()).toContain('search')
  })
})
