import { createCipheriv, createDecipheriv, createHmac, randomBytes as secureRandomBytes } from 'node:crypto'

const PHONE_FORMAT_PATTERN = /^\+?[0-9 ()-]+$/
const CANONICAL_PHONE_PATTERN = /^[1-9][0-9]{7,14}$/
const FINGERPRINT_DOMAIN = 'clod.contact-fingerprint'
const VERSION = 'v1'
const PROFILE_DOMAIN = 'clod.patient-profile'
const IMPORTED_PROFILE_DOMAIN = 'clod.imported-patient-profile'
const PHONE_DOMAIN = 'clod.contact-phone'
const PROFILE_KEYS = Object.freeze(['firstName', 'lastName', 'secondName', 'phone', 'birthday'])
const REQUIRED_PROFILE_KEYS = Object.freeze(['firstName', 'lastName', 'phone'])
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const BASE64_KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/
const ENVELOPE_PART_PATTERN = /^[A-Za-z0-9_-]+$/
const MAX_PROFILE_BYTES = 2_048
const MAX_ENVELOPE_LENGTH = 4_096
const IV_BYTES = 12
const TAG_BYTES = 16

/**
 * Represents a safe contact-identity failure without exposing protected values.
 */
export class ContactIdentityError extends Error {
  constructor(code) {
    super(code === 'DECRYPTION_FAILED' ? 'Protected contact data could not be opened' : 'Protected contact data is invalid')
    this.name = 'ContactIdentityError'
    this.code = code === 'DECRYPTION_FAILED' ? code : 'INVALID_PROTECTED_DATA'
    Object.freeze(this)
  }
}

function canonicalPhone(value) {
  if (typeof value !== 'string' || !CANONICAL_PHONE_PATTERN.test(value)) throw new TypeError('Contact phone must be canonical digits')
  return value
}

function strongTextKey(value, scope) {
  if (typeof value !== 'string' || value.trim() !== value) throw new TypeError(`${scope} must be strong runtime text`)
  const bytes = Buffer.from(value, 'utf8')
  if (bytes.length < 32 || bytes.length > 4_096 || new Set(bytes).size < 8) throw new TypeError(`${scope} must be strong runtime text`)
  return value
}

function encryptionKey(value) {
  if (typeof value !== 'string' || !BASE64_KEY_PATTERN.test(value)) throw new TypeError('Contact encryption key must be canonical base64 for 32 bytes')
  const decoded = Buffer.from(value, 'base64')
  if (decoded.length !== 32 || decoded.toString('base64') !== value) throw new TypeError('Contact encryption key must be canonical base64 for 32 bytes')
  return decoded
}

function plainRecord(value, allowed, required, scope) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${scope} must be a plain data object`)
  let prototype
  let keys
  try {
    prototype = Object.getPrototypeOf(value)
    keys = Reflect.ownKeys(value)
  } catch {
    throw new TypeError(`${scope} must be a plain data object`)
  }
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${scope} must be a plain data object`)
  const result = Object.create(null)
  for (const key of keys) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError(`${scope} contains unknown fields`)
    let descriptor
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key)
    } catch {
      throw new TypeError(`${scope} must be a plain data object`)
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} must contain data fields only`)
    result[key] = descriptor.value
  }
  if (!required.every((key) => Object.hasOwn(result, key))) throw new TypeError(`${scope} is missing required fields`)
  return result
}

function prohibitedTextCharacter(value) {
  const code = value.codePointAt(0)
  return code <= 31 || code === 127 || (value.length === 1 && code >= 0xD800 && code <= 0xDFFF)
}

function profileText(value, scope, allowEmpty) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be bounded text`)
  const normalized = value.trim().normalize('NFC')
  if ((!allowEmpty && normalized.length === 0) || [...normalized].length > 100 || [...normalized].some(prohibitedTextCharacter)) throw new TypeError(`${scope} must be bounded text`)
  return normalized
}

function leapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function profileBirthday(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new TypeError('Patient birthday must be a real YYYY-MM-DD date')
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new TypeError('Patient birthday must be a real YYYY-MM-DD date')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const days = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || year > 9_999 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) throw new TypeError('Patient birthday must be a real YYYY-MM-DD date')
  return value
}

