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
