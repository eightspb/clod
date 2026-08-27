import { createHmac } from 'node:crypto'
import { normalizeClinicCard, normalizeImportPhone, normalizeImportText, normalizeMedeskEhr, sourceReference } from './clinic-import-normalization.js'

const VERSION = 'v1'
const HMAC_DOMAIN = 'clod.clinic-import-visit'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const EHR_PATTERN = /^(?:[0-9]{16}|[0-9]{4}(?:-[0-9]{4}){3})$/
const LEADING_ZERO_CARD_PATTERN = /^0[1-9][0-9]*$/
const CONTROL_OR_FORMAT_PATTERN = /[\p{Cc}\p{Cf}]/u
const NAME_TOKEN_PATTERN = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu
const PHONE_PATTERN = /(?<![0-9])(?:(?:\+?7|8)[\s().-]*)?[0-9]{3}[\s().-]*[0-9]{3}[\s().-]*[0-9]{2}[\s().-]*[0-9]{2}(?![0-9])/gu
const INPUT_KEYS = Object.freeze(['fingerprintKey', 'identities', 'visitRows'])
const VISIT_ROW_KEYS = Object.freeze(['sourceName', 'sourceRole', 'sourceRow', 'structuralIssues', 'values'])
const VISIT_VALUE_KEYS = Object.freeze(['appointment_id', 'appointment_begin', 'appointment_end', 'cabinet', 'comment', 'doctor', 'doctor_role', 'invoice_ids', 'patient_card', 'service_names', 'status'])
const STRUCTURAL_ISSUE_KEYS = Object.freeze(['actualWidth', 'code', 'expectedWidth'])
const IDENTITY_COLLECTION_KEYS = Object.freeze(['patients', 'externalIdentifiers', 'contacts', 'nameHistory'])
const EMPTY_IDS = Object.freeze([])
const MAX_VISITS = 100_000
const MAX_PATIENTS = 100_000
const MAX_IDENTIFIERS = 500_000
const MAX_CONTACTS = 500_000
const MAX_NAME_HISTORY = 500_000
const MAX_OBJECT_KEYS = 64
const MAX_RAW_CODE_UNITS = 64 * 1024 * 1024
const MAX_TEXT_UTF16 = 8_192
const MAX_TEXT_CODE_POINTS = 4_096
const MAX_CANDIDATES_PER_VISIT = 2_048
const MAX_TOTAL_CANDIDATES = 20_000
const MAX_EVIDENCE_WORK_PER_VISIT = 20_000
const MAX_TOTAL_EVIDENCE_WORK = 2_000_000
const MAX_HMAC_WORK_PER_VISIT = 4_096
const MAX_HMAC_WORK = 200_000
const MAX_PROTECTED_JSON_BYTES = 65_536
const UUID_SIZE_PLACEHOLDER = '00000000-0000-8000-8000-000000000000'
const DEFAULT_SAFE_LIMITS = Object.freeze({ utf16: MAX_TEXT_UTF16, codePoints: MAX_TEXT_CODE_POINTS })
const DATE_SAFE_LIMITS = Object.freeze({ utf16: 64, codePoints: 64 })
const CARD_SAFE_LIMITS = Object.freeze({ utf16: 200, codePoints: 100 })
const STATUS_SAFE_LIMITS = Object.freeze({ utf16: 128, codePoints: 128 })
const SOURCE_STATUS_CODES = new Set(['cancelled', 'completed', 'confirmed', 'noshow', 'tentative'])
const SAFE_ERRORS = new WeakSet()
const EVIDENCE = Object.freeze({
  exact_ehr: Object.freeze({ code: 'EXACT_EHR', level: 'exact', score: 100 }),
  exact_clinic_card: Object.freeze({ code: 'EXACT_CLINIC_CARD', level: 'strong', score: 90 }),
  leading_zero_clinic_card: Object.freeze({ code: 'LEADING_ZERO_CLINIC_CARD', level: 'strong', score: 80 }),
  phone_compatible_name: Object.freeze({ code: 'PHONE_COMPATIBLE_NAME', level: 'strong', score: 70 }),
  exact_full_name: Object.freeze({ code: 'EXACT_FULL_NAME', level: 'moderate', score: 60 }),
  conflicting_comment_evidence: Object.freeze({ code: 'CONFLICTING_COMMENT_EVIDENCE', level: 'moderate', score: 50 })
})

