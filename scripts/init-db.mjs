import { createClient } from '@libsql/client'

const url = process.env.ASTRO_DB_REMOTE_URL ?? 'file:/data/db.sqlite'
const authToken = process.env.ASTRO_DB_APP_TOKEN

const db = createClient({ url, authToken })

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
]

for (const sql of statements) {
  await db.execute(sql)
}

console.log('[init-db] All tables created successfully.')
db.close()
