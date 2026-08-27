import { createCipheriv, createDecipheriv, createHmac, randomBytes as secureRandomBytes } from 'node:crypto'

const VERSION = 'v1'
const ENCRYPTION_DOMAIN = 'clod.protected-patient-data'
const FINGERPRINT_DOMAIN = 'clod.protected-patient-fingerprint'
const PROTECTED_DOMAINS = Object.freeze(['private_profile', 'contact', 'external_identifier', 'name_history', 'visit_details', 'source_row', 'invoice', 'attachment'])
const BASE64_KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/
const ENVELOPE_PART_PATTERN = /^[A-Za-z0-9_-]+$/
const MAX_JSON_BYTES = 65_536
const MAX_ENVELOPE_LENGTH = 87_425
const MAX_FINGERPRINT_BYTES = 4_096
const MAX_KEY_BYTES = 4_096
const MAX_DEPTH = 64
const MAX_NODES = 20_000
const IV_BYTES = 12
const TAG_BYTES = 16

/**
 * Represents a safe protected-data failure without exposing private values.
 */
export class ProtectedPatientDataError extends Error {
  constructor(code) {
    const decryption = code === 'DECRYPTION_FAILED'
    super(decryption ? 'Protected patient data could not be opened' : 'Protected patient data is invalid')
    this.name = 'ProtectedPatientDataError'
    this.code = decryption ? code : 'INVALID_PROTECTED_DATA'
    Object.freeze(this)
  }
}

function protectedDomain(value) {
  if (typeof value !== 'string' || !PROTECTED_DOMAINS.includes(value)) throw new TypeError('Protected patient data domain is unsupported')
  return value
}

function encryptionKey(value) {
  if (typeof value !== 'string' || !BASE64_KEY_PATTERN.test(value)) throw new TypeError('Patient encryption key must be canonical base64 for 32 bytes')
  const decoded = Buffer.from(value, 'base64')
  if (decoded.byteLength !== 32 || decoded.toString('base64') !== value) throw new TypeError('Patient encryption key must be canonical base64 for 32 bytes')
  return decoded
}

function fingerprintKey(value) {
  if (typeof value !== 'string' || value.trim() !== value) throw new TypeError('Patient fingerprint key must be strong runtime text')
  const bytes = Buffer.from(value, 'utf8')
  if (bytes.byteLength < 32 || bytes.byteLength > MAX_KEY_BYTES || new Set(bytes).size < 8) throw new TypeError('Patient fingerprint key must be strong runtime text')
  return value
}

function validUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return false
      index += 1
    } else if (code >= 0xDC00 && code <= 0xDFFF) return false
  }
  return true
}

function primitive(value) {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string' && validUnicode(value) && Buffer.byteLength(value, 'utf8') <= MAX_JSON_BYTES) return value
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return value
  throw new TypeError('Protected patient data must contain JSON-safe values')
}

function dataDescriptor(descriptor) {
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Protected patient data must contain enumerable data fields only')
  return descriptor.value
}