/** Represents a visit-resolution boundary failure without retaining rejected clinic data. */
export class ClinicImportVisitError extends Error {
  constructor(code = 'INVALID_VISIT_INPUT') {
    super('Clinic import visit input is invalid')
    this.name = 'ClinicImportVisitError'
    this.code = ['INPUT_TOO_COMPLEX', 'VISIT_INVARIANT_FAILED'].includes(code) ? code : 'INVALID_VISIT_INPUT'
    SAFE_ERRORS.add(this)
    Object.freeze(this)
  }
}

function invalid(code = 'INVALID_VISIT_INPUT') {
  throw new ClinicImportVisitError(code)
}

function sameValues(first, second) {
  return first.length === second.length && first.every((value, index) => value === second[index])
}

function compareText(first, second) {
  const firstIterator = first[Symbol.iterator]()
  const secondIterator = second[Symbol.iterator]()
  while (true) {
    const firstValue = firstIterator.next()
    const secondValue = secondIterator.next()
    if (firstValue.done || secondValue.done) return Number(secondValue.done) - Number(firstValue.done)
    const difference = firstValue.value.codePointAt(0) - secondValue.value.codePointAt(0)
    if (difference !== 0) return difference
  }
}

function properties(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid()
  const keys = Reflect.ownKeys(value)
  if (keys.length > MAX_OBJECT_KEYS || keys.some((key) => typeof key !== 'string')) invalid()
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) invalid()
    result[key] = descriptor.value
  }
  return result
}

function exactRecord(value, expected) {
  const input = properties(value)
  if (!sameValues(Object.keys(input).sort(compareText), [...expected].sort(compareText))) invalid()
  return input
}

function projection(value, required) {
  const input = properties(value)
  if (required.some((key) => !Object.hasOwn(input, key))) invalid()
  return input
}

function array(value, limit) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) invalid()
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length')
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value') || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) invalid()
  if (lengthDescriptor.value > limit) invalid('INPUT_TOO_COMPLEX')
  const result = []
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) invalid()
    result.push(descriptor.value)
  }
  const allowed = new Set(['length', ...result.map((_, index) => String(index))])
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowed.has(key))) invalid()
  return result
}

function rawText(value) {
  if (typeof value !== 'string') invalid()
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

function rawBudget() {
  let remaining = MAX_RAW_CODE_UNITS
  return Object.freeze({ take: (amount) => {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > remaining) invalid('INPUT_TOO_COMPLEX')
    remaining -= amount
  } })
}

function normalizedText(value) {
  if (value === null) return null
  const normalized = normalizeImportText(value)
  if (normalized === null || normalized !== value) invalid()
  return normalized
}

function requiredText(value) {
  const normalized = normalizedText(value)
  if (normalized === null) invalid()
  return normalized
}

function uuidValue(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) invalid()
  return value
}

function fingerprintKey(value) {
  if (typeof value !== 'string' || value.trim() !== value) invalid()
  const bytes = Buffer.from(value, 'utf8')
  if (bytes.byteLength < 32 || bytes.byteLength > 4_096 || new Set(bytes).size < 8) invalid()
  return value
}

function canonical(values) {
  return values.map((value) => {
    const text = String(value)
    return `${Buffer.byteLength(text, 'utf8')}:${text}`
  }).join('|')
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
  if (!UUID_PATTERN.test(result)) invalid('VISIT_INVARIANT_FAILED')
  return result
}

function normalizedPatient(value) {
  const input = projection(value, ['id', 'profile'])
  const profile = projection(input.profile, ['firstName', 'lastName', 'middleName'])
  return Object.freeze({ id: uuidValue(input.id), lastName: normalizedText(profile.lastName), firstName: normalizedText(profile.firstName), middleName: normalizedText(profile.middleName) })
}

