import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import { access, copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, posix } from 'node:path'
import { promisify } from 'node:util'
import { load } from 'cheerio'

const executeFile = promisify(execFile)
const UNZIP_EXECUTABLE = '/usr/bin/unzip'
const WORKBOOK_MEMBER = 'xl/workbook.xml'
const RELATIONSHIPS_MEMBER = 'xl/_rels/workbook.xml.rels'
const SHARED_STRINGS_MEMBER = 'xl/sharedStrings.xml'
const STYLES_MEMBER = 'xl/styles.xml'
const WORKSHEET_RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'
const DEFAULT_LIMITS = Object.freeze({ maxArchiveBytes: 64 * 1024 * 1024, maxArchiveListBytes: 1024 * 1024, maxCellBytes: 1024 * 1024, maxColumns: 2048, maxDecompressedBytes: 128 * 1024 * 1024, maxMemberBytes: 64 * 1024 * 1024, maxMembers: 512, maxRows: 250_000, timeoutMs: 15_000 })
const LIMIT_KEYS = Object.freeze(Object.keys(DEFAULT_LIMITS))
const DATE_FORMAT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58])
const ALLOWED_MEMBERS = Object.freeze([
  /^\[Content_Types\]\.xml$/,
  /^_rels\/\.rels$/,
  /^docProps\/(?:app|core|custom)\.xml$/,
  /^xl\/(?:calcChain|metadata|sharedStrings|styles|workbook)\.xml$/,
  /^xl\/_rels\/workbook\.xml\.rels$/,
  /^xl\/theme\/theme[1-9][0-9]*\.xml$/,
  /^xl\/worksheets\/sheet[1-9][0-9]*\.xml$/,
  /^xl\/worksheets\/_rels\/sheet[1-9][0-9]*\.xml\.rels$/
])

export class TabularXlsxError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'TabularXlsxError'
    this.code = code
    Object.freeze(this)
  }
}

function fail(code, message) {
  throw new TabularXlsxError(code, message)
}

function limitsFrom(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) fail('INVALID_OPTIONS', 'XLSX parser options must be an object')
  const limits = { ...DEFAULT_LIMITS }
  LIMIT_KEYS.forEach((key) => {
    if (options[key] !== undefined) limits[key] = options[key]
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1) fail('INVALID_LIMIT', `XLSX ${key} must be a positive integer`)
  })
  if (limits.maxMemberBytes > limits.maxDecompressedBytes) limits.maxMemberBytes = limits.maxDecompressedBytes
  return Object.freeze(limits)
}

function supportedMember(member) {
  return typeof member === 'string' && member.length > 0 && !member.includes('\0') && !member.includes('\\') && !member.startsWith('/') && !member.split('/').includes('..') && ALLOWED_MEMBERS.some((pattern) => pattern.test(member))
}

function membersFrom(value, limits) {
  if (!Array.isArray(value)) fail('INVALID_ARCHIVE_LIST', 'XLSX archive member list must be an array')
  if (value.length > limits.maxMembers) fail('ARCHIVE_MEMBER_LIMIT', `XLSX archive exceeds ${limits.maxMembers} members`)
  const members = value.filter((member) => member !== '')
  if (members.some((member) => !supportedMember(member))) fail('UNSUPPORTED_ARCHIVE_MEMBER', 'XLSX archive contains a non-allowlisted member')
  if (new Set(members).size !== members.length) fail('DUPLICATE_ARCHIVE_MEMBER', 'XLSX archive contains duplicate members')
  if (!members.includes(WORKBOOK_MEMBER) || !members.includes(RELATIONSHIPS_MEMBER)) fail('MISSING_WORKBOOK', 'XLSX archive is missing workbook metadata')
  return Object.freeze(members)
}

function textFrom(value, member) {
  if (typeof value === 'string') return value
  if (!Buffer.isBuffer(value) && (!ArrayBuffer.isView(value) || value.BYTES_PER_ELEMENT !== 1)) fail('INVALID_ARCHIVE_OUTPUT', `XLSX archive member ${member} is not text`)
  try {
    const bytes = Buffer.isBuffer(value) ? value : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    return fail('INVALID_ARCHIVE_OUTPUT', `XLSX archive member ${member} is not UTF-8`, error)
  }
}

