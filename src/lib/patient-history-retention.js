export const DEFAULT_UNMATCHED_HISTORY_RETENTION_DAYS = 365
const DAY_MS = 24 * 60 * 60_000

function retentionDays(value) {
  if (value === undefined || value === '') return DEFAULT_UNMATCHED_HISTORY_RETENTION_DAYS
  const days = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(days) || days < 30 || days > 3650) throw new TypeError('UNMATCHED_HISTORY_RETENTION_DAYS must be an integer between 30 and 3650')
  return days
}

/**
 * Anonymizes historical visits that never matched a patient card: their protected details and
 * the encrypted source rows behind them stay in the database with no patient to answer for
 * them, so after the retention window they lose the ciphertext while the safe coordinates,
 * statuses and issue codes stay for import accounting. Visits an operator later links are
 * `linked` by then and never touched.
 */
export async function anonymizeUnmatchedHistory({ client, cutoff, now = new Date().toISOString() }) {
  if (typeof cutoff !== 'string' || !Number.isFinite(Date.parse(cutoff))) throw new TypeError('History retention requires an ISO cutoff timestamp')
  const transaction = await client.transaction('write')
  try {
    const visits = await transaction.execute({ sql: "SELECT id FROM HistoricalVisit WHERE linkStatus = 'unmatched' AND piiDestroyedAt IS NULL AND createdAt < ?", args: [cutoff] })
    const ids = visits.rows.map(({ id }) => id)
    for (let offset = 0; offset < ids.length; offset += 200) {
      const chunk = ids.slice(offset, offset + 200)
      const placeholders = chunk.map(() => '?').join(', ')
      await transaction.execute({ sql: `UPDATE ImportSourceRow SET payloadCiphertext = NULL, payloadHash = 'destroyed', piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE historicalVisitId IN (${placeholders})`, args: [now, ...chunk] })
      await transaction.execute({ sql: `UPDATE ImportIssue SET candidatesCiphertext = NULL, detailsCiphertext = NULL WHERE historicalVisitId IN (${placeholders})`, args: chunk })
      await transaction.execute({ sql: `UPDATE HistoricalInvoice SET payloadCiphertext = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE historicalVisitId IN (${placeholders})`, args: [now, ...chunk] })
      await transaction.execute({ sql: `UPDATE HistoricalVisit SET appointmentIdCiphertext = NULL, appointmentIdFingerprint = NULL, doctorCiphertext = NULL, detailsCiphertext = NULL, piiDestroyedAt = ? WHERE id IN (${placeholders})`, args: [now, ...chunk] })
    }
    await transaction.commit()
    return Object.freeze({ anonymized: ids.length })
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    transaction.close()
  }
}

/** Reads UNMATCHED_HISTORY_RETENTION_DAYS and anonymizes everything older than the window. */
export async function runUnmatchedHistoryRetention({ client, env = process.env, now = new Date() }) {
  const days = retentionDays(env.UNMATCHED_HISTORY_RETENTION_DAYS)
  const cutoff = new Date(now.getTime() - days * DAY_MS).toISOString()
  const result = await anonymizeUnmatchedHistory({ client, cutoff, now: now.toISOString() })
  return Object.freeze({ days, ...result })
}
