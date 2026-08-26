import { describe, expect, it } from 'vitest'
import { findAppointmentHistory } from './appointment-history.js'

const CLAIM_ID = '872bb8e7-fdc5-4886-8c54-2be1fe31d7fb'
const OTHER_CLAIM_ID = '38df55b1-72ac-41f0-8df9-dc8edc624ce9'
const BOOKING = Object.freeze({
  doctorSlug: 'odintsov',
  appointmentType: 'mammologist',
  intentId: 'a833580d-5da1-429d-9da0-c1fc6b1ec645',
  dtStart: '2031-09-04T07:10:00.000Z',
  dtEnd: '2031-09-04T07:50:00.000Z',
  patient: Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '79215550129', birthday: '1988-02-29' }),
  comment: 'Нужен сурдопереводчик',
  consent: true,
})
const SLOT = Object.freeze({ valid: true, doctorId: 70120, lpuId: 34871, specialityId: 55, price: 4_900, dtStart: '2031-09-04 10:10', dtEnd: '2031-09-04 10:50' })

function historyRow(overrides = {}) {
  return {
    id: 981_337,
    uuid: CLAIM_ID,
    date: '2031-09-04',
    time_start: '10:10:00',
    time_end: '10:50:00',
    price: 4_900,
    canceled: false,
    lpu: { id: 34871, name: '«Клиника доктора Одинцова»', address: 'просп. Богатырский, д. 22, корп. 1' },
    doctor: { id: 70120, fio: 'Одинцов Владислав Александрович', speciality_id: 55, speciality_name: 'Маммолог' },
    patient: { mobile_phone: '79215550129', first_name: 'Лёля', second_name: 'Алиевна', last_name: 'О’Коннор-Сидорова', birthday: '1988-02-29' },
    ...overrides,
  }
}

function page(data, overrides = {}) {
  return { data, count: data.length, num_pages: data.length ? 1 : 0, ...overrides }
}

function history(inputPages) {
  const pages = Array.isArray(inputPages) ? inputPages : [inputPages]
  return findAppointmentHistory({ loadPage: async (number) => pages[number - 1], booking: BOOKING, slot: SLOT })
}

function unrelatedRows(count, offset = 0) {
  return Array.from({ length: count }, (_value, index) => historyRow({ id: 990_000 + offset + index, uuid: crypto.randomUUID(), doctor: { ...historyRow({}).doctor, id: 800_000 + offset + index } }))
}

describe('appointment history normalization', () => {
  it('returns one exact claim from a complete trusted-scope history', async () => {
    await expect(history(page([historyRow({})]))).resolves.toEqual({ found: true, claimId: CLAIM_ID })
  })

  it('keeps an exact canceled appointment unresolved for manual review', async () => {
    await expect(history(page([historyRow({ canceled: true })]))).rejects.toBeInstanceOf(TypeError)
  })

  it('returns not found only after validating a complete history', async () => {
    await expect(history(page([]))).resolves.toEqual({ found: false })
  })

  it('does not match a row with another trusted doctor scope', async () => {
    const doctor = { ...historyRow({}).doctor, id: 132646 }
    await expect(history(page([historyRow({ doctor })]))).resolves.toEqual({ found: false })
  })

  it('does not match a row for another normalized patient', async () => {
    const patient = { ...historyRow({}).patient, mobile_phone: '79161234567' }
    await expect(history(page([historyRow({ patient })]))).resolves.toEqual({ found: false })
  })

  it('does not match another interval or trusted price', async () => {
    const rows = [historyRow({ time_start: '10:11:00' }), historyRow({ uuid: OTHER_CLAIM_ID, id: 981_338, price: 5_100 })]
    await expect(history(page(rows))).resolves.toEqual({ found: false })
  })

  it('fails closed when two active rows exactly match the booking', async () => {
    const rows = [historyRow({}), historyRow({ id: 981_338, uuid: OTHER_CLAIM_ID })]
    await expect(history(page(rows))).rejects.toBeInstanceOf(TypeError)
  })

  it('fails closed for active and canceled exact-match ambiguity', async () => {
    const rows = [historyRow({}), historyRow({ id: 981_338, uuid: OTHER_CLAIM_ID, canceled: true })]
    await expect(history(page(rows))).rejects.toBeInstanceOf(TypeError)
  })

  it('fails closed for one malformed history row instead of skipping it', async () => {
    await expect(history(page([historyRow({ uuid: 'not-a-claim' })]))).rejects.toBeInstanceOf(TypeError)
  })

  it('fails closed when a nested row contains unexpected fields', async () => {
    const patient = { ...historyRow({}).patient, diagnosis: 'НЕ-ВОЗВРАЩАТЬ' }
    await expect(history(page([historyRow({ patient })]))).rejects.toBeInstanceOf(TypeError)
  })

  it('scans every stable reported page before confirming an exact row', async () => {
    const first = page(unrelatedRows(50), { count: 51, num_pages: 2 })
    const second = page([historyRow({ id: 999_999 })], { count: 51, num_pages: 2 })
    await expect(history([first, second])).resolves.toEqual({ found: true, claimId: CLAIM_ID })
  })

  it('fails closed when pagination totals drift between pages', async () => {
    const first = page(unrelatedRows(50), { count: 51, num_pages: 2 })
    const second = page([historyRow({ id: 999_999 })], { count: 52, num_pages: 2 })
    await expect(history([first, second])).rejects.toBeInstanceOf(TypeError)
  })

  it('rejects a history above the four-page reconciliation cap', async () => {
    let calls = 0
    const first = page(unrelatedRows(50), { count: 201, num_pages: 5 })
    const operation = findAppointmentHistory({ loadPage: async () => { calls += 1; return first }, booking: BOOKING, slot: SLOT })
    const result = await operation.then(() => ({ calls }), (error) => ({ calls, type: error.constructor }))
    expect(result).toEqual({ calls: 1, type: TypeError })
  })

  it('fails closed for duplicate history row or claim identity', async () => {
    const rows = [historyRow({}), historyRow({ id: 981_337, uuid: OTHER_CLAIM_ID, doctor: { ...historyRow({}).doctor, id: 132646 } })]
    await expect(history(page(rows))).rejects.toBeInstanceOf(TypeError)
  })

  it('deeply freezes the browser-independent reconciliation result', async () => {
    const result = await history(page([historyRow({})]))
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('does not mutate the current Medflex history pages', async () => {
    const input = page([historyRow({})])
    const snapshot = structuredClone(input)
    await history(input)
    expect(input).toEqual(snapshot)
  })
})