function xmlFrom(value, member, budget, limits) {
  const text = textFrom(value, member)
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > limits.maxMemberBytes) fail('DECOMPRESSED_OUTPUT_LIMIT', `XLSX archive member ${member} exceeds the member output limit`)
  budget.bytes += bytes
  if (budget.bytes > limits.maxDecompressedBytes) fail('DECOMPRESSED_OUTPUT_LIMIT', 'XLSX archive exceeds the decompressed output limit')
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) fail('UNSAFE_XML', `XLSX archive member ${member} contains a prohibited declaration`)
  return text
}

function documentFrom(xml, root, member) {
  const document = load(xml, { xmlMode: true })
  if (document(root).length !== 1) fail('INVALID_XML', `XLSX archive member ${member} has an invalid root element`)
  return document
}

async function archiveCall(operation, fallbackCode, message) {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof TabularXlsxError) throw error
    if (error && typeof error.code === 'string' && ['ARCHIVE_INPUT_TOO_LARGE', 'ARCHIVE_TOOL_FAILURE', 'ARCHIVE_TOOL_UNAVAILABLE', 'INVALID_ARCHIVE_INPUT', 'ZIP_INTEGRITY_FAILURE'].includes(error.code)) fail(error.code, message, error)
    return fail(fallbackCode, message, error)
  }
}

async function readMember(archive, member, budget, limits) {
  const output = await archiveCall(() => archive.read(member), 'ARCHIVE_FAILURE', `XLSX archive member ${member} could not be read`)
  return xmlFrom(output, member, budget, limits)
}

function relationshipTarget(workbookXml, relationshipsXml) {
  const workbook = documentFrom(workbookXml, 'workbook', WORKBOOK_MEMBER)
  const relationships = documentFrom(relationshipsXml, 'Relationships', RELATIONSHIPS_MEMBER)
  const sheet = workbook('workbook > sheets > sheet').first()
  const identifier = sheet.attr('r:id')
  if (sheet.length !== 1 || typeof identifier !== 'string' || identifier.length === 0) fail('INVALID_WORKBOOK', 'XLSX workbook has no first worksheet relationship')
  const matches = relationships('Relationships > Relationship').filter((_, element) => relationships(element).attr('Id') === identifier)
  if (matches.length !== 1) fail('INVALID_RELATIONSHIP', 'XLSX first worksheet relationship is missing or duplicated')
  const relationship = matches.first()
  const target = relationship.attr('Target')
  const type = relationship.attr('Type')
  const targetMode = relationship.attr('TargetMode')
  if (type !== WORKSHEET_RELATIONSHIP || targetMode !== undefined || typeof target !== 'string' || target.length === 0 || target.includes('\\') || target.startsWith('/') || target.includes(':') || target.includes('?') || target.includes('#')) fail('INVALID_RELATIONSHIP', 'XLSX first worksheet relationship is unsafe')
  const member = posix.normalize(posix.join('xl', target))
  if (!/^xl\/worksheets\/sheet[1-9][0-9]*\.xml$/.test(member)) fail('INVALID_RELATIONSHIP', 'XLSX first worksheet relationship targets an unsupported member')
  return Object.freeze({ member, date1904: workbook('workbook > workbookPr').attr('date1904') === '1' || workbook('workbook > workbookPr').attr('date1904') === 'true' })
}

function richText(element, document) {
  return document(element).find('t').map((_, text) => document(text).text()).get().join('')
}

function sharedStringsFrom(xml) {
  if (xml === '') return Object.freeze([])
  const document = documentFrom(xml, 'sst', SHARED_STRINGS_MEMBER)
  return Object.freeze(document('sst > si').map((_, string) => richText(string, document)).get())
}

function customDateFormat(value) {
  const normalized = value.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[(?!h+\]|m+\]|s+\])[^\]]*\]/gi, '')
  return /(^|[^a-z])[ymdhis]+/i.test(normalized)
}

function dateStylesFrom(xml) {
  if (xml === '') return Object.freeze([])
  const document = documentFrom(xml, 'styleSheet', STYLES_MEMBER)
  const custom = new Map()
  document('styleSheet > numFmts > numFmt').each((_, format) => custom.set(Number(document(format).attr('numFmtId')), document(format).attr('formatCode') ?? ''))
  return Object.freeze(document('styleSheet > cellXfs > xf').map((_, style) => {
    const identifier = Number(document(style).attr('numFmtId') ?? 0)
    return DATE_FORMAT_IDS.has(identifier) || (custom.has(identifier) && customDateFormat(custom.get(identifier)))
  }).get())
}

