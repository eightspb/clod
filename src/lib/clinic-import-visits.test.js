import { describe, expect, it } from 'vitest'
import { resolveClinicImportIdentities } from './clinic-import-identities.js'
import { resolveClinicImportVisits } from './clinic-import-visits.js'
import { encryptProtectedData } from './protected-patient-data.js'

const FINGERPRINT_KEY = 'clinic-import-synthetic-fingerprint-key-2026-visit-tests'
const SECOND_FINGERPRINT_KEY = 'clinic-import-second-fingerprint-key-2026-visit-tests'
const SOURCE_NAME = 'synthetic-visits.csv'
const FIRST_PATIENT_ID = '00000000-0000-8000-8000-000000000001'
const SECOND_PATIENT_ID = '00000000-0000-8000-8000-000000000002'
const THIRD_PATIENT_ID = '00000000-0000-8000-8000-000000000003'
const FIRST_EHR = '0000000000007001'
const DUPLICATE_APPOINTMENT = 'synthetic-appointment-duplicate'
const PROTECTED_JSON_MAX_BYTES = 65_536
const ENCRYPTION_KEY = Buffer.from('visit-detail-encryption-key-2026').toString('base64')
const FIXED_IV = Buffer.from('0102030405060708090a0b0c', 'hex')
const EMPTY_STATUS_ROWS = Object.freeze([31, 32, 33, 34, 35, 36])
const MALFORMED_END_DATES = Object.freeze(['не-дата', '2024-02-30T09:45:00.000Z', '2024-02-29 09:45', '2024-02-29T09:45:00Z'])
const VISIT_VALUE_KEYS = Object.freeze(['appointment_id', 'appointment_begin', 'appointment_end', 'cabinet', 'status', 'patient_card', 'doctor', 'doctor_role', 'service_names', 'invoice_ids', 'comment'])

function patient(id, lastName, firstName, middleName) {
  return Object.freeze({ id, profile: Object.freeze({ lastName, firstName, middleName, birthDate: null, gender: null, primaryPhone: null }), firstSeenAt: '2020-01-01T00:00:00.000Z', lastSeenAt: '2025-01-01T00:00:00.000Z', isSupplemental: false })
}

function identifier(patientId, system, value, suffix) {
  return Object.freeze({ id: `10000000-0000-8000-8000-${String(suffix).padStart(12, '0')}`, patientId, system, value })
}

function contact(patientId, value, suffix) {
  return Object.freeze({ id: `20000000-0000-8000-8000-${String(suffix).padStart(12, '0')}`, patientId, kind: 'phone', value })
}

function history(patientId, lastName, suffix) {
  return Object.freeze({ id: `30000000-0000-8000-8000-${String(suffix).padStart(12, '0')}`, patientId, lastName })
}

function generatedPatientId(index) {
  return `40000000-0000-8000-8000-${String(index).padStart(12, '0')}`
}

function identities(overrides = {}) {
  return Object.freeze({ patients: Object.freeze(overrides.patients ?? []), externalIdentifiers: Object.freeze(overrides.externalIdentifiers ?? []), contacts: Object.freeze(overrides.contacts ?? []), nameHistory: Object.freeze(overrides.nameHistory ?? []), privateData: Object.freeze([]), consents: Object.freeze([]), sourceLinks: Object.freeze([]), issues: Object.freeze([]), evidenceCounts: Object.freeze({}) })
}

function identityRow() {
  return Object.freeze({ source: Object.freeze({ sourceName: 'synthetic-patients.csv', sourceRow: 2 }), ehr: FIRST_EHR, clinicCard: 'ИНТ-2', profile: Object.freeze({ lastName: 'Интеграционная', firstName: 'Ия', middleName: 'Олеговна', birthDate: '1988-02-29', gender: 'female' }), contacts: Object.freeze([]), identifiers: Object.freeze({ inn: null, snils: null, passport: null, contract: null }), privateData: Object.freeze({}), consents: Object.freeze([]), observedAt: '2024-01-02T10:00:00.000Z', sourcePriority: 10 })
}

function values(overrides = {}) {
  return Object.freeze({ appointment_id: overrides.appointment_id ?? 'synthetic-appointment', appointment_begin: overrides.appointment_begin ?? '2024-02-29T09:15:00.000Z', appointment_end: overrides.appointment_end ?? '2024-02-29T09:45:00.000Z', cabinet: overrides.cabinet ?? 'Кабинет Ё', status: overrides.status ?? 'completed', patient_card: overrides.patient_card ?? '', doctor: overrides.doctor ?? 'Врач Синтетический', doctor_role: overrides.doctor_role ?? 'Терапевт', service_names: overrides.service_names ?? 'Синтетическая услуга', invoice_ids: overrides.invoice_ids ?? 'invoice-synthetic', comment: overrides.comment ?? '' })
}

