import { describe, expect, it } from 'vitest'
import { classifyStorageError } from './clinic-import-cli-errors.js'

function failure(code, cause) {
  const error = new Error('storage failed')
  error.code = code
  if (cause) error.cause = cause
  return error
}

describe('clinic import storage error classification', () => {
  it('reports a full disk from the SQLite error code', () => {
    expect(classifyStorageError(failure('SQLITE_FULL'))).toBe('DISK_FULL')
  })

  it('reports a full disk from the filesystem error code', () => {
    expect(classifyStorageError(failure('ENOSPC'))).toBe('DISK_FULL')
  })

  it('reports a busy database from the extended lock code', () => {
    expect(classifyStorageError(failure('SQLITE_BUSY_SNAPSHOT'))).toBe('DATABASE_BUSY')
  })

  it('reports a corrupt database wrapped by the client', () => {
    expect(classifyStorageError(failure('SQLITE_ERROR', failure('SQLITE_CORRUPT')))).toBe('DATABASE_CORRUPT')
  })

  it('reports exhausted memory', () => {
    expect(classifyStorageError(failure('SQLITE_NOMEM'))).toBe('OUT_OF_MEMORY')
  })

  it('leaves unrelated failures unclassified', () => {
    expect(classifyStorageError(failure('SQLITE_CONSTRAINT'))).toBe(undefined)
  })
})
