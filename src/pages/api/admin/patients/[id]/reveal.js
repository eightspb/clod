export const prerender = false

import { db } from 'astro:db'
import { createPatientRevealEndpoint } from '../../../../../lib/admin-patient-api.js'
import { createPatientRecords } from '../../../../../lib/patient-records.js'

function environment(name) {
  const value = import.meta.env[name] || process.env[name]
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} environment variable is required`)
  return value
}

function records() {
  return createPatientRecords({ client: db.$client, fingerprintKey: environment('CONTACT_FINGERPRINT_KEY'), encryptionKey: environment('PATIENT_ENCRYPTION_KEY') })
}

function log(stage) {
  console.error('[admin/patients/[id]/reveal]', stage)
}

export { createPatientRevealEndpoint }
export const POST = createPatientRevealEndpoint({ records, log })
