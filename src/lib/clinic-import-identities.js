import { createHmac } from 'node:crypto'
import { maskContactPhone } from './contact-identity.js'
import { normalizeClinicCard, normalizeImportEmail, normalizeImportPhone, normalizeImportText, normalizeMedeskEhr, normalizePassportDigits, normalizeUtcDatePrefix, sourceReference } from './clinic-import-normalization.js'

const VERSION = 'v1'
const HMAC_DOMAIN = 'clod.clinic-import-identity'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const PATIENT_KEYS = Object.freeze(['clinicCard', 'consents', 'contacts', 'ehr', 'identifiers', 'observedAt', 'privateData', 'profile', 'source', 'sourcePriority'])
const PROFILE_KEYS = Object.freeze(['birthDate', 'firstName', 'gender', 'lastName', 'middleName'])
const IDENTIFIER_KEYS = Object.freeze(['contract', 'inn', 'passport', 'snils'])
const CONTACT_KEYS = Object.freeze(['isPrimary', 'kind', 'value'])
const CONSENT_KEYS = Object.freeze(['observedAt', 'status', 'type'])
const VISIT_KEYS = Object.freeze(['ehr', 'profile', 'source'])
const VISIT_PROFILE_KEYS = Object.freeze(['birthDate', 'firstName', 'lastName', 'middleName'])
const ISSUE_CODES = new Set(['COMPONENT_IDENTITY_CONFLICT', 'CONFLICTING_STRONG_IDENTIFIER', 'INCOMPLETE_PATIENT_NAME', 'INSUFFICIENT_IDENTITY_EVIDENCE', 'SHARED_CARD_DIFFERENT_PEOPLE', 'SUPPLEMENTAL_EHR_AMBIGUOUS', 'SUPPLEMENTAL_EHR_NOT_FOUND', 'SUPPLEMENTAL_NAME_ONLY_MATCH'])
const IDENTITY_ERROR_CODES = new Set(['IDENTITY_INVARIANT_FAILED', 'INPUT_TOO_COMPLEX', 'INVALID_IDENTITY_INPUT'])
const IDENTITY_ERRORS = new WeakSet()
const PRIVATE_MAGIC_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const PRIVATE_CONTROL_PATTERN = /[\p{Cc}\p{Cf}]/u
const MAX_PATIENT_ROWS = 20_000
const MAX_MEDESK_ROWS = 20_000
const MAX_VISIT_REFERENCES = 100_000
const MAX_CONTACTS = 32
const MAX_CONSENTS = 32
const MAX_SUSPICIOUS_BUCKET = 256
const MAX_EVIDENCE_PAIRS = 250_000
const MAX_PRIVATE_DEPTH = 8
const MAX_PRIVATE_NODES = 10_000
const MAX_PRIVATE_WIDTH = 1_024
const MAX_PRIVATE_TEXT_UTF16 = 8_192
const MAX_PRIVATE_TEXT_CODE_POINTS = 4_096
const MAX_PRIVATE_JSON_BYTES = 65_536

/** Represents an identity-resolution failure without retaining rejected patient data. */
export class ClinicImportIdentityError extends Error {
  constructor(code = 'INVALID_IDENTITY_INPUT') {
    super('Clinic import identity input is invalid')
    this.name = 'ClinicImportIdentityError'
    this.code = IDENTITY_ERROR_CODES.has(code) ? code : 'INVALID_IDENTITY_INPUT'
    IDENTITY_ERRORS.add(this)
    Object.freeze(this)
  }
}

function invalid(code = 'INVALID_IDENTITY_INPUT') {
  throw new ClinicImportIdentityError(code)
}

function sameKeys(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index])
}

function record(value, expected) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid()
  const keys = Reflect.ownKeys(value)
  if (keys.some((key) => typeof key !== 'string')) invalid()
  keys.sort()
  if (!sameKeys(keys, [...expected].sort())) invalid()
  const result = {}
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result[key] = descriptor.value
  }
  return Object.freeze(result)
}

function array(value, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) invalid()
  const length = value.length
  if (!Number.isSafeInteger(length) || length > maximum) invalid('INPUT_TOO_COMPLEX')
  const keys = Reflect.ownKeys(value)
  if (keys.length !== length + 1 || !keys.includes('length')) invalid()
  const result = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result.push(descriptor.value)
  }
  return Object.freeze(result)
}

