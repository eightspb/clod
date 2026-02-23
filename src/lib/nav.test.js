import { describe, it, expect } from 'vitest'
import { DIRECTIONS, NAV_ITEMS, FOOTER_LINKS } from './nav.js'

describe('nav.js', () => {
  describe('DIRECTIONS', () => {
    it('contains all 5 directions', () => {
      expect(DIRECTIONS).toHaveLength(5)
    })

    it('each direction has label and to', () => {
      DIRECTIONS.forEach((d) => {
        expect(d).toHaveProperty('label')
        expect(d).toHaveProperty('to')
        expect(typeof d.label).toBe('string')
        expect(d.to).toMatch(/^\/[a-z-]+$/)
      })
    })

    it('includes mammology, vab, gynecology, endocrinology, neurology', () => {
      const toPaths = DIRECTIONS.map((d) => d.to)
      expect(toPaths).toContain('/mammology')
      expect(toPaths).toContain('/vab')
      expect(toPaths).toContain('/gynecology')
      expect(toPaths).toContain('/endocrinology')
      expect(toPaths).toContain('/neurology')
    })
  })

  describe('NAV_ITEMS', () => {
    it('contains main nav items', () => {
      const labels = NAV_ITEMS.map((i) => i.label)
      expect(labels).toContain('О клинике')
      expect(labels).toContain('Доктора')
      expect(labels).toContain('Второе мнение')
      expect(labels).toContain('Цены')
      expect(labels).toContain('Блог')
      expect(labels).toContain('Контакты')
    })

    it('Направления has children', () => {
      const directions = NAV_ITEMS.find((i) => i.label === 'Направления')
      expect(directions).toBeDefined()
      expect(directions.children).toEqual(DIRECTIONS)
    })
  })

  describe('FOOTER_LINKS', () => {
    it('contains DIRECTIONS and additional links', () => {
      expect(FOOTER_LINKS.length).toBeGreaterThanOrEqual(DIRECTIONS.length)
    })

    it('each link has label and to', () => {
      FOOTER_LINKS.forEach((l) => {
        expect(l).toHaveProperty('label')
        expect(l).toHaveProperty('to')
      })
    })
  })
})
