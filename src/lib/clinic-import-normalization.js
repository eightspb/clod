import { normalizeContactPhone } from './contact-identity.js'

const MEDESK_EHR_PATTERN = /^(?:[0-9]{16}|[0-9]{4}(?:-[0-9]{4}){3})$/
const NATIONAL_PHONE_PATTERN = /^[1-9][0-9]{9}$/
const PASSPORT_PATTERN = /^[0-9 -]+$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u
const SOURCE_PATH_PATTERN = /[/\\]/u
const CONTROL_OR_FORMAT_PATTERN = /[\p{Cc}\p{Cf}]/u
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_UTC_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/
const DMY_DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/
const BIRTH_YEAR_MIN = 1900
const BIRTH_YEAR_MAX = 2013
const BIRTH_DATE_PLACEHOLDER = '2023-12-15'
const ONE_DAY_MS = 86_400_000
const MAX_IMPORT_TEXT_UTF16 = 8_192
const MAX_IMPORT_TEXT_CODE_POINTS = 4_096
const PD_GENDERS = new Map([['муж.', 'male']])
const MEDESK_GENDERS = new Map([['мужчина', 'male'], ['женщина', 'female']])
const ERROR_CODES = new Set(['INVALID_TEXT', 'INVALID_CLINIC_CARD', 'INVALID_MEDESK_EHR', 'INVALID_PHONE', 'INVALID_EMAIL', 'INVALID_PASSPORT', 'INVALID_SOURCE_REFERENCE', 'INVALID_DATE', 'INVALID_BIRTH_DATE_SOURCES', 'INVALID_GENDER_SOURCES'])

/**
 * Represents a source-normalization failure without retaining the rejected value.
 */
export class ClinicImportNormalizationError extends Error {
  constructor(code) {
    super('Clinic import value is invalid')
    this.name = 'ClinicImportNormalizationError'
    this.code = ERROR_CODES.has(code) ? code : 'INVALID_VALUE'
    Object.freeze(this)
  }
}

function invalid(code) {
  throw new ClinicImportNormalizationError(code)
}

function plainRecord(value, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(code)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid(code)
  const result = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (typeof key !== 'string' || !descriptor || !Object.hasOwn(descriptor, 'value')) invalid(code)
    result[key] = descriptor.value
  }
  return result
}

function freezeArray(values) {
  return Object.freeze(values.map((value) => Object.freeze(value)))
}

function unsafeSourceCharacter(value) {
  const code = value.codePointAt(0)
  return code <= 31 || code === 127
}

function realDate(value) {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const instant = new Date(Date.UTC(year, month - 1, day))
  return instant.getUTCFullYear() === year && instant.getUTCMonth() === month - 1 && instant.getUTCDate() === day
}

