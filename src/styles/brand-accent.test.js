import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const BRAND_ACCENT = '#1C89A1'
const GLOBAL_CSS = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8')

describe('brand accent', () => {
  it('sets the clinic logo colour as the default accent in global.css', () => {
    expect(GLOBAL_CSS).toMatch(new RegExp(`--accent:\\s*${BRAND_ACCENT};`))
  })

  it('sets the clinic logo colour as the default mint token in global.css', () => {
    expect(GLOBAL_CSS).toMatch(new RegExp(`--color-mint:\\s*${BRAND_ACCENT};`))
  })

  it('derives the default mint rgb triplet from the clinic logo colour', () => {
    expect(GLOBAL_CSS).toMatch(/--color-mint-rgb:\s*28 137 161;/)
  })

  it('keeps the default focus ring opaque in the clinic logo colour', () => {
    expect(GLOBAL_CSS).toMatch(new RegExp(`--focus-ring:\\s*${BRAND_ACCENT};`))
  })
})
