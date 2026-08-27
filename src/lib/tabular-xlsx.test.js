import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const XLSX_MODULE_PATH = './tabular-xlsx.js'
const WORKBOOK = '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Лист" sheetId="1" r:id="rId7"/></sheets></workbook>'
const RELATIONSHIPS = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
const EXTERNAL_RELATIONSHIPS = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="https://example.invalid/private.xml" TargetMode="External"/></Relationships>'
const SHARED_STRINGS = '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Имя</t></si><si><t>Заметка</t></si><si><t>Сумма</t></si><si><t>ISO дата</t></si><si><t>Дата Excel</t></si><si><t>Формула</t></si><si><t>Пусто</t></si><si><r><t>Жан</t></r><r><t>на</t></r></si></sst>'
const STYLES = '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>'
const WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c><c r="G1" t="s"><v>6</v></c></row><row r="2"><c r="A2" t="s"><v>7</v></c><c r="B2" t="inlineStr"><is><t>Лилия &amp; Ёж</t></is></c><c r="C2"><v>42</v></c><c r="D2" t="d"><v>2001-02-03T00:00:00Z</v></c><c r="E2" s="1"><v>43831</v></c><c r="F2"><f>SUM(40,2)</f><v>42</v></c><c r="G2"/></row></sheetData></worksheet>'
const SPARSE_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Имя</t></is></c><c r="B1" t="inlineStr"><is><t>Карта</t></is></c><c r="C1" t="inlineStr"><is><t>Метка</t></is></c></row><row r="4"><c r="A4" t="inlineStr"><is><t>Аглая</t></is></c><c r="C4" t="inlineStr"><is><t>редкая</t></is></c></row></sheetData></worksheet>'
const DUPLICATE_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Имя</t></is></c><c r="B1" t="inlineStr"><is><t>Имя</t></is></c></row></sheetData></worksheet>'
const FORMULA_WITHOUT_CACHE = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Итог</t></is></c></row><row r="2"><c r="A2"><f>7*6</f></c></row></sheetData></worksheet>'
const INLINE_FORMULA_WITHOUT_CACHE = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Итог</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><f>7*6</f><is><t>42</t></is></c></row></sheetData></worksheet>'
const SPARSE_HEADER_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Имя</t></is></c><c r="B1" t="inlineStr"><is><t>Карта</t></is></c><c r="D1" t="inlineStr"><is><t>Метка</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Ярина</t></is></c><c r="C2" t="inlineStr"><is><t>середина</t></is></c><c r="D2" t="inlineStr"><is><t>редкая</t></is></c></row></sheetData></worksheet>'
const COLLIDING_HEADER_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>__unnamed_C</t></is></c><c r="B1" t="inlineStr"><is><t>Карта</t></is></c><c r="D1" t="inlineStr"><is><t>Метка</t></is></c></row></sheetData></worksheet>'
const EMPTY_SHARED_CELL_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"/><c r="B2" t="s"><v>7</v></c></row></sheetData></worksheet>'
const TIMEZONELESS_DATE_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Дата</t></is></c></row><row r="2"><c r="A2" t="d"><v>2001-02-03T04:05:06</v></c></row></sheetData></worksheet>'
const INVALID_DATE_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Дата</t></is></c></row><row r="2"><c r="A2" t="d"><v>2024-02-30T00:00:00Z</v></c></row></sheetData></worksheet>'
const UNTRUSTED_TYPE_WORKSHEET = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Поле</t></is></c></row><row r="2"><c r="A2" t="private-cell-marker"><v>7</v></c></row></sheetData></worksheet>'
const BASE_MEMBERS = Object.freeze({ 'xl/workbook.xml': WORKBOOK, 'xl/_rels/workbook.xml.rels': RELATIONSHIPS, 'xl/worksheets/sheet1.xml': SPARSE_WORKSHEET })
const COMPLETE_MEMBERS = Object.freeze({ ...BASE_MEMBERS, 'xl/sharedStrings.xml': SHARED_STRINGS, 'xl/styles.xml': STYLES, 'xl/worksheets/sheet1.xml': WORKSHEET })
const XLSX_MODULE_URL = pathToFileURL(resolve(process.cwd(), 'src/lib/tabular-xlsx.js')).href
const TIMEZONE_SCRIPT = `import { parseTabularXlsx } from ${JSON.stringify(XLSX_MODULE_URL)};const workbook=${JSON.stringify(WORKBOOK)};const relationships=${JSON.stringify(RELATIONSHIPS)};const worksheet=${JSON.stringify(TIMEZONELESS_DATE_WORKSHEET)};const members={'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':relationships,'xl/worksheets/sheet1.xml':worksheet};const archive={verify:async()=>undefined,list:async()=>Object.keys(members),read:async(member)=>members[member]};const result=await parseTabularXlsx(archive);process.stdout.write(result.rows[0].values['Дата'])`

