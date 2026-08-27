import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdtemp, open, realpath, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, isAbsolute, join, normalize, sep } from 'node:path'
import { parseTabularCsv } from './tabular-csv.js'
import { readTabularXlsx } from './tabular-xlsx.js'

const MANIFEST_VERSION = 1
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const PD_HEADERS = Object.freeze(['Номер карты (MEDESK)', 'Номер карты (клиника)', 'Фамилия', 'Имя', 'Отчество', 'Дата рождения', 'Пол', 'Представители', 'Метки', 'Почта 1', 'Почта 2', 'Телефон 1', 'Телефон 2', 'Паспорт (серия)', 'Паспорт (номер)', 'Паспорт (кем выдан)', 'Паспорт (дата выдачи)', 'Паспорт (код подразделения)', 'Свид. о рождении (серия)', 'Свид. о рождении (номер)', 'Свид. о рождении (кем выдан)', 'Свид. о рождении (дата выдачи)', 'ИНН', 'СНИЛС', 'Номер пенсионного удостоверения', 'Адрес (индекс)', 'Адрес (область)', 'Адрес (населенный пункт)', 'Адрес (улица, дом, кв.)', 'Кем создан', 'Номер договора', 'Ответственный сотрудник'])
const PATIENTS_HEADERS = Object.freeze(['ehr', 'customId', 'birthday', 'tags'])
const VISITS_HEADERS = Object.freeze(['appointment_id', 'appointment_begin', 'appointment_end', 'cabinet', 'status', 'patient_card', 'doctor', 'doctor_role', 'service_names', 'invoice_ids', 'comment'])
const INVOICES_HEADERS = Object.freeze(['invoice_id', 'total_amount', 'paid_amount', 'invoice_status', 'payer_patient_card', 'payer_enterprise_name', 'invoice_date', 'created_by', 'invoice_item_id', 'appointment_id', 'service_name', 'service_price', 'service_quantity', 'invoice_item_price', 'invoice_item_discount', 'invoice_item_tax'])
const PD_WORKBOOK_HEADERS = Object.freeze(['Номер карты (MEDESK)', 'Номер карты (клиника)', '__unnamed_C', 'Фамилия', 'Имя', 'Отчество', 'Дата рождения', 'Пол', '__unnamed_I', 'Представители', 'Метки', 'Почта 1', 'Почта 2', 'Телефон 1', 'Телефон 2', 'Паспорт (серия)', 'Паспорт (номер)', 'Паспорт (кем выдан)', 'Паспорт (дата выдачи)', '__unnamed_T', 'Паспорт (код подразделения)', 'Свид. о рождении (серия)', 'Свид. о рождении (номер)', 'Свид. о рождении (кем выдан)', 'Свид. о рождении (дата выдачи)', 'ИНН', 'СНИЛС', 'Номер пенсионного удостоверения', 'Адрес (индекс)', 'Адрес (область)', 'Адрес (населенный пункт)', 'Адрес (улица, дом, кв.)', 'Кем создан', 'Номер договора', 'Ответственный сотрудник'])
const MEDESK_HEADERS = Object.freeze(['#', 'Карта', 'Когда добавлен', 'Имя', 'Пол', 'День рождения', 'Возраст', 'Метки', 'Адрес', 'Телефон', 'Почта', 'Работа'])
const LEGACY_PATIENTS_HEADERS = Object.freeze(['\uFEFFДата создания', 'Дата изменения', 'Фамилия', 'Имя', 'Отчество', 'Телефон', 'Email', 'Всего оплачено по счетам', 'Дата рождения', 'Заметки', 'Кол-во анкет', 'Номер карты', 'Кол-во приемов', 'Полное имя', 'Системный ID', 'Согласия на коммуникацию'])
const SOURCE_CONTRACTS = Object.freeze([
  Object.freeze({ role: 'pd', filename: '544663c3807aab090001bad8PD.csv', kind: 'csv', delimiter: '\t', headers: PD_HEADERS, maxBytes: 64 * 1024 * 1024, maxRows: 50_000, parsingMode: 'strict' }),
  Object.freeze({ role: 'patients', filename: '544663c3807aab090001bad8_patients.csv', kind: 'csv', delimiter: '\t', headers: PATIENTS_HEADERS, maxBytes: 16 * 1024 * 1024, maxRows: 50_000, parsingMode: 'strict' }),
  Object.freeze({ role: 'visits', filename: '544663c3807aab090001bad8_visits.csv', kind: 'csv', delimiter: '\t', headers: VISITS_HEADERS, maxBytes: 64 * 1024 * 1024, maxRows: 100_000, parsingMode: 'legacy_physical_rows' }),
  Object.freeze({ role: 'invoices', filename: '544663c3807aab090001bad8_invoices.csv', kind: 'csv', delimiter: '\t', headers: INVOICES_HEADERS, maxBytes: 8 * 1024 * 1024, maxRows: 10_000, parsingMode: 'strict' }),
  Object.freeze({ role: 'pdWorkbook', filename: '544663c3807aab090001bad8PD — копия.xlsx', kind: 'xlsx', headers: PD_WORKBOOK_HEADERS, maxBytes: 64 * 1024 * 1024, parsingMode: 'strict' }),
  Object.freeze({ role: 'medesk', filename: 'medesk.csv', kind: 'csv', delimiter: ';', headers: MEDESK_HEADERS, maxBytes: 16 * 1024 * 1024, maxRows: 20_000, parsingMode: 'strict' }),
  Object.freeze({ role: 'legacyPatients', filename: 'Vse pacienty.xlsx', kind: 'xlsx', headers: LEGACY_PATIENTS_HEADERS, maxBytes: 64 * 1024 * 1024, parsingMode: 'strict' })
])
const SOURCE_ROLES = Object.freeze(SOURCE_CONTRACTS.map((contract) => contract.role))

