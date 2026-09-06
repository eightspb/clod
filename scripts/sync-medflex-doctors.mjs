import { createClient } from '@libsql/client'
import { BUSY_TIMEOUT_MS, withBusyTimeout } from '../src/lib/database.js'
import { createAdminDoctorSync } from '../src/lib/admin-doctor-sync.js'

function required(name) {
  const value = process.env[name]
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} is required`)
  return value
}

async function run() {
  const database = withBusyTimeout(createClient({ url: required('ASTRO_DB_REMOTE_URL'), authToken: process.env.ASTRO_DB_APP_TOKEN || undefined }), BUSY_TIMEOUT_MS)
  try {
    const result = await createAdminDoctorSync({ client: database }).sync()
    process.stdout.write(`${JSON.stringify({ ok: true, report: result.report })}\n`)
  } finally {
    database.close()
  }
}

try {
  await run()
} catch {
  process.stderr.write(`${JSON.stringify({ ok: false, error: 'MEDFLEX_DOCTOR_SYNC_FAILED' })}\n`)
  process.exitCode = 1
}
