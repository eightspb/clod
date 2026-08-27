import { isAdminClinicQueryError, parseDestroyPatientBody, parsePatientDetailQuery, parsePatientId, parsePatientQuery } from './admin-clinic-query.js'
import { adminActor, guardAdminPii, guardAdminRead, readAdminJson } from './admin-api.js'
import { safeCallPage } from './admin-call-api.js'
import { PATIENT_HISTORY_ATTACHMENT_KINDS as ATTACHMENT_KINDS, PATIENT_HISTORY_ATTACHMENT_SOURCES as ATTACHMENT_SOURCE_NAMES, PATIENT_HISTORY_CONTACT_SOURCES as CONTACT_SOURCE_NAMES, PATIENT_HISTORY_EVIDENCE_LEVELS as EVIDENCE_LEVELS, PATIENT_HISTORY_IMPORT_ISSUE_CODES as IMPORT_ISSUE_CODES, PATIENT_HISTORY_IMPORT_SOURCES as IMPORT_SOURCE_NAMES, PATIENT_HISTORY_LINK_METHODS as LINK_METHODS, PATIENT_HISTORY_SOURCE_STATUSES as SOURCE_STATUSES, PATIENT_HISTORY_VISIT_SOURCES as VISIT_SOURCE_NAMES, PATIENT_HISTORY_VISIT_STATUSES as VISIT_STATUSES } from './patient-history-contract.js'
import { isPatientHistoryRecordError } from './patient-history-records.js'
import { isPatientRecordError } from './patient-records.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const PATIENT_FIELDS = Object.freeze(['id', 'name', 'phoneMask', 'firstSeenAt', 'lastSeenAt', 'createdAt', 'updatedAt', 'piiDestroyedAt'])
const COUNT_FIELDS = Object.freeze(['externalIdentifierCount', 'clinicCardCount', 'contactCount', 'previousLastNameCount', 'historicalVisitCount', 'issueCount', 'attachmentCount'])
const VISIT_FIELDS = Object.freeze(['id', 'sourceName', 'sourceRow', 'startsAt', 'endsAt', 'sourceStatus', 'linkStatus', 'linkMethod', 'evidenceLevel', 'issueCount', 'candidateCount', 'protectedDetailsAvailable'])
const ISSUE_FIELDS = Object.freeze(['id', 'sourceName', 'sourceRow', 'code', 'historicalVisitId', 'createdAt', 'resolvedAt'])
const ATTACHMENT_FIELDS = Object.freeze(['id', 'kind', 'sourceName', 'createdAt', 'deletedAt', 'protectedDataAvailable'])
const REVEAL_FIELDS = Object.freeze(['id', 'profile', 'contacts', 'previousLastNames', 'externalIdentifiers', 'privateData', 'consents', 'attachments', 'historicalVisits', 'revealedAt'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const PHONE_MASK_PATTERN = /^\+[1-9] •{5,12} [0-9]{2}$/u
const PHONE_PATTERN = /^[1-9][0-9]{7,14}$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u
const UNSAFE_NAME_PATTERN = /[\p{Cc}\p{Cf}\p{Cs}\p{N}]/u
const DANGEROUS_PLAIN_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'])
const MAX_PAGE_NUMBER = 1_000_000
const MAX_PAGE_SIZE = 50
const MAX_PAGE_TOTAL = MAX_PAGE_NUMBER * MAX_PAGE_SIZE
const MAX_COUNT = 50_000_000
const MAX_CANDIDATES_PER_VISIT = 2_048
const MAX_PLAIN_VALUE_WORK = 10_000
const MAX_REVEAL_JSON_BYTES = 1024 * 1024
const LINK_EVIDENCE = Object.freeze({ exact_ehr: Object.freeze({ level: 'exact', ambiguous: false }), exact_clinic_card: Object.freeze({ level: 'strong', ambiguous: true }), leading_zero_clinic_card: Object.freeze({ level: 'strong', ambiguous: false }), phone_compatible_name: Object.freeze({ level: 'strong', ambiguous: true }), exact_full_name: Object.freeze({ level: 'moderate', ambiguous: true }), conflicting_comment_evidence: Object.freeze({ level: 'moderate', ambiguous: true, linked: false }) })

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function noStore(response) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function failure(status, error, message) {
  return json({ error, message }, status)
}

function safePatient(value, expectedId) {
  const scope = 'Patient'
  const input = projected(value, PATIENT_FIELDS, scope)
  const name = nullablePatientName(input.name, scope)
  const phoneMask = nullablePhoneMask(input.phoneMask, scope)
  const firstSeenAt = nullableTimestamp(input.firstSeenAt, scope)
  const lastSeenAt = nullableTimestamp(input.lastSeenAt, scope)
  const createdAt = safeTimestamp(input.createdAt, scope)
  const updatedAt = safeTimestamp(input.updatedAt, scope)
  const piiDestroyedAt = nullableTimestamp(input.piiDestroyedAt, scope)
  const id = safeUuid(input.id, scope)
  if ((expectedId !== undefined && id !== expectedId) || (firstSeenAt === null) !== (lastSeenAt === null) || (firstSeenAt !== null && lastSeenAt < firstSeenAt) || updatedAt < createdAt || (piiDestroyedAt !== null && (name !== null || phoneMask !== null || piiDestroyedAt < createdAt || piiDestroyedAt > updatedAt))) throw new TypeError(`${scope} response is invalid`)
  return Object.freeze({ id, name, phoneMask, firstSeenAt, lastSeenAt, createdAt, updatedAt, piiDestroyedAt })
}

function projected(value, fields, scope) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${scope} response is invalid`)
  const result = {}
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} response is invalid`)
    result[key] = descriptor.value
  }
  return Object.freeze(result)
}

