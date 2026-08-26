import { describe, expect, it } from 'vitest'
import { normalizeAppointmentSchedule, verifyAppointmentSlot } from './appointment-schedule.js'

const NOW_ISO = '2026-08-25T12:00:00.000Z'
const DOCTOR = Object.freeze({
  slug: 'odintsov',
  name: 'Одинцов Владислав Александрович',
  location: 'просп. Богатырский, д. 22, корп. 1',
  timeZone: 'Europe/Moscow',
})
const DEFAULT_CELLS = Object.freeze([
  Object.freeze({ dt_start: '2026-08-28 17:05', dt_end: '2026-08-28 17:45' }),
  Object.freeze({ dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:50' }),
  Object.freeze({ dt_start: '2026-08-27 10:20', dt_end: '2026-08-27 11:00' }),
])

function scheduleRow(overrides) {
  return {
    doctor_id: 70120,
    lpu_id: 34871,
    specialities: [90, 777, 189, 55],
    prices: [
      { speciality_id: 777, price: 99_000 },
      { speciality_id: 90, price: 0 },
      { speciality_id: 55, price: 4_900 },
      { speciality_id: 189, price: 5_500 },
    ],
    allowed_age: [
      { speciality_id: 90, min: 0, max: null },
      { speciality_id: 189, min: 18, max: null },
      { speciality_id: 55, min: 18, max: 65 },
      { speciality_id: 777, min: 0, max: 130 },
    ],
    cells: DEFAULT_CELLS.map((cell) => ({ ...cell })),
    ...overrides,
  }
}

function mutablePage(rows) {
  return { data: rows, count: rows.length, num_pages: rows.length ? 1 : 0 }
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor && Object.hasOwn(descriptor, 'value')) freezeDeep(descriptor.value)
    }
    Object.freeze(value)
  }
  return value
}

function schedulePage(rows) {
  return freezeDeep(mutablePage(rows))
}

function normalizeOptions(overrides) {
  return {
    doctorSlug: 'odintsov',
    page: schedulePage([scheduleRow({})]),
    from: '2026-08-27',
    days: 2,
    now: new Date(NOW_ISO),
    ...overrides,
  }
}

function verifyOptions(overrides) {
  return {
    doctorSlug: 'odintsov',
    appointmentType: 'mammologist',
    page: schedulePage([scheduleRow({})]),
    dtStart: '2026-08-27T08:10:00.000Z',
    dtEnd: '2026-08-27T08:50:00.000Z',
    birthday: '1988-08-27',
    from: '2026-08-27',
    days: 2,
    now: new Date(NOW_ISO),
    ...overrides,
  }
}

function isDeeplyFrozen(value) {
  if (!value || typeof value !== 'object' || !Object.isFrozen(value)) return false
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return !descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.value || typeof descriptor.value !== 'object' || isDeeplyFrozen(descriptor.value)
  })
}

