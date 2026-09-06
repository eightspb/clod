import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, link, mkdir, mkdtemp, open, readdir, rename, rm, truncate, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it, onTestFinished } from 'vitest'
import { runClinicImportCommand } from '../../scripts/import-clinic-history.mjs'
import { writeClinicImportStage } from '../lib/clinic-import-stage.js'
import { applyClinicImportStage } from '../lib/clinic-import-store.js'
import { createClinicImportBundle } from '../lib/clinic-import-bundle.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const ENCRYPTION_KEY = Buffer.from('cli-encryption-key-synthetic-026').toString('base64')
const FINGERPRINT_KEY = 'cli-fingerprint-key-synthetic-2026-secure'
const MANIFEST_HASH = 'a'.repeat(64)
const PLAN_HASH = 'b'.repeat(64)
const STAGE_ARTIFACT_LIMIT_BYTES = 512 * 1024 * 1024
const SOURCE_FLAGS = Object.freeze([['--pd', '544663c3807aab090001bad8PD.csv'], ['--patients', '544663c3807aab090001bad8_patients.csv'], ['--visits', '544663c3807aab090001bad8_visits.csv'], ['--invoices', '544663c3807aab090001bad8_invoices.csv'], ['--pd-workbook', '544663c3807aab090001bad8PD — копия.xlsx'], ['--medesk', 'medesk.csv'], ['--legacy-patients', 'Vse pacienty.xlsx']])
const SOURCE_ROLES = Object.freeze(['pd', 'patients', 'visits', 'invoices', 'pdWorkbook', 'medesk', 'legacyPatients'])
const SOURCE_NAMES = Object.freeze({ pd: SOURCE_FLAGS[0][1], patients: SOURCE_FLAGS[1][1], visits: SOURCE_FLAGS[2][1], invoices: SOURCE_FLAGS[3][1], pdWorkbook: SOURCE_FLAGS[4][1], medesk: SOURCE_FLAGS[5][1], legacyPatients: SOURCE_FLAGS[6][1] })
const PARSING_MODES = Object.freeze({ pd: 'strict', patients: 'strict', visits: 'legacy_physical_rows', invoices: 'strict', pdWorkbook: 'strict', medesk: 'strict', legacyPatients: 'strict' })

function resolverRow(role, sourceRow, values) {
  return Object.freeze({ sourceRole: role, sourceName: SOURCE_NAMES[role], sourceRow, values: Object.freeze(values), structuralIssues: Object.freeze([]) })
}

function resolverSource(role, rows) {
  return Object.freeze({ role, sourceName: SOURCE_NAMES[role], kind: SOURCE_NAMES[role].endsWith('.xlsx') ? 'xlsx' : 'csv', parsingMode: PARSING_MODES[role], headers: Object.freeze(Object.keys(rows[0]?.values ?? {})), rows: Object.freeze(rows), snapshot: Object.freeze({ sha256: createHash('sha256').update(role).digest('hex'), byteSize: 100 + rows.length }) })
}