export class ClinicImportSourceError extends Error {
  constructor(code, message, role = '') {
    super(message)
    Object.defineProperties(this, { code: { configurable: false, enumerable: true, value: code, writable: false }, name: { configurable: false, enumerable: false, value: 'ClinicImportSourceError', writable: false }, role: { configurable: false, enumerable: true, value: role, writable: false } })
    Object.freeze(this)
  }
}

function fail(code, message, role = '') {
  throw new ClinicImportSourceError(code, message, role)
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function sameArray(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index])
}

function prohibitedPath(filePath) {
  return normalize(filePath).split(sep).some((segment) => segment.endsWith('_docs'))
}

function validateResolvedPath(filePath, contract) {
  if (typeof filePath !== 'string' || !isAbsolute(filePath) || filePath.includes('\0')) fail('INVALID_SOURCE_PATH', `Clinic import resolved source path is invalid for role ${contract.role}`, contract.role)
  if (prohibitedPath(filePath)) fail('PROHIBITED_SOURCE_PATH', `Clinic import resolved source path is prohibited for role ${contract.role}`, contract.role)
  if (basename(filePath) !== contract.filename) fail('UNEXPECTED_FILENAME', `Clinic import resolved source filename is invalid for role ${contract.role}`, contract.role)
  return filePath
}

async function captureBoundedBytes(selected, filePath, realpathImpl) {
  const { contract } = selected
  let handle
  try {
    handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW)
    const metadata = await handle.stat()
    if (!metadata.isFile() || !Number.isSafeInteger(metadata.size) || metadata.size < 0) throw new Error('invalid source metadata')
    const confirmed = validateResolvedPath(await realpathImpl(selected.filePath), contract)
    if (confirmed !== filePath) throw Object.assign(new Error('source resolution changed'), { code: 'SOURCE_IDENTITY_CHANGED' })
    const authorized = await lstat(filePath)
    if (!authorized.isFile() || metadata.dev !== authorized.dev || metadata.ino !== authorized.ino) throw Object.assign(new Error('source identity changed'), { code: 'SOURCE_IDENTITY_CHANGED' })
    if (metadata.size > contract.maxBytes) fail('SOURCE_TOO_LARGE', `Clinic import source exceeds its byte limit for role ${contract.role}`, contract.role)
    const bytes = Buffer.alloc(metadata.size)
    let offset = 0
    while (offset < bytes.byteLength) {
      const read = await handle.read(bytes, offset, bytes.byteLength - offset, offset)
      if (read.bytesRead === 0) throw new Error('source changed while reading')
      offset += read.bytesRead
    }
    const probe = Buffer.alloc(1)
    if ((await handle.read(probe, 0, 1, bytes.byteLength)).bytesRead !== 0) throw new Error('source changed while reading')
    return bytes
  } finally {
    await handle?.close()
  }
}

