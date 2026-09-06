import { randomUUID } from 'node:crypto'

export const DEFAULT_MANGO_CALL_RETENTION_DAYS = 365
const DAY_MS = 24 * 60 * 60_000

/**
 * Removes caller identity from calls older than the cutoff. Wait and talk durations, statuses,
 * and the access audit stay, so answer-rate history survives while phone numbers do not.
 */
export async function anonymizeOldCalls({ client, cutoff, now = new Date().toISOString(), nextUuid = randomUUID }) {
  if (typeof cutoff !== 'string' || !Number.isFinite(Date.parse(cutoff))) throw new TypeError('Call retention requires an ISO cutoff timestamp')
  const transaction = await client.transaction('write')
  try {
    const purged = await transaction.execute({ sql: 'UPDATE MangoCall SET patientId = NULL, callerCiphertext = NULL, callerMask = NULL, callerFingerprint = NULL, repeatCaller = NULL, piiDestroyedAt = ?, updatedAt = max(updatedAt, ?) WHERE startedAt < ? AND piiDestroyedAt IS NULL RETURNING entryId', args: [now, now, cutoff] })
    for (const row of purged.rows) {
      await transaction.execute({ sql: 'INSERT INTO MangoCallAccess (id, entryId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [nextUuid(), row.entryId, 'destroy', 'retention', now] })
    }
    const legs = await transaction.execute({ sql: 'DELETE FROM MangoCallLeg WHERE entryId IN (SELECT entryId FROM MangoCall WHERE startedAt < ?)', args: [cutoff] })
    await transaction.commit()
    return Object.freeze({ anonymized: purged.rows.length, legs: Number(legs.rowsAffected ?? 0) })
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    transaction.close()
  }
}

/**
 * Daily retention entry point shared by the scheduler and the CLI.
 */
export async function runCallRetention({ client, env = process.env, now = new Date() }) {
  const days = env.MANGO_CALL_RETENTION_DAYS === undefined || env.MANGO_CALL_RETENTION_DAYS === '' ? DEFAULT_MANGO_CALL_RETENTION_DAYS : Number(env.MANGO_CALL_RETENTION_DAYS)
  if (!Number.isSafeInteger(days) || days < 1) throw new TypeError('MANGO_CALL_RETENTION_DAYS must be a positive integer')
  const cutoff = new Date(now.getTime() - days * DAY_MS).toISOString()
  return Object.freeze({ days, ...(await anonymizeOldCalls({ client, cutoff, now: now.toISOString() })) })
}
