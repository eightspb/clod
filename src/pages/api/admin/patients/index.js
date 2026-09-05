export const prerender = false

import { db } from '../../../../lib/database.js'
import { createPatientIndexEndpoint } from '../../../../lib/admin-patient-api.js'
import { createPatientHistoryRecords } from '../../../../lib/patient-history-records.js'
import { createPatientRecords } from '../../../../lib/patient-records.js'

function environment(name) {
  const value = process.env[name]
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} environment variable is required`)
  return value
}

function records() {
  return createPatientRecords({ client: db.$client, fingerprintKey: environment('CONTACT_FINGERPRINT_KEY'), encryptionKey: environment('PATIENT_ENCRYPTION_KEY') })
}

function history() {
  return createPatientHistoryRecords({ client: db.$client, encryptionKey: environment('PATIENT_ENCRYPTION_KEY') })
}

function log(stage) {
  console.error('[admin/patients]', stage)
}

export { createPatientIndexEndpoint }
export const GET = createPatientIndexEndpoint({ records, history, log })
