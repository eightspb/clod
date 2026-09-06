import { execFile } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { astroGeneratedSchemaFor } from './fixtures/astro-db-generated-schema.mjs'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const ENTRYPOINT_SCRIPT = join(PROJECT_ROOT, 'docker-entrypoint.sh')
const SENTINEL_ID = 'legacy-doctor-Ω'
const FIRST_INTENT_ID = '148b0a0d-a98d-4762-8313-24075bd9da1a'
const SECOND_INTENT_ID = 'cc0be2bb-4cb4-45df-8e3d-09820302a580'
const FIRST_FINGERPRINT = `v1:${'a1'.repeat(32)}`
const SECOND_FINGERPRINT = `v1:${'b2'.repeat(32)}`
const THIRD_FINGERPRINT = `v1:${'c3'.repeat(32)}`
const FIRST_FENCE = '8120f747-1157-48d1-89fd-1c741439f913'
const SECOND_FENCE = '0319d642-d90b-4d0c-9c72-cde506139631'
const CLAIM_ID = '07b33fb9-1ddc-4312-ac48-c44215753698'
const OTHER_CLAIM_ID = 'e1116436-0b89-4c5e-956a-872ed0d61624'
const BOOKING_TABLE_SQL = `CREATE TABLE BookingIntent (
  id TEXT PRIMARY KEY,
  requestFingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  fencingToken TEXT,
  doctorSlug TEXT NOT NULL,
  appointmentType TEXT NOT NULL,
  doctorId INTEGER NOT NULL,
  lpuId INTEGER NOT NULL,
  specialityId INTEGER NOT NULL,
  startsAt TEXT NOT NULL,
  endsAt TEXT NOT NULL,
  price INTEGER NOT NULL,
  medflexClaimId TEXT,
  failureCode TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  pendingUntil TEXT NOT NULL
)`
const BOOKING_INDEX_SQL = Object.freeze([
  'CREATE UNIQUE INDEX BookingIntent_requestFingerprint_unique ON BookingIntent(requestFingerprint)',
  'CREATE UNIQUE INDEX BookingIntent_medflexClaimId_unique ON BookingIntent(medflexClaimId)',
  'CREATE UNIQUE INDEX BookingIntent_fencingToken_unique ON BookingIntent(fencingToken)',
  'CREATE INDEX BookingIntent_status_pendingUntil_idx ON BookingIntent(status, pendingUntil)',
  'CREATE INDEX BookingIntent_resumeScope_idx ON BookingIntent(doctorSlug, appointmentType, startsAt, endsAt)',
])
const EXPECTED_COLUMNS = Object.freeze([
  ['id', 'TEXT', 0, 1],
  ['requestFingerprint', 'TEXT', 1, 0],
  ['status', 'TEXT', 1, 0],
  ['fencingToken', 'TEXT', 0, 0],
  ['doctorSlug', 'TEXT', 1, 0],
  ['appointmentType', 'TEXT', 1, 0],
  ['doctorId', 'INTEGER', 1, 0],
  ['lpuId', 'INTEGER', 1, 0],
  ['specialityId', 'INTEGER', 1, 0],
  ['startsAt', 'TEXT', 1, 0],
  ['endsAt', 'TEXT', 1, 0],
  ['price', 'INTEGER', 1, 0],
  ['medflexClaimId', 'TEXT', 0, 0],
  ['failureCode', 'TEXT', 0, 0],
  ['createdAt', 'TEXT', 1, 0],
  ['updatedAt', 'TEXT', 1, 0],
  ['pendingUntil', 'TEXT', 1, 0],
])
const EXPECTED_INDEXES = Object.freeze({
  sqlite_autoindex_BookingIntent_1: Object.freeze({ unique: 1, origin: 'pk', partial: 0, columns: Object.freeze(['id']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
  BookingIntent_requestFingerprint_unique: Object.freeze({ unique: 1, origin: 'c', partial: 0, columns: Object.freeze(['requestFingerprint']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
  BookingIntent_medflexClaimId_unique: Object.freeze({ unique: 1, origin: 'c', partial: 0, columns: Object.freeze(['medflexClaimId']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
  BookingIntent_fencingToken_unique: Object.freeze({ unique: 1, origin: 'c', partial: 0, columns: Object.freeze(['fencingToken']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
  BookingIntent_status_pendingUntil_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['status', 'pendingUntil']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
  BookingIntent_resumeScope_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['doctorSlug', 'appointmentType', 'startsAt', 'endsAt']), collations: Object.freeze(['BINARY', 'BINARY', 'BINARY', 'BINARY']), descending: Object.freeze([0, 0, 0, 0]) }),
})
const EXPECTED_CLINIC_SCHEMA = Object.freeze({
  Patient: Object.freeze({
    columns: Object.freeze([
      ['id', 'TEXT', 0, 1],
      ['profileCiphertext', 'TEXT', 0, 0],
      ['phoneMask', 'TEXT', 0, 0],
      ['phoneFingerprint', 'TEXT', 0, 0],
      ['firstSeenAt', 'TEXT', 0, 0],
      ['lastSeenAt', 'TEXT', 0, 0],
      ['createdAt', 'TEXT', 1, 0],
      ['updatedAt', 'TEXT', 1, 0],
      ['piiDestroyedAt', 'TEXT', 0, 0],
    ]),
    indexes: Object.freeze({
      sqlite_autoindex_Patient_1: Object.freeze({ unique: 1, origin: 'pk', partial: 0, columns: Object.freeze(['id']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      Patient_phoneFingerprint_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['phoneFingerprint']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      Patient_lastSeenAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['lastSeenAt']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
    }),
  }),
  PatientAccess: Object.freeze({
    columns: Object.freeze([
      ['id', 'TEXT', 0, 1],
      ['patientId', 'TEXT', 1, 0],
      ['action', 'TEXT', 1, 0],
      ['actor', 'TEXT', 1, 0],
      ['createdAt', 'TEXT', 1, 0],
    ]),
    indexes: Object.freeze({
      sqlite_autoindex_PatientAccess_1: Object.freeze({ unique: 1, origin: 'pk', partial: 0, columns: Object.freeze(['id']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      PatientAccess_patientId_createdAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['patientId', 'createdAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
    }),
  }),
  Appointment: Object.freeze({
    columns: Object.freeze([
      ['id', 'TEXT', 0, 1],
      ['patientId', 'TEXT', 1, 0],
      ['source', 'TEXT', 1, 0],
      ['status', 'TEXT', 1, 0],
      ['medflexClaimId', 'TEXT', 0, 0],
      ['medflexLpuId', 'INTEGER', 0, 0],
      ['medflexDoctorId', 'INTEGER', 0, 0],
      ['medflexSpecialityId', 'INTEGER', 0, 0],
      ['medflexServiceId', 'INTEGER', 0, 0],
      ['doctorName', 'TEXT', 1, 0],
      ['specialityName', 'TEXT', 1, 0],
      ['serviceName', 'TEXT', 0, 0],
      ['startsAt', 'TEXT', 1, 0],
      ['endsAt', 'TEXT', 1, 0],
      ['priceKopecks', 'INTEGER', 0, 0],
      ['bookingFingerprint', 'TEXT', 1, 0],
      ['failureCode', 'TEXT', 0, 0],
      ['createdAt', 'TEXT', 1, 0],
      ['updatedAt', 'TEXT', 1, 0],
      ['cancelledAt', 'TEXT', 0, 0],
    ]),
    indexes: Object.freeze({
      sqlite_autoindex_Appointment_1: Object.freeze({ unique: 1, origin: 'pk', partial: 0, columns: Object.freeze(['id']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      Appointment_medflexClaimId_unique: Object.freeze({ unique: 1, origin: 'c', partial: 0, columns: Object.freeze(['medflexClaimId']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      Appointment_bookingFingerprint_active_unique: Object.freeze({ unique: 1, origin: 'c', partial: 1, columns: Object.freeze(['bookingFingerprint']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      Appointment_startsAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['startsAt']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      Appointment_patientId_startsAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['patientId', 'startsAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      Appointment_status_startsAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['status', 'startsAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      Appointment_medflexDoctorId_startsAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['medflexDoctorId', 'startsAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      Appointment_source_startsAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['source', 'startsAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
    }),
  }),
  MedflexDoctorLink: Object.freeze({
    columns: Object.freeze([
      ['medflexDoctorId', 'INTEGER', 0, 1],
      ['externalName', 'TEXT', 1, 0],
      ['localDoctorId', 'TEXT', 0, 0],
      ['active', 'INTEGER', 1, 0],
      ['syncedAt', 'TEXT', 1, 0],
    ]),
    indexes: Object.freeze({
      MedflexDoctorLink_localDoctorId_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['localDoctorId']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      MedflexDoctorLink_active_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['active']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
    }),
  }),
  MangoCall: Object.freeze({
    columns: Object.freeze([
      ['entryId', 'TEXT', 0, 1],
      ['patientId', 'TEXT', 0, 0],
      ['status', 'TEXT', 1, 0],
      ['callerCiphertext', 'TEXT', 0, 0],
      ['callerMask', 'TEXT', 0, 0],
      ['callerFingerprint', 'TEXT', 0, 0],
      ['repeatCaller', 'INTEGER', 0, 0],
      ['lineNumber', 'TEXT', 1, 0],
      ['operatorExtension', 'TEXT', 0, 0],
      ['startedAt', 'TEXT', 1, 0],
      ['forwardedAt', 'TEXT', 0, 0],
      ['answeredAt', 'TEXT', 0, 0],
      ['endedAt', 'TEXT', 0, 0],
      ['waitSeconds', 'INTEGER', 0, 0],
      ['talkSeconds', 'INTEGER', 0, 0],
      ['disconnectReason', 'TEXT', 0, 0],
      ['finalizedAt', 'TEXT', 0, 0],
      ['createdAt', 'TEXT', 1, 0],
      ['updatedAt', 'TEXT', 1, 0],
      ['piiDestroyedAt', 'TEXT', 0, 0],
    ]),
    indexes: Object.freeze({
      sqlite_autoindex_MangoCall_1: Object.freeze({ unique: 1, origin: 'pk', partial: 0, columns: Object.freeze(['entryId']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      MangoCall_startedAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['startedAt']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      MangoCall_status_startedAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['status', 'startedAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      MangoCall_patientId_startedAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['patientId', 'startedAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      MangoCall_callerFingerprint_startedAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['callerFingerprint', 'startedAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      MangoCall_lineNumber_startedAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['lineNumber', 'startedAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      MangoCall_operatorExtension_startedAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['operatorExtension', 'startedAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
    }),
  }),
  MangoCallLeg: Object.freeze({
    columns: Object.freeze([
      ['callId', 'TEXT', 0, 1],
      ['entryId', 'TEXT', 1, 0],
      ['maxSeq', 'INTEGER', 1, 0],
      ['state', 'TEXT', 1, 0],
      ['location', 'TEXT', 0, 0],
      ['extension', 'TEXT', 0, 0],
      ['eventAt', 'TEXT', 1, 0],
      ['createdAt', 'TEXT', 1, 0],
      ['updatedAt', 'TEXT', 1, 0],
    ]),
    indexes: Object.freeze({
      sqlite_autoindex_MangoCallLeg_1: Object.freeze({ unique: 1, origin: 'pk', partial: 0, columns: Object.freeze(['callId']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      MangoCallLeg_entryId_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['entryId']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      MangoCallLeg_state_eventAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['state', 'eventAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
      MangoCallLeg_extension_eventAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['extension', 'eventAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
    }),
  }),
  MangoCallAccess: Object.freeze({
    columns: Object.freeze([
      ['id', 'TEXT', 0, 1],
      ['entryId', 'TEXT', 1, 0],
      ['action', 'TEXT', 1, 0],
      ['actor', 'TEXT', 1, 0],
      ['createdAt', 'TEXT', 1, 0],
    ]),
    indexes: Object.freeze({
      sqlite_autoindex_MangoCallAccess_1: Object.freeze({ unique: 1, origin: 'pk', partial: 0, columns: Object.freeze(['id']), collations: Object.freeze(['BINARY']), descending: Object.freeze([0]) }),
      MangoCallAccess_entryId_createdAt_idx: Object.freeze({ unique: 0, origin: 'c', partial: 0, columns: Object.freeze(['entryId', 'createdAt']), collations: Object.freeze(['BINARY', 'BINARY']), descending: Object.freeze([0, 0]) }),
    }),
  }),
})

async function databasePath(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  return join(directory, 'content.sqlite')
}

async function open(path) {
  return createClient({ url: `file:${path}` })
}

async function createLegacyDatabase(path) {
  const client = await open(path)
  await client.execute(`CREATE TABLE Doctor (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    specialization TEXT NOT NULL,
    experienceYears REAL NOT NULL,
    bio TEXT NOT NULL,
    photoMediaId TEXT
  )`)
  await client.execute({ sql: 'INSERT INTO Doctor (id, name, slug, specialization, experienceYears, bio, photoMediaId) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [SENTINEL_ID, 'Доктор Наследие', 'legacy', 'Архив', 31, 'Сохранить без изменений', null] })
  client.close()
}

async function migrate(path) {
  return executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
}

async function migrationFailure(path) {
  try {
    await migrate(path)
    return { failed: false, code: 0 }
  } catch (error) {
    return { failed: true, code: error.code }
  }
}

async function schemaSnapshot(client) {
  const columns = await client.execute("PRAGMA table_info('BookingIntent')")
  const indexList = await client.execute("PRAGMA index_list('BookingIntent')")
  const indexes = {}
  for (const row of indexList.rows) {
    const info = await client.execute({ sql: 'SELECT name, coll, desc, key FROM pragma_index_xinfo(?) ORDER BY seqno', args: [row.name] })
    const keys = info.rows.filter(({ key }) => key === 1)
    indexes[row.name] = { unique: row.unique, origin: row.origin, partial: row.partial, columns: keys.map(({ name }) => name), collations: keys.map(({ coll }) => coll), descending: keys.map(({ desc }) => desc) }
  }
  return { columns: columns.rows.map(({ name, type, notnull, pk }) => [name, type, notnull, pk]), indexes }
}

async function tableSchemaSnapshot(client, tableName) {
  const columns = await client.execute(`PRAGMA table_info('${tableName}')`)
  const indexList = await client.execute(`PRAGMA index_list('${tableName}')`)
  const indexes = {}
  for (const row of indexList.rows) {
    const info = await client.execute({ sql: 'SELECT name, coll, desc, key FROM pragma_index_xinfo(?) ORDER BY seqno', args: [row.name] })
    const keys = info.rows.filter(({ key }) => key === 1)
    indexes[row.name] = { unique: row.unique, origin: row.origin, partial: row.partial, columns: keys.map(({ name }) => name), collations: keys.map(({ coll }) => coll), descending: keys.map(({ desc }) => desc) }
  }
  return { columns: columns.rows.map(({ name, type, notnull, pk }) => [name, type, notnull, pk]), indexes }
}

async function clinicSchemaSnapshot(client) {
  const entries = await Promise.all(Object.keys(EXPECTED_CLINIC_SCHEMA).map(async (name) => [name, await tableSchemaSnapshot(client, name)]))
  return Object.fromEntries(entries)
}

async function sqliteMasterSnapshot(client) {
  const result = await client.execute("SELECT type, name, tbl_name AS tableName, sql FROM sqlite_master ORDER BY type, name")
  return result.rows.map(({ type, name, tableName, sql }) => ({ type, name, tableName, sql }))
}

async function createBookingIndexes(client, excludedName) {
  for (const sql of BOOKING_INDEX_SQL) {
    if (!excludedName || !sql.includes(excludedName)) await client.execute(sql)
  }
}

async function createAstroBookingSchema(client) {
  for (const sql of astroGeneratedSchemaFor(['BookingIntent'])) await client.execute(sql)
}

async function createAstroClinicSchema(client) {
  for (const sql of astroGeneratedSchemaFor(['Patient', 'PatientAccess', 'Appointment', 'MedflexDoctorLink', 'MangoCall', 'MangoCallLeg', 'MangoCallAccess'])) await client.execute(sql)
}

function intentArgs(overrides = {}) {
  return [
    overrides.id ?? FIRST_INTENT_ID,
    overrides.requestFingerprint ?? FIRST_FINGERPRINT,
    overrides.status ?? 'confirmed',
    overrides.fencingToken ?? FIRST_FENCE,
    'odintsov',
    'mammologist',
    70120,
    34871,
    55,
    '2026-08-27T08:10:00.000Z',
    '2026-08-27T08:50:00.000Z',
    4_900,
    overrides.medflexClaimId ?? CLAIM_ID,
    null,
    '2026-08-25T12:00:00.000Z',
    '2026-08-25T12:00:00.000Z',
    '2026-08-25T12:02:00.000Z',
  ]
}

async function insertIntent(client, overrides = {}) {
  const placeholders = Array(17).fill('?').join(', ')
  return client.execute({ sql: `INSERT INTO BookingIntent VALUES (${placeholders})`, args: intentArgs(overrides) })
}

async function rejects(operation) {
  try {
    await operation()
    return false
  } catch {
    return true
  }
}

describe('booking intent production migration', () => {
  it('creates the exact additive patient and appointment schema without changing a populated legacy database', async () => {
    const path = await databasePath('clod-migration-clinic-')
    await createLegacyDatabase(path)
    await migrate(path)
    await migrate(path)
    const client = await open(path)
    const clinic = await clinicSchemaSnapshot(client)
    const sentinel = await client.execute({ sql: 'SELECT name FROM Doctor WHERE id = ?', args: [SENTINEL_ID] })
    client.close()
    expect({ clinic, sentinel: sentinel.rows[0]?.name }).toEqual({ clinic: EXPECTED_CLINIC_SCHEMA, sentinel: 'Доктор Наследие' })
  })

  it('accepts the equivalent clinic schema generated by Astro DB', async () => {
    const path = await databasePath('clod-migration-clinic-astro-')
    const client = await open(path)
    await createAstroClinicSchema(client)
    const before = await clinicSchemaSnapshot(client)
    client.close()
    await migrate(path)
    const afterClient = await open(path)
    const after = await clinicSchemaSnapshot(afterClient)
    afterClient.close()
    const { Appointment_bookingFingerprint_active_unique: activeUnique, ...otherAppointmentIndexes } = EXPECTED_CLINIC_SCHEMA.Appointment.indexes
    const legacyAppointment = { ...EXPECTED_CLINIC_SCHEMA.Appointment, indexes: { ...otherAppointmentIndexes, Appointment_bookingFingerprint_unique: { ...activeUnique, partial: 0 } } }
    expect({ before, after }).toEqual({ before: { ...EXPECTED_CLINIC_SCHEMA, Appointment: legacyAppointment }, after: EXPECTED_CLINIC_SCHEMA })
  })

  it('rolls back all additive schema changes when a legacy Patient table is incompatible', async () => {
    const path = await databasePath('clod-migration-clinic-incompatible-')
    await createLegacyDatabase(path)
    const first = await open(path)
    await first.execute('CREATE TABLE Patient (id TEXT PRIMARY KEY)')
    first.close()
    const failure = await migrationFailure(path)
    const client = await open(path)
    const appointment = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Appointment'")
    const sentinel = await client.execute({ sql: 'SELECT name FROM Doctor WHERE id = ?', args: [SENTINEL_ID] })
    client.close()
    expect({ failed: failure.failed, appointmentTables: appointment.rows.length, sentinel: sentinel.rows[0]?.name }).toEqual({ failed: true, appointmentTables: 0, sentinel: 'Доктор Наследие' })
  })

  it('fails closed without creating companion tables when a partial MangoCall schema exists', async () => {
    const path = await databasePath('clod-migration-mango-incompatible-')
    await createLegacyDatabase(path)
    const first = await open(path)
    await first.execute('CREATE TABLE MangoCall (entryId TEXT PRIMARY KEY)')
    first.close()
    const failure = await migrationFailure(path)
    const client = await open(path)
    const legs = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('MangoCallLeg', 'MangoCallAccess')")
    const sentinel = await client.execute({ sql: 'SELECT name FROM Doctor WHERE id = ?', args: [SENTINEL_ID] })
    client.close()
    expect({ failed: failure.failed, companionTables: legs.rows.length, sentinel: sentinel.rows[0]?.name }).toEqual({ failed: true, companionTables: 0, sentinel: 'Доктор Наследие' })
  })

  it('migrates a populated database twice without changing legacy data or schema invariants', async () => {
    const path = await databasePath('clod-migration-populated-')
    await createLegacyDatabase(path)
    await migrate(path)
    await migrate(path)
    const client = await open(path)
    const sentinel = await client.execute({ sql: 'SELECT name, bio FROM Doctor WHERE id = ?', args: [SENTINEL_ID] })
    const schema = await schemaSnapshot(client)
    client.close()
    expect({ sentinel: sentinel.rows[0], schema }).toEqual({ sentinel: { name: 'Доктор Наследие', bio: 'Сохранить без изменений' }, schema: { columns: EXPECTED_COLUMNS, indexes: EXPECTED_INDEXES } })
  })

  it('accepts the equivalent BookingIntent schema generated by Astro DB', async () => {
    const path = await databasePath('clod-migration-astro-schema-')
    const client = await open(path)
    await createAstroBookingSchema(client)
    const before = await schemaSnapshot(client)
    client.close()
    await migrate(path)
    const afterClient = await open(path)
    const after = await schemaSnapshot(afterClient)
    afterClient.close()
    expect({ before, after }).toEqual({ before: { columns: EXPECTED_COLUMNS, indexes: EXPECTED_INDEXES }, after: { columns: EXPECTED_COLUMNS, indexes: EXPECTED_INDEXES } })
  })

  it('enforces fingerprint, claim, and fencing uniqueness in the migrated database', async () => {
    const path = await databasePath('clod-migration-unique-')
    await migrate(path)
    const client = await open(path)
    await insertIntent(client)
    const fingerprint = await rejects(() => insertIntent(client, { id: SECOND_INTENT_ID, fencingToken: SECOND_FENCE, medflexClaimId: OTHER_CLAIM_ID }))
    const claim = await rejects(() => insertIntent(client, { id: SECOND_INTENT_ID, requestFingerprint: SECOND_FINGERPRINT, fencingToken: SECOND_FENCE }))
    const fence = await rejects(() => insertIntent(client, { id: SECOND_INTENT_ID, requestFingerprint: THIRD_FINGERPRINT, medflexClaimId: OTHER_CLAIM_ID }))
    client.close()
    expect({ fingerprint, claim, fence }).toEqual({ fingerprint: true, claim: true, fence: true })
  })

  it('uses bounded exact-ID and scope indexes for the split resume lookups', async () => {
    const path = await databasePath('clod-migration-resume-plan-')
    await migrate(path)
    const client = await open(path)
    const exactPlan = await client.execute({
      sql: 'EXPLAIN QUERY PLAN SELECT id FROM BookingIntent WHERE id = ? LIMIT ?',
      args: [FIRST_INTENT_ID, 2],
    })
    const scopePlan = await client.execute({
      sql: 'EXPLAIN QUERY PLAN SELECT id FROM BookingIntent WHERE doctorSlug = ? AND appointmentType = ? AND startsAt = ? AND endsAt = ? LIMIT ?',
      args: ['odintsov', 'mammologist', '2026-08-27T08:10:00.000Z', '2026-08-27T08:50:00.000Z', 33],
    })
    client.close()
    const exactDetails = exactPlan.rows.map(({ detail }) => detail)
    const scopeDetails = scopePlan.rows.map(({ detail }) => detail)
    const result = { primaryKey: exactDetails.some((detail) => detail.includes('sqlite_autoindex_BookingIntent_1')), scope: scopeDetails.some((detail) => detail.includes('BookingIntent_resumeScope_idx')), scans: [...exactDetails, ...scopeDetails].some((detail) => detail.includes('SCAN BookingIntent')), temporaryOrder: [...exactDetails, ...scopeDetails].some((detail) => detail.includes('TEMP B-TREE')) }
    expect(result).toEqual({ primaryKey: true, scope: true, scans: false, temporaryOrder: false })
  })

  it('fails closed when an existing named index has the wrong uniqueness and columns', async () => {
    const path = await databasePath('clod-migration-wrong-index-')
    const client = await open(path)
    await client.execute(BOOKING_TABLE_SQL)
    await client.execute('CREATE INDEX BookingIntent_requestFingerprint_unique ON BookingIntent(doctorSlug)')
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('fails closed and rolls back when a same-named fingerprint index is partial', async () => {
    const path = await databasePath('clod-migration-partial-index-')
    const client = await open(path)
    await client.execute(BOOKING_TABLE_SQL)
    await client.execute("CREATE UNIQUE INDEX BookingIntent_requestFingerprint_unique ON BookingIntent(requestFingerprint) WHERE status = 'pending'")
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('fails closed and rolls back when the booking table has an unexpected rogue index', async () => {
    const path = await databasePath('clod-migration-rogue-index-')
    const client = await open(path)
    await client.execute(BOOKING_TABLE_SQL)
    await createBookingIndexes(client)
    await client.execute('CREATE INDEX BookingIntent_rogue_idx ON BookingIntent(doctorSlug)')
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('fails closed and rolls back when the booking table has an extra constraint', async () => {
    const path = await databasePath('clod-migration-extra-check-')
    const client = await open(path)
    await client.execute(BOOKING_TABLE_SQL.replace('\n)', ',\n  CHECK (length(status) = 9)\n)'))
    await createBookingIndexes(client)
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('fails closed and rolls back when the booking table has an unexpected option', async () => {
    const path = await databasePath('clod-migration-strict-table-')
    const client = await open(path)
    await client.execute(`${BOOKING_TABLE_SQL} STRICT`)
    await createBookingIndexes(client)
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('fails closed and rolls back when the resume index uses a non-binary collation', async () => {
    const path = await databasePath('clod-migration-index-collation-')
    const client = await open(path)
    await client.execute(BOOKING_TABLE_SQL)
    await createBookingIndexes(client, 'BookingIntent_resumeScope_idx')
    await client.execute('CREATE INDEX BookingIntent_resumeScope_idx ON BookingIntent(doctorSlug COLLATE NOCASE, appointmentType, startsAt, endsAt)')
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('fails closed and rolls back when an index key has descending order', async () => {
    const path = await databasePath('clod-migration-index-descending-')
    const client = await open(path)
    await client.execute(BOOKING_TABLE_SQL)
    await createBookingIndexes(client, 'BookingIntent_resumeScope_idx')
    await client.execute('CREATE INDEX BookingIntent_resumeScope_idx ON BookingIntent(doctorSlug, appointmentType, startsAt DESC, endsAt)')
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('fails closed and rolls back when a trigger targets the booking table', async () => {
    const path = await databasePath('clod-migration-trigger-')
    const client = await open(path)
    await client.execute(BOOKING_TABLE_SQL)
    await createBookingIndexes(client)
    await client.execute("CREATE TRIGGER BookingIntent_block_pending BEFORE INSERT ON BookingIntent BEGIN SELECT RAISE(ABORT, 'blocked'); END")
    const before = await sqliteMasterSnapshot(client)
    client.close()
    const failure = await migrationFailure(path)
    const afterClient = await open(path)
    const after = await sqliteMasterSnapshot(afterClient)
    afterClient.close()
    expect({ failed: failure.failed, unchanged: after }).toEqual({ failed: true, unchanged: before })
  })

  it('rolls back additive DDL when an incompatible legacy table breaks the migration batch', async () => {
    const path = await databasePath('clod-migration-rollback-')
    await createLegacyDatabase(path)
    const first = await open(path)
    await first.execute('CREATE TABLE BookingIntent (id TEXT PRIMARY KEY)')
    first.close()
    const failure = await migrationFailure(path)
    const client = await open(path)
    const media = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Media'")
    const sentinel = await client.execute({ sql: 'SELECT name FROM Doctor WHERE id = ?', args: [SENTINEL_ID] })
    client.close()
    expect({ failed: failure.failed, mediaTables: media.rows.length, sentinel: sentinel.rows[0]?.name }).toEqual({ failed: true, mediaTables: 0, sentinel: 'Доктор Наследие' })
  })

  it('runs the additive schema migration before every container process start', async () => {
    const source = await readFile(ENTRYPOINT_SCRIPT, 'utf8')
    const migrationIndex = source.indexOf('node /app/scripts/init-db.mjs')
    const serverIndex = source.indexOf('exec node /app/scripts/server.mjs')
    const result = { unconditional: !source.includes('[ ! -f /data/db.sqlite ]'), migrationFound: migrationIndex >= 0, serverFound: serverIndex >= 0, migrationBeforeServer: migrationIndex >= 0 && serverIndex >= 0 && migrationIndex < serverIndex }
    expect(result).toEqual({ unconditional: true, migrationFound: true, serverFound: true, migrationBeforeServer: true })
  })
})
