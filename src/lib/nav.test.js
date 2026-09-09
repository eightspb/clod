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

    it('О клинике has dropdown children with about, results, media, licenses, vacancies', () => {
      const about = NAV_ITEMS.find((i) => i.label === 'О клинике')
      expect(about.children).toHaveLength(5)
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

    it('directions group includes all DIRECTIONS plus VAB and the doctors index', () => {
      expect(FOOTER_LINKS.directions.map((link) => link.to)).toEqual([...DIRECTIONS.map((d) => d.to), '/vab', '/doctors'])
    })

    it('keeps the blog and contacts in the clinic column instead of the tail of the patients column', () => {
      expect({ clinic: FOOTER_LINKS.clinic.map((link) => link.to).slice(-2), patientsTail: FOOTER_LINKS.patients.some((link) => ['/doctors', '/blog', '/contacts'].includes(link.to)) }).toEqual({ clinic: ['/blog', '/contacts'], patientsTail: false })
    })

    it('balances the footer columns within seven links each', () => {
      expect(Object.values(FOOTER_LINKS).map((group) => group.length).every((count) => count <= 7)).toBe(true)
    })

    it('each link in every group has label and to', () => {
      Object.values(FOOTER_LINKS).flat().forEach((l) => {
        expect(l).toHaveProperty('label')
        expect(l).toHaveProperty('to')
      })
    })
  })
})

describe('patient and clinic service pages', () => {
  it('links the promotions and patient information pages from the Пациентам menu but keeps accessibility out of every menu', () => {
    const patients = NAV_ITEMS.find((item) => item.label === 'Пациентам').children.map((child) => child.to)
    const everywhere = [...NAV_ITEMS.flatMap((item) => item.children || []), ...Object.values(FOOTER_LINKS).flat()].map((link) => link.to)
    expect({ promotions: patients.includes('/promotions'), info: patients.includes('/patient-info'), accessibility: everywhere.includes('/accessibility') }).toEqual({ promotions: true, info: true, accessibility: false })
  })
  it('links the vacancies page from the О клинике menu and the footer', () => {
    const clinic = NAV_ITEMS.find((item) => item.label === 'О клинике').children.map((child) => child.to)
    expect({ menu: clinic.includes('/vacancies'), footer: FOOTER_LINKS.clinic.some((link) => link.to === '/vacancies') }).toEqual({ menu: true, footer: true })
  })
})