function normalizedIdentifier(value) {
  const input = projection(value, ['patientId', 'system', 'value'])
  const patientId = uuidValue(input.patientId)
  const system = requiredText(input.system)
  if (system === 'medesk_ehr') {
    const identifier = normalizeMedeskEhr(input.value)
    if (identifier === null || identifier !== input.value) invalid()
    return Object.freeze({ patientId, system, value: identifier })
  }
  if (system === 'clinic_card') {
    const identifier = normalizeClinicCard(input.value)
    if (identifier === null || identifier !== input.value) invalid()
    return Object.freeze({ patientId, system, value: identifier })
  }
  return Object.freeze({ patientId, system, value: requiredText(input.value) })
}

function normalizedContact(value) {
  const input = projection(value, ['kind', 'patientId', 'value'])
  const patientId = uuidValue(input.patientId)
  const kind = requiredText(input.kind)
  if (kind !== 'phone' && kind !== 'email') invalid()
  if (kind === 'phone') {
    const contact = normalizeImportPhone(input.value)
    if (contact === null || contact !== input.value) invalid()
    return Object.freeze({ patientId, kind, value: contact })
  }
  return Object.freeze({ patientId, kind, value: requiredText(input.value) })
}

function normalizedHistory(value) {
  const input = projection(value, ['lastName', 'patientId'])
  return Object.freeze({ patientId: uuidValue(input.patientId), lastName: requiredText(input.lastName) })
}

function normalizedIdentities(value) {
  const input = properties(value)
  if (IDENTITY_COLLECTION_KEYS.some((key) => !Object.hasOwn(input, key))) invalid()
  const patients = Object.freeze(array(input.patients, MAX_PATIENTS).map(normalizedPatient))
  const identifiers = Object.freeze(array(input.externalIdentifiers, MAX_IDENTIFIERS).map(normalizedIdentifier))
  const contacts = Object.freeze(array(input.contacts, MAX_CONTACTS).map(normalizedContact))
  const histories = Object.freeze(array(input.nameHistory, MAX_NAME_HISTORY).map(normalizedHistory))
  const patientIds = new Set(patients.map(({ id }) => id))
  if (patientIds.size !== patients.length) invalid('VISIT_INVARIANT_FAILED')
  if ([...identifiers, ...contacts, ...histories].some(({ patientId }) => !patientIds.has(patientId))) invalid('VISIT_INVARIANT_FAILED')
  const ehrOwners = new Map()
  for (const identifier of identifiers) if (identifier.system === 'medesk_ehr') {
    const owner = ehrOwners.get(identifier.value)
    if (owner !== undefined && owner !== identifier.patientId) invalid('VISIT_INVARIANT_FAILED')
    ehrOwners.set(identifier.value, identifier.patientId)
  }
  return Object.freeze({ patients, identifiers, contacts, histories })
}

function normalizedIssue(value) {
  const input = exactRecord(value, STRUCTURAL_ISSUE_KEYS)
  if (input.code !== 'SHORT_ROW' || !Number.isSafeInteger(input.actualWidth) || input.actualWidth < 0 || input.expectedWidth !== VISIT_VALUE_KEYS.length || input.actualWidth >= input.expectedWidth) invalid()
  return Object.freeze({ code: input.code, actualWidth: input.actualWidth, expectedWidth: input.expectedWidth })
}

function dataIssue(code, field) {
  return Object.freeze({ code, field })
}

function addIssue(issues, code, field) {
  if (!issues.some((issue) => issue.code === code && issue.field === field)) issues.push(dataIssue(code, field))
}

function safeLimits(field) {
  if (field === 'appointment_begin' || field === 'appointment_end') return DATE_SAFE_LIMITS
  if (field === 'patient_card') return CARD_SAFE_LIMITS
  if (field === 'status') return STATUS_SAFE_LIMITS
  return DEFAULT_SAFE_LIMITS
}

function tooLarge(value, maximumUtf16, maximumCodePoints) {
  return value.length > maximumUtf16 || [...value].length > maximumCodePoints
}