function excelDate(value, date1904) {
  const serial = Number(value)
  if (!Number.isFinite(serial) || serial < 0) fail('INVALID_DATE_SERIAL', 'XLSX date serial is invalid')
  if (!date1904 && serial >= 60 && serial < 61) fail('INVALID_DATE_SERIAL', 'XLSX date serial refers to the nonexistent 1900 leap day')
  const days = date1904 ? serial : serial - (serial >= 60 ? 1 : 0)
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31)
  const date = new Date(epoch + Math.round(days * 86_400_000))
  if (!Number.isFinite(date.getTime())) fail('INVALID_DATE_SERIAL', 'XLSX date serial is outside the supported range')
  const iso = date.toISOString()
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso
}

function isoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value)
  if (!match) fail('INVALID_ISO_DATE', 'XLSX ISO date is invalid')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const days = month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0
  if (year < 1 || day < 1 || day > days) fail('INVALID_ISO_DATE', 'XLSX ISO date is invalid')
  if (match[4] === undefined) return value
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  if (hour > 23 || minute > 59 || second > 59) fail('INVALID_ISO_DATE', 'XLSX ISO date is invalid')
  const milliseconds = Number((match[7] ?? '').padEnd(3, '0').slice(0, 3))
  const zone = match[8] ?? 'Z'
  const offsetHour = zone === 'Z' ? 0 : Number(zone.slice(1, 3))
  const offsetMinute = zone === 'Z' ? 0 : Number(zone.slice(4, 6))
  if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) fail('INVALID_ISO_DATE', 'XLSX ISO date is invalid')
  const offset = zone === 'Z' ? 0 : (zone[0] === '+' ? 1 : -1) * (offsetHour * 60 + offsetMinute)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, milliseconds)
  const iso = new Date(date.getTime() - offset * 60_000).toISOString()
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso
}

function cachedValue(cell) {
  const value = cell.children('v')
  if (cell.children('f').length > 0 && value.length === 0) fail('MISSING_FORMULA_CACHE', 'XLSX formula cell has no cached value')
  return value.length === 0 ? '' : value.first().text()
}

function cellValue(cell, document, shared, dateStyles, date1904, limits) {
  const type = cell.attr('t') ?? 'n'
  const raw = cachedValue(cell)
  let value
  if (type === 's') {
    if (raw === '') return ''
    const index = Number(raw)
    if (!Number.isSafeInteger(index) || index < 0 || index >= shared.length) fail('INVALID_SHARED_STRING', 'XLSX cell references an invalid shared string')
    value = shared[index]
  } else if (type === 'inlineStr') value = richText(cell.children('is').first(), document)
  else if (type === 'd') value = isoDate(raw)
  else if (type === 'b') value = raw === '1' ? 'TRUE' : raw === '0' ? 'FALSE' : fail('INVALID_BOOLEAN', 'XLSX boolean cell is invalid')
  else if (['n', 'str', 'e'].includes(type)) {
    const style = Number(cell.attr('s') ?? 0)
    if (!Number.isSafeInteger(style) || style < 0 || (cell.attr('s') !== undefined && style >= dateStyles.length)) fail('INVALID_STYLE', 'XLSX cell references an invalid style')
    value = type === 'n' && raw !== '' && dateStyles[style] === true ? excelDate(raw, date1904) : raw
  } else fail('UNSUPPORTED_CELL_TYPE', 'XLSX cell type is unsupported')
  if (Buffer.byteLength(value, 'utf8') > limits.maxCellBytes) fail('CELL_OUTPUT_LIMIT', 'XLSX cell exceeds the output limit')
  return value
}

function columnIndex(reference, sourceRow, limits) {
  const match = /^([A-Z]{1,4})([1-9][0-9]*)$/.exec(reference)
  if (!match || Number(match[2]) !== sourceRow) fail('INVALID_CELL_REFERENCE', `XLSX row ${sourceRow} contains an invalid cell reference`)
  let column = 0
  for (const character of match[1]) column = column * 26 + character.charCodeAt(0) - 64
  if (column > limits.maxColumns) fail('COLUMN_LIMIT_EXCEEDED', `XLSX worksheet exceeds ${limits.maxColumns} columns`)
  return column - 1
}

