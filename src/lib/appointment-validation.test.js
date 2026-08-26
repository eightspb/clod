import { describe, expect, it } from 'vitest'
import { validateBookingPayload, validateScheduleQuery } from './appointment-validation.js'

const NOW_ISO = '2026-08-25T12:00:00.000Z'
const VALID_PATIENT = Object.freeze({
  firstName: '  А́нна   Мария  ',
  lastName: '  О’Коннор-Сидорова ',
  secondName: '   ',
  phone: '+7 (921) 555-01-29',
  birthday: '1988-02-29',
})
const VALID_BOOKING = Object.freeze({
  doctorSlug: 'egorova',
  appointmentType: 'gynecologist',
  intentId: '8f14e45f-ea8b-4aa7-9f6d-8f62f9d6a417',
  dtStart: '2026-09-01T10:30:00+03:00',
  dtEnd: '2026-09-01T11:15:00+03:00',
  comment: '  Нужен первичный приём.  ',
  consent: true,
})
const NORMALIZED_BOOKING = Object.freeze({
  doctorSlug: 'egorova',
  appointmentType: 'gynecologist',
  intentId: '8f14e45f-ea8b-4aa7-9f6d-8f62f9d6a417',
  dtStart: '2026-09-01T07:30:00.000Z',
  dtEnd: '2026-09-01T08:15:00.000Z',
  patient: Object.freeze({
    firstName: 'А́нна Мария',
    lastName: 'О’Коннор-Сидорова',
    secondName: '',
    phone: '79215550129',
    birthday: '1988-02-29',
  }),
  comment: 'Нужен первичный приём.',
  consent: true,
})

function makeBooking(overrides) {
  const patient = Object.hasOwn(overrides, 'patient') ? overrides.patient : { ...VALID_PATIENT }
  return { ...VALID_BOOKING, ...overrides, patient }
}

function validateBooking(payload) {
  return validateBookingPayload(payload, { now: new Date(NOW_ISO) })
}

describe('appointment schedule query validation', () => {
  it('normalizes a valid URL schedule query', () => {
    const query = new URLSearchParams('doctor=odintsov&from=2026-09-03&days=14')
    const result = validateScheduleQuery(query, { now: new Date(NOW_ISO) })
    expect(result).toEqual({
      valid: true,
      value: { doctor: 'odintsov', from: '2026-09-03', days: 14 },
    })
  })

  it('rejects an unsafe doctor slug', () => {
    const result = validateScheduleQuery({ doctor: '../Одинцов', from: '2026-09-03', days: '7' }, { now: new Date(NOW_ISO) })
    expect(result.error.fields).toEqual({ doctor: 'INVALID_FORMAT' })
  })

  it('rejects a nonexistent calendar date', () => {
    const result = validateScheduleQuery({ doctor: 'prikhodko', from: '2026-02-29', days: '6' }, { now: new Date(NOW_ISO) })
    expect(result.error.fields).toEqual({ from: 'INVALID_DATE' })
  })

  it('rejects Gregorian year zero in a schedule date', () => {
    const result = validateScheduleQuery({ doctor: 'kalinina', from: '0000-12-31', days: '2' })
    expect(result.error.fields).toEqual({ from: 'INVALID_DATE' })
  })

  it('accepts Gregorian year one in a schedule date', () => {
    const result = validateScheduleQuery({ doctor: 'kalinina', from: '0001-01-01', days: '2' })
    expect(result).toEqual({ valid: true, value: { doctor: 'kalinina', from: '0001-01-01', days: 2 } })
  })

  it('rejects a schedule window whose exclusive end crosses year 9999', () => {
    const result = validateScheduleQuery({ doctor: 'odintsov', from: '9999-12-31', days: '1' })
    expect(result.error.fields).toEqual({ from: 'OUT_OF_RANGE' })
  })

  it('accepts a fourteen-day window ending within year 9999', () => {
    const result = validateScheduleQuery({ doctor: 'odintsov', from: '9999-12-17', days: '14' })
    expect(result).toEqual({ valid: true, value: { doctor: 'odintsov', from: '9999-12-17', days: 14 } })
  })

  it.each([
    ['zero', '0'],
    ['too many', '15'],
    ['fractional', '3.5'],
    ['non-numeric', 'семь'],
  ])('rejects a %s day count', (_label, days) => {
    const result = validateScheduleQuery({ doctor: 'skurikhin', from: '2026-09-07', days }, { now: new Date(NOW_ISO) })
    expect(result.error.fields).toEqual({ days: 'OUT_OF_RANGE' })
  })

  it('rejects unknown query keys without reflecting their values', () => {
    const query = { doctor: 'matsukhov', from: '2026-09-09', days: '8', price: '999999' }
    const result = validateScheduleQuery(query, { now: new Date(NOW_ISO) })
    expect(result.error.fields).toEqual({ query: 'UNKNOWN_FIELDS' })
  })

  it('rejects duplicate query values instead of choosing one', () => {
    const query = new URLSearchParams('doctor=odintsov&doctor=egorova&from=2026-09-03&days=9')
    const result = validateScheduleQuery(query, { now: new Date(NOW_ISO) })
    expect(result.error.fields).toEqual({ query: 'DUPLICATE_FIELDS' })
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['array', []],
    ['string', 'doctor=odintsov'],
  ])('rejects a %s query shape safely', (_label, query) => {
    const result = validateScheduleQuery(query, { now: new Date(NOW_ISO) })
    expect(result).toEqual({
      valid: false,
      error: { code: 'VALIDATION_ERROR', fields: { query: 'INVALID_OBJECT' } },
    })
  })
})