function safeText(value, field, issues, maximumUtf16 = MAX_TEXT_UTF16, maximumCodePoints = MAX_TEXT_CODE_POINTS) {
  if (CONTROL_OR_FORMAT_PATTERN.test(value)) return null
  if (tooLarge(value, maximumUtf16, maximumCodePoints)) {
    addIssue(issues, 'VALUE_TOO_LARGE', field)
    return null
  }
  return normalizeImportText(value)
}

function safeTimestamp(value, field, code, issues) {
  if (value === '') return null
  const normalized = safeText(value, field, issues, 64, 64)
  const instant = normalized === null ? null : new Date(normalized)
  if (instant === null || !Number.isFinite(instant.getTime()) || instant.toISOString() !== normalized) {
    addIssue(issues, code, field)
    return null
  }
  return normalized
}

function valueIssues(values) {
  const issues = []
  for (const field of VISIT_VALUE_KEYS) {
    const limits = safeLimits(field)
    if (CONTROL_OR_FORMAT_PATTERN.test(values[field])) addIssue(issues, 'CONTROL_CHAR_VALUE', field)
    if (tooLarge(values[field], limits.utf16, limits.codePoints)) addIssue(issues, 'VALUE_TOO_LARGE', field)
  }
  return issues
}

function visitValues(value, budget) {
  const input = exactRecord(value, VISIT_VALUE_KEYS)
  const result = {}
  let rawUnits = 0
  for (const key of VISIT_VALUE_KEYS) result[key] = rawText(input[key])
  for (const key of VISIT_VALUE_KEYS) {
    rawUnits += result[key].length
    if (!Number.isSafeInteger(rawUnits) || rawUnits > MAX_RAW_CODE_UNITS) invalid('INPUT_TOO_COMPLEX')
  }
  budget.take(rawUnits)
  for (const key of VISIT_VALUE_KEYS) if (!validUnicode(result[key])) invalid()
  return Object.freeze({ values: Object.freeze(result), rawUnits })
}

function sourceToken(source) {
  return canonical([source.sourceName, source.sourceRow])
}

function protectedDetailValues(values) {
  const wrapper = { id: UUID_SIZE_PLACEHOLDER, historicalVisitId: UUID_SIZE_PLACEHOLDER, value: values }
  const serialized = JSON.stringify(wrapper)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PROTECTED_JSON_BYTES) invalid('INPUT_TOO_COMPLEX')
  return values
}

function normalizedStatus(value, issues) {
  if (value === '') return ''
  const normalized = safeText(value, 'status', issues, 128, 128)
  if (normalized === null) return 'unknown'
  const code = normalized.toLowerCase()
  return SOURCE_STATUS_CODES.has(code) ? code : 'unknown'
}

function cachedVisitPayload(valuesInput, issuesInput, budget, cache) {
  const cachedByIssues = cache.get(valuesInput)
  if (cachedByIssues?.has(issuesInput)) {
    const cached = cachedByIssues.get(issuesInput)
    budget.take(cached.rawUnits)
    return cached
  }
  const { values, rawUnits } = visitValues(valuesInput, budget)
  const rawIssues = array(issuesInput, 1)
  const structuralIssues = Object.freeze(rawIssues.map(normalizedIssue))
  const detailValues = protectedDetailValues(Object.freeze({ ...values, structuralIssues }))
  const issues = valueIssues(values)
  for (const issue of structuralIssues) addIssue(issues, issue.code, null)
  const startsAt = safeTimestamp(values.appointment_begin, 'appointment_begin', 'INVALID_START_DATE', issues)
  let endsAt = safeTimestamp(values.appointment_end, 'appointment_end', 'INVALID_END_DATE', issues)
  if (startsAt !== null && endsAt !== null && endsAt < startsAt) {
    addIssue(issues, 'INVALID_END_DATE', 'appointment_end')
    endsAt = null
  }
  const appointmentId = safeText(values.appointment_id, 'appointment_id', issues)
  const patientCard = safeText(values.patient_card, 'patient_card', issues, 200, 100)
  const comment = safeText(values.comment, 'comment', issues)
  const sourceStatus = normalizedStatus(values.status, issues)
  const sortedIssues = Object.freeze(issues.sort((first, second) => compareText(first.code, second.code) || compareText(first.field ?? '', second.field ?? '')))
  const result = Object.freeze({ values: detailValues, rawUnits, startsAt, endsAt, safe: Object.freeze({ appointmentId, patientCard, comment, sourceStatus }), issues: sortedIssues })
  if (Object.isFrozen(valuesInput) && Object.isFrozen(issuesInput) && rawIssues.every(Object.isFrozen)) {
    if (!cache.has(valuesInput)) cache.set(valuesInput, new WeakMap())
    cache.get(valuesInput).set(issuesInput, result)
  }
  return result
}

