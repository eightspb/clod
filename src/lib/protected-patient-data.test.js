import { createCipheriv, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

const VERSION = 'v1'
const ENCRYPTION_DOMAIN = 'clod.protected-patient-data'
const FINGERPRINT_DOMAIN = 'clod.protected-patient-fingerprint'
const ENCRYPTION_KEY = Buffer.from('protected-patient-key-material!!').toString('base64')
const OTHER_ENCRYPTION_KEY = Buffer.from('separate-patient-key-material-32').toString('base64')
const FINGERPRINT_KEY = 'clinic-history-fingerprint-Ω-key-with-strong-entropy-2026'
const FIXED_IV = Buffer.from('0102030405060708090a0b0c', 'hex')
const OTHER_IV = Buffer.from('1112131415161718191a1b1c', 'hex')
const FINGERPRINT_VALUE = 'О’Коннор-Сидорова|79215550129'
const ARRAY_HOOK_PRIVATE_VALUE = 'паспорт 4010 987654'
const ARRAY_HOOK_PAYLOAD = Object.freeze([Object.freeze({ visit: 'Приём эндокринолога', details: Object.freeze(['кабинет 17', 'без опоздания']) })])
const PROTECTED_CASES = Object.freeze([
  Object.freeze(['private_profile', Object.freeze({ fullName: 'О’Коннор-Сидорова Лёля Алиевна', birthday: '1988-02-29', address: Object.freeze({ city: 'Санкт-Петербург', street: 'Каменноостровский проспект, 42' }) })]),
  Object.freeze(['contact', Object.freeze({ kind: 'phone', value: '+7 (921) 555-01-29', primary: true })]),
  Object.freeze(['external_identifier', Object.freeze({ system: 'medesk_ehr', value: 'EHR-Ж-001947' })]),
  Object.freeze(['name_history', Object.freeze({ lastName: 'Сидорова', reason: 'surname_change' })]),
  Object.freeze(['visit_details', Object.freeze({ services: Object.freeze(['Приём маммолога', 'УЗИ']), comment: 'Пациентка просила позвонить вечером' })]),
  Object.freeze(['source_row', Object.freeze({ source: 'PD.csv', row: 971, values: Object.freeze({ Паспорт: '4010 123456', Адрес: 'Петроградская сторона' }) })]),
  Object.freeze(['invoice', Object.freeze([Object.freeze({ number: 'Счёт-№17', amount: 5700 }), Object.freeze({ status: 'incomplete_source' })])]),
  Object.freeze(['attachment', Object.freeze({ url: 'https://archive.example/patient/Ж-314', metadata: Object.freeze({ kind: 'external_scan', pages: 7 }) })]),
])
const PRIVATE_PAYLOAD = Object.freeze({
  fullName: 'О’Коннор-Сидорова Лёля Алиевна',
  phone: '+7 (921) 555-01-29',
  passport: '4010 123456',
  address: 'Санкт-Петербург, Каменноостровский проспект, 42',
  comment: 'Пациентка просила позвонить вечером',
  url: 'https://private.example/patient/Ж-314',
})
const PII_FRAGMENTS = Object.freeze(['О’Коннор-Сидорова', '+7 (921)', '4010 123456', 'Санкт-Петербург', 'просила позвонить', 'private.example/patient'])
const MALFORMED_ENVELOPES = Object.freeze([
  Object.freeze(['non-string', Object.freeze({ envelope: VERSION })]),
  Object.freeze(['missing parts', 'v1.AQ']),
  Object.freeze(['extra parts', 'v1.AQ.AQ.AQ.AQ']),
  Object.freeze(['noncanonical IV', 'v1.A=.AQ.AQ']),
  Object.freeze(['short IV', 'v1.AQ.AQ.AAAAAAAAAAAAAAAAAAAAAA']),
  Object.freeze(['empty ciphertext', 'v1.AAECAwQFBgcICQoL..AAAAAAAAAAAAAAAAAAAAAA']),
  Object.freeze(['short tag', 'v1.AAECAwQFBgcICQoL.AQ.AQ']),
  Object.freeze(['oversized envelope', `v1.${'A'.repeat(100_000)}`]),
])
const INVALID_DATA = Object.freeze([
  Object.freeze(['top-level text', () => 'защищённая строка']),
  Object.freeze(['nested undefined', () => ({ private: undefined })]),
  Object.freeze(['non-finite number', () => ({ amount: Number.NaN })]),
  Object.freeze(['negative zero', () => ({ amount: -0 })]),
  Object.freeze(['big integer', () => ({ card: 17n })]),
  Object.freeze(['function', () => ({ callback: () => 'secret' })]),
  Object.freeze(['symbol', () => ({ marker: Symbol('secret') })]),
  Object.freeze(['date object', () => ({ observedAt: new Date('2026-08-27T12:00:00.000Z') })]),
  Object.freeze(['custom prototype', () => Object.create({ inherited: 'secret' })]),
  Object.freeze(['sparse array', () => { const value = ['first']; value.length = 3; value[2] = 'third'; return value }]),
  Object.freeze(['array property', () => Object.assign(['first'], { private: 'secret' })]),
  Object.freeze(['symbol key', () => ({ visible: 'allowed', [Symbol('private')]: 'secret' })]),
  Object.freeze(['non-enumerable field', () => Object.defineProperty({ visible: 'allowed' }, 'private', { value: 'secret' })]),
])
const INVALID_FINGERPRINT_VALUES = Object.freeze([
  Object.freeze(['empty text', '']),
  Object.freeze(['structured value', Object.freeze({ phone: '79215550129' })]),
  Object.freeze(['oversized text', 'Ж'.repeat(4_097)]),
  Object.freeze(['unpaired surrogate', '\uD800']),
])

async function protectedPatientData() {
  return import('./protected-patient-data.js').catch(() => Object.freeze({}))
}

function captured(operation) {
  try {
    operation()
    return Object.freeze({ threw: false })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code, message: error.message })
  }
}