function normalizedText(value) {
  if (value === null) return null
  const normalized = normalizeImportText(value)
  if (normalized === null || normalized !== value) invalid()
  return normalized
}

function timestamp(value) {
  if (typeof value !== 'string') invalid()
  const instant = new Date(value)
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== value) invalid()
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

function privateText(value) {
  if (value.length > MAX_PRIVATE_TEXT_UTF16 || [...value].length > MAX_PRIVATE_TEXT_CODE_POINTS || !validUnicode(value) || PRIVATE_CONTROL_PATTERN.test(value)) invalid()
  return value
}

function privateArray(value, depth, ancestors, state) {
  if (Object.getPrototypeOf(value) !== Array.prototype || value.length > MAX_PRIVATE_WIDTH) invalid()
  const keys = Reflect.ownKeys(value)
  if (keys.length !== value.length + 1 || !keys.includes('length')) invalid()
  const result = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result.push(privateValue(descriptor.value, depth + 1, ancestors, state))
  }
  return Object.freeze(result)
}

function privateRecord(value, depth, ancestors, state) {
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid()
  const keys = Reflect.ownKeys(value)
  if (keys.length > MAX_PRIVATE_WIDTH || keys.some((key) => typeof key !== 'string' || PRIVATE_MAGIC_KEYS.has(key))) invalid()
  const result = {}
  for (const key of [...keys].sort()) {
    privateText(key)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    Object.defineProperty(result, key, { configurable: false, enumerable: true, value: privateValue(descriptor.value, depth + 1, ancestors, state), writable: false })
  }
  return Object.freeze(result)
}

function privateValue(value, depth = 0, ancestors = new WeakSet(), state = { nodes: 0 }) {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string') return privateText(value)
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return value
  if (typeof value !== 'object' || depth > MAX_PRIVATE_DEPTH || state.nodes >= MAX_PRIVATE_NODES || ancestors.has(value)) invalid()
  state.nodes += 1
  ancestors.add(value)
  try {
    return Array.isArray(value) ? privateArray(value, depth, ancestors, state) : privateRecord(value, depth, ancestors, state)
  } finally {
    ancestors.delete(value)
  }
}

function privateData(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const result = privateValue(value)
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > MAX_PRIVATE_JSON_BYTES) invalid()
  return result
}

function normalizedProfile(value) {
  const input = record(value, PROFILE_KEYS)
  const birthDate = input.birthDate === null ? null : normalizeUtcDatePrefix(input.birthDate)
  if (birthDate !== input.birthDate) invalid()
  const gender = input.gender
  if (gender !== null && gender !== 'female' && gender !== 'male') invalid()
  return Object.freeze({ lastName: normalizedText(input.lastName), firstName: normalizedText(input.firstName), middleName: normalizedText(input.middleName), birthDate, gender })
}

function normalizedContact(value) {
  const input = record(value, CONTACT_KEYS)
  if (input.kind !== 'phone' && input.kind !== 'email') invalid()
  if (typeof input.isPrimary !== 'boolean') invalid()
  const normalized = input.kind === 'phone' ? normalizeImportPhone(input.value) : normalizeImportEmail(input.value)
  if (normalized === null || normalized !== input.value) invalid()
  return Object.freeze({ kind: input.kind, value: normalized, isPrimary: input.isPrimary })
}

function normalizedIdentifiers(value) {
  const input = record(value, IDENTIFIER_KEYS)
  const passport = input.passport === null ? null : normalizePassportDigits(input.passport)
  if (passport !== input.passport) invalid()
  return Object.freeze({ inn: normalizedText(input.inn), snils: normalizedText(input.snils), passport, contract: normalizedText(input.contract) })
}

function normalizedConsent(value) {
  const input = record(value, CONSENT_KEYS)
  if (input.type !== 'sms_notifications' || !['granted', 'not_granted', 'unknown'].includes(input.status)) invalid()
  return Object.freeze({ type: input.type, status: input.status, observedAt: timestamp(input.observedAt) })
}

function sourceKey(value) {
  return canonical(['source', value.sourceName, value.sourceRow])
}

function canonical(value) {
  return JSON.stringify(value)
}

