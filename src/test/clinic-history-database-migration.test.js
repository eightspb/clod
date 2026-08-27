import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const ASTRO_HISTORY_SCHEMA_SCRIPT = `
import { pathToFileURL } from 'node:url'
import { resolveDbConfig } from './node_modules/@astrojs/db/dist/core/load-file.js'
import { getCreateIndexQueries, getCreateTableQuery } from './node_modules/@astrojs/db/dist/core/queries.js'
const { dbConfig } = await resolveDbConfig({ root: pathToFileURL(process.cwd() + '/'), integrations: [] })
const names = ['Patient', 'PatientExternalIdentifier', 'PatientContact', 'PatientNameHistory', 'PatientPrivateData', 'PatientConsent', 'PatientAttachment', 'ImportBatch', 'ImportSourceRow', 'ImportIssue', 'HistoricalVisit', 'HistoricalVisitCandidate', 'HistoricalInvoice']
const queries = names.flatMap((name) => [getCreateTableQuery(name, dbConfig.tables[name]), ...getCreateIndexQueries(name, dbConfig.tables[name])])
process.stdout.write(JSON.stringify(queries))
`
const HISTORY_TABLES = Object.freeze([
  'HistoricalInvoice',
  'HistoricalVisit',
  'HistoricalVisitCandidate',
  'ImportBatch',
  'ImportIssue',
  'ImportSourceRow',
  'PatientAttachment',
  'PatientConsent',
  'PatientContact',
  'PatientExternalIdentifier',
  'PatientNameHistory',
  'PatientPrivateData',
])
const HISTORY_SCHEMA_TABLES = Object.freeze(['Patient', ...HISTORY_TABLES])
const LEGACY_PATIENT_TABLE = `CREATE TABLE Patient (
  id TEXT PRIMARY KEY,
  profileCiphertext TEXT,
  phoneMask TEXT,
  phoneFingerprint TEXT,
  firstSeenAt TEXT NOT NULL,
  lastSeenAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  piiDestroyedAt TEXT
)`
const LEGACY_PATIENT_INDEXES = Object.freeze([
  'CREATE UNIQUE INDEX Patient_phoneFingerprint_unique ON Patient(phoneFingerprint)',
  'CREATE INDEX Patient_lastSeenAt_idx ON Patient(lastSeenAt)',
])
const PREVIOUS_PATIENT_INDEXES = Object.freeze([
  'CREATE INDEX Patient_phoneFingerprint_idx ON Patient(phoneFingerprint)',
  'CREATE INDEX Patient_lastSeenAt_idx ON Patient(lastSeenAt)',
])
const LEGACY_PATIENT_ID = 'f50b5ea7-8791-4be8-92f4-30c177fdadd7'
const SECOND_PATIENT_ID = '477f18dd-d87e-41d7-b7cf-d558a8448be8'
const SHARED_FINGERPRINT = `v1:${'6d'.repeat(32)}`
const IMPORT_BATCH_ID = '941f7dd8-af5a-45ce-bf2a-280b13f3e019'
const EXTERNAL_IDENTIFIER_ID = '80ed5f86-e701-4367-8ae0-387aad54764a'

async function databasePath(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  return join(directory, 'content.sqlite')
}

function open(databasePathname) {
  return createClient({ url: `file:${databasePathname}` })
}

async function migrate(databasePathname) {
  return executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${databasePathname}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
}

async function migrationFails(databasePathname) {
  try {
    await migrate(databasePathname)
    return false
  } catch {
    return true
  }
}

async function createLegacyPatient(client) {
  await client.execute(LEGACY_PATIENT_TABLE)
  for (const statement of LEGACY_PATIENT_INDEXES) await client.execute(statement)
}

async function insertLegacyPatient(client) {
  return client.execute({
    sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [LEGACY_PATIENT_ID, 'protected-profile', '***-18-27', SHARED_FINGERPRINT, '2024-02-29T10:00:00.000Z', '2026-08-27T10:00:00.000Z', '2024-02-29T10:00:00.000Z', '2026-08-27T10:00:00.000Z', null],
  })
}

async function createAstroHistorySchema(client) {
  const { stdout } = await executeFile(process.execPath, ['--input-type=module', '--eval', ASTRO_HISTORY_SCHEMA_SCRIPT], { cwd: PROJECT_ROOT, timeout: 10_000, maxBuffer: 1_000_000 })
  for (const statement of JSON.parse(stdout)) await client.execute(statement)
}

