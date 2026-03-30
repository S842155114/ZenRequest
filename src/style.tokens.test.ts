import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

describe('workbench theme tokens', () => {
  it('defines the signal-light palette and developer typography', () => {
    expect(css).toContain('--zr-accent-strong: #ca6f43;')
    expect(css).toContain('--zr-signal-strong: #17a57c;')
    expect(css).toContain('--zr-signal-soft: rgba(23, 165, 124, 0.12);')
    expect(css).toContain('font-family: "IBM Plex Sans", "Segoe UI", "Helvetica Neue", sans-serif;')
  })

  it('styles the dedicated compose rail for request authoring sections', () => {
    expect(css).toContain('.zr-compose-rail {')
    expect(css).toContain('border-color: color-mix(in srgb, var(--zr-border) 88%, transparent);')
  })
})