function normalizedPatientRow(value, kind) {
  const input = record(value, PATIENT_KEYS)
  const source = sourceReference(input.source)
  const ehr = normalizeMedeskEhr(input.ehr)
  const clinicCard = normalizeClinicCard(input.clinicCard)
  if (ehr !== input.ehr || clinicCard !== input.clinicCard) invalid()
  if (!Number.isSafeInteger(input.sourcePriority) || input.sourcePriority < 0) invalid()
  return Object.freeze({ source, token: sourceKey(source), kind, ehr, clinicCard, profile: normalizedProfile(input.profile), contacts: Object.freeze(array(input.contacts, MAX_CONTACTS).map(normalizedContact)), identifiers: normalizedIdentifiers(input.identifiers), privateData: privateData(input.privateData), consents: Object.freeze(array(input.consents, MAX_CONSENTS).map(normalizedConsent)), observedAt: timestamp(input.observedAt), sourcePriority: input.sourcePriority })
}

function normalizedVisitProfile(value) {
  const input = record(value, VISIT_PROFILE_KEYS)
  const birthDate = input.birthDate === null ? null : normalizeUtcDatePrefix(input.birthDate)
  if (birthDate !== input.birthDate) invalid()
  return Object.freeze({ lastName: normalizedText(input.lastName), firstName: normalizedText(input.firstName), middleName: normalizedText(input.middleName), birthDate, gender: null })
}

function normalizedVisit(value) {
  const input = record(value, VISIT_KEYS)
  const ehr = normalizeMedeskEhr(input.ehr)
  if (ehr !== input.ehr) invalid()
  return Object.freeze({ source: sourceReference(input.source), ehr, profile: normalizedVisitProfile(input.profile) })
}

function key(value) {
  return value === null ? null : value.toLocaleLowerCase('ru-RU')
}

function fullName(row) {
  const { lastName, firstName, middleName } = row.profile
  if (lastName === null || firstName === null || middleName === null) return null
  return `${key(lastName)}\0${key(firstName)}\0${key(middleName)}`
}

function givenName(row) {
  const { firstName, middleName } = row.profile
  if (firstName === null || middleName === null) return null
  return `${key(firstName)}\0${key(middleName)}`
}

function different(first, second) {
  return first !== null && second !== null && first !== second
}

function conflicts(first, second) {
  return different(first.identifiers.inn, second.identifiers.inn) || different(first.identifiers.snils, second.identifiers.snils)
}

function intersects(first, second) {
  const values = new Set(first.map(({ kind, value }) => `${kind}\0${value}`))
  return second.some(({ kind, value }) => values.has(`${kind}\0${value}`))
}

function independentMatch(first, second) {
  return intersects(first.contacts, second.contacts) || ['passport', 'contract'].some((field) => first.identifiers[field] !== null && first.identifiers[field] === second.identifiers[field])
}

function chronological(first, second) {
  return first.observedAt !== second.observedAt
}

function sameCard(first, second) {
  return first.clinicCard !== null && first.clinicCard === second.clinicCard
}

function mergeEvidence(first, second) {
  if (conflicts(first, second)) return Object.freeze({ merge: false, code: 'CONFLICTING_STRONG_IDENTIFIER', reason: null })
  const sameFullName = fullName(first) !== null && fullName(first) === fullName(second)
  const sameGivenName = givenName(first) !== null && givenName(first) === givenName(second)
  const sameBirthDate = first.profile.birthDate !== null && first.profile.birthDate === second.profile.birthDate
  const oneBirthDateMissing = (first.profile.birthDate === null) !== (second.profile.birthDate === null)
  const surnameChanged = sameGivenName && first.profile.lastName !== null && second.profile.lastName !== null && key(first.profile.lastName) !== key(second.profile.lastName)
  if (first.ehr !== null && first.ehr === second.ehr) return Object.freeze({ merge: true, code: null, reason: 'exactEhr' })
  if (sameFullName && sameBirthDate) return Object.freeze({ merge: true, code: null, reason: 'sameFioBirthDate' })
  if (surnameChanged && sameBirthDate && sameCard(first, second) && chronological(first, second)) return Object.freeze({ merge: true, code: null, reason: 'surnameChange' })
  if (sameFullName && oneBirthDateMissing && independentMatch(first, second)) return Object.freeze({ merge: true, code: null, reason: 'sameFioMissingBirthDate' })
  if (surnameChanged && oneBirthDateMissing && independentMatch(first, second) && chronological(first, second)) return Object.freeze({ merge: true, code: null, reason: 'surnameChangeMissingBirthDate' })
  if (sameCard(first, second) && (!sameGivenName || (first.profile.birthDate !== null && second.profile.birthDate !== null && !sameBirthDate))) return Object.freeze({ merge: false, code: 'SHARED_CARD_DIFFERENT_PEOPLE', reason: null })
  if (sameFullName || sameGivenName || sameCard(first, second)) return Object.freeze({ merge: false, code: 'INSUFFICIENT_IDENTITY_EVIDENCE', reason: null })
  return Object.freeze({ merge: false, code: null, reason: null })
}