async function schemaObjects(client) {
  const result = await client.execute("SELECT type, name, tbl_name AS tableName, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
  return result.rows
}

async function rejects(operation) {
  try {
    await operation()
    return false
  } catch {
    return true
  }
}

describe('clinic history production migration', () => {
  it('creates every normalized history and import table', async () => {
    const databasePathname = await databasePath('clod-history-tables-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('PatientExternalIdentifier', 'PatientContact', 'PatientNameHistory', 'PatientPrivateData', 'PatientConsent', 'PatientAttachment', 'ImportBatch', 'ImportSourceRow', 'ImportIssue', 'HistoricalVisit', 'HistoricalVisitCandidate', 'HistoricalInvoice') ORDER BY name")
    client.close()
    expect(result.rows.map(({ name }) => name)).toEqual(HISTORY_TABLES)
  })

  it('accepts the exact history schema generated from db/config.ts', async () => {
    const databasePathname = await databasePath('clod-history-astro-')
    const client = open(databasePathname)
    await createAstroHistorySchema(client)
    const before = await schemaObjects(client)
    client.close()
    await migrate(databasePathname)
    await migrate(databasePathname)
    const verified = open(databasePathname)
    const after = await schemaObjects(verified)
    verified.close()
    expect(after.filter(({ tableName }) => HISTORY_SCHEMA_TABLES.includes(tableName))).toEqual(before)
  })

  it('replaces legacy phone uniqueness and preserves populated patients on repeated migration', async () => {
    const databasePathname = await databasePath('clod-history-patient-index-')
    const legacy = open(databasePathname)
    await createLegacyPatient(legacy)
    await insertLegacyPatient(legacy)
    legacy.close()
    await migrate(databasePathname)
    const target = open(databasePathname)
    await target.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [SECOND_PATIENT_ID, 'another-profile', '***-18-27', SHARED_FINGERPRINT, '2025-01-05T10:00:00.000Z', '2026-08-27T11:00:00.000Z', '2025-01-05T10:00:00.000Z', '2026-08-27T11:00:00.000Z', null] })
    target.close()
    await migrate(databasePathname)
    const verified = open(databasePathname)
    const indexes = await verified.execute("PRAGMA index_list('Patient')")
    const patients = await verified.execute('SELECT id FROM Patient ORDER BY id')
    verified.close()
    expect({ indexes: indexes.rows.map(({ name, unique }) => ({ name, unique })).sort((first, second) => first.name.localeCompare(second.name)), patients: patients.rows.map(({ id }) => id) }).toEqual({ indexes: [{ name: 'Patient_lastSeenAt_idx', unique: 0 }, { name: 'Patient_phoneFingerprint_idx', unique: 0 }, { name: 'sqlite_autoindex_Patient_1', unique: 1 }], patients: [SECOND_PATIENT_ID, LEGACY_PATIENT_ID] })
  })

  it('upgrades the previous nonunique patient schema without losing rows', async () => {
    const databasePathname = await databasePath('clod-history-patient-nullable-')
    const client = open(databasePathname)
    await client.execute(LEGACY_PATIENT_TABLE)
    for (const statement of PREVIOUS_PATIENT_INDEXES) await client.execute(statement)
    await insertLegacyPatient(client)
    client.close()
    await migrate(databasePathname)
    const verified = open(databasePathname)
    const columns = await verified.execute("PRAGMA table_info('Patient')")
    const patients = await verified.execute('SELECT id, firstSeenAt, lastSeenAt FROM Patient')
    verified.close()
    expect({ datesNullable: columns.rows.filter(({ name }) => ['firstSeenAt', 'lastSeenAt'].includes(name)).map(({ notnull }) => notnull), patients: patients.rows }).toEqual({ datesNullable: [0, 0], patients: [{ id: LEGACY_PATIENT_ID, firstSeenAt: '2024-02-29T10:00:00.000Z', lastSeenAt: '2026-08-27T10:00:00.000Z' }] })
  })

  it('fails closed before rebuilding a patient table referenced by an external view', async () => {
    const databasePathname = await databasePath('clod-history-patient-view-')
    const client = open(databasePathname)
    await createLegacyPatient(client)
    await insertLegacyPatient(client)
    await client.execute('CREATE VIEW ActivePatient AS SELECT id FROM Patient WHERE piiDestroyedAt IS NULL')
    client.close()
    const failed = await migrationFails(databasePathname)
    const verified = open(databasePathname)
    const view = await verified.execute("SELECT name FROM sqlite_master WHERE type = 'view' AND name = 'ActivePatient'")
    const patients = await verified.execute('SELECT id FROM Patient')
    verified.close()
    expect({ failed, views: view.rows, patients: patients.rows }).toEqual({ failed: true, views: [{ name: 'ActivePatient' }], patients: [{ id: LEGACY_PATIENT_ID }] })
  })

  it('rejects a nullable patient table carrying the obsolete unique index', async () => {
    const databasePathname = await databasePath('clod-history-patient-mixed-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    await client.execute('DROP INDEX Patient_phoneFingerprint_idx')
    await client.execute('CREATE UNIQUE INDEX Patient_phoneFingerprint_unique ON Patient(phoneFingerprint)')
    client.close()
    const failed = await migrationFails(databasePathname)
    const verified = open(databasePathname)
    const indexes = await verified.execute("PRAGMA index_list('Patient')")
    verified.close()
    expect({ failed, unique: indexes.rows.find(({ name }) => name === 'Patient_phoneFingerprint_unique')?.unique }).toEqual({ failed: true, unique: 1 })
  })

  it('keeps source coordinates unique inside one import batch', async () => {
    const databasePathname = await databasePath('clod-history-source-unique-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    await client.execute({ sql: 'INSERT INTO ImportBatch (id, manifestHash, planHash, mode, status, controlTotals, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [IMPORT_BATCH_ID, 'sha256:manifest-A', 'sha256:plan-A', 'apply', 'applying', '{}', '2026-08-27T12:00:00.000Z', null] })
    await client.execute({ sql: 'INSERT INTO ImportSourceRow (id, batchId, sourceName, sourceRow, patientId, historicalVisitId, payloadCiphertext, payloadHash, createdAt, piiDestroyedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['b10f870a-f524-43e7-8109-ecc455468b5e', IMPORT_BATCH_ID, 'PD.csv', 814, null, null, 'protected-row', 'sha256:row-A', '2026-08-27T12:01:00.000Z', null] })
    const duplicate = await rejects(() => client.execute({ sql: 'INSERT INTO ImportSourceRow (id, batchId, sourceName, sourceRow, patientId, historicalVisitId, payloadCiphertext, payloadHash, createdAt, piiDestroyedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['29db14b5-8b41-4e3e-8f50-bdb3a215fbcd', IMPORT_BATCH_ID, 'PD.csv', 814, null, null, 'other-protected-row', 'sha256:row-B', '2026-08-27T12:02:00.000Z', null] }))
    client.close()
    expect(duplicate).toBe(true)
  })

  it('keeps globally addressable external identifier fingerprints unique', async () => {
    const databasePathname = await databasePath('clod-history-ehr-unique-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    const now = '2026-08-27T12:00:00.000Z'
    await client.execute({ sql: 'INSERT INTO PatientExternalIdentifier (id, patientId, system, ciphertext, fingerprint, globalFingerprint, identityKey, sourceName, sourceRow, isPrimary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [EXTERNAL_IDENTIFIER_ID, LEGACY_PATIENT_ID, 'medesk_ehr', 'protected-ehr-A', 'hmac:ehr-A', 'hmac:global-A', 'medesk_ehr:hmac:ehr-A', 'PD.csv', 17, true, now, now] })
    const duplicate = await rejects(() => client.execute({ sql: 'INSERT INTO PatientExternalIdentifier (id, patientId, system, ciphertext, fingerprint, globalFingerprint, identityKey, sourceName, sourceRow, isPrimary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['2b871ceb-70ce-4a2a-8550-1cc4ad4bc7a6', SECOND_PATIENT_ID, 'medesk_ehr', 'protected-ehr-B', 'hmac:ehr-B', 'hmac:global-A', 'medesk_ehr:hmac:ehr-B', 'PD.csv', 29, true, now, now] }))
    client.close()
    expect(duplicate).toBe(true)
  })

  it('declares the exact nullable global fingerprint uniqueness contract', async () => {
    const databasePathname = await databasePath('clod-history-global-fingerprint-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    const columns = await client.execute("PRAGMA table_info('PatientExternalIdentifier')")
    const indexes = await client.execute("PRAGMA index_list('PatientExternalIdentifier')")
    client.close()
    const globalFingerprint = columns.rows.find(({ name }) => name === 'globalFingerprint')
    const index = indexes.rows.find(({ name }) => name === 'PatientExternalIdentifier_globalFingerprint_unique')
    expect({ nullable: globalFingerprint?.notnull, unique: index?.unique }).toEqual({ nullable: 0, unique: 1 })
  })

  it('allows the same clinic-card fingerprint for different patients', async () => {
    const databasePathname = await databasePath('clod-history-card-shared-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    const now = '2026-08-27T12:00:00.000Z'
    await client.execute({ sql: 'INSERT INTO PatientExternalIdentifier VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [EXTERNAL_IDENTIFIER_ID, LEGACY_PATIENT_ID, 'clinic_card', 'protected-card-A', 'hmac:shared-card', null, 'clinic_card:hmac:shared-card', 'PD.csv', 41, true, now, now] })
    await client.execute({ sql: 'INSERT INTO PatientExternalIdentifier VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['4bda1a50-1ac6-4dbd-b313-a4c46eef5541', SECOND_PATIENT_ID, 'clinic_card', 'protected-card-B', 'hmac:shared-card', null, 'clinic_card:hmac:shared-card', 'PD.csv', 73, true, now, now] })
    const result = await client.execute({ sql: 'SELECT id FROM PatientExternalIdentifier WHERE fingerprint = ?', args: ['hmac:shared-card'] })
    client.close()
    expect(result.rows.length).toBe(2)
  })

  it('preserves unknown observation dates as null', async () => {
    const databasePathname = await databasePath('clod-history-consent-date-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    const now = '2026-08-27T12:00:00.000Z'
    await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [SECOND_PATIENT_ID, 'protected-profile', null, null, null, null, now, now, null] })
    await client.execute({ sql: 'INSERT INTO PatientContact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['e215e04b-1441-4785-b66e-99429200fa40', SECOND_PATIENT_ID, 'email', 'protected-contact', 'hmac:email', 's•••@example.test', true, 'medesk.csv', null, null, null] })
    await client.execute({ sql: 'INSERT INTO PatientConsent VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: ['d99a8e25-26ab-4bca-aabe-85952ed4001f', LEGACY_PATIENT_ID, 'sms_notifications', 'not_granted', 'medesk.csv', null, now, now] })
    await client.execute({ sql: 'INSERT INTO PatientNameHistory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['74db6a11-1b0a-4974-b6ec-0ef11921b016', LEGACY_PATIENT_ID, 'protected-name', 'hmac:name', 'medesk.csv', null, null, 'source_correction', null] })
    const consent = await client.execute('SELECT observedAt FROM PatientConsent')
    const name = await client.execute('SELECT observedAt FROM PatientNameHistory')
    const patient = await client.execute({ sql: 'SELECT firstSeenAt, lastSeenAt FROM Patient WHERE id = ?', args: [SECOND_PATIENT_ID] })
    const contact = await client.execute('SELECT firstSeenAt, lastSeenAt FROM PatientContact')
    client.close()
    expect({ consent: consent.rows, name: name.rows, patient: patient.rows, contact: contact.rows }).toEqual({ consent: [{ observedAt: null }], name: [{ observedAt: null }], patient: [{ firstSeenAt: null, lastSeenAt: null }], contact: [{ firstSeenAt: null, lastSeenAt: null }] })
  })

  it('deduplicates an external identity only within its patient', async () => {
    const databasePathname = await databasePath('clod-history-identity-unique-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    const now = '2026-08-27T12:00:00.000Z'
    await client.execute({ sql: 'INSERT INTO PatientExternalIdentifier VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [EXTERNAL_IDENTIFIER_ID, LEGACY_PATIENT_ID, 'clinic_card', 'protected-card-A', 'hmac:card-A', null, 'clinic_card:hmac:card-A', 'PD.csv', 101, true, now, now] })
    const duplicate = await rejects(() => client.execute({ sql: 'INSERT INTO PatientExternalIdentifier VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['a4626455-69cd-4e6a-81ab-ce0a2c73c44a', LEGACY_PATIENT_ID, 'clinic_card', 'other-protected-card', 'hmac:card-B', null, 'clinic_card:hmac:card-A', 'PD.csv', 102, false, now, now] }))
    client.close()
    expect(duplicate).toBe(true)
  })

  it('preserves populated patient child rows across repeated migration', async () => {
    const databasePathname = await databasePath('clod-history-child-preservation-')
    await migrate(databasePathname)
    const client = open(databasePathname)
    await client.execute({ sql: 'INSERT INTO PatientContact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['e5642652-da57-45f0-a590-a193a70ffb99', LEGACY_PATIENT_ID, 'phone', 'protected-contact', 'hmac:contact-A', '***-47-19', true, 'PD.csv', '2023-05-17T09:00:00.000Z', '2026-08-27T12:00:00.000Z', null] })
    await client.execute({ sql: 'INSERT INTO PatientNameHistory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['2a5873cd-c5c0-4321-9674-69642cdf6d6c', LEGACY_PATIENT_ID, 'protected-surname', 'hmac:surname-A', 'PD.csv', 'protected-source-id', '2025-11-06T08:30:00.000Z', 'surname_change', null] })
    await client.execute({ sql: 'INSERT INTO PatientPrivateData VALUES (?, ?, ?, ?, ?, ?)', args: ['ed767daa-77d0-4147-b65e-f05631aed18b', LEGACY_PATIENT_ID, 'protected-private-profile', '2026-08-27T12:00:00.000Z', '2026-08-27T12:00:00.000Z', null] })
    client.close()
    await migrate(databasePathname)
    const verified = open(databasePathname)
    const contacts = await verified.execute('SELECT ciphertext FROM PatientContact')
    const names = await verified.execute('SELECT lastNameCiphertext FROM PatientNameHistory')
    const privateData = await verified.execute('SELECT profileCiphertext FROM PatientPrivateData')
    verified.close()
    expect({ contact: contacts.rows[0]?.ciphertext, name: names.rows[0]?.lastNameCiphertext, privateData: privateData.rows[0]?.profileCiphertext }).toEqual({ contact: 'protected-contact', name: 'protected-surname', privateData: 'protected-private-profile' })
  })

  it.each([
    ['wrong columns', ['CREATE UNIQUE INDEX Patient_phoneFingerprint_unique ON Patient(lastSeenAt)', LEGACY_PATIENT_INDEXES[1]]],
    ['non-binary collation', ['CREATE UNIQUE INDEX Patient_phoneFingerprint_unique ON Patient(phoneFingerprint COLLATE NOCASE)', LEGACY_PATIENT_INDEXES[1]]],
    ['descending order', ['CREATE UNIQUE INDEX Patient_phoneFingerprint_unique ON Patient(phoneFingerprint DESC)', LEGACY_PATIENT_INDEXES[1]]],
    ['partial predicate', ["CREATE UNIQUE INDEX Patient_phoneFingerprint_unique ON Patient(phoneFingerprint) WHERE phoneFingerprint != ''", LEGACY_PATIENT_INDEXES[1]]],
    ['duplicate equivalent indexes', [...LEGACY_PATIENT_INDEXES, 'CREATE UNIQUE INDEX Patient_phoneFingerprint_duplicate ON Patient(phoneFingerprint)']],
    ['rogue Patient index', [...LEGACY_PATIENT_INDEXES, 'CREATE INDEX Patient_createdAt_rogue_idx ON Patient(createdAt)']],
    ['wrong target columns', ['CREATE INDEX Patient_phoneFingerprint_idx ON Patient(lastSeenAt)', LEGACY_PATIENT_INDEXES[1]]],
  ])('fails closed before mutation for legacy Patient indexes with %s', async (_scenario, indexStatements) => {
    const databasePathname = await databasePath('clod-history-preflight-')
    const client = open(databasePathname)
    await client.execute(LEGACY_PATIENT_TABLE)
    for (const statement of indexStatements) await client.execute(statement)
    await insertLegacyPatient(client)
    const before = await schemaObjects(client)
    client.close()
    const failed = await migrationFails(databasePathname)
    const verified = open(databasePathname)
    const after = await schemaObjects(verified)
    verified.close()
    expect({ failed, after }).toEqual({ failed: true, after: before })
  })

  it('rolls back every additive change when an existing history table violates the final invariant', async () => {
    const databasePathname = await databasePath('clod-history-final-invariant-')
    const client = open(databasePathname)
    await client.execute('CREATE TABLE ImportBatch (id TEXT PRIMARY KEY)')
    const before = await schemaObjects(client)
    client.close()
    const failed = await migrationFails(databasePathname)
    const verified = open(databasePathname)
    const after = await schemaObjects(verified)
    verified.close()
    expect({ failed, after }).toEqual({ failed: true, after: before })
  })

  it('rolls back legacy phone-index replacement when a later history invariant fails', async () => {
    const databasePathname = await databasePath('clod-history-index-rollback-')
    const client = open(databasePathname)
    await createLegacyPatient(client)
    await insertLegacyPatient(client)
    await client.execute('CREATE TABLE HistoricalVisit (id TEXT PRIMARY KEY)')
    const before = await schemaObjects(client)
    client.close()
    const failed = await migrationFails(databasePathname)
    const verified = open(databasePathname)
    const after = await schemaObjects(verified)
    verified.close()
    expect({ failed, after }).toEqual({ failed: true, after: before })
  })
})