function profileJson(value) {
  const result = Object.create(null)
  for (const key of PROFILE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Patient profile must contain data fields only')
    result[key] = descriptor.value
  }
  return JSON.stringify(Object.freeze(result))
}

export function normalizePatientProfile(value) {
  const input = plainRecord(value, PROFILE_KEYS, REQUIRED_PROFILE_KEYS, 'Patient profile')
  const profile = Object.freeze({ firstName: profileText(input.firstName, 'Patient first name', false), lastName: profileText(input.lastName, 'Patient last name', false), secondName: profileText(input.secondName ?? '', 'Patient second name', true), phone: normalizeContactPhone(input.phone), birthday: profileBirthday(input.birthday) })
  if (Buffer.byteLength(profileJson(profile), 'utf8') > MAX_PROFILE_BYTES) throw new TypeError('Patient profile is too large')
  return profile
}

function importedProfileText(value, scope) {
  if (value === undefined || value === null || value === '') return null
  return profileText(value, scope, false)
}

export function normalizeImportedPatientProfile(value) {
  const input = plainRecord(value, PROFILE_KEYS, [], 'Imported patient profile')
  const phone = input.phone === undefined || input.phone === null || input.phone === '' ? null : normalizeContactPhone(input.phone)
  const profile = Object.freeze({ firstName: importedProfileText(input.firstName, 'Imported patient first name'), lastName: importedProfileText(input.lastName, 'Imported patient last name'), secondName: importedProfileText(input.secondName, 'Imported patient second name'), phone, birthday: profileBirthday(input.birthday) })
  if (Buffer.byteLength(profileJson(profile), 'utf8') > MAX_PROFILE_BYTES) throw new TypeError('Imported patient profile is too large')
  return profile
}

function initializationVector(source) {
  if (typeof source !== 'function') throw new TypeError('Contact encryption random source must be a function')
  const value = source(IV_BYTES)
  if (!ArrayBuffer.isView(value) || value.BYTES_PER_ELEMENT !== 1 || value.byteLength !== IV_BYTES) throw new TypeError('Contact encryption random source must return 12 bytes')
  return Buffer.from(value)
}

function additionalData(domain) {
  return Buffer.from(`${domain}\0${VERSION}`, 'utf8')
}

function envelopePart(value, expectedBytes) {
  if (typeof value !== 'string' || !ENVELOPE_PART_PATTERN.test(value)) throw new ContactIdentityError('INVALID_PROTECTED_DATA')
  const decoded = Buffer.from(value, 'base64url')
  if (decoded.byteLength !== expectedBytes || decoded.toString('base64url') !== value) throw new ContactIdentityError('INVALID_PROTECTED_DATA')
  return decoded
}

function encryptedParts(value) {
  if (typeof value !== 'string' || value.length > MAX_ENVELOPE_LENGTH) throw new ContactIdentityError('INVALID_PROTECTED_DATA')
  const parts = value.split('.')
  if (parts.length !== 4 || parts[0] !== VERSION) throw new ContactIdentityError('INVALID_PROTECTED_DATA')
  const iv = envelopePart(parts[1], IV_BYTES, 'Contact envelope IV')
  const tag = envelopePart(parts[3], TAG_BYTES, 'Contact envelope tag')
  if (!ENVELOPE_PART_PATTERN.test(parts[2])) throw new ContactIdentityError('INVALID_PROTECTED_DATA')
  const ciphertext = Buffer.from(parts[2], 'base64url')
  if (ciphertext.length < 1 || ciphertext.toString('base64url') !== parts[2]) throw new ContactIdentityError('INVALID_PROTECTED_DATA')
  return Object.freeze({ iv, ciphertext, tag })
}

/**
 * Normalizes a supported contact phone to digits suitable for private identity derivation.
 */
