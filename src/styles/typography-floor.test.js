import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const stylesDir = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(stylesDir, 'global.css'), 'utf8')

function scaleBlocks() {
  return [...css.matchAll(/--fs-xs: ([^;]+);[^\n]*\n\s*--fs-sm: ([^;]+);[^\n]*\n\s*--fs-base: ([^;]+);/g)].map((m) => ({ xs: m[1], sm: m[2], base: m[3] }))
}

function subBaseDeclarations(source) {
  return [...source.matchAll(/font-size:\s*(\d*\.?\d+)(rem|em|px)/g)].filter(([, value, unit]) => (unit === 'px' ? Number(value) < 16 : Number(value) < 1)).map(([declaration]) => declaration)
}

function publicSourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return entry === 'admin' ? [] : publicSourceFiles(full)
    return /\.(jsx|astro)$/.test(entry) && !entry.startsWith('Admin') && !entry.includes('.test.') ? [full] : []
  })
}

describe('typography floor', () => {
  it('keeps the xs and sm scale steps equal to the base size in every breakpoint', () => {
    expect(scaleBlocks().map((block) => block.xs === block.base && block.sm === block.base)).toEqual([true, true])
  })
  it('declares no public font size below the base step in global.css', () => {
    const publicCss = css.split('\n').filter((line) => !line.includes('.blog-gen-')).join('\n')
    expect(subBaseDeclarations(publicCss)).toEqual([])
  })
  it('uses no arbitrary Tailwind text size below the base step in public components', () => {
    const offenders = publicSourceFiles(resolve(stylesDir, '..')).flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/text-\[(\d*\.?\d+)(px|rem)\]/g)].filter(([, value, unit]) => (unit === 'px' ? Number(value) < 16 : Number(value) < 1)).map(([cls]) => `${file}: ${cls}`))
    expect(offenders).toEqual([])
  })
})