async function resolvedSource(selected, realpathImpl) {
  const { contract } = selected
  let filePath
  let bytes
  try {
    filePath = await realpathImpl(selected.filePath)
  } catch {
    return fail('SOURCE_UNAVAILABLE', `Clinic import source cannot be resolved for role ${contract.role}`, contract.role)
  }
  filePath = validateResolvedPath(filePath, contract)
  try {
    bytes = await captureBoundedBytes(selected, filePath, realpathImpl)
  } catch (error) {
    if (error instanceof ClinicImportSourceError) throw error
    return fail('SOURCE_UNAVAILABLE', `Clinic import source cannot be captured for role ${contract.role}`, contract.role)
  }
  return Object.freeze({ contract, filePath, bytes, snapshot: Object.freeze({ sha256: hash(bytes), byteSize: bytes.byteLength }) })
}

function selectedPaths(paths) {
  if (paths === null || typeof paths !== 'object' || Array.isArray(paths)) fail('INVALID_SOURCE_PATHS', 'Clinic import source paths must be an object')
  try {
    const keys = Object.keys(paths).sort()
    if (!sameArray(keys, [...SOURCE_ROLES].sort())) fail('INVALID_SOURCE_PATHS', 'Clinic import requires exactly seven approved source roles')
    const selected = SOURCE_CONTRACTS.map((contract) => {
      const filePath = paths[contract.role]
      if (typeof filePath !== 'string' || !isAbsolute(filePath) || filePath.includes('\0')) fail('INVALID_SOURCE_PATH', `Clinic import source path is invalid for role ${contract.role}`, contract.role)
      if (prohibitedPath(filePath)) fail('PROHIBITED_SOURCE_PATH', `Clinic import source path is prohibited for role ${contract.role}`, contract.role)
      if (basename(filePath) !== contract.filename) fail('UNEXPECTED_FILENAME', `Clinic import source filename is invalid for role ${contract.role}`, contract.role)
      return Object.freeze({ contract, filePath })
    })
    if (new Set(selected.map((source) => normalize(source.filePath))).size !== selected.length) fail('INVALID_SOURCE_PATHS', 'Clinic import source paths must be distinct')
    return Object.freeze(selected)
  } catch (error) {
    if (error instanceof ClinicImportSourceError) throw error
    return fail('INVALID_SOURCE_PATHS', 'Clinic import source paths cannot be inspected')
  }
}

async function validatePaths(paths, realpathImpl) {
  const selected = selectedPaths(paths)
  const resolved = Object.freeze(await Promise.all(selected.map((source) => resolvedSource(source, realpathImpl))))
  if (new Set(resolved.map((source) => normalize(source.filePath))).size !== resolved.length) fail('INVALID_SOURCE_PATHS', 'Clinic import resolved source paths must be distinct')
  return resolved
}

function validateHeaders(actual, contract) {
  if (!Array.isArray(actual) || !sameArray(actual, contract.headers)) fail('UNEXPECTED_HEADERS', `Clinic import source headers are invalid for role ${contract.role}`, contract.role)
}

function valuesFrom(values, contract) {
  if (values === null || typeof values !== 'object' || Array.isArray(values) || !sameArray(Object.keys(values), contract.headers)) fail('INVALID_SOURCE_ROWS', `Clinic import source row shape is invalid for role ${contract.role}`, contract.role)
  const output = {}
  for (const header of contract.headers) {
    if (typeof values[header] !== 'string') fail('INVALID_SOURCE_ROWS', `Clinic import source row value is invalid for role ${contract.role}`, contract.role)
    Object.defineProperty(output, header, { configurable: false, enumerable: true, value: values[header], writable: false })
  }
  return Object.freeze(output)
}