function normalizedVisit(value, budget, cache) {
  const input = exactRecord(value, VISIT_ROW_KEYS)
  if (input.sourceRole !== 'visits') invalid()
  const source = sourceReference({ sourceName: input.sourceName, sourceRow: input.sourceRow })
  const payload = cachedVisitPayload(input.values, input.structuralIssues, budget, cache)
  return Object.freeze({ source, token: sourceToken(source), values: payload.values, startsAt: payload.startsAt, endsAt: payload.endsAt, safe: payload.safe, issues: payload.issues })
}

function normalizedInput(value) {
  const input = exactRecord(value, INPUT_KEYS)
  const keyValue = fingerprintKey(input.fingerprintKey)
  const identities = normalizedIdentities(input.identities)
  const budget = rawBudget()
  const payloadCache = new WeakMap()
  const visits = []
  let minimumHmacWork = 0
  for (const row of array(input.visitRows, MAX_VISITS)) {
    const visit = normalizedVisit(row, budget, payloadCache)
    minimumHmacWork += 2 + visit.issues.length + Number(visit.safe.appointmentId !== null)
    if (!Number.isSafeInteger(minimumHmacWork) || minimumHmacWork > MAX_HMAC_WORK) invalid('INPUT_TOO_COMPLEX')
    visits.push(visit)
  }
  visits.sort((first, second) => compareText(first.source.sourceName, second.source.sourceName) || first.source.sourceRow - second.source.sourceRow)
  Object.freeze(visits)
  const tokens = visits.map(({ token }) => token)
  if (new Set(tokens).size !== tokens.length) invalid('VISIT_INVARIANT_FAILED')
  return Object.freeze({ keyValue, identities, visits })
}

function add(index, value, patientId) {
  if (value === null) return
  if (!index.has(value)) index.set(value, new Set())
  const ids = index.get(value)
  if (!ids.has(patientId) && ids.size >= MAX_CANDIDATES_PER_VISIT) invalid('INPUT_TOO_COMPLEX')
  ids.add(patientId)
}

function sealedIndex(index) {
  const values = new Map()
  for (const [name, ids] of index) {
    if (ids.size > MAX_CANDIDATES_PER_VISIT) invalid('INPUT_TOO_COMPLEX')
    values.set(name, Object.freeze([...ids].sort(compareText)))
  }
  return Object.freeze({ ids: (value) => values.get(value) ?? EMPTY_IDS })
}

function tokens(value) {
  if (value === null) return EMPTY_IDS
  return Object.freeze(value.toLowerCase().match(NAME_TOKEN_PATTERN) ?? [])
}

function phrase(values) {
  if (values.some((value) => value === null)) return null
  const result = values.flatMap((value) => tokens(value))
  return result.length === 0 ? null : result.join('\0')
}

