export const prerender = false

import { db } from 'astro:db'
import { createAdminAppointment } from '../../../../lib/admin-appointment.js'
import { createAppointmentDetailEndpoint } from '../../../../lib/admin-appointment-api.js'
import { createAppointmentBooking } from '../../../../lib/appointment-booking.js'
import { createAppointmentRecords } from '../../../../lib/appointment-records.js'
import { createMedflexClient } from '../../../../lib/medflex-client.js'

function environment(name) {
  const value = import.meta.env[name] || process.env[name]
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} environment variable is required`)
  return value
}

function workflow() {
  const records = createAppointmentRecords({ client: db.$client, fingerprintKey: environment('CONTACT_FINGERPRINT_KEY'), encryptionKey: environment('PATIENT_ENCRYPTION_KEY') })
  const booking = createAppointmentBooking({ intentClient: db.$client, appointmentRecords: records, source: 'admin_medflex' })
  return createAdminAppointment({ records, booking, medflex: createMedflexClient })
}

function log(stage) {
  console.error('[admin/appointments/[id]]', stage)
}

export { createAppointmentDetailEndpoint }
export const GET = createAppointmentDetailEndpoint({ workflow, log })