function denseArray(value, maximum, scope) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError(`${scope} response is invalid`)
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum || Reflect.ownKeys(value).length !== length + 1) throw new TypeError(`${scope} response is invalid`)
  const result = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) throw new TypeError(`${scope} response is invalid`)
    result.push(descriptor.value)
  }
  return result
}

function safeUuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function safeTimestamp(value, scope) {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || new Date(value).toISOString() !== value) throw new TypeError(`${scope} response is invalid`)
  return value
}

function nullableTimestamp(value, scope) {
  return value === null ? null : safeTimestamp(value, scope)
}

function nullablePatientName(value, scope) {
  if (value === null) return null
  if (typeof value !== 'string' || value.trim() !== value || value.normalize('NFC') !== value || value.length === 0 || [...value].length > 350 || UNSAFE_NAME_PATTERN.test(value) || !/\p{L}/u.test(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function nullablePhoneMask(value, scope) {
  if (value !== null && (typeof value !== 'string' || !PHONE_MASK_PATTERN.test(value))) throw new TypeError(`${scope} response is invalid`)
  return value
}

function exact(value, allowed, scope) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function nullableExact(value, allowed, scope) {
  return value === null ? null : exact(value, allowed, scope)
}

function sourceName(value, allowed, scope) {
  return exact(value, allowed, scope)
}

function attachmentKind(value, scope) {
  return exact(value, ATTACHMENT_KINDS, scope)
}

function nonnegativeInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_COUNT) throw new TypeError(`${scope} response is invalid`)
  return value
}

function positiveInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_COUNT) throw new TypeError(`${scope} response is invalid`)
  return value
}

function coherentLinkage(linkStatus, linkMethod, evidenceLevel, candidateCount) {
  if (linkStatus === 'unmatched') return linkMethod === null && evidenceLevel === 'none' && candidateCount === 0
  if (linkMethod === null || !Object.hasOwn(LINK_EVIDENCE, linkMethod)) return false
  const evidence = LINK_EVIDENCE[linkMethod]
  if (evidenceLevel !== evidence.level) return false
  if (linkStatus === 'linked') return evidence.linked !== false && candidateCount === 0
  return linkStatus === 'ambiguous' && evidence.ambiguous && candidateCount >= 2 && candidateCount <= MAX_CANDIDATES_PER_VISIT
}

function pageMetadata(input, items, scope) {
  const number = positiveInteger(input.page, scope)
  const size = positiveInteger(input.pageSize, scope)
  const total = nonnegativeInteger(input.total, scope)
  const pages = nonnegativeInteger(input.pages, scope)
  const expectedPages = total === 0 ? 0 : Math.ceil(total / size)
  const remaining = number > pages ? 0 : total - ((number - 1) * size)
  if (number > MAX_PAGE_NUMBER || size > MAX_PAGE_SIZE || total > MAX_PAGE_TOTAL || pages > MAX_PAGE_NUMBER || pages !== expectedPages || items.length > Math.min(size, Math.max(0, remaining))) throw new TypeError(`${scope} response is invalid`)
  return Object.freeze({ number, size, total, pages })
}