function fakeArchive(members, overrides = Object.freeze({})) {
  return Object.freeze({
    verify: overrides.verify ?? (async () => undefined),
    list: overrides.list ?? (async () => Object.freeze(Object.keys(members))),
    read: overrides.read ?? (async (member) => {
      if (!Object.hasOwn(members, member)) throw Object.assign(new Error('missing synthetic member'), { code: 'MISSING_ARCHIVE_MEMBER' })
      return members[member]
    })
  })
}

async function xlsxModule() {
  return import(XLSX_MODULE_PATH).catch(() => Object.freeze({}))
}

async function parse(archive, options = Object.freeze({})) {
  const module = await xlsxModule()
  const parser = typeof module.parseTabularXlsx === 'function' ? module.parseTabularXlsx : async () => Object.freeze({ headers: Object.freeze([]), rows: Object.freeze([]) })
  return parser(archive, options)
}

async function errorCode(archive, options = Object.freeze({})) {
  try {
    await parse(archive, options)
    return 'NO_ERROR'
  } catch (error) {
    return error.code ?? error.name
  }
}

async function parseOutcome(archive) {
  try {
    return Object.freeze({ result: await parse(archive) })
  } catch (error) {
    return Object.freeze({ error: error.code ?? error.name })
  }
}

async function operationCode(operation) {
  try {
    await operation()
    return 'NO_ERROR'
  } catch (error) {
    return error.code ?? error.name
  }
}

async function operationError(operation) {
  try {
    await operation()
    return Object.freeze({ code: 'NO_ERROR', name: '', message: '', hasCause: false })
  } catch (error) {
    return Object.freeze({ code: error.code ?? '', name: error.name, message: error.message, hasCause: Object.hasOwn(error, 'cause') })
  }
}

function snapshotRuntime(overrides = Object.freeze({})) {
  return Object.freeze({ accessImpl: async () => undefined, statImpl: async () => Object.freeze({ isFile: () => true, size: 512 }), snapshotImpl: async () => Object.freeze({ filePath: '/tmp/clod-xlsx-snapshot/workbook.xlsx', cleanup: async () => undefined }), digestImpl: async (_, byteSize) => Object.freeze({ sha256: 'ab'.repeat(32), byteSize }), execFileImpl: async () => Object.freeze({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) }), ...overrides })
}

function timezoneValue(timezone) {
  return execFileSync(process.execPath, ['--input-type=module', '--eval', TIMEZONE_SCRIPT], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, TZ: timezone } })
}

