const PURGE_SQL = 'UPDATE MangoCall SET patientId = NULL, callerCiphertext = NULL, callerMask = NULL, callerFingerprint = NULL, repeatCaller = NULL, piiDestroyedAt = ?, updatedAt = max(updatedAt, ?)'
const REMAINING_SQL = 'SELECT DISTINCT p.id FROM Patient p LEFT JOIN PatientContact c ON c.patientId = p.id AND c.kind = ? AND c.fingerprint = ? AND c.piiDestroyedAt IS NULL WHERE p.id <> ? AND p.piiDestroyedAt IS NULL AND (p.phoneFingerprint = ? OR c.id IS NOT NULL) ORDER BY p.id LIMIT 2'

function entryIds(result) {
  const rows = result && Array.isArray(result.rows) ? result.rows : []
  return rows.map((row) => {
    const entryId = row.entryId
    if (typeof entryId !== 'string' || entryId.length === 0) throw new TypeError('MANGO call purge returned an invalid entry ID')
    return entryId
  })
}

function remainingPatientIds(result) {
  const rows = result && Array.isArray(result.rows) ? result.rows : []
  return rows.map((row) => {
    const id = row.id
    if (typeof id !== 'string' || id.length === 0) throw new TypeError('MANGO call purge read an invalid patient ID')
    return id
  })
}

async function purgeWhere(executor, condition, args, destroyedAt) {
  const result = await executor.execute({ sql: `${PURGE_SQL} WHERE ${condition} AND piiDestroyedAt IS NULL RETURNING entryId`, args: [destroyedAt, destroyedAt, ...args] })
  return entryIds(result)
}

async function settleFingerprint(executor, input, fingerprint) {
  const remaining = remainingPatientIds(await executor.execute({ sql: REMAINING_SQL, args: ['phone', fingerprint, input.patientId, fingerprint] }))
  if (remaining.length === 0) return purgeWhere(executor, 'callerFingerprint = ?', [fingerprint], input.destroyedAt)
  await executor.execute({ sql: 'UPDATE MangoCall SET patientId = ?, updatedAt = max(updatedAt, ?) WHERE callerFingerprint = ? AND piiDestroyedAt IS NULL', args: [remaining.length === 1 ? remaining[0] : null, input.destroyedAt, fingerprint] })
  return []
}

/**
 * Removes caller data from MANGO calls that belong only to a destroyed patient and audits each purge.
 * Calls whose phone is still shared with another active patient are relinked to that patient instead.
 */
export async function purgeMangoCalls(executor, input) {
  const purged = new Set(await purgeWhere(executor, 'patientId = ?', [input.patientId], input.destroyedAt))
  for (const fingerprint of new Set(input.fingerprints)) {
    for (const entryId of await settleFingerprint(executor, input, fingerprint)) purged.add(entryId)
  }
  for (const entryId of purged) {
    await executor.execute({ sql: 'INSERT INTO MangoCallAccess (id, entryId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [input.nextUuid(), entryId, 'destroy', input.actor, input.destroyedAt] })
  }
  return Object.freeze([...purged])
}