function resolverSources() {
  const ehr = '0000000000007071'
  const pd = resolverSource('pd', [resolverRow('pd', 2, { 'Номер карты (MEDESK)': ehr, 'Номер карты (клиника)': 'С-7071', 'Фамилия': 'Синтетическая', 'Имя': 'Пациентка', 'Отчество': 'Тестовна', 'Дата рождения': '01.01.1991', 'Пол': 'Женский', 'Почта 1': '', 'Почта 2': '', 'Телефон 1': '9990000071', 'Телефон 2': '', 'Паспорт (серия)': '', 'Паспорт (номер)': '', 'Паспорт (кем выдан)': '', 'Паспорт (дата выдачи)': '', 'Паспорт (код подразделения)': '', 'ИНН': '', 'СНИЛС': '', 'Номер пенсионного удостоверения': '', 'Адрес (индекс)': '', 'Адрес (область)': '', 'Адрес (населенный пункт)': '', 'Адрес (улица, дом, кв.)': '', 'Представители': '', 'Метки': '', 'Кем создан': '', 'Номер договора': '', 'Ответственный сотрудник': '' })])
  const patients = resolverSource('patients', [])
  const visits = resolverSource('visits', [resolverRow('visits', 2, { appointment_id: 'cli-e2e-appointment', appointment_begin: '2026-08-27T10:00:00.000Z', appointment_end: '2026-08-27T10:30:00.000Z', cabinet: '', status: 'completed', patient_card: ehr, doctor: 'Синтетический врач', doctor_role: '', service_names: 'Синтетическая услуга', invoice_ids: '', comment: '' })])
  const invoices = resolverSource('invoices', [resolverRow('invoices', 2, { invoice_id: 'invoice-cli-e2e', total_amount: '', paid_amount: '', invoice_status: '', payer_patient_card: ehr, payer_enterprise_name: '', invoice_date: '', created_by: '', invoice_item_id: '', appointment_id: 'cli-e2e-appointment', service_name: 'Синтетическая услуга', service_price: '', service_quantity: '', invoice_item_price: '', invoice_item_discount: '', invoice_item_tax: '' })])
  const pdWorkbook = resolverSource('pdWorkbook', [])
  const medesk = resolverSource('medesk', [])
  const legacyPatients = resolverSource('legacyPatients', [])
  const sources = Object.freeze({ pd, patients, visits, invoices, pdWorkbook, medesk, legacyPatients })
  const files = SOURCE_ROLES.map((role) => Object.freeze({ role, filename: SOURCE_NAMES[role], sha256: sources[role].snapshot.sha256, byteSize: sources[role].snapshot.byteSize, rowCount: sources[role].rows.length, parsingMode: PARSING_MODES[role], structuralIssueCount: 0 }))
  const manifest = Object.freeze({ version: 1, files: Object.freeze(files), sha256: createHash('sha256').update(JSON.stringify({ version: 1, files })).digest('hex') })
  return Object.freeze({ sources, patientSources: Object.freeze({ primary: pd, leftJoins: Object.freeze([patients, pdWorkbook, medesk, legacyPatients]) }), visits, invoices, manifest })
}

async function resolverBundle(value) {
  return createClinicImportBundle(value, { loadSources: async () => resolverSources() })
}

async function migratedDatabase(databasePath) {
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: pathToFileURL(databasePath).href, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'clinic-cli-test-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const sourceDirectory = join(root, 'sources')
  await mkdir(sourceDirectory)
  const sources = Object.fromEntries(SOURCE_FLAGS.map(([flag, filename]) => [flag, join(sourceDirectory, filename)]))
  await Promise.all(Object.values(sources).map((sourcePath) => writeFile(sourcePath, 'synthetic')))
  const databasePath = join(root, 'target.db')
  const backupPath = join(root, 'backup.db')
  const stagePath = join(root, 'clinic-import.stage')
  await migratedDatabase(databasePath)
  const database = createClient({ url: pathToFileURL(databasePath).href })
  await database.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: ['00000000-0000-8000-8000-000000000090', '00000000-0000-8000-8000-000000000091', 'reveal', 'synthetic-cli-marker', '2026-08-27T00:00:00.000Z'] })
  await database.execute('PRAGMA wal_checkpoint(TRUNCATE)')
  database.close()
  await Promise.all([rm(`${databasePath}-wal`, { force: true }), rm(`${databasePath}-shm`, { force: true })])
  await copyFile(databasePath, backupPath)
  await writeFile(stagePath, JSON.stringify({ version: 1, manifestHash: MANIFEST_HASH, planHash: PLAN_HASH }))
  return Object.freeze({ root, sources, databasePath, backupPath, stagePath })
}

function environment() {
  return Object.freeze({ PATIENT_ENCRYPTION_KEY: ENCRYPTION_KEY, CONTACT_FINGERPRINT_KEY: FINGERPRINT_KEY })
}

function dryArguments(value) {
  return Object.freeze([...SOURCE_FLAGS.flatMap(([flag]) => [flag, value.sources[flag]]), '--database', value.databasePath, '--stage', value.stagePath])
}

function applyArguments(value, additions = []) {
  return Object.freeze(['--apply', '--database', value.databasePath, '--stage', value.stagePath, '--manifest', MANIFEST_HASH, '--backup', value.backupPath, ...additions])
}