function directDate(value) {
  const text = normalizeImportText(value)
  if (text === null) return null
  const iso = ISO_DATE_PATTERN.exec(text)
  if (iso && realDate(text)) return text
  const dmy = DMY_DATE_PATTERN.exec(text)
  if (!dmy) invalid('INVALID_DATE')
  const normalized = `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  if (!realDate(normalized)) invalid('INVALID_DATE')
  return normalized
}

function candidate(source, raw, parser) {
  if (raw === undefined || raw === null || (typeof raw === 'string' && normalizeImportText(raw) === null)) return Object.freeze({ source, value: null, status: 'empty', reason: null })
  let value
  try {
    value = parser(raw)
  } catch (error) {
    if (!(error instanceof ClinicImportNormalizationError)) throw error
    return Object.freeze({ source, value: null, status: 'rejected', reason: error.code === 'UNSUPPORTED_DATE_FORMAT' ? 'unsupported_format' : 'invalid_date' })
  }
  if (value === BIRTH_DATE_PLACEHOLDER) return Object.freeze({ source, value: null, status: 'rejected', reason: 'placeholder' })
  const year = Number(value.slice(0, 4))
  if (year < BIRTH_YEAR_MIN || year > BIRTH_YEAR_MAX) return Object.freeze({ source, value: null, status: 'rejected', reason: 'year_out_of_range' })
  return Object.freeze({ source, value, status: 'candidate', reason: null })
}

function pdCandidate(raw) {
  if (raw === undefined || raw === null || (typeof raw === 'string' && normalizeImportText(raw) === null)) return Object.freeze({ source: 'pd_csv', value: null, status: 'empty', reason: null })
  return Object.freeze({ source: 'pd_csv', value: null, status: 'rejected', reason: 'unsupported_format' })
}

function dayDistance(first, second) {
  return Math.abs(Date.parse(`${first}T00:00:00.000Z`) - Date.parse(`${second}T00:00:00.000Z`)) / ONE_DAY_MS
}

function ignoredReason(selected, candidateValue) {
  if (selected === candidateValue) return 'duplicate'
  if (dayDistance(selected, candidateValue) === 1) return 'shifted_derivative'
  return 'lower_priority'
}

function genderValue(raw, accepted) {
  const text = normalizeImportText(raw)
  if (text === null) return Object.freeze({ value: null, status: 'empty', reason: null })
  const canonical = text.toLocaleLowerCase('ru-RU')
  if (accepted.has(canonical)) return Object.freeze({ value: accepted.get(canonical), status: 'candidate', reason: null })
  return Object.freeze({ value: null, status: 'rejected', reason: 'unsupported_value' })
}

function inferredGenderValue(raw) {
  const text = normalizeImportText(raw)
  if (text === null) return Object.freeze({ value: null, status: 'empty', reason: null })
  const canonical = text.toLocaleLowerCase('ru-RU')
  if (/(?:ович|евич|ич)$/u.test(canonical)) return Object.freeze({ value: 'male', status: 'candidate', reason: null })
  if (/(?:овна|евна|инична|ична)$/u.test(canonical)) return Object.freeze({ value: 'female', status: 'candidate', reason: null })
  return Object.freeze({ value: null, status: 'empty', reason: null })
}

export function normalizeImportText(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') invalid('INVALID_TEXT')
  if (value.length > MAX_IMPORT_TEXT_UTF16) invalid('INVALID_TEXT')
  if (CONTROL_OR_FORMAT_PATTERN.test(value)) invalid('INVALID_TEXT')
  const normalized = value.normalize('NFC').replaceAll(/\s+/gu, ' ').trim()
  if (normalized.length === 0) return null
  if ([...normalized].length > MAX_IMPORT_TEXT_CODE_POINTS) invalid('INVALID_TEXT')
  return normalized
}

export function normalizeClinicCard(value) {
  const normalized = normalizeImportText(value)
  if (normalized !== null && [...normalized].length > 100) invalid('INVALID_CLINIC_CARD')
  return normalized
}

export function normalizeMedeskEhr(value) {
  const normalized = normalizeImportText(value)
  if (normalized === null) return null
  if (!MEDESK_EHR_PATTERN.test(normalized)) invalid('INVALID_MEDESK_EHR')
  return normalized.replaceAll('-', '')
}

export function normalizeImportPhone(value) {
  const normalized = normalizeImportText(value)
  if (normalized === null) return null
  const digits = normalized.replaceAll(/[^0-9]/g, '')
  const candidate = NATIONAL_PHONE_PATTERN.test(digits) ? `+7${digits}` : normalized
  try {
    return normalizeContactPhone(candidate)
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
    invalid('INVALID_PHONE')
  }
}

export function normalizeImportEmail(value) {
  const normalized = normalizeImportText(value)
  if (normalized === null) return null
  const email = normalized.toLowerCase()
  if ([...email].length > 320 || !EMAIL_PATTERN.test(email)) invalid('INVALID_EMAIL')
  return email
}

export function normalizePassportDigits(value) {
  const normalized = normalizeImportText(value)
  if (normalized === null) return null
  if (!PASSPORT_PATTERN.test(normalized)) invalid('INVALID_PASSPORT')
  const digits = normalized.replaceAll(/[ -]/g, '')
  if (digits.length < 1 || digits.length > 32) invalid('INVALID_PASSPORT')
  return digits
}

export function sourceReference(value) {
  const input = plainRecord(value, 'INVALID_SOURCE_REFERENCE')
  const keys = Object.keys(input)
  if (keys.length !== 2 || !Object.hasOwn(input, 'sourceName') || !Object.hasOwn(input, 'sourceRow')) invalid('INVALID_SOURCE_REFERENCE')
  const sourceName = normalizeImportText(input.sourceName)
  if (sourceName === null || [...sourceName].length > 255 || SOURCE_PATH_PATTERN.test(sourceName) || [...sourceName].some(unsafeSourceCharacter) || sourceName === '.' || sourceName === '..') invalid('INVALID_SOURCE_REFERENCE')
  if (!Number.isSafeInteger(input.sourceRow) || input.sourceRow < 1) invalid('INVALID_SOURCE_REFERENCE')
  return Object.freeze({ sourceName, sourceRow: input.sourceRow })
}

export function normalizeUtcDatePrefix(value) {
  const normalized = normalizeImportText(value)
  if (normalized === null) invalid('INVALID_DATE')
  const utc = ISO_UTC_DATE_TIME_PATTERN.exec(normalized)
  const prefix = ISO_DATE_PATTERN.test(normalized) ? normalized : utc?.[1]
  if (prefix === undefined) invalid('INVALID_DATE')
  if (!realDate(prefix)) invalid('INVALID_DATE')
  return prefix
}

export function selectBirthDate(value = {}) {
  const input = plainRecord(value, 'INVALID_BIRTH_DATE_SOURCES')
  const allowed = new Set(['pd', 'patientsUtc', 'pdXlsx', 'medesk'])
  if (Object.keys(input).some((key) => !allowed.has(key))) invalid('INVALID_BIRTH_DATE_SOURCES')
  const candidates = []
  if (Object.hasOwn(input, 'pd')) candidates.push(pdCandidate(input.pd))
  candidates.push(candidate('patients_csv', input.patientsUtc, normalizeUtcDatePrefix))
  candidates.push(candidate('pd_xlsx', input.pdXlsx, directDate))
  candidates.push(candidate('medesk_csv', input.medesk, directDate))
  const selected = candidates.find(({ status }) => status === 'candidate') ?? null
  const ignoredCandidates = []
  const provenance = candidates.map((entry) => {
    if (entry.status !== 'candidate') return Object.freeze({ source: entry.source, status: entry.status, reason: entry.reason })
    if (entry === selected) return Object.freeze({ source: entry.source, status: 'selected', reason: null })
    const reason = ignoredReason(selected.value, entry.value)
    ignoredCandidates.push({ source: entry.source, value: entry.value, reason })
    return Object.freeze({ source: entry.source, status: 'ignored', reason })
  })
  return Object.freeze({ value: selected?.value ?? null, source: selected?.source ?? null, provenance: freezeArray(provenance), ignoredCandidates: freezeArray(ignoredCandidates) })
}

export function inferGenderFromPatronymic(value) {
  const candidate = inferredGenderValue(value)
  return Object.freeze({ value: candidate.value, source: candidate.value === null ? null : 'patronymic', inferred: candidate.value !== null })
}

export function selectGender(value = {}) {
  const input = plainRecord(value, 'INVALID_GENDER_SOURCES')
  const allowed = new Set(['pd', 'medesk', 'patronymic'])
  if (Object.keys(input).some((key) => !allowed.has(key))) invalid('INVALID_GENDER_SOURCES')
  const candidates = [Object.freeze({ source: 'pd_csv', inferred: false, ...genderValue(input.pd, PD_GENDERS) }), Object.freeze({ source: 'patronymic', inferred: true, ...inferredGenderValue(input.patronymic) }), Object.freeze({ source: 'medesk_csv', inferred: false, ...genderValue(input.medesk, MEDESK_GENDERS) })]
  const selected = candidates.find(({ status }) => status === 'candidate') ?? null
  const provenance = candidates.map((entry) => {
    if (entry.status !== 'candidate') return Object.freeze({ source: entry.source, status: entry.status, reason: entry.reason })
    if (entry === selected) return Object.freeze({ source: entry.source, status: 'selected', reason: null })
    return Object.freeze({ source: entry.source, status: 'ignored', reason: 'lower_priority' })
  })
  return Object.freeze({ value: selected?.value ?? null, source: selected?.source ?? null, inferred: selected?.inferred ?? false, provenance: freezeArray(provenance) })
}
