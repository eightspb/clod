import { createHash } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLINIC_IMPORT_PRODUCTION_CONTROLS, ClinicImportBundleError, createClinicImportBundle } from './clinic-import-bundle.js'
import { loadClinicImportSources } from './clinic-import-sources.js'

const FINGERPRINT_KEY = 'clinic-import-synthetic-fingerprint-key-2026-bundle-tests'
const ROLES = Object.freeze(['pd', 'patients', 'visits', 'invoices', 'pdWorkbook', 'medesk', 'legacyPatients'])
const FILENAMES = Object.freeze({ pd: '544663c3807aab090001bad8PD.csv', patients: '544663c3807aab090001bad8_patients.csv', visits: '544663c3807aab090001bad8_visits.csv', invoices: '544663c3807aab090001bad8_invoices.csv', pdWorkbook: '544663c3807aab090001bad8PD — копия.xlsx', medesk: 'medesk.csv', legacyPatients: 'Vse pacienty.xlsx' })
const PARSING_MODES = Object.freeze({ pd: 'strict', patients: 'strict', visits: 'legacy_physical_rows', invoices: 'strict', pdWorkbook: 'strict', medesk: 'strict', legacyPatients: 'strict' })
const PRIMARY_EHR = '0000000000007001'
const SUPPLEMENTAL_EHR = '0000000000007002'
const SECRET_VALUES = Object.freeze(['Секретова', 'Тайный комментарий', 'Секретная услуга', 'С-7001'])
const SYNTHETIC_CONTROLS = Object.freeze({ primaryRows: 1, medeskEhrIdentifiers: 2, patients: 2, visits: 2, missingDates: 0, validBirthDates: 1, cardCollisionGroups: 0, invoices: 12, primaryMerges: 0, supplementalPatients: 1, nameHistoryRecords: 0 })

function sourceRow(role, sourceRow, values, structuralIssues = []) {
  return Object.freeze({ sourceRole: role, sourceName: FILENAMES[role], sourceRow, values: Object.freeze(values), structuralIssues: Object.freeze(structuralIssues) })
}

function source(role, rows) {
  return Object.freeze({ role, sourceName: FILENAMES[role], kind: FILENAMES[role].endsWith('.xlsx') ? 'xlsx' : 'csv', parsingMode: PARSING_MODES[role], headers: Object.freeze(Object.keys(rows[0]?.values ?? {})), rows: Object.freeze(rows), snapshot: Object.freeze({ sha256: createHash('sha256').update(role).digest('hex'), byteSize: 100 + rows.length }) })
}

function visitValues(overrides = {}) {
  return { appointment_id: overrides.appointment_id ?? 'appointment-synthetic', appointment_begin: '2024-02-29T09:15:00.000Z', appointment_end: '2024-02-29T09:45:00.000Z', cabinet: 'Кабинет 7', status: 'completed', patient_card: overrides.patient_card ?? PRIMARY_EHR, doctor: 'Врач Тестовый', doctor_role: 'Терапевт', service_names: overrides.service_names ?? 'Секретная услуга', invoice_ids: 'invoice-synthetic', comment: overrides.comment ?? 'Тайный комментарий' }
}

function invoiceValues(index) {
  return { invoice_id: `invoice-${index}`, total_amount: '100', paid_amount: '', invoice_status: '', payer_patient_card: PRIMARY_EHR, payer_enterprise_name: '', invoice_date: '', created_by: '', invoice_item_id: '', appointment_id: 'appointment-synthetic', service_name: 'Секретная услуга', service_price: '', service_quantity: '', invoice_item_price: '', invoice_item_discount: '', invoice_item_tax: '' }
}

function manifestFor(sources) {
  const files = ROLES.map((role) => Object.freeze({ role, filename: FILENAMES[role], sha256: sources[role].snapshot.sha256, byteSize: sources[role].snapshot.byteSize, rowCount: sources[role].rows.length, parsingMode: PARSING_MODES[role], structuralIssueCount: sources[role].rows.reduce((count, row) => count + row.structuralIssues.length, 0) }))
  const sha256 = createHash('sha256').update(JSON.stringify({ version: 1, files })).digest('hex')
  return Object.freeze({ version: 1, files: Object.freeze(files), sha256 })
}

