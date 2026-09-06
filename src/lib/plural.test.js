import { describe, expect, it } from 'vitest'
import { plural } from './plural.js'

const CARDS = Object.freeze(['карта', 'карты', 'карт'])

describe('plural', () => {
  it('picks the singular form for a single item', () => {
    expect(plural(1, CARDS)).toBe('карта')
  })
  it('picks the few form for four items', () => {
    expect(plural(4, CARDS)).toBe('карты')
  })
  it('picks the many form for eleven items', () => {
    expect(plural(11, CARDS)).toBe('карт')
  })
  it('picks the many form for a hundred and fourteen items', () => {
    expect(plural(114, CARDS)).toBe('карт')
  })
  it('picks the singular form for twenty one items', () => {
    expect(plural(21, CARDS)).toBe('карта')
  })
  it('picks the many form for zero items', () => {
    expect(plural(0, CARDS)).toBe('карт')
  })
  it('fails fast on a non-integer count', () => {
    expect(() => plural(2.5, CARDS)).toThrow()
  })
})