function replacingStageFileSystem(stagePath) {
  let reads = 0
  const fileSystem = Object.freeze({ open: async (...values) => {
    await rename(stagePath, `${stagePath}.retained`)
    await writeFile(stagePath, '{')
    await truncate(stagePath, STAGE_ARTIFACT_LIMIT_BYTES + 1)
    const handle = await open(...values)
    return Object.freeze({ stat: (...inputs) => handle.stat(...inputs), read: (...inputs) => { reads += 1; return handle.read(...inputs) }, close: (...inputs) => handle.close(...inputs) })
  } })
  return Object.freeze({ fileSystem, readCount: () => reads })
}

function dependencies(overrides = {}) {
  const output = []
  const calls = { bundle: 0, stage: 0, apply: 0 }
  const bundle = Object.freeze({ manifest: Object.freeze({ sha256: MANIFEST_HASH }), report: Object.freeze({ controls: Object.freeze({ patients: 2, visits: 3 }) }) })
  const values = {
    repositoryPath: PROJECT_ROOT,
    output: (line) => output.push(line),
    createBundle: async () => { calls.bundle += 1; return bundle },
    writeStage: async () => { calls.stage += 1; return Object.freeze({ manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, summary: Object.freeze({ patients: 2, historicalVisits: 3 }) }) },
    applyStage: async () => { calls.apply += 1; return Object.freeze({ batchId: '00000000-0000-8000-8000-000000000001', manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, status: 'completed', applied: true, controls: Object.freeze({ patients: 2, visits: 3 }), summary: Object.freeze({ patients: 2, historicalVisits: 3 }) }) },
    ...overrides
  }
  return Object.freeze({ values: Object.freeze(values), output, calls })
}

async function captured(operation) {
  try { return Object.freeze({ value: await operation(), error: null }) } catch (error) { return Object.freeze({ value: null, error }) }
}