function safeCounts(value, patientId) {
  const input = projected(value, ['patientId', ...COUNT_FIELDS], 'Patient counts')
  if (input.patientId !== patientId) throw new TypeError('Patient counts response is invalid')
  return Object.freeze(Object.fromEntries(COUNT_FIELDS.map((field) => [field, nonnegativeInteger(input[field], 'Patient counts')])))
}

function safeVisit(value) {
  const scope = 'Patient visit'
  const input = projected(value, VISIT_FIELDS, scope)
  if (typeof input.protectedDetailsAvailable !== 'boolean') throw new TypeError(`${scope} response is invalid`)
  const linkStatus = exact(input.linkStatus, VISIT_STATUSES, scope)
  const linkMethod = nullableExact(input.linkMethod, LINK_METHODS, scope)
  const evidenceLevel = nullableExact(input.evidenceLevel, EVIDENCE_LEVELS, scope)
  const candidateCount = nonnegativeInteger(input.candidateCount, scope)
  if (!coherentLinkage(linkStatus, linkMethod, evidenceLevel, candidateCount)) throw new TypeError(`${scope} response is invalid`)
  return Object.freeze({ id: safeUuid(input.id, scope), sourceName: sourceName(input.sourceName, VISIT_SOURCE_NAMES, scope), sourceRow: positiveInteger(input.sourceRow, scope), startsAt: nullableTimestamp(input.startsAt, scope), endsAt: nullableTimestamp(input.endsAt, scope), sourceStatus: exact(input.sourceStatus, SOURCE_STATUSES, scope), linkStatus, linkMethod, evidenceLevel, issueCount: nonnegativeInteger(input.issueCount, scope), candidateCount, protectedDetailsAvailable: input.protectedDetailsAvailable })
}

function safeIssue(value) {
  const scope = 'Patient issue'
  const input = projected(value, ISSUE_FIELDS, scope)
  return Object.freeze({ id: safeUuid(input.id, scope), sourceName: sourceName(input.sourceName, IMPORT_SOURCE_NAMES, scope), sourceRow: positiveInteger(input.sourceRow, scope), code: exact(input.code, IMPORT_ISSUE_CODES, scope), historicalVisitId: input.historicalVisitId === null ? null : safeUuid(input.historicalVisitId, scope), createdAt: safeTimestamp(input.createdAt, scope), resolvedAt: nullableTimestamp(input.resolvedAt, scope) })
}

function safeAttachment(value) {
  const scope = 'Patient attachment'
  const input = projected(value, ATTACHMENT_FIELDS, scope)
  if (typeof input.protectedDataAvailable !== 'boolean') throw new TypeError(`${scope} response is invalid`)
  return Object.freeze({ id: safeUuid(input.id, scope), kind: attachmentKind(input.kind, scope), sourceName: sourceName(input.sourceName, ATTACHMENT_SOURCE_NAMES, scope), createdAt: safeTimestamp(input.createdAt, scope), deletedAt: nullableTimestamp(input.deletedAt, scope), protectedDataAvailable: input.protectedDataAvailable })
}

function safeHistoryPage(value, adapter, scope) {
  const input = projected(value, ['items', 'page', 'pageSize', 'total', 'pages'], `${scope} page`)
  const items = denseArray(input.items, MAX_PAGE_SIZE, `${scope} page`)
  const metadata = pageMetadata(input, items, `${scope} page`)
  return Object.freeze({ data: Object.freeze(items.map(adapter)), page: metadata })
}

async function counts(configuration, patients) {
  if (configuration.history === undefined) return patients
  const repository = configuration.history()
  if (repository === null || typeof repository !== 'object' || typeof repository.summaries !== 'function') throw new TypeError('Patient history repository is invalid')
  const summaries = denseArray(await repository.summaries({ ids: patients.map(({ id }) => id) }), patients.length, 'Patient counts')
  if (summaries.length !== patients.length) throw new TypeError('Patient counts response is invalid')
  const normalized = summaries.map((summary) => projected(summary, ['patientId', ...COUNT_FIELDS], 'Patient counts'))
  const byId = new Map(normalized.map((summary) => [summary.patientId, summary]))
  if (byId.size !== patients.length) throw new TypeError('Patient counts response is invalid')
  return Object.freeze(patients.map((patient) => Object.freeze({ ...patient, ...safeCounts(byId.get(patient.id), patient.id) })))
}

