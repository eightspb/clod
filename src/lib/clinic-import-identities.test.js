import { describe, expect, it } from 'vitest'
import { resolveClinicImportIdentities } from './clinic-import-identities.js'

const FINGERPRINT_KEY = 'clinic-import-synthetic-fingerprint-key-2026-identity-tests'
const SECOND_FINGERPRINT_KEY = 'clinic-import-second-fingerprint-key-2026-identity-tests'

function ehr(number) {
  return String(number).padStart(16, '0')
}

function source(sourceRow, sourceName = 'synthetic-patients.csv') {
  return Object.freeze({ sourceName, sourceRow })
}

function contact(kind, value, isPrimary = false) {
  return Object.freeze({ kind, value, isPrimary })
}

function row(overrides = {}) {
  const sourceRow = overrides.sourceRow ?? 2
  return Object.freeze({
    source: overrides.source ?? source(sourceRow),
    ehr: overrides.ehr ?? ehr(sourceRow),
    clinicCard: overrides.clinicCard ?? `К-${sourceRow}`,
    profile: Object.freeze({ lastName: 'Синтетикова', firstName: 'Лёля', middleName: 'Рюриковна', birthDate: '1988-02-29', gender: 'female', ...overrides.profile }),
    contacts: Object.freeze(overrides.contacts ?? []),
    identifiers: Object.freeze({ inn: null, snils: null, passport: null, contract: null, ...overrides.identifiers }),
    privateData: Object.freeze(overrides.privateData ?? {}),
    consents: Object.freeze(overrides.consents ?? []),
    observedAt: Object.hasOwn(overrides, 'observedAt') ? overrides.observedAt : `2024-01-${String(Math.min(sourceRow, 28)).padStart(2, '0')}T10:00:00.000Z`,
    sourcePriority: overrides.sourcePriority ?? 10
  })
}

function visit(sourceRow, overrides = {}) {
  return Object.freeze({ source: source(sourceRow, 'synthetic-visits.csv'), ehr: overrides.ehr ?? null, profile: Object.freeze({ lastName: null, firstName: null, middleName: null, birthDate: null, ...overrides.profile }) })
}

function resolve(patientRows, overrides = {}) {
  return resolveClinicImportIdentities({ patientRows, medeskRows: overrides.medeskRows ?? [], visitReferences: overrides.visitReferences ?? [], fingerprintKey: overrides.fingerprintKey ?? FINGERPRINT_KEY })
}

function issueCodes(result) {
  return result.issues.map(({ code }) => code)
}

function captured(operation) {
  try {
    operation()
    return Object.freeze({ returned: true, error: null })
  } catch (error) {
    return Object.freeze({ returned: false, error })
  }
}

function errorShape(result, secrets = []) {
  return Object.freeze({ returned: result.returned, name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), leaked: secrets.some((secret) => result.error?.message?.includes(secret)) })
}

function invalidPrivateValues() {
  const accessor = Object.defineProperty({}, 'secret', { enumerable: true, get: () => 'hidden' })
  const sparse = Array(3)
  sparse[1] = 'middle'
  const magic = Object.create(null)
  Object.defineProperty(magic, '__proto__', { enumerable: true, value: 'unsafe' })
  let deep = {}
  for (let index = 0; index < 10; index += 1) deep = { nested: deep }
  const oversized = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`field${index}`, 'Ж'.repeat(3_000)]))
  return Object.freeze([accessor, { sparse }, magic, { note: 'bad\u0001value' }, { note: 'Ж'.repeat(5_000) }, { number: Number.POSITIVE_INFINITY }, deep, { wide: Array.from({ length: 1_025 }, (_, index) => index) }, oversized])
}

