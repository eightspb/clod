import { describe, expect, it } from 'vitest'
import { assessEnvironment } from './startup-environment.js'

const COMPLETE = Object.freeze({ ADMIN_PASSWORD: 'пароль', TOKEN_SECRET: 's', ASTRO_DB_REMOTE_URL: 'file:/data/db.sqlite', BOOKING_INTENT_SECRET: 'b', CONTACT_FINGERPRINT_KEY: 'c', PATIENT_ENCRYPTION_KEY: 'p', SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p', TO_EMAIL: 't@odintsovclinic.ru', TAX_FORM_TO_EMAIL: 'i@odintsovclinic.ru', MEDFLEX_CLINIC_TOKEN: 'm', MANGO_VPBX_API_KEY: 'k', MANGO_VPBX_API_SALT: 's', MANGO_CALL_ENCRYPTION_KEY: 'e', MANGO_INBOUND_LINES: '+78127482210' })

describe('assessEnvironment', () => {
  it('reports nothing for a complete environment', () => {
    expect(assessEnvironment(COMPLETE)).toEqual({ missingRequired: [], disabledFeatures: [] })
  })

  it('treats a whitespace-only patient key as a missing required variable', () => {
    expect(assessEnvironment({ ...COMPLETE, PATIENT_ENCRYPTION_KEY: '  ' }).missingRequired).toEqual(['PATIENT_ENCRYPTION_KEY'])
  })

  it('names the public forms as disabled when SMTP is absent', () => {
    expect(assessEnvironment({ ...COMPLETE, SMTP_HOST: '' }).disabledFeatures).toEqual([{ name: 'Формы «Второе мнение» и «Налоговая справка» (SMTP)', missing: ['SMTP_HOST'] }])
  })

  it('fails fast on a non-object environment', () => {
    expect(() => assessEnvironment(undefined)).toThrow(TypeError)
  })
})
