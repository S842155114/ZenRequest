import { describe, expect, it } from 'vitest'

import { prepareResponseCodeView } from './response-code-viewer'

describe('prepareResponseCodeView', () => {
  it('formats JSON responses for the viewer', () => {
    const result = prepareResponseCodeView('{"ok":true,"items":[1,2]}', 'application/json')

    expect(result.language).toBe('json')
    expect(result.canPreviewAsHtml).toBe(false)
    expect(result.content).toContain('\n  "ok": true,')
    expect(result.content).toContain('\n  "items": [')
  })

  it('detects XML content even when content-type is generic', () => {
    const result = prepareResponseCodeView('<?xml version="1.0"?><note><to>Tove</to></note>', 'text/plain')

    expect(result.language).toBe('xml')
    expect(result.content).toContain('\n<note>')
    expect(result.content).toContain('\n  <to>Tove</to>')
  })

  it('detects HTML responses and keeps them in html mode', () => {
    const result = prepareResponseCodeView('<html><body><main><h1>Hello</h1></main></body></html>', 'text/html')

    expect(result.language).toBe('html')
    expect(result.canPreviewAsHtml).toBe(true)
    expect(result.content).toContain('\n  <body>')
    expect(result.content).toContain('<h1>Hello</h1>')
  })

  it('falls back to plain text when the payload is not structured', () => {
    const result = prepareResponseCodeView('plain response body', 'text/plain')

    expect(result.language).toBe('text')
    expect(result.canPreviewAsHtml).toBe(false)
    expect(result.content).toBe('plain response body')
  })
})
