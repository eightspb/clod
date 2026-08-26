import { createClient } from '@libsql/client'
import { parentPort, workerData } from 'node:worker_threads'
import { createBookingIntentRepository } from '../../lib/appointment-intents.js'

const SECRET = 'b6e4c180c71d4793a8f0dd46e25997c453ab520126bd9b1efef918409ca33872'
const NOW_ISO = '2026-08-25T12:00:00.000Z'
const CLAIM_ID = '07b33fb9-1ddc-4312-ac48-c44215753698'
const BOOKING = Object.freeze({
  doctorSlug: 'odintsov',
  appointmentType: 'mammologist',
  intentId: '148b0a0d-a98d-4762-8313-24075bd9da1a',
  dtStart: '2026-08-27T08:10:00.000Z',
  dtEnd: '2026-08-27T08:50:00.000Z',
  patient: Object.freeze({ firstName: 'Ле\u0308ля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '79215550129', birthday: '1988-02-29' }),
  comment: 'Нужен сурдопереводчик Ω',
  consent: true,
})
const SLOT = Object.freeze({ valid: true, doctorId: 70120, lpuId: 34871, specialityId: 55, price: 4_900, dtStart: '2026-08-27 11:10', dtEnd: '2026-08-27 11:50' })

function workerFence(index) {
  return `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
}

function safeError(error) {
  const code = typeof error?.code === 'string' ? error.code : error?.name
  return Object.freeze({ kind: 'error', code: typeof code === 'string' ? code : 'UNKNOWN' })
}

async function prepare(repository, mode) {
  if (mode === 'acquire') return undefined
  if (mode !== 'reconcile') throw new TypeError('Unknown booking intent race mode')
  const acquired = await repository.acquire({ booking: BOOKING, slot: SLOT })
  if (acquired.action !== 'reconcile' || !acquired.capability) throw new Error('Booking intent race prerequisite failed')
  return acquired.capability
}

async function compete(repository, mode, capability) {
  if (mode === 'acquire') {
    const acquired = await repository.acquire({ booking: BOOKING, slot: SLOT })
    return Object.freeze({ kind: 'result', action: acquired.action, status: acquired.public.status })
  }
  const reconciled = await repository.reconcile({ capability, history: { found: true, claimId: CLAIM_ID } })
  return Object.freeze({ kind: 'result', action: reconciled.action, status: reconciled.public.status, applied: reconciled.applied })
}

const barrier = new Int32Array(workerData.barrier)
const client = createClient({ url: `file:${workerData.path}` })
const repository = createBookingIntentRepository({ client, secret: SECRET, clock: () => new Date(NOW_ISO), uuid: () => workerFence(workerData.index) })
let capability
let preparationError
try {
  await client.execute('PRAGMA busy_timeout = 5000')
  capability = await prepare(repository, workerData.mode)
} catch (error) {
  preparationError = error
}
parentPort.postMessage({ type: 'ready' })
Atomics.wait(barrier, 0, 0)
let result
try {
  if (preparationError) throw preparationError
  result = await compete(repository, workerData.mode, capability)
} catch (error) {
  result = safeError(error)
} finally {
  client.close()
}
parentPort.postMessage({ type: 'result', value: result })
Atomics.wait(barrier, 1, 0)
