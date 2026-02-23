import { describe, it, expect } from 'vitest'
import { FILTER_TABS, FILTER_BG, FILTER_BG_FLAT, matchesFilter } from './filters.js'

describe('filters.js', () => {
  describe('FILTER_TABS', () => {
    it('includes all, mammology, gynecology, endocrinology', () => {
      const ids = FILTER_TABS.map((t) => t.id)
      expect(ids).toContain('all')
      expect(ids).toContain('mammology')
      expect(ids).toContain('gynecology')
      expect(ids).toContain('endocrinology')
    })
  })

  describe('FILTER_BG and FILTER_BG_FLAT', () => {
    it('have 4 gradient/color entries', () => {
      expect(FILTER_BG).toHaveLength(4)
      expect(FILTER_BG_FLAT).toHaveLength(4)
    })
  })

  describe('matchesFilter', () => {
    it('returns true for filterId "all"', () => {
      expect(matchesFilter({ specialization: 'Гинеколог' }, 'all')).toBe(true)
    })

    it('matches mammology for онколог, хирург, маммолог', () => {
      expect(matchesFilter({ specialization: 'Онколог-маммолог' }, 'mammology')).toBe(true)
      expect(matchesFilter({ specialization: 'Хирург' }, 'mammology')).toBe(true)
      expect(matchesFilter({ specialization: 'Врач УЗД, маммолог' }, 'mammology')).toBe(true)
    })

    it('does not match mammology for гинеколог', () => {
      expect(matchesFilter({ specialization: 'Гинеколог' }, 'mammology')).toBe(false)
    })

    it('matches gynecology for гинеколог, акушер', () => {
      expect(matchesFilter({ specialization: 'Гинеколог-эндокринолог' }, 'gynecology')).toBe(true)
      expect(matchesFilter({ specialization: 'Акушер-гинеколог' }, 'gynecology')).toBe(true)
    })

    it('matches endocrinology for эндокринолог, нутрицио', () => {
      expect(matchesFilter({ specialization: 'Эндокринолог' }, 'endocrinology')).toBe(true)
      expect(matchesFilter({ specialization: 'Нутрициолог' }, 'endocrinology')).toBe(true)
    })

    it('is case-insensitive', () => {
      expect(matchesFilter({ specialization: 'ОНКОЛОГ' }, 'mammology')).toBe(true)
    })

    it('returns false for unknown filterId', () => {
      expect(matchesFilter({ specialization: 'Гинеколог' }, 'unknown')).toBe(false)
    })
  })
})