function plainArray(value, depth, state) {
  if (Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError('Protected patient data arrays must be plain')
  if (value.length > MAX_NODES) throw new TypeError('Protected patient data arrays are too wide')
  const keys = Reflect.ownKeys(value)
  if (keys.length !== value.length + 1 || keys.some((key) => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) throw new TypeError('Protected patient data arrays must be dense')
  const result = Object.setPrototypeOf([], null)
  for (let index = 0; index < value.length; index += 1) result[index] = plainValue(dataDescriptor(Object.getOwnPropertyDescriptor(value, String(index))), depth + 1, state)
  return Object.freeze(result)
}

function plainRecord(value, depth, state) {
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Protected patient data records must be plain')
  const keys = Reflect.ownKeys(value)
  if (keys.length > MAX_NODES) throw new TypeError('Protected patient data records are too wide')
  const result = Object.create(null)
  for (const key of keys) {
    if (typeof key !== 'string' || !validUnicode(key)) throw new TypeError('Protected patient data records must use text keys')
    result[key] = plainValue(dataDescriptor(Object.getOwnPropertyDescriptor(value, key)), depth + 1, state)
  }
  return Object.freeze(result)
}

function plainValue(value, depth, state) {
  if (value === null || typeof value !== 'object') return primitive(value)
  if (depth > MAX_DEPTH || state.nodes >= MAX_NODES || state.ancestors.has(value)) throw new TypeError('Protected patient data structure is invalid')
  state.nodes += 1
  state.ancestors.add(value)
  try {
    return Array.isArray(value) ? plainArray(value, depth, state) : plainRecord(value, depth, state)
  } finally {
    state.ancestors.delete(value)
  }
}

function ordinaryPlainData(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const result = Object.setPrototypeOf([], null)
    for (let index = 0; index < value.length; index += 1) result[index] = ordinaryPlainData(value[index])
    Object.setPrototypeOf(result, Array.prototype)
    return Object.freeze(result)
  }
  const result = Object.create(null)
  for (const key of Reflect.ownKeys(value)) result[key] = ordinaryPlainData(value[key])
  return Object.freeze(result)
}

function encodedPlainData(value) {
  if (value === null || typeof value !== 'object') throw new TypeError('Protected patient data must be a plain record or array')
  let protectedValue
  try {
    protectedValue = plainValue(value, 0, { nodes: 0, ancestors: new WeakSet() })
  } catch {
    throw new TypeError('Protected patient data must be bounded JSON-safe plain data')
  }
  const json = JSON.stringify(protectedValue)
  if (Buffer.byteLength(json, 'utf8') > MAX_JSON_BYTES) throw new TypeError('Protected patient data must be bounded JSON-safe plain data')
  return Object.freeze({ json, value: ordinaryPlainData(protectedValue) })
}

function initializationVector(source) {
  if (typeof source !== 'function') throw new TypeError('Patient encryption random source must be a function')
  let value
  try {
    value = source(IV_BYTES)
  } catch {
    throw new TypeError('Patient encryption random source must return 12 bytes')
  }
  if (!ArrayBuffer.isView(value) || value.BYTES_PER_ELEMENT !== 1 || value.byteLength !== IV_BYTES) throw new TypeError('Patient encryption random source must return 12 bytes')
  return Buffer.from(value)
}

function additionalData(domain) {
  return Buffer.from(`${ENCRYPTION_DOMAIN}\0${VERSION}\0${domain}`, 'utf8')
}

function envelopePart(value, expectedBytes) {
  if (typeof value !== 'string' || !ENVELOPE_PART_PATTERN.test(value)) throw new ProtectedPatientDataError('INVALID_PROTECTED_DATA')
  const decoded = Buffer.from(value, 'base64url')
  if (decoded.byteLength !== expectedBytes || decoded.toString('base64url') !== value) throw new ProtectedPatientDataError('INVALID_PROTECTED_DATA')
  return decoded
}

function encryptedParts(value) {
  if (typeof value !== 'string' || value.length > MAX_ENVELOPE_LENGTH) throw new ProtectedPatientDataError('INVALID_PROTECTED_DATA')
  const parts = value.split('.')
  if (parts.length !== 4 || parts[0] !== VERSION) throw new ProtectedPatientDataError('INVALID_PROTECTED_DATA')
  const iv = envelopePart(parts[1], IV_BYTES)
  const tag = envelopePart(parts[3], TAG_BYTES)
  if (!ENVELOPE_PART_PATTERN.test(parts[2])) throw new ProtectedPatientDataError('INVALID_PROTECTED_DATA')
  const ciphertext = Buffer.from(parts[2], 'base64url')
  if (ciphertext.byteLength < 2 || ciphertext.byteLength > MAX_JSON_BYTES || ciphertext.toString('base64url') !== parts[2]) throw new ProtectedPatientDataError('INVALID_PROTECTED_DATA')
  return Object.freeze({ iv, ciphertext, tag })
}

function privateFingerprintValue(value) {
  if (typeof value !== 'string' || value.length === 0 || !validUnicode(value) || Buffer.byteLength(value, 'utf8') > MAX_FINGERPRINT_BYTES) throw new TypeError('Patient fingerprint value must be bounded text')
  return value
}

/**
 * Seals JSON-safe private data in a domain-separated AES-256-GCM envelope.
 */
export function encryptProtectedData({ domain, value, key, randomBytes = secureRandomBytes }) {
  const scope = protectedDomain(domain)
  const secret = encryptionKey(key)
  const iv = initializationVector(randomBytes)
  const payload = encodedPlainData(value).json
  const cipher = createCipheriv('aes-256-gcm', secret, iv)
  cipher.setAAD(additionalData(scope))
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.')
}

/**
 * Opens and revalidates domain-separated private data with safe failure details.
 */
export function decryptProtectedData({ domain, envelope, key }) {
  const scope = protectedDomain(domain)
  const secret = encryptionKey(key)
  const { iv, ciphertext, tag } = encryptedParts(envelope)
  try {
    const decipher = createDecipheriv('aes-256-gcm', secret, iv)
    decipher.setAAD(additionalData(scope))
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    return encodedPlainData(JSON.parse(plaintext)).value
  } catch {
    throw new ProtectedPatientDataError('DECRYPTION_FAILED')
  }
}

/**
 * Derives a stable domain-separated HMAC identity for a normalized private value.
 */
export function fingerprintProtectedValue({ domain, value, key }) {
  const scope = protectedDomain(domain)
  const secret = fingerprintKey(key)
  const normalized = privateFingerprintValue(value)
  const payload = `${FINGERPRINT_DOMAIN}\0${VERSION}\0${scope}\0${normalized}`
  return `${VERSION}:${createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`
}
