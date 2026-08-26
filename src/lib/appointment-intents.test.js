import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Worker } from 'node:worker_threads'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { BookingIntentError, createBookingIntentRepository } from './appointment-intents.js'

const SECRET = 'b6e4c180c71d4793a8f0dd46e25997c453ab520126bd9b1efef918409ca33872'
const NOW_ISO = '2026-08-25T12:00:00.000Z'
const FIRST_INTENT_ID = '148b0a0d-a98d-4762-8313-24075bd9da1a'
const SECOND_INTENT_ID = 'cc0be2bb-4cb4-45df-8e3d-09820302a580'
const FIRST_FENCE = '8120f747-1157-48d1-89fd-1c741439f913'
const SECOND_FENCE = '0319d642-d90b-4d0c-9c72-cde506139631'
const THIRD_FENCE = 'e39c58b2-0dcc-497f-accc-4bf3c6a2bc75'
const CLAIM_ID = '07b33fb9-1ddc-4312-ac48-c44215753698'
const OTHER_CLAIM_ID = 'e1116436-0b89-4c5e-956a-872ed0d61624'
const EXPECTED_FINGERPRINT = 'v1:6c66b86785401730db208618199c850021e24124c7cc9d617775bd0206e97884'
const RACE_WORKER = resolve(process.cwd(), 'src/test/fixtures/appointment-intent-race-worker.mjs')
const TABLE_SQL = `CREATE TABLE BookingIntent (
  id TEXT PRIMARY KEY,
  requestFingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  fencingToken TEXT,
  doctorSlug TEXT NOT NULL,
  appointmentType TEXT NOT NULL,
  doctorId INTEGER NOT NULL,
  lpuId INTEGER NOT NULL,
  specialityId INTEGER NOT NULL,
  startsAt TEXT NOT NULL,
  endsAt TEXT NOT NULL,
  price INTEGER NOT NULL,
  medflexClaimId TEXT,
  failureCode TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  pendingUntil TEXT NOT NULL
)`
const INDEX_SQL = Object.freeze([
  'CREATE UNIQUE INDEX BookingIntent_requestFingerprint_unique ON BookingIntent(requestFingerprint)',
  'CREATE UNIQUE INDEX BookingIntent_medflexClaimId_unique ON BookingIntent(medflexClaimId)',
  'CREATE UNIQUE INDEX BookingIntent_fencingToken_unique ON BookingIntent(fencingToken)',
  'CREATE INDEX BookingIntent_status_pendingUntil_idx ON BookingIntent(status, pendingUntil)',
  'CREATE INDEX BookingIntent_resumeScope_idx ON BookingIntent(doctorSlug, appointmentType, startsAt, endsAt)',
])

function booking(overrides = {}) {
  const patient = Object.hasOwn(overrides, 'patient') ? overrides.patient : {
    firstName: 'Ле\u0308ля',
    lastName: 'О’Коннор-Сидорова',
    secondName: 'Алиевна',
    phone: '79215550129',
    birthday: '1988-02-29',
  }
  return {
    doctorSlug: 'odintsov',
    appointmentType: 'mammologist',
    intentId: FIRST_INTENT_ID,
    dtStart: '2026-08-27T08:10:00.000Z',
    dtEnd: '2026-08-27T08:50:00.000Z',
    patient,
    comment: 'Нужен сурдопереводчик Ω',
    consent: true,
    ...overrides,
  }
}

function slot(overrides = {}) {
  return {
    valid: true,
    doctorId: 70120,
    lpuId: 34871,
    specialityId: 55,
    price: 4_900,
    dtStart: '2026-08-27 11:10',
    dtEnd: '2026-08-27 11:50',
    ...overrides,
  }
}

function sequence(values) {
  let index = 0
  return () => values[index++]
}

async function fixture(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'clod-booking-intents-'))
  const path = join(directory, 'intents.sqlite')
  const client = createClient({ url: `file:${path}` })
  await client.execute(TABLE_SQL)
  for (const sql of INDEX_SQL) await client.execute(sql)
  const clock = options.clock ?? (() => new Date(NOW_ISO))
  const uuid = options.uuid ?? sequence([FIRST_FENCE, SECOND_FENCE, THIRD_FENCE])
  const repository = createBookingIntentRepository({ client, secret: options.secret ?? SECRET, clock, uuid })
  return { client, path, repository }
}

function peer(path, options = {}) {
  const client = createClient({ url: `file:${path}` })
  const repository = createBookingIntentRepository({ client, secret: SECRET, clock: options.clock ?? (() => new Date(NOW_ISO)), uuid: options.uuid ?? (() => crypto.randomUUID()) })
  return { client, repository }
}

async function together(operations) {
  let release
  const start = new Promise((resolve) => { release = resolve })
  const pending = operations.map((operation) => start.then(operation))
  release()
  return Promise.all(pending)
}

async function storedRows(client) {
  const result = await client.execute('SELECT * FROM BookingIntent ORDER BY id')
  return [...result.rows]
}

async function closeWith(client, value) {
  client.close()
  return value
}

