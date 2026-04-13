import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
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
  it('renders structured sampling inputs and boundary guidance', () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Sampling',
        requestKey: 'tab-sampling',
        mcp: {
          ...baseMcp,
          operation: {
            type: 'sampling',
            input: {
              prompt: 'Summarize this file',
              systemPrompt: 'Be concise',
              maxTokens: 256,
              temperature: 0.2,
            },
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-sampling-panel"]').text()).toContain('Sampling')
    expect(wrapper.get('[data-testid="mcp-sampling-boundary-note"]').text()).toContain('server support')
    expect(wrapper.find('[data-testid="mcp-sampling-prompt-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mcp-sampling-system-prompt-input"]').exists()).toBe(true)
  })
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


  it('shows explicit resources guidance and emits discover-resources when no resources are available', async () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Resource',
        requestKey: 'tab-mcp-resource',
        mcp: {
          ...baseMcp,
          operation: {
            type: 'resources.read',
            input: {
              uri: '',
            },
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-discover-resources-button"]').text()).toContain('Discover Resources')
    expect(wrapper.get('[data-testid="mcp-resource-discovery-recommendation"]').text()).toContain('Discover resources first')

    await wrapper.get('[data-testid="mcp-discover-resources-button"]').trigger('click')

    expect(wrapper.emitted('discover-resources')).toHaveLength(1)
    expect(wrapper.find('[data-testid="mcp-resource-uri-input"]').exists()).toBe(true)
  })

  it('prefers discovered resources for resources.read while allowing manual uri fallback', async () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Resource',
        requestKey: 'tab-mcp-resource',
        mcp: {
          ...baseMcp,
          operation: {
            type: 'resources.read',
            input: {
              uri: 'file:///docs/readme.md',
            },
          },
        },
        mcpArtifact: {
          transport: 'http',
          operation: 'resources.list',
          cachedResources: [
            {
              uri: 'file:///docs/readme.md',
              title: 'Readme',
            },
          ],
        },
      },
    })

    expect(wrapper.find('[data-testid="mcp-resource-select"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="mcp-resource-uri"]').text()).toContain('file:///docs/readme.md')

    await wrapper.get('[data-testid="mcp-resource-uri-input"]').setValue('file:///manual/override.txt')
    const updateEvents = wrapper.emitted('update:mcp') ?? []
    const lastPayload = updateEvents[updateEvents.length - 1]?.[0] as { operation?: { input?: { uri?: string } } } | undefined
    expect(lastPayload?.operation?.input?.uri).toBe('file:///manual/override.txt')
  })


  it('supports adding and removing session roots in the MCP workbench', async () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Search',
        requestKey: 'tab-mcp',
        mcp: {
          ...baseMcp,
          roots: [],
        },
      },
    })

    expect(wrapper.get('[data-testid="mcp-roots-panel"]').text()).toContain('Roots')
    expect(wrapper.get('[data-testid="mcp-roots-empty"]').text()).toContain('No roots configured')

    await wrapper.get('[data-testid="mcp-add-root-button"]').trigger('click')
    const updateEvents = wrapper.emitted('update:mcp') ?? []
    const payload = updateEvents[updateEvents.length - 1]?.[0] as { roots?: Array<{ uri: string, name?: string }> }
    expect(payload.roots).toHaveLength(1)
    expect(payload.roots?.[0]?.uri).toBe('')
  })

  it('renders the mode toggle and action buttons in the workbench header', async () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'en',
        requestName: 'MCP Search',
        requestKey: 'tab-mcp',
        requestKind: 'mcp',
        isSending: false,
        disableSend: false,
        mcp: baseMcp,
      },
    })

    expect(wrapper.get('[data-testid="request-kind-toggle"]').text()).toContain('HTTP')
    expect(wrapper.get('[data-testid="request-kind-toggle"]').text()).toContain('MCP')
    expect(wrapper.get('[data-testid="request-url-bar-send"]').text()).toContain('Send')
    expect(wrapper.get('[data-testid="request-command-save"]').attributes('aria-label')).toBe('Save')
    expect(wrapper.get('[data-testid="request-command-save"]').classes()).toContain('zr-secondary-action')

    await wrapper.get('[data-testid="request-kind-http"]').trigger('click')
    await wrapper.get('[data-testid="request-url-bar-send"]').trigger('click')
    await wrapper.get('[data-testid="request-command-save"]').trigger('click')

    expect(wrapper.emitted('update:request-kind')?.[0]).toEqual(['http'])
    expect(wrapper.emitted('send')).toHaveLength(1)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('renders http-style request status pills in the mcp header', () => {
    const wrapper = mount(McpRequestPanel, {
      props: {
        locale: 'zh-CN',
        requestName: 'MCP Search',
        requestKey: 'tab-mcp',
        requestKind: 'mcp',
        originKind: 'detached',
        persistenceState: 'unbound',
        executionState: 'success',
        mcp: baseMcp,
      },
    })

    expect(wrapper.find('[data-testid="mcp-request-context"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="request-identity-origin"]').text()).toContain('已脱离')
    expect(wrapper.get('[data-testid="request-identity-persistence"]').text()).toContain('未绑定')
    expect(wrapper.get('[data-testid="request-identity-execution"]').text()).toContain('成功')
  })

})

it('supports switching to stdio transport and editing command fields', async () => {
  const wrapper = mount(McpRequestPanel, {
    props: {
      locale: 'en',
      requestName: 'MCP Stdio',
      requestKey: 'tab-mcp-stdio',
      mcp: {
        ...baseMcp,
        connection: {
          ...baseMcp.connection,
          transport: 'http',
          stdio: {
            command: '',
            args: [],
            cwd: '',
          },
        },
      },
    },
  })

  await wrapper.vm.$emit('update:mcp', {
    ...baseMcp,
    connection: {
      ...baseMcp.connection,
      transport: 'stdio',
      stdio: {
        command: 'node',
        args: ['dist/index.js', 'stdio'],
        cwd: '/tmp/mcp',
      },
    },
  })

  const updateEvents = wrapper.emitted('update:mcp') ?? []
  const transportPayload = updateEvents[updateEvents.length - 1]?.[0] as { connection?: { transport?: string } } | undefined
  expect(transportPayload?.connection?.transport).toBe('stdio')
})