function structuralIssuesFrom(issues, contract) {
  if (issues === undefined) return Object.freeze([])
  if (!Array.isArray(issues) || issues.length > 1 || (issues.length > 0 && contract.parsingMode !== 'legacy_physical_rows')) fail('INVALID_SOURCE_ROWS', `Clinic import source structural issues are invalid for role ${contract.role}`, contract.role)
  return Object.freeze(issues.map((issue) => {
    if (issue === null || typeof issue !== 'object' || Array.isArray(issue) || !sameArray(Object.keys(issue).sort(), ['actualWidth', 'code', 'expectedWidth'])) fail('INVALID_SOURCE_ROWS', `Clinic import source structural issue is invalid for role ${contract.role}`, contract.role)
    if (issue.code !== 'SHORT_ROW' || !Number.isSafeInteger(issue.actualWidth) || issue.actualWidth < 0 || issue.expectedWidth !== contract.headers.length || issue.actualWidth >= issue.expectedWidth) fail('INVALID_SOURCE_ROWS', `Clinic import source structural issue is invalid for role ${contract.role}`, contract.role)
    return Object.freeze({ code: issue.code, actualWidth: issue.actualWidth, expectedWidth: issue.expectedWidth })
  }))
}

function rowsFrom(rows, contract) {
  if (!Array.isArray(rows)) fail('INVALID_SOURCE_ROWS', `Clinic import source rows are invalid for role ${contract.role}`, contract.role)
  let previous = 1
  return Object.freeze(rows.map((row) => {
    if (row === null || typeof row !== 'object' || !Number.isSafeInteger(row.sourceRow) || row.sourceRow <= previous) fail('INVALID_SOURCE_ROWS', `Clinic import source row number is invalid for role ${contract.role}`, contract.role)
    previous = row.sourceRow
    return Object.freeze({ sourceRole: contract.role, sourceName: contract.filename, sourceRow: row.sourceRow, values: valuesFrom(row.values, contract), structuralIssues: structuralIssuesFrom(row.structuralIssues, contract) })
  }))
}

function snapshotFrom(result, contract, expected) {
  const snapshot = result?.snapshot
  if (snapshot === null || typeof snapshot !== 'object' || !SHA256_PATTERN.test(snapshot.sha256) || !Number.isSafeInteger(snapshot.byteSize) || snapshot.byteSize < 1) fail('INVALID_SOURCE_SNAPSHOT', `Clinic import workbook snapshot is invalid for role ${contract.role}`, contract.role)
  if (snapshot.sha256 !== expected.sha256 || snapshot.byteSize !== expected.byteSize) fail('INVALID_SOURCE_SNAPSHOT', `Clinic import workbook snapshot does not match captured bytes for role ${contract.role}`, contract.role)
  return Object.freeze({ sha256: snapshot.sha256, byteSize: snapshot.byteSize })
}

async function csvSource(selected, dependencies) {
  const { contract, bytes, snapshot } = selected
  let parsed
  try {
    parsed = dependencies.parseCsvImpl(Uint8Array.from(bytes), { delimiter: contract.delimiter, literalQuotes: contract.parsingMode === 'legacy_physical_rows', maxBytes: contract.maxBytes, maxRows: contract.maxRows, padShortRows: contract.parsingMode === 'legacy_physical_rows' })
  } catch {
    return fail('INVALID_SOURCE_DOCUMENT', `Clinic import source document is invalid for role ${contract.role}`, contract.role)
  }
  return Object.freeze({ parsed, snapshot })
}