describe('resolveClinicImportIdentities', () => {
  it('treats one exact EHR as one source card while retaining its global identifier', () => {
    const first = row({ sourceRow: 37, ehr: ehr(237), clinicCard: 'Э-37', profile: { lastName: null, firstName: 'Ева', middleName: null, birthDate: null, gender: null }, observedAt: '2021-01-01T00:00:00.000Z' })
    const second = row({ sourceRow: 38, ehr: ehr(237), clinicCard: 'Э-37', profile: { lastName: 'Ясная', firstName: 'Ева', middleName: 'Оскаровна' }, observedAt: '2024-01-01T00:00:00.000Z' })
    const result = resolve([second, first])
    expect({ patients: result.patients.length, ehrs: result.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr').length, evidence: result.evidenceCounts.exactEhr }).toEqual({ patients: 1, ehrs: 1, evidence: 1 })
  })

  it.each(['birthDate', 'inn', 'snils'])('fails the whole resolution when one exact EHR conflicts by %s', (field) => {
    const base = { sourceRow: 39, ehr: ehr(239), clinicCard: 'Э-39' }
    const first = field === 'birthDate' ? row({ ...base, profile: { birthDate: '1981-01-02' } }) : row({ ...base, identifiers: { [field]: '111' } })
    const second = field === 'birthDate' ? row({ ...base, sourceRow: 40, profile: { birthDate: '1982-01-02' } }) : row({ ...base, sourceRow: 40, identifiers: { [field]: '222' } })
    const result = captured(() => resolve([first, second]))
    expect({ returned: result.returned, name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), leaked: result.error?.message.includes('111') || result.error?.message.includes('222') }).toEqual({ returned: false, name: 'ClinicImportIdentityError', code: 'IDENTITY_INVARIANT_FAILED', frozen: true, leaked: false })
  })

  it('unions exact EHR rows before weaker evidence can create a transitive conflict', () => {
    const corroborated = row({ sourceRow: 44, ehr: ehr(244), identifiers: { inn: '111' } })
    const exactFirst = row({ sourceRow: 45, ehr: ehr(245) })
    const exactSecond = row({ sourceRow: 47, ehr: ehr(245), profile: { lastName: 'Другая', firstName: 'Ева', middleName: 'Яновна' }, identifiers: { inn: '222' } })
    const result = resolve([exactSecond, corroborated, exactFirst])
    const exactPatientIds = result.externalIdentifiers.filter(({ system, value }) => system === 'medesk_ehr' && value === ehr(245)).map(({ patientId }) => patientId)
    expect({ patients: result.patients.length, exactPatientIds: new Set(exactPatientIds).size }).toEqual({ patients: 2, exactPatientIds: 1 })
  })

  it('retains every exact EHR identifier and its global fingerprint after a merge', () => {
    const rows = [row({ sourceRow: 2, ehr: ehr(201) }), row({ sourceRow: 3, ehr: ehr(202) })]
    const result = resolve(rows)
    const identifiers = result.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr')
    expect({ values: identifiers.map(({ value }) => value).sort(), global: new Set(identifiers.map(({ globalFingerprint }) => globalFingerprint)).size }).toEqual({ values: [ehr(201), ehr(202)], global: 2 })
  })

  it('merges equal full names and birthdays without conflicting national identifiers', () => {
    const rows = [row({ sourceRow: 4, ehr: ehr(204) }), row({ sourceRow: 5, ehr: ehr(205), clinicCard: 'К-4' })]
    const result = resolve(rows)
    expect({ patients: result.patients.length, evidence: result.evidenceCounts.sameFioBirthDate }).toEqual({ patients: 1, evidence: 1 })
  })

  it('keeps one primary phone matching the merged patient profile when source cards have different primary phones', () => {
    const first = row({ sourceRow: 48, ehr: ehr(248), clinicCard: 'К-48', contacts: [contact('phone', '79215550148', true)] })
    const second = row({ sourceRow: 49, ehr: ehr(249), clinicCard: 'К-48', contacts: [contact('phone', '79215550149', true)] })
    const result = resolve([first, second])
    const phones = result.contacts.filter(({ kind }) => kind === 'phone')
    const primary = phones.filter(({ isPrimary }) => isPrimary)
    expect({ patients: result.patients.length, phones: phones.length, primary: primary.length, primaryValue: primary[0]?.value, profilePhone: result.patients[0].profile.primaryPhone }).toEqual({ patients: 1, phones: 2, primary: 1, primaryValue: '79215550149', profilePhone: '79215550149' })
  })

  it('keeps equal full names and birthdays on different clinic cards as separate identities', () => {
    const first = row({ sourceRow: 52, ehr: ehr(252), clinicCard: 'РАЗНАЯ-52' })
    const second = row({ sourceRow: 53, ehr: ehr(253), clinicCard: 'РАЗНАЯ-53' })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, evidence: result.evidenceCounts.sameFioBirthDate, issues: issueCodes(result) }).toEqual({ patients: 2, evidence: 0, issues: ['INSUFFICIENT_IDENTITY_EVIDENCE'] })
  })

  it.each([
    ['same full name and birthday', {}, 'sameFioBirthDate'],
    ['same full name with one missing birthday', { birthDate: null }, 'sameFioMissingBirthDate'],
    ['surname change with one missing birthday', { lastName: 'Новая', birthDate: null }, 'surnameChangeMissingBirthDate']
  ])('does not merge %s by a shared contact across different clinic cards', (_case, secondProfile, evidenceCode) => {
    const shared = contact('phone', '79215550155', true)
    const first = row({ sourceRow: 55, ehr: ehr(255), clinicCard: 'РАЗНАЯ-55', contacts: [shared] })
    const second = row({ sourceRow: 56, ehr: ehr(256), clinicCard: 'РАЗНАЯ-56', profile: secondProfile, contacts: [shared], observedAt: '2025-01-01T00:00:00.000Z' })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, evidence: result.evidenceCounts[evidenceCode], issues: issueCodes(result) }).toEqual({ patients: 2, evidence: 0, issues: ['INSUFFICIENT_IDENTITY_EVIDENCE'] })
  })

  it('keeps a chronological same-card surname change separate without independent evidence', () => {
    const first = row({ sourceRow: 57, ehr: ehr(257), clinicCard: 'КАРТА-57', profile: { lastName: 'Прежняя' }, observedAt: '2023-01-01T00:00:00.000Z' })
    const second = row({ sourceRow: 58, ehr: ehr(258), clinicCard: 'КАРТА-57', profile: { lastName: 'Текущая' }, observedAt: '2025-01-01T00:00:00.000Z' })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, evidence: result.evidenceCounts.surnameChange, issues: issueCodes(result) }).toEqual({ patients: 2, evidence: 0, issues: ['INSUFFICIENT_IDENTITY_EVIDENCE'] })
  })

  it('keeps a same-card surname change with one missing birthday separate without independent evidence', () => {
    const first = row({ sourceRow: 74, ehr: ehr(274), clinicCard: 'КАРТА-74', profile: { lastName: 'Прежняя' }, observedAt: '2023-01-01T00:00:00.000Z' })
    const second = row({ sourceRow: 75, ehr: ehr(275), clinicCard: 'КАРТА-74', profile: { lastName: 'Текущая', birthDate: null }, observedAt: '2025-01-01T00:00:00.000Z' })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, evidence: result.evidenceCounts.surnameChangeMissingBirthDate, issues: issueCodes(result) }).toEqual({ patients: 2, evidence: 0, issues: ['INSUFFICIENT_IDENTITY_EVIDENCE'] })
  })

  it('merges a same-card full-name duplicate when only one birthday is missing', () => {
    const first = row({ sourceRow: 59, ehr: ehr(259), clinicCard: 'КАРТА-59' })
    const second = row({ sourceRow: 60, ehr: ehr(260), clinicCard: 'КАРТА-59', profile: { birthDate: null } })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, evidence: result.evidenceCounts.sameFioMissingBirthDate }).toEqual({ patients: 1, evidence: 1 })
  })

  it('keeps a same-card full-name pair separate when both birthdays and independent evidence are missing', () => {
    const first = row({ sourceRow: 61, ehr: ehr(261), clinicCard: 'КАРТА-61', profile: { birthDate: null } })
    const second = row({ sourceRow: 62, ehr: ehr(262), clinicCard: 'КАРТА-61', profile: { birthDate: null } })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, evidence: result.evidenceCounts.sameFioMissingBirthDate, issues: issueCodes(result) }).toEqual({ patients: 2, evidence: 0, issues: ['INSUFFICIENT_IDENTITY_EVIDENCE'] })
  })

  it('merges a strongly corroborated patronymic correction without surname history', () => {
    const shared = contact('phone', '79215550164', true)
    const first = row({ sourceRow: 64, ehr: ehr(264), clinicCard: 'КАРТА-64', profile: { lastName: 'Точная', firstName: 'Ия', middleName: 'Старовна' }, contacts: [shared], observedAt: '2023-01-01T00:00:00.000Z' })
    const second = row({ sourceRow: 65, ehr: ehr(265), clinicCard: 'КАРТА-64', profile: { lastName: 'Точная', firstName: 'Ия', middleName: 'Нововна' }, contacts: [shared], observedAt: '2025-01-01T00:00:00.000Z' })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, currentMiddleName: result.patients[0].profile.middleName, history: result.nameHistory.length, evidence: result.evidenceCounts.patronymicCorrection }).toEqual({ patients: 1, currentMiddleName: 'Нововна', history: 0, evidence: 1 })
  })

  it('keeps same-surname family members with different given names separate', () => {
    const shared = contact('phone', '79215550166', true)
    const first = row({ sourceRow: 66, ehr: ehr(266), clinicCard: 'КАРТА-66', profile: { lastName: 'Семейная', firstName: 'Ия', middleName: 'Петровна' }, contacts: [shared] })
    const second = row({ sourceRow: 67, ehr: ehr(267), clinicCard: 'КАРТА-66', profile: { lastName: 'Семейная', firstName: 'Лев', middleName: 'Иванович', birthDate: null, gender: 'male' }, contacts: [shared] })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, patronymicCorrections: result.evidenceCounts.patronymicCorrection }).toEqual({ patients: 2, patronymicCorrections: 0 })
  })

  it('stores an earlier confirmed surname and selects the later surname as current', () => {
    const shared = contact('email', 'surname-change@example.test')
    const earlier = row({ sourceRow: 6, ehr: ehr(206), clinicCard: '64-2', profile: { lastName: 'Лунёва', firstName: 'Ия', middleName: 'Эльдаровна' }, contacts: [shared], observedAt: '2021-03-01T08:00:00.000Z' })
    const later = row({ sourceRow: 7, ehr: ehr(207), clinicCard: '64-2', profile: { lastName: 'Рощина', firstName: 'Ия', middleName: 'Эльдаровна' }, contacts: [shared], observedAt: '2023-04-02T08:00:00.000Z' })
    const result = resolve([later, earlier])
    expect({ current: result.patients[0].profile.lastName, history: result.nameHistory.map(({ lastName, reason }) => [lastName, reason]) }).toEqual({ current: 'Рощина', history: [['Лунёва', 'surname_change']] })
  })

  it('merges a confirmed surname change with one missing birthday without chronology when a phone matches', () => {
    const shared = contact('phone', '79215550129', true)
    const first = row({ sourceRow: 8, ehr: ehr(208), clinicCard: '546/1', profile: { lastName: 'Ёлкина', firstName: 'Ася', middleName: 'Тимуровна' }, contacts: [shared], observedAt: null })
    const second = row({ sourceRow: 9, ehr: ehr(209), clinicCard: '546/1', profile: { lastName: 'Дальняя', firstName: 'Ася', middleName: 'Тимуровна', birthDate: null }, contacts: [shared], observedAt: null })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, history: [result.nameHistory[0].lastName, result.nameHistory[0].reason], birthDate: result.patients[0].profile.birthDate, evidence: result.evidenceCounts.surnameChangeMissingBirthDate }).toEqual({ patients: 1, history: ['Ёлкина', 'identity_alias'], birthDate: '1988-02-29', evidence: 1 })
  })

  it('fills each null current field from the highest-priority trusted row before chronology', () => {
    const preferred = row({ sourceRow: 41, ehr: ehr(241), profile: { lastName: 'Прежняя', firstName: 'Ия', middleName: 'Олеговна', birthDate: '1986-05-04', gender: 'female' }, contacts: [contact('phone', '79215550141', true)], observedAt: '2020-01-01T00:00:00.000Z', sourcePriority: 1 })
    const secondary = row({ sourceRow: 42, ehr: ehr(241), profile: { lastName: 'Промежуточная', firstName: 'Ия', middleName: 'Львовна', birthDate: '1986-05-04', gender: 'male' }, contacts: [contact('phone', '79215550142', true)], observedAt: '2023-01-01T00:00:00.000Z', sourcePriority: 5 })
    const current = row({ sourceRow: 43, ehr: ehr(241), profile: { lastName: 'Текущая', firstName: 'Ия', middleName: null, birthDate: null, gender: null }, contacts: [], observedAt: '2025-01-01T00:00:00.000Z', sourcePriority: 10 })
    const result = resolve([secondary, current, preferred])
    expect(result.patients[0].profile).toEqual({ lastName: 'Текущая', firstName: 'Ия', middleName: 'Олеговна', birthDate: '1986-05-04', gender: 'female', primaryPhone: '79215550141' })
  })

  it('uses trusted chronology instead of input order for the current surname', () => {
    const shared = contact('phone', '79215550110')
    const oldRow = row({ sourceRow: 10, ehr: ehr(210), clinicCard: 'Ч-10', profile: { lastName: 'Северова', firstName: 'Эмма', middleName: 'Ильинична' }, contacts: [shared], observedAt: '2020-05-01T12:00:00.000Z' })
    const newRow = row({ sourceRow: 11, ehr: ehr(211), clinicCard: 'Ч-10', profile: { lastName: 'Южина', firstName: 'Эмма', middleName: 'Ильинична' }, contacts: [shared], observedAt: '2024-05-01T12:00:00.000Z' })
    const names = [resolve([oldRow, newRow]), resolve([newRow, oldRow])].map(({ patients }) => patients[0].profile.lastName)
    expect(names).toEqual(['Южина', 'Южина'])
  })

  it('keeps unknown observation dates nullable on patient and contact ranges', () => {
    const undated = row({ sourceRow: 68, ehr: ehr(268), observedAt: null, contacts: [contact('phone', '79215550168', true)] })
    const result = resolve([undated])
    expect({ patient: [result.patients[0].firstSeenAt, result.patients[0].lastSeenAt], contact: [result.contacts[0].firstSeenAt, result.contacts[0].lastSeenAt] }).toEqual({ patient: [null, null], contact: [null, null] })
  })

  it('preserves an unknown consent observation date as null deterministically', () => {
    const consent = Object.freeze({ type: 'sms_notifications', status: 'unknown', observedAt: null })
    const input = row({ sourceRow: 73, ehr: ehr(273), observedAt: null, consents: [consent] })
    const results = [resolve([input]), resolve([input])]
    expect(results.map(({ consents }) => consents.map(({ observedAt }) => observedAt))).toEqual([[null], [null]])
  })

  it('selects a known observation date ahead of an unknown date deterministically', () => {
    const unknown = row({ sourceRow: 69, ehr: ehr(269), profile: { lastName: 'Неизвестная' }, observedAt: null, sourcePriority: 1 })
    const known = row({ sourceRow: 70, ehr: ehr(269), profile: { lastName: 'Датированная' }, observedAt: '2020-01-01T00:00:00.000Z', sourcePriority: 10 })
    const results = [resolve([unknown, known]), resolve([known, unknown])]
    expect(results.map(({ patients }) => ({ lastName: patients[0].profile.lastName, firstSeenAt: patients[0].firstSeenAt, lastSeenAt: patients[0].lastSeenAt }))).toEqual([{ lastName: 'Датированная', firstSeenAt: '2020-01-01T00:00:00.000Z', lastSeenAt: '2020-01-01T00:00:00.000Z' }, { lastName: 'Датированная', firstSeenAt: '2020-01-01T00:00:00.000Z', lastSeenAt: '2020-01-01T00:00:00.000Z' }])
  })

  it('merges a corroborated known-birthday surname change without chronology', () => {
    const shared = contact('phone', '79215550171', true)
    const first = row({ sourceRow: 71, ehr: ehr(271), clinicCard: 'КАРТА-71', profile: { lastName: 'Прежняя' }, contacts: [shared], observedAt: null })
    const second = row({ sourceRow: 72, ehr: ehr(272), clinicCard: 'КАРТА-71', profile: { lastName: 'Текущая' }, contacts: [shared], observedAt: null })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, surnameChanges: result.evidenceCounts.surnameChange, history: result.nameHistory.map(({ reason }) => reason) }).toEqual({ patients: 1, surnameChanges: 1, history: ['identity_alias'] })
  })

  it('does not infer surname chronology from equal trusted timestamps', () => {
    const shared = contact('email', 'equal-chronology@example.test')
    const first = row({ sourceRow: 76, ehr: ehr(276), clinicCard: 'КАРТА-76', profile: { lastName: 'Вариант-А' }, contacts: [shared], observedAt: '2024-06-01T08:30:00.000Z' })
    const second = row({ sourceRow: 77, ehr: ehr(277), clinicCard: 'КАРТА-76', profile: { lastName: 'Вариант-Б' }, contacts: [shared], observedAt: '2024-06-01T08:30:00.000Z' })
    const results = [resolve([first, second]), resolve([second, first])]
    expect(results.map(({ patients, nameHistory }) => ({ patients: patients.length, current: patients[0].profile.lastName, history: nameHistory.map(({ lastName, reason }) => [lastName, reason]) }))).toEqual([{ patients: 1, current: 'Вариант-Б', history: [['Вариант-А', 'identity_alias']] }, { patients: 1, current: 'Вариант-Б', history: [['Вариант-А', 'identity_alias']] }])
  })

  it('merges only the confirmed pair on a mixed three-row clinic card', () => {
    const shared = contact('phone', '79215550112')
    const first = row({ sourceRow: 12, ehr: ehr(212), clinicCard: 'ТРИ', profile: { lastName: 'Берегова', firstName: 'Уна', middleName: 'Львовна' }, contacts: [shared] })
    const renamed = row({ sourceRow: 13, ehr: ehr(213), clinicCard: 'ТРИ', profile: { lastName: 'Ветрова', firstName: 'Уна', middleName: 'Львовна' }, contacts: [shared] })
    const other = row({ sourceRow: 14, ehr: ehr(214), clinicCard: 'ТРИ', profile: { lastName: 'Яров', firstName: 'Глеб', middleName: 'Янович', birthDate: '1977-01-03', gender: 'male' } })
    const result = resolve([other, renamed, first])
    expect({ patients: result.patients.length, histories: result.nameHistory.length }).toEqual({ patients: 2, histories: 1 })
  })

  it('keeps different people with one short clinic card separate and records an issue', () => {
    const first = row({ sourceRow: 15, ehr: ehr(215), clinicCard: '7', profile: { lastName: 'Кедрова', firstName: 'Мая', middleName: 'Олеговна' } })
    const second = row({ sourceRow: 16, ehr: ehr(216), clinicCard: '7', profile: { lastName: 'Кедров', firstName: 'Лев', middleName: 'Олегович', birthDate: '1980-04-03', gender: 'male' } })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, issues: issueCodes(result) }).toEqual({ patients: 2, issues: ['SHARED_CARD_DIFFERENT_PEOPLE'] })
  })

  it('never merges family members by a shared phone alone', () => {
    const shared = contact('phone', '79215550131', true)
    const first = row({ sourceRow: 17, ehr: ehr(217), clinicCard: 'С-17', profile: { lastName: 'Речная', firstName: 'Нина', middleName: 'Павловна' }, contacts: [shared] })
    const second = row({ sourceRow: 18, ehr: ehr(218), clinicCard: 'С-18', profile: { lastName: 'Речной', firstName: 'Пётр', middleName: 'Павлович', birthDate: '1985-08-09', gender: 'male' }, contacts: [shared] })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, contacts: result.contacts.length, fingerprints: new Set(result.contacts.map(({ fingerprint }) => fingerprint)).size }).toEqual({ patients: 2, contacts: 2, fingerprints: 1 })
  })

  it.each([['inn', 'CONFLICTING_STRONG_IDENTIFIER'], ['snils', 'CONFLICTING_STRONG_IDENTIFIER']])('blocks an otherwise exact duplicate with conflicting %s', (field, code) => {
    const first = row({ sourceRow: field === 'inn' ? 19 : 21, ehr: ehr(field === 'inn' ? 219 : 221), identifiers: { [field]: '111' } })
    const second = row({ sourceRow: field === 'inn' ? 20 : 22, ehr: ehr(field === 'inn' ? 220 : 222), identifiers: { [field]: '222' }, clinicCard: first.clinicCard })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, issues: issueCodes(result) }).toEqual({ patients: 2, issues: [code] })
  })

  it('keeps an incomplete patient without inventing missing name values', () => {
    const incomplete = row({ sourceRow: 23, ehr: ehr(223), profile: { lastName: null, firstName: 'Ода', middleName: null, birthDate: null, gender: null } })
    const result = resolve([incomplete])
    expect({ profile: result.patients[0].profile, issues: issueCodes(result) }).toEqual({ profile: { lastName: null, firstName: 'Ода', middleName: null, birthDate: null, gender: null, primaryPhone: null }, issues: ['INCOMPLETE_PATIENT_NAME'] })
  })

  it('leaves a possible duplicate with insufficient evidence as two patients', () => {
    const first = row({ sourceRow: 24, ehr: ehr(224), profile: { lastName: 'Тихая', firstName: 'Зоя', middleName: 'Марковна', birthDate: null } })
    const second = row({ sourceRow: 25, ehr: ehr(225), profile: { lastName: 'Тихая', firstName: 'Зоя', middleName: 'Марковна', birthDate: '1991-06-04' }, clinicCard: 'ДРУГАЯ' })
    const result = resolve([first, second])
    expect({ patients: result.patients.length, issues: issueCodes(result) }).toEqual({ patients: 2, issues: ['INSUFFICIENT_IDENTITY_EVIDENCE'] })
  })

  it('returns every identity collection and nested payload as immutable', () => {
    const consent = Object.freeze({ type: 'sms_notifications', status: 'granted', observedAt: '2024-06-01T09:00:00.000Z' })
    const input = row({ sourceRow: 26, ehr: ehr(226), contacts: [contact('email', 'lëlya@example.test', true)], privateData: { address: 'Синтетический адрес' }, consents: [consent] })
    const result = resolve([input])
    const values = [result, result.patients, result.patients[0], result.patients[0].profile, result.externalIdentifiers, result.contacts, result.nameHistory, result.privateData, result.privateData[0], result.privateData[0].value, result.consents, result.sourceLinks, result.issues, result.evidenceCounts]
    expect(values.every(Object.isFrozen)).toBe(true)
  })

  it('derives stable patient UUIDs independently of row order', () => {
    const rows = [row({ sourceRow: 27, ehr: ehr(227) }), row({ sourceRow: 28, ehr: ehr(228), clinicCard: 'К-27' })]
    const ids = [resolve(rows), resolve([...rows].reverse())].map(({ patients }) => patients[0].id)
    expect(ids).toEqual([ids[0], ids[0]])
  })

  it('domain-separates stable UUIDs with the injected fingerprint key', () => {
    const input = row({ sourceRow: 29, ehr: ehr(229) })
    const ids = [resolve([input]).patients[0].id, resolve([input], { fingerprintKey: SECOND_FINGERPRINT_KEY }).patients[0].id]
    expect({ distinct: new Set(ids).size, uuid: ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) }).toEqual({ distinct: 2, uuid: true })
  })

  it('uses injective component encoding and enforces globally unique patient IDs', () => {
    const first = row({ source: source(2, 'A'), sourceRow: 2, ehr: ehr(302), clinicCard: 'И-302' })
    const second = row({ source: source(3, 'B'), sourceRow: 3, ehr: ehr(303), clinicCard: 'И-302' })
    const collision = row({ source: source(3, 'A:000000000002|B'), sourceRow: 3, ehr: ehr(304), clinicCard: 'И-304', profile: { lastName: 'Отдельная', firstName: 'Эра', middleName: 'Яковлевна', birthDate: '1983-03-04' } })
    const result = resolve([collision, second, first])
    expect({ patients: result.patients.length, uniqueIds: new Set(result.patients.map(({ id }) => id)).size }).toEqual({ patients: 2, uniqueIds: 2 })
  })

  it('fails safely before materializing evidence pairs for an oversized suspicious bucket', () => {
    const rows = Array.from({ length: 300 }, (_, index) => row({ sourceRow: 1_000 + index, ehr: ehr(1_000 + index), clinicCard: `СТРЕСС-${index}` }))
    const result = captured(() => resolve(rows))
    expect(errorShape(result)).toEqual({ returned: false, name: 'ClinicImportIdentityError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('suppresses pairwise insufficient-evidence issues after both rows reach one final component', () => {
    const shared = contact('phone', '79215550305', true)
    const first = row({ sourceRow: 305, ehr: ehr(305), clinicCard: 'МОСТ', profile: { lastName: 'Связная', firstName: 'Ия', middleName: 'Львовна', birthDate: null }, contacts: [shared] })
    const second = row({ sourceRow: 306, ehr: ehr(306), clinicCard: 'МОСТ', profile: { lastName: 'Связная', firstName: 'Ия', middleName: 'Львовна', birthDate: null }, contacts: [shared] })
    const bridge = row({ sourceRow: 307, ehr: ehr(307), clinicCard: 'МОСТ', profile: { lastName: 'Связная', firstName: 'Ия', middleName: 'Львовна', birthDate: '1984-04-05' }, contacts: [shared] })
    const result = resolve([second, bridge, first])
    expect({ patients: result.patients.length, issues: issueCodes(result) }).toEqual({ patients: 1, issues: [] })
  })

  it('counts only one persisted issue when several pairwise decisions resolve to the same patient pair', () => {
    const first = row({ sourceRow: 310, ehr: ehr(310), clinicCard: 'ПАРА-А' })
    const firstDuplicate = row({ sourceRow: 311, ehr: ehr(310), clinicCard: 'ПАРА-А' })
    const second = row({ sourceRow: 312, ehr: ehr(312), clinicCard: 'ПАРА-Б' })
    const secondDuplicate = row({ sourceRow: 313, ehr: ehr(312), clinicCard: 'ПАРА-Б' })
    const result = resolve([secondDuplicate, first, second, firstDuplicate])
    const persisted = result.issues.filter(({ code }) => code === 'INSUFFICIENT_IDENTITY_EVIDENCE').length
    expect({ patients: result.patients.length, persisted, counted: result.evidenceCounts.insufficientEvidence }).toEqual({ patients: 2, persisted: 1, counted: 1 })
  })

  it('normalizes a hostile proxy failure without invoking its prototype trap', () => {
    const secret = 'private-hostile-proxy'
    const hostileError = new Proxy({}, { getPrototypeOf: () => { throw new Error(secret) } })
    const input = new Proxy({}, { ownKeys: () => { throw hostileError } })
    const result = captured(() => resolveClinicImportIdentities(input))
    expect(errorShape(result, [secret])).toEqual({ returned: false, name: 'ClinicImportIdentityError', code: 'INVALID_IDENTITY_INPUT', frozen: true, leaked: false })
  })

  it.each(['accessor record', 'sparse array'])('rejects a boundary %s without reading hidden values', (kind) => {
    const secret = 'private-boundary-accessor'
    const valid = row({ sourceRow: kind === 'accessor record' ? 308 : 309, ehr: ehr(kind === 'accessor record' ? 308 : 309) })
    const profile = Object.defineProperty({ birthDate: '1988-02-29', firstName: 'Лёля', gender: 'female', middleName: 'Рюриковна' }, 'lastName', { enumerable: true, get: () => { throw new Error(secret) } })
    const contacts = Array(2)
    contacts[0] = contact('phone', '79215550309')
    const malformed = kind === 'accessor record' ? { ...valid, profile } : { ...valid, contacts }
    const result = captured(() => resolve([malformed]))
    expect(errorShape(result, [secret])).toEqual({ returned: false, name: 'ClinicImportIdentityError', code: 'INVALID_IDENTITY_INPUT', frozen: true, leaked: false })
  })

  it.each(invalidPrivateValues().map((value, index) => [index, value]))('rejects non-canonical privateData case %s without silent loss', (index, value) => {
    const result = captured(() => resolve([row({ sourceRow: 400 + index, ehr: ehr(400 + index), privateData: value })]))
    expect(errorShape(result)).toEqual({ returned: false, name: 'ClinicImportIdentityError', code: 'INVALID_IDENTITY_INPUT', frozen: true, leaked: false })
  })

  it('globally sorts every output independently of normalized input order', () => {
    const firstShared = contact('email', 'sort-one@example.test')
    const secondShared = contact('phone', '79215550503')
    const rows = [row({ sourceRow: 501, ehr: ehr(501), clinicCard: 'СОРТ-1', profile: { lastName: 'Старая', firstName: 'Ия', middleName: 'Яновна' }, contacts: [firstShared] }), row({ sourceRow: 502, ehr: ehr(502), clinicCard: 'СОРТ-1', profile: { lastName: 'Новая', firstName: 'Ия', middleName: 'Яновна' }, contacts: [firstShared] }), row({ sourceRow: 503, ehr: ehr(503), clinicCard: 'СОРТ-2', profile: { lastName: 'Ранняя', firstName: 'Ада', middleName: 'Кимовна' }, contacts: [secondShared] }), row({ sourceRow: 504, ehr: ehr(504), clinicCard: 'СОРТ-2', profile: { lastName: 'Поздняя', firstName: 'Ада', middleName: 'Кимовна' }, contacts: [secondShared] })]
    const outputs = [resolve(rows), resolve([...rows].reverse())].map((result) => JSON.stringify(result))
    expect(outputs[0]).toBe(outputs[1])
  })

  it('preserves normalized private data consents and every source link', () => {
    const consent = Object.freeze({ type: 'sms_notifications', status: 'not_granted', observedAt: '2022-01-01T00:00:00.000Z' })
    const rows = [row({ sourceRow: 30, ehr: ehr(230), privateData: { passport: 'synthetic-digits' }, consents: [consent] }), row({ sourceRow: 31, ehr: ehr(231), clinicCard: 'К-30' })]
    const result = resolve(rows)
    expect({ privateData: result.privateData[0].value, consents: result.consents.map(({ status }) => status), links: result.sourceLinks.map(({ source }) => source.sourceRow).sort((a, b) => a - b) }).toEqual({ privateData: { passport: 'synthetic-digits' }, consents: ['not_granted'], links: [30, 31] })
  })

  it('deeply preserves older private fields when a newer merged card leaves them empty', () => {
    const older = row({ sourceRow: 505, ehr: ehr(505), clinicCard: 'ПД-505', observedAt: '2022-01-01T00:00:00.000Z', privateData: { passport: { series: '1111', number: null, issuedBy: 'Синтетический орган' }, address: { locality: null, streetAddress: 'Синтетическая улица' }, tags: ['старая'] } })
    const newer = row({ sourceRow: 506, ehr: ehr(505), clinicCard: 'ПД-505', observedAt: '2024-01-01T00:00:00.000Z', privateData: { passport: { series: null, number: '222222', issuedBy: null }, address: { locality: 'Синтетический город', streetAddress: null }, tags: ['новая'] } })
    const result = resolve([newer, older])
    expect(result.privateData[0].value).toEqual({ passport: { series: '1111', number: '222222', issuedBy: 'Синтетический орган' }, address: { locality: 'Синтетический город', streetAddress: 'Синтетическая улица' }, tags: ['старая', 'новая'] })
  })

  it('creates one minimal patient for an unknown visit EHR with exactly one MEDESK row', () => {
    const primary = row({ sourceRow: 32, ehr: ehr(232) })
    const supplemental = row({ source: source(5, 'synthetic-medesk.csv'), sourceRow: 5, ehr: ehr(999), clinicCard: null, profile: { lastName: 'Добавочная', firstName: 'Эра', middleName: 'Тестовна', birthDate: null, gender: null }, privateData: {} })
    const result = resolve([primary], { medeskRows: [supplemental], visitReferences: [visit(2, { ehr: ehr(999) })] })
    expect({ patients: result.patients.length, supplemental: result.patients.filter(({ isSupplemental }) => isSupplemental).length, evidence: result.evidenceCounts.supplementalPatients }).toEqual({ patients: 2, supplemental: 1, evidence: 1 })
  })

  it('records insufficient evidence for an exact unique MEDESK EHR row with incomplete full name', () => {
    const primary = row({ sourceRow: 63, ehr: ehr(263) })
    const incomplete = row({ source: source(10, 'synthetic-medesk.csv'), sourceRow: 10, ehr: ehr(995), clinicCard: null, profile: { lastName: 'Добавочная', firstName: 'Эра', middleName: null, birthDate: null, gender: null }, privateData: {} })
    const result = resolve([primary], { medeskRows: [incomplete], visitReferences: [visit(6, { ehr: ehr(995) })] })
    expect({ patients: result.patients.length, supplemental: result.evidenceCounts.supplementalPatients, issues: issueCodes(result) }).toEqual({ patients: 1, supplemental: 0, issues: ['SUPPLEMENTAL_INSUFFICIENT_EVIDENCE'] })
  })

  it('attaches an unknown exact MEDESK EHR to one compatible primary identity', () => {
    const primary = row({ sourceRow: 54, ehr: ehr(254), clinicCard: 'ОСНОВНАЯ-54' })
    const medesk = row({ source: source(9, 'synthetic-medesk.csv'), sourceRow: 9, ehr: ehr(996), clinicCard: null })
    const result = resolve([primary], { medeskRows: [medesk], visitReferences: [visit(5, { ehr: ehr(996) })] })
    const ehrs = result.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr')
    expect({ patients: result.patients.length, supplemental: result.patients.filter(({ isSupplemental }) => isSupplemental).length, ehrs: ehrs.length, owners: new Set(ehrs.map(({ patientId }) => patientId)).size }).toEqual({ patients: 1, supplemental: 0, ehrs: 2, owners: 1 })
  })

  it('records an issue instead of creating a patient for multiple exact MEDESK rows', () => {
    const target = ehr(998)
    const medeskRows = [row({ source: source(6, 'synthetic-medesk.csv'), sourceRow: 6, ehr: target }), row({ source: source(7, 'synthetic-medesk.csv'), sourceRow: 7, ehr: target })]
    const result = resolve([row({ sourceRow: 33, ehr: ehr(233) })], { medeskRows, visitReferences: [visit(3, { ehr: target })] })
    expect({ patients: result.patients.length, issues: issueCodes(result) }).toEqual({ patients: 1, issues: ['SUPPLEMENTAL_EHR_AMBIGUOUS'] })
  })

  it('records a name-only MEDESK match without creating a supplemental patient', () => {
    const medesk = row({ source: source(8, 'synthetic-medesk.csv'), sourceRow: 8, ehr: ehr(997), profile: { lastName: 'Искрова', firstName: 'Ада', middleName: 'Кимовна' } })
    const reference = visit(4, { profile: { lastName: 'Искрова', firstName: 'Ада', middleName: 'Кимовна' } })
    const result = resolve([row({ sourceRow: 34, ehr: ehr(234) })], { medeskRows: [medesk], visitReferences: [reference] })
    expect({ patients: result.patients.length, issues: issueCodes(result) }).toEqual({ patients: 1, issues: ['SUPPLEMENTAL_NAME_ONLY_MATCH'] })
  })

  it('does not mutate normalized source objects while resolving identities', () => {
    const input = row({ sourceRow: 35, ehr: ehr(235), contacts: [contact('phone', '79215550135')], privateData: { note: 'Ω-синтетика' } })
    const before = structuredClone(input)
    resolve([input])
    expect(input).toEqual(before)
  })

  it('rejects malformed normalized data with a value-free frozen error', () => {
    const secret = 'private-invalid-ehr'
    let error
    try { resolve([row({ sourceRow: 36, ehr: secret })]) } catch (caught) { error = caught }
    expect({ name: error?.name, code: error?.code, frozen: Object.isFrozen(error), leaked: error?.message.includes(secret) }).toEqual({ name: 'ClinicImportIdentityError', code: 'INVALID_IDENTITY_INPUT', frozen: true, leaked: false })
  })

  it('does not enrich a primary through an uncorroborated supplemental surname change', () => {
    const primary = row({ sourceRow: 74, ehr: ehr(274), clinicCard: 'КАРТА-74', profile: { lastName: 'Прежняя' }, observedAt: '2020-01-01T00:00:00.000Z' })
    const medesk = row({ source: source(12, 'synthetic-medesk.csv'), sourceRow: 12, ehr: ehr(994), clinicCard: 'КАРТА-74', profile: { lastName: 'Новая' }, observedAt: '2024-01-01T00:00:00.000Z', sourcePriority: 4 })
    const result = resolve([primary], { medeskRows: [medesk], visitReferences: [visit(7, { ehr: ehr(994) })] })
    expect({ patients: result.patients.length, enrichments: result.evidenceCounts.supplementalEnrichments, supplemental: result.evidenceCounts.supplementalPatients }).toEqual({ patients: 2, enrichments: 0, supplemental: 1 })
  })

  it('preserves surname history for a corroborated supplemental surname enrichment', () => {
    const shared = contact('phone', '79215550175', true)
    const primary = row({ sourceRow: 75, ehr: ehr(275), clinicCard: 'КАРТА-75', profile: { lastName: 'Прежняя' }, contacts: [shared], observedAt: '2020-01-01T00:00:00.000Z' })
    const medesk = row({ source: source(13, 'synthetic-medesk.csv'), sourceRow: 13, ehr: ehr(993), clinicCard: 'КАРТА-75', profile: { lastName: 'Новая' }, contacts: [shared], observedAt: '2024-01-01T00:00:00.000Z', sourcePriority: 4 })
    const result = resolve([primary], { medeskRows: [medesk], visitReferences: [visit(8, { ehr: ehr(993) })] })
    expect({ patients: result.patients.length, current: result.patients[0].profile.lastName, history: result.nameHistory.map(({ lastName }) => lastName), enrichments: result.evidenceCounts.supplementalEnrichments }).toEqual({ patients: 1, current: 'Новая', history: ['Прежняя'], enrichments: 1 })
  })

  it('resolves supplemental identities independently of visit source chronology', () => {
    const shared = contact('phone', '79215550176', true)
    const primary = row({ sourceRow: 76, ehr: ehr(276), clinicCard: 'КАРТА-76', profile: { lastName: 'Прежняя', birthDate: null }, contacts: [shared], observedAt: '2020-01-01T00:00:00.000Z' })
    const first = row({ source: source(14, 'synthetic-medesk.csv'), sourceRow: 14, ehr: ehr(992), clinicCard: 'КАРТА-76', profile: { lastName: 'Новая' }, contacts: [shared], observedAt: '2024-01-01T00:00:00.000Z', sourcePriority: 4 })
    const second = row({ source: source(15, 'synthetic-medesk.csv'), sourceRow: 15, ehr: ehr(991), clinicCard: null, profile: { lastName: 'Новая' }, observedAt: '2024-01-01T00:00:00.000Z', sourcePriority: 4 })
    const results = [[9, 10], [10, 9]].map(([firstRow, secondRow]) => resolve([primary], { medeskRows: [first, second], visitReferences: [visit(firstRow, { ehr: ehr(992) }), visit(secondRow, { ehr: ehr(991) })] }))
    expect(results.map((result) => ({ patients: result.patients.length, enrichments: result.evidenceCounts.supplementalEnrichments, supplemental: result.evidenceCounts.supplementalPatients }))).toEqual([{ patients: 2, enrichments: 1, supplemental: 1 }, { patients: 2, enrichments: 1, supplemental: 1 }])
  })

  it('fails before excessive supplemental candidate work is materialized', () => {
    const primary = Array.from({ length: 50 }, (_, index) => row({ sourceRow: 2_000 + index, ehr: ehr(2_000 + index), clinicCard: `КАНДИДАТ-${index}` }))
    const medeskRows = Array.from({ length: 1_001 }, (_, index) => row({ source: source(3_000 + index, 'synthetic-medesk.csv'), sourceRow: 3_000 + index, ehr: ehr(30_000 + index), clinicCard: null, sourcePriority: 4 }))
    const visitReferences = medeskRows.map((entry, index) => visit(4_000 + index, { ehr: entry.ehr }))
    const result = captured(() => resolve(primary, { medeskRows, visitReferences }))
    expect(errorShape(result)).toEqual({ returned: false, name: 'ClinicImportIdentityError', code: 'INPUT_TOO_COMPLEX', frozen: true, leaked: false })
  })

  it('snapshots a private array length descriptor without invoking a hostile length getter', () => {
    let lengthReads = 0
    const values = new Proxy(Array.from({ length: 2_000 }, () => null), { get: (target, property, receiver) => property === 'length' ? (++lengthReads, lengthReads === 1 ? 0 : 2_000) : Reflect.get(target, property, receiver) })
    const result = captured(() => resolve([row({ sourceRow: 77, ehr: ehr(277), privateData: { values } })]))
    expect({ ...errorShape(result), lengthReads }).toEqual({ returned: false, name: 'ClinicImportIdentityError', code: 'INVALID_IDENTITY_INPUT', frozen: true, leaked: false, lengthReads: 0 })
  })
})
