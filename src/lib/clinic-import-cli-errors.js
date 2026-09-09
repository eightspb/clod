/** Storage failures the operator can act on, distinguished from the generic CLI_FAILED. */
export const STORAGE_ERROR_CODES = Object.freeze(['DISK_FULL', 'OUT_OF_MEMORY', 'DATABASE_BUSY', 'DATABASE_CORRUPT'])
const BY_SQLITE_CODE = Object.freeze({ SQLITE_FULL: 'DISK_FULL', SQLITE_IOERR_WRITE: 'DISK_FULL', SQLITE_NOMEM: 'OUT_OF_MEMORY', SQLITE_BUSY: 'DATABASE_BUSY', SQLITE_LOCKED: 'DATABASE_BUSY', SQLITE_CORRUPT: 'DATABASE_CORRUPT', SQLITE_NOTADB: 'DATABASE_CORRUPT' })
const BY_SYSTEM_CODE = Object.freeze({ ENOSPC: 'DISK_FULL', ENOMEM: 'OUT_OF_MEMORY' })

function codes(error) {
  const found = []
  for (let current = error, depth = 0; current && depth < 5; current = current.cause, depth += 1) {
    if (typeof current.code === 'string') found.push(current.code)
    if (typeof current.rawCode === 'number' && current.rawCode === 7) found.push('SQLITE_NOMEM')
  }
  return found
}

/**
 * Maps a libsql or filesystem failure to a storage code; undefined when it is not a storage
 * condition the operator can act on.
 */
export function classifyStorageError(error) {
  if (error === null || typeof error !== 'object') return undefined
  for (const code of codes(error)) {
    const sqlite = Object.keys(BY_SQLITE_CODE).find((prefix) => code === prefix || code.startsWith(`${prefix}_`))
    if (sqlite) return BY_SQLITE_CODE[sqlite]
    if (BY_SYSTEM_CODE[code]) return BY_SYSTEM_CODE[code]
  }
  return undefined
}
