import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = resolve(import.meta.dirname, '../..')

describe('ESLint scope', () => {
  it('no longer ignores the scripts, e2e, tracker, and Astro sources', async () => {
    const config = await readFile(join(PROJECT_ROOT, 'eslint.config.js'), 'utf8')
    const ignored = ['scripts/**', 'e2e/**', 'src/lib/tracker.js', 'src/pages/**/*.astro', 'src/layouts/**/*.astro'].filter((pattern) => config.includes(`'${pattern}'`))
    expect(ignored).toEqual([])
  })

  it('treats a fragment shorthand inside a list as a missing key', async () => {
    const config = await readFile(join(PROJECT_ROOT, 'eslint.config.js'), 'utf8')
    expect(config).toContain("'react/jsx-key': ['error', { checkFragmentShorthand: true }]")
  })
})
