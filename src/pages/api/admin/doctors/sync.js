export const prerender = false

import { db } from '../../../../lib/database.js'
import { guardAdminWrite } from '../../../../lib/admin-api.js'
import { createAdminDoctorSync } from '../../../../lib/admin-doctor-sync.js'

const HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: HEADERS })
}

function options(input) {
  const workflow = input.workflow
  const guard = input.guard ?? guardAdminWrite
  const log = input.log ?? ((stage) => console.error('[admin/doctors/sync]', stage))
  if (![workflow, guard, log].every((value) => typeof value === 'function')) throw new TypeError('Doctor sync endpoint adapters are invalid')
  return Object.freeze({ workflow, guard, log })
}

/**
 * Creates the protected Medflex doctor synchronization endpoint.
 */
export function createDoctorSyncEndpoint(input) {
  const configuration = options(input)
  return async function doctorSyncEndpoint({ request }) {
    const blocked = await configuration.guard(request)
    if (blocked) return blocked
    try {
      return json(await configuration.workflow().sync(), 200)
    } catch {
      try { configuration.log('SYNC_FAILED') } catch { return json({ error: 'DOCTORS_SYNC_UNAVAILABLE', message: 'Не удалось обновить врачей из Medflex' }, 503) }
      return json({ error: 'DOCTORS_SYNC_UNAVAILABLE', message: 'Не удалось обновить врачей из Medflex' }, 503)
    }
  }
}

export const POST = createDoctorSyncEndpoint({ workflow: () => createAdminDoctorSync({ client: db.$client }) })