describe('parseTabularXlsx', () => {
  it('reads shared, inline, numeric, date, formula, entity, and empty cells', async () => {
    const result = await parse(fakeArchive(COMPLETE_MEMBERS))
    expect(result).toEqual({ headers: ['Имя', 'Заметка', 'Сумма', 'ISO дата', 'Дата Excel', 'Формула', 'Пусто'], rows: [{ sourceRow: 2, values: { Имя: 'Жанна', Заметка: 'Лилия & Ёж', Сумма: '42', 'ISO дата': '2001-02-03', 'Дата Excel': '2020-01-01', Формула: '42', Пусто: '' } }] })
  })

  it('treats timezone-less ISO datetimes as UTC', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': TIMEZONELESS_DATE_WORKSHEET })
    const result = await parse(fakeArchive(members))
    expect(result.rows[0].values.Дата).toBe('2001-02-03T04:05:06.000Z')
  })

  it('produces the same timezone-less ISO result under different process timezones', () => {
    expect([timezoneValue('Pacific/Honolulu'), timezoneValue('Asia/Tokyo')]).toEqual(['2001-02-03T04:05:06.000Z', '2001-02-03T04:05:06.000Z'])
  })

  it('rejects a calendar-invalid ISO date', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': INVALID_DATE_WORKSHEET })
    expect(await errorCode(fakeArchive(members))).toBe('INVALID_ISO_DATE')
  })

  it('fills missing sparse coordinates with empty cells', async () => {
    const result = await parse(fakeArchive(BASE_MEMBERS))
    expect(result.rows).toEqual([{ sourceRow: 4, values: { Имя: 'Аглая', Карта: '', Метка: 'редкая' } }])
  })

  it('assigns coordinate-aware names to blank sparse headers without shifting values', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': SPARSE_HEADER_WORKSHEET })
    const outcome = await parseOutcome(fakeArchive(members))
    expect(outcome).toEqual({ result: { headers: ['Имя', 'Карта', '__unnamed_C', 'Метка'], rows: [{ sourceRow: 2, values: { Имя: 'Ярина', Карта: '', __unnamed_C: 'середина', Метка: 'редкая' } }] } })
  })

  it('suffixes a generated header when its coordinate name collides', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': COLLIDING_HEADER_WORKSHEET })
    const outcome = await parseOutcome(fakeArchive(members))
    expect(outcome).toEqual({ result: { headers: ['__unnamed_C', 'Карта', '__unnamed_C_2', 'Метка'], rows: [] } })
  })

  it('decodes a shared-string cell without a value as empty', async () => {
    const members = Object.freeze({ ...COMPLETE_MEMBERS, 'xl/worksheets/sheet1.xml': EMPTY_SHARED_CELL_WORKSHEET })
    const result = await parse(fakeArchive(members))
    expect(result.rows[0].values).toEqual({ Имя: '', Заметка: 'Жанна' })
  })

  it('returns deeply immutable worksheet rows', async () => {
    const result = await parse(fakeArchive(BASE_MEMBERS))
    expect([result, result.headers, result.rows, result.rows[0], result.rows[0].values].every(Object.isFrozen)).toBe(true)
  })

  it('rejects duplicate worksheet headers', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': DUPLICATE_WORKSHEET })
    expect(await errorCode(fakeArchive(members))).toBe('DUPLICATE_HEADER')
  })

  it('rejects external worksheet relationships', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/_rels/workbook.xml.rels': EXTERNAL_RELATIONSHIPS })
    expect(await errorCode(fakeArchive(members))).toBe('INVALID_RELATIONSHIP')
  })

  it('rejects a missing related worksheet member', async () => {
    const members = Object.freeze({ 'xl/workbook.xml': WORKBOOK, 'xl/_rels/workbook.xml.rels': RELATIONSHIPS })
    expect(await errorCode(fakeArchive(members))).toBe('MISSING_WORKSHEET')
  })

  it('rejects non-allowlisted archive members', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/vbaProject.bin': 'synthetic macro placeholder' })
    expect(await errorCode(fakeArchive(members))).toBe('UNSUPPORTED_ARCHIVE_MEMBER')
  })

  it('reports an archive adapter failure', async () => {
    const archive = fakeArchive(BASE_MEMBERS, { list: async () => { throw new Error('synthetic adapter failure') } })
    expect(await errorCode(archive)).toBe('ARCHIVE_FAILURE')
  })

  it('preserves a zip integrity failure code', async () => {
    const failure = Object.assign(new Error('synthetic corrupt archive'), { code: 'ZIP_INTEGRITY_FAILURE' })
    const archive = fakeArchive(BASE_MEMBERS, { verify: async () => { throw failure } })
    expect(await errorCode(archive)).toBe('ZIP_INTEGRITY_FAILURE')
  })

  it('rejects decompressed XML beyond the configured output limit', async () => {
    const limits = Object.freeze({ maxDecompressedBytes: 64 })
    expect(await errorCode(fakeArchive(BASE_MEMBERS), limits)).toBe('DECOMPRESSED_OUTPUT_LIMIT')
  })

  it('rejects a formula cell without a cached value', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': FORMULA_WITHOUT_CACHE })
    expect(await errorCode(fakeArchive(members))).toBe('MISSING_FORMULA_CACHE')
  })

  it('rejects an inline-string formula without a cached value element', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': INLINE_FORMULA_WITHOUT_CACHE })
    expect(await errorCode(fakeArchive(members))).toBe('MISSING_FORMULA_CACHE')
  })

  it('does not echo an untrusted cell type in an error', async () => {
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': UNTRUSTED_TYPE_WORKSHEET })
    const error = await operationError(() => parse(fakeArchive(members)))
    expect({ code: error.code, leaked: error.message.includes('private-cell-marker') }).toEqual({ code: 'UNSUPPORTED_CELL_TYPE', leaked: false })
  })
})