function loadedSources() {
  const pd = source('pd', [sourceRow('pd', 2, { 'Номер карты (MEDESK)': PRIMARY_EHR, 'Номер карты (клиника)': 'С-7001', 'Фамилия': 'Секретова', 'Имя': 'Ия', 'Отчество': 'Тестовна', 'Дата рождения': '', 'Пол': '', 'Представители': '', 'Метки': 'синтетика', 'Почта 1': 'synthetic@example.test', 'Почта 2': '', 'Телефон 1': '9991112233', 'Телефон 2': '', 'Паспорт (серия)': '12 34', 'Паспорт (номер)': '567890', 'Паспорт (кем выдан)': 'Тестовый орган', 'Паспорт (дата выдачи)': '2020-01-01', 'Паспорт (код подразделения)': '000-000', 'Свид. о рождении (серия)': '', 'Свид. о рождении (номер)': '', 'Свид. о рождении (кем выдан)': '', 'Свид. о рождении (дата выдачи)': '', 'ИНН': '1234567890', 'СНИЛС': '123-456-789 00', 'Номер пенсионного удостоверения': '', 'Адрес (индекс)': '000000', 'Адрес (область)': 'Тестовая', 'Адрес (населенный пункт)': 'Тестов', 'Адрес (улица, дом, кв.)': 'Тестовая, 1', 'Кем создан': 'Тест', 'Номер договора': 'Д-1', 'Ответственный сотрудник': 'Тест' })])
  const patients = source('patients', [sourceRow('patients', 2, { ehr: PRIMARY_EHR, customId: 'С-7001', birthday: '1988-02-29T00:00:00.000Z', tags: 'дополнительная' })])
  const visits = source('visits', [sourceRow('visits', 2, visitValues()), sourceRow('visits', 3, visitValues({ appointment_id: 'appointment-supplemental', patient_card: SUPPLEMENTAL_EHR, comment: '' }))])
  const invoices = source('invoices', Array.from({ length: 12 }, (_, index) => sourceRow('invoices', index + 2, invoiceValues(index + 1))))
  const pdWorkbook = source('pdWorkbook', [sourceRow('pdWorkbook', 2, { 'Номер карты (MEDESK)': PRIMARY_EHR, 'Номер карты (клиника)': 'С-7001', '__unnamed_C': '', 'Фамилия': 'Секретова', 'Имя': 'Ия', 'Отчество': 'Тестовна', 'Дата рождения': '29.02.1988', 'Пол': '', '__unnamed_I': '', 'Представители': '', 'Метки': '', 'Почта 1': '', 'Почта 2': '', 'Телефон 1': '', 'Телефон 2': '', 'Паспорт (серия)': '', 'Паспорт (номер)': '', 'Паспорт (кем выдан)': '', 'Паспорт (дата выдачи)': '', '__unnamed_T': '', 'Паспорт (код подразделения)': '', 'Свид. о рождении (серия)': '', 'Свид. о рождении (номер)': '', 'Свид. о рождении (кем выдан)': '', 'Свид. о рождении (дата выдачи)': '', 'ИНН': '', 'СНИЛС': '', 'Номер пенсионного удостоверения': '', 'Адрес (индекс)': '', 'Адрес (область)': '', 'Адрес (населенный пункт)': '', 'Адрес (улица, дом, кв.)': '', 'Кем создан': '', 'Номер договора': '', 'Ответственный сотрудник': '' })])
  const medesk = source('medesk', [sourceRow('medesk', 2, { '#': '1', 'Карта': SUPPLEMENTAL_EHR, 'Когда добавлен': '2020-01-01T00:00:00.000Z', 'Имя': 'Добавочная Ия Тестовна', 'Пол': 'Женщина', 'День рождения': '01.01.1990', 'Возраст': '', 'Метки': '', 'Адрес': '', 'Телефон': '', 'Почта': '', 'Работа': '' })])
  const legacyPatients = source('legacyPatients', [sourceRow('legacyPatients', 2, { '\uFEFFДата создания': '2021-01-01T00:00:00.000Z', 'Дата изменения': '2024-01-01T00:00:00.000Z', 'Фамилия': 'Секретова', 'Имя': 'Ия', 'Отчество': 'Тестовна', 'Телефон': '', 'Email': '', 'Всего оплачено по счетам': '', 'Дата рождения': '', 'Заметки': 'Только синтетическая заметка', 'Кол-во анкет': '', 'Номер карты': 'С-7001', 'Кол-во приемов': '', 'Полное имя': 'Секретова Ия Тестовна', 'Системный ID': PRIMARY_EHR, 'Согласия на коммуникацию': 'Да' })])
  const sources = Object.freeze({ pd, patients, visits, invoices, pdWorkbook, medesk, legacyPatients })
  return Object.freeze({ sources, patientSources: Object.freeze({ primary: pd, leftJoins: Object.freeze([patients, pdWorkbook, medesk, legacyPatients]) }), visits, invoices, manifest: manifestFor(sources) })
}

function loadedWithSources(loaded, replacements) {
  const sources = Object.freeze({ ...loaded.sources, ...replacements })
  const patientSources = Object.freeze({ primary: sources.pd, leftJoins: Object.freeze([sources.patients, sources.pdWorkbook, sources.medesk, sources.legacyPatients]) })
  return Object.freeze({ sources, patientSources, visits: sources.visits, invoices: sources.invoices, manifest: manifestFor(sources) })
}

function input(expectedControls) {
  const base = { sourcePaths: Object.freeze(Object.fromEntries(ROLES.map((role) => [role, `/synthetic/${FILENAMES[role]}`]))), fingerprintKey: FINGERPRINT_KEY }
  return Object.freeze(expectedControls === undefined ? base : { ...base, expectedControls })
}

function validInn10(prefix) {
  const digits = [...prefix].map(Number)
  const check = [2, 4, 10, 3, 5, 9, 4, 6, 8].reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11 % 10
  return `${prefix}${check}`
}

function validSnils(prefix) {
  const digits = [...prefix].map(Number)
  const sum = digits.reduce((total, digit, index) => total + digit * (9 - index), 0)
  const remainder = sum < 100 ? sum : sum % 101
  return `${prefix}${String(remainder === 100 ? 0 : remainder).padStart(2, '0')}`
}