function cellsFrom(row, sourceRow, document, shared, dateStyles, date1904, limits) {
  const cells = []
  let previous = -1
  row.children('c').each((_, element) => {
    const cell = document(element)
    const column = columnIndex(cell.attr('r') ?? '', sourceRow, limits)
    if (column <= previous) fail('INVALID_CELL_REFERENCE', `XLSX row ${sourceRow} has duplicate or unordered cell coordinates`)
    cells[column] = cellValue(cell, document, shared, dateStyles, date1904, limits)
    previous = column
  })
  return cells
}

function valuesFrom(headers, cells) {
  const values = {}
  headers.forEach((header, index) => Object.defineProperty(values, header, { configurable: false, enumerable: true, value: cells[index] ?? '', writable: false }))
  return Object.freeze(values)
}

function columnName(index) {
  let column = index + 1
  let name = ''
  while (column > 0) {
    name = String.fromCharCode(65 + ((column - 1) % 26)) + name
    column = Math.floor((column - 1) / 26)
  }
  return name
}

function headersFrom(cells) {
  const named = cells.filter((header) => header !== undefined && header !== '')
  if (new Set(named).size !== named.length) fail('DUPLICATE_HEADER', 'XLSX header contains duplicate names')
  const used = new Set(named)
  const headers = Array.from({ length: cells.length }, (_, index) => {
    if (cells[index] !== undefined && cells[index] !== '') return cells[index]
    const base = `__unnamed_${columnName(index)}`
    let header = base
    let suffix = 2
    while (used.has(header)) {
      header = `${base}_${suffix}`
      suffix += 1
    }
    used.add(header)
    return header
  })
  if (headers.length === 0) fail('EMPTY_HEADER', 'XLSX header is empty')
  return Object.freeze(headers)
}

function resultFrom(xml, shared, dateStyles, date1904, limits, member) {
  const document = documentFrom(xml, 'worksheet', member)
  const records = []
  let previousRow = 0
  document('worksheet > sheetData > row').each((_, element) => {
    const row = document(element)
    const sourceRow = Number(row.attr('r'))
    if (!Number.isSafeInteger(sourceRow) || sourceRow < 1 || sourceRow <= previousRow) fail('INVALID_ROW_REFERENCE', 'XLSX worksheet row references must be positive and increasing')
    if (records.length >= limits.maxRows) fail('ROW_LIMIT_EXCEEDED', `XLSX worksheet exceeds ${limits.maxRows} rows`)
    records.push(Object.freeze({ sourceRow, cells: cellsFrom(row, sourceRow, document, shared, dateStyles, date1904, limits) }))
    previousRow = sourceRow
  })
  if (records.length === 0) fail('EMPTY_WORKSHEET', 'XLSX first worksheet is empty')
  const headers = headersFrom(records[0].cells)
  const rows = Object.freeze(records.slice(1).map((record) => {
    if (record.cells.length > headers.length) fail('ROW_WIDTH_MISMATCH', `XLSX row ${record.sourceRow} exceeds the header width`)
    return Object.freeze({ sourceRow: record.sourceRow, values: valuesFrom(headers, record.cells) })
  }))
  return Object.freeze({ headers, rows })
}

async function parseArchive(archive, limits) {
  const budget = { bytes: 0 }
  await archiveCall(() => archive.verify(), 'ARCHIVE_FAILURE', 'XLSX archive verification failed')
  const members = membersFrom(await archiveCall(() => archive.list(), 'ARCHIVE_FAILURE', 'XLSX archive listing failed'), limits)
  const workbookXml = await readMember(archive, WORKBOOK_MEMBER, budget, limits)
  const relationshipsXml = await readMember(archive, RELATIONSHIPS_MEMBER, budget, limits)
  const relationship = relationshipTarget(workbookXml, relationshipsXml)
  if (!members.includes(relationship.member)) fail('MISSING_WORKSHEET', 'XLSX related first worksheet is missing')
  const sharedXml = members.includes(SHARED_STRINGS_MEMBER) ? await readMember(archive, SHARED_STRINGS_MEMBER, budget, limits) : ''
  const stylesXml = members.includes(STYLES_MEMBER) ? await readMember(archive, STYLES_MEMBER, budget, limits) : ''
  const worksheetXml = await readMember(archive, relationship.member, budget, limits)
  return resultFrom(worksheetXml, sharedStringsFrom(sharedXml), dateStylesFrom(stylesXml), relationship.date1904, limits, relationship.member)
}

