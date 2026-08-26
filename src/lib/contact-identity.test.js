import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

const RUSSIAN_FORMATTED = '8 (921) 555-01-29'
const RUSSIAN_NORMALIZED = '79215550129'
const INTERNATIONAL_FORMATTED = '+44 20 7946 0958'
const INTERNATIONAL_NORMALIZED = '442079460958'
const FULLWIDTH_PHONE = '+７ ９２１ ５５５ ０１ ２９'
const FINGERPRINT_KEY = 'fingerprint-secret-Ω-2026-with-entropy-value'
const OTHER_FINGERPRINT_KEY = 'another-secret-Ж-2026-with-different-value'
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const OTHER_ENCRYPTION_KEY = Buffer.from('abcdef0123456789abcdef0123456789').toString('base64')
const FIXED_IV = Buffer.from('0102030405060708090a0b0c', 'hex')
const PROFILE = Object.freeze({ firstName: ' Лёля ', lastName: ' О’Коннор-Сидорова ', secondName: ' Алиевна ', phone: RUSSIAN_FORMATTED, birthday: '1988-02-29' })
const NORMALIZED_PROFILE = Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: RUSSIAN_NORMALIZED, birthday: '1988-02-29' })

async function contactIdentity() {
  return import('./contact-identity.js').catch(() => Object.freeze({}))
}

function captured(operation) {
  try {
    operation()
    return Object.freeze({ threw: false })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code, message: error.message })
  }
}