function page(value) {
  const input = projected(value, ['items', 'page', 'pageSize', 'total', 'pages'], 'Patient page')
  const items = denseArray(input.items, MAX_PAGE_SIZE, 'Patient page')
  const metadata = pageMetadata(input, items, 'Patient page')
  return Object.freeze({ data: Object.freeze(items.map((item) => safePatient(item))), page: metadata })
}

async function patientPage(configuration, value) {
  const result = page(value)
  return Object.freeze({ data: await counts(configuration, result.data), page: result.page })
}

function consumeRevealWork(state, amount = 1) {
  if (!Number.isSafeInteger(amount) || amount < 0 || state.work > MAX_PLAIN_VALUE_WORK - amount) throw new TypeError('Patient reveal is invalid')
  state.work += amount
}

function plainValue(value, depth, state) {
  consumeRevealWork(state)
  if (value === null || typeof value === 'boolean' || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) return value
  if (typeof value !== 'object' || depth > 16) throw new TypeError('Patient reveal is invalid')
  if (Array.isArray(value)) {
    const length = Object.getOwnPropertyDescriptor(value, 'length')?.value
    const keys = Reflect.ownKeys(value)
    if (Object.getPrototypeOf(value) !== Array.prototype || !Number.isSafeInteger(length) || length < 0 || length > 2_000 || keys.length !== length + 1 || !keys.includes('length')) throw new TypeError('Patient reveal is invalid')
    const result = []
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) throw new TypeError('Patient reveal is invalid')
      result.push(plainValue(descriptor.value, depth + 1, state))
    }
    return Object.freeze(result)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Patient reveal is invalid')
  const result = {}
  const keys = Reflect.ownKeys(value)
  if (keys.length > 2_000 || keys.some((key) => typeof key !== 'string' || DANGEROUS_PLAIN_KEYS.includes(key))) throw new TypeError('Patient reveal is invalid')
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) throw new TypeError('Patient reveal is invalid')
    result[key] = plainValue(descriptor.value, depth + 1, state)
  }
  return Object.freeze(result)
}

function revealArray(values, adapter, scope, state) {
  const items = denseArray(values, 2_000, scope)
  consumeRevealWork(state, items.length + 1)
  return Object.freeze(items.map(adapter))
}