async function parsedWorkbook(selected, dependencies) {
  const directory = await mkdtemp(join(tmpdir(), 'clod-clinic-workbook-'))
  const filePath = join(directory, selected.contract.filename)
  let parsed
  let primaryError
  try {
    await writeFile(filePath, selected.bytes, { flag: 'wx', mode: 0o600 })
    parsed = await dependencies.readXlsxImpl(filePath)
  } catch (error) {
    primaryError = error
  }
  let cleanupFailed = false
  try { await dependencies.unlinkImpl(filePath) } catch { cleanupFailed = true }
  try { await dependencies.rmdirImpl(directory) } catch { cleanupFailed = true }
  if (cleanupFailed) fail('SOURCE_CLEANUP_FAILED', `Clinic import workbook snapshot cleanup failed for role ${selected.contract.role}`, selected.contract.role)
  if (primaryError !== undefined) throw primaryError
  return parsed
}

async function xlsxSource(selected, dependencies) {
  const { contract, snapshot } = selected
  let parsed
  try {
    parsed = await parsedWorkbook(selected, dependencies)
  } catch (error) {
    if (error instanceof ClinicImportSourceError) throw error
    return fail('SOURCE_UNAVAILABLE', `Clinic import workbook cannot be read for role ${contract.role}`, contract.role)
  }
  return Object.freeze({ parsed, snapshot })
}

async function sourceFrom(selected, dependencies) {
  const { contract } = selected
  const loaded = contract.kind === 'csv' ? await csvSource(selected, dependencies) : await xlsxSource(selected, dependencies)
  try {
    validateHeaders(loaded.parsed?.headers, contract)
    if (contract.kind === 'xlsx') snapshotFrom(loaded.parsed, contract, loaded.snapshot)
    const rows = rowsFrom(loaded.parsed?.rows, contract)
    return Object.freeze({ role: contract.role, sourceName: contract.filename, kind: contract.kind, parsingMode: contract.parsingMode, headers: contract.headers, rows, snapshot: loaded.snapshot })
  } catch (error) {
    if (error instanceof ClinicImportSourceError) throw error
    return fail('INVALID_SOURCE_DOCUMENT', `Clinic import parsed document cannot be inspected for role ${contract.role}`, contract.role)
  }
}

function manifestFilesFrom(sources) {
  return Object.freeze(SOURCE_CONTRACTS.map((contract) => {
    const source = sources[contract.role]
    const structuralIssueCount = source.rows.reduce((count, row) => count + row.structuralIssues.length, 0)
    return Object.freeze({ role: source.role, filename: source.sourceName, sha256: source.snapshot.sha256, byteSize: source.snapshot.byteSize, rowCount: source.rows.length, parsingMode: source.parsingMode, structuralIssueCount })
  }))
}

function manifestHash(files) {
  return hash(Buffer.from(JSON.stringify({ version: MANIFEST_VERSION, files }), 'utf8'))
}

function manifestFrom(sources) {
  const files = manifestFilesFrom(sources)
  return Object.freeze({ version: MANIFEST_VERSION, files, sha256: manifestHash(files) })
}

function dependenciesFrom(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) fail('INVALID_OPTIONS', 'Clinic import source options must be an object')
  try {
    const keys = Object.keys(options)
    if (keys.some((key) => !['parseCsvImpl', 'readXlsxImpl', 'realpathImpl', 'rmdirImpl', 'unlinkImpl'].includes(key))) fail('INVALID_OPTIONS', 'Clinic import source options contain unsupported fields')
    const readXlsxImpl = options.readXlsxImpl ?? readTabularXlsx
    const parseCsvImpl = options.parseCsvImpl ?? parseTabularCsv
    const realpathImpl = options.realpathImpl ?? realpath
    const rmdirImpl = options.rmdirImpl ?? rmdir
    const unlinkImpl = options.unlinkImpl ?? unlink
    if (typeof readXlsxImpl !== 'function' || typeof parseCsvImpl !== 'function' || typeof realpathImpl !== 'function' || typeof rmdirImpl !== 'function' || typeof unlinkImpl !== 'function') fail('INVALID_OPTIONS', 'Clinic import source readers must be functions')
    return Object.freeze({ parseCsvImpl, readXlsxImpl, realpathImpl, rmdirImpl, unlinkImpl })
  } catch (error) {
    if (error instanceof ClinicImportSourceError) throw error
    return fail('INVALID_OPTIONS', 'Clinic import source options cannot be inspected')
  }
}

