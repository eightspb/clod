import { createClient } from '@libsql/client'

const url = process.env.ASTRO_DB_REMOTE_URL ?? 'file:/data/db.sqlite'
const authToken = process.env.ASTRO_DB_APP_TOKEN

const db = createClient({ url, authToken })
const bookingIntentTableStatement = `CREATE TABLE IF NOT EXISTS BookingIntent (
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

const statements = [
  `CREATE TABLE IF NOT EXISTS Doctor (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    specialization TEXT NOT NULL,
    experienceYears REAL NOT NULL,
    bio TEXT NOT NULL,
    photoMediaId TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS Media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    url TEXT NOT NULL,
    folder TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS DoctorCertificate (
    id TEXT PRIMARY KEY,
    doctorId TEXT NOT NULL,
    mediaId TEXT NOT NULL,
    title TEXT,
    sortOrder REAL NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS Service (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    direction TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS AnalyticsSession (
    id TEXT PRIMARY KEY,
    visitorId TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    currentPage TEXT,
    referrer TEXT,
    screenWidth REAL,
    screenHeight REAL,
    language TEXT,
    startedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    lastActiveAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS PageView (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    page TEXT NOT NULL,
    enteredAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    duration REAL
  )`,
  `CREATE TABLE IF NOT EXISTS EventLog (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    page TEXT NOT NULL,
    target TEXT,
    details TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  bookingIntentTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS BookingIntent_requestFingerprint_unique ON BookingIntent(requestFingerprint)',
  'CREATE UNIQUE INDEX IF NOT EXISTS BookingIntent_medflexClaimId_unique ON BookingIntent(medflexClaimId)',
  'CREATE UNIQUE INDEX IF NOT EXISTS BookingIntent_fencingToken_unique ON BookingIntent(fencingToken)',
  'CREATE INDEX IF NOT EXISTS BookingIntent_resumeScope_idx ON BookingIntent(doctorSlug, appointmentType, startsAt, endsAt)',
  'CREATE INDEX IF NOT EXISTS BookingIntent_status_pendingUntil_idx ON BookingIntent(status, pendingUntil)',
]

const bookingIntentColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['requestFingerprint', 'TEXT', 1, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['fencingToken', 'TEXT', 0, null, 0],
  ['doctorSlug', 'TEXT', 1, null, 0],
  ['appointmentType', 'TEXT', 1, null, 0],
  ['doctorId', 'INTEGER', 1, null, 0],
  ['lpuId', 'INTEGER', 1, null, 0],
  ['specialityId', 'INTEGER', 1, null, 0],
  ['startsAt', 'TEXT', 1, null, 0],
  ['endsAt', 'TEXT', 1, null, 0],
  ['price', 'INTEGER', 1, null, 0],
  ['medflexClaimId', 'TEXT', 0, null, 0],
  ['failureCode', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['pendingUntil', 'TEXT', 1, null, 0],
]
const bookingIntentIndexes = [
  { name: 'BookingIntent_fencingToken_unique', unique: 1, origin: 'c', partial: 0, columns: ['fencingToken'], collations: ['BINARY'], descending: [0] },
  { name: 'BookingIntent_medflexClaimId_unique', unique: 1, origin: 'c', partial: 0, columns: ['medflexClaimId'], collations: ['BINARY'], descending: [0] },
  { name: 'BookingIntent_requestFingerprint_unique', unique: 1, origin: 'c', partial: 0, columns: ['requestFingerprint'], collations: ['BINARY'], descending: [0] },
  { name: 'BookingIntent_resumeScope_idx', unique: 0, origin: 'c', partial: 0, columns: ['doctorSlug', 'appointmentType', 'startsAt', 'endsAt'], collations: ['BINARY', 'BINARY', 'BINARY', 'BINARY'], descending: [0, 0, 0, 0] },
  { name: 'BookingIntent_status_pendingUntil_idx', unique: 0, origin: 'c', partial: 0, columns: ['status', 'pendingUntil'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_BookingIntent_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]

function canonicalSchemaSql(value) {
  if (typeof value !== 'string') return ''
  return value.replaceAll('"', '').replaceAll('`', '').replaceAll('[', '').replaceAll(']', '').replace(/\bIF\s+NOT\s+EXISTS\b/gi, '').replace(/\s+/g, ' ').replace(/\s*([(),])\s*/g, '$1').trim().toUpperCase()
}

const bookingIntentCanonicalSql = canonicalSchemaSql(bookingIntentTableStatement)

async function verifyBookingIntentSchema(database) {
  const table = await database.execute({ sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", args: ['BookingIntent'] })
  if (table.rows.length !== 1 || canonicalSchemaSql(table.rows[0].sql) !== bookingIntentCanonicalSql) throw new Error('[init-db] BookingIntent table definition invariant failed')
  const columns = await database.execute("PRAGMA table_info('BookingIntent')")
  const actualColumns = columns.rows.map(({ name, type, notnull, dflt_value: defaultValue, pk }) => [name, type, notnull, defaultValue, pk])
  if (JSON.stringify(actualColumns) !== JSON.stringify(bookingIntentColumns)) throw new Error('[init-db] BookingIntent column invariant failed')
  const unexpectedObjects = await database.execute({ sql: "SELECT type, name FROM sqlite_master WHERE tbl_name = ? AND type NOT IN ('table', 'index')", args: ['BookingIntent'] })
  if (unexpectedObjects.rows.length !== 0) throw new Error('[init-db] BookingIntent schema object invariant failed')
  const indexes = await database.execute("PRAGMA index_list('BookingIntent')")
  const actualIndexes = []
  for (const index of indexes.rows) {
    const details = await database.execute({ sql: 'SELECT name, coll, desc, key FROM pragma_index_xinfo(?) ORDER BY seqno', args: [index.name] })
    const keys = details.rows.filter(({ key }) => key === 1)
    actualIndexes.push({ name: index.name, unique: index.unique, origin: index.origin, partial: index.partial, columns: keys.map(({ name }) => name), collations: keys.map(({ coll }) => coll), descending: keys.map(({ desc }) => desc) })
  }
  actualIndexes.sort((first, second) => first.name < second.name ? -1 : first.name > second.name ? 1 : 0)
  if (JSON.stringify(actualIndexes) !== JSON.stringify(bookingIntentIndexes)) throw new Error('[init-db] BookingIntent index invariant failed')
}

let transaction
try {
  transaction = await db.transaction('write')
  try {
    for (const statement of statements) await transaction.execute(statement)
    await verifyBookingIntentSchema(transaction)
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    transaction.close()
  }
  console.log('[init-db] Database schema is ready.')
} finally {
  db.close()
}