function closeAll(fixtures) {
  for (const { client } of fixtures) client.close()
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise })
  return { promise, resolve, reject }
}

function raceActor(workerData) {
  const ready = deferred()
  const result = deferred()
  const fault = deferred()
  const exited = deferred()
  const worker = new Worker(RACE_WORKER, { workerData })
  worker.on('message', (message) => {
    if (message?.type === 'ready') ready.resolve()
    else if (message?.type === 'result') result.resolve(message.value)
    else fault.reject(new Error('Booking intent race worker sent an invalid message'))
  })
  worker.once('error', (error) => fault.reject(error))
  worker.once('exit', (code) => code === 0 ? exited.resolve() : exited.reject(new Error(`Booking intent race worker exited with code ${code}`)))
  return { worker, ready: Promise.race([ready.promise, fault.promise]), result: Promise.race([result.promise, fault.promise]), exited: exited.promise }
}

async function workerRace(path, mode, count = 8) {
  const barrier = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2)
  const state = new Int32Array(barrier)
  const actors = Array.from({ length: count }, (_value, index) => raceActor({ barrier, index, mode, path }))
  try {
    await Promise.all(actors.map((actor) => actor.ready))
    Atomics.store(state, 0, 1)
    Atomics.notify(state, 0, count)
    const results = await Promise.all(actors.map((actor) => actor.result))
    Atomics.store(state, 1, 1)
    Atomics.notify(state, 1, count)
    await Promise.all(actors.map((actor) => actor.exited))
    return results
  } finally {
    Atomics.store(state, 0, 1)
    Atomics.store(state, 1, 1)
    Atomics.notify(state, 0, count)
    Atomics.notify(state, 1, count)
    await Promise.allSettled(actors.map((actor) => actor.exited))
    await Promise.allSettled(actors.filter(({ worker }) => worker.threadId !== -1).map(({ worker }) => worker.terminate()))
  }
}

function isBusy(result) {
  return result.kind === 'error' && result.code.startsWith('SQLITE_BUSY')
}

describe('booking intent fingerprints', () => {
  it('produces one versioned deterministic HMAC for canonically equal Unicode', async () => {
    const first = await fixture({})
    const combined = booking({ patient: { ...booking({}).patient, firstName: 'Лёля' } })
    const values = [first.repository.fingerprint({ booking: booking({}), slot: slot({}) }), first.repository.fingerprint({ booking: combined, slot: slot({}) })]
    const result = await closeWith(first.client, values)
    expect(result).toEqual([EXPECTED_FINGERPRINT, EXPECTED_FINGERPRINT])
  })

  it('excludes the browser intent identifier from request identity', async () => {
    const first = await fixture({})
    const values = [FIRST_INTENT_ID, SECOND_INTENT_ID].map((intentId) => first.repository.fingerprint({ booking: booking({ intentId }), slot: slot({}) }))
    const result = await closeWith(first.client, values)
    expect(new Set(result).size).toBe(1)
  })

  it('changes request identity when semantic patient or trusted slot data changes', async () => {
    const first = await fixture({})
    const base = first.repository.fingerprint({ booking: booking({}), slot: slot({}) })
    const phone = first.repository.fingerprint({ booking: booking({ patient: { ...booking({}).patient, phone: '79161234567' } }), slot: slot({}) })
    const price = first.repository.fingerprint({ booking: booking({}), slot: slot({ price: 5_300 }) })
    const result = await closeWith(first.client, [base, phone, price])
    expect(new Set(result).size).toBe(3)
  })

  it.each([
    ['missing', undefined],
    ['weak', 'token-secret'],
  ])('fails fast when the dedicated runtime secret is %s', async (_label, secret) => {
    const directory = await mkdtemp(join(tmpdir(), 'clod-weak-secret-'))
    const client = createClient({ url: `file:${join(directory, 'intents.sqlite')}` })
    const operation = () => createBookingIntentRepository({ client, secret, clock: () => new Date(NOW_ISO), uuid: () => FIRST_FENCE })
    const type = (() => { try { operation(); return undefined } catch (error) { return error.constructor } })()
    const result = await closeWith(client, type)
    expect(result).toBe(TypeError)
  })

  it('rejects the removed retention TTL option instead of implying automatic retirement', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'clod-retention-option-'))
    const client = createClient({ url: `file:${join(directory, 'intents.sqlite')}` })
    const operation = () => createBookingIntentRepository({ client, secret: SECRET, clock: () => new Date(NOW_ISO), uuid: () => FIRST_FENCE, retentionTtlMs: 300_000 })
    const type = (() => { try { operation(); return undefined } catch (error) { return error.constructor } })()
    const result = await closeWith(client, type)
    expect(result).toBe(TypeError)
  })
})