describe('appointment booking validation', () => {
  it('normalizes a complete booking payload without retaining raw values', () => {
    const result = validateBooking(makeBooking({}))
    expect(result).toEqual({ valid: true, value: NORMALIZED_BOOKING })
  })

  it('accepts an empty optional comment and missing second name', () => {
    const patient = { ...VALID_PATIENT, secondName: undefined, phone: '8 812 555-12-34' }
    delete patient.secondName
    const result = validateBooking(makeBooking({ patient, comment: undefined }))
    expect({ comment: result.value.comment, secondName: result.value.patient.secondName, phone: result.value.patient.phone }).toEqual({
      comment: '', secondName: '', phone: '78125551234',
    })
  })

  it('does not mutate the caller booking object during normalization', () => {
    const payload = makeBooking({ patient: { ...VALID_PATIENT }, comment: '  Без мутаций  ' })
    const snapshot = structuredClone(payload)
    validateBooking(payload)
    expect(payload).toEqual(snapshot)
  })

  it('rejects unknown top-level fields without naming attacker-controlled keys', () => {
    const result = validateBooking(makeBooking({ medflexDoctorId: 92481 }))
    expect(result.error.fields).toEqual({ booking: 'UNKNOWN_FIELDS' })
  })

  it('rejects unknown patient fields without naming attacker-controlled keys', () => {
    const patient = { ...VALID_PATIENT, upstreamStatus: 'confirmed' }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ patient: 'UNKNOWN_FIELDS' })
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['array', []],
    ['date', new Date('2026-08-25T00:00:00.000Z')],
  ])('rejects a %s booking shape safely', (_label, payload) => {
    const result = validateBooking(payload)
    expect(result).toEqual({
      valid: false,
      error: { code: 'VALIDATION_ERROR', fields: { booking: 'INVALID_OBJECT' } },
    })
  })

  it('rejects an object with an untrusted prototype', () => {
    const payload = Object.assign(Object.create({ consent: true }), makeBooking({}))
    const result = validateBooking(payload)
    expect(result.error.fields).toEqual({ booking: 'INVALID_OBJECT' })
  })

  it('rejects an accessor payload without invoking its value', () => {
    const payload = makeBooking({})
    Object.defineProperty(payload, 'consent', { enumerable: true, get: () => { throw new Error('unsafe getter') } })
    const result = validateBooking(payload)
    expect(result.error.fields).toEqual({ booking: 'INVALID_OBJECT' })
  })

  it('rejects symbol keys as a validation error', () => {
    const payload = makeBooking({})
    payload[Symbol('trusted-doctor')] = 'forged'
    const result = validateBooking(payload)
    expect(result.error.fields).toEqual({ booking: 'INVALID_OBJECT' })
  })

  it('does not hide an unexpected reflection failure', () => {
    const payload = new Proxy(makeBooking({}), { getPrototypeOf: () => { throw new RangeError('reflection failed') } })
    const operation = () => validateBooking(payload)
    expect(operation).toThrow(RangeError)
  })

  it('does not hide an unexpected query iterator failure', () => {
    const query = new URLSearchParams('doctor=odintsov&from=2026-09-03&days=5')
    query.entries = () => { throw new RangeError('iterator failed') }
    const operation = () => validateScheduleQuery(query, { now: new Date(NOW_ISO) })
    expect(operation).toThrow(RangeError)
  })

  it('does not hide an invalid deterministic clock as a patient error', () => {
    const operation = () => validateBookingPayload(makeBooking({}), { now: new Date('invalid') })
    expect(operation).toThrow(TypeError)
  })

  it('rejects unknown deterministic clock option keys', () => {
    const options = { now: new Date(NOW_ISO), nwo: new Date('2026-08-26T12:00:00.000Z') }
    const operation = () => validateBookingPayload(makeBooking({}), options)
    expect(operation).toThrow(TypeError)
  })

  it('does not inherit missing consent from a polluted object prototype', () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, 'consent')
    let result
    try {
      Object.defineProperty(Object.prototype, 'consent', { configurable: true, value: true })
      const payload = makeBooking({})
      delete payload.consent
      result = validateBooking(payload)
    } finally {
      if (original) Object.defineProperty(Object.prototype, 'consent', original)
      else delete Object.prototype.consent
    }
    expect(result).toMatchObject({ valid: false, error: { fields: { consent: 'REQUIRED_TRUE' } } })
  })

  it('rejects a hostile patient container', () => {
    const result = validateBooking(makeBooking({ patient: ['Анна', 'Иванова'] }))
    expect(result.error.fields).toEqual({ patient: 'INVALID_OBJECT' })
  })

  it('rejects an invalid doctor slug', () => {
    const result = validateBooking(makeBooking({ doctorSlug: 'odintsov/../../admin' }))
    expect(result.error.fields).toEqual({ doctorSlug: 'INVALID_FORMAT' })
  })

  it('requires an own appointment type key', () => {
    const payload = makeBooking({})
    delete payload.appointmentType
    const result = validateBooking(payload)
    expect(result.error.fields).toEqual({ appointmentType: 'REQUIRED' })
  })

  it.each([
    ['surrounding whitespace', ' gynecologist'],
    ['unsafe path', 'gynecologist/../../admin'],
    ['reserved name', 'constructor'],
    ['leading digit', '2d-ultrasound'],
    ['oversized key', `m${'a'.repeat(64)}`],
  ])('rejects an appointment type with %s', (_label, appointmentType) => {
    const result = validateBooking(makeBooking({ appointmentType }))
    expect(result.error.fields).toEqual({ appointmentType: 'INVALID_FORMAT' })
  })

  it('rejects a malformed intent UUID', () => {
    const result = validateBooking(makeBooking({ intentId: '8f14e45f-ea8b-0000-not-a-uuid' }))
    expect(result.error.fields).toEqual({ intentId: 'INVALID_FORMAT' })
  })

  it.each([
    ['missing timezone', '2026-09-01T10:30:00'],
    ['impossible date', '2026-02-30T10:30:00+03:00'],
    ['impossible offset', '2026-09-01T10:30:00+15:00'],
  ])('rejects a timestamp with %s', (_label, dtStart) => {
    const result = validateBooking(makeBooking({ dtStart }))
    expect(result.error.fields).toEqual({ dtStart: 'INVALID_TIMESTAMP' })
  })

  it.each([
    ['above year 9999', '9999-12-31T23:00:00-14:00'],
    ['below year 0001', '0001-01-01T00:00:00+14:00'],
  ])('rejects a timestamp whose instant crosses %s', (_label, dtStart) => {
    const result = validateBooking(makeBooking({ dtStart }))
    expect(result.error.fields.dtStart).toBe('INVALID_TIMESTAMP')
  })

  it('accepts timestamp instants at the upper canonical year boundary', () => {
    const payload = makeBooking({ dtStart: '9999-12-31T08:00:00-14:00', dtEnd: '9999-12-31T09:00:00-14:00' })
    const result = validateBooking(payload)
    expect(result).toMatchObject({ valid: true, value: { dtStart: '9999-12-31T22:00:00.000Z', dtEnd: '9999-12-31T23:00:00.000Z' } })
  })

  it('rejects timestamp fractions beyond millisecond precision', () => {
    const payload = makeBooking({
      dtStart: '2026-09-06T09:00:00.0009Z',
      dtEnd: '2026-09-06T09:05:00.0000Z',
    })
    const result = validateBooking(payload)
    expect(result).toMatchObject({
      valid: false,
      error: { fields: { dtStart: 'INVALID_TIMESTAMP', dtEnd: 'INVALID_TIMESTAMP' } },
    })
  })

  it('accepts an appointment lasting exactly five minutes', () => {
    const payload = makeBooking({
      dtStart: '2026-09-06T09:00:00.123Z',
      dtEnd: '2026-09-06T09:05:00.123Z',
    })
    const result = validateBooking(payload)
    expect(result).toMatchObject({ valid: true, value: {
      dtStart: '2026-09-06T09:00:00.123Z', dtEnd: '2026-09-06T09:05:00.123Z',
    } })
  })

  it('rejects a start timestamp that is not in the future', () => {
    const result = validateBooking(makeBooking({ dtStart: NOW_ISO, dtEnd: '2026-08-25T12:45:00.000Z' }))
    expect(result.error.fields).toEqual({ dtStart: 'NOT_FUTURE' })
  })

  it('normalizes a past interval only in explicit resume mode', () => {
    const payload = makeBooking({ dtStart: '2026-08-24T10:00:00+03:00', dtEnd: '2026-08-24T10:40:00+03:00' })
    const result = validateBookingPayload(payload, { now: new Date(NOW_ISO), mode: 'resume' })
    expect(result).toMatchObject({ valid: true, value: { dtStart: '2026-08-24T07:00:00.000Z', dtEnd: '2026-08-24T07:40:00.000Z' } })
  })

  it('keeps interval ordering strict in resume mode', () => {
    const payload = makeBooking({ dtStart: '2026-08-24T10:40:00+03:00', dtEnd: '2026-08-24T10:00:00+03:00' })
    const result = validateBookingPayload(payload, { now: new Date(NOW_ISO), mode: 'resume' })
    expect(result.error.fields).toEqual({ dtEnd: 'NOT_AFTER_START' })
  })

  it('rejects an unknown booking validation mode', () => {
    const operation = () => validateBookingPayload(makeBooking({}), { now: new Date(NOW_ISO), mode: 'bypass' })
    expect(operation).toThrow(TypeError)
  })

  it('rejects an end timestamp that does not follow the start', () => {
    const result = validateBooking(makeBooking({ dtStart: '2026-09-02T14:00:00Z', dtEnd: '2026-09-02T13:59:00Z' }))
    expect(result.error.fields).toEqual({ dtEnd: 'NOT_AFTER_START' })
  })

  it.each([
    ['too short', '2026-09-04T09:00:00Z', '2026-09-04T09:04:59Z'],
    ['too long', '2026-09-05T09:00:00Z', '2026-09-05T13:00:01Z'],
  ])('rejects a %s appointment duration', (_label, dtStart, dtEnd) => {
    const result = validateBooking(makeBooking({ dtStart, dtEnd }))
    expect(result.error.fields).toEqual({ dtEnd: 'INVALID_DURATION' })
  })

  it.each([
    ['markup', '<Ирина>'],
    ['control character', 'Ири\u0000на'],
    ['digits', 'Ирина42'],
  ])('rejects a name containing %s', (_label, firstName) => {
    const patient = { ...VALID_PATIENT, firstName }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.firstName': 'INVALID_FORMAT' })
  })

  it.each([
    ['non-breaking hyphen', '  Петрова‑Сидорова  ', 'Петрова-Сидорова'],
    ['en dash', '  Иванова–Ким  ', 'Иванова-Ким'],
  ])('normalizes a Russian surname with a Unicode %s', (_label, lastName, expected) => {
    const patient = { ...VALID_PATIENT, lastName }
    const result = validateBooking(makeBooking({ patient }))
    expect(result).toMatchObject({ valid: true, value: { patient: { lastName: expected } } })
  })

  it.each([
    ['first name', { firstName: '   ' }, 'patient.firstName'],
    ['last name', { lastName: '' }, 'patient.lastName'],
  ])('requires a non-empty %s', (_label, override, field) => {
    const patient = { ...VALID_PATIENT, ...override }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ [field]: 'REQUIRED' })
  })

  it('requires the first name property to be present', () => {
    const patient = { ...VALID_PATIENT }
    delete patient.firstName
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.firstName': 'REQUIRED' })
  })

  it('requires the last name property to be present', () => {
    const patient = { ...VALID_PATIENT }
    delete patient.lastName
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.lastName': 'REQUIRED' })
  })

  it('rejects a name longer than one hundred Unicode characters', () => {
    const patient = { ...VALID_PATIENT, lastName: 'Ж'.repeat(101) }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.lastName': 'TOO_LONG' })
  })

  it.each([
    ['foreign prefix', '+1 (202) 555-0143'],
    ['missing digit', '+7 (921) 555-01-2'],
    ['unbalanced parenthesis', '+7 (921 555-01-29'],
    ['missing plus', '7 921 555-01-29'],
    ['letters', '+7 (921) FIVE-01-29'],
  ])('rejects a Russian phone with %s', (_label, phone) => {
    const patient = { ...VALID_PATIENT, phone }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.phone': 'INVALID_FORMAT' })
  })

  it('rejects a nonexistent birthday', () => {
    const patient = { ...VALID_PATIENT, birthday: '2025-02-29' }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.birthday': 'INVALID_DATE' })
  })

  it('rejects Gregorian year zero in a birthday', () => {
    const patient = { ...VALID_PATIENT, birthday: '0000-12-31' }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.birthday': 'INVALID_DATE' })
  })

  it('accepts Gregorian year one in a past birthday', () => {
    const patient = { ...VALID_PATIENT, birthday: '0001-01-01' }
    const result = validateBooking(makeBooking({ patient }))
    expect(result).toMatchObject({ valid: true, value: { patient: { birthday: '0001-01-01' } } })
  })

  it('rejects a birthday that is not in the past', () => {
    const patient = { ...VALID_PATIENT, birthday: '2026-08-26' }
    const result = validateBooking(makeBooking({ patient }))
    expect(result.error.fields).toEqual({ 'patient.birthday': 'NOT_PAST' })
  })

  it('keeps the Moscow current date nonpast before clinic midnight', () => {
    const patient = { ...VALID_PATIENT, birthday: '2026-08-25' }
    const result = validateBookingPayload(makeBooking({ patient }), { now: new Date('2026-08-25T20:59:59.000Z') })
    expect(result.error.fields).toEqual({ 'patient.birthday': 'NOT_PAST' })
  })

  it('accepts the prior Moscow date at clinic midnight', () => {
    const patient = { ...VALID_PATIENT, birthday: '2026-08-25' }
    const result = validateBookingPayload(makeBooking({ patient }), { now: new Date('2026-08-25T21:00:00.000Z') })
    expect(result).toMatchObject({ valid: true, value: { patient: { birthday: '2026-08-25' } } })
  })

  it('rejects an oversized optional comment after trimming', () => {
    const result = validateBooking(makeBooking({ comment: `  ${'Я'.repeat(301)}  ` }))
    expect(result.error.fields).toEqual({ comment: 'TOO_LONG' })
  })

  it.each([
    ['false', false],
    ['string true', 'true'],
    ['one', 1],
  ])('rejects consent supplied as %s', (_label, consent) => {
    const result = validateBooking(makeBooking({ consent }))
    expect(result.error.fields).toEqual({ consent: 'REQUIRED_TRUE' })
  })

  it('never reflects invalid patient values in a validation result', () => {
    const patient = { ...VALID_PATIENT, firstName: '<Мария-secret>', phone: '+1 202 555 0143' }
    const serialized = JSON.stringify(validateBooking(makeBooking({ patient })))
    expect([patient.firstName, patient.phone].some((value) => serialized.includes(value))).toBe(false)
  })
})
