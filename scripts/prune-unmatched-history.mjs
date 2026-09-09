#!/usr/bin/env node
import { createSqliteClient } from '../src/lib/database.js'
import { runUnmatchedHistoryRetention } from '../src/lib/patient-history-retention.js'

const url = process.env.ASTRO_DB_REMOTE_URL
if (typeof url !== 'string' || url === '') throw new Error('ASTRO_DB_REMOTE_URL must point at the SQLite database')
const client = createSqliteClient({ url, authToken: process.env.ASTRO_DB_APP_TOKEN || undefined })
try {
  const result = await runUnmatchedHistoryRetention({ client })
  console.log(`[prune-unmatched-history] kept ${result.days} days: anonymized=${result.anonymized}`)
} finally {
  client.close()
}