async function closeArchive(archive) {
  if (archive.close === undefined) return
  try {
    await archive.close()
  } catch (error) {
    if (error instanceof TabularXlsxError) throw error
    return fail('SNAPSHOT_CLEANUP_FAILURE', 'XLSX archive snapshot cleanup failed')
  }
}

/** Parses the first worksheet, treats timezone-less ISO datetimes as UTC, and names blank headers __unnamed_<column> with collision suffixes from _2. */
export async function parseTabularXlsx(archive, options = Object.freeze({})) {
  const closable = archive !== null && typeof archive === 'object' && (archive.close === undefined || typeof archive.close === 'function')
  try {
    if (archive === null || typeof archive !== 'object' || typeof archive.verify !== 'function' || typeof archive.list !== 'function' || typeof archive.read !== 'function' || (archive.close !== undefined && typeof archive.close !== 'function')) fail('INVALID_ARCHIVE_ADAPTER', 'XLSX archive adapter must provide valid verify, list, read, and optional close functions')
    const limits = limitsFrom(options)
    return await parseArchive(archive, limits)
  } finally {
    if (closable) await closeArchive(archive)
  }
}

function runtimeLimits(runtime) {
  if (!Object.hasOwn(runtime, 'limits')) return limitsFrom(Object.freeze({}))
  if (runtime.limits === null || typeof runtime.limits !== 'object' || Array.isArray(runtime.limits)) fail('INVALID_ARCHIVE_RUNTIME', 'XLSX archive runtime limits must be an object')
  return limitsFrom(runtime.limits)
}

function runtimeFunction(runtime, key, fallback) {
  if (!Object.hasOwn(runtime, key)) return fallback
  if (typeof runtime[key] !== 'function') fail('INVALID_ARCHIVE_RUNTIME', 'XLSX archive runtime dependency must be a function')
  return runtime[key]
}

function runtimeFrom(runtime) {
  if (runtime === null || typeof runtime !== 'object' || Array.isArray(runtime)) fail('INVALID_ARCHIVE_RUNTIME', 'XLSX archive runtime must be an object')
  return Object.freeze({ accessImpl: runtimeFunction(runtime, 'accessImpl', access), digestImpl: runtimeFunction(runtime, 'digestImpl', digestSnapshot), execFileImpl: runtimeFunction(runtime, 'execFileImpl', executeFile), limits: runtimeLimits(runtime), snapshotImpl: runtimeFunction(runtime, 'snapshotImpl', snapshotArchive), statImpl: runtimeFunction(runtime, 'statImpl', stat) })
}

function outputFrom(result) {
  if (typeof result === 'string' || Buffer.isBuffer(result) || (ArrayBuffer.isView(result) && result.BYTES_PER_ELEMENT === 1)) return result
  if (result && (typeof result.stdout === 'string' || Buffer.isBuffer(result.stdout) || (ArrayBuffer.isView(result.stdout) && result.stdout.BYTES_PER_ELEMENT === 1))) return result.stdout
  return fail('INVALID_ARCHIVE_OUTPUT', 'XLSX archive tool returned invalid output')
}

function outputBytes(output) {
  return typeof output === 'string' ? Buffer.byteLength(output, 'utf8') : output.byteLength
}

function statFrom(value) {
  if (value === null || typeof value !== 'object' || typeof value.isFile !== 'function' || !Number.isSafeInteger(value.size) || value.size < 0) fail('INVALID_ARCHIVE_STAT', 'XLSX archive filesystem metadata is invalid')
  let regular
  try {
    regular = value.isFile()
  } catch {
    return fail('INVALID_ARCHIVE_STAT', 'XLSX archive filesystem metadata is invalid')
  }
  if (typeof regular !== 'boolean') fail('INVALID_ARCHIVE_STAT', 'XLSX archive filesystem metadata is invalid')
  return Object.freeze({ regular, size: value.size })
}

async function inspectFile(statImpl, filePath, code) {
  try {
    return statFrom(await statImpl(filePath))
  } catch (error) {
    if (error instanceof TabularXlsxError) throw error
    return fail(code, 'XLSX archive filesystem inspection failed')
  }
}

async function discardSnapshotCandidate(value, cleanup) {
  if (typeof cleanup !== 'function') return
  try {
    await cleanup.call(value)
  } catch {
    return fail('SNAPSHOT_CLEANUP_FAILURE', 'XLSX archive snapshot cleanup failed')
  }
}