function privateString(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} response is invalid`)
  return value
}

function nullablePrivateString(value, scope) {
  return value === null ? null : privateString(value, scope)
}

function privatePhone(value, scope) {
  if (typeof value !== 'string' || !PHONE_PATTERN.test(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function nullablePrivatePhone(value, scope) {
  return value === null ? null : privatePhone(value, scope)
}

function privateEmail(value, scope) {
  if (typeof value !== 'string' || [...value].length > 320 || value.normalize('NFC') !== value || value.toLowerCase() !== value || !EMAIL_PATTERN.test(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function revealedProfile(value) {
  const scope = 'Patient profile'
  const input = projected(value, ['firstName', 'lastName', 'secondName', 'phone', 'birthday'], scope)
  const birthday = nullablePrivateString(input.birthday, scope)
  if (birthday !== null && (!DATE_PATTERN.test(birthday) || new Date(`${birthday}T00:00:00.000Z`).toISOString().slice(0, 10) !== birthday)) throw new TypeError(`${scope} response is invalid`)
  return Object.freeze({ firstName: nullablePrivateString(input.firstName, scope), lastName: nullablePrivateString(input.lastName, scope), secondName: nullablePrivateString(input.secondName, scope), phone: nullablePrivatePhone(input.phone, scope), birthday })
}

function revealedContact(value) {
  const scope = 'Patient contact'
  const input = projected(value, ['kind', 'value', 'mask', 'isPrimary', 'sourceName', 'firstSeenAt', 'lastSeenAt'], scope)
  if (typeof input.isPrimary !== 'boolean') throw new TypeError(`${scope} response is invalid`)
  const kind = exact(input.kind, ['phone', 'email'], scope)
  const contactValue = kind === 'phone' ? privatePhone(input.value, scope) : privateEmail(input.value, scope)
  return Object.freeze({ kind, value: contactValue, mask: privateString(input.mask, scope), isPrimary: input.isPrimary, sourceName: sourceName(input.sourceName, CONTACT_SOURCE_NAMES, scope), firstSeenAt: nullableTimestamp(input.firstSeenAt, scope), lastSeenAt: nullableTimestamp(input.lastSeenAt, scope) })
}

function revealedName(value) {
  const scope = 'Patient name history'
  const input = projected(value, ['lastName', 'reason', 'sourceName', 'observedAt'], scope)
  return Object.freeze({ lastName: privateString(input.lastName, scope), reason: exact(input.reason, ['surname_change', 'source_correction'], scope), sourceName: sourceName(input.sourceName, IMPORT_SOURCE_NAMES, scope), observedAt: nullableTimestamp(input.observedAt, scope) })
}

function revealedIdentifier(value) {
  const scope = 'Patient external identifier'
  const input = projected(value, ['system', 'value', 'isPrimary', 'sourceName', 'sourceRow'], scope)
  if (typeof input.isPrimary !== 'boolean') throw new TypeError(`${scope} response is invalid`)
  return Object.freeze({ system: exact(input.system, ['medesk_ehr', 'clinic_card', 'legacy_system'], scope), value: privateString(input.value, scope), isPrimary: input.isPrimary, sourceName: sourceName(input.sourceName, IMPORT_SOURCE_NAMES, scope), sourceRow: nonnegativeInteger(input.sourceRow, scope) })
}

function revealedConsent(value) {
  const scope = 'Patient consent'
  const input = projected(value, ['type', 'status', 'sourceName', 'observedAt'], scope)
  return Object.freeze({ type: exact(input.type, ['sms_notifications'], scope), status: exact(input.status, ['granted', 'not_granted'], scope), sourceName: sourceName(input.sourceName, IMPORT_SOURCE_NAMES, scope), observedAt: nullableTimestamp(input.observedAt, scope) })
}

function revealedAttachment(value, state) {
  const scope = 'Patient attachment'
  const input = projected(value, ['id', 'kind', 'url', 'metadata', 'sourceName', 'createdAt'], scope)
  return Object.freeze({ id: safeUuid(input.id, scope), kind: attachmentKind(input.kind, scope), url: plainValue(input.url, 0, state), metadata: plainValue(input.metadata, 0, state), sourceName: sourceName(input.sourceName, ATTACHMENT_SOURCE_NAMES, scope), createdAt: safeTimestamp(input.createdAt, scope) })
}

function revealedVisit(value, state) {
  const scope = 'Historical visit reveal'
  const input = projected(value, ['id', 'appointmentId', 'doctor', 'details'], scope)
  const details = plainValue(input.details, 0, state)
  if (details !== null && (typeof details !== 'object' || Array.isArray(details))) throw new TypeError(`${scope} response is invalid`)
  return Object.freeze({ id: safeUuid(input.id, scope), appointmentId: nullablePrivateString(input.appointmentId, scope), doctor: nullablePrivateString(input.doctor, scope), details })
}

function expandedReveal(value, expectedId) {
  const state = { work: 0 }
  consumeRevealWork(state)
  const input = projected(value, REVEAL_FIELDS, 'Patient reveal')
  const id = safeUuid(input.id, 'Patient reveal')
  if (id !== expectedId) throw new TypeError('Patient reveal is invalid')
  consumeRevealWork(state)
  const result = Object.freeze({ id, profile: revealedProfile(input.profile), contacts: revealArray(input.contacts, revealedContact, 'Patient contact', state), previousLastNames: revealArray(input.previousLastNames, revealedName, 'Patient name history', state), externalIdentifiers: revealArray(input.externalIdentifiers, revealedIdentifier, 'Patient external identifier', state), privateData: plainValue(input.privateData, 0, state), consents: revealArray(input.consents, revealedConsent, 'Patient consent', state), attachments: revealArray(input.attachments, (attachment) => revealedAttachment(attachment, state), 'Patient attachment', state), historicalVisits: revealArray(input.historicalVisits, (visit) => revealedVisit(visit, state), 'Historical visit reveal', state), revealedAt: safeTimestamp(input.revealedAt, 'Patient reveal') })
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > MAX_REVEAL_JSON_BYTES) throw new TypeError('Patient reveal is invalid')
  return result
}

function reveal(value, expectedId) {
  const phone = value === null || typeof value !== 'object' ? undefined : Object.getOwnPropertyDescriptor(value, 'phone')?.value
  if (phone === undefined) return expandedReveal(value, expectedId)
  const input = projected(value, ['id', 'phone', 'revealedAt'], 'Patient reveal')
  const id = safeUuid(input.id, 'Patient reveal')
  if (id !== expectedId) throw new TypeError('Patient reveal is invalid')
  return Object.freeze({ id, phone: privatePhone(input.phone, 'Patient reveal'), revealedAt: safeTimestamp(input.revealedAt, 'Patient reveal') })
}

function destruction(value, expectedId) {
  const input = projected(value, ['id', 'destroyedAt', 'alreadyDestroyed'], 'Patient destruction')
  const id = safeUuid(input.id, 'Patient destruction')
  if (id !== expectedId || typeof input.alreadyDestroyed !== 'boolean') throw new TypeError('Patient destruction is invalid')
  return Object.freeze({ id, destroyedAt: safeTimestamp(input.destroyedAt, 'Patient destruction'), alreadyDestroyed: input.alreadyDestroyed })
}

function options(input, defaults) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Patient endpoint options must be a plain object')
  const records = input.records
  const guard = input.guard ?? defaults.guard
  const actor = input.actor ?? defaults.actor
  const body = input.body ?? defaults.body
  const log = input.log ?? defaults.log
  const calls = input.calls
  const history = input.history
  if (![records, guard, actor, body, log].every((value) => typeof value === 'function')) throw new TypeError('Patient endpoint adapters are invalid')
  if (calls !== undefined && typeof calls !== 'function') throw new TypeError('Patient call adapter is invalid')
  if (history !== undefined && typeof history !== 'function') throw new TypeError('Patient history adapter is invalid')
  return Object.freeze({ records, guard, actor, body, log, calls, history })
}

function knownFailure(error) {
  if (!isPatientRecordError(error) && !isPatientHistoryRecordError(error)) return undefined
  if (error.code === 'PATIENT_NOT_FOUND') return failure(404, error.code, 'Пациент не найден')
  if (error.code === 'PATIENT_PII_DESTROYED') return failure(410, error.code, 'Персональные данные пациента уничтожены')
  return undefined
}

function validationFailure(error) {
  if (!isAdminClinicQueryError(error)) return undefined
  const body = error.code === 'INVALID_BODY'
  return failure(400, error.code, body ? 'Проверьте подтверждение операции' : 'Проверьте параметры запроса')
}

function report(configuration, stage) {
  try {
    configuration.log(stage)
  } catch {
    return
  }
}

function unavailable(configuration, stage) {
  report(configuration, stage)
  return failure(503, 'PATIENTS_UNAVAILABLE', 'Данные пациентов временно недоступны')
}

async function guarded(configuration, request, stage) {
  try {
    const blocked = await configuration.guard(request)
    return blocked ? noStore(blocked) : undefined
  } catch {
    return unavailable(configuration, stage)
  }
}

async function requestBody(configuration, request, stage) {
  try {
    return Object.freeze({ parsed: await configuration.body(request), response: undefined })
  } catch {
    return Object.freeze({ parsed: undefined, response: unavailable(configuration, stage) })
  }
}

function endpointFailure(configuration, stage, error) {
  const validation = validationFailure(error)
  if (validation) return validation
  const known = knownFailure(error)
  if (known) return known
  return unavailable(configuration, stage)
}

const DEFAULTS = Object.freeze({ guard: guardAdminRead, actor: adminActor, body: readAdminJson, log: (stage) => console.error('[admin/patients]', stage) })
const PII_DEFAULTS = Object.freeze({ ...DEFAULTS, guard: guardAdminPii })

/**
 * Creates the protected patient list endpoint.
 */
export function createPatientIndexEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function patientIndexEndpoint({ request }) {
    const blocked = await guarded(configuration, request, 'LIST_FAILED')
    if (blocked) return blocked
    try {
      const query = parsePatientQuery(new URL(request.url).searchParams)
      const repository = configuration.records()
      return json(await patientPage(configuration, await repository.list(query)), 200)
    } catch (error) {
      return endpointFailure(configuration, 'LIST_FAILED', error)
    }
  }
}

/**
 * Creates the protected patient detail endpoint.
 */
export function createPatientDetailEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function patientDetailEndpoint({ request, params }) {
    const blocked = await guarded(configuration, request, 'DETAIL_FAILED')
    if (blocked) return blocked
    try {
      const id = parsePatientId(params?.id)
      const query = parsePatientDetailQuery(new URL(request.url).searchParams)
      const repository = configuration.records()
      const patient = safePatient(await repository.get({ id }), id)
      const result = { data: patient }
      if (configuration.history !== undefined) {
        const history = configuration.history()
        if (!history || typeof history.summaries !== 'function' || typeof history.visits !== 'function' || typeof history.issues !== 'function' || typeof history.attachments !== 'function') throw new TypeError('Patient history repository is invalid')
        const [summaryResult, visits, issues, attachments] = await Promise.all([history.summaries({ ids: [id] }), history.visits({ ...query.visits, patientId: id }), history.issues({ ...query.issues, patientId: id }), history.attachments({ patientId: id })])
        const summaries = denseArray(summaryResult, 1, 'Patient counts')
        if (summaries.length !== 1) throw new TypeError('Patient history response is invalid')
        result.data = Object.freeze({ ...patient, ...safeCounts(summaries[0], id) })
        result.history = Object.freeze({ visits: safeHistoryPage(visits, safeVisit, 'Patient visit'), issues: safeHistoryPage(issues, safeIssue, 'Patient issue'), attachments: Object.freeze(denseArray(attachments, 2_000, 'Patient attachment').map(safeAttachment)) })
      }
      if (configuration.calls !== undefined) {
        const calls = configuration.calls()
        if (!calls || typeof calls.list !== 'function') throw new TypeError('Patient call repository is invalid')
        result.calls = safeCallPage(await calls.list({ ...query.calls, patientId: id }))
      }
      return json(Object.freeze(result), 200)
    } catch (error) {
      return endpointFailure(configuration, 'DETAIL_FAILED', error)
    }
  }
}

/**
 * Creates the separately limited and audited patient reveal endpoint.
 */
export function createPatientRevealEndpoint(input) {
  const configuration = options(input, PII_DEFAULTS)
  return async function patientRevealEndpoint({ request, params }) {
    const blocked = await guarded(configuration, request, 'REVEAL_FAILED')
    if (blocked) return blocked
    try {
      const id = parsePatientId(params?.id)
      const actor = await configuration.actor(request)
      const repository = configuration.history === undefined ? configuration.records() : configuration.history()
      if (!repository || typeof repository.reveal !== 'function') throw new TypeError('Patient reveal repository is invalid')
      return json({ data: reveal(await repository.reveal({ id, actor }), id) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'REVEAL_FAILED', error)
    }
  }
}

/**
 * Creates the confirmed, separately limited patient PII destruction endpoint.
 */
export function createPatientPersonalDataEndpoint(input) {
  const configuration = options(input, PII_DEFAULTS)
  return async function patientPersonalDataEndpoint({ request, params }) {
    const blocked = await guarded(configuration, request, 'DESTROY_FAILED')
    if (blocked) return blocked
    const body = await requestBody(configuration, request, 'DESTROY_FAILED')
    if (body.response) return body.response
    try {
      const parsed = body.parsed
      if (!parsed.valid) return noStore(parsed.tooLarge ? failure(413, 'BODY_TOO_LARGE', 'Тело запроса превышает допустимый размер') : failure(400, 'INVALID_JSON', 'Передайте корректный JSON'))
      parseDestroyPatientBody(parsed.value)
      const id = parsePatientId(params?.id)
      const actor = await configuration.actor(request)
      const repository = configuration.history === undefined ? configuration.records() : configuration.history()
      if (!repository || typeof repository.destroy !== 'function') throw new TypeError('Patient destruction repository is invalid')
      return json({ data: destruction(await repository.destroy({ id, actor }), id) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'DESTROY_FAILED', error)
    }
  }
}