function addIndex(index, name, rowIndex) {
  if (name === null) return
  const values = index.get(name) ?? []
  values.push(rowIndex)
  index.set(name, values)
}

function evidenceKeys(row) {
  const values = []
  const full = fullName(row)
  const given = givenName(row)
  if (row.ehr !== null) values.push(canonical(['ehr', row.ehr]))
  if (full !== null) values.push(canonical(['full-name', full]))
  if (row.clinicCard !== null) values.push(canonical(['clinic-card', row.clinicCard]))
  if (given !== null && row.profile.birthDate !== null && row.clinicCard !== null) values.push(canonical(['surname-birth-card', given, row.profile.birthDate, row.clinicCard]))
  if (given !== null) {
    for (const contact of row.contacts) values.push(canonical(['surname-contact', given, contact.kind, contact.value]))
    for (const field of ['passport', 'contract']) if (row.identifiers[field] !== null) values.push(canonical(['surname-identifier', given, field, row.identifiers[field]]))
  }
  return new Set(values)
}

function candidatePairs(rows) {
  const index = new Map()
  rows.forEach((row, rowIndex) => { for (const evidenceKey of evidenceKeys(row)) addIndex(index, evidenceKey, rowIndex) })
  const pairs = new Set()
  let operations = 0
  for (const values of index.values()) {
    if (values.length > MAX_SUSPICIOUS_BUCKET) invalid('INPUT_TOO_COMPLEX')
    operations += values.length * (values.length - 1) / 2
    if (operations > MAX_EVIDENCE_PAIRS) invalid('INPUT_TOO_COMPLEX')
    for (let first = 0; first < values.length; first += 1) for (let second = first + 1; second < values.length; second += 1) {
      pairs.add(values[first] * rows.length + values[second])
      if (pairs.size > MAX_EVIDENCE_PAIRS) invalid('INPUT_TOO_COMPLEX')
    }
  }
  return [...pairs].map((pair) => [Math.floor(pair / rows.length), pair % rows.length])
}

function evaluatedPairs(rows) {
  return candidatePairs(rows).map(([firstIndex, secondIndex]) => {
    const first = rows[firstIndex]
    const second = rows[secondIndex]
    const rowKey = canonical([first.token, second.token].sort())
    return Object.freeze({ firstIndex, secondIndex, rowKey, ...mergeEvidence(first, second) })
  }).sort((first, second) => Number(second.reason === 'exactEhr') - Number(first.reason === 'exactEhr') || first.rowKey.localeCompare(second.rowKey))
}

function unionMetadata(row) {
  return { birthDate: row.profile.birthDate, inn: row.identifiers.inn, snils: row.identifiers.snils }
}

function mergeMetadata(first, second) {
  for (const field of ['birthDate', 'inn', 'snils']) if (different(first[field], second[field])) return null
  return { birthDate: first.birthDate ?? second.birthDate, inn: first.inn ?? second.inn, snils: first.snils ?? second.snils }
}

function unionFind(rows) {
  const parents = Array.from({ length: rows.length }, (_, index) => index)
  const metadata = rows.map(unionMetadata)
  const find = (value) => {
    let root = value
    while (parents[root] !== root) root = parents[root]
    while (parents[value] !== value) {
      const parent = parents[value]
      parents[value] = root
      value = parent
    }
    return root
  }
  const join = (first, second) => {
    const firstRoot = find(first)
    const secondRoot = find(second)
    if (firstRoot === secondRoot) return 'same'
    const merged = mergeMetadata(metadata[firstRoot], metadata[secondRoot])
    if (merged === null) return 'conflict'
    const [parent, child] = firstRoot < secondRoot ? [firstRoot, secondRoot] : [secondRoot, firstRoot]
    parents[child] = parent
    metadata[parent] = merged
    return 'joined'
  }
  return Object.freeze({ find, join })
}

function distinctValues(rows, selector) {
  return new Set(rows.map(selector).filter((value) => value !== null)).size
}

