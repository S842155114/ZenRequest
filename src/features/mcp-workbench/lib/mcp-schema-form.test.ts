import { describe, expect, it } from 'vitest'

import { buildMcpSchemaFormModel, parseMcpStructuredArguments } from './mcp-schema-form'

describe('buildMcpSchemaFormModel', () => {
  it('builds a structured form model for flat object schemas', () => {
    expect(buildMcpSchemaFormModel({
      name: 'search',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', title: 'Query' },
          limit: { type: 'integer', default: 10 },
          exact: { type: 'boolean', default: false },
        },
      },
    }, {
      query: 'orders',
    })).toEqual({
      mode: 'structured',
      fields: [
        { key: 'query', label: 'Query', description: undefined, type: 'string', required: true, defaultValue: 'orders', options: undefined },
        { key: 'limit', label: 'limit', description: undefined, type: 'integer', required: false, defaultValue: '10', options: undefined },
        { key: 'exact', label: 'exact', description: undefined, type: 'boolean', required: false, defaultValue: 'false', options: undefined },
      ],
      initialRaw: `
{
  "query": "orders"
}`.trimStart(),
    })
  })

  it('captures enum options for structured string fields', () => {
    expect(buildMcpSchemaFormModel({
      name: 'search',
      inputSchema: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['title', 'body'], default: 'title' },
        },
      },
    })).toEqual({
      mode: 'structured',
      fields: [
        {
          key: 'scope',
          label: 'scope',
          description: undefined,
          type: 'string',
          required: false,
          defaultValue: 'title',
          options: ['title', 'body'],
        },
      ],
      initialRaw: '{}',
    })
  })

  it('falls back to raw mode when schema contains unsupported nested types', () => {
    expect(buildMcpSchemaFormModel({
      name: 'search',
      inputSchema: {
        type: 'object',
        properties: {
          filters: { type: 'object' },
        },
      },
    }, {
      filters: { tag: 'orders' },
    })).toEqual({
      mode: 'raw',
      fields: [],
      initialRaw: `
{
  "filters": {
    "tag": "orders"
  }
}`.trimStart(),
      fallbackReason: 'This schema contains nested or unsupported fields. Edit arguments as raw JSON.',
    })
  })
})

describe('parseMcpStructuredArguments', () => {
  it('coerces structured values back into MCP tool arguments', () => {
    expect(parseMcpStructuredArguments([
      { key: 'query', label: 'Query', type: 'string', required: true, defaultValue: '' },
      { key: 'limit', label: 'Limit', type: 'integer', required: false, defaultValue: '' },
      { key: 'exact', label: 'Exact', type: 'boolean', required: false, defaultValue: '' },
    ], {
      query: 'orders',
      limit: '20',
      exact: 'true',
    })).toEqual({
      query: 'orders',
      limit: 20,
      exact: true,
    })
  })
})
