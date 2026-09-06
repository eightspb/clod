import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { sweepStaleBookings } from './appointment-sweeper.js'
import { migratedDatabaseUrl } from '../test/fixtures/migrated-database.mjs'

const NOW = new Date('2026-09-06T12:00:00.000Z')

async function database() {
  return createClient({ url: await migratedDatabaseUrl('clod-sweeper-') })
}

async function pendingAppointment(client, id, createdAt) {
  await client.execute({ sql: 'INSERT INTO Patient (id, createdAt, updatedAt) VALUES (?, ?, ?)', args: ['10000000-0000-4000-8000-000000000001', createdAt, createdAt] })
  await client.execute({ sql: 'INSERT INTO Appointment (id, patientId, source, status, doctorName, specialityName, startsAt, endsAt, bookingFingerprint, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [id, '10000000-0000-4000-8000-000000000001', 'website', 'pending', 'Одинцов', 'Маммология', '2026-09-10T07:00:00.000Z', '2026-09-10T07:40:00.000Z', `v1:${'c3'.repeat(32)}`, createdAt, createdAt] })
}

async function pendingIntent(client, id, pendingUntil) {
  await client.execute({ sql: 'INSERT INTO BookingIntent (id, requestFingerprint, status, fencingToken, doctorSlug, appointmentType, doctorId, lpuId, specialityId, startsAt, endsAt, price, createdAt, updatedAt, pendingUntil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [id, `${'d4'.repeat(32)}`, 'pending', `fence-${id}`, 'odintsov', 'mammologist', 70120, 34871, 55, '2026-09-10T07:00:00.000Z', '2026-09-10T07:40:00.000Z', 5350, '2026-09-06T11:00:00.000Z', '2026-09-06T11:00:00.000Z', pendingUntil] })
}

describe('sweepStaleBookings', () => {
  it('moves a pending appointment older than fifteen minutes to needs_review', async () => {
    const client = await database()
    await pendingAppointment(client, '20000000-0000-4000-8000-000000000002', '2026-09-06T11:30:00.000Z')
    await sweepStaleBookings({ client, now: NOW })
    const row = await client.execute('SELECT status FROM Appointment')
    client.close()
    expect(row.rows[0].status).toBe('needs_review')
  })

  it('leaves a fresh pending appointment alone', async () => {
    const client = await database()
    await pendingAppointment(client, '20000000-0000-4000-8000-000000000002', '2026-09-06T11:50:00.000Z')
    const result = await sweepStaleBookings({ client, now: NOW })
    client.close()
    expect(result.appointments).toBe(0)
  })

  it('marks an intent whose pending window passed as uncertain', async () => {
    const client = await database()
    await pendingIntent(client, '30000000-0000-4000-8000-000000000003', '2026-09-06T11:40:00.000Z')
    await sweepStaleBookings({ client, now: NOW })
    const row = await client.execute('SELECT status FROM BookingIntent')
    client.close()
    expect(row.rows[0].status).toBe('uncertain')
  })

  it('rejects a non-positive staleness threshold', async () => {
    const client = await database()
    await expect(sweepStaleBookings({ client, now: NOW, staleAfterMinutes: 0 })).rejects.toThrow(TypeError)
    client.close()
  })
})