describe('clinic history import CLI', () => {
  it('defaults to dry-run, creates a protected stage, never calls the store, and prints only safe aggregates', async () => {
    const value = await fixture()
    const runtime = dependencies()
    const result = await runClinicImportCommand(dryArguments(value), environment(), runtime.values)
    expect({ mode: result.mode, calls: runtime.calls, output: runtime.output, leaked: runtime.output.some((line) => line.includes('synthetic') || line.includes(value.root)) }).toEqual({ mode: 'dry-run', calls: { bundle: 1, stage: 1, apply: 0 }, output: [JSON.stringify({ mode: 'dry-run', manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, summary: { patients: 2, historicalVisits: 3 } })], leaked: false })
  })

  it('rejects unknown arguments before calling any import service', async () => {
    const value = await fixture()
    const runtime = dependencies()
    const result = await captured(() => runClinicImportCommand([...dryArguments(value), '--mystery'], environment(), runtime.values))
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error), calls: runtime.calls }).toEqual({ code: 'CLI_INPUT_INVALID', frozen: true, calls: { bundle: 0, stage: 0, apply: 0 } })
  })

  it('rejects duplicate arguments and a stage path inside the repository', async () => {
    const value = await fixture()
    const duplicate = dependencies()
    const inside = dependencies()
    const duplicateArgs = [...dryArguments(value), '--database', value.databasePath]
    const insideArgs = [...dryArguments(value)]
    insideArgs[insideArgs.indexOf('--stage') + 1] = join(PROJECT_ROOT, 'package.json')
    const results = await Promise.all([captured(() => runClinicImportCommand(duplicateArgs, environment(), duplicate.values)), captured(() => runClinicImportCommand(insideArgs, environment(), inside.values))])
    expect({ codes: results.map(({ error }) => error?.code), calls: [duplicate.calls, inside.calls] }).toEqual({ codes: ['CLI_INPUT_INVALID', 'CLI_INPUT_INVALID'], calls: [{ bundle: 0, stage: 0, apply: 0 }, { bundle: 0, stage: 0, apply: 0 }] })
  })

  it('rejects relative paths and missing source files before bundle creation', async () => {
    const value = await fixture()
    const first = dependencies()
    const second = dependencies()
    const relative = [...dryArguments(value)]
    relative[relative.indexOf('--pd') + 1] = 'relative.csv'
    const missing = [...dryArguments(value)]
    missing[missing.indexOf('--patients') + 1] = join(value.root, 'missing.csv')
    const results = await Promise.all([captured(() => runClinicImportCommand(relative, environment(), first.values)), captured(() => runClinicImportCommand(missing, environment(), second.values))])
    expect({ codes: results.map(({ error }) => error?.code), calls: [first.calls, second.calls] }).toEqual({ codes: ['CLI_INPUT_INVALID', 'CLI_FILE_INVALID'], calls: [{ bundle: 0, stage: 0, apply: 0 }, { bundle: 0, stage: 0, apply: 0 }] })
  })

  it('requires backup and rejects the target path or a hard link to the target as backup', async () => {
    const value = await fixture()
    const first = dependencies()
    const second = dependencies()
    const third = dependencies()
    const withoutBackup = applyArguments(value).slice(0, -2)
    const sameBackup = [...applyArguments(value)]
    sameBackup[sameBackup.indexOf('--backup') + 1] = value.databasePath
    const hardLinkPath = join(value.root, 'backup-hard-link.db')
    await link(value.databasePath, hardLinkPath)
    const hardLinkBackup = [...applyArguments(value)]
    hardLinkBackup[hardLinkBackup.indexOf('--backup') + 1] = hardLinkPath
    const results = await Promise.all([captured(() => runClinicImportCommand(withoutBackup, environment(), first.values)), captured(() => runClinicImportCommand(sameBackup, environment(), second.values)), captured(() => runClinicImportCommand(hardLinkBackup, environment(), third.values))])
    expect({ codes: results.map(({ error }) => error?.code), applies: [first.calls.apply, second.calls.apply, third.calls.apply] }).toEqual({ codes: ['CLI_INPUT_INVALID', 'BACKUP_INVALID', 'BACKUP_INVALID'], applies: [0, 0, 0] })
  })

  it('rejects remote database URLs and production database apply without exact confirmation', async () => {
    const value = await fixture()
    const first = dependencies()
    const second = dependencies()
    const third = dependencies()
    const remote = [...applyArguments(value)]
    remote[remote.indexOf('--database') + 1] = 'libsql://private.example.invalid/database'
    const production = [...applyArguments(value)]
    production[production.indexOf('--database') + 1] = '/data/db.sqlite'
    const productionAlias = [...applyArguments(value)]
    productionAlias[productionAlias.indexOf('--database') + 1] = '/data/../data/db.sqlite'
    const results = await Promise.all([captured(() => runClinicImportCommand(remote, environment(), first.values)), captured(() => runClinicImportCommand(production, environment(), second.values)), captured(() => runClinicImportCommand(productionAlias, environment(), third.values))])
    expect({ codes: results.map(({ error }) => error?.code), applies: [first.calls.apply, second.calls.apply, third.calls.apply] }).toEqual({ codes: ['CLI_INPUT_INVALID', 'PRODUCTION_CONFIRMATION_REQUIRED', 'PRODUCTION_CONFIRMATION_REQUIRED'], applies: [0, 0, 0] })
  })

  it('rejects a changed manifest and a non-SQLite backup before target storage', async () => {
    const value = await fixture()
    const changed = dependencies()
    const invalidBackup = dependencies()
    const changedManifest = [...applyArguments(value)]
    changedManifest[changedManifest.indexOf('--manifest') + 1] = 'c'.repeat(64)
    const badBackupPath = join(value.root, 'not-sqlite.db')
    await writeFile(badBackupPath, 'synthetic private backup content')
    const badBackup = [...applyArguments(value)]
    badBackup[badBackup.indexOf('--backup') + 1] = badBackupPath
    const results = await Promise.all([captured(() => runClinicImportCommand(changedManifest, environment(), changed.values)), captured(() => runClinicImportCommand(badBackup, environment(), invalidBackup.values))])
    expect({ codes: results.map(({ error }) => error?.code), applies: [changed.calls.apply, invalidBackup.calls.apply] }).toEqual({ codes: ['MANIFEST_MISMATCH', 'BACKUP_INVALID'], applies: [0, 0] })
  })

  it('rejects a valid but unrelated SQLite database as backup of the target snapshot', async () => {
    const value = await fixture()
    const unrelatedPath = join(value.root, 'unrelated.db')
    await migratedDatabase(unrelatedPath)
    const runtime = dependencies()
    const args = [...applyArguments(value)]
    args[args.indexOf('--backup') + 1] = unrelatedPath
    const result = await captured(() => runClinicImportCommand(args, environment(), runtime.values))
    expect({ code: result.error?.code, apply: runtime.calls.apply }).toEqual({ code: 'BACKUP_INVALID', apply: 0 })
  })

  it('rejects target and backup WAL sidecars before applying', async () => {
    const value = await fixture()
    const first = dependencies()
    const second = dependencies()
    await writeFile(`${value.databasePath}-wal`, 'synthetic')
    const targetResult = await captured(() => runClinicImportCommand(applyArguments(value), environment(), first.values))
    await rm(`${value.databasePath}-wal`)
    await writeFile(`${value.backupPath}-shm`, 'synthetic')
    const backupResult = await captured(() => runClinicImportCommand(applyArguments(value), environment(), second.values))
    expect({ codes: [targetResult.error?.code, backupResult.error?.code], applies: [first.calls.apply, second.calls.apply] }).toEqual({ codes: ['CLI_FILE_INVALID', 'BACKUP_INVALID'], applies: [0, 0] })
  })

  it('rejects target and backup rollback journals before applying', async () => {
    const value = await fixture()
    const first = dependencies()
    const second = dependencies()
    await writeFile(`${value.databasePath}-journal`, 'synthetic')
    const targetResult = await captured(() => runClinicImportCommand(applyArguments(value), environment(), first.values))
    await rm(`${value.databasePath}-journal`)
    await writeFile(`${value.backupPath}-journal`, 'synthetic')
    const backupResult = await captured(() => runClinicImportCommand(applyArguments(value), environment(), second.values))
    expect({ codes: [targetResult.error?.code, backupResult.error?.code], applies: [first.calls.apply, second.calls.apply] }).toEqual({ codes: ['CLI_FILE_INVALID', 'BACKUP_INVALID'], applies: [0, 0] })
  })

  it('rejects an artifact above the shared 512 MiB boundary before apply', async () => {
    const value = await fixture()
    await truncate(value.stagePath, STAGE_ARTIFACT_LIMIT_BYTES + 1)
    const runtime = dependencies()
    const result = await captured(() => runClinicImportCommand(applyArguments(value), environment(), runtime.values))
    expect({ code: result.error?.code, apply: runtime.calls.apply }).toEqual({ code: 'CLI_FILE_INVALID', apply: 0 })
  })

  it('rejects stage pathname replacement before reading replacement bytes', async () => {
    const value = await fixture()
    const replacement = replacingStageFileSystem(value.stagePath)
    const runtime = dependencies({ fileSystem: replacement.fileSystem })
    const result = await captured(() => runClinicImportCommand(applyArguments(value), environment(), runtime.values))
    expect({ code: result.error?.code, apply: runtime.calls.apply, output: runtime.output, reads: replacement.readCount() }).toEqual({ code: 'CLI_FILE_INVALID', apply: 0, output: [], reads: 0 })
  })

  it('rejects target or backup path replacement at the guarded write-transaction boundary before any insert', async () => {
    const run = async (selected, code) => {
      const value = await fixture()
      const selectedPath = selected === 'target' ? value.databasePath : value.backupPath
      const copiedFrom = selected === 'target' ? value.backupPath : value.databasePath
      const movedPath = `${selectedPath}.moved`
      const runtime = dependencies({ applyStage: async (stageInput) => {
        const client = Object.freeze({ execute: (...values) => stageInput.client.execute(...values), transaction: async (mode) => {
          await rename(selectedPath, movedPath)
          await copyFile(copiedFrom, selectedPath)
          return stageInput.client.transaction(mode)
        } })
        const transaction = await client.transaction('write')
        await transaction.rollback()
        await transaction.close()
        return Object.freeze({ batchId: '00000000-0000-8000-8000-000000000001', manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, status: 'completed', applied: true, controls: Object.freeze({ patients: 2 }), summary: Object.freeze({ patients: 2 }) })
      } })
      const result = await captured(() => runClinicImportCommand(applyArguments(value), environment(), runtime.values))
      const database = createClient({ url: pathToFileURL(value.databasePath).href })
      const count = await database.execute('SELECT COUNT(*) AS total FROM ImportBatch')
      database.close()
      return Object.freeze({ code: result.error?.code, expected: code, batches: Number(count.rows[0].total), output: runtime.output })
    }
    expect(await Promise.all([run('target', 'CLI_FILE_INVALID'), run('backup', 'BACKUP_INVALID')])).toEqual([{ code: 'CLI_FILE_INVALID', expected: 'CLI_FILE_INVALID', batches: 0, output: [] }, { code: 'BACKUP_INVALID', expected: 'BACKUP_INVALID', batches: 0, output: [] }])
  })

  it('fails closed without stdout when the retained backup path disappears before post-close fencing', async () => {
    const value = await fixture()
    const runtime = dependencies({ applyStage: async () => {
      await rename(value.backupPath, `${value.backupPath}.moved`)
      return Object.freeze({ batchId: '00000000-0000-8000-8000-000000000001', manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, status: 'completed', applied: true, controls: Object.freeze({ patients: 2 }), summary: Object.freeze({ patients: 2 }) })
    } })
    const result = await captured(() => runClinicImportCommand(applyArguments(value), environment(), runtime.values))
    expect({ code: result.error?.code, output: runtime.output }).toEqual({ code: 'BACKUP_INVALID', output: [] })
  })

  it('opens authorized target and backup filenames containing URL-significant characters without path confusion', async () => {
    const value = await fixture()
    const results = []
    for (const suffix of ['%2F', '%25', '#', '?']) {
      const databasePath = join(value.root, `target-${suffix}.db`)
      const backupPath = join(value.root, `backup-${suffix}.db`)
      await Promise.all([copyFile(value.databasePath, databasePath), copyFile(value.databasePath, backupPath)])
      const runtime = dependencies()
      const args = [...applyArguments(value)]
      args[args.indexOf('--database') + 1] = databasePath
      args[args.indexOf('--backup') + 1] = backupPath
      results.push(await captured(() => runClinicImportCommand(args, environment(), runtime.values)))
    }
    expect(results.map(({ value: result, error }) => ({ code: error?.code, status: result?.status }))).toEqual([{ code: undefined, status: 'completed' }, { code: undefined, status: 'completed' }, { code: undefined, status: 'completed' }, { code: undefined, status: 'completed' }])
  })

  it('opens SQLite through a verified private hard-link binding and removes the binding after client close', async () => {
    const value = await fixture()
    let openedFile = null
    const runtime = dependencies({ applyStage: async (stageInput) => {
      const databases = await stageInput.client.execute('PRAGMA database_list')
      openedFile = databases.rows[0].file
      const transaction = await stageInput.client.transaction('write')
      await transaction.rollback()
      await transaction.close()
      return Object.freeze({ batchId: '00000000-0000-8000-8000-000000000001', manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, status: 'completed', applied: true, controls: Object.freeze({ patients: 2 }), summary: Object.freeze({ patients: 2 }) })
    } })
    const result = await runClinicImportCommand(applyArguments(value), environment(), runtime.values)
    const residue = (await readdir(value.root)).filter((name) => name.startsWith('.clinic-import-'))
    expect({ status: result.status, bound: typeof openedFile === 'string' && openedFile.includes('/.clinic-import-') && openedFile.endsWith('/database.sqlite'), residue }).toEqual({ status: 'completed', bound: true, residue: [] })
  })

  it('runs backup integrity and target access only through inode-bound private aliases', async () => {
    const value = await fixture()
    const opened = []
    const runtime = dependencies({ createDatabaseClient: (options) => { opened.push(fileURLToPath(options.url)); return createClient(options) } })
    const result = await runClinicImportCommand(applyArguments(value), environment(), runtime.values)
    const residue = (await readdir(value.root)).filter((name) => name.startsWith('.clinic-import-'))
    expect({ status: result.status, opened: opened.map((file) => ({ privateAlias: file.includes('/.clinic-import-') && file.endsWith('/database.sqlite'), original: file === value.databasePath || file === value.backupPath })), residue }).toEqual({ status: 'completed', opened: [{ privateAlias: true, original: false }, { privateAlias: true, original: false }], residue: [] })
  })

  it('applies an isolated verified stage only after a distinct consistent backup and prints safe totals', async () => {
    const value = await fixture()
    const runtime = dependencies()
    const result = await runClinicImportCommand(applyArguments(value), environment(), runtime.values)
    expect({ result, calls: runtime.calls, output: runtime.output, leaked: runtime.output.some((line) => line.includes(value.root) || line.includes('synthetic')) }).toEqual({ result: { mode: 'apply', batchId: '00000000-0000-8000-8000-000000000001', manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, status: 'completed', applied: true, controls: { patients: 2, visits: 3 }, summary: { patients: 2, historicalVisits: 3 } }, calls: { bundle: 0, stage: 0, apply: 1 }, output: [JSON.stringify({ mode: 'apply', batchId: '00000000-0000-8000-8000-000000000001', manifestHash: MANIFEST_HASH, planHash: PLAN_HASH, status: 'completed', applied: true, controls: { patients: 2, visits: 3 }, summary: { patients: 2, historicalVisits: 3 } })], leaked: false })
  })

  it('runs real identity and visit resolvers through bundle, encrypted stage, transactional store and isolated SQLite', async () => {
    const value = await fixture()
    await rm(value.stagePath)
    const result = await captured(async () => {
      const dryRuntime = dependencies({ createBundle: resolverBundle, writeStage: writeClinicImportStage })
      const dry = await runClinicImportCommand(dryArguments(value), environment(), dryRuntime.values)
      const applyRuntime = dependencies({ applyStage: applyClinicImportStage })
      const args = [...applyArguments(value)]
      args[args.indexOf('--manifest') + 1] = dry.manifestHash
      const applied = await runClinicImportCommand(args, environment(), applyRuntime.values)
      const database = createClient({ url: pathToFileURL(value.databasePath).href })
      const counts = await database.execute('SELECT (SELECT COUNT(*) FROM ImportBatch) AS batches, (SELECT COUNT(*) FROM Patient) AS patients, (SELECT COUNT(*) FROM HistoricalVisit) AS visits, (SELECT COUNT(*) FROM HistoricalInvoice) AS invoices')
      database.close()
      return Object.freeze({ dry, applied, counts: counts.rows })
    })
    expect({ code: result.error?.code, dryMode: result.value?.dry.mode, appliedMode: result.value?.applied.mode, status: result.value?.applied.status, hashLength: result.value?.dry.manifestHash.length, hashesBound: result.value?.dry.manifestHash === result.value?.applied.manifestHash, counts: result.value?.counts }).toEqual({ code: undefined, dryMode: 'dry-run', appliedMode: 'apply', status: 'completed', hashLength: 64, hashesBound: true, counts: [{ batches: 1, patients: 1, visits: 1, invoices: 1 }] })
  })

  it('fails with a distinct code when the target database is not intact after apply', async () => {
    const value = await fixture()
    let checks = 0
    const runtime = dependencies({ createDatabaseClient: (options) => {
      const client = createClient(options)
      return Object.freeze({ execute: async (...args) => { if (args[0] === 'PRAGMA integrity_check' && ++checks === 2) return { rows: [{ integrity_check: '*** in database main *** Page 7: corrupted' }] }; return client.execute(...args) }, transaction: (...args) => client.transaction(...args), close: () => client.close() })
    } })
    const result = await captured(() => runClinicImportCommand(applyArguments(value), environment(), runtime.values))
    expect({ code: result.error?.code, output: runtime.output }).toEqual({ code: 'TARGET_INTEGRITY_FAILED', output: [] })
  })

  it('rejects a store result that is not bound to the requested manifest and plan before stdout', async () => {
    const value = await fixture()
    const runtime = dependencies({ applyStage: async () => Object.freeze({ batchId: '00000000-0000-8000-8000-000000000001', manifestHash: 'c'.repeat(64), planHash: PLAN_HASH, status: 'completed', applied: true, controls: Object.freeze({ patients: 2 }), summary: Object.freeze({ patients: 2 }) }) })
    const result = await captured(() => runClinicImportCommand(applyArguments(value), environment(), runtime.values))
    expect({ code: result.error?.code, output: runtime.output }).toEqual({ code: 'CLI_FAILED', output: [] })
  })

  it('prints only a fixed safe error code when invoked as a subprocess', async () => {
    const result = await captured(() => executeFile(process.execPath, [join(PROJECT_ROOT, 'scripts/import-clinic-history.mjs'), '--unknown', 'private-value'], { cwd: PROJECT_ROOT, env: {}, timeout: 10_000, maxBuffer: 10_000 }))
    expect({ failed: result.error !== null, stderr: result.error?.stderr, leaked: result.error?.stderr.includes('private-value') }).toEqual({ failed: true, stderr: `${JSON.stringify({ status: 'failed', code: 'CLI_INPUT_INVALID' })}\n`, leaked: false })
  })
})
