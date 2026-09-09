import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = resolve(import.meta.dirname, '../..')

async function source(relativePath) {
  return readFile(join(PROJECT_ROOT, relativePath), 'utf8')
}

describe('public analytics tracker', () => {
  it('is published byte-for-byte from the library copy', async () => {
    expect(await source('public/tracker.js')).toBe(await source('src/lib/tracker.js'))
  })

  it('never reads the text of clicked elements', async () => {
    expect(await source('public/tracker.js')).not.toMatch(/innerText|textContent/)
  })

  it('ignores clicks whose ancestors are neither links, buttons, nor data-track targets', async () => {
    const script = await source('public/tracker.js')
    expect(script).toContain('if (!matched) return')
  })
})

describe('public analytics tracker consent gate', () => {
  it('reads the same storage key the consent module exports', async () => {
    const { ANALYTICS_CONSENT_STORAGE_KEY } = await import('./analytics-consent.js')
    expect(await source('public/tracker.js')).toContain(`var CONSENT_KEY = '${ANALYTICS_CONSENT_STORAGE_KEY}'`)
  })

  it('listens for the same DOM event the consent module exports', async () => {
    const { ANALYTICS_CONSENT_EVENT } = await import('./analytics-consent.js')
    expect(await source('public/tracker.js')).toContain(`var CONSENT_EVENT = '${ANALYTICS_CONSENT_EVENT}'`)
  })

  it('starts only after a stored grant', async () => {
    expect(await source('public/tracker.js')).toContain("if (consent() === 'granted') start()")
  })

  it('drops the visitor identifier when consent is withdrawn', async () => {
    const script = await source('public/tracker.js')
    expect(script.slice(script.indexOf('stopTracking = function'))).toContain("localStorage.removeItem('_vid')")
  })
})
