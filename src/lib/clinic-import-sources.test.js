import { appendFile, mkdir, mkdtemp, readFile, realpath, rename, rmdir, symlink, unlink, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadClinicImportSources, verifyClinicImportSourceManifest } from './clinic-import-sources.js'
import { parseTabularCsv } from './tabular-csv.js'

const PD_FILENAME = '544663c3807aab090001bad8PD.csv'
const PATIENTS_FILENAME = '544663c3807aab090001bad8_patients.csv'
const VISITS_FILENAME = '544663c3807aab090001bad8_visits.csv'
const INVOICES_FILENAME = '544663c3807aab090001bad8_invoices.csv'
const PD_WORKBOOK_FILENAME = '544663c3807aab090001bad8PD — копия.xlsx'
const MEDESK_FILENAME = 'medesk.csv'
const LEGACY_PATIENTS_FILENAME = 'Vse pacienty.xlsx'
const PD_HEADERS = Object.freeze(['Номер карты (MEDESK)', 'Номер карты (клиника)', 'Фамилия', 'Имя', 'Отчество', 'Дата рождения', 'Пол', 'Представители', 'Метки', 'Почта 1', 'Почта 2', 'Телефон 1', 'Телефон 2', 'Паспорт (серия)', 'Паспорт (номер)', 'Паспорт (кем выдан)', 'Паспорт (дата выдачи)', 'Паспорт (код подразделения)', 'Свид. о рождении (серия)', 'Свид. о рождении (номер)', 'Свид. о рождении (кем выдан)', 'Свид. о рождении (дата выдачи)', 'ИНН', 'СНИЛС', 'Номер пенсионного удостоверения', 'Адрес (индекс)', 'Адрес (область)', 'Адрес (населенный пункт)', 'Адрес (улица, дом, кв.)', 'Кем создан', 'Номер договора', 'Ответственный сотрудник'])
const PATIENTS_HEADERS = Object.freeze(['ehr', 'customId', 'birthday', 'tags'])
const VISITS_HEADERS = Object.freeze(['appointment_id', 'appointment_begin', 'appointment_end', 'cabinet', 'status', 'patient_card', 'doctor', 'doctor_role', 'service_names', 'invoice_ids', 'comment'])
const INVOICES_HEADERS = Object.freeze(['invoice_id', 'total_amount', 'paid_amount', 'invoice_status', 'payer_patient_card', 'payer_enterprise_name', 'invoice_date', 'created_by', 'invoice_item_id', 'appointment_id', 'service_name', 'service_price', 'service_quantity', 'invoice_item_price', 'invoice_item_discount', 'invoice_item_tax'])
const PD_WORKBOOK_HEADERS = Object.freeze(['Номер карты (MEDESK)', 'Номер карты (клиника)', '__unnamed_C', 'Фамилия', 'Имя', 'Отчество', 'Дата рождения', 'Пол', '__unnamed_I', 'Представители', 'Метки', 'Почта 1', 'Почта 2', 'Телефон 1', 'Телефон 2', 'Паспорт (серия)', 'Паспорт (номер)', 'Паспорт (кем выдан)', 'Паспорт (дата выдачи)', '__unnamed_T', 'Паспорт (код подразделения)', 'Свид. о рождении (серия)', 'Свид. о рождении (номер)', 'Свид. о рождении (кем выдан)', 'Свид. о рождении (дата выдачи)', 'ИНН', 'СНИЛС', 'Номер пенсионного удостоверения', 'Адрес (индекс)', 'Адрес (область)', 'Адрес (населенный пункт)', 'Адрес (улица, дом, кв.)', 'Кем создан', 'Номер договора', 'Ответственный сотрудник'])
const MEDESK_HEADERS = Object.freeze(['#', 'Карта', 'Когда добавлен', 'Имя', 'Пол', 'День рождения', 'Возраст', 'Метки', 'Адрес', 'Телефон', 'Почта', 'Работа'])
const LEGACY_PATIENTS_HEADERS = Object.freeze(['\uFEFFДата создания', 'Дата изменения', 'Фамилия', 'Имя', 'Отчество', 'Телефон', 'Email', 'Всего оплачено по счетам', 'Дата рождения', 'Заметки', 'Кол-во анкет', 'Номер карты', 'Кол-во приемов', 'Полное имя', 'Системный ID', 'Согласия на коммуникацию'])
const CONTRACTS = Object.freeze({
  pd: Object.freeze({ filename: PD_FILENAME, headers: PD_HEADERS, delimiter: '\t' }),
  patients: Object.freeze({ filename: PATIENTS_FILENAME, headers: PATIENTS_HEADERS, delimiter: '\t' }),
  visits: Object.freeze({ filename: VISITS_FILENAME, headers: VISITS_HEADERS, delimiter: '\t' }),
  invoices: Object.freeze({ filename: INVOICES_FILENAME, headers: INVOICES_HEADERS, delimiter: '\t' }),
  pdWorkbook: Object.freeze({ filename: PD_WORKBOOK_FILENAME, headers: PD_WORKBOOK_HEADERS }),
  medesk: Object.freeze({ filename: MEDESK_FILENAME, headers: MEDESK_HEADERS, delimiter: ';' }),
  legacyPatients: Object.freeze({ filename: LEGACY_PATIENTS_FILENAME, headers: LEGACY_PATIENTS_HEADERS })
})

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function valuesFrom(headers, seed) {
  return Object.freeze(Object.fromEntries(headers.map((header, index) => [header, index === 0 ? seed : ''])))
}

