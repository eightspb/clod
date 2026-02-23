import { describe, it, expect } from 'vitest'
import { CLINIC_FACTS, SERVICES, WHY_ITEMS } from './clinic-info.js'

describe('clinic-info.js', () => {
  describe('CLINIC_FACTS', () => {
    it('exports an array of facts', () => {
      expect(Array.isArray(CLINIC_FACTS)).toBe(true)
      expect(CLINIC_FACTS.length).toBeGreaterThan(0)
    })

    it('each fact has required fields', () => {
      for (const fact of CLINIC_FACTS) {
        expect(fact).toHaveProperty('iconName')
        expect(fact).toHaveProperty('color')
        expect(fact).toHaveProperty('title')
        expect(fact).toHaveProperty('desc')
        expect(typeof fact.title).toBe('string')
        expect(typeof fact.desc).toBe('string')
      }
    })

    it('contains ВАБ technology fact', () => {
      const vab = CLINIC_FACTS.find((f) => f.title === 'Технология ВАБ')
      expect(vab).toBeDefined()
    })
  })

  describe('SERVICES', () => {
    it('exports an array of services', () => {
      expect(Array.isArray(SERVICES)).toBe(true)
      expect(SERVICES.length).toBeGreaterThan(0)
    })

    it('each service has required fields', () => {
      for (const svc of SERVICES) {
        expect(svc).toHaveProperty('title')
        expect(svc).toHaveProperty('desc')
        expect(svc).toHaveProperty('to')
        expect(svc.to).toMatch(/^\//)
      }
    })

    it('includes Маммология service', () => {
      const mammo = SERVICES.find((s) => s.title === 'Маммология')
      expect(mammo).toBeDefined()
      expect(mammo.to).toBe('/mammology')
    })

    it('includes ВАБ service', () => {
      const vab = SERVICES.find((s) => s.title === 'ВАБ')
      expect(vab).toBeDefined()
      expect(vab.to).toBe('/vab')
    })
  })

  describe('WHY_ITEMS', () => {
    it('exports an array of why items', () => {
      expect(Array.isArray(WHY_ITEMS)).toBe(true)
      expect(WHY_ITEMS.length).toBeGreaterThan(0)
    })

    it('each item has iconName, bg, title, desc', () => {
      for (const item of WHY_ITEMS) {
        expect(item).toHaveProperty('iconName')
        expect(item).toHaveProperty('bg')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('desc')
      }
    })
  })
})
