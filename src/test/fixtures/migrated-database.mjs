import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../../..')

/**
 * Creates a fresh SQLite file migrated by scripts/init-db.mjs and returns its libsql URL.
 */
export async function migratedDatabaseUrl(prefix = 'clod-test-') {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  const path = join(directory, 'db.sqlite')
  await executeFile(process.execPath, [join(PROJECT_ROOT, 'scripts/init-db.mjs')], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  return `file:${path}`
}