function nameIndexes(patients, histories) {
  const full = new Map()
  const compatible = new Map()
  const lengths = new Set()
  const surnames = new Map(patients.map(({ id, lastName }) => [id, new Set(lastName === null ? [] : [lastName])]))
  for (const history of histories) surnames.get(history.patientId).add(history.lastName)
  for (const patient of patients) {
    const givenPatronymic = phrase([patient.firstName, patient.middleName])
    add(compatible, givenPatronymic, patient.id)
    if (givenPatronymic !== null) lengths.add(givenPatronymic.split('\0').length)
    for (const lastName of surnames.get(patient.id)) {
      const fullName = phrase([lastName, patient.firstName, patient.middleName])
      const surnameGiven = phrase([lastName, patient.firstName])
      add(full, fullName, patient.id)
      add(compatible, fullName, patient.id)
      add(compatible, surnameGiven, patient.id)
      for (const value of [fullName, surnameGiven]) if (value !== null) lengths.add(value.split('\0').length)
    }
  }
  return Object.freeze({ full: sealedIndex(full), compatible: sealedIndex(compatible), lengths: Object.freeze([...lengths].sort((first, second) => first - second)) })
}

function indexesFrom(identities) {
  const ehr = new Map()
  const card = new Map()
  const phone = new Map()
  for (const identifier of identities.identifiers) {
    if (identifier.system === 'medesk_ehr') add(ehr, identifier.value, identifier.patientId)
    if (identifier.system === 'clinic_card') add(card, identifier.value, identifier.patientId)
  }
  for (const contact of identities.contacts) if (contact.kind === 'phone') add(phone, contact.value, contact.patientId)
  return Object.freeze({ ehr: sealedIndex(ehr), card: sealedIndex(card), phone: sealedIndex(phone), names: nameIndexes(identities.patients, identities.histories) })
}

function unique(values) {
  return Object.freeze([...new Set(values)].sort(compareText))
}

function evidenceBudget() {
  let total = 0
  return Object.freeze({ visit: () => {
    let current = 0
    return Object.freeze({ add: (amount) => {
      current += amount
      total += amount
      if (!Number.isSafeInteger(current) || !Number.isSafeInteger(total) || current > MAX_EVIDENCE_WORK_PER_VISIT || total > MAX_TOTAL_EVIDENCE_WORK) invalid('INPUT_TOO_COMPLEX')
    } })
  } })
}

function commentEvidenceWork(comment, lengths) {
  const wordCount = tokens(comment).length
  let work = wordCount + lengths.length * 2
  for (const length of lengths) work += Math.max(0, wordCount - length + 1) * 2
  if (!Number.isSafeInteger(work) || work > MAX_EVIDENCE_WORK_PER_VISIT) invalid('INPUT_TOO_COMPLEX')
  return work
}

function needsCommentEvidence(visit, indexes) {
  const card = visit.safe.patientCard
  if (card !== null && EHR_PATTERN.test(card) && indexes.ehr.ids(normalizeMedeskEhr(card)).length > 0) return false
  if (card !== null && indexes.card.ids(card).length > 0) return false
  return visit.safe.comment !== null
}

function preflightEvidenceWork(visits, indexes) {
  const cached = new Map()
  let total = 0
  for (const visit of visits) if (needsCommentEvidence(visit, indexes)) {
    const comment = visit.safe.comment
    if (!cached.has(comment)) cached.set(comment, commentEvidenceWork(comment, indexes.names.lengths))
    total += cached.get(comment)
    if (!Number.isSafeInteger(total) || total > MAX_TOTAL_EVIDENCE_WORK) invalid('INPUT_TOO_COMPLEX')
  }
}

function matchingNames(words, index, lengths, work) {
  const matches = []
  work.add(lengths.length)
  for (const length of lengths) for (let start = 0; start + length <= words.length; start += 1) {
    const candidates = index.ids(words.slice(start, start + length).join('\0'))
    work.add(1 + candidates.length)
    matches.push(...candidates)
  }
  return unique(matches)
}

function matchingPhones(comment, index, work) {
  const matches = []
  for (const raw of comment.matchAll(PHONE_PATTERN)) {
    let phone
    try {
      phone = normalizeImportPhone(raw[0])
    } catch {
      phone = null
    }
    if (phone !== null) {
      const candidates = index.ids(phone)
      work.add(1 + candidates.length)
      matches.push(...candidates)
    }
  }
  return unique(matches)
}

function intersection(first, second) {
  const accepted = new Set(second)
  return Object.freeze(first.filter((value) => accepted.has(value)))
}