function compatible(rows) {
  return distinctValues(rows, (row) => row.profile.birthDate) <= 1 && distinctValues(rows, (row) => row.identifiers.inn) <= 1 && distinctValues(rows, (row) => row.identifiers.snils) <= 1
}

function validateExactEhr(rows) {
  const groups = new Map()
  for (const row of rows) addIndex(groups, row.ehr, row)
  for (const values of groups.values()) if (!compatible(values)) invalid('IDENTITY_INVARIANT_FAILED')
}

function componentIndexes(rows, union) {
  const grouped = new Map()
  rows.forEach((_row, index) => {
    const root = union.find(index)
    const values = grouped.get(root) ?? []
    values.push(index)
    grouped.set(root, values)
  })
  return grouped
}

function resolvedComponents(rows, decisions, counts) {
  const union = unionFind(rows)
  const issues = []
  for (const decision of decisions) {
    if (!decision.merge) {
      if (decision.code !== null) issues.push(decision)
      continue
    }
    const joined = union.join(decision.firstIndex, decision.secondIndex)
    if (joined === 'conflict') {
      issues.push(Object.freeze({ ...decision, merge: false, code: 'COMPONENT_IDENTITY_CONFLICT', reason: null }))
      continue
    }
    if (joined === 'joined') counts[decision.reason] += 1
  }
  return Object.freeze({ union, issues: Object.freeze(issues) })
}

function hmac(keyValue, domain, value) {
  return createHmac('sha256', keyValue).update(canonical([HMAC_DOMAIN, VERSION, domain, value]), 'utf8').digest()
}

function fingerprint(keyValue, domain, value) {
  return `${VERSION}:${hmac(keyValue, domain, value).toString('hex')}`
}

