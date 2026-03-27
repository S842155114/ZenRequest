/// <reference types="node" />

import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { afterEach, describe, expect, it, vi } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexHtml = readFileSync(path.resolve(__dirname, '../index.html'), 'utf8')
const startupScript = indexHtml.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]

if (!startupScript) {
  throw new Error('Unable to locate startup theme script in index.html')
}

const runStartupScript = () => {
  window.eval(startupScript)
}

const createLocalStorageStub = () => {
  const storage = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    },
  })
}

afterEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.startupTheme
  vi.restoreAllMocks()
})

describe('startup launch document theme initialization', () => {
  it('uses the persisted explicit theme before Vue mounts', () => {
    createLocalStorageStub()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })

    window.localStorage.setItem('zenrequest.workspace', JSON.stringify({
      themeMode: 'light',
    }))

    runStartupScript()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.startupTheme).toBe('light')
  })

  it('resolves persisted system theme through prefers-color-scheme before Vue mounts', () => {
    createLocalStorageStub()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })

    window.localStorage.setItem('zenrequest.workspace', JSON.stringify({
      themeMode: 'system',
    }))

    runStartupScript()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.startupTheme).toBe('dark')
  })
})