describe('createUnzipArchive', () => {
  it('uses fixed unzip execution without a shell', async () => {
    const calls = []
    const runtime = snapshotRuntime({ execFileImpl: async (executable, args, options) => { calls.push(Object.freeze({ executable, args: [...args], encoding: options.encoding, shell: options.shell })); if (args[0] === '-Z1') return Object.freeze({ stdout: Buffer.from(Object.keys(BASE_MEMBERS).join('\n')), stderr: Buffer.alloc(0) }); if (args[0] === '-p') return Object.freeze({ stdout: Buffer.from(BASE_MEMBERS[args[2]]), stderr: Buffer.alloc(0) }); return Object.freeze({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) }) } })
    const module = await xlsxModule()
    const archive = typeof module.createUnzipArchive === 'function' ? module.createUnzipArchive('/tmp/clinic-synthetic.xlsx', runtime) : fakeArchive(BASE_MEMBERS)
    await archive.verify()
    await archive.list()
    await archive.read('xl/workbook.xml')
    expect(calls).toEqual([{ executable: '/usr/bin/unzip', args: ['-tqq', '/tmp/clod-xlsx-snapshot/workbook.xlsx'], encoding: 'buffer', shell: false }, { executable: '/usr/bin/unzip', args: ['-Z1', '/tmp/clod-xlsx-snapshot/workbook.xlsx'], encoding: 'buffer', shell: false }, { executable: '/usr/bin/unzip', args: ['-p', '/tmp/clod-xlsx-snapshot/workbook.xlsx', 'xl/workbook.xml'], encoding: 'buffer', shell: false }])
  })

  it('fails before archive processing when unzip is unavailable', async () => {
    const events = []
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ accessImpl: async () => { events.push('access'); throw new Error('synthetic unavailable executable') }, statImpl: async () => { events.push('stat') }, execFileImpl: async () => { events.push('exec') } })
    const archive = module.createUnzipArchive('/tmp/unavailable-synthetic.xlsx', runtime)
    expect({ code: await operationCode(() => archive.verify()), events }).toEqual({ code: 'ARCHIVE_TOOL_UNAVAILABLE', events: ['access'] })
  })

  it('rejects null reader options with a domain error', async () => {
    const module = await xlsxModule()
    expect(await operationCode(() => module.readTabularXlsx('/tmp/null-options-synthetic.xlsx', null))).toBe('INVALID_OPTIONS')
  })

  it.each(['accessImpl', 'statImpl', 'digestImpl', 'execFileImpl', 'snapshotImpl'])('rejects a non-function injected %s', async (name) => {
    const module = await xlsxModule()
    const operation = async () => module.createUnzipArchive('/tmp/runtime-synthetic.xlsx', snapshotRuntime({ [name]: 'not-a-function' })).verify()
    expect(await operationCode(operation)).toBe('INVALID_ARCHIVE_RUNTIME')
  })

  it('rejects an invalid filesystem stat result', async () => {
    const module = await xlsxModule()
    const archive = module.createUnzipArchive('/tmp/stat-synthetic.xlsx', snapshotRuntime({ statImpl: async () => Object.freeze({ size: 8 }) }))
    expect(await operationCode(() => archive.verify())).toBe('INVALID_ARCHIVE_STAT')
  })

  it('wraps filesystem failures without retaining their source value', async () => {
    const module = await xlsxModule()
    const archive = module.createUnzipArchive('/tmp/filesystem-synthetic.xlsx', snapshotRuntime({ statImpl: async () => { throw new Error('private-source-marker') } }))
    const error = await operationError(() => archive.verify())
    expect({ code: error.code, name: error.name, leaked: error.message.includes('private-source-marker'), hasCause: error.hasCause }).toEqual({ code: 'ARCHIVE_STAT_FAILURE', name: 'TabularXlsxError', leaked: false, hasCause: false })
  })

  it('wraps snapshot creation failures', async () => {
    const module = await xlsxModule()
    const archive = module.createUnzipArchive('/tmp/snapshot-synthetic.xlsx', snapshotRuntime({ snapshotImpl: async () => { throw new Error('private-snapshot-marker') } }))
    expect(await operationCode(() => archive.verify())).toBe('ARCHIVE_SNAPSHOT_FAILURE')
  })

  it('cleans an owned invalid snapshot candidate exactly once', async () => {
    const state = { cleanups: 0 }
    const module = await xlsxModule()
    const archive = module.createUnzipArchive('/tmp/invalid-snapshot-synthetic.xlsx', snapshotRuntime({ snapshotImpl: async () => Object.freeze({ filePath: '/tmp/invalid-snapshot-synthetic.xlsx', cleanup: async () => { state.cleanups += 1 } }) }))
    const code = await operationCode(() => archive.verify())
    expect({ code, cleanups: state.cleanups }).toEqual({ code: 'INVALID_ARCHIVE_SNAPSHOT', cleanups: 1 })
  })

  it('cleans an owned snapshot once when its path getter fails after cleanup is obtained', async () => {
    const state = { cleanups: 0 }
    const candidate = Object.defineProperties({}, { cleanup: { get: () => async () => { state.cleanups += 1 } }, filePath: { get: () => { throw new Error('private-path-marker') } } })
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ snapshotImpl: async () => candidate })
    const error = await operationError(() => module.readTabularXlsx('/tmp/getter-snapshot-synthetic.xlsx', { runtime }))
    expect({ code: error.code, cleanups: state.cleanups, leaked: error.message.includes('private-path-marker') }).toEqual({ code: 'INVALID_ARCHIVE_SNAPSHOT', cleanups: 1, leaked: false })
  })

  it.each(['byteSize', 'sha256'])('cleans an owned snapshot once when digest %s getter fails', async (property) => {
    const state = { cleanups: 0 }
    const digest = Object.defineProperties({}, { byteSize: { get: () => { if (property === 'byteSize') throw new Error('private-digest-marker'); return 512 } }, sha256: { get: () => { if (property === 'sha256') throw new Error('private-digest-marker'); return 'ab'.repeat(32) } } })
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ digestImpl: async () => digest, snapshotImpl: async () => Object.freeze({ filePath: '/tmp/digest-getter/workbook.xlsx', cleanup: async () => { state.cleanups += 1 } }) })
    const error = await operationError(() => module.readTabularXlsx('/tmp/digest-getter-synthetic.xlsx', { runtime }))
    expect({ code: error.code, cleanups: state.cleanups, leaked: error.message.includes('private-digest-marker') }).toEqual({ code: 'ARCHIVE_DIGEST_FAILURE', cleanups: 1, leaked: false })
  })

  it('reports unzip integrity execution failure', async () => {
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ statImpl: async () => Object.freeze({ isFile: () => true, size: 128 }), execFileImpl: async () => { throw new Error('synthetic unzip failure') } })
    const archive = module.createUnzipArchive('/tmp/corrupt-synthetic.xlsx', runtime)
    expect(await operationCode(() => archive.verify())).toBe('ZIP_INTEGRITY_FAILURE')
  })

  it('wraps tool failures without retaining their source value', async () => {
    const module = await xlsxModule()
    const archive = module.createUnzipArchive('/tmp/tool-synthetic.xlsx', snapshotRuntime({ execFileImpl: async () => { throw new Error('private-tool-marker') } }))
    const error = await operationError(() => archive.verify())
    expect({ code: error.code, leaked: error.message.includes('private-tool-marker'), hasCause: error.hasCause }).toEqual({ code: 'ZIP_INTEGRITY_FAILURE', leaked: false, hasCause: false })
  })

  it('parses one stable snapshot when the source changes after snapshot creation', async () => {
    const snapshots = new Map()
    const events = []
    let source = { ...BASE_MEMBERS }
    const runtime = snapshotRuntime({ snapshotImpl: async () => { snapshots.set('/tmp/stable-snapshot/workbook.xlsx', { ...source }); return Object.freeze({ filePath: '/tmp/stable-snapshot/workbook.xlsx', cleanup: async () => { events.push('cleanup') } }) }, execFileImpl: async (_, args) => { events.push(args[1]); const members = snapshots.get(args[1]) ?? source; if (args[0] === '-tqq') { source = { ...source, 'xl/worksheets/sheet1.xml': SPARSE_WORKSHEET.replace('Аглая', 'Изменено') }; return Object.freeze({ stdout: Buffer.alloc(0) }) } if (args[0] === '-Z1') return Object.freeze({ stdout: Buffer.from(Object.keys(members).join('\n')) }); return Object.freeze({ stdout: Buffer.from(members[args[2]]) }) } })
    const module = await xlsxModule()
    const result = await parse(module.createUnzipArchive('/tmp/cloud-source-synthetic.xlsx', runtime))
    expect({ value: result.rows[0].values.Имя, operationPaths: [...new Set(events.filter((event) => event !== 'cleanup'))], cleanup: events.filter((event) => event === 'cleanup').length }).toEqual({ value: 'Аглая', operationPaths: ['/tmp/stable-snapshot/workbook.xlsx'], cleanup: 1 })
  })

  it('returns deeply immutable metadata for the exact parsed snapshot', async () => {
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ execFileImpl: async (_, args) => { if (args[0] === '-Z1') return Object.freeze({ stdout: Buffer.from(Object.keys(BASE_MEMBERS).join('\n')) }); if (args[0] === '-p') return Object.freeze({ stdout: Buffer.from(BASE_MEMBERS[args[2]]) }); return Object.freeze({ stdout: Buffer.alloc(0) }) } })
    const result = await module.readTabularXlsx('/tmp/metadata-source-synthetic.xlsx', { runtime })
    expect({ snapshot: result.snapshot, frozen: [result, result.snapshot].every(Object.isFrozen) }).toEqual({ snapshot: { sha256: 'ab'.repeat(32), byteSize: 512 }, frozen: true })
  })

  it('rejects invalid metadata from an injected reader archive', async () => {
    const module = await xlsxModule()
    const archive = Object.freeze({ ...fakeArchive(BASE_MEMBERS), metadata: async () => Object.freeze({ sha256: 'invalid', byteSize: -1 }) })
    expect(await operationCode(() => module.readTabularXlsx('/tmp/injected-synthetic.xlsx', { archive }))).toBe('INVALID_ARCHIVE_DIGEST')
  })

  it('closes an injected non-idempotent reader archive exactly once on success', async () => {
    const state = { closes: 0 }
    const module = await xlsxModule()
    const archive = Object.freeze({ ...fakeArchive(BASE_MEMBERS), metadata: async () => Object.freeze({ sha256: 'ab'.repeat(32), byteSize: 512 }), close: async () => { state.closes += 1; if (state.closes > 1) throw new Error('synthetic double close') } })
    const code = await operationCode(() => module.readTabularXlsx('/tmp/injected-success-synthetic.xlsx', { archive }))
    expect({ code, closes: state.closes }).toEqual({ code: 'NO_ERROR', closes: 1 })
  })

  it('closes an injected non-idempotent reader archive exactly once on parse failure', async () => {
    const state = { closes: 0 }
    const module = await xlsxModule()
    const members = Object.freeze({ ...BASE_MEMBERS, 'xl/worksheets/sheet1.xml': DUPLICATE_WORKSHEET })
    const archive = Object.freeze({ ...fakeArchive(members), metadata: async () => Object.freeze({ sha256: 'ab'.repeat(32), byteSize: 512 }), close: async () => { state.closes += 1; if (state.closes > 1) throw new Error('synthetic double close') } })
    const code = await operationCode(() => module.readTabularXlsx('/tmp/injected-failure-synthetic.xlsx', { archive }))
    expect({ code, closes: state.closes }).toEqual({ code: 'DUPLICATE_HEADER', closes: 1 })
  })

  it('closes an injected reader archive once when metadata validation fails before parsing', async () => {
    const state = { closes: 0 }
    const module = await xlsxModule()
    const archive = Object.freeze({ ...fakeArchive(BASE_MEMBERS), metadata: async () => Object.freeze({ sha256: 'invalid', byteSize: -1 }), close: async () => { state.closes += 1 } })
    const code = await operationCode(() => module.readTabularXlsx('/tmp/injected-metadata-failure-synthetic.xlsx', { archive }))
    expect({ code, closes: state.closes }).toEqual({ code: 'INVALID_ARCHIVE_DIGEST', closes: 1 })
  })

  it.each(['byteSize', 'sha256'])('closes an injected reader archive once when metadata %s getter fails', async (property) => {
    const state = { closes: 0 }
    const metadata = Object.defineProperties({}, { byteSize: { get: () => { if (property === 'byteSize') throw new Error('private-reader-marker'); return 512 } }, sha256: { get: () => { if (property === 'sha256') throw new Error('private-reader-marker'); return 'ab'.repeat(32) } } })
    const module = await xlsxModule()
    const archive = Object.freeze({ ...fakeArchive(BASE_MEMBERS), metadata: async () => metadata, close: async () => { state.closes += 1 } })
    const error = await operationError(() => module.readTabularXlsx('/tmp/injected-getter-synthetic.xlsx', { archive }))
    expect({ code: error.code, closes: state.closes, leaked: error.message.includes('private-reader-marker') }).toEqual({ code: 'INVALID_ARCHIVE_DIGEST', closes: 1, leaked: false })
  })

  it('bounds the compressed archive input', async () => {
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ statImpl: async () => Object.freeze({ isFile: () => true, size: 9 }), limits: Object.freeze({ maxArchiveBytes: 8 }) })
    const archive = module.createUnzipArchive('/tmp/large-synthetic.xlsx', runtime)
    expect(await operationCode(() => archive.verify())).toBe('ARCHIVE_INPUT_TOO_LARGE')
  })

  it('bounds the archive member listing output', async () => {
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ statImpl: async () => Object.freeze({ isFile: () => true, size: 7 }), execFileImpl: async () => Object.freeze({ stdout: Buffer.alloc(9) }), limits: Object.freeze({ maxArchiveListBytes: 8 }) })
    const archive = module.createUnzipArchive('/tmp/list-synthetic.xlsx', runtime)
    expect(await operationCode(() => archive.list())).toBe('ARCHIVE_TOOL_FAILURE')
  })

  it('bounds decompressed archive member output', async () => {
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ statImpl: async () => Object.freeze({ isFile: () => true, size: 7 }), execFileImpl: async () => Object.freeze({ stdout: Buffer.alloc(9) }), limits: Object.freeze({ maxMemberBytes: 8 }) })
    const archive = module.createUnzipArchive('/tmp/member-synthetic.xlsx', runtime)
    expect(await operationCode(() => archive.read('xl/workbook.xml'))).toBe('ARCHIVE_TOOL_FAILURE')
  })

  it('rejects a disallowed production archive member before execution', async () => {
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ statImpl: async () => Object.freeze({ isFile: () => true, size: 7 }) })
    const archive = module.createUnzipArchive('/tmp/member-synthetic.xlsx', runtime)
    expect(await operationCode(() => archive.read('xl/vbaProject.bin'))).toBe('UNSUPPORTED_ARCHIVE_MEMBER')
  })

  it('rejects invalid UTF-8 returned by the production byte adapter', async () => {
    const events = []
    const module = await xlsxModule()
    const runtime = snapshotRuntime({ statImpl: async () => Object.freeze({ isFile: () => true, size: 7 }), snapshotImpl: async () => Object.freeze({ filePath: '/tmp/utf8-snapshot/workbook.xlsx', cleanup: async () => { events.push('cleanup') } }), execFileImpl: async (_, args) => { if (args[0] === '-Z1') return Object.freeze({ stdout: Buffer.from(Object.keys(BASE_MEMBERS).join('\n')) }); if (args[0] === '-p' && args[2] === 'xl/workbook.xml') return Object.freeze({ stdout: Buffer.from([0xc3, 0x28]) }); return Object.freeze({ stdout: Buffer.alloc(0) }) } })
    const archive = module.createUnzipArchive('/tmp/utf8-synthetic.xlsx', runtime)
    expect({ code: await errorCode(archive), cleanup: events.length }).toEqual({ code: 'INVALID_ARCHIVE_OUTPUT', cleanup: 1 })
  })
})