function authenticatedEnvelope(plaintext, domain) {
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'base64'), FIXED_IV)
  cipher.setAAD(Buffer.from(`${ENCRYPTION_DOMAIN}\0${VERSION}\0${domain}`, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [VERSION, FIXED_IV.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.')
}

function withArrayPrototypeToJSON(operation) {
  const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON')
  let invocations = 0
  Object.defineProperty(Array.prototype, 'toJSON', { configurable: true, value: () => { invocations += 1; throw new Error(ARRAY_HOOK_PRIVATE_VALUE) } })
  try {
    return Object.freeze({ invocations, threw: false, value: operation(), message: '' })
  } catch (error) {
    return Object.freeze({ invocations, threw: true, value: undefined, message: error.message })
  } finally {
    if (descriptor) Object.defineProperty(Array.prototype, 'toJSON', descriptor)
    else Reflect.deleteProperty(Array.prototype, 'toJSON')
  }
}

describe('protected patient data', () => {
  it.each(PROTECTED_CASES)('round-trips protected %s data', async (domain, value) => {
    const protection = await protectedPatientData()
    const envelope = typeof protection.encryptProtectedData === 'function' ? protection.encryptProtectedData({ domain, value, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }) : 'missing'
    const result = typeof protection.decryptProtectedData === 'function' ? protection.decryptProtectedData({ domain, envelope, key: ENCRYPTION_KEY }) : 'missing'
    expect(result).toEqual(value)
  })

  it('keeps every private fragment out of the protected envelope', async () => {
    const protection = await protectedPatientData()
    const envelope = typeof protection.encryptProtectedData === 'function' ? protection.encryptProtectedData({ domain: 'private_profile', value: PRIVATE_PAYLOAD, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }) : 'missing'
    expect(envelope.startsWith('v1.') && PII_FRAGMENTS.every((fragment) => !envelope.includes(fragment))).toBe(true)
  })

  it('uses a fresh initialization vector for repeated protection', async () => {
    const protection = await protectedPatientData()
    const vectors = [FIXED_IV, OTHER_IV]
    const randomBytes = () => vectors.shift()
    const envelopes = [protection.encryptProtectedData?.({ domain: 'contact', value: PROTECTED_CASES[1][1], key: ENCRYPTION_KEY, randomBytes }), protection.encryptProtectedData?.({ domain: 'contact', value: PROTECTED_CASES[1][1], key: ENCRYPTION_KEY, randomBytes })]
    expect(envelopes[0]).not.toBe(envelopes[1])
  })

  it('ignores inherited array serialization hooks without leaking hook errors', async () => {
    const protection = await protectedPatientData()
    const guarded = withArrayPrototypeToJSON(() => protection.decryptProtectedData({ domain: 'visit_details', envelope: protection.encryptProtectedData({ domain: 'visit_details', value: ARRAY_HOOK_PAYLOAD, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }), key: ENCRYPTION_KEY }))
    const result = { invocations: guarded.invocations, threw: guarded.threw, leaked: guarded.message.includes(ARRAY_HOOK_PRIVATE_VALUE), value: guarded.value }
    expect(result).toEqual({ invocations: 0, threw: false, leaked: false, value: ARRAY_HOOK_PAYLOAD })
  })

  it('derives the specified versioned fingerprint inside one domain', async () => {
    const protection = await protectedPatientData()
    const expected = `v1:${createHmac('sha256', FINGERPRINT_KEY).update(`${FINGERPRINT_DOMAIN}\0${VERSION}\0contact\0${FINGERPRINT_VALUE}`, 'utf8').digest('hex')}`
    const result = protection.fingerprintProtectedValue?.({ domain: 'contact', value: FINGERPRINT_VALUE, key: FINGERPRINT_KEY })
    expect(result).toBe(expected)
  })

  it('keeps repeated fingerprints stable inside one domain', async () => {
    const protection = await protectedPatientData()
    const fingerprints = [protection.fingerprintProtectedValue?.({ domain: 'name_history', value: FINGERPRINT_VALUE, key: FINGERPRINT_KEY }), protection.fingerprintProtectedValue?.({ domain: 'name_history', value: FINGERPRINT_VALUE, key: FINGERPRINT_KEY })]
    expect(typeof fingerprints[0] === 'string' && fingerprints[0] === fingerprints[1]).toBe(true)
  })

  it('separates the same fingerprint value across domains', async () => {
    const protection = await protectedPatientData()
    const fingerprints = ['contact', 'name_history'].map((domain) => protection.fingerprintProtectedValue?.({ domain, value: FINGERPRINT_VALUE, key: FINGERPRINT_KEY }))
    expect(fingerprints[0]).not.toBe(fingerprints[1])
  })

  it.each(['encryptProtectedData', 'decryptProtectedData', 'fingerprintProtectedValue'])('rejects unsupported domains through %s', async (method) => {
    const protection = await protectedPatientData()
    const options = { domain: 'medical_document', value: PRIVATE_PAYLOAD, envelope: 'v1.invalid', key: method === 'fingerprintProtectedValue' ? FINGERPRINT_KEY : ENCRYPTION_KEY, randomBytes: () => FIXED_IV }
    const result = typeof protection[method] === 'function' ? captured(() => protection[method](options)) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it.each(INVALID_DATA)('rejects JSON-unsafe plain data containing %s', async (_label, build) => {
    const protection = await protectedPatientData()
    const result = typeof protection.encryptProtectedData === 'function' ? captured(() => protection.encryptProtectedData({ domain: 'source_row', value: build(), key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('rejects nested accessors without invoking them', async () => {
    const protection = await protectedPatientData()
    let invoked = false
    const nested = Object.defineProperty({ visible: 'allowed' }, 'private', { enumerable: true, get: () => { invoked = true; return 'secret' } })
    const result = typeof protection.encryptProtectedData === 'function' ? captured(() => protection.encryptProtectedData({ domain: 'private_profile', value: { nested }, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV })) : Object.freeze({ threw: false })
    expect({ invoked, threw: result.threw, name: result.name }).toEqual({ invoked: false, threw: true, name: 'TypeError' })
  })

  it('rejects protected JSON above the UTF-8 size bound', async () => {
    const protection = await protectedPatientData()
    const result = typeof protection.encryptProtectedData === 'function' ? captured(() => protection.encryptProtectedData({ domain: 'source_row', value: { note: 'Ж'.repeat(70_000) }, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it.each(INVALID_FINGERPRINT_VALUES)('rejects %s before private fingerprint derivation', async (_label, value) => {
    const protection = await protectedPatientData()
    const result = typeof protection.fingerprintProtectedValue === 'function' ? captured(() => protection.fingerprintProtectedValue({ domain: 'external_identifier', value, key: FINGERPRINT_KEY })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('rejects a weak private fingerprint key', async () => {
    const protection = await protectedPatientData()
    const result = typeof protection.fingerprintProtectedValue === 'function' ? captured(() => protection.fingerprintProtectedValue({ domain: 'external_identifier', value: 'EHR-Ж-001947', key: 'repeated-repeated-repeated-repeated' })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('rejects a noncanonical patient encryption key', async () => {
    const protection = await protectedPatientData()
    const result = typeof protection.encryptProtectedData === 'function' ? captured(() => protection.encryptProtectedData({ domain: 'contact', value: PROTECTED_CASES[1][1], key: `${ENCRYPTION_KEY}\n`, randomBytes: () => FIXED_IV })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it('rejects an invalid initialization-vector source', async () => {
    const protection = await protectedPatientData()
    const result = typeof protection.encryptProtectedData === 'function' ? captured(() => protection.encryptProtectedData({ domain: 'contact', value: PROTECTED_CASES[1][1], key: ENCRYPTION_KEY, randomBytes: () => Buffer.alloc(11) })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'TypeError' })
  })

  it.each(MALFORMED_ENVELOPES)('fails safely for a malformed envelope with %s', async (_label, envelope) => {
    const protection = await protectedPatientData()
    const result = typeof protection.decryptProtectedData === 'function' ? captured(() => protection.decryptProtectedData({ domain: 'source_row', envelope, key: ENCRYPTION_KEY })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'ProtectedPatientDataError', code: 'INVALID_PROTECTED_DATA' })
  })

  it('rejects an unsupported envelope version before decryption', async () => {
    const protection = await protectedPatientData()
    const envelope = authenticatedEnvelope(JSON.stringify(PRIVATE_PAYLOAD), 'private_profile')
    const result = typeof protection.decryptProtectedData === 'function' ? captured(() => protection.decryptProtectedData({ domain: 'private_profile', envelope: `v2${envelope.slice(2)}`, key: ENCRYPTION_KEY })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'ProtectedPatientDataError', code: 'INVALID_PROTECTED_DATA' })
  })

  it('detects a corrupted authentication tag without exposing crypto errors', async () => {
    const protection = await protectedPatientData()
    const envelope = protection.encryptProtectedData?.({ domain: 'visit_details', value: PROTECTED_CASES[4][1], key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }) ?? 'missing'
    const final = envelope.at(-1) === 'A' ? 'B' : 'A'
    const result = typeof protection.decryptProtectedData === 'function' ? captured(() => protection.decryptProtectedData({ domain: 'visit_details', envelope: `${envelope.slice(0, -1)}${final}`, key: ENCRYPTION_KEY })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'ProtectedPatientDataError', code: 'DECRYPTION_FAILED' })
  })

  it('prevents a valid envelope from opening inside another domain', async () => {
    const protection = await protectedPatientData()
    const envelope = protection.encryptProtectedData?.({ domain: 'contact', value: PROTECTED_CASES[1][1], key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }) ?? 'missing'
    const result = typeof protection.decryptProtectedData === 'function' ? captured(() => protection.decryptProtectedData({ domain: 'external_identifier', envelope, key: ENCRYPTION_KEY })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'ProtectedPatientDataError', code: 'DECRYPTION_FAILED' })
  })

  it('prevents a valid envelope from opening with another AES key', async () => {
    const protection = await protectedPatientData()
    const envelope = protection.encryptProtectedData?.({ domain: 'invoice', value: PROTECTED_CASES[6][1], key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }) ?? 'missing'
    const result = typeof protection.decryptProtectedData === 'function' ? captured(() => protection.decryptProtectedData({ domain: 'invoice', envelope, key: OTHER_ENCRYPTION_KEY })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'ProtectedPatientDataError', code: 'DECRYPTION_FAILED' })
  })

  it.each([JSON.stringify('private scalar'), '{"unfinished":'])('fails safely for authenticated invalid protected JSON', async (plaintext) => {
    const protection = await protectedPatientData()
    const envelope = authenticatedEnvelope(plaintext, 'source_row')
    const result = typeof protection.decryptProtectedData === 'function' ? captured(() => protection.decryptProtectedData({ domain: 'source_row', envelope, key: ENCRYPTION_KEY })) : Object.freeze({ threw: false })
    expect(result).toMatchObject({ threw: true, name: 'ProtectedPatientDataError', code: 'DECRYPTION_FAILED' })
  })

  it('keeps private fragments out of decryption failures', async () => {
    const protection = await protectedPatientData()
    const envelope = authenticatedEnvelope(JSON.stringify(PRIVATE_PAYLOAD), 'private_profile')
    const result = typeof protection.decryptProtectedData === 'function' ? captured(() => protection.decryptProtectedData({ domain: 'private_profile', envelope, key: OTHER_ENCRYPTION_KEY })) : Object.freeze({ threw: false, message: PRIVATE_PAYLOAD.fullName })
    expect(PII_FRAGMENTS.every((fragment) => !result.message.includes(fragment))).toBe(true)
  })
})