function csvFrom(contract, seed) {
  const row = contract.headers.map((_, index) => index === 0 ? seed : '').join(contract.delimiter)
  return Buffer.from(`${contract.headers.join(contract.delimiter)}\n${row}\n`, 'utf8')
}

async function syntheticXlsx(filePath) {
  const bytes = await readFile(filePath)
  const contract = basename(filePath) === PD_WORKBOOK_FILENAME ? CONTRACTS.pdWorkbook : CONTRACTS.legacyPatients
  const sourceRow = basename(filePath) === PD_WORKBOOK_FILENAME ? 4 : 7
  return Object.freeze({ headers: contract.headers, rows: Object.freeze([{ sourceRow, values: valuesFrom(contract.headers, `синтетика-${sourceRow}`) }]), snapshot: Object.freeze({ sha256: digest(bytes), byteSize: bytes.byteLength }) })
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-sources-'))
  const paths = {}
  const bytes = {}
  for (const [role, contract] of Object.entries(CONTRACTS)) {
    const content = contract.delimiter === undefined ? Buffer.from(`synthetic-xlsx-${role}`, 'utf8') : csvFrom(contract, `синтетика-${role}`)
    paths[role] = join(directory, contract.filename)
    bytes[role] = content
    await writeFile(paths[role], content)
  }
  return Object.freeze({ directory, paths: Object.freeze(paths), bytes: Object.freeze(bytes) })
}

async function load(paths, options = Object.freeze({})) {
  return loadClinicImportSources(paths, { readXlsxImpl: syntheticXlsx, ...options })
}

async function errorFrom(operation) {
  try {
    await operation()
    return Object.freeze({ code: 'NO_ERROR', message: '', role: '' })
  } catch (error) {
    return Object.freeze({ code: error.code ?? error.name, message: error.message, role: error.role ?? '' })
  }
}

async function thrownFrom(operation) {
  try {
    await operation()
    return undefined
  } catch (error) {
    return error
  }
}