function union(first, second) {
  return unique([...first, ...second])
}

function commentMatches(comment, indexes, work) {
  const words = tokens(comment)
  work.add(words.length)
  const compatible = matchingNames(words, indexes.names.compatible, indexes.names.lengths, work)
  const full = matchingNames(words, indexes.names.full, indexes.names.lengths, work)
  const phones = matchingPhones(comment, indexes.phone, work)
  return Object.freeze({ phoneName: intersection(phones, compatible), full })
}

function decision(method, candidates) {
  if (candidates.length > MAX_CANDIDATES_PER_VISIT) invalid('INPUT_TOO_COMPLEX')
  const evidence = EVIDENCE[method]
  if (candidates.length === 1) return Object.freeze({ status: 'linked', method, patientId: candidates[0], candidates: EMPTY_IDS, evidence })
  return Object.freeze({ status: 'ambiguous', method, patientId: null, candidates, evidence })
}

function unmatched() {
  return Object.freeze({ status: 'unmatched', method: null, patientId: null, candidates: EMPTY_IDS, evidence: Object.freeze({ code: null, level: 'none', score: 0 }) })
}

function visitDecision(visit, indexes, work) {
  const card = visit.safe.patientCard
  if (card !== null && EHR_PATTERN.test(card)) {
    const matches = indexes.ehr.ids(normalizeMedeskEhr(card))
    work.add(1 + matches.length)
    if (matches.length > 0) return decision('exact_ehr', matches)
  }
  if (card !== null) {
    const matches = indexes.card.ids(card)
    work.add(1 + matches.length)
    if (matches.length > 0) return decision('exact_clinic_card', matches)
  }
  const comment = visit.safe.comment
  const commentEvidence = comment === null ? Object.freeze({ phoneName: EMPTY_IDS, full: EMPTY_IDS }) : commentMatches(comment, indexes, work)
  if (card !== null && LEADING_ZERO_CARD_PATTERN.test(card)) {
    const matches = indexes.card.ids(card.slice(1))
    work.add(1 + matches.length)
    const corroboration = union(commentEvidence.phoneName, commentEvidence.full)
    if (matches.length === 1 && corroboration.length === 1 && corroboration[0] === matches[0]) return decision('leading_zero_clinic_card', matches)
  }
  if (commentEvidence.phoneName.length > 0 && commentEvidence.full.length > 0) {
    if (!sameValues(commentEvidence.phoneName, commentEvidence.full)) return decision('conflicting_comment_evidence', union(commentEvidence.phoneName, commentEvidence.full))
  }
  if (commentEvidence.phoneName.length > 0) return decision('phone_compatible_name', commentEvidence.phoneName)
  if (commentEvidence.full.length > 0) return decision('exact_full_name', commentEvidence.full)
  return unmatched()
}

function historicalVisit(visit, link, keyValue) {
  const id = uuid(keyValue, 'historical-visit-id', visit.token)
  const appointment = visit.safe.appointmentId
  const issueCodes = unique(visit.issues.map(({ code }) => code))
  return Object.freeze({ id, sourceName: visit.source.sourceName, sourceRow: visit.source.sourceRow, patientId: link.patientId, appointmentIdFingerprint: appointment === null ? null : fingerprint(keyValue, 'appointment-id', appointment), startsAt: visit.startsAt, endsAt: visit.endsAt, sourceStatus: visit.safe.sourceStatus, linkStatus: link.status, linkMethod: link.method, evidenceLevel: link.evidence.level, issueCodes })
}

function visitDetail(visit, historicalVisitId, keyValue) {
  return Object.freeze({ id: uuid(keyValue, 'visit-detail-id', historicalVisitId), historicalVisitId, value: visit.values })
}

function visitCandidates(historicalVisitId, link, keyValue) {
  return link.candidates.map((patientId) => Object.freeze({ id: uuid(keyValue, 'visit-candidate-id', canonical([historicalVisitId, patientId, link.evidence.code])), historicalVisitId, patientId, evidenceCode: link.evidence.code, score: link.evidence.score }))
}