describe('booking intent acquisition', () => {
  it('grants exactly one paid-attempt capability across parallel acquires', async () => {
    const first = await fixture({ uuid: () => crypto.randomUUID() })
    const outcomes = await Promise.all(Array.from({ length: 24 }, () => first.repository.acquire({ booking: booking({}), slot: slot({}) })))
    const result = await closeWith(first.client, outcomes.filter(({ action }) => action === 'dispatch').length)
    expect(result).toBe(1)
  })

  it('grants one owner across independent database connections released together', async () => {
    const first = await fixture({ uuid: () => crypto.randomUUID() })
    const peers = Array.from({ length: 8 }, () => peer(first.path))
    const outcomes = await together([first, ...peers].map(({ repository }) => () => repository.acquire({ booking: booking({}), slot: slot({}) })))
    const result = outcomes.filter(({ action }) => action === 'dispatch').length
    closeAll([first, ...peers])
    expect(result).toBe(1)
  })

  it('grants one owner when independent worker threads acquire on the same start signal', async () => {
    const first = await fixture({ uuid: () => FIRST_FENCE })
    first.client.close()
    const outcomes = await workerRace(first.path, 'acquire')
    const dispatches = outcomes.filter((outcome) => outcome.kind === 'result' && outcome.action === 'dispatch').length
    const unsafe = outcomes.filter((outcome) => outcome.kind === 'result' ? !['dispatch', 'pending'].includes(outcome.action) || outcome.status !== 'pending' : !isBusy(outcome))
    expect({ dispatches, unsafe }).toEqual({ dispatches: 1, unsafe: [] })
  }, 20_000)

  it('returns the active state for the same intent and fingerprint', async () => {
    const first = await fixture({})
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const replay = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const result = await closeWith(first.client, { action: replay.action, status: replay.public.status })
    expect(result).toEqual({ action: 'pending', status: 'pending' })
  })

  it.each(['pending', 'confirmed', 'uncertain', 'failed'])('returns one generic duplicate for cross-ID %s matches through acquire and resume', async (status) => {
    const first = await fixture({})
    const original = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    if (status === 'confirmed') await first.repository.confirm({ capability: original.capability, claimId: CLAIM_ID })
    if (status === 'uncertain') await first.repository.markUncertain({ capability: original.capability })
    if (status === 'failed') await first.repository.fail({ capability: original.capability, failureCode: 'SLOT_UNAVAILABLE' })
    const crossId = booking({ intentId: SECOND_INTENT_ID })
    const resumed = await first.repository.resume({ booking: crossId })
    const reacquired = await first.repository.acquire({ booking: crossId, slot: slot({}) })
    const serialized = JSON.stringify([resumed, reacquired])
    const forbidden = [FIRST_INTENT_ID, CLAIM_ID, FIRST_FENCE, 'odintsov', 'mammologist', '2026-08-27', '4900', '79215550129', 'SLOT_UNAVAILABLE']
    const result = await closeWith(first.client, { resumed, reacquired, frozen: [resumed, resumed.public, reacquired, reacquired.public].every(Object.isFrozen), capabilities: [resumed, reacquired].some((value) => Object.hasOwn(value, 'capability')), leaks: forbidden.some((value) => serialized.includes(value)), dispatches: [original, resumed, reacquired].filter(({ action }) => action === 'dispatch').length })
    expect(result).toEqual({ resumed: { action: 'duplicate', public: { status: 'duplicate' } }, reacquired: { action: 'duplicate', public: { status: 'duplicate' } }, frozen: true, capabilities: false, leaks: false, dispatches: 1 })
  })

  it('returns a safe mismatch for one intent identifier with changed semantics', async () => {
    const first = await fixture({})
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const replay = await first.repository.acquire({ booking: booking({ comment: 'Другой семантический запрос' }), slot: slot({}) })
    const result = await closeWith(first.client, replay)
    expect(result).toEqual({ action: 'mismatch', public: { status: 'mismatch' } })
  })

  it('does not reveal a separate fingerprint row through an exact-ID mismatch', async () => {
    const first = await fixture({ uuid: () => crypto.randomUUID() })
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const withoutFingerprintRow = await first.repository.acquire({ booking: booking({ comment: 'Иная заявка' }), slot: slot({}) })
    await first.repository.acquire({ booking: booking({ intentId: SECOND_INTENT_ID, comment: 'Иная заявка' }), slot: slot({}) })
    let withFingerprintRow
    try { withFingerprintRow = await first.repository.acquire({ booking: booking({ intentId: FIRST_INTENT_ID, comment: 'Иная заявка' }), slot: slot({}) }) } catch (error) { withFingerprintRow = { type: error.constructor, code: error.code } }
    const rows = await storedRows(first.client)
    const result = await closeWith(first.client, { withoutFingerprintRow, withFingerprintRow, frozen: Object.isFrozen(withoutFingerprintRow) && Object.isFrozen(withFingerprintRow), rows: rows.length })
    expect(result).toEqual({ withoutFingerprintRow: { action: 'mismatch', public: { status: 'mismatch' } }, withFingerprintRow: { action: 'mismatch', public: { status: 'mismatch' } }, frozen: true, rows: 2 })
  })

  it('fails closed when stored trusted scope no longer matches its fingerprint', async () => {
    const first = await fixture({})
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.client.execute({ sql: 'UPDATE BookingIntent SET price = ? WHERE id = ?', args: [99_999, FIRST_INTENT_ID] })
    let error
    try { await first.repository.acquire({ booking: booking({}), slot: slot({}) }) } catch (caught) { error = caught }
    const result = await closeWith(first.client, { type: error?.constructor, code: error?.code })
    expect(result).toEqual({ type: BookingIntentError, code: 'BOOKING_INTENT_INVARIANT' })
  })

  it('stores no raw patient data and exposes no fingerprint or fence publicly', async () => {
    const first = await fixture({})
    const outcome = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const rows = await storedRows(first.client)
    const serialized = JSON.stringify({ public: outcome.public, capability: outcome.capability })
    const forbidden = ['Лёля', 'О’Коннор', 'Алиевна', '79215550129', '1988-02-29', 'сурдопереводчик', 'requestFingerprint', 'fencingToken']
    const result = await closeWith(first.client, forbidden.every((value) => !JSON.stringify(outcome.public).includes(value)) && forbidden.slice(0, 6).every((value) => !JSON.stringify(rows).includes(value)) && !serialized.includes(FIRST_FENCE))
    expect(result).toBe(true)
  })

  it('deeply freezes the outcome, public projection, and opaque capability', async () => {
    const first = await fixture({})
    const outcome = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const result = await closeWith(first.client, [outcome, outcome.public, outcome.capability].every(Object.isFrozen))
    expect(result).toBe(true)
  })

  it('does not mutate booking or trusted slot input', async () => {
    const first = await fixture({})
    const input = { booking: booking({}), slot: slot({}) }
    const snapshot = structuredClone(input)
    await first.repository.acquire(input)
    const result = await closeWith(first.client, input)
    expect(result).toEqual(snapshot)
  })
})

