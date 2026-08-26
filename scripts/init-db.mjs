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
const patientTableStatement = `CREATE TABLE IF NOT EXISTS Patient (
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
const patientAccessTableStatement = `CREATE TABLE IF NOT EXISTS PatientAccess (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`
const appointmentTableStatement = `CREATE TABLE IF NOT EXISTS Appointment (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    medflexClaimId TEXT,
    medflexLpuId INTEGER,
    medflexDoctorId INTEGER,
    medflexSpecialityId INTEGER,
    medflexServiceId INTEGER,
    doctorName TEXT NOT NULL,
    specialityName TEXT NOT NULL,
    serviceName TEXT,
    startsAt TEXT NOT NULL,
    endsAt TEXT NOT NULL,
    priceKopecks INTEGER,
    bookingFingerprint TEXT NOT NULL,
    failureCode TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    cancelledAt TEXT
  )`
const medflexDoctorLinkTableStatement = `CREATE TABLE IF NOT EXISTS MedflexDoctorLink (
    medflexDoctorId INTEGER PRIMARY KEY,
    externalName TEXT NOT NULL,
    localDoctorId TEXT,
    active INTEGER NOT NULL,
    syncedAt TEXT NOT NULL
  )`
const mangoCallTableStatement = `CREATE TABLE IF NOT EXISTS MangoCall (
    entryId TEXT PRIMARY KEY,
    patientId TEXT,
    status TEXT NOT NULL,
    callerCiphertext TEXT,
    callerMask TEXT,
    callerFingerprint TEXT,
    repeatCaller INTEGER,
    lineNumber TEXT NOT NULL,
    operatorExtension TEXT,
    startedAt TEXT NOT NULL,
    forwardedAt TEXT,
    answeredAt TEXT,
    endedAt TEXT,
    waitSeconds INTEGER,
    talkSeconds INTEGER,
    disconnectReason TEXT,
    finalizedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const mangoCallLegTableStatement = `CREATE TABLE IF NOT EXISTS MangoCallLeg (
    callId TEXT PRIMARY KEY,
    entryId TEXT NOT NULL,
    maxSeq INTEGER NOT NULL,
    state TEXT NOT NULL,
    location TEXT,
    extension TEXT,
    eventAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`
const mangoCallAccessTableStatement = `CREATE TABLE IF NOT EXISTS MangoCallAccess (
    id TEXT PRIMARY KEY,
    entryId TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    createdAt TEXT NOT NULL
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
  patientTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS Patient_phoneFingerprint_unique ON Patient(phoneFingerprint)',
  'CREATE INDEX IF NOT EXISTS Patient_lastSeenAt_idx ON Patient(lastSeenAt)',
  patientAccessTableStatement,
  'CREATE INDEX IF NOT EXISTS PatientAccess_patientId_createdAt_idx ON PatientAccess(patientId, createdAt)',
  appointmentTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS Appointment_medflexClaimId_unique ON Appointment(medflexClaimId)',
  'CREATE UNIQUE INDEX IF NOT EXISTS Appointment_bookingFingerprint_unique ON Appointment(bookingFingerprint)',
  'CREATE INDEX IF NOT EXISTS Appointment_startsAt_idx ON Appointment(startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_patientId_startsAt_idx ON Appointment(patientId, startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_status_startsAt_idx ON Appointment(status, startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_medflexDoctorId_startsAt_idx ON Appointment(medflexDoctorId, startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_source_startsAt_idx ON Appointment(source, startsAt)',
  medflexDoctorLinkTableStatement,
  'CREATE INDEX IF NOT EXISTS MedflexDoctorLink_localDoctorId_idx ON MedflexDoctorLink(localDoctorId)',
  'CREATE INDEX IF NOT EXISTS MedflexDoctorLink_active_idx ON MedflexDoctorLink(active)',
  mangoCallTableStatement,
  'CREATE INDEX IF NOT EXISTS MangoCall_startedAt_idx ON MangoCall(startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_status_startedAt_idx ON MangoCall(status, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_patientId_startedAt_idx ON MangoCall(patientId, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_callerFingerprint_startedAt_idx ON MangoCall(callerFingerprint, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_lineNumber_startedAt_idx ON MangoCall(lineNumber, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_operatorExtension_startedAt_idx ON MangoCall(operatorExtension, startedAt)',
  mangoCallLegTableStatement,
  'CREATE INDEX IF NOT EXISTS MangoCallLeg_entryId_idx ON MangoCallLeg(entryId)',
  'CREATE INDEX IF NOT EXISTS MangoCallLeg_state_eventAt_idx ON MangoCallLeg(state, eventAt)',
  'CREATE INDEX IF NOT EXISTS MangoCallLeg_extension_eventAt_idx ON MangoCallLeg(extension, eventAt)',
  mangoCallAccessTableStatement,
  'CREATE INDEX IF NOT EXISTS MangoCallAccess_entryId_createdAt_idx ON MangoCallAccess(entryId, createdAt)',
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
const patientColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['profileCiphertext', 'TEXT', 0, null, 0],
  ['phoneMask', 'TEXT', 0, null, 0],
  ['phoneFingerprint', 'TEXT', 0, null, 0],
  ['firstSeenAt', 'TEXT', 1, null, 0],
  ['lastSeenAt', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const patientIndexes = [
  { name: 'Patient_lastSeenAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['lastSeenAt'], collations: ['BINARY'], descending: [0] },
  { name: 'Patient_phoneFingerprint_unique', unique: 1, origin: 'c', partial: 0, columns: ['phoneFingerprint'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_Patient_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const patientAccessColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['action', 'TEXT', 1, null, 0],
  ['actor', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const patientAccessIndexes = [
  { name: 'PatientAccess_patientId_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['patientId', 'createdAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_PatientAccess_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const appointmentColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['source', 'TEXT', 1, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['medflexClaimId', 'TEXT', 0, null, 0],
  ['medflexLpuId', 'INTEGER', 0, null, 0],
  ['medflexDoctorId', 'INTEGER', 0, null, 0],
  ['medflexSpecialityId', 'INTEGER', 0, null, 0],
  ['medflexServiceId', 'INTEGER', 0, null, 0],
  ['doctorName', 'TEXT', 1, null, 0],
  ['specialityName', 'TEXT', 1, null, 0],
  ['serviceName', 'TEXT', 0, null, 0],
  ['startsAt', 'TEXT', 1, null, 0],
  ['endsAt', 'TEXT', 1, null, 0],
  ['priceKopecks', 'INTEGER', 0, null, 0],
  ['bookingFingerprint', 'TEXT', 1, null, 0],
  ['failureCode', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['cancelledAt', 'TEXT', 0, null, 0],
]
const appointmentIndexes = [
  { name: 'Appointment_bookingFingerprint_unique', unique: 1, origin: 'c', partial: 0, columns: ['bookingFingerprint'], collations: ['BINARY'], descending: [0] },
  { name: 'Appointment_medflexClaimId_unique', unique: 1, origin: 'c', partial: 0, columns: ['medflexClaimId'], collations: ['BINARY'], descending: [0] },
  { name: 'Appointment_medflexDoctorId_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['medflexDoctorId', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'Appointment_patientId_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['patientId', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'Appointment_source_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['source', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'Appointment_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['startsAt'], collations: ['BINARY'], descending: [0] },
  { name: 'Appointment_status_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['status', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_Appointment_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const medflexDoctorLinkColumns = [
  ['medflexDoctorId', 'INTEGER', 0, null, 1],
  ['externalName', 'TEXT', 1, null, 0],
  ['localDoctorId', 'TEXT', 0, null, 0],
  ['active', 'INTEGER', 1, null, 0],
  ['syncedAt', 'TEXT', 1, null, 0],
]
const medflexDoctorLinkIndexes = [
  { name: 'MedflexDoctorLink_active_idx', unique: 0, origin: 'c', partial: 0, columns: ['active'], collations: ['BINARY'], descending: [0] },
  { name: 'MedflexDoctorLink_localDoctorId_idx', unique: 0, origin: 'c', partial: 0, columns: ['localDoctorId'], collations: ['BINARY'], descending: [0] },
]
const mangoCallColumns = [
  ['entryId', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 0, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['callerCiphertext', 'TEXT', 0, null, 0],
  ['callerMask', 'TEXT', 0, null, 0],
  ['callerFingerprint', 'TEXT', 0, null, 0],
  ['repeatCaller', 'INTEGER', 0, null, 0],
  ['lineNumber', 'TEXT', 1, null, 0],
  ['operatorExtension', 'TEXT', 0, null, 0],
  ['startedAt', 'TEXT', 1, null, 0],
  ['forwardedAt', 'TEXT', 0, null, 0],
  ['answeredAt', 'TEXT', 0, null, 0],
  ['endedAt', 'TEXT', 0, null, 0],
  ['waitSeconds', 'INTEGER', 0, null, 0],
  ['talkSeconds', 'INTEGER', 0, null, 0],
  ['disconnectReason', 'TEXT', 0, null, 0],
  ['finalizedAt', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const mangoCallIndexes = [
  { name: 'MangoCall_callerFingerprint_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['callerFingerprint', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_lineNumber_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['lineNumber', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_operatorExtension_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['operatorExtension', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_patientId_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['patientId', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['startedAt'], collations: ['BINARY'], descending: [0] },
  { name: 'MangoCall_status_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['status', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_MangoCall_1', unique: 1, origin: 'pk', partial: 0, columns: ['entryId'], collations: ['BINARY'], descending: [0] },
]
const mangoCallLegColumns = [
  ['callId', 'TEXT', 0, null, 1],
  ['entryId', 'TEXT', 1, null, 0],
  ['maxSeq', 'INTEGER', 1, null, 0],
  ['state', 'TEXT', 1, null, 0],
  ['location', 'TEXT', 0, null, 0],
  ['extension', 'TEXT', 0, null, 0],
  ['eventAt', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
]
const mangoCallLegIndexes = [
  { name: 'MangoCallLeg_entryId_idx', unique: 0, origin: 'c', partial: 0, columns: ['entryId'], collations: ['BINARY'], descending: [0] },
  { name: 'MangoCallLeg_extension_eventAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['extension', 'eventAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCallLeg_state_eventAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['state', 'eventAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_MangoCallLeg_1', unique: 1, origin: 'pk', partial: 0, columns: ['callId'], collations: ['BINARY'], descending: [0] },
]
const mangoCallAccessColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['entryId', 'TEXT', 1, null, 0],
  ['action', 'TEXT', 1, null, 0],
  ['actor', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const mangoCallAccessIndexes = [
  { name: 'MangoCallAccess_entryId_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['entryId', 'createdAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_MangoCallAccess_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]

function canonicalSchemaSql(value) {
  if (typeof value !== 'string') return ''
  return value.replaceAll('"', '').replaceAll('`', '').replaceAll('[', '').replaceAll(']', '').replace(/\bIF\s+NOT\s+EXISTS\b/gi, '').replace(/\s+/g, ' ').replace(/\s*([(),])\s*/g, '$1').trim().toUpperCase()
}

const bookingIntentCanonicalSql = canonicalSchemaSql(bookingIntentTableStatement)
const clinicSchemas = [
  { name: 'Patient', statement: patientTableStatement, columns: patientColumns, indexes: patientIndexes },
  { name: 'PatientAccess', statement: patientAccessTableStatement, columns: patientAccessColumns, indexes: patientAccessIndexes },
  { name: 'Appointment', statement: appointmentTableStatement, columns: appointmentColumns, indexes: appointmentIndexes },
  { name: 'MedflexDoctorLink', statement: medflexDoctorLinkTableStatement, columns: medflexDoctorLinkColumns, indexes: medflexDoctorLinkIndexes },
  { name: 'MangoCall', statement: mangoCallTableStatement, columns: mangoCallColumns, indexes: mangoCallIndexes },
  { name: 'MangoCallLeg', statement: mangoCallLegTableStatement, columns: mangoCallLegColumns, indexes: mangoCallLegIndexes },
  { name: 'MangoCallAccess', statement: mangoCallAccessTableStatement, columns: mangoCallAccessColumns, indexes: mangoCallAccessIndexes },
]

async function verifySchema(database, schema) {
  const table = await database.execute({ sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", args: [schema.name] })
  if (table.rows.length !== 1 || canonicalSchemaSql(table.rows[0].sql) !== canonicalSchemaSql(schema.statement)) throw new Error(`[init-db] ${schema.name} table definition invariant failed`)
  const columns = await database.execute({ sql: 'SELECT name, type, "notnull" AS required, dflt_value, pk FROM pragma_table_info(?)', args: [schema.name] })
  const actualColumns = columns.rows.map(({ name, type, required, dflt_value: defaultValue, pk }) => [name, type, required, defaultValue, pk])
  if (JSON.stringify(actualColumns) !== JSON.stringify(schema.columns)) throw new Error(`[init-db] ${schema.name} column invariant failed`)
  const unexpectedObjects = await database.execute({ sql: "SELECT type, name FROM sqlite_master WHERE tbl_name = ? AND type NOT IN ('table', 'index')", args: [schema.name] })
  if (unexpectedObjects.rows.length !== 0) throw new Error(`[init-db] ${schema.name} schema object invariant failed`)
  const indexes = await database.execute({ sql: 'SELECT name, "unique", origin, partial FROM pragma_index_list(?)', args: [schema.name] })
  const actualIndexes = []
  for (const index of indexes.rows) {
    const details = await database.execute({ sql: 'SELECT name, coll, desc, key FROM pragma_index_xinfo(?) ORDER BY seqno', args: [index.name] })
    const keys = details.rows.filter(({ key }) => key === 1)
    actualIndexes.push({ name: index.name, unique: index.unique, origin: index.origin, partial: index.partial, columns: keys.map(({ name }) => name), collations: keys.map(({ coll }) => coll), descending: keys.map(({ desc }) => desc) })
  }
  actualIndexes.sort((first, second) => first.name < second.name ? -1 : first.name > second.name ? 1 : 0)
  if (JSON.stringify(actualIndexes) !== JSON.stringify(schema.indexes)) throw new Error(`[init-db] ${schema.name} index invariant failed`)
}

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
    for (const schema of clinicSchemas) await verifySchema(transaction, schema)
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