function visitIssues(visit, historicalVisitId, keyValue) {
  return visit.issues.map(({ code, field }) => Object.freeze({ id: uuid(keyValue, 'visit-issue-id', canonical([historicalVisitId, code, field ?? ''])), historicalVisitId, code, field }))
}

function countsFrom(rows) {
  const counts = { total: rows.length, linked: 0, ambiguous: 0, unmatched: 0, exactEhr: 0, exactClinicCard: 0, leadingZeroClinicCard: 0, phoneCompatibleName: 0, exactFullName: 0, conflictingCommentEvidence: 0, missingDate: 0, emptyStatus: 0, shortRow: 0, invalidStartDate: 0, invalidEndDate: 0, controlCharValue: 0, valueTooLarge: 0 }
  const methods = { exact_ehr: 'exactEhr', exact_clinic_card: 'exactClinicCard', leading_zero_clinic_card: 'leadingZeroClinicCard', phone_compatible_name: 'phoneCompatibleName', exact_full_name: 'exactFullName', conflicting_comment_evidence: 'conflictingCommentEvidence' }
  const issueCounts = { SHORT_ROW: 'shortRow', INVALID_START_DATE: 'invalidStartDate', INVALID_END_DATE: 'invalidEndDate', CONTROL_CHAR_VALUE: 'controlCharValue', VALUE_TOO_LARGE: 'valueTooLarge' }
  for (const { visit, link } of rows) {
    counts[link.status] += 1
    if (link.method !== null) counts[methods[link.method]] += 1
    if (visit.values.appointment_begin === '') counts.missingDate += 1
    if (visit.values.status === '') counts.emptyStatus += 1
    for (const issue of visit.issues) counts[issueCounts[issue.code]] += 1
  }
  return Object.freeze(counts)
}

function boundedOutputWork(rows) {
  let candidates = 0
  let hmacWork = rows.length * 2
  for (const { visit, link } of rows) {
    const visitHmacWork = 2 + link.candidates.length + visit.issues.length + Number(visit.safe.appointmentId !== null)
    candidates += link.candidates.length
    hmacWork += visitHmacWork - 2
    if (!Number.isSafeInteger(candidates) || candidates > MAX_TOTAL_CANDIDATES || visitHmacWork > MAX_HMAC_WORK_PER_VISIT || !Number.isSafeInteger(hmacWork) || hmacWork > MAX_HMAC_WORK) invalid('INPUT_TOO_COMPLEX')
  }
}

function uniqueIds(values) {
  return new Set(values.map(({ id }) => id)).size === values.length
}

function resultFrom(input) {
  const indexes = indexesFrom(input.identities)
  preflightEvidenceWork(input.visits, indexes)
  const budget = evidenceBudget()
  const rows = input.visits.map((visit) => Object.freeze({ visit, link: visitDecision(visit, indexes, budget.visit()) }))
  boundedOutputWork(rows)
  const historicalVisits = Object.freeze(rows.map(({ visit, link }) => historicalVisit(visit, link, input.keyValue)))
  const visitDetails = Object.freeze(rows.map(({ visit }, index) => visitDetail(visit, historicalVisits[index].id, input.keyValue)))
  const candidates = Object.freeze(rows.flatMap(({ link }, index) => visitCandidates(historicalVisits[index].id, link, input.keyValue)).sort((first, second) => compareText(first.historicalVisitId, second.historicalVisitId) || compareText(first.patientId, second.patientId)))
  const issues = Object.freeze(rows.flatMap(({ visit }, index) => visitIssues(visit, historicalVisits[index].id, input.keyValue)))
  if (![historicalVisits, visitDetails, candidates, issues].every(uniqueIds)) invalid('VISIT_INVARIANT_FAILED')
  return Object.freeze({ historicalVisits, visitDetails, candidates, issues, evidenceCounts: countsFrom(rows) })
}

/** Resolves every loaded historical visit row against immutable patient identity indexes. */
export function resolveClinicImportVisits(value) {
  try {
    return resultFrom(normalizedInput(value))
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    throw new ClinicImportVisitError()
  }
}
