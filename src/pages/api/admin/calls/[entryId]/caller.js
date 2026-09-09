export const prerender = false

import { guardAdminPii, guardAdminRole } from '../../../../../lib/admin-api.js'
import { db } from '../../../../../lib/database.js'
import { createCallCallerEndpoint } from '../../../../../lib/admin-call-api.js'
import { createMangoCallRecords } from '../../../../../lib/mango-call-records.js'

function environment(name) {
  const value = process.env[name]
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} environment variable is required`)
  return value
}

function records() {
  return createMangoCallRecords({ client: db.$client, fingerprintKey: environment('CONTACT_FINGERPRINT_KEY'), encryptionKey: environment('MANGO_CALL_ENCRYPTION_KEY') })
}

function log(stage) {
  console.error('[admin/calls/[entryId]/caller]', stage)
}

/** Destruction of a caller number is reserved for the admin role. */
function guard(request) {
  return guardAdminRole(request, { guard: guardAdminPii })
}

export { createCallCallerEndpoint }
export const DELETE = createCallCallerEndpoint({ records, guard, log })