describe('loadClinicImportSources', () => {
  it('returns patient inputs in approved left-join priority', async () => {
    const input = await fixture()
    const result = await load(input.paths)
    expect({ primary: result.patientSources.primary.role, leftJoins: result.patientSources.leftJoins.map((source) => source.role) }).toEqual({ primary: 'pd', leftJoins: ['patients', 'pdWorkbook', 'medesk', 'legacyPatients'] })
  })

  it('preserves physical source row numbers and safe source names', async () => {
    const input = await fixture()
    const result = await load(input.paths)
    expect(Object.values(result.sources).map((source) => [source.role, source.rows[0].sourceRow, source.rows[0].sourceName])).toEqual([['pd', 2, PD_FILENAME], ['patients', 2, PATIENTS_FILENAME], ['visits', 2, VISITS_FILENAME], ['invoices', 2, INVOICES_FILENAME], ['pdWorkbook', 4, PD_WORKBOOK_FILENAME], ['medesk', 2, MEDESK_FILENAME], ['legacyPatients', 7, LEGACY_PATIENTS_FILENAME]])
  })

  it('builds a safe manifest from the exact parsed bytes', async () => {
    const input = await fixture()
    const result = await load(input.paths)
    expect(result.manifest.files).toEqual(Object.entries(CONTRACTS).map(([role, contract]) => ({ role, filename: contract.filename, sha256: digest(input.bytes[role]), byteSize: input.bytes[role].byteLength, rowCount: 1, parsingMode: role === 'visits' ? 'legacy_physical_rows' : 'strict', structuralIssueCount: 0 })))
  })

  it('enables physical-row compatibility only for historical visits', async () => {
    const input = await fixture()
    const modes = []
    const parseCsvImpl = (bytes, options) => { modes.push([options.literalQuotes === true, options.padShortRows === true]); return parseTabularCsv(bytes, options) }
    await load(input.paths, { parseCsvImpl })
    expect(modes).toEqual([[false, false], [false, false], [true, true], [false, false], [false, false]])
  })

  it('propagates safe structural row issues into the source and manifest', async () => {
    const input = await fixture()
    const parseCsvImpl = (bytes, options) => { const result = parseTabularCsv(bytes, options); if (options.padShortRows !== true) return result; return { ...result, rows: [{ ...result.rows[0], structuralIssues: [{ code: 'SHORT_ROW', actualWidth: 9, expectedWidth: 11 }] }] } }
    const result = await load(input.paths, { parseCsvImpl })
    expect({ issues: result.sources.visits.rows[0].structuralIssues, count: result.manifest.files.find((file) => file.role === 'visits').structuralIssueCount }).toEqual({ issues: [{ code: 'SHORT_ROW', actualWidth: 9, expectedWidth: 11 }], count: 1 })
  })

  it('preserves a physical short visit row with literal quotes', async () => {
    const input = await fixture()
    const row = ['visit-synthetic', '', '', '', 'completed', '64-2', '', '', 'Услуга "Ёж"'].join('\t')
    await writeFile(input.paths.visits, `${VISITS_HEADERS.join('\t')}\n${row}\n`)
    const result = await load(input.paths)
    expect({ service: result.visits.rows[0].values.service_names, issue: result.visits.rows[0].structuralIssues[0], rows: result.visits.rows.length }).toEqual({ service: 'Услуга "Ёж"', issue: { code: 'SHORT_ROW', actualWidth: 9, expectedWidth: 11 }, rows: 1 })
  })

  it('rejects structural recovery metadata outside historical visits', async () => {
    const input = await fixture()
    let first = true
    const parseCsvImpl = (bytes, options) => { const result = parseTabularCsv(bytes, options); if (!first) return result; first = false; return { ...result, rows: [{ ...result.rows[0], structuralIssues: [{ code: 'SHORT_ROW', actualWidth: 31, expectedWidth: 32 }] }] } }
    expect((await errorFrom(() => load(input.paths, { parseCsvImpl }))).code).toBe('INVALID_SOURCE_ROWS')
  })

  it('keeps absolute source paths out of the manifest', async () => {
    const input = await fixture()
    const result = await load(input.paths)
    expect(JSON.stringify(result.manifest).includes(input.directory)).toBe(false)
  })

  it('produces the same manifest for identical files in different directories', async () => {
    const first = await fixture()
    const second = await fixture()
    expect((await load(first.paths)).manifest).toEqual((await load(second.paths)).manifest)
  })

  it('returns deeply immutable source data', async () => {
    const input = await fixture()
    const result = await load(input.paths)
    const source = result.sources.pd
    expect([result, result.sources, result.patientSources, result.patientSources.leftJoins, result.manifest, result.manifest.files, source, source.headers, source.rows, source.rows[0], source.rows[0].values, source.rows[0].structuralIssues].every(Object.isFrozen)).toBe(true)
  })

  it('returns immutable source errors without exposing caller paths', async () => {
    const input = await fixture()
    const error = await thrownFrom(() => load({ ...input.paths, visits: VISITS_FILENAME }))
    expect({ frozen: Object.isFrozen(error), code: error.code, role: error.role, leaked: error.message.includes(input.directory) }).toEqual({ frozen: true, code: 'INVALID_SOURCE_PATH', role: 'visits', leaked: false })
  })

  it('does not inspect medical or duplicate files beside approved sources', async () => {
    const input = await fixture()
    const observed = []
    await mkdir(join(input.directory, '_docs'))
    await writeFile(join(input.directory, '_docs', 'scan.bin'), 'medical-placeholder')
    await writeFile(join(input.directory, '544663c3807aab090001bad8_records.csv'), 'medical-placeholder')
    await writeFile(join(input.directory, '544663c3807aab090001bad8_visits111.txt'), 'duplicate-placeholder')
    await load(input.paths, { parseCsvImpl: (bytes, options) => { observed.push('csv'); return parseTabularCsv(bytes, options) }, readXlsxImpl: async (filePath) => { observed.push(basename(filePath)); return syntheticXlsx(filePath) } })
    expect(observed.sort()).toEqual(['Vse pacienty.xlsx', 'csv', 'csv', 'csv', 'csv', 'csv', PD_WORKBOOK_FILENAME].sort())
  })

  it('requires exactly the seven approved source roles', async () => {
    const input = await fixture()
    const paths = { ...input.paths, records: join(input.directory, '544663c3807aab090001bad8_records.csv') }
    expect((await errorFrom(() => load(paths))).code).toBe('INVALID_SOURCE_PATHS')
  })

  it('requires every approved source role', async () => {
    const input = await fixture()
    const paths = Object.fromEntries(Object.entries(input.paths).filter(([role]) => role !== 'medesk'))
    expect((await errorFrom(() => load(paths))).code).toBe('INVALID_SOURCE_PATHS')
  })

  it('requires absolute source paths', async () => {
    const input = await fixture()
    const paths = { ...input.paths, visits: VISITS_FILENAME }
    expect((await errorFrom(() => load(paths))).code).toBe('INVALID_SOURCE_PATH')
  })

  it.each(['_docs', '544663c3807aab090001bad8_docs'])('rejects an approved filename inside medical directory %s before filesystem access', async (segment) => {
    const input = await fixture()
    const calls = []
    const paths = { ...input.paths, visits: join(input.directory, segment, VISITS_FILENAME) }
    const error = await errorFrom(() => load(paths, { parseCsvImpl: () => { calls.push('csv') }, readXlsxImpl: async () => { calls.push('xlsx') }, realpathImpl: async () => { calls.push('realpath') } }))
    expect({ code: error.code, calls, leaked: error.message.includes(input.directory) }).toEqual({ code: 'PROHIBITED_SOURCE_PATH', calls: [], leaked: false })
  })

  it('rejects a source symlink resolving through a medical documents directory before reader access', async () => {
    const input = await fixture()
    const calls = []
    const medicalDirectory = join(input.directory, 'archive_docs')
    const linkDirectory = await mkdtemp(join(tmpdir(), 'clod-source-links-'))
    await mkdir(medicalDirectory)
    await writeFile(join(medicalDirectory, VISITS_FILENAME), input.bytes.visits)
    await symlink(join(medicalDirectory, VISITS_FILENAME), join(linkDirectory, VISITS_FILENAME))
    const paths = { ...input.paths, visits: join(linkDirectory, VISITS_FILENAME) }
    const error = await errorFrom(() => load(paths, { parseCsvImpl: () => { calls.push('csv') }, readXlsxImpl: async () => { calls.push('xlsx') } }))
    expect({ code: error.code, calls, leaked: error.message.includes(medicalDirectory) || error.message.includes(linkDirectory) }).toEqual({ code: 'PROHIBITED_SOURCE_PATH', calls: [], leaked: false })
  })

  it('does not follow a canonical source swapped to a medical symlink after realpath authorization', async () => {
    const input = await fixture()
    const medicalDirectory = join(input.directory, 'late_docs')
    const secret = 'private-medical-snapshot'
    let exposed = false
    await mkdir(medicalDirectory)
    await writeFile(join(medicalDirectory, VISITS_FILENAME), secret)
    const realpathImpl = async (filePath) => { const resolved = await realpath(filePath); if (filePath === input.paths.visits) { await unlink(filePath); await symlink(join(medicalDirectory, VISITS_FILENAME), filePath) } return resolved }
    const error = await errorFrom(() => load(input.paths, { realpathImpl, parseCsvImpl: (bytes, options) => { exposed ||= Buffer.from(bytes).includes(secret); return parseTabularCsv(bytes, options) } }))
    expect({ code: error.code, exposed }).toEqual({ code: 'SOURCE_UNAVAILABLE', exposed: false })
  })

  it('rejects an ancestor swapped to a medical directory between authorization and open without parsing', async () => {
    const input = await fixture()
    const safeDirectory = await mkdtemp(join(tmpdir(), 'clod-safe-ancestor-'))
    const parkedDirectory = `${safeDirectory}-parked`
    const medicalDirectory = await mkdtemp(join(tmpdir(), 'clod-late_docs-'))
    const visitsPath = join(safeDirectory, VISITS_FILENAME)
    const calls = []
    let armed = true
    await writeFile(visitsPath, input.bytes.visits)
    await writeFile(join(medicalDirectory, VISITS_FILENAME), 'private-medical-ancestor')
    const paths = { ...input.paths, visits: visitsPath }
    const realpathImpl = async (filePath) => { const resolved = await realpath(filePath); if (filePath === visitsPath && armed) { armed = false; await rename(safeDirectory, parkedDirectory); await symlink(medicalDirectory, safeDirectory, 'dir') } return resolved }
    const error = await errorFrom(() => load(paths, { realpathImpl, parseCsvImpl: () => { calls.push('parse') } }))
    expect({ code: error.code, calls, leaked: error.message.includes(medicalDirectory) }).toEqual({ code: 'SOURCE_UNAVAILABLE', calls: [], leaked: false })
  })

  it('wraps a throwing source path getter without retaining its value', async () => {
    const input = await fixture()
    const secret = 'private-path-getter'
    const paths = { ...input.paths }
    Object.defineProperty(paths, 'visits', { enumerable: true, get: () => { throw new Error(secret) } })
    const error = await errorFrom(() => load(paths))
    expect({ name: error.code, leaked: error.message.includes(secret) }).toEqual({ name: 'INVALID_SOURCE_PATHS', leaked: false })
  })

  it('wraps a throwing options getter without retaining its value', async () => {
    const input = await fixture()
    const secret = 'private-options-getter'
    const options = Object.defineProperty({}, 'readXlsxImpl', { enumerable: true, get: () => { throw new Error(secret) } })
    const error = await errorFrom(() => loadClinicImportSources(input.paths, options))
    expect({ code: error.code, leaked: error.message.includes(secret) }).toEqual({ code: 'INVALID_OPTIONS', leaked: false })
  })

  it('does not inspect a throwing error code getter from repeated realpath authorization', async () => {
    const input = await fixture()
    const secret = 'private-realpath-error-code'
    const calls = new Map()
    const realpathImpl = async (filePath) => { const count = (calls.get(filePath) ?? 0) + 1; calls.set(filePath, count); if (filePath === input.paths.visits && count === 2) throw Object.defineProperty({}, 'code', { get: () => { throw new Error(secret) } }); return realpath(filePath) }
    const error = await thrownFrom(() => load(input.paths, { realpathImpl }))
    expect({ code: error.code, leaked: error.message.includes(secret), frozen: Object.isFrozen(error) }).toEqual({ code: 'SOURCE_UNAVAILABLE', leaked: false, frozen: true })
  })

  it('wraps throwing parser result getters without retaining source values', async () => {
    const input = await fixture()
    const secret = 'private-parser-getter'
    const parseCsvImpl = () => Object.defineProperty({}, 'headers', { enumerable: true, get: () => { throw new Error(secret) } })
    const error = await errorFrom(() => load(input.paths, { parseCsvImpl }))
    expect({ code: error.code, leaked: error.message.includes(secret) }).toEqual({ code: 'INVALID_SOURCE_DOCUMENT', leaked: false })
  })

  it('wraps throwing workbook snapshot getters without retaining source values', async () => {
    const input = await fixture()
    const secret = 'private-workbook-getter'
    const readXlsxImpl = async (filePath) => { const result = await syntheticXlsx(filePath); return Object.defineProperty({ headers: result.headers, rows: result.rows }, 'snapshot', { enumerable: true, get: () => { throw new Error(secret) } }) }
    const error = await errorFrom(() => load(input.paths, { readXlsxImpl }))
    expect({ code: error.code, leaked: error.message.includes(secret) }).toEqual({ code: 'INVALID_SOURCE_DOCUMENT', leaked: false })
  })

  it('fails closed and still attempts directory cleanup when workbook unlink reports failure', async () => {
    const input = await fixture()
    const secret = 'private-unlink-cleanup'
    const calls = []
    const unlinkImpl = async (filePath) => { calls.push('unlink'); await unlink(filePath); throw new Error(secret) }
    const rmdirImpl = async (directory) => { calls.push('rmdir'); await rmdir(directory) }
    const error = await errorFrom(() => load(input.paths, { unlinkImpl, rmdirImpl }))
    expect({ code: error.code, calls, leaked: error.message.includes(secret), frozen: Object.isFrozen(await thrownFrom(() => load(input.paths, { unlinkImpl, rmdirImpl }))) }).toEqual({ code: 'SOURCE_CLEANUP_FAILED', calls: ['unlink', 'rmdir', 'unlink', 'rmdir'], leaked: false, frozen: true })
  })

  it('fails closed when workbook directory cleanup reports failure', async () => {
    const input = await fixture()
    const secret = 'private-rmdir-cleanup'
    const rmdirImpl = async (directory) => { await rmdir(directory); throw new Error(secret) }
    const error = await thrownFrom(() => load(input.paths, { rmdirImpl }))
    expect({ code: error.code, leaked: error.message.includes(secret), frozen: Object.isFrozen(error) }).toEqual({ code: 'SOURCE_CLEANUP_FAILED', leaked: false, frozen: true })
  })

  it('prioritizes plaintext cleanup failure when workbook parsing also fails', async () => {
    const input = await fixture()
    const secrets = ['private-parser-failure', 'private-cleanup-failure']
    const readXlsxImpl = async () => { throw new Error(secrets[0]) }
    const unlinkImpl = async (filePath) => { await unlink(filePath); throw new Error(secrets[1]) }
    const error = await thrownFrom(() => load(input.paths, { readXlsxImpl, unlinkImpl }))
    expect({ code: error.code, leaked: secrets.some((secret) => error.message.includes(secret)), frozen: Object.isFrozen(error) }).toEqual({ code: 'SOURCE_CLEANUP_FAILED', leaked: false, frozen: true })
  })

  it('wraps throwing row value getters without retaining source values', async () => {
    const input = await fixture()
    const secret = 'private-row-getter'
    const parseCsvImpl = (bytes, options) => { const result = parseTabularCsv(bytes, options); return { headers: result.headers, rows: [Object.defineProperty({ sourceRow: 2 }, 'values', { enumerable: true, get: () => { throw new Error(secret) } })] } }
    const error = await errorFrom(() => load(input.paths, { parseCsvImpl }))
    expect({ code: error.code, leaked: error.message.includes(secret) }).toEqual({ code: 'INVALID_SOURCE_DOCUMENT', leaked: false })
  })

  it('rejects a renamed source before reading it', async () => {
    const input = await fixture()
    const paths = { ...input.paths, medesk: join(input.directory, 'renamed.csv') }
    expect((await errorFrom(() => load(paths))).code).toBe('UNEXPECTED_FILENAME')
  })

  it('rejects a missing source without leaking its absolute path', async () => {
    const input = await fixture()
    const directory = await mkdtemp(join(tmpdir(), 'private-clod-path-'))
    const paths = { ...input.paths, invoices: join(directory, INVOICES_FILENAME) }
    const error = await errorFrom(() => load(paths))
    expect({ code: error.code, leaked: error.message.includes(directory) }).toEqual({ code: 'SOURCE_UNAVAILABLE', leaked: false })
  })

  it('rejects a renamed CSV column', async () => {
    const input = await fixture()
    const headers = ['changed_header', ...PD_HEADERS.slice(1)]
    await writeFile(input.paths.pd, csvFrom({ headers, delimiter: '\t' }, 'синтетика'))
    expect((await errorFrom(() => load(input.paths))).code).toBe('UNEXPECTED_HEADERS')
  })

  it('rejects an unexpected CSV delimiter', async () => {
    const input = await fixture()
    await writeFile(input.paths.pd, csvFrom({ headers: PD_HEADERS, delimiter: ';' }, 'синтетика'))
    expect((await errorFrom(() => load(input.paths))).code).toBe('UNEXPECTED_HEADERS')
  })

  it('requires the three measured unnamed workbook headers', async () => {
    const input = await fixture()
    const readXlsxImpl = async (filePath) => basename(filePath) === PD_WORKBOOK_FILENAME ? { ...(await syntheticXlsx(filePath)), headers: PD_WORKBOOK_HEADERS.filter((header) => header !== '__unnamed_I') } : syntheticXlsx(filePath)
    expect((await errorFrom(() => load(input.paths, { readXlsxImpl }))).code).toBe('UNEXPECTED_HEADERS')
  })
})

