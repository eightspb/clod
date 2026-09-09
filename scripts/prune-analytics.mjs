#!/usr/bin/env node
import { createSqliteClient } from '../src/lib/database.js'
import { runAnalyticsRetention } from '../src/lib/analytics-retention.js'

const url = process.env.ASTRO_DB_REMOTE_URL
if (typeof url !== 'string' || url === '') throw new Error('ASTRO_DB_REMOTE_URL must point at the SQLite database')
const client = createSqliteClient({ url, authToken: process.env.ASTRO_DB_APP_TOKEN || undefined })
try {
  const result = await runAnalyticsRetention({ client })
  console.log(`[prune-analytics] kept ${result.days} days: sessions=${result.sessions} views=${result.views} events=${result.events} minimized=${result.minimized}`)
} finally {
  client.close()
}
