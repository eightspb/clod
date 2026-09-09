const BATCH_PATTERN = /^[0-9a-f-]{36}$/

/**
 * Reports how much encrypted source payload a completed import batch still holds; with `apply`
 * the ciphertext is dropped while the payload hash, coordinates and links stay for tracing.
 */
export async function purgeSourceRows({ client, batchId, apply = false, now = new Date().toISOString() }) {
  if (typeof batchId !== 'string' || !BATCH_PATTERN.test(batchId)) throw new TypeError('Source row purge requires a batch id')
  const batch = await client.execute({ sql: "SELECT status FROM ImportBatch WHERE id = ? AND mode = 'apply' LIMIT 1", args: [batchId] })
  if (batch.rows.length !== 1 || batch.rows[0].status !== 'completed') throw new TypeError('Source row purge requires a completed apply batch')
  const pending = await client.execute({ sql: 'SELECT COUNT(*) AS rows, COALESCE(SUM(length(CAST(payloadCiphertext AS BLOB))), 0) AS bytes FROM ImportSourceRow WHERE batchId = ? AND payloadCiphertext IS NOT NULL', args: [batchId] })
  const rows = Number(pending.rows[0]?.rows ?? 0)
  const bytes = Number(pending.rows[0]?.bytes ?? 0)
  if (!apply) return Object.freeze({ mode: 'dry-run', batchId, rows, bytes, purged: 0 })
  const result = await client.execute({ sql: 'UPDATE ImportSourceRow SET payloadCiphertext = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE batchId = ? AND payloadCiphertext IS NOT NULL', args: [now, batchId] })
  return Object.freeze({ mode: 'apply', batchId, rows, bytes, purged: Number(result.rowsAffected ?? 0) })
}

/** Reclaims file space after a purge; needs no open transaction on the file. */
export async function vacuumDatabase({ client }) {
  const before = await client.execute('PRAGMA page_count')
  await client.execute('VACUUM')
  const after = await client.execute('PRAGMA page_count')
  return Object.freeze({ pagesBefore: Number(before.rows[0]?.page_count ?? 0), pagesAfter: Number(after.rows[0]?.page_count ?? 0) })
}
