import { describe, it, expect } from 'vitest'
import { DOCTORS, getDoctorBySlug } from './doctors-data.js'

describe('doctors-data.js', () => {
  describe('DOCTORS', () => {
    it('exports a non-empty array', () => {
      expect(Array.isArray(DOCTORS)).toBe(true)
      expect(DOCTORS.length).toBeGreaterThan(0)
    })

    it('each doctor has required fields', () => {
      for (const doc of DOCTORS) {
        expect(doc).toHaveProperty('slug')
        expect(doc).toHaveProperty('name')
        expect(doc).toHaveProperty('specialization')
        expect(doc).toHaveProperty('photoMobile')
        expect(doc).toHaveProperty('experienceYears')
        expect(doc).toHaveProperty('ringColor')
        expect(typeof doc.slug).toBe('string')
        expect(typeof doc.name).toBe('string')
        expect(doc.photoMobile).toMatch(/-mobile\.webp$/)
        expect(typeof doc.experienceYears).toBe('number')
      }
    })

    it('all slugs are unique', () => {
      const slugs = DOCTORS.map((d) => d.slug)
      const unique = new Set(slugs)
      expect(unique.size).toBe(slugs.length)
    })

    it('contains Одинцов as first doctor', () => {
      expect(DOCTORS[0].slug).toBe('odintsov')
      expect(DOCTORS[0].degree).toBe('д.м.н.')
    })

    it('marks square mobile portraits for uncropped art direction', () => {
      expect(DOCTORS.filter((doctor) => doctor.photoMobileFit === 'square').map((doctor) => doctor.slug)).toEqual(['odintsov', 'zaharova'])
    })

    it('marks the compact mobile portrait that needs extra stage scale', () => {
      expect(DOCTORS.filter((doctor) => doctor.photoMobileFit === 'compact').map((doctor) => doctor.slug)).toEqual(['nevzorova'])
    })

    it('doctors have helpsWith array', () => {
      for (const doc of DOCTORS) {
        expect(Array.isArray(doc.helpsWith)).toBe(true)
        expect(doc.helpsWith.length).toBeGreaterThan(0)
      }
    })

    it('doctors have education array', () => {
      for (const doc of DOCTORS) {
        expect(Array.isArray(doc.education)).toBe(true)
        expect(doc.education.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getDoctorBySlug', () => {
    it('returns doctor by valid slug', () => {
      const doc = getDoctorBySlug('odintsov')
      expect(doc).not.toBeNull()
      expect(doc.name).toBe('Одинцов Владислав Александрович')
    })

    it('returns null for unknown slug', () => {
      expect(getDoctorBySlug('unknown-doctor')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(getDoctorBySlug('')).toBeNull()
    })

    it('finds each doctor by their own slug', () => {
      for (const doc of DOCTORS) {
        expect(getDoctorBySlug(doc.slug)).toBe(doc)
      }
    })
  })
})
