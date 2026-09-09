import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

export * from './database-schema.js'
export { and, asc, avg, count, countDistinct, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, like, lt, lte, ne, or, sql } from 'drizzle-orm'

const BUSY_TIMEOUT_MS = 5000

/**
 * Opens a libsql client whose every pooled connection waits instead of failing on SQLITE_BUSY:
 * without it a second writer (webhook, admin action, import CLI) gets SQLITE_BUSY immediately.
 * The timeout belongs in the client configuration rather than a `PRAGMA` statement because the
 * client keeps a pool and hands a different connection to each call, so a pragma would arm only
 * the one connection that happened to run it.
 */
export function createSqliteClient(configuration) {
  return createClient({ ...configuration, timeout: BUSY_TIMEOUT_MS })
}

/**
 * Builds a Drizzle database over the libsql client so route handlers keep the query API
 * they used with Astro DB, while `$client` stays available for statement-level code.
 */
export function createDatabase(env) {
  const url = env.ASTRO_DB_REMOTE_URL
  if (typeof url !== 'string' || url.trim() === '') throw new Error('ASTRO_DB_REMOTE_URL must point at the SQLite database before any query runs')
  const client = createSqliteClient({ url, authToken: env.ASTRO_DB_APP_TOKEN || undefined })
  return drizzle(client)
}

/**
 * Lazy handle: the connection opens on the first query, so importing this module during
 * prerendering or in unit tests never needs a database.
 */
export function lazyDatabase(readEnv) {
  let connected
  const connection = () => {
    if (!connected) connected = createDatabase(readEnv())
    return connected
  }
  return new Proxy({}, {
    get(_, key) {
      const value = Reflect.get(connection(), key)
      return typeof value === 'function' ? value.bind(connection()) : value
    },
  })
}

export const db = lazyDatabase(() => process.env)

/**
 * Drizzle wraps driver failures in DrizzleQueryError, so the SQLite code lives on `cause`;
 * returns a log-safe code without any statement or parameter text.
 */
export function databaseErrorCode(error) {
  return error?.cause?.code ?? error?.code ?? error?.name ?? 'UNKNOWN'
}
