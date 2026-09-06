import { describe, it, expect } from 'vitest'
import { DIRECTIONS, VAB_ITEM, NAV_ITEMS, FOOTER_LINKS, doctorGroups } from './nav.js'
import { DOCTORS } from './doctors-data.js'

describe('nav.js', () => {
  describe('DIRECTIONS', () => {
    it('contains 4 medical directions', () => {
      expect(DIRECTIONS).toHaveLength(4)
    })

    it('each direction has label, to, and conditions array', () => {
      DIRECTIONS.forEach((d) => {
        expect(typeof d.label).toBe('string')
        expect(d.to).toMatch(/^\/[a-z-]+$/)
        expect(Array.isArray(d.conditions)).toBe(true)
      })
    })

    it('includes mammology, gynecology, endocrinology, nutrition', () => {
      const toPaths = DIRECTIONS.map((d) => d.to)
      expect(toPaths).toEqual(['/mammology', '/gynecology', '/endocrinology', '/nutrition'])
    })

    it('uses thumbnail portraits for mega-menu doctors', () => {
      expect(doctorGroups(DOCTORS).flatMap((group) => group.doctors.map((doctor) => doctor.photo)).every((photo) => /-thumb\.webp$/.test(photo))).toBe(true)
    })

    it('keeps doctor biographies out of the static menu so the Header chunk stays small', () => {
      expect(NAV_ITEMS.find((item) => item.mega === 'doctors').groups).toEqual([])
    })

    it('lists every clinic doctor under at least one direction', () => {
      expect(new Set(doctorGroups(DOCTORS).flatMap((group) => group.doctors.map((doctor) => doctor.slug)))).toEqual(new Set(DOCTORS.map((doctor) => doctor.slug)))
    })

    it('mammology has condition pages with label and to', () => {
      const mammology = DIRECTIONS.find((d) => d.to === '/mammology')
      expect(mammology.conditions.length).toBeGreaterThan(0)
      mammology.conditions.forEach((c) => {
        expect(typeof c.label).toBe('string')
        expect(c.to).toMatch(/^\/[a-z-]+$/)
      })
    })
  })

  describe('VAB_ITEM', () => {
    it('has label and path to /vab', () => {
      expect(VAB_ITEM.to).toBe('/vab')
      expect(VAB_ITEM.label).toMatch(/ВАБ/)
    })
  })

  describe('NAV_ITEMS', () => {
    it('contains 6 top-level nav items', () => {
      expect(NAV_ITEMS).toHaveLength(6)
    })

    it('includes expected top-level labels', () => {
      const labels = NAV_ITEMS.map((i) => i.label)
      expect(labels).toContain('О клинике')
      expect(labels).toContain('Направления')
      expect(labels).toContain('Доктора')
      expect(labels).toContain('Пациентам')
      expect(labels).toContain('Блог')
      expect(labels).toContain('Контакты')
    })

    it('Направления is marked as mega-menu with DIRECTIONS children and vab', () => {
      const directions = NAV_ITEMS.find((i) => i.label === 'Направления')
      expect(directions.mega).toBe(true)
      expect(directions.children).toEqual(DIRECTIONS)
      expect(directions.vab).toEqual(VAB_ITEM)
    })

    it('О клинике has dropdown children with about, results, media, licenses', () => {
      const about = NAV_ITEMS.find((i) => i.label === 'О клинике')
      expect(about.children).toHaveLength(4)
      expect(about.children[0].to).toBe('/about')
    })

    it('Пациентам has dropdown children including second-opinion and prices', () => {
      const patients = NAV_ITEMS.find((i) => i.label === 'Пациентам')
      const paths = patients.children.map((c) => c.to)
      expect(paths).toContain('/second-opinion')
      expect(paths).toContain('/prices')
    })
  })

  describe('FOOTER_LINKS', () => {
    it('has directions, clinic, and patients groups', () => {
      expect(FOOTER_LINKS).toHaveProperty('directions')
      expect(FOOTER_LINKS).toHaveProperty('clinic')
      expect(FOOTER_LINKS).toHaveProperty('patients')
    })

    it('directions group includes all DIRECTIONS plus VAB', () => {
      expect(FOOTER_LINKS.directions).toHaveLength(DIRECTIONS.length + 1)
    })

    it('each link in every group has label and to', () => {
      Object.values(FOOTER_LINKS).flat().forEach((l) => {
        expect(l).toHaveProperty('label')
        expect(l).toHaveProperty('to')
      })
    })
  })
})
