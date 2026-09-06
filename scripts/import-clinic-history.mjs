import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { access, link, lstat, mkdtemp, open, realpath, rmdir, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { BUSY_TIMEOUT_MS, withBusyTimeout } from '../src/lib/database.js'
import { createClinicImportBundle } from '../src/lib/clinic-import-bundle.js'
import { CLINIC_IMPORT_STAGE_LIMITS } from '../src/lib/clinic-import-stage-limits.js'
import { writeClinicImportStage } from '../src/lib/clinic-import-stage.js'
import { applyClinicImportStage } from '../src/lib/clinic-import-store.js'

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '../..')
const HASH_PATTERN = /^[a-f0-9]{64}$/
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[89ab][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const DIGEST_CHUNK_BYTES = 1024 * 1024
const SOURCE_FLAGS = Object.freeze({ '--pd': 'pd', '--patients': 'patients', '--visits': 'visits', '--invoices': 'invoices', '--pd-workbook': 'pdWorkbook', '--medesk': 'medesk', '--legacy-patients': 'legacyPatients' })
const VALUE_FLAGS = new Set([...Object.keys(SOURCE_FLAGS), '--database', '--stage', '--manifest', '--backup', '--confirm-production'])
const BOOLEAN_FLAGS = new Set(['--apply', '--dry-run'])
const SAFE_ERRORS = new WeakSet()
const ERROR_CODES = new Set(['BACKUP_INVALID', 'CLI_FAILED', 'CLI_FILE_INVALID', 'CLI_INPUT_INVALID', 'MANIFEST_MISMATCH', 'PRODUCTION_CONFIRMATION_REQUIRED', 'TARGET_INTEGRITY_FAILED'])
const DEFAULT_FILE_SYSTEM = Object.freeze({ open })

/** Represents a value-free clinic import command failure. */
export class ClinicImportCliError extends Error {
  constructor(code = 'CLI_FAILED') {
    super('Clinic import command could not be completed')
    this.name = 'ClinicImportCliError'
    this.code = ERROR_CODES.has(code) ? code : 'CLI_FAILED'
    SAFE_ERRORS.add(this)
    Object.freeze(this)
  }
}

function invalid(code = 'CLI_INPUT_INVALID') {
  throw new ClinicImportCliError(code)
}

function parsedArguments(value) {
  if (!Array.isArray(value) || value.length > 40) invalid()
  const result = Object.create(null)
  for (let index = 0; index < value.length; index += 1) {
    const flag = value[index]
    if (typeof flag !== 'string' || Object.hasOwn(result, flag)) invalid()
    if (BOOLEAN_FLAGS.has(flag)) result[flag] = true
    else if (VALUE_FLAGS.has(flag)) {
      const selected = value[index + 1]
      if (typeof selected !== 'string' || selected.length === 0 || selected.length > 4_096 || selected.startsWith('--')) invalid()
      result[flag] = selected
      index += 1
    } else invalid()
  }
  return Object.freeze(result)
}

function absolutePath(value) {
  if (typeof value !== 'string' || !isAbsolute(value) || value.includes('\0')) invalid()
  return value
}

function hash(value, code = 'CLI_INPUT_INVALID') {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) invalid(code)
  return value
}

function inside(parent, child) {
  const pathDifference = relative(parent, child)
  return pathDifference === '' || (!pathDifference.startsWith(`..${sep}`) && pathDifference !== '..' && !isAbsolute(pathDifference))
}

async function regularFile(filePath, code = 'CLI_FILE_INVALID') {
  try {
    const canonicalPath = await realpath(filePath)
    const metadata = await lstat(canonicalPath)
    if (!metadata.isFile() || !Number.isSafeInteger(metadata.size) || metadata.size < 0) invalid(code)
    await access(canonicalPath, constants.R_OK)
    return Object.freeze({ canonicalPath, device: metadata.dev, inode: metadata.ino, size: metadata.size })
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid(code)
  }
}

function sameFile(first, second) {
  return first.canonicalPath === second.canonicalPath || (first.device === second.device && first.inode === second.inode)
}

async function reauthorized(identity, code) {
  try {
    const metadata = await lstat(identity.canonicalPath)
    if (!metadata.isFile() || metadata.dev !== identity.device || metadata.ino !== identity.inode || metadata.size !== identity.size) invalid(code)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid(code)
  }
}