function validateManifest(manifest) {
  try {
    if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest) || !sameArray(Object.keys(manifest).sort(), ['files', 'sha256', 'version'])) fail('INVALID_MANIFEST', 'Clinic import source manifest is invalid')
    if (manifest.version !== MANIFEST_VERSION || !Array.isArray(manifest.files) || manifest.files.length !== SOURCE_CONTRACTS.length || !SHA256_PATTERN.test(manifest.sha256)) fail('INVALID_MANIFEST', 'Clinic import source manifest is invalid')
    const files = Object.freeze(manifest.files.map((file, index) => {
      const contract = SOURCE_CONTRACTS[index]
      if (file === null || typeof file !== 'object' || Array.isArray(file) || !sameArray(Object.keys(file).sort(), ['byteSize', 'filename', 'parsingMode', 'role', 'rowCount', 'sha256', 'structuralIssueCount'])) fail('INVALID_MANIFEST', 'Clinic import source manifest file is invalid')
      if (file.role !== contract.role || file.filename !== contract.filename || file.parsingMode !== contract.parsingMode || !SHA256_PATTERN.test(file.sha256) || !Number.isSafeInteger(file.byteSize) || file.byteSize < 0 || !Number.isSafeInteger(file.rowCount) || file.rowCount < 0 || !Number.isSafeInteger(file.structuralIssueCount) || file.structuralIssueCount < 0 || file.structuralIssueCount > file.rowCount) fail('INVALID_MANIFEST', 'Clinic import source manifest file is invalid')
      return Object.freeze({ role: file.role, filename: file.filename, sha256: file.sha256, byteSize: file.byteSize, rowCount: file.rowCount, parsingMode: file.parsingMode, structuralIssueCount: file.structuralIssueCount })
    }))
    if (manifestHash(files) !== manifest.sha256) fail('INVALID_MANIFEST', 'Clinic import source manifest hash is invalid')
    return Object.freeze({ version: MANIFEST_VERSION, files, sha256: manifest.sha256 })
  } catch (error) {
    if (error instanceof ClinicImportSourceError) throw error
    return fail('INVALID_MANIFEST', 'Clinic import source manifest cannot be inspected')
  }
}

/** Loads only the seven approved clinic files and keeps the primary patient set as the left-join base. */
export async function loadClinicImportSources(paths, options = Object.freeze({})) {
  const dependencies = dependenciesFrom(options)
  const selected = await validatePaths(paths, dependencies.realpathImpl)
  const entries = []
  for (const source of selected) entries.push([source.contract.role, await sourceFrom(source, dependencies)])
  const sources = Object.freeze(Object.fromEntries(entries))
  const patientSources = Object.freeze({ primary: sources.pd, leftJoins: Object.freeze([sources.patients, sources.pdWorkbook, sources.medesk, sources.legacyPatients]) })
  return Object.freeze({ sources, patientSources, visits: sources.visits, invoices: sources.invoices, manifest: manifestFrom(sources) })
}

/** Revalidates every approved source against a previously canonicalized safe manifest. */
export async function verifyClinicImportSourceManifest(paths, expectedManifest, options = Object.freeze({})) {
  const expected = validateManifest(expectedManifest)
  let current
  try {
    current = (await loadClinicImportSources(paths, options)).manifest
  } catch (error) {
    if (error instanceof ClinicImportSourceError && ['INVALID_SOURCE_PATHS', 'INVALID_SOURCE_PATH', 'UNEXPECTED_FILENAME', 'PROHIBITED_SOURCE_PATH', 'INVALID_OPTIONS'].includes(error.code)) throw error
    return fail('SOURCE_CHANGED', 'Clinic import source set changed after manifest creation', error?.role ?? '')
  }
  if (current.sha256 !== expected.sha256) fail('SOURCE_CHANGED', 'Clinic import source set changed after manifest creation')
  return current
}