describe('booking intent resume', () => {
  it('replays a confirmed request without requiring the slot to remain available', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const confirmed = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const replay = await first.repository.resume({ booking: booking({ patient: { ...booking({}).patient, firstName: 'Лёля' } }) })
    const result = await closeWith(first.client, { same: replay.public === confirmed.public || JSON.stringify(replay.public) === JSON.stringify(confirmed.public), action: replay.action, frozen: Object.isFrozen(replay) && Object.isFrozen(replay.public), capability: Object.hasOwn(replay, 'capability') })
    expect(result).toEqual({ same: true, action: 'confirmed', frozen: true, capability: false })
  })

  it('resumes uncertainty for the exact intent ID and returns a local opaque capability', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.markUncertain({ capability: acquired.capability })
    const replay = await first.repository.resume({ booking: booking({}) })
    const reconciled = await first.repository.reconcile({ capability: replay.capability, history: { found: true, claimId: CLAIM_ID } })
    const result = await closeWith(first.client, { action: replay.action, intentId: replay.public.intentId, capability: Object.isFrozen(replay.capability), applied: reconciled.applied, status: reconciled.public.status })
    expect(result).toEqual({ action: 'reconcile', intentId: FIRST_INTENT_ID, capability: true, applied: true, status: 'confirmed' })
  })

  it('gives an exact intent-ID mismatch priority over separate fingerprint recovery', async () => {
    const first = await fixture({})
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const mismatch = await first.repository.resume({ booking: booking({ comment: 'Другой семантический запрос' }) })
    await first.repository.acquire({ booking: booking({ intentId: SECOND_INTENT_ID, comment: 'Иная заявка' }), slot: slot({}) })
    let separateFingerprint
    try { separateFingerprint = await first.repository.resume({ booking: booking({ intentId: SECOND_INTENT_ID }) }) } catch (error) { separateFingerprint = { type: error.constructor, code: error.code } }
    const result = await closeWith(first.client, { mismatch, separateFingerprint })
    expect(result).toEqual({ mismatch: { action: 'mismatch', public: { status: 'mismatch' } }, separateFingerprint: { action: 'mismatch', public: { status: 'mismatch' } } })
  })

  it('never grants new or retry ownership until acquire receives a verified live slot', async () => {
    const first = await fixture({})
    const missing = await first.repository.resume({ booking: booking({}) })
    let newError
    try { await first.repository.acquire({ booking: booking({}), slot: slot({ valid: false }) }) } catch (caught) { newError = caught }
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: acquired.capability, failureCode: 'SLOT_UNAVAILABLE' })
    const failed = await first.repository.resume({ booking: booking({}) })
    let retryError
    try { await first.repository.acquire({ booking: booking({}), slot: slot({ valid: false }) }) } catch (caught) { retryError = caught }
    const retried = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const result = await closeWith(first.client, { missing, newError: newError?.constructor, failedAction: failed.action, failedStatus: failed.public.status, hasCapability: Object.hasOwn(failed, 'capability'), retryError: retryError?.constructor, retried: retried.action })
    expect(result).toEqual({ missing: { action: 'validate', public: { status: 'not_found' } }, newError: TypeError, failedAction: 'validate', failedStatus: 'failed', hasCapability: false, retryError: TypeError, retried: 'retry' })
  })

  it('expires pending during resume without exposing its capability while active', async () => {
    let current = new Date(NOW_ISO)
    const first = await fixture({ clock: () => new Date(current) })
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const active = await first.repository.resume({ booking: booking({}) })
    current = new Date('2026-08-25T12:03:00.000Z')
    const expired = await first.repository.resume({ booking: booking({}) })
    const result = await closeWith(first.client, { activeAction: active.action, activeCapability: Object.hasOwn(active, 'capability'), expiredAction: expired.action, expiredCapability: Object.isFrozen(expired.capability) })
    expect(result).toEqual({ activeAction: 'pending', activeCapability: false, expiredAction: 'reconcile', expiredCapability: true })
  })

  it('fails closed when the ID row visible scope was tampered before resume', async () => {
    const first = await fixture({})
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.client.execute({ sql: 'UPDATE BookingIntent SET doctorSlug = ? WHERE id = ?', args: ['tampered', FIRST_INTENT_ID] })
    let error
    try { await first.repository.resume({ booking: booking({}) }) } catch (caught) { error = caught }
    const result = await closeWith(first.client, { type: error?.constructor, code: error?.code })
    expect(result).toEqual({ type: BookingIntentError, code: 'BOOKING_INTENT_INVARIANT' })
  })

  it.each([
    ['confirmed', 'confirmed', false],
    ['uncertain', 'reconcile', true],
  ])('resumes an exact %s intent before bounding an overflowing shared scope', async (status, action, capability) => {
    const first = await fixture({ uuid: () => crypto.randomUUID() })
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    if (status === 'confirmed') await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    if (status === 'uncertain') await first.repository.markUncertain({ capability: acquired.capability })
    for (let index = 0; index < 33; index += 1) {
      const patient = { ...booking({}).patient, phone: `79${String(index).padStart(9, '0')}` }
      await first.repository.acquire({ booking: booking({ intentId: crypto.randomUUID(), patient, comment: `overflow-${index}` }), slot: slot({}) })
    }
    let replay
    try { replay = await first.repository.resume({ booking: booking({}) }) } catch (error) { replay = { errorType: error.constructor, errorCode: error.code } }
    const result = await closeWith(first.client, Object.hasOwn(replay, 'errorType') ? replay : { action: replay.action, status: replay.public.status, capability: Object.hasOwn(replay, 'capability') })
    expect(result).toEqual({ action, status, capability })
  })

  it('fails closed when a resume scope exceeds the bounded candidate set', async () => {
    const first = await fixture({ uuid: () => crypto.randomUUID() })
    for (let index = 0; index < 33; index += 1) {
      const patient = { ...booking({}).patient, phone: `79${String(index).padStart(9, '0')}` }
      await first.repository.acquire({ booking: booking({ intentId: crypto.randomUUID(), patient, comment: `candidate-${index}` }), slot: slot({}) })
    }
    let error
    try { await first.repository.resume({ booking: booking({ intentId: crypto.randomUUID(), comment: 'not-a-candidate' }) }) } catch (caught) { error = caught }
    const result = await closeWith(first.client, { type: error?.constructor, code: error?.code })
    expect(result).toEqual({ type: BookingIntentError, code: 'BOOKING_INTENT_INVARIANT' })
  })
})