async function authorizedHandle(identity, code, writable = false, fileSystem = DEFAULT_FILE_SYSTEM) {
  let handle
  try {
    handle = await fileSystem.open(identity.canonicalPath, (writable ? constants.O_RDWR : constants.O_RDONLY) | constants.O_NOFOLLOW)
    const metadata = await handle.stat()
    if (!metadata.isFile() || metadata.dev !== identity.device || metadata.ino !== identity.inode || metadata.size !== identity.size || metadata.nlink < 1) invalid(code)
    await reauthorized(identity, code)
    return handle
  } catch (error) {
    try { await handle?.close() } catch { invalid(code) }
    if (SAFE_ERRORS.has(error)) throw error
    invalid(code)
  }
}

async function boundDatabase(handle, identity, code = 'CLI_FILE_INVALID') {
  let directory
  let alias
  try {
    directory = await mkdtemp(join(dirname(identity.canonicalPath), '.clinic-import-'))
    alias = join(directory, 'database.sqlite')
    await link(identity.canonicalPath, alias)
    const metadata = await lstat(alias)
    const retained = await handle.stat()
    if (!metadata.isFile() || metadata.dev !== identity.device || metadata.ino !== identity.inode || retained.dev !== metadata.dev || retained.ino !== metadata.ino) invalid(code)
    await retainedIdentity(handle, identity, code)
    return Object.freeze({ alias, directory })
  } catch (error) {
    let cleanupFailed = false
    if (alias !== undefined) try { await unlink(alias) } catch { cleanupFailed = true }
    if (directory !== undefined) try { await rmdir(directory) } catch { cleanupFailed = true }
    if (cleanupFailed) invalid('CLI_FAILED')
    if (SAFE_ERRORS.has(error)) throw error
    invalid(code)
  }
}

async function cleanupBinding(binding) {
  if (binding === undefined) return
  try {
    await removeEmptySidecars(binding.alias)
    if (await sidecarExists(`${binding.alias}-wal`, 'CLI_FAILED') || await sidecarExists(`${binding.alias}-shm`, 'CLI_FAILED') || await sidecarExists(`${binding.alias}-journal`, 'CLI_FAILED')) invalid('CLI_FAILED')
    await unlink(binding.alias)
    await rmdir(binding.directory)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid('CLI_FAILED')
  }
}

async function retainedBinding(binding, handle, identity, code = 'CLI_FILE_INVALID') {
  try {
    const metadata = await lstat(binding.alias)
    const retained = await handle.stat()
    if (!metadata.isFile() || metadata.dev !== identity.device || metadata.ino !== identity.inode || retained.dev !== metadata.dev || retained.ino !== metadata.ino) invalid(code)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid(code)
  }
}

async function retainedIdentity(handle, identity, code, exactSize = true) {
  try {
    const metadata = await handle.stat()
    const current = await lstat(identity.canonicalPath)
    if (!metadata.isFile() || metadata.dev !== identity.device || metadata.ino !== identity.inode || metadata.nlink < 1 || !current.isFile() || current.dev !== identity.device || current.ino !== identity.inode || (exactSize && (metadata.size !== identity.size || current.size !== identity.size))) invalid(code)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid(code)
  }
}

function missingFile(error) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'code')
    return Boolean(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.value === 'ENOENT')
  } catch {
    return false
  }
}

async function productionIdentity(identity) {
  if (identity.canonicalPath === '/data/db.sqlite') return true
  try {
    const canonicalPath = await realpath('/data/db.sqlite')
    const metadata = await lstat(canonicalPath)
    return metadata.isFile() && (canonicalPath === identity.canonicalPath || (metadata.dev === identity.device && metadata.ino === identity.inode))
  } catch (error) {
    if (missingFile(error)) return false
    invalid('CLI_FILE_INVALID')
  }
}

async function fileDigest(handle, identity, code) {
  await retainedIdentity(handle, identity, code)
  const digest = createHash('sha256')
  const buffer = Buffer.allocUnsafe(DIGEST_CHUNK_BYTES)
  let byteSize = 0
  try {
    while (byteSize < identity.size) {
      const requested = Math.min(buffer.byteLength, identity.size - byteSize)
      const result = await handle.read(buffer, 0, requested, byteSize)
      if (result.bytesRead < 1 || result.bytesRead > requested) invalid(code)
      digest.update(buffer.subarray(0, result.bytesRead))
      byteSize += result.bytesRead
    }
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid(code)
  }
  await retainedIdentity(handle, identity, code)
  if (byteSize !== identity.size) invalid(code)
  return Object.freeze({ byteSize, sha256: digest.digest('hex') })
}