function visit(sourceRow, overrides = {}) {
  return Object.freeze({ sourceRole: 'visits', sourceName: SOURCE_NAME, sourceRow, values: values(overrides), structuralIssues: Object.freeze(overrides.structuralIssues ?? []) })
}

function sharedVisit(sourceRow, sharedValues, structuralIssues = Object.freeze([])) {
  return Object.freeze({ sourceRole: 'visits', sourceName: SOURCE_NAME, sourceRow, values: sharedValues, structuralIssues })
}

function oversizedProtectedService() {
  const value = { ...values({ service_names: '' }), structuralIssues: Object.freeze([]) }
  const wrapper = { id: FIRST_PATIENT_ID, historicalVisitId: SECOND_PATIENT_ID, value }
  return 'X'.repeat(PROTECTED_JSON_MAX_BYTES - Buffer.byteLength(JSON.stringify(wrapper), 'utf8') + 1)
}

function resolve(identityResult, visitRows, fingerprintKey = FINGERPRINT_KEY) {
  return resolveClinicImportVisits({ identities: identityResult, visitRows, fingerprintKey })
}

function resultFor(identityResult, visitRow) {
  return resolve(identityResult, [visitRow])
}

function firstLink(result) {
  const visitRow = result.historicalVisits[0]
  return Object.freeze({ status: visitRow.linkStatus, method: visitRow.linkMethod, patientId: visitRow.patientId, evidence: visitRow.evidenceLevel, candidates: result.candidates.length })
}

function captured(operation) {
  try {
    operation()
    return Object.freeze({ returned: true, error: null })
  } catch (error) {
    return Object.freeze({ returned: false, error })
  }
}

function errorShape(result, secret) {
  return Object.freeze({ returned: result.returned, name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), leaked: result.error?.message?.includes(secret) === true || JSON.stringify(result.error).includes(secret) })
}

