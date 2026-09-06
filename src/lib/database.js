import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

export * from './database-schema.js'
export { and, asc, avg, count, countDistinct, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, like, lt, lte, ne, or, sql } from 'drizzle-orm'

export const BUSY_TIMEOUT_MS = 5000
const STATEMENT_METHODS = Object.freeze(['execute', 'batch', 'executeMultiple', 'transaction', 'migrate'])

/**
 * Wraps a libsql client so `PRAGMA busy_timeout` runs once before the first statement: without it a
 * second writer (webhook, admin action, import CLI) gets SQLITE_BUSY immediately instead of waiting.
 */
export function withBusyTimeout(client, milliseconds) {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) throw new TypeError('Busy timeout must be a positive integer number of milliseconds')
  let ready
  const prepare = () => {
    if (!ready) ready = client.execute(`PRAGMA busy_timeout = ${milliseconds}`)
    return ready
  }
  return new Proxy(client, {
    get(target, key) {
      const value = Reflect.get(target, key)
      if (typeof value !== 'function') return value
      if (!STATEMENT_METHODS.includes(key)) return value.bind(target)
      return async (...input) => {
        await prepare()
        return value.apply(target, input)
      }
    },
  })
}

/**
 * Builds a Drizzle database over the libsql client so route handlers keep the query API
 * they used with Astro DB, while `$client` stays available for statement-level code.
 */
export function createDatabase(env) {
  const url = env.ASTRO_DB_REMOTE_URL
  if (typeof url !== 'string' || url.trim() === '') throw new Error('ASTRO_DB_REMOTE_URL must point at the SQLite database before any query runs')
  const client = withBusyTimeout(createClient({ url, authToken: env.ASTRO_DB_APP_TOKEN || undefined }), BUSY_TIMEOUT_MS)
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
