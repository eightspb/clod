export const prerender = false

import { db } from '../../../../lib/database.js'
import { createPatientDetailEndpoint } from '../../../../lib/admin-patient-api.js'
import { createMangoCallRecords } from '../../../../lib/mango-call-records.js'
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

function calls() {
  return createMangoCallRecords({ client: db.$client, fingerprintKey: environment('CONTACT_FINGERPRINT_KEY'), encryptionKey: environment('MANGO_CALL_ENCRYPTION_KEY'), patientEncryptionKey: environment('PATIENT_ENCRYPTION_KEY') })
}

function log(stage) {
  console.error('[admin/patients/[id]]', stage)
}

export { createPatientDetailEndpoint }
export const GET = createPatientDetailEndpoint({ records, history, calls, log })