describe('resolveClinicImportVisits', () => {
  it('accepts the complete immutable output contract from the identity resolver', () => {
    const identityResult = resolveClinicImportIdentities({ patientRows: [identityRow()], medeskRows: [], visitReferences: [], fingerprintKey: FINGERPRINT_KEY })
    const result = resultFor(identityResult, visit(1, { patient_card: FIRST_EHR }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'exact_ehr', patientId: identityResult.patients[0].id, evidence: 'exact', candidates: 0 })
  })

  it('links one exact 16-digit EHR identifier before weaker evidence', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Лазурная', 'Ия', 'Яновна')], externalIdentifiers: [identifier(FIRST_PATIENT_ID, 'medesk_ehr', FIRST_EHR, 1), identifier(FIRST_PATIENT_ID, 'clinic_card', 'К-7001', 2)] })
    const result = resultFor(identityResult, visit(2, { patient_card: FIRST_EHR, comment: 'Чужая запись' }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'exact_ehr', patientId: FIRST_PATIENT_ID, evidence: 'exact', candidates: 0 })
  })

  it('links one exact clinic card to its unique patient identity', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Радужная', 'Ода', 'Львовна')], externalIdentifiers: [identifier(FIRST_PATIENT_ID, 'clinic_card', 'К-17/Б', 3)] })
    const result = resultFor(identityResult, visit(3, { patient_card: 'К-17/Б' }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'exact_clinic_card', patientId: FIRST_PATIENT_ID, evidence: 'strong', candidates: 0 })
  })

  it('collapses repeated clinic-card records that already belong to one identity', () => {
    const identifiers = [identifier(FIRST_PATIENT_ID, 'clinic_card', 'К-88', 4), identifier(FIRST_PATIENT_ID, 'clinic_card', 'К-88', 5)]
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Берегова', 'Эра', 'Ильинична')], externalIdentifiers: identifiers })
    const result = resultFor(identityResult, visit(4, { patient_card: 'К-88' }))
    expect({ link: firstLink(result), exactCards: result.evidenceCounts.exactClinicCard }).toEqual({ link: { status: 'linked', method: 'exact_clinic_card', patientId: FIRST_PATIENT_ID, evidence: 'strong', candidates: 0 }, exactCards: 1 })
  })

  it('marks a mixed clinic card ambiguous and retains every distinct candidate', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Тихая', 'Ася', 'Олеговна'), patient(SECOND_PATIENT_ID, 'Тихий', 'Лев', 'Олегович')], externalIdentifiers: [identifier(FIRST_PATIENT_ID, 'clinic_card', 'СМЕШ-7', 6), identifier(SECOND_PATIENT_ID, 'clinic_card', 'СМЕШ-7', 7)] })
    const result = resultFor(identityResult, visit(5, { patient_card: 'СМЕШ-7', comment: 'Тихая Ася Олеговна' }))
    expect({ link: firstLink(result), patients: result.candidates.map(({ patientId, evidenceCode }) => [patientId, evidenceCode]) }).toEqual({ link: { status: 'ambiguous', method: 'exact_clinic_card', patientId: null, evidence: 'strong', candidates: 2 }, patients: [[FIRST_PATIENT_ID, 'EXACT_CLINIC_CARD'], [SECOND_PATIENT_ID, 'EXACT_CLINIC_CARD']] })
  })

  it('repairs one leading-zero card defect only with unique comment corroboration', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Ёлкина', 'Мая', 'Рюриковна')], externalIdentifiers: [identifier(FIRST_PATIENT_ID, 'clinic_card', '731', 8)] })
    const result = resultFor(identityResult, visit(6, { patient_card: '0731', comment: 'Приём: Ёлкина Мая Рюриковна' }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'leading_zero_clinic_card', patientId: FIRST_PATIENT_ID, evidence: 'strong', candidates: 0 })
  })

  it('does not repair a leading-zero card without independent corroboration', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Ясная', 'Зоя', 'Марковна')], externalIdentifiers: [identifier(FIRST_PATIENT_ID, 'clinic_card', '842', 9)] })
    const result = resultFor(identityResult, visit(7, { patient_card: '0842', comment: 'Повторный приём' }))
    expect(firstLink(result)).toEqual({ status: 'unmatched', method: null, patientId: null, evidence: 'none', candidates: 0 })
  })

  it('links an exact phone only when the comment also contains a compatible name', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Северова', 'Ева', 'Тимуровна')], contacts: [contact(FIRST_PATIENT_ID, '79215550127', 10)] })
    const result = resultFor(identityResult, visit(8, { patient_card: 'НЕИЗВЕСТНАЯ', comment: 'Связаться: +7 (921) 555-01-27, Ева Тимуровна' }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'phone_compatible_name', patientId: FIRST_PATIENT_ID, evidence: 'strong', candidates: 0 })
  })

  it('uses first name and patronymic as compatible evidence when surname is absent', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, null, 'Эва', 'Романовна')], contacts: [contact(FIRST_PATIENT_ID, '79215550139', 14)] })
    const result = resultFor(identityResult, visit(27, { patient_card: '', comment: 'Эва Романовна, +7 921 555-01-39' }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'phone_compatible_name', patientId: FIRST_PATIENT_ID, evidence: 'strong', candidates: 0 })
  })

  it('does not link a shared or exact phone without a compatible name', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Кедрова', 'Нина', 'Павловна')], contacts: [contact(FIRST_PATIENT_ID, '79215550128', 11)] })
    const result = resultFor(identityResult, visit(9, { comment: 'Телефон +7 921 555-01-28, имя не указано' }))
    expect(firstLink(result)).toEqual({ status: 'unmatched', method: null, patientId: null, evidence: 'none', candidates: 0 })
  })

  it('links a unique exact full name from the comment including a previous surname', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Новая', 'Лёля', 'Эльдаровна')], nameHistory: [history(FIRST_PATIENT_ID, 'Прежняя', 12)] })
    const result = resultFor(identityResult, visit(10, { comment: 'Пациент: Прежняя Лёля Эльдаровна.' }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'exact_full_name', patientId: FIRST_PATIENT_ID, evidence: 'moderate', candidates: 0 })
  })

  it('marks an exact full name shared by several identities ambiguous', () => {
    const patients = [patient(FIRST_PATIENT_ID, 'Речная', 'Уна', 'Игоревна'), patient(SECOND_PATIENT_ID, 'Речная', 'Уна', 'Игоревна')]
    const result = resultFor(identities({ patients }), visit(11, { comment: 'Речная Уна Игоревна' }))
    expect({ link: firstLink(result), patientIds: result.candidates.map(({ patientId }) => patientId) }).toEqual({ link: { status: 'ambiguous', method: 'exact_full_name', patientId: null, evidence: 'moderate', candidates: 2 }, patientIds: [FIRST_PATIENT_ID, SECOND_PATIENT_ID] })
  })

  it('keeps disagreeing phone-name and exact-full-name candidate sets ambiguous', () => {
    const patients = [patient(FIRST_PATIENT_ID, 'Звёздная', 'Ася', 'Ильинична'), patient(SECOND_PATIENT_ID, 'Морской', 'Лев', 'Янович')]
    const identityResult = identities({ patients, contacts: [contact(SECOND_PATIENT_ID, '79215550144', 15)] })
    const result = resultFor(identityResult, visit(28, { comment: 'Морской Лев, +7 921 555-01-44; Звёздная Ася Ильинична' }))
    expect({ link: firstLink(result), patients: result.candidates.map(({ patientId, evidenceCode }) => [patientId, evidenceCode]) }).toEqual({ link: { status: 'ambiguous', method: 'conflicting_comment_evidence', patientId: null, evidence: 'moderate', candidates: 2 }, patients: [[FIRST_PATIENT_ID, 'CONFLICTING_COMMENT_EVIDENCE'], [SECOND_PATIENT_ID, 'CONFLICTING_COMMENT_EVIDENCE']] })
  })

  it('keeps identical multi-patient comment evidence on the higher-priority phone-name method', () => {
    const patients = [patient(FIRST_PATIENT_ID, 'Единая', 'Ия', 'Олеговна'), patient(SECOND_PATIENT_ID, 'Единая', 'Ия', 'Олеговна')]
    const contacts = [contact(FIRST_PATIENT_ID, '79215550158', 16), contact(SECOND_PATIENT_ID, '79215550158', 17)]
    const result = resultFor(identities({ patients, contacts }), visit(48, { comment: 'Единая Ия Олеговна, +7 921 555-01-58' }))
    expect({ link: firstLink(result), codes: result.candidates.map(({ evidenceCode }) => evidenceCode) }).toEqual({ link: { status: 'ambiguous', method: 'phone_compatible_name', patientId: null, evidence: 'strong', candidates: 2 }, codes: ['PHONE_COMPATIBLE_NAME', 'PHONE_COMPATIBLE_NAME'] })
  })

  it('preserves an unknown-card row as one unmatched historical visit', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Дальняя', 'Оля', 'Яковлевна')], externalIdentifiers: [identifier(FIRST_PATIENT_ID, 'clinic_card', 'ИЗВ-55', 13)] })
    const result = resultFor(identityResult, visit(12, { patient_card: 'НЕИЗВ-99' }))
    expect({ visits: result.historicalVisits.length, details: result.visitDetails.length, link: firstLink(result) }).toEqual({ visits: 1, details: 1, link: { status: 'unmatched', method: null, patientId: null, evidence: 'none', candidates: 0 } })
  })

  it('still resolves a visit with an empty card from exact full-name evidence', () => {
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Лунная', 'Ия', 'Вадимовна')] })
    const result = resultFor(identityResult, visit(13, { patient_card: '', comment: 'Лунная Ия Вадимовна' }))
    expect(firstLink(result)).toEqual({ status: 'linked', method: 'exact_full_name', patientId: FIRST_PATIENT_ID, evidence: 'moderate', candidates: 0 })
  })

  it('preserves a source row with both visit dates missing', () => {
    const result = resultFor(identities(), visit(14, { appointment_begin: '', appointment_end: '', patient_card: '' }))
    expect({ visits: result.historicalVisits.length, startsAt: result.historicalVisits[0].startsAt, endsAt: result.historicalVisits[0].endsAt, missingDates: result.evidenceCounts.missingDate }).toEqual({ visits: 1, startsAt: null, endsAt: null, missingDates: 1 })
  })

  it('captures control characters only in encryptable details and emits safe issues', () => {
    const rawService = 'Услуга\u0001с-разделителем'
    const rawComment = 'Комментарий\u200Dсо-скрытым-форматом'
    const result = resultFor(identities(), visit(30, { service_names: rawService, comment: rawComment }))
    const safeJson = JSON.stringify({ historicalVisits: result.historicalVisits, candidates: result.candidates, issues: result.issues, evidenceCounts: result.evidenceCounts })
    expect({ visits: result.historicalVisits.length, raw: [result.visitDetails[0].value.service_names, result.visitDetails[0].value.comment], issues: result.issues.map(({ code, field }) => [code, field]), count: result.evidenceCounts.controlCharValue, leaked: safeJson.includes(rawService) || safeJson.includes(rawComment) }).toEqual({ visits: 1, raw: [rawService, rawComment], issues: [['CONTROL_CHAR_VALUE', 'comment'], ['CONTROL_CHAR_VALUE', 'service_names']], count: 2, leaked: false })
  })

  it('rejects lone UTF-16 surrogates while preserving valid pairs and controls in encryptable details', () => {
    const high = 'synthetic-high-\uD800-surrogate'
    const low = 'synthetic-low-\uDC00-surrogate'
    const rejected = [captured(() => resultFor(identities(), visit(52, { service_names: high }))), captured(() => resultFor(identities(), visit(53, { comment: low })))]
    const raw = 'Допустимая пара 😀 и контроль\u0001'
    const accepted = resultFor(identities(), visit(54, { comment: raw }))
    const envelopes = accepted.visitDetails.map((detail) => encryptProtectedData({ domain: 'visit_details', value: detail, key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV }))
    expect({ rejected: rejected.map((result, index) => errorShape(result, index === 0 ? high : low)), raw: accepted.visitDetails[0].value.comment, controlIssues: accepted.evidenceCounts.controlCharValue, encrypted: envelopes.every((envelope) => /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(envelope)) }).toEqual({ rejected: [{ returned: false, name: 'ClinicImportVisitError', code: 'INVALID_VISIT_INPUT', frozen: true, leaked: false }, { returned: false, name: 'ClinicImportVisitError', code: 'INVALID_VISIT_INPUT', frozen: true, leaked: false }], raw, controlIssues: 1, encrypted: true })
  })

  it('reports oversized values for every raw detail field alongside control issues', () => {
    const oversized = 'X'.repeat(8_193)
    const controlled = `${oversized}\u0001`
    const result = resultFor(identities(), visit(49, { cabinet: oversized, doctor: oversized, doctor_role: oversized, service_names: controlled, invoice_ids: oversized }))
    expect({ raw: result.visitDetails[0].value.service_names, issues: result.issues.map(({ code, field }) => [code, field]), controls: result.evidenceCounts.controlCharValue, oversized: result.evidenceCounts.valueTooLarge }).toEqual({ raw: controlled, issues: [['CONTROL_CHAR_VALUE', 'service_names'], ['VALUE_TOO_LARGE', 'cabinet'], ['VALUE_TOO_LARGE', 'doctor'], ['VALUE_TOO_LARGE', 'doctor_role'], ['VALUE_TOO_LARGE', 'invoice_ids'], ['VALUE_TOO_LARGE', 'service_names']], controls: 1, oversized: 5 })
  })

  it('rejects a visit detail whose complete protected JSON envelope exceeds 65,536 bytes', () => {
    const service = oversizedProtectedService()
    const accepted = resultFor(identities(), visit(50, { service_names: service.slice(1) }))
    const envelope = encryptProtectedData({ domain: 'visit_details', value: accepted.visitDetails[0], key: ENCRYPTION_KEY, randomBytes: () => FIXED_IV })
    const rejected = captured(() => resultFor(identities(), visit(51, { service_names: service })))
    expect({ acceptedBytes: Buffer.byteLength(JSON.stringify(accepted.visitDetails[0]), 'utf8'), encrypted: envelope.startsWith('v1.'), rejected: errorShape(rejected, service.slice(0, 64)) }).toEqual({ acceptedBytes: PROTECTED_JSON_MAX_BYTES, encrypted: true, rejected: { returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false } })
  })

  it('captures every malformed end date while deriving null safe timestamps', () => {
    const visitRows = MALFORMED_END_DATES.map((appointment_end, index) => visit(40 + index, { appointment_id: `invalid-end-${index}`, appointment_end }))
    const result = resolve(identities(), visitRows)
    expect({ visits: result.historicalVisits.length, ends: result.historicalVisits.map(({ endsAt }) => endsAt), raw: result.visitDetails.map(({ value }) => value.appointment_end), issues: result.issues.map(({ code }) => code), count: result.evidenceCounts.invalidEndDate }).toEqual({ visits: 4, ends: [null, null, null, null], raw: MALFORMED_END_DATES, issues: ['INVALID_END_DATE', 'INVALID_END_DATE', 'INVALID_END_DATE', 'INVALID_END_DATE'], count: 4 })
  })

  it('retains a padded short physical row and exposes only its safe issue code', () => {
    const structuralIssues = [Object.freeze({ code: 'SHORT_ROW', actualWidth: 9, expectedWidth: 11 })]
    const result = resultFor(identities(), visit(44, { structuralIssues }))
    expect({ visits: result.historicalVisits.length, rawIssue: result.visitDetails[0].value.structuralIssues[0], safeIssue: result.issues[0], count: result.evidenceCounts.shortRow }).toEqual({ visits: 1, rawIssue: structuralIssues[0], safeIssue: { id: result.issues[0].id, historicalVisitId: result.historicalVisits[0].id, code: 'SHORT_ROW', field: null }, count: 1 })
  })

  it('preserves all six source rows with empty statuses', () => {
    const visits = EMPTY_STATUS_ROWS.map((sourceRow) => visit(sourceRow, { status: '', appointment_id: `empty-status-${sourceRow}` }))
    const result = resolve(identities(), visits)
    expect({ visits: result.historicalVisits.length, statuses: result.historicalVisits.map(({ sourceStatus }) => sourceStatus), emptyStatuses: result.evidenceCounts.emptyStatus }).toEqual({ visits: 6, statuses: ['', '', '', '', '', ''], emptyStatuses: 6 })
  })

  it('projects only allowlisted normalized source-status codes and keeps raw statuses in details', () => {
    const rawStatuses = [' completed ', 'CANCELLED', 'Confirmed', 'NoShow', 'tentative', 'synthetic-private-state']
    const result = resolve(identities(), rawStatuses.map((status, index) => visit(60 + index, { appointment_id: `status-${index}`, status })))
    const safeJson = JSON.stringify({ historicalVisits: result.historicalVisits, candidates: result.candidates, issues: result.issues, evidenceCounts: result.evidenceCounts })
    expect({ safe: result.historicalVisits.map(({ sourceStatus }) => sourceStatus), raw: result.visitDetails.map(({ value }) => value.status), leaked: safeJson.includes(rawStatuses.at(-1)) }).toEqual({ safe: ['completed', 'cancelled', 'confirmed', 'noshow', 'tentative', 'unknown'], raw: rawStatuses, leaked: false })
  })

  it('retains two source rows with one appointment ID and no unique constraint', () => {
    const visits = [visit(15, { appointment_id: DUPLICATE_APPOINTMENT }), visit(16, { appointment_id: DUPLICATE_APPOINTMENT })]
    const result = resolve(identities(), visits)
    expect({ visits: result.historicalVisits.length, ids: new Set(result.historicalVisits.map(({ id }) => id)).size, fingerprints: new Set(result.historicalVisits.map(({ appointmentIdFingerprint }) => appointmentIdFingerprint)).size }).toEqual({ visits: 2, ids: 2, fingerprints: 1 })
  })

  it('keeps raw visit values only in the separate encryptable details collection', () => {
    const secret = 'Секретный комментарий о визите'
    const result = resultFor(identities(), visit(17, { patient_card: 'СКРЫТО-17', comment: secret }))
    const safeJson = JSON.stringify({ historicalVisits: result.historicalVisits, candidates: result.candidates, evidenceCounts: result.evidenceCounts })
    expect({ safeLeak: safeJson.includes(secret) || safeJson.includes('СКРЫТО-17'), detail: result.visitDetails[0].value.comment, frozen: Object.isFrozen(result.visitDetails[0].value) }).toEqual({ safeLeak: false, detail: secret, frozen: true })
  })

  it('returns deterministically sorted immutable output with stable keyed UUIDs', () => {
    const visitRows = [visit(22, { appointment_id: 'later-row' }), visit(21, { appointment_id: 'earlier-row' })]
    const results = [resolve(identities(), visitRows), resolve(identities(), [...visitRows].reverse())]
    const frozen = [results[0], results[0].historicalVisits, results[0].historicalVisits[0], results[0].historicalVisits[0].issueCodes, results[0].visitDetails, results[0].visitDetails[0], results[0].candidates, results[0].issues, results[0].evidenceCounts].every(Object.isFrozen)
    expect({ sources: results[0].historicalVisits.map(({ sourceRow }) => sourceRow), ids: results.map(({ historicalVisits }) => historicalVisits.map(({ id }) => id)), frozen }).toEqual({ sources: [21, 22], ids: [results[0].historicalVisits.map(({ id }) => id), results[0].historicalVisits.map(({ id }) => id)], frozen: true })
  })

  it('domain-separates stable visit UUIDs with the injected key', () => {
    const visitRow = visit(23, { appointment_id: 'keyed-row' })
    const ids = [resolve(identities(), [visitRow], FINGERPRINT_KEY).historicalVisits[0].id, resolve(identities(), [visitRow], SECOND_FINGERPRINT_KEY).historicalVisits[0].id]
    expect({ distinct: new Set(ids).size, uuid: ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) }).toEqual({ distinct: 2, uuid: true })
  })

  it('sorts ambiguous candidates independently of patient input order', () => {
    const patients = [patient(THIRD_PATIENT_ID, 'Общая', 'Ада', 'Романовна'), patient(FIRST_PATIENT_ID, 'Общая', 'Ада', 'Романовна'), patient(SECOND_PATIENT_ID, 'Общая', 'Ада', 'Романовна')]
    const result = resultFor(identities({ patients }), visit(24, { comment: 'Общая Ада Романовна' }))
    expect(result.candidates.map(({ patientId }) => patientId)).toEqual([FIRST_PATIENT_ID, SECOND_PATIENT_ID, THIRD_PATIENT_ID])
  })

  it('sorts Unicode source coordinates by code point independently of input order', () => {
    const visits = [visit(46, { appointment_id: 'yo-source' }), visit(45, { appointment_id: 'ya-source' })]
    const renamed = [Object.freeze({ ...visits[0], sourceName: 'ё-визиты.csv' }), Object.freeze({ ...visits[1], sourceName: 'я-визиты.csv' })]
    const orders = [renamed, [...renamed].reverse()].map((rows) => resolve(identities(), rows).historicalVisits.map(({ sourceName }) => sourceName))
    expect(orders).toEqual([['я-визиты.csv', 'ё-визиты.csv'], ['я-визиты.csv', 'ё-визиты.csv']])
  })

  it('rejects one pathological card bucket before materializing every candidate', () => {
    const patients = Array.from({ length: 2_049 }, (_, index) => patient(generatedPatientId(index + 1), `Синтетическая-${index}`, 'Ия', 'Олеговна'))
    const externalIdentifiers = patients.map(({ id }, index) => identifier(id, 'clinic_card', 'ВЕЕР-2049', 10_000 + index))
    const result = captured(() => resultFor(identities({ patients, externalIdentifiers }), visit(47, { patient_card: 'ВЕЕР-2049' })))
    expect(errorShape(result, 'ВЕЕР-2049')).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('rejects an oversized name-index bucket even when there are no visit candidates to materialize', () => {
    const patients = Array.from({ length: 2_049 }, (_, index) => patient(generatedPatientId(index + 1), 'Общая', 'Ия', 'Олеговна'))
    const result = captured(() => resolve(identities({ patients }), []))
    expect(errorShape(result, 'Общая')).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('rejects identities that assign one global EHR identifier to different patients', () => {
    const patients = [patient(FIRST_PATIENT_ID, 'Первая', 'Ия', 'Олеговна'), patient(SECOND_PATIENT_ID, 'Вторая', 'Ия', 'Олеговна')]
    const externalIdentifiers = [identifier(FIRST_PATIENT_ID, 'medesk_ehr', FIRST_EHR, 30_001), identifier(SECOND_PATIENT_ID, 'medesk_ehr', FIRST_EHR, 30_002)]
    const result = captured(() => resolve(identities({ patients, externalIdentifiers }), []))
    expect(errorShape(result, FIRST_EHR)).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'VISIT_INVARIANT_FAILED', frozen: true, leaked: false })
  })

  it('rejects aggregate ambiguous-candidate work before candidate HMAC expansion', () => {
    const patients = [patient(FIRST_PATIENT_ID, 'Сводная', 'Ия', 'Олеговна'), patient(SECOND_PATIENT_ID, 'Сводный', 'Лев', 'Олегович')]
    const externalIdentifiers = [identifier(FIRST_PATIENT_ID, 'clinic_card', 'ОБЩ-2', 20_001), identifier(SECOND_PATIENT_ID, 'clinic_card', 'ОБЩ-2', 20_002)]
    const visitRows = Array.from({ length: 10_001 }, (_, index) => visit(100 + index, { appointment_id: '', patient_card: 'ОБЩ-2' }))
    const result = captured(() => resolve(identities({ patients, externalIdentifiers }), visitRows))
    expect(errorShape(result, 'ОБЩ-2')).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('rejects aggregate HMAC work before deriving an excessive number of IDs', () => {
    const controlled = values({ appointment_id: 'А\u0001', appointment_begin: `${'Б'.repeat(65)}\u0001`, appointment_end: `${'В'.repeat(65)}\u0001`, cabinet: 'Г\u0001', status: `${'Д'.repeat(129)}\u0001`, patient_card: `${'1'.repeat(201)}\u0001`, doctor: 'Е\u0001', doctor_role: 'Ж\u0001', service_names: 'З\u0001', invoice_ids: 'И\u0001', comment: 'К\u0001' })
    const structuralIssues = Object.freeze([Object.freeze({ code: 'SHORT_ROW', actualWidth: 10, expectedWidth: 11 })])
    const visitRows = Array.from({ length: 10_001 }, (_, index) => sharedVisit(20_000 + index, controlled, structuralIssues))
    const result = captured(() => resolve(identities(), visitRows))
    expect(errorShape(result, controlled.comment)).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('rejects aggregate comment-evidence work before quadratic expansion', () => {
    const repeatedComment = Array.from({ length: 2_048 }, () => 'X').join(' ')
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Короткая', 'Ия', 'Олеговна')] })
    const visitRows = Array.from({ length: 196 }, (_, index) => visit(90_000 + index, { appointment_id: '', comment: repeatedComment }))
    const result = captured(() => resolve(identityResult, visitRows))
    expect(errorShape(result, repeatedComment)).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('rejects accessors with one frozen value-free boundary error', () => {
    const secret = 'getter-secret-must-not-leak'
    const malformed = { identities: identities(), visitRows: [], fingerprintKey: FINGERPRINT_KEY }
    Object.defineProperty(malformed, 'visitRows', { enumerable: true, get: () => { throw new Error(secret) } })
    const result = captured(() => resolveClinicImportVisits(malformed))
    expect(errorShape(result, secret)).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INVALID_VISIT_INPUT', frozen: true, leaked: false })
  })

  it('does not inspect a hostile object thrown by an input getter', () => {
    const secret = 'hostile-thrown-object-secret'
    const thrown = new Proxy({}, { getPrototypeOf: () => { throw new Error(secret) } })
    const source = { identities: identities(), visitRows: [], fingerprintKey: FINGERPRINT_KEY }
    const malformed = new Proxy(source, { getOwnPropertyDescriptor: (target, key) => { if (key === 'visitRows') throw thrown; return Reflect.getOwnPropertyDescriptor(target, key) } })
    const result = captured(() => resolveClinicImportVisits(malformed))
    expect(errorShape(result, secret)).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INVALID_VISIT_INPUT', frozen: true, leaked: false })
  })

  it('rejects oversized collections before building indexes', () => {
    const oversized = Array.from({ length: 100_001 }, (_, index) => visit(index + 2, { appointment_id: `bounded-${index}` }))
    const result = captured(() => resolve(identities(), oversized))
    expect(errorShape(result, 'bounded-99999')).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('applies one rolling raw budget before repeatedly scanning a reused huge string', () => {
    const huge = 'X'.repeat(60_000)
    const repeated = values({ service_names: huge })
    const visitRows = Array.from({ length: 1_200 }, (_, index) => sharedVisit(200_000 + index, repeated))
    const result = captured(() => resolve(identities(), visitRows))
    expect(errorShape(result, huge.slice(0, 32))).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('applies the aggregate per-row length bound before scanning a late lone surrogate', () => {
    const lateSurrogate = `${'Y'.repeat(6_200_000)}\uD800`
    const oversized = Object.fromEntries(VISIT_VALUE_KEYS.map((key) => [key, lateSurrogate]))
    const result = captured(() => resultFor(identities(), visit(301_100, oversized)))
    expect(errorShape(result, lateSurrogate.slice(-32))).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('rejects duplicate source coordinates without treating appointment IDs as unique', () => {
    const duplicated = [visit(25, { appointment_id: 'first-coordinate' }), visit(25, { appointment_id: 'second-coordinate' })]
    const result = captured(() => resolve(identities(), duplicated))
    expect(errorShape(result, 'second-coordinate')).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'VISIT_INVARIANT_FAILED', frozen: true, leaked: false })
  })

  it('validates the exact source-loader visit value contract', () => {
    const malformedValues = Object.fromEntries(VISIT_VALUE_KEYS.slice(0, -1).map((key) => [key, '']))
    const malformed = Object.freeze({ sourceRole: 'visits', sourceName: SOURCE_NAME, sourceRow: 26, values: Object.freeze(malformedValues), structuralIssues: Object.freeze([]) })
    const result = captured(() => resolve(identities(), [malformed]))
    expect(errorShape(result, 'comment')).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INVALID_VISIT_INPUT', frozen: true, leaked: false })
  })

  it('rejects a null external-identifier system instead of silently omitting it', () => {
    const malformed = Object.freeze({ patientId: FIRST_PATIENT_ID, system: null, value: FIRST_EHR })
    const identityResult = identities({ patients: [patient(FIRST_PATIENT_ID, 'Строгая', 'Ия', 'Олеговна')], externalIdentifiers: [malformed] })
    const result = captured(() => resolve(identityResult, [visit(29, { patient_card: FIRST_EHR })]))
    expect(errorShape(result, FIRST_EHR)).toEqual({ returned: false, name: 'ClinicImportVisitError', code: 'INVALID_VISIT_INPUT', frozen: true, leaked: false })
  })
})