function loader(result) {
  return async () => result
}

function captured(operation) {
  return operation().then((value) => ({ value, error: null }), (error) => ({ value: null, error }))
}

async function loaderFixture() {
  const loaded = loadedSources()
  const directory = await mkdtemp(join(tmpdir(), 'clod-bundle-loader-'))
  const paths = Object.freeze(Object.fromEntries(ROLES.map((role) => [role, join(directory, FILENAMES[role])])))
  for (const role of ROLES) {
    const source = loaded.sources[role]
    if (source.kind === 'xlsx') await writeFile(paths[role], `synthetic-${role}`)
    else {
      const delimiter = role === 'medesk' ? ';' : '\t'
      const records = [source.headers, ...source.rows.map(({ values }) => source.headers.map((header) => values[header]))]
      await writeFile(paths[role], `${records.map((record) => record.join(delimiter)).join('\n')}\n`)
    }
  }
  const readXlsxImpl = async (filePath) => {
    const role = ROLES.find((candidate) => FILENAMES[candidate] === basename(filePath))
    const source = loaded.sources[role]
    const bytes = await readFile(filePath)
    const rows = Object.freeze(source.rows.map(({ sourceRow, values }) => Object.freeze({ sourceRow, values })))
    return Object.freeze({ headers: source.headers, rows, snapshot: Object.freeze({ sha256: createHash('sha256').update(bytes).digest('hex'), byteSize: bytes.byteLength }) })
  }
  return Object.freeze({ paths, loadSources: (sourcePaths) => loadClinicImportSources(sourcePaths, { readXlsxImpl }) })
}

