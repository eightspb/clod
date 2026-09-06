import { referrerOrigin, truncateIp } from './analytics-privacy.js'

export const DEFAULT_ANALYTICS_RETENTION_DAYS = 90
export const AUTH_EVENT_RETENTION_DAYS = 365
const DAY_MS = 24 * 60 * 60_000

function affected(result) {
  return Number(result?.rowsAffected ?? 0)
}

/**
 * ISO timestamp before which analytics rows are no longer kept.
 */
export function retentionCutoff({ now = new Date(), days }) {
  if (!Number.isSafeInteger(days) || days < 1) throw new TypeError('Retention window must be a positive integer number of days')
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('Retention cutoff requires a valid current Date')
  return new Date(now.getTime() - days * DAY_MS).toISOString()
}

/**
 * Deletes analytics older than the cutoff in one transaction, child tables first, so a crash
 * mid-way never leaves page views or events pointing at a vanished session.
 */
export async function pruneAnalytics({ client, cutoff }) {
  if (typeof cutoff !== 'string' || !Number.isFinite(Date.parse(cutoff))) throw new TypeError('Analytics prune requires an ISO cutoff timestamp')
  const transaction = await client.transaction('write')
  try {
    const events = affected(await transaction.execute({ sql: 'DELETE FROM EventLog WHERE createdAt < ? OR sessionId IN (SELECT id FROM AnalyticsSession WHERE lastActiveAt < ?)', args: [cutoff, cutoff] }))
    const views = affected(await transaction.execute({ sql: 'DELETE FROM PageView WHERE enteredAt < ? OR sessionId IN (SELECT id FROM AnalyticsSession WHERE lastActiveAt < ?)', args: [cutoff, cutoff] }))
    const sessions = affected(await transaction.execute({ sql: 'DELETE FROM AnalyticsSession WHERE lastActiveAt < ?', args: [cutoff] }))
    await transaction.commit()
    return Object.freeze({ sessions, views, events })
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    transaction.close()
  }
}

/**
 * One-off minimisation of rows written before addresses were truncated and referrers reduced
 * to their origin; idempotent, so the daily job can keep calling it.
 */
export async function minimizeStoredAnalytics({ client }) {
  const rows = await client.execute("SELECT id, ip, referrer FROM AnalyticsSession WHERE (ip IS NOT NULL AND ip NOT LIKE '%/24' AND ip NOT LIKE '%/48') OR (referrer IS NOT NULL AND referrer LIKE '%/%/%/%')")
  let updated = 0
  for (const row of rows.rows) {
    const ip = row.ip === null ? null : truncateIp(row.ip) ?? null
    const referrer = row.referrer === null ? null : referrerOrigin(row.referrer) ?? null
    await client.execute({ sql: 'UPDATE AnalyticsSession SET ip = ?, referrer = ? WHERE id = ?', args: [ip, referrer, row.id] })
    updated += 1
  }
  return Object.freeze({ updated })
}

/**
 * Daily retention job shared by the entrypoint, the in-process scheduler, and the CLI.
 */
export async function runAnalyticsRetention({ client, env = process.env, now = new Date() }) {
  const days = env.ANALYTICS_RETENTION_DAYS === undefined || env.ANALYTICS_RETENTION_DAYS === '' ? DEFAULT_ANALYTICS_RETENTION_DAYS : Number(env.ANALYTICS_RETENTION_DAYS)
  const minimized = await minimizeStoredAnalytics({ client })
  const pruned = await pruneAnalytics({ client, cutoff: retentionCutoff({ now, days }) })
  const authEvents = affected(await client.execute({ sql: 'DELETE FROM AdminAuthEvent WHERE createdAt < ?', args: [retentionCutoff({ now, days: AUTH_EVENT_RETENTION_DAYS })] }))
  return Object.freeze({ days, ...pruned, minimized: minimized.updated, authEvents })
}
