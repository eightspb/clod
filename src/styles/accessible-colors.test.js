import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import { describe, expect, it } from 'vitest'
import config from '../../tailwind.config.js'

const SOURCE = 'src/styles/global.css'
const CLASSES = 'text-clay-muted text-clay-mint text-clay-mint/70 hover:text-clay-mint group-hover:text-clay-mint text-accent badge-specialty-mint btn-clay-primary btn-clay-primary-sm btn-specialty-mint'
const CSS = (await postcss([tailwindcss({ ...config, content: [{ raw: CLASSES }] })]).process(readFileSync(SOURCE, 'utf8'), { from: SOURCE })).root
const TOKENS = Object.fromEntries(CSS.nodes.flatMap((node) => node.selector === ':root' ? node.nodes.filter((child) => child.type === 'decl').map(({ prop, value }) => [prop, value]) : []))
const SURFACES = ['--surface-page', '--surface-card-hover', '--surface-accent', '--surface-accent-strong', '--surface-peach', '--surface-blue', '--surface-lavender', '--surface-yellow']

function declaration(selector, property) {
  let value
  CSS.walkRules(selector, (rule) => rule.walkDecls(property, (decl) => { value = decl.value }))
  return value
}

function resolve(value) {
  return value.replace(/var\((--[\w-]+)(?:,[^)]+)?\)/g, (_, token) => resolve(TOKENS[token] ?? (token === '--tw-text-opacity' ? '1' : '0')))
}

function channels(value) {
  const resolved = resolve(value)
  if (resolved.startsWith('#')) return resolved.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16))
  return resolved.match(/[\d.]+/g).map(Number)
}

function luminance(channels) {
  return channels.map((channel) => channel / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrast(foreground, background) {
  const [red, green, blue, alpha = 1] = channels(foreground)
  const surface = channels(background)
  const text = luminance([red, green, blue].map((channel, index) => channel * alpha + surface[index] * (1 - alpha)))
  const fill = luminance(surface)
  return (Math.max(text, fill) + 0.05) / (Math.min(text, fill) + 0.05)
}

describe('accessible palette', () => {
  it.each(SURFACES)('keeps secondary text readable on %s', (surface) => {
    expect(contrast(declaration('.text-clay-muted', 'color'), TOKENS[surface])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['.text-clay-mint', '.hover\\:text-clay-mint:hover', '.group:hover .group-hover\\:text-clay-mint', '.text-accent', '.badge-specialty-mint'])('keeps the accent text in %s readable on tinted cards', (selector) => {
    expect(Math.min(...SURFACES.map((surface) => contrast(declaration(selector, 'color'), TOKENS[surface])))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['.btn-clay-primary', '.btn-clay-primary:hover', '.btn-clay-primary-sm', '.btn-clay-primary-sm:hover', '.btn-specialty-mint', '.btn-specialty-mint:hover'])('keeps white action text readable in %s', (selector) => {
    expect(contrast(TOKENS['--accent-text'], declaration(selector, 'background'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the keyboard focus outline distinguishable on every card surface', () => {
    expect(Math.min(...SURFACES.map((surface) => contrast(TOKENS['--focus-ring'], TOKENS[surface])))).toBeGreaterThanOrEqual(3)
  })

  it('preserves the legacy fractional opacity utility when generating mint text', () => {
    expect(declaration('.text-clay-mint\\/70', 'color')).toBeDefined()
  })
})