describe('verifyClinicImportSourceManifest', () => {
  it('accepts the unchanged approved source set', async () => {
    const input = await fixture()
    const loaded = await load(input.paths)
    const verified = await verifyClinicImportSourceManifest(input.paths, loaded.manifest, { readXlsxImpl: syntheticXlsx })
    expect(verified).toEqual(loaded.manifest)
  })

  it('rejects a CSV changed after manifest creation', async () => {
    const input = await fixture()
    const loaded = await load(input.paths)
    await appendFile(input.paths.visits, `${VISITS_HEADERS.map((_, index) => index === 0 ? 'ещё-строка' : '').join('\t')}\n`)
    expect((await errorFrom(() => verifyClinicImportSourceManifest(input.paths, loaded.manifest, { readXlsxImpl: syntheticXlsx }))).code).toBe('SOURCE_CHANGED')
  })

  it('rejects a workbook changed after manifest creation', async () => {
    const input = await fixture()
    const loaded = await load(input.paths)
    await appendFile(input.paths.legacyPatients, '-changed')
    expect((await errorFrom(() => verifyClinicImportSourceManifest(input.paths, loaded.manifest, { readXlsxImpl: syntheticXlsx }))).code).toBe('SOURCE_CHANGED')
  })

  it('rejects a manifest whose file metadata was altered', async () => {
    const input = await fixture()
    const loaded = await load(input.paths)
    const files = loaded.manifest.files.map((file, index) => index === 0 ? { ...file, rowCount: 77 } : file)
    const manifest = { ...loaded.manifest, files }
    expect((await errorFrom(() => verifyClinicImportSourceManifest(input.paths, manifest, { readXlsxImpl: syntheticXlsx }))).code).toBe('INVALID_MANIFEST')
  })

  it('wraps a throwing manifest entry getter without retaining its value', async () => {
    const input = await fixture()
    const loaded = await load(input.paths)
    const secret = 'private-manifest-getter'
    const files = [...loaded.manifest.files]
    files[0] = Object.defineProperty({}, 'role', { enumerable: true, get: () => { throw new Error(secret) } })
    const error = await errorFrom(() => verifyClinicImportSourceManifest(input.paths, { ...loaded.manifest, files }, { readXlsxImpl: syntheticXlsx }))
    expect({ code: error.code, leaked: error.message.includes(secret) }).toEqual({ code: 'INVALID_MANIFEST', leaked: false })
  })
})