describe('createClinicImportBundle', () => {
  it.each(['identity_enrichment', 'identity_consents', 'identity_merge_evidence', 'identity_evidence', 'relational_invariants', 'production_controls', 'report'])('retains the value-free bundle subphase %s', (stage) => {
    const error = new ClinicImportBundleError('BUNDLE_INVARIANT_FAILED', stage)
    expect({ stage: error.stage, frozen: Object.isFrozen(error), detailCode: error.detailCode }).toEqual({ stage, frozen: true, detailCode: null })
  })

  it('composes identities, visits, consents and all source payloads without losing one row', async () => {
    const loaded = loadedSources()
    const result = await createClinicImportBundle(input(), { loadSources: loader(loaded) })
    expect({ sourceRows: result.sourceRows.length, expectedSourceRows: Object.values(loaded.sources).reduce((count, value) => count + value.rows.length, 0), linkedPatientPayloads: result.sourceRows.filter(({ sourceRole }) => sourceRole !== 'invoices').filter(({ patientId }) => patientId !== null).length, patients: result.patients.length, supplemental: result.patients.filter(({ isSupplemental }) => isSupplemental).length, visits: result.historicalVisits.length, visitDetails: result.visitDetails.length, invoices: result.invoices.length, invoiceStatuses: new Set(result.invoices.map(({ status }) => status)), consents: result.consents.map(({ status }) => status).sort(), attachments: result.attachments, visitTotal: result.report.visits.total, visitParts: result.report.visits.linked + result.report.visits.ambiguous + result.report.visits.unmatched }).toEqual({ sourceRows: 19, expectedSourceRows: 19, linkedPatientPayloads: 7, patients: 2, supplemental: 1, visits: 2, visitDetails: 2, invoices: 12, invoiceStatuses: new Set(['incomplete_source']), consents: ['granted', 'not_granted'], attachments: [], visitTotal: 2, visitParts: 2 })
  })

  it('records pre-merge birth-date validity only on primary source rows', async () => {
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedSources()) })
    const primary = result.sourceRows.filter(({ sourceRole }) => sourceRole === 'pd').map(({ birthDateValid }) => birthDateValid)
    const other = new Set(result.sourceRows.filter(({ sourceRole }) => sourceRole !== 'pd').map(({ birthDateValid }) => birthDateValid))
    expect({ primary, other, control: result.report.controls.validBirthDates }).toEqual({ primary: [true], other: new Set([null]), control: 1 })
  })

  it('accepts the immutable result shape produced by the real seven-source loader', async () => {
    const fixture = await loaderFixture()
    const prepared = await captured(() => createClinicImportBundle(Object.freeze({ ...input(), sourcePaths: fixture.paths }), { loadSources: fixture.loadSources }))
    expect({ code: prepared.error?.code ?? null, sourceRows: prepared.value?.report.sourceRows.total, patients: prepared.value?.report.patients.total, visits: prepared.value?.report.visits.total, manifestMatches: prepared.value !== null && prepared.value.manifest.sha256 === prepared.value.report.manifestHash }).toEqual({ code: null, sourceRows: 19, patients: 2, visits: 2, manifestMatches: true })
  })

  it('adapts prioritized birth, contact, passport and address fields into protected patient structures', async () => {
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedSources()) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    expect({ birthDate: primary.profile.birthDate, contacts: result.contacts.filter(({ patientId }) => patientId === primary.id).map(({ kind }) => kind).sort(), passportSeries: privateData.value.passport.series, locality: privateData.value.address.locality }).toEqual({ birthDate: '1988-02-29', contacts: ['email', 'phone'], passportSeries: '12 34', locality: 'Тестов' })
  })

  it('returns only immutable aggregate values in its safe report', async () => {
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedSources()) })
    const report = JSON.stringify(result.report)
    expect({ frozen: Object.isFrozen(result) && Object.isFrozen(result.report) && Object.isFrozen(result.sourceRows[0]), leaks: SECRET_VALUES.some((value) => report.includes(value)), manifestHash: result.report.manifestHash, rowsQueuedForEncryption: result.report.sourceRows.total }).toEqual({ frozen: true, leaks: false, manifestHash: result.manifest.sha256, rowsQueuedForEncryption: result.sourceRows.length })
  })

  it('enforces an explicit control profile and publishes the measured control totals', async () => {
    const loaded = loadedSources()
    const accepted = await captured(() => createClinicImportBundle(input(SYNTHETIC_CONTROLS), { loadSources: loader(loaded) }))
    const rejected = await captured(() => createClinicImportBundle(input(CLINIC_IMPORT_PRODUCTION_CONTROLS), { loadSources: loader(loaded) }))
    expect({ acceptedError: accepted.error, controls: accepted.value?.report.controls, rejectedCode: rejected.error?.code, rejectedStage: rejected.error?.stage }).toEqual({ acceptedError: null, controls: SYNTHETIC_CONTROLS, rejectedCode: 'BUNDLE_INVARIANT_FAILED', rejectedStage: 'production_controls' })
  })

  it('treats the exact name-history total as a production control', async () => {
    const controls = Object.freeze({ ...SYNTHETIC_CONTROLS, nameHistoryRecords: 1 })
    const result = await captured(() => createClinicImportBundle(input(controls), { loadSources: loader(loadedSources()) }))
    expect({ code: result.error?.code, stage: result.error?.stage }).toEqual({ code: 'BUNDLE_INVARIANT_FAILED', stage: 'production_controls' })
  })

  it('rejects an explicit null control profile instead of disabling reconciliation', async () => {
    const result = await captured(() => createClinicImportBundle(input(null), { loadSources: loader(loadedSources()) }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ name: 'ClinicImportBundleError', code: 'INVALID_BUNDLE_INPUT', frozen: true })
  })

  it.each([undefined, SYNTHETIC_CONTROLS])('never accepts a caller-owned production control override', async (expectedControls) => {
    const request = Object.freeze({ sourcePaths: null, fingerprintKey: FINGERPRINT_KEY, expectedControls })
    const result = await captured(() => createClinicImportBundle(request))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ name: 'ClinicImportBundleError', code: 'INVALID_BUNDLE_INPUT', frozen: true })
  })

  it('rejects selected source content above the aggregate capture boundary before adapting payloads', async () => {
    const loaded = loadedSources()
    const privateText = 'Ж'.repeat(20_000)
    const invoices = source('invoices', Array.from({ length: 4_500 }, (_, index) => sourceRow('invoices', index + 2, { ...invoiceValues(index + 1), service_name: privateText })))
    const result = await captured(() => createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { invoices })) }))
    expect({ name: result.error?.name, code: result.error?.code, stage: result.error?.stage }).toEqual({ name: 'ClinicImportBundleError', code: 'INPUT_TOO_COMPLEX', stage: 'sources' })
  })

  it('accepts selected source content above 192 MiB work but below the measured 512 MiB boundary', async () => {
    const loaded = loadedSources()
    const privateText = 'Ж'.repeat(20_000)
    const invoices = source('invoices', Array.from({ length: 4_000 }, (_, index) => sourceRow('invoices', index + 2, { ...invoiceValues(index + 1), service_name: privateText })))
    const prepared = await captured(() => createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { invoices })) }))
    expect({ code: prepared.error?.code ?? null, invoices: prepared.value?.report.invoices.total, sourceRows: prepared.value?.report.sourceRows.total }).toEqual({ code: null, invoices: 4_000, sourceRows: 4_007 })
  })

  it('does not charge the source budget again for redundant loader convenience aliases', async () => {
    const loaded = loadedSources()
    const repeatedAlias = Object.freeze(Array(249_000).fill('x'.repeat(128)))
    const loaderShape = Object.freeze({ sources: loaded.sources, patientSources: Object.freeze({ primary: repeatedAlias, leftJoins: repeatedAlias }), visits: repeatedAlias, invoices: repeatedAlias, manifest: loaded.manifest })
    const prepared = await captured(() => createClinicImportBundle(input(), { loadSources: loader(loaderShape) }))
    expect({ code: prepared.error?.code ?? null, patients: prepared.value?.report.patients.total, visits: prepared.value?.report.visits.total, sourceRows: prepared.value?.report.sourceRows.total }).toEqual({ code: null, patients: 2, visits: 2, sourceRows: 19 })
  })

  it('reads only data descriptors for sources and manifest from the real loader result shape', async () => {
    const loaded = loadedSources()
    let redundantReads = 0
    const loaderShape = { sources: loaded.sources, manifest: loaded.manifest }
    for (const key of ['patientSources', 'visits', 'invoices']) Object.defineProperty(loaderShape, key, { enumerable: true, get: () => { redundantReads += 1; throw new Error('private redundant alias') } })
    const prepared = await captured(() => createClinicImportBundle(input(), { loadSources: loader(loaderShape) }))
    expect({ code: prepared.error?.code ?? null, redundantReads, patients: prepared.value?.report.patients.total, frozen: Object.isFrozen(prepared.value) }).toEqual({ code: null, redundantReads: 0, patients: 2, frozen: true })
  })

  it('snapshots an array own length descriptor without invoking a proxy length getter', async () => {
    const loaded = loadedSources()
    let reads = 0
    const rows = new Proxy([...loaded.sources.pd.rows], { get: (target, property, receiver) => { if (property === 'length') reads += 1; return Reflect.get(target, property, receiver) } })
    const pd = Object.freeze({ ...loaded.sources.pd, rows })
    const prepared = loadedWithSources(loaded, { pd })
    reads = 0
    const result = await createClinicImportBundle(input(), { loadSources: loader(prepared) })
    expect({ reads, patients: result.report.patients.total }).toEqual({ reads: 0, patients: 2 })
  })

  it('uses one aggregate descriptor snapshot when a loader proxy swaps a collection', async () => {
    const loaded = structuredClone(loadedSources())
    const row = sourceRow('medesk', 2, { ...loaded.sources.medesk.rows[0].values, extra: 'Ж'.repeat(20_000) })
    const medesk = Object.freeze({ ...loaded.sources.medesk, rows: Object.freeze(Array(2_000).fill(row)) })
    let reads = 0
    const result = new Proxy(loaded, { getOwnPropertyDescriptor: (target, property) => property === 'sources' ? { configurable: true, enumerable: true, writable: true, value: ++reads === 1 ? target.sources : Object.freeze({ ...target.sources, medesk }) } : Reflect.getOwnPropertyDescriptor(target, property) })
    const prepared = await captured(() => createClinicImportBundle(input(), { loadSources: loader(result) }))
    expect({ reads, error: prepared.error?.code ?? null, patients: prepared.value?.report.patients.total }).toEqual({ reads: 1, error: null, patients: 2 })
  })

  it('normalizes a revoked loader rejection into a frozen value-free bundle error', async () => {
    const rejected = Proxy.revocable({}, {})
    rejected.revoke()
    const result = await captured(() => createClinicImportBundle(input(), { loadSources: async () => Promise.reject(rejected.proxy) }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), message: result.error?.message }).toEqual({ name: 'ClinicImportBundleError', code: 'BUNDLE_INVARIANT_FAILED', frozen: true, message: 'Clinic import bundle could not be prepared' })
  })

  it('uses a short legacy card only with one exact normalized full-name match', async () => {
    const loaded = loadedSources()
    const matching = loaded.sources.legacyPatients.rows[0]
    const unrelated = sourceRow('legacyPatients', 2, { ...matching.values, 'Фамилия': 'Другая', 'Имя': 'Персона', 'Отчество': 'Тестовна', 'Полное имя': 'Другая Персона Тестовна', 'Системный ID': '', 'Заметки': 'Чужая заметка', 'Согласия на коммуникацию': '' })
    const intended = sourceRow('legacyPatients', 3, { ...matching.values, 'Системный ID': '', 'Заметки': 'Правильная заметка' })
    const legacyPatients = source('legacyPatients', [unrelated, intended])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { legacyPatients })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    const unrelatedPayload = result.sourceRows.find(({ sourceRole, sourceRow }) => sourceRole === 'legacyPatients' && sourceRow === 2)
    const intendedPayload = result.sourceRows.find(({ sourceRole, sourceRow }) => sourceRole === 'legacyPatients' && sourceRow === 3)
    expect({ notes: privateData.value.notes, consent: result.consents.find(({ patientId }) => patientId === primary.id)?.status, ambiguousLegacyIssues: result.normalizationIssues.filter(({ code, field }) => code === 'AMBIGUOUS_LEFT_JOIN' && field === 'legacy_join').length, unrelatedPatientId: unrelatedPayload.patientId, intendedPatientId: intendedPayload.patientId }).toEqual({ notes: 'Правильная заметка', consent: 'granted', ambiguousLegacyIssues: 0, unrelatedPatientId: null, intendedPatientId: primary.id })
  })

  it('consolidates repeated consent observations after confirmed patient merging', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.pd.rows[0]
    const repeated = sourceRow('pd', 3, { ...original.values, 'Номер карты (MEDESK)': '0000000000007003' })
    const pd = source('pd', [original, repeated])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { pd })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    expect({ primaryPatients: result.patients.filter(({ isSupplemental }) => !isSupplemental).length, primaryConsents: result.consents.filter(({ patientId }) => patientId === primary.id).length, reportedConsents: result.report.patients.consents, mergeEvidence: result.identityMergeEvidence }).toEqual({ primaryPatients: 1, primaryConsents: 1, reportedConsents: 2, mergeEvidence: [{ ordinal: 1, patientId: primary.id, reason: 'sameFioMissingBirthDate', sources: [{ sourceName: FILENAMES.pd, sourceRow: 2 }, { sourceName: FILENAMES.pd, sourceRow: 3 }] }] })
  })

  it('copies legacy notes and consent only when the legacy and primary row join is one-to-one', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.pd.rows[0]
    const repeated = sourceRow('pd', 3, { ...original.values, 'Номер карты (MEDESK)': '0000000000007003' })
    const pd = source('pd', [original, repeated])
    const legacyOriginal = loaded.sources.legacyPatients.rows[0]
    const shared = sourceRow('legacyPatients', 2, { ...legacyOriginal.values, 'Системный ID': '' })
    const legacyPatients = source('legacyPatients', [shared])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { pd, legacyPatients })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    expect({ notes: privateData.value.notes, consent: result.consents.find(({ patientId }) => patientId === primary.id)?.status, legacyPatientId: result.sourceRows.find(({ sourceRole }) => sourceRole === 'legacyPatients').patientId }).toEqual({ notes: null, consent: 'not_granted', legacyPatientId: null })
  })

  it('keeps pre-merge birth-date controls while validating a corroborated surname merge without chronology', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.pd.rows[0]
    const base = { ...original.values, 'Номер карты (клиника)': 'СМЕНА-76', 'Дата рождения': '', 'Почта 1': '', 'Телефон 1': '9991112233', 'Паспорт (серия)': '', 'Паспорт (номер)': '', 'Номер договора': '', 'ИНН': '', 'СНИЛС': '' }
    const pd = source('pd', [sourceRow('pd', 2, { ...base, 'Фамилия': 'Прежняя' }), sourceRow('pd', 3, { ...base, 'Номер карты (MEDESK)': '0000000000007003', 'Фамилия': 'Текущая' })])
    const patients = source('patients', [sourceRow('patients', 2, { ehr: PRIMARY_EHR, customId: 'СМЕНА-76', birthday: '1988-02-29T00:00:00.000Z', tags: '' }), sourceRow('patients', 3, { ehr: '0000000000007003', customId: 'СМЕНА-76', birthday: '1988-02-29T00:00:00.000Z', tags: '' })])
    const medeskOriginal = loaded.sources.medesk.rows[0]
    const medesk = source('medesk', [sourceRow('medesk', 2, { ...medeskOriginal.values, 'День рождения': '' }), sourceRow('medesk', 3, { ...medeskOriginal.values, '#': '2', 'Карта': PRIMARY_EHR, 'Когда добавлен': '', 'Имя': 'Прежняя Ия Тестовна', 'День рождения': '' }), sourceRow('medesk', 4, { ...medeskOriginal.values, '#': '3', 'Карта': '0000000000007003', 'Когда добавлен': '', 'Имя': 'Текущая Ия Тестовна', 'День рождения': '' })])
    const legacyPatients = source('legacyPatients', [])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { pd, patients, medesk, legacyPatients })) })
    expect({ primaryPatients: result.patients.filter(({ isSupplemental }) => !isSupplemental).length, surnameChanges: result.identityEvidenceCounts.surnameChange, history: result.nameHistory.length, validBirthDates: result.report.controls.validBirthDates }).toEqual({ primaryPatients: 1, surnameChanges: 1, history: 1, validBirthDates: 2 })
  })

  it('prefers a known consent observation time over a null observation after merging', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.pd.rows[0]
    const repeated = sourceRow('pd', 3, { ...original.values, 'Номер карты (MEDESK)': '0000000000007003' })
    const pd = source('pd', [original, repeated])
    const legacyOriginal = loaded.sources.legacyPatients.rows[0]
    const undated = sourceRow('legacyPatients', 3, { ...legacyOriginal.values, '\uFEFFДата создания': '', 'Дата изменения': '', 'Системный ID': '0000000000007003' })
    const legacyPatients = source('legacyPatients', [legacyOriginal, undated])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { pd, legacyPatients })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    expect(result.consents.find(({ patientId }) => patientId === primary.id).observedAt).toBe('2024-01-01T00:00:00.000Z')
  })

  it('does not let a supplemental MEDESK row replace PD contacts or private data on an enriched primary patient', async () => {
    const loaded = loadedSources()
    const medeskRow = loaded.sources.medesk.rows[0]
    const enriched = sourceRow('medesk', 2, { ...medeskRow.values, 'Карта': SUPPLEMENTAL_EHR, 'Когда добавлен': '2025-01-01T00:00:00.000Z', 'Имя': 'Секретова Ия Тестовна', 'День рождения': '29.02.1988', 'Адрес': 'Чужой адрес', 'Телефон': '9998887766', 'Работа': 'Чужая работа' })
    const medesk = source('medesk', [enriched])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { medesk })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    expect({ phones: result.contacts.filter(({ patientId, kind }) => patientId === primary.id && kind === 'phone').length, addressIsStructured: typeof privateData.value.address === 'object', locality: privateData.value.address.locality, employment: privateData.value.employment ?? null }).toEqual({ phones: 1, addressIsStructured: true, locality: 'Тестов', employment: null })
  })

  it('retains normalized MEDESK contacts and private fields only for a supplemental patient', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.medesk.rows[0]
    const enriched = sourceRow('medesk', 2, { ...original.values, 'Адрес': 'Дополнительный адрес', 'Телефон': '9998887766', 'Почта': 'SUPPLEMENTAL@EXAMPLE.TEST', 'Метки': 'дополнительная', 'Работа': 'Тестовая работа' })
    const medesk = source('medesk', [enriched])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { medesk })) })
    const supplemental = result.patients.find(({ isSupplemental }) => isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === supplemental.id)
    expect({ contacts: result.contacts.filter(({ patientId }) => patientId === supplemental.id).map(({ kind }) => kind).sort(), privateData: privateData.value, consent: result.consents.find(({ patientId }) => patientId === supplemental.id)?.status }).toEqual({ contacts: ['email', 'phone'], privateData: { address: 'Дополнительный адрес', employment: 'Тестовая работа', gender: 'female', tags: 'дополнительная' }, consent: 'not_granted' })
  })

  it('leaves an ambiguous duplicate auxiliary EHR join unresolved instead of consuming physical row order', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.patients.rows[0]
    const conflicting = sourceRow('patients', 2, { ...original.values, birthday: '1990-01-01T00:00:00.000Z' })
    const expected = sourceRow('patients', 3, original.values)
    const patients = source('patients', [conflicting, expected])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { patients })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    expect({ birthDate: primary.profile.birthDate, ambiguousBirthJoins: result.normalizationIssues.filter(({ code, field }) => code === 'AMBIGUOUS_LEFT_JOIN' && field === 'birth_date').length }).toEqual({ birthDate: '1988-02-29', ambiguousBirthJoins: 1 })
  })

  it('does not link an invoice and visit through two absent appointment identifiers', async () => {
    const loaded = loadedSources()
    const visits = source('visits', [sourceRow('visits', 2, visitValues({ appointment_id: '' }))])
    const invoices = source('invoices', [sourceRow('invoices', 2, { ...invoiceValues(1), appointment_id: '' })])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { visits, invoices })) })
    expect(result.invoices[0].historicalVisitId).toBeNull()
  })

  it('leaves invoices unlinked when an exact appointment identifier names multiple visits', async () => {
    const loaded = loadedSources()
    const visits = source('visits', loaded.sources.visits.rows.map((row) => sourceRow('visits', row.sourceRow, { ...row.values, appointment_id: 'appointment-synthetic' })))
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { visits })) })
    expect(new Set(result.invoices.map(({ historicalVisitId }) => historicalVisitId))).toEqual(new Set([null]))
  })

  it('preserves unknown source chronology as null instead of deriving dates from physical row order', async () => {
    const loaded = loadedSources()
    const legacyPatients = source('legacyPatients', [])
    const medeskOriginal = loaded.sources.medesk.rows[0]
    const medesk = source('medesk', [sourceRow('medesk', 2, { ...medeskOriginal.values, 'Когда добавлен': '' })])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { legacyPatients, medesk })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const supplemental = result.patients.find(({ isSupplemental }) => isSupplemental)
    expect({ primaryFirstSeenAt: primary.firstSeenAt, primaryLastSeenAt: primary.lastSeenAt, supplementalFirstSeenAt: supplemental.firstSeenAt, supplementalLastSeenAt: supplemental.lastSeenAt, consentObservedAt: result.consents.find(({ patientId }) => patientId === primary.id).observedAt }).toEqual({ primaryFirstSeenAt: null, primaryLastSeenAt: null, supplementalFirstSeenAt: null, supplementalLastSeenAt: null, consentObservedAt: null })
  })

  it('rejects timezone-coercing and calendar-invalid source timestamps instead of using Date heuristics', async () => {
    const loaded = loadedSources()
    const legacyOriginal = loaded.sources.legacyPatients.rows[0]
    const legacy = sourceRow('legacyPatients', 2, { ...legacyOriginal.values, '\uFEFFДата создания': '31.02.2024', 'Дата изменения': '2024-01-01T03:00:00+03:00' })
    const legacyPatients = source('legacyPatients', [legacy])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { legacyPatients })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    expect({ observedAt: primary.firstSeenAt, createdAt: privateData.value.legacyCreatedAt, updatedAt: privateData.value.legacyUpdatedAt }).toEqual({ observedAt: null, createdAt: null, updatedAt: null })
  })

  it('normalizes the measured spaced legacy timestamp without local timezone coercion', async () => {
    const loaded = loadedSources()
    const legacyOriginal = loaded.sources.legacyPatients.rows[0]
    const legacy = sourceRow('legacyPatients', 2, { ...legacyOriginal.values, '\uFEFFДата создания': '07.11.2021 13:45', 'Дата изменения': '' })
    const legacyPatients = source('legacyPatients', [legacy])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { legacyPatients })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    expect({ observedAt: primary.firstSeenAt, createdAt: privateData.value.legacyCreatedAt }).toEqual({ observedAt: '2021-11-07T13:45:00.000Z', createdAt: '2021-11-07T13:45:00.000Z' })
  })

  it('deduplicates repeated normalization failures by stable issue id', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.medesk.rows[0]
    const repeated = sourceRow('medesk', 2, { ...original.values, 'Карта': PRIMARY_EHR, 'Пол': 'неподдерживаемое\u0000значение' })
    const medesk = source('medesk', [repeated])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { medesk })) })
    const matching = result.normalizationIssues.filter(({ source, field }) => source.sourceName === FILENAMES.medesk && source.sourceRow === 2 && field === 'gender')
    expect({ count: matching.length, uniqueIds: new Set(result.normalizationIssues.map(({ id }) => id)).size }).toEqual({ count: 1, uniqueIds: result.normalizationIssues.length })
  })

  it('keeps only checksum-valid Russian INN and SNILS values in structured identity data', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.pd.rows[0]
    const inn = validInn10('123456789')
    const snils = validSnils('123456789')
    const pd = source('pd', [sourceRow('pd', 2, { ...original.values, 'ИНН': inn, 'СНИЛС': `${snils.slice(0, 3)}-${snils.slice(3, 6)}-${snils.slice(6, 9)} ${snils.slice(9)}` })])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { pd })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    expect(result.privateData.find(({ patientId }) => patientId === primary.id).value).toMatchObject({ inn, snils })
  })

  it('leaves invalid INN and SNILS only in encrypted raw source payloads with safe issues', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.pd.rows[0]
    const pd = source('pd', [sourceRow('pd', 2, { ...original.values, 'ИНН': '1234567890', 'СНИЛС': '123-456-789 00' })])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { pd })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    expect({ inn: privateData.value.inn, snils: privateData.value.snils, innIssues: result.normalizationIssues.filter(({ field }) => field === 'inn').length, snilsIssues: result.normalizationIssues.filter(({ field }) => field === 'snils').length }).toEqual({ inn: null, snils: null, innIssues: 1, snilsIssues: 1 })
  })

  it('rejects checksum-valid INN and SNILS values with noncanonical punctuation', async () => {
    const loaded = loadedSources()
    const original = loaded.sources.pd.rows[0]
    const inn = validInn10('123456789')
    const snils = validSnils('123456789')
    const pd = source('pd', [sourceRow('pd', 2, { ...original.values, 'ИНН': `${inn.slice(0, 2)}-${inn.slice(2)}`, 'СНИЛС': `${snils.slice(0, 2)}-${snils.slice(2)}` })])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { pd })) })
    const primary = result.patients.find(({ isSupplemental }) => !isSupplemental)
    const privateData = result.privateData.find(({ patientId }) => patientId === primary.id)
    expect({ inn: privateData.value.inn, snils: privateData.value.snils, issues: result.normalizationIssues.filter(({ field }) => ['inn', 'snils'].includes(field)).map(({ field }) => field).sort() }).toEqual({ inn: null, snils: null, issues: ['inn', 'snils'] })
  })

  it('does not associate an unrelated MEDESK payload by a short clinic card alone', async () => {
    const loaded = loadedSources()
    const medeskOriginal = loaded.sources.medesk.rows[0]
    const unrelated = sourceRow('medesk', 2, { ...medeskOriginal.values, 'Карта': 'С-7001', 'Имя': 'Другая Персона Тестовна' })
    const medesk = source('medesk', [unrelated])
    const result = await createClinicImportBundle(input(), { loadSources: loader(loadedWithSources(loaded, { medesk })) })
    expect(result.sourceRows.find(({ sourceRole }) => sourceRole === 'medesk').patientId).toBeNull()
  })

  it('fails atomically for an included medical-document source or source-count drift', async () => {
    const loaded = loadedSources()
    const withRecords = Object.freeze({ ...loaded, sources: Object.freeze({ ...loaded.sources, records: source('pd', [sourceRow('pd', 99, { secret: 'medical-document' })]) }) })
    const drift = Object.freeze({ ...loaded, manifest: Object.freeze({ ...loaded.manifest, files: Object.freeze(loaded.manifest.files.map((file) => file.role === 'visits' ? Object.freeze({ ...file, rowCount: file.rowCount + 1 }) : file)) }) })
    const [medical, counts] = await Promise.all([captured(() => createClinicImportBundle(input(), { loadSources: loader(withRecords) })), captured(() => createClinicImportBundle(input(), { loadSources: loader(drift) }))])
    expect([medical, counts].map(({ error }) => ({ name: error?.name, code: error?.code, frozen: Object.isFrozen(error), leaked: error?.message.includes('medical-document') }))).toEqual([{ name: 'ClinicImportBundleError', code: 'BUNDLE_INVARIANT_FAILED', frozen: true, leaked: false }, { name: 'ClinicImportBundleError', code: 'BUNDLE_INVARIANT_FAILED', frozen: true, leaked: false }])
  })

  it('wraps malicious input accessors without reading their returned patient values', async () => {
    let reads = 0
    const malicious = Object.defineProperty({}, 'sourcePaths', { enumerable: true, get: () => {
      reads += 1
      return 'hidden-patient-value'
    } })
    const result = await captured(() => createClinicImportBundle(malicious, { loadSources: loader(loadedSources()) }))
    expect({ reads, name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), leaked: result.error?.message.includes('hidden-patient-value') }).toEqual({ reads: 0, name: 'ClinicImportBundleError', code: 'INVALID_BUNDLE_INPUT', frozen: true, leaked: false })
  })
})