export function normalizeContactPhone(value) {
  if (typeof value !== 'string') throw new TypeError('Contact phone must use supported ASCII formatting')
  const input = value.trim()
  if (!PHONE_FORMAT_PATTERN.test(input)) throw new TypeError('Contact phone must use supported ASCII formatting')
  const digits = input.replaceAll(/[^0-9]/g, '')
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  if (digits.length === 11 && digits.startsWith('7')) return digits
  if (input.startsWith('+') && digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0')) return digits
  throw new TypeError('Contact phone must be a supported international number')
}

/**
 * Masks a canonical phone without retaining enough digits for direct contact.
 */
export function maskContactPhone(value) {
  const phone = canonicalPhone(value)
  return `+${phone[0]} ${'•'.repeat(phone.length - 3)} ${phone.slice(-2)}`
}

/**
 * Derives the shared non-reversible identity used to connect contact events.
 */
export function fingerprintContactPhone({ phone, key }) {
  const normalized = normalizeContactPhone(phone)
  const secret = strongTextKey(key, 'Contact fingerprint key')
  const payload = `${FINGERPRINT_DOMAIN}\0${VERSION}\0${normalized}`
  return `${VERSION}:${createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`
}

/**
 * Seals a normalized patient profile in a versioned AES-256-GCM envelope.
 */
function encryptProfile(profile, key, randomBytes, domain) {
  const secret = encryptionKey(key)
  const iv = initializationVector(randomBytes)
  const cipher = createCipheriv('aes-256-gcm', secret, iv)
  cipher.setAAD(additionalData(domain))
  const ciphertext = Buffer.concat([cipher.update(profileJson(profile), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join('.')
}

export function encryptPatientProfile({ profile, key, randomBytes = secureRandomBytes }) {
  return encryptProfile(normalizePatientProfile(profile), key, randomBytes, PROFILE_DOMAIN)
}

/**
 * Seals an imported root profile whose identity is anchored by external identifiers.
 */
export function encryptImportedPatientProfile({ profile, key, randomBytes = secureRandomBytes }) {
  return encryptProfile(normalizeImportedPatientProfile(profile), key, randomBytes, IMPORTED_PROFILE_DOMAIN)
}

function decryptProfile(secret, encrypted, domain, normalize) {
  const decipher = createDecipheriv('aes-256-gcm', secret, encrypted.iv)
  decipher.setAAD(additionalData(domain))
  decipher.setAuthTag(encrypted.tag)
  const plaintext = Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]).toString('utf8')
  return normalize(JSON.parse(plaintext))
}

function attemptedProfile(secret, encrypted, domain, normalize) {
  try {
    return decryptProfile(secret, encrypted, domain, normalize)
  } catch {
    return null
  }
}

/**
 * Opens and revalidates a patient profile without leaking cryptographic errors.
 */
export function decryptPatientProfile({ envelope, key }) {
  const secret = encryptionKey(key)
  const encrypted = encryptedParts(envelope)
  const operational = attemptedProfile(secret, encrypted, PROFILE_DOMAIN, normalizePatientProfile)
  if (operational !== null) return operational
  const imported = attemptedProfile(secret, encrypted, IMPORTED_PROFILE_DOMAIN, normalizeImportedPatientProfile)
  if (imported !== null) return imported
  throw new ContactIdentityError('DECRYPTION_FAILED')
}

/**
 * Seals a normalized contact phone in a call-specific AES-256-GCM domain.
 */
export function encryptContactPhone({ phone, key, randomBytes = secureRandomBytes }) {
  const value = normalizeContactPhone(phone)
  const secret = encryptionKey(key)
  const iv = initializationVector(randomBytes)
  const cipher = createCipheriv('aes-256-gcm', secret, iv)
  cipher.setAAD(additionalData(PHONE_DOMAIN))
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join('.')
}

/**
 * Opens and revalidates a call phone without leaking cryptographic errors.
 */
export function decryptContactPhone({ envelope, key }) {
  const secret = encryptionKey(key)
  const { iv, ciphertext, tag } = encryptedParts(envelope)
  try {
    const decipher = createDecipheriv('aes-256-gcm', secret, iv)
    decipher.setAAD(additionalData(PHONE_DOMAIN))
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    return canonicalPhone(plaintext)
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith('Contact encryption key')) throw error
    throw new ContactIdentityError('DECRYPTION_FAILED')
  }
}