async function snapshotFrom(value, sourcePath) {
  if (value === null || typeof value !== 'object') fail('INVALID_ARCHIVE_SNAPSHOT', 'XLSX archive snapshot result is invalid')
  let cleanup
  let filePath
  try {
    cleanup = value.cleanup
    filePath = value.filePath
  } catch {
    await discardSnapshotCandidate(value, cleanup)
    return fail('INVALID_ARCHIVE_SNAPSHOT', 'XLSX archive snapshot result is invalid')
  }
  if (typeof filePath !== 'string' || !isAbsolute(filePath) || filePath === sourcePath || typeof cleanup !== 'function') {
    await discardSnapshotCandidate(value, cleanup)
    fail('INVALID_ARCHIVE_SNAPSHOT', 'XLSX archive snapshot result is invalid')
  }
  return Object.freeze({ filePath, cleanup: async () => cleanup.call(value) })
}

async function snapshotArchive(sourcePath) {
  let directory = ''
  try {
    directory = await mkdtemp(join(tmpdir(), 'clod-xlsx-'))
    const filePath = join(directory, 'workbook.xlsx')
    await copyFile(sourcePath, filePath)
    return Object.freeze({ filePath, cleanup: async () => rm(directory, { force: true, recursive: true }) })
  } catch {
    if (directory !== '') {
      try {
        await rm(directory, { force: true, recursive: true })
      } catch {
        return fail('SNAPSHOT_CLEANUP_FAILURE', 'XLSX archive snapshot cleanup failed')
      }
    }
    return fail('ARCHIVE_SNAPSHOT_FAILURE', 'XLSX archive snapshot creation failed')
  }
}

async function digestSnapshot(filePath, byteSize) {
  try {
    const bytes = await readFile(filePath)
    if (bytes.byteLength !== byteSize) fail('INVALID_ARCHIVE_SNAPSHOT', 'XLSX archive snapshot size changed')
    return Object.freeze({ sha256: createHash('sha256').update(bytes).digest('hex'), byteSize })
  } catch (error) {
    if (error instanceof TabularXlsxError) throw error
    return fail('ARCHIVE_DIGEST_FAILURE', 'XLSX archive snapshot digest failed')
  }
}

function digestFrom(value, byteSize) {
  if (value === null || typeof value !== 'object' || !/^[a-f0-9]{64}$/.test(value.sha256) || value.byteSize !== byteSize) fail('INVALID_ARCHIVE_DIGEST', 'XLSX archive snapshot digest is invalid')
  return Object.freeze({ sha256: value.sha256, byteSize: value.byteSize })
}

function readerDigestFrom(value, limits) {
  try {
    if (value === null || typeof value !== 'object' || !Number.isSafeInteger(value.byteSize) || value.byteSize < 0 || value.byteSize > limits.maxArchiveBytes) fail('INVALID_ARCHIVE_DIGEST', 'XLSX archive snapshot digest is invalid')
    return digestFrom(value, value.byteSize)
  } catch (error) {
    if (error instanceof TabularXlsxError) throw error
    return fail('INVALID_ARCHIVE_DIGEST', 'XLSX archive snapshot digest is invalid')
  }
}