function uuid(keyValue, domain, value) {
  const bytes = Buffer.from(hmac(keyValue, domain, value).subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  const result = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  if (!UUID_PATTERN.test(result)) invalid('IDENTITY_INVARIANT_FAILED')
  return result
}

function fingerprintKey(value) {
  if (typeof value !== 'string' || value.trim() !== value) invalid()
  const bytes = Buffer.from(value, 'utf8')
  if (bytes.byteLength < 32 || bytes.byteLength > 4_096 || new Set(bytes).size < 8) invalid()
  return value
}

function newest(first, second) {
  const time = second.observedAt.localeCompare(first.observedAt)
  if (time !== 0) return time
  if (first.sourcePriority !== second.sourcePriority) return first.sourcePriority - second.sourcePriority
  if (first.source.sourceRow !== second.source.sourceRow) return second.source.sourceRow - first.source.sourceRow
  return first.token.localeCompare(second.token)
}

function trusted(first, second) {
  if (first.sourcePriority !== second.sourcePriority) return first.sourcePriority - second.sourcePriority
  return newest(first, second)
}

function patientId(keyValue, rows) {
  return uuid(keyValue, 'patient', rows.map(({ token }) => token).sort())
}

function contactMask(contact) {
  if (contact.kind === 'phone') return maskContactPhone(contact.value)
  const separator = contact.value.lastIndexOf('@')
  return `${contact.value[0]}•••${contact.value.slice(separator)}`
}

function rowPhone(row) {
  return (row.contacts.find((contact) => contact.kind === 'phone' && contact.isPrimary) ?? row.contacts.find((contact) => contact.kind === 'phone'))?.value ?? null
}

function profileFrom(rows) {
  const canonical = [...rows].sort(newest)[0]
  const fallback = rows.filter((row) => row !== canonical).sort(trusted)
  const field = (name) => canonical.profile[name] ?? fallback.find((row) => row.profile[name] !== null)?.profile[name] ?? null
  return Object.freeze({ lastName: field('lastName'), firstName: field('firstName'), middleName: field('middleName'), birthDate: field('birthDate'), gender: field('gender'), primaryPhone: rowPhone(canonical) ?? fallback.map(rowPhone).find((value) => value !== null) ?? null })
}

function mergedPrivateData(rows) {
  const result = {}
  for (const row of [...rows].sort((first, second) => newest(second, first))) for (const [field, value] of Object.entries(row.privateData)) result[field] = value
  return privateData(result)
}

function sourceList(rows) {
  return Object.freeze([...rows].sort((first, second) => first.token.localeCompare(second.token)).map(({ source }) => source))
}

function componentFrom(rows, keyValue, isSupplemental) {
  const sorted = [...rows].sort((first, second) => first.token.localeCompare(second.token))
  const id = patientId(keyValue, sorted)
  const observed = sorted.map(({ observedAt }) => observedAt).sort()
  return Object.freeze({ id, rows: Object.freeze(sorted), patient: Object.freeze({ id, profile: profileFrom(sorted), firstSeenAt: observed[0], lastSeenAt: observed.at(-1), isSupplemental }) })
}

function externalIdentifiersFrom(component, keyValue) {
  const values = new Map()
  for (const row of component.rows) {
    if (row.ehr !== null) values.set(`medesk_ehr\0${row.ehr}`, { system: 'medesk_ehr', value: row.ehr })
    if (row.clinicCard !== null) values.set(`clinic_card\0${row.clinicCard}`, { system: 'clinic_card', value: row.clinicCard })
  }
  return [...values.values()].sort((first, second) => `${first.system}:${first.value}`.localeCompare(`${second.system}:${second.value}`)).map(({ system, value }) => {
    const valueFingerprint = fingerprint(keyValue, `external:${system}`, value)
    const matching = component.rows.filter((row) => (system === 'medesk_ehr' ? row.ehr : row.clinicCard) === value)
    return Object.freeze({ id: uuid(keyValue, 'external-id', [component.id, system, valueFingerprint]), patientId: component.id, system, value, fingerprint: valueFingerprint, globalFingerprint: system === 'medesk_ehr' ? fingerprint(keyValue, 'external-global:medesk_ehr', value) : null, identityKey: fingerprint(keyValue, 'external-identity', [component.id, system, value]), isPrimary: matching.includes([...component.rows].sort(newest)[0]), source: matching.sort((first, second) => first.token.localeCompare(second.token))[0].source, sources: sourceList(matching) })
  })
}

function contactsFrom(component, keyValue) {
  const grouped = new Map()
  for (const row of component.rows) for (const contact of row.contacts) {
    const contactKey = `${contact.kind}\0${contact.value}`
    const entry = grouped.get(contactKey) ?? { contact, rows: [] }
    entry.rows.push(row)
    if (contact.isPrimary) entry.contact = contact
    grouped.set(contactKey, entry)
  }
  return [...grouped.values()].sort((first, second) => `${first.contact.kind}:${first.contact.value}`.localeCompare(`${second.contact.kind}:${second.contact.value}`)).map(({ contact, rows }) => {
    const valueFingerprint = fingerprint(keyValue, `contact:${contact.kind}`, contact.value)
    const observed = rows.map(({ observedAt }) => observedAt).sort()
    return Object.freeze({ id: uuid(keyValue, 'contact-id', [component.id, contact.kind, valueFingerprint]), patientId: component.id, kind: contact.kind, value: contact.value, fingerprint: valueFingerprint, mask: contactMask(contact), isPrimary: contact.isPrimary || component.patient.profile.primaryPhone === contact.value, source: rows.sort((first, second) => first.token.localeCompare(second.token))[0].source, sources: sourceList(rows), firstSeenAt: observed[0], lastSeenAt: observed.at(-1) })
  })
}

function changedSurnames(component, surnameDecisions, keyValue) {
  const current = component.patient.profile.lastName
  const candidates = new Map()
  for (const decision of surnameDecisions) for (const index of [decision.firstIndex, decision.secondIndex]) {
    const row = decision.rows[index]
    const surname = key(row.profile.lastName)
    const existing = candidates.get(surname)
    if (surname !== null && surname !== key(current) && (existing === undefined || `${row.observedAt}:${row.token}` < `${existing.observedAt}:${existing.token}`)) candidates.set(surname, row)
  }
  return [...candidates.values()].sort((first, second) => first.observedAt.localeCompare(second.observedAt)).map((row) => Object.freeze({ id: uuid(keyValue, 'name-history-id', [component.id, key(row.profile.lastName)]), patientId: component.id, lastName: row.profile.lastName, source: row.source, sourceIdentifier: row.ehr, observedAt: row.observedAt, reason: 'surname_change' }))
}

function consentsFrom(component, keyValue) {
  const values = []
  for (const row of component.rows) for (const consent of row.consents) values.push(Object.freeze({ id: uuid(keyValue, 'consent-id', [component.id, consent.type, consent.observedAt, row.token]), patientId: component.id, type: consent.type, status: consent.status, observedAt: consent.observedAt, source: row.source }))
  return values.sort((first, second) => `${first.observedAt}:${first.id}`.localeCompare(`${second.observedAt}:${second.id}`))
}

function issueId(keyValue, code, source, candidates) {
  return uuid(keyValue, 'issue-id', [code, sourceKey(source), candidates])
}

function issueFrom(keyValue, code, source, candidates = []) {
  if (!ISSUE_CODES.has(code)) invalid('IDENTITY_INVARIANT_FAILED')
  const candidatePatientIds = Object.freeze([...new Set(candidates)].sort())
  return Object.freeze({ id: issueId(keyValue, code, source, candidatePatientIds), code, source, candidatePatientIds })
}

function supplementalComponents(primaryRows, medeskRows, visits, keyValue, issues, counts) {
  const known = new Set(primaryRows.map(({ ehr }) => ehr).filter((value) => value !== null))
  const exact = new Map()
  for (const row of medeskRows) addIndex(exact, row.ehr, row)
  const medeskNames = new Set(medeskRows.map(fullName).filter((value) => value !== null))
  const components = new Map()
  for (const visit of [...visits].sort((first, second) => sourceKey(first.source).localeCompare(sourceKey(second.source)))) {
    if (visit.ehr !== null && known.has(visit.ehr)) continue
    if (visit.ehr !== null) {
      const matches = exact.get(visit.ehr) ?? []
      if (matches.length === 1) {
        if (!components.has(visit.ehr)) {
          components.set(visit.ehr, componentFrom(matches, keyValue, true))
          counts.supplementalPatients += 1
        }
        continue
      }
      const visitName = fullName({ profile: visit.profile })
      const code = matches.length > 1 ? 'SUPPLEMENTAL_EHR_AMBIGUOUS' : (visitName !== null && medeskNames.has(visitName) ? 'SUPPLEMENTAL_NAME_ONLY_MATCH' : 'SUPPLEMENTAL_EHR_NOT_FOUND')
      issues.push(issueFrom(keyValue, code, visit.source))
      counts.supplementalIssues += 1
      continue
    }
    const visitName = fullName({ profile: visit.profile })
    if (visitName !== null && medeskNames.has(visitName)) {
      issues.push(issueFrom(keyValue, 'SUPPLEMENTAL_NAME_ONLY_MATCH', visit.source))
      counts.supplementalIssues += 1
    }
  }
  return [...components.values()]
}

function normalizedInput(value) {
  const input = record(value, ['fingerprintKey', 'medeskRows', 'patientRows', 'visitReferences'])
  const keyValue = fingerprintKey(input.fingerprintKey)
  const patientRows = Object.freeze(array(input.patientRows, MAX_PATIENT_ROWS).map((row) => normalizedPatientRow(row, 'primary')))
  const medeskRows = Object.freeze(array(input.medeskRows, MAX_MEDESK_ROWS).map((row) => normalizedPatientRow(row, 'medesk')))
  const visits = Object.freeze(array(input.visitReferences, MAX_VISIT_REFERENCES).map(normalizedVisit))
  const tokens = patientRows.map(({ token }) => token)
  if (new Set(tokens).size !== tokens.length) invalid()
  validateExactEhr(patientRows)
  return Object.freeze({ keyValue, patientRows, medeskRows, visits })
}

function frozenArray(values) {
  return Object.freeze(values)
}

function sortedUnique(values) {
  const sorted = [...values].sort((first, second) => first.id.localeCompare(second.id))
  if (new Set(sorted.map(({ id }) => id)).size !== sorted.length) invalid('IDENTITY_INVARIANT_FAILED')
  return frozenArray(sorted)
}

function validateGlobalIdentifiers(values) {
  const owners = new Map()
  for (const value of values) if (value.globalFingerprint !== null) {
    const owner = owners.get(value.globalFingerprint)
    if (owner !== undefined && owner !== value.patientId) invalid('IDENTITY_INVARIANT_FAILED')
    owners.set(value.globalFingerprint, value.patientId)
  }
}

function buildResult(input) {
  const counts = { exactEhr: 0, sameFioBirthDate: 0, surnameChange: 0, sameFioMissingBirthDate: 0, surnameChangeMissingBirthDate: 0, componentConflicts: 0, conflictingStrongIdentifiers: 0, insufficientEvidence: 0, sharedCardDifferentPeople: 0, supplementalPatients: 0, supplementalIssues: 0 }
  const decisions = evaluatedPairs(input.patientRows)
  const resolved = resolvedComponents(input.patientRows, decisions, counts)
  const grouped = componentIndexes(input.patientRows, resolved.union)
  const primaryComponents = [...grouped.values()].map((indexes) => componentFrom(indexes.map((index) => input.patientRows[index]), input.keyValue, false))
  const rowPatients = new Map()
  for (const component of primaryComponents) for (const row of component.rows) rowPatients.set(row.token, component.id)
  const issueMap = new Map()
  for (const decision of resolved.issues) {
    if (resolved.union.find(decision.firstIndex) === resolved.union.find(decision.secondIndex)) continue
    counts[decision.code === 'COMPONENT_IDENTITY_CONFLICT' ? 'componentConflicts' : decision.code === 'CONFLICTING_STRONG_IDENTIFIER' ? 'conflictingStrongIdentifiers' : decision.code === 'INSUFFICIENT_IDENTITY_EVIDENCE' ? 'insufficientEvidence' : 'sharedCardDifferentPeople'] += 1
    const candidates = [rowPatients.get(input.patientRows[decision.firstIndex].token), rowPatients.get(input.patientRows[decision.secondIndex].token)].sort()
    const source = [input.patientRows[decision.firstIndex], input.patientRows[decision.secondIndex]].sort((first, second) => first.token.localeCompare(second.token))[0].source
    const dedupe = canonical([decision.code, candidates])
    if (!issueMap.has(dedupe)) issueMap.set(dedupe, issueFrom(input.keyValue, decision.code, source, candidates))
  }
  for (const component of primaryComponents) if ([component.patient.profile.lastName, component.patient.profile.firstName, component.patient.profile.middleName].some((value) => value === null)) issueMap.set(`INCOMPLETE\0${component.id}`, issueFrom(input.keyValue, 'INCOMPLETE_PATIENT_NAME', component.rows[0].source, [component.id]))
  const supplementalIssues = []
  const supplemental = supplementalComponents(input.patientRows, input.medeskRows, input.visits, input.keyValue, supplementalIssues, counts)
  const components = [...primaryComponents, ...supplemental].sort((first, second) => first.id.localeCompare(second.id))
  const externalIdentifiers = components.flatMap((component) => externalIdentifiersFrom(component, input.keyValue))
  const contacts = components.flatMap((component) => contactsFrom(component, input.keyValue))
  const surnameReasons = decisions.filter(({ merge, reason }) => merge && ['surnameChange', 'surnameChangeMissingBirthDate'].includes(reason)).map((decision) => Object.freeze({ ...decision, rows: input.patientRows }))
  const nameHistory = primaryComponents.flatMap((component) => changedSurnames(component, surnameReasons.filter((decision) => component.rows.some((row) => row.token === input.patientRows[decision.firstIndex].token) && component.rows.some((row) => row.token === input.patientRows[decision.secondIndex].token)), input.keyValue))
  const privateData = components.map((component) => Object.freeze({ id: uuid(input.keyValue, 'private-data-id', component.id), patientId: component.id, value: mergedPrivateData(component.rows), sources: sourceList(component.rows) }))
  const consents = components.flatMap((component) => consentsFrom(component, input.keyValue))
  const sourceLinks = components.flatMap((component) => component.rows.map((row) => Object.freeze({ id: uuid(input.keyValue, 'source-link-id', [component.id, row.token]), patientId: component.id, source: row.source, kind: component.patient.isSupplemental ? 'medesk_supplemental' : 'patient' })))
  const issues = [...issueMap.values(), ...supplementalIssues]
  validateGlobalIdentifiers(externalIdentifiers)
  return Object.freeze({ patients: sortedUnique(components.map(({ patient }) => patient)), externalIdentifiers: sortedUnique(externalIdentifiers), contacts: sortedUnique(contacts), nameHistory: sortedUnique(nameHistory), privateData: sortedUnique(privateData), consents: sortedUnique(consents), sourceLinks: sortedUnique(sourceLinks), issues: sortedUnique(issues), evidenceCounts: Object.freeze(counts) })
}

/** Resolves normalized clinic rows into deterministic immutable patient identity components. */
export function resolveClinicImportIdentities(value) {
  try {
    return buildResult(normalizedInput(value))
  } catch (error) {
    if (IDENTITY_ERRORS.has(error)) throw error
    throw new ClinicImportIdentityError()
  }
}