describe('appointment schedule normalization', () => {
  it('builds a minimal browser schedule in mapping and chronological order', () => {
    const result = normalizeAppointmentSchedule(normalizeOptions({}))
    expect(result).toEqual({
      available: true,
      reason: 'AVAILABLE',
      doctor: DOCTOR,
      appointmentTypes: [
        { key: 'mammologist', label: 'Маммолог', price: 4_900, minAge: 18, maxAge: 65 },
        { key: 'ultrasound', label: 'Врач УЗИ', price: 0, minAge: 0, maxAge: null },
        { key: 'surgeon-endocrinologist', label: 'Хирург-эндокринолог', price: 5_500, minAge: 18, maxAge: null },
      ],
      dates: [
        { date: '2026-08-27', count: 2, slots: [
          { startsAt: '2026-08-27T10:20:00+03:00', endsAt: '2026-08-27T11:00:00+03:00', time: '10:20', period: 'morning' },
          { startsAt: '2026-08-27T11:10:00+03:00', endsAt: '2026-08-27T11:50:00+03:00', time: '11:10', period: 'day' },
        ] },
        { date: '2026-08-28', count: 1, slots: [
          { startsAt: '2026-08-28T17:05:00+03:00', endsAt: '2026-08-28T17:45:00+03:00', time: '17:05', period: 'evening' },
        ] },
      ],
    })
  })

  it('returns an explicit no-schedule result for an empty current page', () => {
    const result = normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([]) }))
    expect(result).toEqual({ available: false, reason: 'NO_SCHEDULE', doctor: DOCTOR, appointmentTypes: [], dates: [] })
  })

  it('returns an explicit unavailable result for an unknown website doctor', () => {
    const result = normalizeAppointmentSchedule(normalizeOptions({ doctorSlug: 'neizvestnyy-vrach' }))
    expect(result).toEqual({ available: false, reason: 'DOCTOR_UNAVAILABLE', appointmentTypes: [], dates: [] })
  })

  it('returns no types when every live specialty is outside the allowlist', () => {
    const row = scheduleRow({ specialities: [777] })
    const result = normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([row]) }))
    expect(result).toEqual({ available: false, reason: 'NO_APPOINTMENT_TYPES', doctor: DOCTOR, appointmentTypes: [], dates: [] })
  })

  it('fails closed for a live specialty with a missing price composite', () => {
    const row = scheduleRow({ prices: [{ speciality_id: 55, price: 4_900 }] })
    const result = normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([row]) }))
    expect(result.appointmentTypes).toEqual([{ key: 'mammologist', label: 'Маммолог', price: 4_900, minAge: 18, maxAge: 65 }])
  })

  it('keeps a zero live price and an unbounded maximum age', () => {
    const result = normalizeAppointmentSchedule(normalizeOptions({}))
    expect(result.appointmentTypes[1]).toEqual({ key: 'ultrasound', label: 'Врач УЗИ', price: 0, minAge: 0, maxAge: null })
  })

  it('does not expose numeric Medflex identity or raw upstream timestamps', () => {
    const serialized = JSON.stringify(normalizeAppointmentSchedule(normalizeOptions({})))
    const forbidden = ['70120', '34871', 'doctor_id', 'lpu_id', 'speciality_id', '2026-08-27 11:10']
    expect(forbidden.every((value) => !serialized.includes(value))).toBe(true)
  })

  it('deeply freezes every browser-facing result container', () => {
    const result = normalizeAppointmentSchedule(normalizeOptions({}))
    expect(isDeeplyFrozen(result)).toBe(true)
  })

  it('does not mutate a current Medflex page while normalizing it', () => {
    const page = mutablePage([scheduleRow({})])
    const snapshot = structuredClone(page)
    normalizeAppointmentSchedule(normalizeOptions({ page }))
    expect(page).toEqual(snapshot)
  })

  it('drops past cells and starts outside the requested local window', () => {
    const cells = [
      { dt_start: '2026-08-24 16:00', dt_end: '2026-08-24 16:40' },
      { dt_start: '2026-08-25 15:00', dt_end: '2026-08-25 15:40' },
      { dt_start: '2026-08-25 15:01', dt_end: '2026-08-25 15:41' },
      { dt_start: '2026-08-28 00:00', dt_end: '2026-08-28 00:40' },
    ]
    const page = schedulePage([scheduleRow({ cells })])
    const result = normalizeAppointmentSchedule(normalizeOptions({ page, from: '2026-08-25', days: 3 }))
    expect(result.dates).toEqual([{ date: '2026-08-25', count: 1, slots: [{ startsAt: '2026-08-25T15:01:00+03:00', endsAt: '2026-08-25T15:41:00+03:00', time: '15:01', period: 'day' }] }])
  })

  it('returns an explicit no-slots result after safe filtering', () => {
    const cells = [{ dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:50' }]
    const result = normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ cells })]), from: '2026-08-28', days: 1 }))
    expect(result.reason).toBe('NO_SLOTS')
  })

  it('drops a cell whose end crosses the requested local window', () => {
    const cells = [{ dt_start: '2026-08-27 23:50', dt_end: '2026-08-28 00:10' }]
    const result = normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ cells })]), from: '2026-08-27', days: 1 }))
    expect(result.reason).toBe('NO_SLOTS')
  })

  it('deduplicates exact cells without changing their ordering contract', () => {
    const cell = { dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:50' }
    const page = schedulePage([scheduleRow({ cells: [{ ...cell }, { ...cell }] })])
    const result = normalizeAppointmentSchedule(normalizeOptions({ page }))
    expect(result.dates[0].count).toBe(1)
  })

  it('rejects two cells with one start and different ends as ambiguous', () => {
    const cells = [{ dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:50' }, { dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 12:00' }]
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ cells })]) }))
    expect(operation).toThrow(TypeError)
  })

  it('uses exact morning, day, and evening boundaries', () => {
    const cells = [
      { dt_start: '2026-08-27 10:59', dt_end: '2026-08-27 11:09' },
      { dt_start: '2026-08-27 11:00', dt_end: '2026-08-27 11:10' },
      { dt_start: '2026-08-27 16:59', dt_end: '2026-08-27 17:09' },
      { dt_start: '2026-08-27 17:00', dt_end: '2026-08-27 17:10' },
    ]
    const result = normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ cells })]) }))
    expect(result.dates[0].slots.map(({ period }) => period)).toEqual(['morning', 'day', 'day', 'evening'])
  })

  it('keeps a real leap-day cell', () => {
    const cells = [{ dt_start: '2028-02-29 11:10', dt_end: '2028-02-29 11:50' }]
    const options = normalizeOptions({ page: schedulePage([scheduleRow({ cells })]), from: '2028-02-29', days: 1, now: new Date('2027-12-31T21:00:00.000Z') })
    const result = normalizeAppointmentSchedule(options)
    expect(result.dates[0].date).toBe('2028-02-29')
  })

  it('adds local window days without the JavaScript year 00 to 99 offset', () => {
    const cells = [{ dt_start: '0100-01-01 11:10', dt_end: '0100-01-01 11:50' }]
    const options = normalizeOptions({ page: schedulePage([scheduleRow({ cells })]), from: '0099-12-31', days: 2, now: new Date('0098-12-01T00:00:00.000Z') })
    const result = normalizeAppointmentSchedule(options)
    expect(result.dates[0].date).toBe('0100-01-01')
  })

  it.each([
    ['nonexistent date', { dt_start: '2026-02-29 11:10', dt_end: '2026-02-29 11:50' }],
    ['year zero', { dt_start: '0000-08-27 11:10', dt_end: '0000-08-27 11:50' }],
    ['invalid hour', { dt_start: '2026-08-27 24:10', dt_end: '2026-08-27 24:50' }],
    ['invalid minute', { dt_start: '2026-08-27 11:60', dt_end: '2026-08-27 12:10' }],
    ['unexpected seconds', { dt_start: '2026-08-27 11:10:00', dt_end: '2026-08-27 11:50' }],
    ['equal end', { dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:10' }],
    ['reversed end', { dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:09' }],
  ])('rejects a cell with %s', (_label, cell) => {
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ cells: [cell] })]) }))
    expect(operation).toThrow(TypeError)
  })

  it.each([
    ['negative price', -1],
    ['infinite price', Number.POSITIVE_INFINITY],
    ['text price', '4900'],
    ['null price', null],
  ])('rejects an included type with a %s', (_label, price) => {
    const prices = [{ speciality_id: 55, price }]
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ specialities: [55], prices })]) }))
    expect(operation).toThrow(TypeError)
  })

  it.each([
    ['text price', '99000'],
    ['negative price', -1],
    ['infinite price', Number.POSITIVE_INFINITY],
    ['not-a-number price', Number.NaN],
    ['null price', null],
  ])('rejects an unapproved speciality with a %s', (_label, price) => {
    const prices = scheduleRow({}).prices.map((composite) => composite.speciality_id === 777 ? { ...composite, price } : composite)
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ prices })]) }))
    expect(operation).toThrow(TypeError)
  })

  it.each([
    ['duplicate price', { prices: [{ speciality_id: 55, price: 4_900 }, { speciality_id: 55, price: 5_100 }] }],
    ['duplicate age', { allowed_age: [{ speciality_id: 55, min: 18, max: 65 }, { speciality_id: 55, min: 21, max: 65 }] }],
  ])('rejects malformed %s composites', (_label, overrides) => {
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow(overrides)]) }))
    expect(operation).toThrow(TypeError)
  })

  it.each([
    ['negative minimum', { min: -1, max: 130 }],
    ['fractional minimum', { min: 0.5, max: 130 }],
    ['unsafe minimum', { min: Number.MAX_SAFE_INTEGER + 1, max: null }],
    ['maximum below minimum', { min: 18, max: 17 }],
    ['fractional maximum', { min: 0, max: 129.5 }],
    ['infinite maximum', { min: 0, max: Number.POSITIVE_INFINITY }],
    ['text maximum', { min: 0, max: '130' }],
  ])('rejects an unapproved speciality with a %s age', (_label, age) => {
    const allowedAge = scheduleRow({}).allowed_age.map((composite) => composite.speciality_id === 777 ? { ...composite, ...age } : composite)
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ allowed_age: allowedAge })]) }))
    expect(operation).toThrow(TypeError)
  })

  it.each([
    ['negative minimum', { min: -1, max: 65 }],
    ['fractional minimum', { min: 17.5, max: 65 }],
    ['maximum before minimum', { min: 18, max: 17 }],
    ['text maximum', { min: 18, max: '65' }],
  ])('rejects a live age range with %s', (_label, age) => {
    const allowedAge = [{ speciality_id: 55, ...age }]
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ specialities: [55], prices: [{ speciality_id: 55, price: 4_900 }], allowed_age: allowedAge })]) }))
    expect(operation).toThrow(TypeError)
  })

  it.each([
    ['wrong doctor', [scheduleRow({ doctor_id: 70121 })]],
    ['wrong LPU', [scheduleRow({ lpu_id: 34872 })]],
    ['extra row', [scheduleRow({}), scheduleRow({})]],
  ])('rejects a schedule page scoped to a %s', (_label, rows) => {
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage(rows) }))
    expect(operation).toThrow(TypeError)
  })

  it.each([
    ['wrong empty count', { data: [], count: 1, num_pages: 0 }],
    ['wrong empty pages', { data: [], count: 0, num_pages: 1 }],
    ['wrong row count', { data: [scheduleRow({})], count: 2, num_pages: 1 }],
    ['unknown page field', { data: [], count: 0, num_pages: 0, next: 'unsafe' }],
  ])('rejects page metadata with %s', (_label, page) => {
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: freezeDeep(page) }))
    expect(operation).toThrow(TypeError)
  })

  it('rejects an upstream row with an untrusted prototype', () => {
    const row = Object.assign(Object.create({ doctor_id: 70120 }), scheduleRow({}))
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([row]) }))
    expect(operation).toThrow(TypeError)
  })

  it('rejects a sparse upstream cell array', () => {
    const cells = new Array(2)
    cells[1] = { dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:50' }
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ cells })]) }))
    expect(operation).toThrow(TypeError)
  })

  it('rejects an accessor cell without invoking the accessor', () => {
    let reads = 0
    let error
    const row = scheduleRow({ cells: [{ dt_end: '2026-08-27 11:50' }] })
    Object.defineProperty(row.cells[0], 'dt_start', { enumerable: true, get: () => { reads += 1; return '2026-08-27 11:10' } })
    try {
      normalizeAppointmentSchedule(normalizeOptions({ page: mutablePage([row]) }))
    } catch (caught) {
      error = caught
    }
    expect({ reads, typeError: error instanceof TypeError }).toEqual({ reads: 0, typeError: true })
  })

  it('does not hide an unexpected proxy reflection failure', () => {
    const row = new Proxy(scheduleRow({}), { ownKeys: () => { throw new RangeError('reflection failed') } })
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: mutablePage([row]) }))
    expect(operation).toThrow(RangeError)
  })

  it('caps one schedule row at two thousand cells', () => {
    const cell = { dt_start: '2026-08-27 11:10', dt_end: '2026-08-27 11:50' }
    const cells = Array.from({ length: 2_001 }, () => ({ ...cell }))
    const operation = () => normalizeAppointmentSchedule(normalizeOptions({ page: schedulePage([scheduleRow({ cells })]) }))
    expect(operation).toThrow(TypeError)
  })

  it('fails fast for unknown normalizer option fields', () => {
    const operation = () => normalizeAppointmentSchedule({ ...normalizeOptions({}), doctorId: 70120 })
    expect(operation).toThrow(TypeError)
  })
})

