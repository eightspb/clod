import { createHmac } from 'node:crypto'

const VERSION = 'v1'
const IDENTITY_DOMAIN = 'clod.clinic-import-identity'
const VISIT_DOMAIN = 'clod.clinic-import-visit'
const DOMAIN_PATTERN = /^[a-z][a-z0-9:_-]{0,127}$/

function inputFrom(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Clinic import fingerprint input is invalid')
  const prototype = Object.getPrototypeOf(value)
  const keys = Reflect.ownKeys(value)
  if ((prototype !== Object.prototype && prototype !== null) || keys.length !== 3 || !['domain', 'key', 'value'].every((key) => keys.includes(key))) throw new TypeError('Clinic import fingerprint input is invalid')
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (typeof key !== 'string' || !descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Clinic import fingerprint input is invalid')
    output[key] = descriptor.value
  }
  if (typeof output.key !== 'string' || typeof output.domain !== 'string' || !DOMAIN_PATTERN.test(output.domain)) throw new TypeError('Clinic import fingerprint input is invalid')
  return Object.freeze(output)
}

function fingerprint(key, payload) {
  return `${VERSION}:${createHmac('sha256', key).update(payload, 'utf8').digest('hex')}`
}

export function fingerprintClinicImportIdentity(value) {
  const input = inputFrom(value)
  return fingerprint(input.key, JSON.stringify([IDENTITY_DOMAIN, VERSION, input.domain, input.value]))
}

export function fingerprintClinicImportVisit(value) {
  const input = inputFrom(value)
  const payload = [VISIT_DOMAIN, VERSION, input.domain, input.value].map((part) => `${Buffer.byteLength(String(part), 'utf8')}:${String(part)}`).join('|')
  return fingerprint(input.key, payload)
}
