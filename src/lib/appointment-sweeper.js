export const STALE_PENDING_MINUTES = 15
const MINUTE_MS = 60_000

function affected(result) {
  return Array.isArray(result?.rows) ? result.rows.length : Number(result?.rowsAffected ?? 0)
}

/**
 * Moves bookings stuck between prepare and dispatch (a restart mid-request) into states an
 * administrator can act on: the local appointment becomes `needs_review`, the intent `uncertain`.
 * Without this a pending row that never got a Medflex answer could not be cancelled or resolved.
 */
export async function sweepStaleBookings({ client, now = new Date(), staleAfterMinutes = STALE_PENDING_MINUTES }) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('Booking sweep requires a valid current Date')
  if (!Number.isSafeInteger(staleAfterMinutes) || staleAfterMinutes < 1) throw new TypeError('Booking sweep threshold must be a positive integer number of minutes')
  const iso = now.toISOString()
  const cutoff = new Date(now.getTime() - staleAfterMinutes * MINUTE_MS).toISOString()
  const transaction = await client.transaction('write')
  try {
    const intents = await transaction.execute({ sql: "UPDATE BookingIntent SET status = 'uncertain', updatedAt = max(updatedAt, ?) WHERE status = 'pending' AND pendingUntil <= ? RETURNING id", args: [iso, iso] })
    const appointments = await transaction.execute({ sql: "UPDATE Appointment SET status = 'needs_review', updatedAt = max(updatedAt, ?) WHERE status = 'pending' AND createdAt < ? RETURNING id", args: [iso, cutoff] })
    await transaction.commit()
    return Object.freeze({ intents: affected(intents), appointments: affected(appointments) })
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    transaction.close()
  }
}