function environmentFrom(value) {
  if (value === null || typeof value !== 'object') invalid()
  let encryptionKey
  let fingerprintKey
  try {
    encryptionKey = value.PATIENT_ENCRYPTION_KEY
    fingerprintKey = value.CONTACT_FINGERPRINT_KEY
  } catch {
    invalid()
  }
  if (typeof encryptionKey !== 'string' || typeof fingerprintKey !== 'string') invalid()
  return Object.freeze({ encryptionKey, fingerprintKey })
}

function dependenciesFrom(value) {
  const defaults = Object.freeze({ repositoryPath: PROJECT_ROOT, output: (line) => console.log(line), createBundle: createClinicImportBundle, writeStage: writeClinicImportStage, applyStage: applyClinicImportStage, fileSystem: DEFAULT_FILE_SYSTEM, createDatabaseClient: patientDatabaseClient })
  if (value === undefined) return defaults
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const keys = Reflect.ownKeys(value)
  if (keys.length < 5 || keys.length > 7 || keys.some((key) => typeof key !== 'string' || !Object.hasOwn(defaults, key))) invalid()
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result[key] = descriptor.value
  }
  if (!Object.hasOwn(result, 'repositoryPath') || !Object.hasOwn(result, 'output') || !Object.hasOwn(result, 'createBundle') || !Object.hasOwn(result, 'writeStage') || !Object.hasOwn(result, 'applyStage') || !isAbsolute(result.repositoryPath) || typeof result.output !== 'function' || typeof result.createBundle !== 'function' || typeof result.writeStage !== 'function' || typeof result.applyStage !== 'function') invalid()
  result.fileSystem = Object.hasOwn(result, 'fileSystem') ? fileSystemFrom(result.fileSystem) : DEFAULT_FILE_SYSTEM
  result.createDatabaseClient = Object.hasOwn(result, 'createDatabaseClient') ? result.createDatabaseClient : patientDatabaseClient
  if (typeof result.createDatabaseClient !== 'function') invalid()
  return Object.freeze(result)
}

function fileSystemFrom(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const keys = Reflect.ownKeys(value)
  const descriptor = keys.length === 1 && keys[0] === 'open' ? Object.getOwnPropertyDescriptor(value, 'open') : null
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') invalid()
  return Object.freeze({ open: descriptor.value })
}

function sourcePaths(argumentsValue) {
  const paths = Object.create(null)
  for (const [flag, role] of Object.entries(SOURCE_FLAGS)) {
    if (!Object.hasOwn(argumentsValue, flag)) invalid()
    paths[role] = absolutePath(argumentsValue[flag])
  }
  return Object.freeze(paths)
}

function countRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid('CLI_FAILED')
  const keys = Reflect.ownKeys(value)
  if (keys.length > 32 || keys.some((key) => typeof key !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(key))) invalid('CLI_FAILED')
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value') || !Number.isSafeInteger(descriptor.value) || descriptor.value < 0) invalid('CLI_FAILED')
    result[key] = descriptor.value
  }
  return Object.freeze(result)
}

function printedDryRun(written) {
  if (written === null || typeof written !== 'object') invalid('CLI_FAILED')
  return Object.freeze({ mode: 'dry-run', manifestHash: hash(written.manifestHash, 'CLI_FAILED'), planHash: hash(written.planHash, 'CLI_FAILED'), summary: countRecord(written.summary) })
}

function printedApply(result, expectedManifestHash, expectedPlanHash) {
  if (result === null || typeof result !== 'object' || typeof result.applied !== 'boolean' || result.status !== 'completed' || !UUID_PATTERN.test(result.batchId)) invalid('CLI_FAILED')
  const manifestHash = hash(result.manifestHash, 'CLI_FAILED')
  const planHash = hash(result.planHash, 'CLI_FAILED')
  if (manifestHash !== expectedManifestHash || planHash !== expectedPlanHash) invalid('CLI_FAILED')
  return Object.freeze({ mode: 'apply', batchId: result.batchId, manifestHash, planHash, status: 'completed', applied: result.applied, controls: countRecord(result.controls), summary: countRecord(result.summary) })
}

