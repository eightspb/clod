import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const GLOBAL_CSS = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8')

function declarations(selector) {
  const escaped = selector.replace(/[.]/g, '\\.')
  const match = GLOBAL_CSS.match(new RegExp(`\\n${escaped}\\s*\\{([^}]*)\\}`))
  return match ? match[1] : ''
}

describe('booking dialog header', () => {
  it('never sticks the header, because iOS drops the sticky layer over the scrolling sibling', () => {
    expect(declarations('.booking-dialog-header')).not.toMatch(/position:\s*sticky/)
  })

  it('positions the header so that its stacking order above the scrolling body still applies', () => {
    expect(declarations('.booking-dialog-header')).toMatch(/position:\s*relative/)
  })
})
