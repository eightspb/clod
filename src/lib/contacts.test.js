import { describe, it, expect } from 'vitest'
import {
  PHONE_NUMBER,
  PHONE_DISPLAY,
  PHONE_NUMBER_2,
  PHONE_DISPLAY_2,
  WHATSAPP_URL,
  TELEGRAM_URL,
  ADDRESS,
  HOURS_WEEKDAY,
  HOURS_WEEKEND,
} from './contacts.js'

describe('contacts.js', () => {
  describe('phone numbers', () => {
    it('PHONE_NUMBER is digits only', () => {
      expect(PHONE_NUMBER).toMatch(/^\+?[0-9]+$/)
    })

    it('PHONE_NUMBER_2 is digits only', () => {
      expect(PHONE_NUMBER_2).toMatch(/^\+?[0-9]+$/)
    })

    it('PHONE_DISPLAY is formatted for display', () => {
      expect(PHONE_DISPLAY).toContain(' ')
      expect(PHONE_DISPLAY).toMatch(/^\+7/)
    })

    it('PHONE_DISPLAY_2 is formatted for display', () => {
      expect(PHONE_DISPLAY_2).toMatch(/^\+7/)
    })
  })

  describe('messenger links', () => {
    it('WHATSAPP_URL is valid wa.me format', () => {
      expect(WHATSAPP_URL).toMatch(/^https:\/\/wa\.me\/[0-9]+$/)
    })

    it('TELEGRAM_URL is valid t.me format', () => {
      expect(TELEGRAM_URL).toMatch(/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/)
    })
  })

  describe('address and hours', () => {
    it('ADDRESS contains city', () => {
      expect(ADDRESS).toContain('Санкт-Петербург')
    })

    it('HOURS_WEEKDAY and HOURS_WEEKEND are non-empty', () => {
      expect(HOURS_WEEKDAY.length).toBeGreaterThan(0)
      expect(HOURS_WEEKEND.length).toBeGreaterThan(0)
    })
  })
})