describe('booking intent transitions', () => {
  it('replays the same minimal confirmation after a confirmed request', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const confirmed = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const replay = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const result = await closeWith(first.client, [confirmed.public, replay.public])
    expect(result).toEqual([result[0], result[0]])
  })

  it.each([
    ['confirmation', 'confirm', 'confirmed'],
    ['failure', 'fail', 'failed'],
    ['uncertainty', 'markUncertain', 'uncertain'],
  ])('keeps updatedAt monotonic when the clock rolls back before %s', async (_label, method, status) => {
    let current = new Date(NOW_ISO)
    const first = await fixture({ clock: () => new Date(current) })
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    current = new Date('2026-08-25T11:59:59.999Z')
    const operations = {
      confirm: () => first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID }),
      fail: () => first.repository.fail({ capability: acquired.capability, failureCode: 'SLOT_UNAVAILABLE' }),
      markUncertain: () => first.repository.markUncertain({ capability: acquired.capability }),
    }
    let transition
    let error
    try { transition = await operations[method]() } catch (caught) { error = caught }
    const [stored] = await storedRows(first.client)
    const result = await closeWith(first.client, { error: error?.constructor, applied: transition?.applied, status: stored.status, updatedAt: stored.updatedAt })
    expect(result).toEqual({ error: undefined, applied: true, status, updatedAt: NOW_ISO })
  })

  it('keeps reconciliation time monotonic when the clock rolls back', async () => {
    let current = new Date(NOW_ISO)
    const first = await fixture({ clock: () => new Date(current) })
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const uncertain = await first.repository.markUncertain({ capability: acquired.capability })
    current = new Date('2026-08-25T11:59:59.999Z')
    let reconciled
    let error
    try { reconciled = await first.repository.reconcile({ capability: uncertain.capability, history: { found: true, claimId: CLAIM_ID } }) } catch (caught) { error = caught }
    const [stored] = await storedRows(first.client)
    const result = await closeWith(first.client, { error: error?.constructor, applied: reconciled?.applied, status: stored.status, updatedAt: stored.updatedAt })
    expect(result).toEqual({ error: undefined, applied: true, status: 'confirmed', updatedAt: NOW_ISO })
  })

  it('bases a retry lease on stored monotonic time when the clock rolls back', async () => {
    let current = new Date(NOW_ISO)
    const first = await fixture({ clock: () => new Date(current) })
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: acquired.capability, failureCode: 'SLOT_UNAVAILABLE' })
    current = new Date('2026-08-25T11:59:59.999Z')
    let retried
    let error
    try { retried = await first.repository.acquire({ booking: booking({}), slot: slot({}) }) } catch (caught) { error = caught }
    const [stored] = await storedRows(first.client)
    const result = await closeWith(first.client, { error: error?.constructor, action: retried?.action, status: stored.status, updatedAt: stored.updatedAt, pendingUntil: stored.pendingUntil })
    expect(result).toEqual({ error: undefined, action: 'retry', status: 'pending', updatedAt: NOW_ISO, pendingUntil: '2026-08-25T12:02:00.000Z' })
  })

  it('retries only an allowlisted safe failure with a fresh fence', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: acquired.capability, failureCode: 'SLOT_UNAVAILABLE' })
    const retried = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const stale = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const result = await closeWith(first.client, { action: retried.action, staleApplied: stale.applied })
    expect(result).toEqual({ action: 'retry', staleApplied: false })
  })

  it('retries a local persistence failure with a fresh fenced capability', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const failed = await first.repository.fail({ capability: acquired.capability, failureCode: 'LOCAL_PERSISTENCE_FAILED' })
    const retried = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const stale = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const result = await closeWith(first.client, { failed: failed.public.failureCode, action: retried.action, fresh: retried.capability !== acquired.capability, staleApplied: stale.applied })
    expect(result).toEqual({ failed: 'LOCAL_PERSISTENCE_FAILED', action: 'retry', fresh: true, staleApplied: false })
  })

  it('revalidates a definitive upstream non-acceptance before granting a fresh retry capability', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const failed = await first.repository.fail({ capability: acquired.capability, failureCode: 'UPSTREAM_NOT_ACCEPTED' })
    const resumed = await first.repository.resume({ booking: booking({}) })
    const retried = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const stale = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const confirmed = await first.repository.confirm({ capability: retried.capability, claimId: CLAIM_ID })
    const result = await closeWith(first.client, { failed: [failed.applied, failed.public.status, failed.public.failureCode], resumed: [resumed.action, resumed.public.status, Object.hasOwn(resumed, 'capability')], retried: [retried.action, Object.isFrozen(retried.capability), retried.capability !== acquired.capability], staleApplied: stale.applied, confirmed: [confirmed.applied, confirmed.public.status] })
    expect(result).toEqual({ failed: [true, 'failed', 'UPSTREAM_NOT_ACCEPTED'], resumed: ['validate', 'failed', false], retried: ['retry', true, true], staleApplied: false, confirmed: [true, 'confirmed'] })
  })

  it('rejects a lookalike upstream failure code without changing the pending owner', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    let error
    try { await first.repository.fail({ capability: acquired.capability, failureCode: 'UPSTREAM_NOT_ACCEPTED_WITHOUT_PROOF' }) } catch (caught) { error = caught }
    const replay = await first.repository.resume({ booking: booking({}) })
    const result = await closeWith(first.client, { type: error?.constructor, action: replay.action, status: replay.public.status })
    expect(result).toEqual({ type: TypeError, action: 'pending', status: 'pending' })
  })

  it('fails closed when the UUID source repeats the current failed-attempt fence', async () => {
    const first = await fixture({ uuid: () => FIRST_FENCE })
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: acquired.capability, failureCode: 'SLOT_UNAVAILABLE' })
    let retryError
    try { await first.repository.acquire({ booking: booking({}), slot: slot({}) }) } catch (caught) { retryError = caught }
    const stale = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const [stored] = await storedRows(first.client)
    const result = await closeWith(first.client, { retryError: retryError?.constructor, staleApplied: stale.applied, status: stored.status })
    expect(result).toEqual({ retryError: BookingIntentError, staleApplied: false, status: 'failed' })
  })

  it('does not revive an older capability when a later retry candidate repeats its UUID', async () => {
    const first = await fixture({ uuid: sequence([FIRST_FENCE, SECOND_FENCE, FIRST_FENCE]) })
    const firstAttempt = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: firstAttempt.capability, failureCode: 'SLOT_UNAVAILABLE' })
    const secondAttempt = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: secondAttempt.capability, failureCode: 'SLOT_UNAVAILABLE' })
    const thirdAttempt = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const firstStale = await first.repository.confirm({ capability: firstAttempt.capability, claimId: CLAIM_ID })
    const secondStale = await first.repository.markUncertain({ capability: secondAttempt.capability })
    const [stored] = await storedRows(first.client)
    const result = await closeWith(first.client, { action: thirdAttempt.action, firstApplied: firstStale.applied, secondApplied: secondStale.applied, status: stored.status })
    expect(result).toEqual({ action: 'retry', firstApplied: false, secondApplied: false, status: 'pending' })
  })

  it('does not retry a non-retryable allowlisted failure', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: acquired.capability, failureCode: 'PATIENT_REJECTED' })
    const replay = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const result = await closeWith(first.client, { action: replay.action, status: replay.public.status })
    expect(result).toEqual({ action: 'failed', status: 'failed' })
  })

  it('turns an expired pending attempt uncertain without reclaiming it', async () => {
    let current = new Date(NOW_ISO)
    const first = await fixture({ clock: () => new Date(current), uuid: sequence([FIRST_FENCE, SECOND_FENCE]) })
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    current = new Date('2026-08-25T12:03:00.000Z')
    const replay = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const result = await closeWith(first.client, { action: replay.action, status: replay.public.status })
    expect(result).toEqual({ action: 'reconcile', status: 'uncertain' })
  })

  it('blocks a blind paid retry after post-dispatch uncertainty', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.markUncertain({ capability: acquired.capability })
    const replay = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const result = await closeWith(first.client, replay.action)
    expect(result).toBe('reconcile')
  })

  it('confirms an uncertain request only after positive history reconciliation', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const uncertain = await first.repository.markUncertain({ capability: acquired.capability })
    const reconciled = await first.repository.reconcile({ capability: uncertain.capability, history: { found: true, claimId: CLAIM_ID } })
    const result = await closeWith(first.client, { applied: reconciled.applied, status: reconciled.public.status, claimId: reconciled.public.claimId })
    expect(result).toEqual({ applied: true, status: 'confirmed', claimId: CLAIM_ID })
  })

  it('leaves an uncertain request unchanged when history has no result', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const uncertain = await first.repository.markUncertain({ capability: acquired.capability })
    const reconciled = await first.repository.reconcile({ capability: uncertain.capability, history: { found: false } })
    const result = await closeWith(first.client, { applied: reconciled.applied, status: reconciled.public.status })
    expect(result).toEqual({ applied: false, status: 'uncertain' })
  })

  it('reveals only the persisted trusted slot through a live reconciliation capability', async () => {
    const first = await fixture({})
    const persisted = slot({ doctorId: 80120, lpuId: 44871, specialityId: 155, price: 6_250 })
    const acquired = await first.repository.acquire({ booking: booking({}), slot: persisted })
    const uncertain = await first.repository.markUncertain({ capability: acquired.capability })
    const scope = await first.repository.reconciliationScope({ capability: uncertain.capability })
    const serialized = JSON.stringify(scope)
    const result = await closeWith(first.client, { scope, frozen: Object.isFrozen(scope), leaked: [FIRST_INTENT_ID, FIRST_FENCE, 'requestFingerprint', 'fencingToken'].some((value) => serialized.includes(value)) })
    expect(result).toEqual({ scope: persisted, frozen: true, leaked: false })
  })

  it('rejects a reconciliation scope after its capability leaves uncertainty', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const uncertain = await first.repository.markUncertain({ capability: acquired.capability })
    await first.repository.reconcile({ capability: uncertain.capability, history: { found: true, claimId: CLAIM_ID } })
    let caught
    try { await first.repository.reconciliationScope({ capability: uncertain.capability }) } catch (error) { caught = error }
    const result = await closeWith(first.client, caught?.constructor)
    expect(result).toBe(BookingIntentError)
  })

  it('allows at most one concurrent finalizer to win its conditional CAS', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const outcomes = await Promise.all(Array.from({ length: 16 }, (_value, index) => first.repository.confirm({ capability: acquired.capability, claimId: index === 0 ? CLAIM_ID : OTHER_CLAIM_ID })))
    const result = await closeWith(first.client, outcomes.filter(({ applied }) => applied).length)
    expect(result).toBe(1)
  })

  it('allows one finalizer across independent database connections released together', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const peers = Array.from({ length: 8 }, () => peer(first.path))
    const outcomes = await together([first, ...peers].map(({ repository }) => () => repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })))
    const result = outcomes.filter(({ applied }) => applied).length
    closeAll([first, ...peers])
    expect(result).toBe(1)
  })

  it('allows one positive reconciler when worker-local capabilities finalize together', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.markUncertain({ capability: acquired.capability })
    first.client.close()
    const outcomes = await workerRace(first.path, 'reconcile')
    const applied = outcomes.filter((outcome) => outcome.kind === 'result' && outcome.applied === true).length
    const unsafe = outcomes.filter((outcome) => outcome.kind === 'result' ? outcome.action !== 'confirmed' || outcome.status !== 'confirmed' : !isBusy(outcome))
    expect({ applied, unsafe }).toEqual({ applied: 1, unsafe: [] })
  }, 20_000)

  it('keeps action and public status aligned for a stale fence against later uncertainty', async () => {
    let current = new Date(NOW_ISO)
    const first = await fixture({ clock: () => new Date(current) })
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    await first.repository.fail({ capability: acquired.capability, failureCode: 'SLOT_UNAVAILABLE' })
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    current = new Date('2026-08-25T12:03:00.000Z')
    await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const stale = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const result = await closeWith(first.client, { action: stale.action, status: stale.public.status })
    expect(result).toEqual({ action: 'reconcile', status: 'uncertain' })
  })

  it('rejects invalid transitions and stale capabilities without changing confirmation', async () => {
    const first = await fixture({})
    const acquired = await first.repository.acquire({ booking: booking({}), slot: slot({}) })
    const confirmed = await first.repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
    const stale = await first.repository.markUncertain({ capability: acquired.capability })
    const result = await closeWith(first.client, { confirmation: confirmed.public, staleApplied: stale.applied })
    expect(result).toMatchObject({ confirmation: { status: 'confirmed', claimId: CLAIM_ID }, staleApplied: false })
  })
})