describe('current appointment slot verification', () => {
  it('returns only current trusted identity, price, and raw Medflex cell values', () => {
    const result = verifyAppointmentSlot(verifyOptions({}))
    expect(result).toEqual({
      valid: true,
      doctorId: 70120,
      lpuId: 34871,
      specialityId: 55,
      price: 4_900,
      dtStart: '2026-08-27 11:10',
      dtEnd: '2026-08-27 11:50',
    })
  })

  it('uses the current live price rather than a previous browser value', () => {
    const prices = scheduleRow({}).prices.map((price) => price.speciality_id === 55 ? { ...price, price: 5_350 } : price)
    const result = verifyAppointmentSlot(verifyOptions({ page: schedulePage([scheduleRow({ prices })]) }))
    expect(result.price).toBe(5_350)
  })

  it('matches a selected slot by instant across a different safe offset', () => {
    const result = verifyAppointmentSlot(verifyOptions({ dtStart: '2026-08-27T09:10:00+01:00', dtEnd: '2026-08-27T09:50:00+01:00' }))
    expect(result.valid).toBe(true)
  })

  it('returns an explicit doctor-unavailable reason', () => {
    const result = verifyAppointmentSlot(verifyOptions({ doctorSlug: 'neizvestnyy-vrach' }))
    expect(result).toEqual({ valid: false, reason: 'DOCTOR_UNAVAILABLE' })
  })

  it('returns an explicit mapping type-unavailable reason', () => {
    const result = verifyAppointmentSlot(verifyOptions({ appointmentType: 'surgeon' }))
    expect(result).toEqual({ valid: false, reason: 'APPOINTMENT_TYPE_UNAVAILABLE' })
  })

  it('returns type unavailable when live price metadata is missing', () => {
    const prices = scheduleRow({}).prices.filter((price) => price.speciality_id !== 55)
    const result = verifyAppointmentSlot(verifyOptions({ page: schedulePage([scheduleRow({ prices })]) }))
    expect(result).toEqual({ valid: false, reason: 'APPOINTMENT_TYPE_UNAVAILABLE' })
  })

  it('returns slot unavailable when a selected start is stale', () => {
    const result = verifyAppointmentSlot(verifyOptions({ dtStart: '2026-08-27T08:11:00.000Z' }))
    expect(result).toEqual({ valid: false, reason: 'SLOT_UNAVAILABLE' })
  })

  it('returns slot unavailable when a browser forges the current duration', () => {
    const result = verifyAppointmentSlot(verifyOptions({ dtEnd: '2026-08-27T08:51:00.000Z' }))
    expect(result).toEqual({ valid: false, reason: 'SLOT_UNAVAILABLE' })
  })

  it('accepts a patient exactly on the live minimum-age birthday', () => {
    const result = verifyAppointmentSlot(verifyOptions({ birthday: '2008-08-27' }))
    expect(result.valid).toBe(true)
  })

  it('rejects a patient one day below the live minimum age', () => {
    const result = verifyAppointmentSlot(verifyOptions({ birthday: '2008-08-28' }))
    expect(result).toEqual({ valid: false, reason: 'AGE_NOT_ALLOWED' })
  })

  it('accepts a patient exactly on the live maximum-age birthday', () => {
    const result = verifyAppointmentSlot(verifyOptions({ birthday: '1961-08-27' }))
    expect(result.valid).toBe(true)
  })

  it('rejects a patient above the live maximum age', () => {
    const result = verifyAppointmentSlot(verifyOptions({ birthday: '1960-08-27' }))
    expect(result).toEqual({ valid: false, reason: 'AGE_NOT_ALLOWED' })
  })

  it('allows an old patient when the current type has no maximum age', () => {
    const result = verifyAppointmentSlot(verifyOptions({ appointmentType: 'ultrasound', birthday: '1901-03-04' }))
    expect(result.valid).toBe(true)
  })

  it('does not age a leap-day patient on February 28 of a common year', () => {
    const cells = [{ dt_start: '2026-02-28 11:10', dt_end: '2026-02-28 11:50' }]
    const result = verifyAppointmentSlot(verifyOptions({ page: schedulePage([scheduleRow({ cells })]), dtStart: '2026-02-28T08:10:00.000Z', dtEnd: '2026-02-28T08:50:00.000Z', birthday: '2008-02-29', from: '2026-02-28', days: 1, now: new Date('2026-01-01T00:00:00.000Z') }))
    expect(result).toEqual({ valid: false, reason: 'AGE_NOT_ALLOWED' })
  })

  it('ages a leap-day patient on March 1 of a common year', () => {
    const cells = [{ dt_start: '2026-03-01 11:10', dt_end: '2026-03-01 11:50' }]
    const result = verifyAppointmentSlot(verifyOptions({ page: schedulePage([scheduleRow({ cells })]), dtStart: '2026-03-01T08:10:00.000Z', dtEnd: '2026-03-01T08:50:00.000Z', birthday: '2008-02-29', from: '2026-03-01', days: 1, now: new Date('2026-01-01T00:00:00.000Z') }))
    expect(result.valid).toBe(true)
  })

  it('computes an exact boundary age in years 00 to 99 safely', () => {
    const cells = [{ dt_start: '0100-01-01 11:10', dt_end: '0100-01-01 11:50' }]
    const result = verifyAppointmentSlot(verifyOptions({ page: schedulePage([scheduleRow({ cells })]), dtStart: '0100-01-01T08:10:00.000Z', dtEnd: '0100-01-01T08:50:00.000Z', birthday: '0082-01-01', from: '0100-01-01', days: 1, now: new Date('0099-12-01T00:00:00.000Z') }))
    expect(result.valid).toBe(true)
  })

  it.each(['2025-02-29', '2026-08-25'])('fails fast for the invalid or nonpast birthday %s', (birthday) => {
    const operation = () => verifyAppointmentSlot(verifyOptions({ birthday }))
    expect(operation).toThrow(TypeError)
  })

  it('fails fast for a malformed selected timestamp', () => {
    const operation = () => verifyAppointmentSlot(verifyOptions({ dtStart: '2026-08-27 08:10' }))
    expect(operation).toThrow(TypeError)
  })

  it('fails fast for forged trusted identifiers in verifier options', () => {
    const operation = () => verifyAppointmentSlot({ ...verifyOptions({}), lpuId: 99_999 })
    expect(operation).toThrow(TypeError)
  })

  it('freezes both valid and expected invalid verifier results', () => {
    const valid = verifyAppointmentSlot(verifyOptions({}))
    const invalid = verifyAppointmentSlot(verifyOptions({ dtStart: '2026-08-27T08:11:00.000Z' }))
    expect([valid, invalid].every(isDeeplyFrozen)).toBe(true)
  })
})