/** Creates a bounded snapshot archive backed by fixed unzip; parseTabularXlsx closes it automatically. */
export function createUnzipArchive(filePath, runtime = Object.freeze({})) {
  if (typeof filePath !== 'string' || !isAbsolute(filePath) || filePath.includes('\0')) fail('INVALID_ARCHIVE_INPUT', 'XLSX archive path must be an absolute path')
  const dependencies = runtimeFrom(runtime)
  let ready
  let snapshot
  let archiveMetadata
  let cleanup
  let closed = false
  const release = async () => {
    if (cleanup === undefined) cleanup = (async () => {
      closed = true
      if (snapshot === undefined) return
      const current = snapshot
      snapshot = undefined
      try {
        await current.cleanup()
      } catch {
        return fail('SNAPSHOT_CLEANUP_FAILURE', 'XLSX archive snapshot cleanup failed')
      }
    })()
    return cleanup
  }
  const prepare = async () => {
    if (closed) fail('ARCHIVE_CLOSED', 'XLSX archive snapshot is closed')
    if (ready === undefined) ready = (async () => {
      try {
        await dependencies.accessImpl(UNZIP_EXECUTABLE, fsConstants.X_OK)
      } catch {
        return fail('ARCHIVE_TOOL_UNAVAILABLE', 'XLSX archive tool is unavailable')
      }
      const metadata = await inspectFile(dependencies.statImpl, filePath, 'ARCHIVE_STAT_FAILURE')
      if (!metadata.regular) fail('INVALID_ARCHIVE_INPUT', 'XLSX archive path is not a regular file')
      if (metadata.size > dependencies.limits.maxArchiveBytes) fail('ARCHIVE_INPUT_TOO_LARGE', `XLSX archive exceeds ${dependencies.limits.maxArchiveBytes} bytes`)
      let value
      try {
        value = await dependencies.snapshotImpl(filePath, dependencies.limits)
      } catch (error) {
        if (error instanceof TabularXlsxError) throw error
        return fail('ARCHIVE_SNAPSHOT_FAILURE', 'XLSX archive snapshot creation failed')
      }
      snapshot = await snapshotFrom(value, filePath)
      try {
        const captured = await inspectFile(dependencies.statImpl, snapshot.filePath, 'ARCHIVE_SNAPSHOT_STAT_FAILURE')
        if (!captured.regular || captured.size !== metadata.size || captured.size > dependencies.limits.maxArchiveBytes) fail('INVALID_ARCHIVE_SNAPSHOT', 'XLSX archive snapshot metadata is invalid')
        try {
          archiveMetadata = digestFrom(await dependencies.digestImpl(snapshot.filePath, captured.size), captured.size)
        } catch (error) {
          if (error instanceof TabularXlsxError) throw error
          return fail('ARCHIVE_DIGEST_FAILURE', 'XLSX archive snapshot digest failed')
        }
      } catch (error) {
        await release()
        throw error
      }
      return snapshot.filePath
    })()
    return ready
  }
  const run = async (args, maxBuffer, code) => {
    const snapshotPath = await prepare()
    try {
      const command = [args[0], snapshotPath, ...args.slice(1)]
      const result = await dependencies.execFileImpl(UNZIP_EXECUTABLE, command, { encoding: 'buffer', maxBuffer, shell: false, timeout: dependencies.limits.timeoutMs, windowsHide: true })
      const output = outputFrom(result)
      if (outputBytes(output) > maxBuffer) fail(code, 'XLSX archive tool exceeded its output limit')
      return output
    } catch (error) {
      if (error instanceof TabularXlsxError) throw error
      return fail(code, 'XLSX archive tool failed')
    }
  }
  return Object.freeze({
    verify: async () => { await run(['-tqq'], dependencies.limits.maxArchiveListBytes, 'ZIP_INTEGRITY_FAILURE') },
    list: async () => textFrom(await run(['-Z1'], dependencies.limits.maxArchiveListBytes, 'ARCHIVE_TOOL_FAILURE'), 'archive listing').split(/\r?\n/).filter(Boolean),
    read: async (member) => {
      if (!supportedMember(member)) fail('UNSUPPORTED_ARCHIVE_MEMBER', 'XLSX archive read requested a non-allowlisted member')
      return run(['-p', member], dependencies.limits.maxMemberBytes, 'ARCHIVE_TOOL_FAILURE')
    },
    metadata: async () => {
      if (archiveMetadata === undefined) await prepare()
      return archiveMetadata
    },
    close: release
  })
}

/** Reads the first worksheet from an XLSX path or a caller-supplied archive interface. */
export async function readTabularXlsx(filePath, options = Object.freeze({})) {
  const limits = limitsFrom(options)
  const runtime = Object.hasOwn(options, 'runtime') ? options.runtime : Object.freeze({})
  if (runtime === null || typeof runtime !== 'object' || Array.isArray(runtime)) fail('INVALID_ARCHIVE_RUNTIME', 'XLSX archive runtime must be an object')
  const archive = Object.hasOwn(options, 'archive') ? options.archive : createUnzipArchive(filePath, { ...runtime, limits })
  if (archive === null || typeof archive !== 'object' || typeof archive.metadata !== 'function') fail('INVALID_ARCHIVE_ADAPTER', 'XLSX reader archive adapter must provide snapshot metadata')
  let snapshot
  try {
    snapshot = readerDigestFrom(await archive.metadata(), limits)
  } catch (error) {
    await closeArchive(archive)
    throw error
  }
  const result = await parseTabularXlsx(archive, limits)
  return Object.freeze({ ...result, snapshot })
}