describe('booking intent hostile inputs', () => {
  it('rejects unknown resume fields before querying storage', async () => {
    const first = await fixture({})
    let error
    try { await first.repository.resume({ booking: booking({}), slot: slot({}) }) } catch (caught) { error = caught }
    const rows = await storedRows(first.client)
    const result = await closeWith(first.client, { type: error?.constructor, rows: rows.length })
    expect(result).toEqual({ type: TypeError, rows: 0 })
  })

  it('rejects unknown acquire fields before touching storage', async () => {
    const first = await fixture({})
    let error
    try { await first.repository.acquire({ booking: booking({}), slot: slot({}), price: 1 }) } catch (caught) { error = caught }
    const rows = await storedRows(first.client)
    const result = await closeWith(first.client, { type: error?.constructor, rows: rows.length })
    expect(result).toEqual({ type: TypeError, rows: 0 })
  })

  it('rejects an appointment type key longer than the public contract', async () => {
    const first = await fixture({})
    let error
    try { await first.repository.acquire({ booking: booking({ appointmentType: `m${'a'.repeat(64)}` }), slot: slot({}) }) } catch (caught) { error = caught }
    const rows = await storedRows(first.client)
    const result = await closeWith(first.client, { type: error?.constructor, rows: rows.length })
    expect(result).toEqual({ type: TypeError, rows: 0 })
  })

  it('rejects an accessor booking without invoking it', async () => {
    const first = await fixture({})
    let reads = 0
    const hostile = booking({})
    Object.defineProperty(hostile, 'comment', { enumerable: true, get: () => { reads += 1; return 'утечка' } })
    let error
    try { await first.repository.acquire({ booking: hostile, slot: slot({}) }) } catch (caught) { error = caught }
    const result = await closeWith(first.client, { reads, type: error?.constructor })
    expect(result).toEqual({ reads: 0, type: TypeError })
  })

  it('fails before insertion when the injected clock is invalid', async () => {
    const first = await fixture({ clock: () => new Date('invalid') })
    let error
    try { await first.repository.acquire({ booking: booking({}), slot: slot({}) }) } catch (caught) { error = caught }
    const rows = await storedRows(first.client)
    const result = await closeWith(first.client, { type: error?.constructor, rows: rows.length })
    expect(result).toEqual({ type: TypeError, rows: 0 })
  })

  it('fails before insertion when the injected clock exceeds four-digit ISO years', async () => {
    const first = await fixture({ clock: () => new Date(253_402_300_800_000) })
    let error
    try { await first.repository.acquire({ booking: booking({}), slot: slot({}) }) } catch (caught) { error = caught }
    const rows = await storedRows(first.client)
    const result = await closeWith(first.client, { type: error?.constructor, rows: rows.length })
    expect(result).toEqual({ type: TypeError, rows: 0 })
  })

  it('fails before insertion when the injected fencing UUID is malformed', async () => {
    const first = await fixture({ uuid: () => 'not-a-fence' })
    let error
    try { await first.repository.acquire({ booking: booking({}), slot: slot({}) }) } catch (caught) { error = caught }
    const rows = await storedRows(first.client)
    const result = await closeWith(first.client, { type: error?.constructor, rows: rows.length })
    expect(result).toEqual({ type: TypeError, rows: 0 })
  })

  it('rejects a forged capability rather than accepting a caller fence', async () => {
    const first = await fixture({})
    let error
    try { await first.repository.confirm({ capability: Object.freeze({ fence: FIRST_FENCE }), claimId: CLAIM_ID }) } catch (caught) { error = caught }
    const result = await closeWith(first.client, error?.constructor)
    expect(result).toBe(TypeError)
  })

  it('rejects a forged reconciliation capability without querying trusted scope', async () => {
    const first = await fixture({})
    let error
    try { await first.repository.reconciliationScope({ capability: Object.freeze({ fence: FIRST_FENCE }) }) } catch (caught) { error = caught }
    const result = await closeWith(first.client, error?.constructor)
    expect(result).toBe(TypeError)
  })
})
