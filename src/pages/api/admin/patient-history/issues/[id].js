export const prerender = false

import { db } from '../../../../../lib/database.js'
import { createPatientHistoryIssueResolveEndpoint } from '../../../../../lib/admin-patient-history-api.js'
import { createPatientHistoryRecords } from '../../../../../lib/patient-history-records.js'

function environment(name) {
  const value = process.env[name]
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} environment variable is required`)
  return value
}

function history() {
  return createPatientHistoryRecords({ client: db.$client, encryptionKey: environment('PATIENT_ENCRYPTION_KEY') })
}

function log(stage) {
  console.error('[admin/patient-history/issues/[id]]', stage)
}

export { createPatientHistoryIssueResolveEndpoint }
export const PATCH = createPatientHistoryIssueResolveEndpoint({ history, log })