async function stageMetadata(identity, fileSystem) {
  let handle
  try {
    if (identity.size < 2 || identity.size > CLINIC_IMPORT_STAGE_LIMITS.artifact) invalid('CLI_FILE_INVALID')
    handle = await authorizedHandle(identity, 'CLI_FILE_INVALID', false, fileSystem)
    const bytes = Buffer.alloc(identity.size)
    let offset = 0
    while (offset < bytes.byteLength) {
      const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset)
      if (result.bytesRead < 1 || result.bytesRead > bytes.byteLength - offset) invalid('CLI_FILE_INVALID')
      offset += result.bytesRead
    }
    const probe = Buffer.alloc(1)
    if ((await handle.read(probe, 0, 1, bytes.byteLength)).bytesRead !== 0) invalid('CLI_FILE_INVALID')
    await retainedIdentity(handle, identity, 'CLI_FILE_INVALID')
    const parsed = JSON.parse(bytes.toString('utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) invalid('CLI_FILE_INVALID')
    return Object.freeze({ manifestHash: hash(parsed.manifestHash, 'CLI_FILE_INVALID'), planHash: hash(parsed.planHash, 'CLI_FILE_INVALID') })
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid('CLI_FILE_INVALID')
  } finally {
    try { await handle?.close() } catch { invalid('CLI_FILE_INVALID') }
  }
}

async function sidecarExists(filePath, code = 'BACKUP_INVALID') {
  try {
    await lstat(filePath)
    return true
  } catch (error) {
    let descriptor
    try { descriptor = Object.getOwnPropertyDescriptor(error, 'code') } catch { invalid(code) }
    if (descriptor && Object.hasOwn(descriptor, 'value') && descriptor.value === 'ENOENT') return false
    invalid(code)
  }
}

async function rejectSqliteSidecars(filePath, code) {
  if (await sidecarExists(`${filePath}-wal`, code) || await sidecarExists(`${filePath}-shm`, code) || await sidecarExists(`${filePath}-journal`, code)) invalid(code)
}

function patientDatabaseClient(configuration) {
  return withBusyTimeout(createClient(configuration), BUSY_TIMEOUT_MS)
}

/**
 * The database runs in WAL mode and libsql leaves `-wal`/`-shm` next to the private alias on
 * close, so the CLI checkpoints first; the binding cleanup then removes only an empty WAL and
 * keeps failing closed on anything else.
 */
async function closeCheckpointed(client) {
  try { await client.execute('PRAGMA wal_checkpoint(TRUNCATE)') } catch { /* a non-SQLite file has no WAL to checkpoint */ }
  await client.close()
}

async function removeEmptySidecars(alias) {
  const wal = await lstat(`${alias}-wal`).catch(() => undefined)
  if (wal?.isFile() && wal.size === 0) await unlink(`${alias}-wal`)
  const shm = await lstat(`${alias}-shm`).catch(() => undefined)
  if (shm?.isFile() && !(await lstat(`${alias}-wal`).catch(() => undefined))) await unlink(`${alias}-shm`)
}

async function consistentBackup(backup, handle, createDatabaseClient) {
  await reauthorized(backup, 'BACKUP_INVALID')
  await rejectSqliteSidecars(backup.canonicalPath, 'BACKUP_INVALID')
  let binding
  let client
  let failure = null
  try {
    binding = await boundDatabase(handle, backup, 'BACKUP_INVALID')
    client = createDatabaseClient({ url: pathToFileURL(binding.alias).href })
    const result = await client.execute('PRAGMA integrity_check')
    if (!Array.isArray(result.rows) || result.rows.length !== 1 || result.rows[0].integrity_check !== 'ok') invalid('BACKUP_INVALID')
  } catch (error) {
    failure = SAFE_ERRORS.has(error) ? error : new ClinicImportCliError('BACKUP_INVALID')
  }
  try { if (client) await closeCheckpointed(client) } catch { failure = new ClinicImportCliError('BACKUP_INVALID') }
  if (failure === null) try {
    await retainedBinding(binding, handle, backup, 'BACKUP_INVALID')
    await reauthorized(backup, 'BACKUP_INVALID')
    await rejectSqliteSidecars(backup.canonicalPath, 'BACKUP_INVALID')
  } catch (error) {
    failure = SAFE_ERRORS.has(error) ? error : new ClinicImportCliError('BACKUP_INVALID')
  }
  try { await cleanupBinding(binding) } catch { failure = new ClinicImportCliError('CLI_FAILED') }
  if (failure !== null) throw failure
}

async function guardedTransaction(client, mode, verify) {
  const transaction = await client.transaction(mode)
  try {
    await verify()
    return transaction
  } catch (error) {
    let cleanupFailed = false
    try { await transaction.rollback() } catch { cleanupFailed = true }
    try { await transaction.close() } catch { cleanupFailed = true }
    if (cleanupFailed) invalid('CLI_FAILED')
    throw error
  }
}

function guardedClient(client, verify) {
  return Object.freeze({ execute: (...values) => client.execute(...values), transaction: (mode) => guardedTransaction(client, mode, verify) })
}

function sameDigest(first, second) {
  return first.byteSize === second.byteSize && first.sha256 === second.sha256
}

async function closeHandles(handles) {
  let failed = false
  for (const handle of handles) try { await handle?.close() } catch { failed = true }
  if (failed) invalid('CLI_FAILED')
}

async function dryRun(argumentsValue, environment, dependencies) {
  const allowed = new Set([...Object.keys(SOURCE_FLAGS), '--database', '--stage', '--dry-run'])
  if (Object.hasOwn(argumentsValue, '--apply') || Reflect.ownKeys(argumentsValue).some((key) => !allowed.has(key))) invalid()
  const databasePath = absolutePath(argumentsValue['--database'])
  const stagePath = absolutePath(argumentsValue['--stage'])
  const sources = sourcePaths(argumentsValue)
  if (inside(resolve(dependencies.repositoryPath), resolve(stagePath))) invalid()
  await regularFile(databasePath)
  await Promise.all(Object.values(sources).map((sourcePath) => regularFile(sourcePath)))
  const bundle = await dependencies.createBundle({ sourcePaths: sources, fingerprintKey: environment.fingerprintKey })
  const written = await dependencies.writeStage({ bundle, stagePath, databasePath, repositoryPath: dependencies.repositoryPath, encryptionKey: environment.encryptionKey })
  const result = printedDryRun(written)
  dependencies.output(JSON.stringify(result))
  return result
}

async function applied(argumentsValue, environment, dependencies) {
  const allowed = new Set(['--apply', '--database', '--stage', '--manifest', '--backup', '--confirm-production'])
  if (Object.hasOwn(argumentsValue, '--dry-run') || Reflect.ownKeys(argumentsValue).some((key) => !allowed.has(key)) || !Object.hasOwn(argumentsValue, '--manifest') || !Object.hasOwn(argumentsValue, '--backup')) invalid()
  const databasePath = absolutePath(argumentsValue['--database'])
  const stagePath = absolutePath(argumentsValue['--stage'])
  const backupPath = absolutePath(argumentsValue['--backup'])
  const expectedManifestHash = hash(argumentsValue['--manifest'])
  const normalizedDatabasePath = resolve(databasePath)
  if (normalizedDatabasePath === '/data/db.sqlite' && argumentsValue['--confirm-production'] !== '/data/db.sqlite') invalid('PRODUCTION_CONFIRMATION_REQUIRED')
  if (Object.hasOwn(argumentsValue, '--confirm-production') && resolve(argumentsValue['--confirm-production']) !== normalizedDatabasePath) invalid('PRODUCTION_CONFIRMATION_REQUIRED')
  const [databaseIdentity, stageIdentity, backupIdentity] = await Promise.all([regularFile(databasePath), regularFile(stagePath), regularFile(backupPath, 'BACKUP_INVALID')])
  if (await productionIdentity(databaseIdentity) && argumentsValue['--confirm-production'] !== '/data/db.sqlite') invalid('PRODUCTION_CONFIRMATION_REQUIRED')
  if (sameFile(databaseIdentity, backupIdentity)) invalid('BACKUP_INVALID')
  if (inside(await realpath(dependencies.repositoryPath), stageIdentity.canonicalPath)) invalid()
  const metadata = await stageMetadata(stageIdentity, dependencies.fileSystem)
  if (metadata.manifestHash !== expectedManifestHash) invalid('MANIFEST_MISMATCH')
  await rejectSqliteSidecars(databaseIdentity.canonicalPath, 'CLI_FILE_INVALID')
  let databaseHandle
  let backupHandle
  let binding
  let client
  let result
  let databaseDigest
  let backupDigest
  let failure = null
  try {
    databaseHandle = await authorizedHandle(databaseIdentity, 'CLI_FILE_INVALID', true)
    backupHandle = await authorizedHandle(backupIdentity, 'BACKUP_INVALID')
    await consistentBackup(backupIdentity, backupHandle, dependencies.createDatabaseClient)
    const digests = await Promise.all([fileDigest(databaseHandle, databaseIdentity, 'CLI_FILE_INVALID'), fileDigest(backupHandle, backupIdentity, 'BACKUP_INVALID')])
    databaseDigest = digests[0]
    backupDigest = digests[1]
    if (!sameDigest(databaseDigest, backupDigest)) invalid('BACKUP_INVALID')
    if (sameFile(databaseIdentity, backupIdentity)) invalid('BACKUP_INVALID')
    binding = await boundDatabase(databaseHandle, databaseIdentity)
    client = dependencies.createDatabaseClient({ url: pathToFileURL(binding.alias).href })
    await client.execute('PRAGMA schema_version')
    const verify = async () => {
      await retainedBinding(binding, databaseHandle, databaseIdentity)
      const [currentDatabaseDigest, currentBackupDigest] = await Promise.all([fileDigest(databaseHandle, databaseIdentity, 'CLI_FILE_INVALID'), fileDigest(backupHandle, backupIdentity, 'BACKUP_INVALID')])
      if (!sameDigest(currentDatabaseDigest, databaseDigest) || !sameDigest(currentBackupDigest, backupDigest) || !sameDigest(currentDatabaseDigest, currentBackupDigest)) invalid('BACKUP_INVALID')
      await rejectSqliteSidecars(databaseIdentity.canonicalPath, 'CLI_FILE_INVALID')
      await rejectSqliteSidecars(backupIdentity.canonicalPath, 'BACKUP_INVALID')
    }
    result = await dependencies.applyStage({ client: guardedClient(client, verify), stagePath: stageIdentity.canonicalPath, repositoryPath: dependencies.repositoryPath, encryptionKey: environment.encryptionKey, fingerprintKey: environment.fingerprintKey, expectedManifestHash, expectedPlanHash: metadata.planHash })
    const integrity = await client.execute('PRAGMA integrity_check')
    if (!Array.isArray(integrity.rows) || integrity.rows.length !== 1 || integrity.rows[0].integrity_check !== 'ok') invalid('TARGET_INTEGRITY_FAILED')
  } catch (error) {
    failure = SAFE_ERRORS.has(error) ? error : new ClinicImportCliError('CLI_FAILED')
  }
  try { if (client) await closeCheckpointed(client) } catch { failure = new ClinicImportCliError('CLI_FAILED') }
  if (failure === null) try {
    await retainedBinding(binding, databaseHandle, databaseIdentity)
    await retainedIdentity(databaseHandle, databaseIdentity, 'CLI_FILE_INVALID', false)
    const currentBackupDigest = await fileDigest(backupHandle, backupIdentity, 'BACKUP_INVALID')
    if (!sameDigest(currentBackupDigest, backupDigest)) invalid('BACKUP_INVALID')
    await rejectSqliteSidecars(databaseIdentity.canonicalPath, 'CLI_FILE_INVALID')
    await rejectSqliteSidecars(backupIdentity.canonicalPath, 'BACKUP_INVALID')
  } catch (error) {
    failure = SAFE_ERRORS.has(error) ? error : new ClinicImportCliError('CLI_FAILED')
  }
  try { await cleanupBinding(binding) } catch { failure = new ClinicImportCliError('CLI_FAILED') }
  try { await closeHandles([databaseHandle, backupHandle]) } catch { failure = new ClinicImportCliError('CLI_FAILED') }
  if (failure !== null) throw failure
  const printed = printedApply(result, expectedManifestHash, metadata.planHash)
  dependencies.output(JSON.stringify(printed))
  return printed
}

/** Runs the local clinic history import command in dry-run or explicit apply mode. */
export async function runClinicImportCommand(argv, environmentValue = process.env, dependencyValue) {
  try {
    const argumentsValue = parsedArguments(argv)
    const environment = environmentFrom(environmentValue)
    const dependencies = dependenciesFrom(dependencyValue)
    return Object.hasOwn(argumentsValue, '--apply') ? await applied(argumentsValue, environment, dependencies) : await dryRun(argumentsValue, environment, dependencies)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    throw new ClinicImportCliError('CLI_FAILED')
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runClinicImportCommand(process.argv.slice(2)).catch((error) => {
    const code = SAFE_ERRORS.has(error) ? error.code : 'CLI_FAILED'
    console.error(JSON.stringify({ status: 'failed', code }))
    process.exitCode = 1
  })
}
