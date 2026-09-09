#!/usr/bin/env node
import { createSqliteClient } from '../src/lib/database.js'
import { runCallRetention } from '../src/lib/mango-call-retention.js'

const url = process.env.ASTRO_DB_REMOTE_URL
if (typeof url !== 'string' || url === '') throw new Error('ASTRO_DB_REMOTE_URL must point at the SQLite database')
const client = createSqliteClient({ url, authToken: process.env.ASTRO_DB_APP_TOKEN || undefined })
try {
  const result = await runCallRetention({ client })
  console.log(`[prune-calls] kept ${result.days} days: anonymized=${result.anonymized} legs=${result.legs}`)
} finally {
  client.close()
}
