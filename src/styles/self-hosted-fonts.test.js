import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FONT_DIR = join(process.cwd(), 'public', 'fonts')
const GLOBAL_CSS = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8')

describe('self-hosted fonts', () => {
  it('ships only font files that global.css declares in @font-face', () => {
    const undeclared = readdirSync(FONT_DIR).filter((file) => file.endsWith('.woff2') && !GLOBAL_CSS.includes(`/fonts/${file}`))
    expect(undeclared).toEqual([])
  })
})
