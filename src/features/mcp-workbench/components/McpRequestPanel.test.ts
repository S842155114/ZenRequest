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

  it('shows explicit discover guidance and emits discover-tools when no tools are available', async () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Search',
        requestKey: 'tab-mcp',
        mcp: baseMcp,
      },
    })

    expect(wrapper.get('[data-testid="mcp-discover-tools-button"]').text()).toContain('Discover Tools')
    expect(wrapper.get('[data-testid="mcp-discovery-recommendation"]').text()).toContain('Discover tools first')

    await wrapper.get('[data-testid="mcp-discover-tools-button"]').trigger('click')

    expect(wrapper.emitted('discover-tools')).toHaveLength(1)
    expect(wrapper.find('[data-testid="mcp-tool-name-input"]').exists()).toBe(true)
  })

  it('prefers the latest discovered schema over a stale request-carried schema', () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Search',
        requestKey: 'tab-mcp',
        mcp: {
          ...baseMcp,
          operation: {
            type: 'tools.call',
            input: {
              toolName: 'search',
              arguments: {},
              schema: {
                name: 'search',
                title: 'Search (Stale)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    stale: { type: 'string', title: 'Stale' },
                  },
                },
              },
            },
          },
        },
        mcpArtifact: {
          transport: 'http',
          operation: 'tools.list',
          cachedTools: [
            {
              name: 'search',
              title: 'Search',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', title: 'Query' },
                },
                required: ['query'],
              },
            },
          ],
        },
      },
    })

    expect(wrapper.find('[data-testid="mcp-arg-input-query"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mcp-arg-input-stale"]').exists()).toBe(false)
  })
})