describe('contact identity', () => {
  it('normalizes a Russian domestic phone to the canonical contact identity', async () => {
    const identity = await contactIdentity()
    const result = typeof identity.normalizeContactPhone === 'function' ? identity.normalizeContactPhone(RUSSIAN_FORMATTED) : 'missing'
    expect(result).toBe(RUSSIAN_NORMALIZED)
  })

  it('normalizes an explicitly international E.164-style phone', async () => {
    const identity = await contactIdentity()
    const result = identity.normalizeContactPhone(INTERNATIONAL_FORMATTED)
    expect(result).toBe(INTERNATIONAL_NORMALIZED)
  })

  it('rejects Unicode lookalike digits before identity derivation', async () => {
    const identity = await contactIdentity()
    expect(() => identity.normalizeContactPhone(FULLWIDTH_PHONE)).toThrow(TypeError)
  })

  it('creates a stable mask that reveals only the first and final two digits', async () => {
    const identity = await contactIdentity()
    const result = typeof identity.maskContactPhone === 'function' ? identity.maskContactPhone(RUSSIAN_NORMALIZED) : 'missing'
    expect(result).toBe('+7 •••••••• 29')
  })

  it('derives a versioned domain-separated contact fingerprint', async () => {
    const identity = await contactIdentity()
    const expected = `v1:${createHmac('sha256', FINGERPRINT_KEY).update(`clod.contact-fingerprint\0v1\0${RUSSIAN_NORMALIZED}`, 'utf8').digest('hex')}`
    const result = typeof identity.fingerprintContactPhone === 'function' ? identity.fingerprintContactPhone({ phone: RUSSIAN_FORMATTED, key: FINGERPRINT_KEY }) : 'missing'
    expect(result).toBe(expected)
  })

  it('separates contact fingerprints created by independent keys', async () => {
    const identity = await contactIdentity()
    const first = typeof identity.fingerprintContactPhone === 'function' ? identity.fingerprintContactPhone({ phone: RUSSIAN_FORMATTED, key: FINGERPRINT_KEY }) : 'missing'
    const second = typeof identity.fingerprintContactPhone === 'function' ? identity.fingerprintContactPhone({ phone: RUSSIAN_FORMATTED, key: OTHER_FINGERPRINT_KEY }) : 'missing'
    expect(first).not.toBe(second)
  })

  it('round-trips a normalized patient profile through AES-256-GCM', async () => {
    const identity = await contactIdentity()
    const envelope = typeof identity.encryptPatientProfile === 'function' ? identity.encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }) : 'missing'
    const result = typeof identity.decryptPatientProfile === 'function' ? identity.decryptPatientProfile({ envelope, key: ENCRYPTION_KEY }) : Object.freeze({})
    expect(result).toEqual(NORMALIZED_PROFILE)
  })

  it('creates a versioned envelope without plaintext profile values', async () => {
    const identity = await contactIdentity()
    const envelope = typeof identity.encryptPatientProfile === 'function' ? identity.encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }) : 'missing'
    const result = envelope.startsWith('v1.') && !envelope.includes('Лёля') && !envelope.includes(RUSSIAN_NORMALIZED)
    expect(result).toBe(true)
  })

  it('uses a fresh random IV for repeated patient-profile encryption', async () => {
    const identity = await contactIdentity()
    const first = typeof identity.encryptPatientProfile === 'function' ? identity.encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY }) : 'missing'
    const second = typeof identity.encryptPatientProfile === 'function' ? identity.encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY }) : 'missing'
    expect(first).not.toBe(second)
  })

  it('trims harmless outer whitespace before phone normalization', async () => {
    const identity = await contactIdentity()
    const result = identity.normalizeContactPhone(`  ${INTERNATIONAL_FORMATTED}  `)
    expect(result).toBe(INTERNATIONAL_NORMALIZED)
  })

  it('rejects a weak contact fingerprint key before HMAC derivation', async () => {
    const identity = await contactIdentity()
    const result = captured(() => identity.fingerprintContactPhone({ phone: RUSSIAN_FORMATTED, key: 'repeated-repeated-repeated-repeated' }))
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('rejects a noncanonical patient encryption key', async () => {
    const identity = await contactIdentity()
    const result = captured(() => identity.encryptPatientProfile({ profile: PROFILE, key: `${ENCRYPTION_KEY}\n`, randomBytes: () => FIXED_IV }))
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('rejects profile accessors without invoking them', async () => {
    const identity = await contactIdentity()
    const profile = { ...PROFILE }
    Object.defineProperty(profile, 'firstName', { enumerable: true, get: () => { throw new Error('getter invoked') } })
    const result = captured(() => identity.encryptPatientProfile({ profile, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }))
    expect(result).toMatchObject({ threw: true, name: 'TypeError', message: 'Patient profile must contain data fields only' })
  })

  it('rejects an impossible patient birthday', async () => {
    const identity = await contactIdentity()
    const result = captured(() => identity.encryptPatientProfile({ profile: { ...PROFILE, birthday: '2025-02-29' }, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }))
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('rejects oversized patient profile text', async () => {
    const identity = await contactIdentity()
    const result = captured(() => identity.encryptPatientProfile({ profile: { ...PROFILE, firstName: 'Я'.repeat(101) }, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }))
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('fails safely when a patient envelope authentication tag is corrupted', async () => {
    const identity = await contactIdentity()
    const envelope = identity.encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV })
    const final = envelope.at(-1) === 'A' ? 'B' : 'A'
    const result = captured(() => identity.decryptPatientProfile({ envelope: `${envelope.slice(0, -1)}${final}`, key: ENCRYPTION_KEY }))
    expect(result).toEqual({ threw: true, name: 'ContactIdentityError', code: 'DECRYPTION_FAILED', message: 'Protected contact data could not be opened' })
  })

  it('fails safely when a patient envelope uses another encryption key', async () => {
    const identity = await contactIdentity()
    const envelope = identity.encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV })
    const result = captured(() => identity.decryptPatientProfile({ envelope, key: OTHER_ENCRYPTION_KEY }))
    expect(result).toMatchObject({ threw: true, name: 'ContactIdentityError', code: 'DECRYPTION_FAILED' })
  })

  it('rejects an unknown patient-envelope version before decryption', async () => {
    const identity = await contactIdentity()
    const envelope = identity.encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV })
    const result = captured(() => identity.decryptPatientProfile({ envelope: `v2${envelope.slice(2)}`, key: ENCRYPTION_KEY }))
    expect(result).toMatchObject({ threw: true, name: 'ContactIdentityError', code: 'INVALID_PROTECTED_DATA' })
  })

})
