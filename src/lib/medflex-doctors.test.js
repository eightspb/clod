import { describe, expect, it } from 'vitest'
import { DOCTORS } from './doctors-data.js'
import {
  createMedflexDoctorRegistry,
  discoverMedflexDoctors,
  getDoctorBookingAvailability,
  listBookableDoctors,
  listDoctorAppointmentTypes,
  normalizeMedflexName,
  resolveMedflexAppointmentType,
  resolveMedflexDoctor,
} from './medflex-doctors.js'

const WEBSITE_IDENTITIES = Object.freeze([
  Object.freeze({ slug: 'odintsov', name: 'Одинцов Владислав Александрович' }),
  Object.freeze({ slug: 'prikhodko', name: 'Приходько Кирилл Андреевич' }),
  Object.freeze({ slug: 'macuchov', name: 'Мацухов Алим Суфьянович' }),
  Object.freeze({ slug: 'skurihin', name: 'Скурихин Семён Сергеевич' }),
  Object.freeze({ slug: 'egorova', name: 'Егорова Анастасия Александровна' }),
  Object.freeze({ slug: 'vlasenko', name: 'Власенко Ольга Сергеевна' }),
  Object.freeze({ slug: 'zaharova', name: 'Захарова Татьяна Николаевна' }),
  Object.freeze({ slug: 'nevzorova', name: 'Невзорова Елена Александровна' }),
  Object.freeze({ slug: 'kalinina', name: 'Калинина Ирина Аркадьевна' }),
])
const EXPECTED_SERVER_MATRIX = Object.freeze([
  Object.freeze({ slug: 'odintsov', doctorId: 70120, types: Object.freeze([['mammologist', 55], ['ultrasound', 90], ['surgeon-endocrinologist', 189]]) }),
  Object.freeze({ slug: 'prikhodko', doctorId: 132646, types: Object.freeze([['oncologist-mammologist', 246], ['mammologist', 55], ['surgeon', 16], ['ultrasound', 90]]) }),
  Object.freeze({ slug: 'macuchov', doctorId: 782713, types: Object.freeze([['oncologist-mammologist', 246], ['ultrasound', 90]]) }),
  Object.freeze({ slug: 'skurihin', doctorId: 269686, types: Object.freeze([['oncologist', 51], ['surgeon', 16], ['ultrasound', 90]]) }),
  Object.freeze({ slug: 'egorova', doctorId: 224878, types: Object.freeze([['oncologist-mammologist', 246], ['gynecologist', 32], ['ultrasound', 90]]) }),
  Object.freeze({ slug: 'vlasenko', doctorId: 392726, types: Object.freeze([['gynecologist', 32], ['obstetrician', 203], ['gynecologist-endocrinologist', 186], ['ultrasound', 90]]) }),
  Object.freeze({ slug: 'zaharova', doctorId: 225946, types: Object.freeze([['gynecologist', 32], ['obstetrician', 203], ['ultrasound', 90]]) }),
  Object.freeze({ slug: 'nevzorova', doctorId: 752759, types: Object.freeze([['gynecologist', 32], ['ultrasound', 90]]) }),
  Object.freeze({ slug: 'kalinina', doctorId: 349008, types: Object.freeze([['endocrinologist', 15]]) }),
])
const CLINIC = Object.freeze({
  lpuId: 34871,
  townId: 1260,
  name: '«Клиника доктора Одинцова»',
  location: 'просп. Богатырский, д. 22, корп. 1',
  timeZone: 'Europe/Moscow',
  timedelta: 3,
  directAppointment: true,
  cancel: true,
  secondNameRequired: false,
})
const TYPES = Object.freeze([
  Object.freeze({ key: 'mammologist', specialityId: 55, label: 'Маммолог' }),
  Object.freeze({ key: 'ultrasound', specialityId: 90, label: 'Врач УЗИ' }),
])

function registryConfiguration() {
  return {
    clinic: { ...CLINIC },
    types: TYPES.map((type) => ({ ...type })),
    doctors: [
      { slug: 'lyolya', doctorId: 810_071, name: 'Лёля О’Коннор', lpuId: 34871, townId: 1260, types: [{ key: 'mammologist', specialityId: 55 }] },
      { slug: 'issa-2', doctorId: 810_079, name: 'Исса Аль-Хаким', lpuId: 34871, townId: 1260, types: [{ key: 'ultrasound', specialityId: 90 }] },
    ],
  }
}

function configurationWith(change) {
  const configuration = registryConfiguration()
  change(configuration)
  return configuration
}

function clinicRecord(change = {}) {
  return {
    id: 34871,
    name: '  «Клиника\u00a0 доктора Одинцова»  ',
    address: 'просп. Богатырский, д. 22, корп. 1',
    town_id: 1260,
    town_name: 'Санкт-Петербург',
    timedelta: 3,
    direct_appointment_is_supported: true,
    cancel_appointment_is_supported: true,
    second_name_is_required: false,
    is_visible: true,
    specialities: [16, 51, 55, 90],
    phone: 'НЕ-ПЕЧАТАТЬ-ТЕЛЕФОН',
    legal_entity: 'НЕ-ПЕЧАТАТЬ-ЮРЛИЦО',
    ...change,
  }
}

function skurihinRecord(change = {}) {
  return {
    id: 269686,
    efio: '  Скурихин   Семе\u0308н Сергеевич ',
    lpus: [34871],
    specialities: [90, 55, 16, 51],
    prices: [
      { speciality_id: 90, lpu_id: 34871, price: 3_700, doctor_url: 'НЕ-ПЕЧАТАТЬ-URL' },
      { speciality_id: 51, lpu_id: 99991, price: 999_999 },
      { speciality_id: 55, lpu_id: 34871, price: 4_100 },
      { speciality_id: 16, lpu_id: 34871, price: 4_300 },
      { speciality_id: 51, lpu_id: 34871, price: 4_900 },
    ],
    allowed_age: [
      { speciality_id: 90, lpu_id: 34871, min: 18, max: 100 },
      { speciality_id: 51, lpu_id: 99991, min: 1, max: 17 },
      { speciality_id: 55, lpu_id: 34871, min: 18, max: 100 },
      { speciality_id: 16, lpu_id: 34871, min: 18, max: 100 },
      { speciality_id: 51, lpu_id: 34871, min: 18, max: 100 },
    ],
    authorization: 'НЕ-ПЕЧАТАТЬ-AUTH',
    ...change,
  }
}

function unrelatedDoctorRecords(count, offset = 0) {
  return Array.from({ length: count }, (_value, index) => ({ id: 800_000 + offset + index, efio: `Другой Врач ${offset + index}`, lpus: [34871], specialities: [], prices: [], allowed_age: [] }))
}

function legacySkurihinRecord() {
  return {
    id: 269686,
    name: 'Скурихин Семён Сергеевич',
    lpu_id: 34871,
    specialities: [
      { id: 51, name: 'Онколог', price: 4_900, age_from: 18, age_to: 100 },
      { id: 16, name: 'Хирург', price: 4_300, age_from: 18, age_to: 100 },
      { id: 90, name: 'Врач УЗИ', price: 3_700, age_from: 18, age_to: 100 },
    ],
  }
}

function page(data, numPages, count = data.length) {
  return Object.freeze({ data: Object.freeze(data), count, num_pages: numPages })
}

function discoveryFixture(lpus, pages) {
  const calls = []
  const lpuPage = Array.isArray(lpus) ? page(lpus, 1) : lpus
  const client = {
    listLpus: async (options) => { calls.push({ method: 'listLpus', options }); return lpuPage },
    listDoctors: async (options) => { calls.push({ method: 'listDoctors', options }); return typeof pages === 'function' ? pages(options) : pages[options.page - 1] },
    getSchedule: async () => { throw new Error('schedule must not be called') },
    getAppointmentHistory: async () => { throw new Error('history must not be called') },
    createDoctorAppointment: async () => { throw new Error('create must not be called') },
  }
  return { calls, client }
}

async function discoveryFailureOutcome(fixture) {
  let error
  try {
    await discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })
  } catch (caught) {
    error = caught
  }
  return { typeError: error instanceof TypeError, doctorRequests: fixture.calls.filter(({ method }) => method === 'listDoctors').length }
}

describe('default Medflex doctor registry', () => {
  it('matches every website doctor slug and name exactly in website order', () => {
    const website = DOCTORS.map(({ slug, name }) => ({ slug, name }))
    expect(listBookableDoctors().map(({ slug, name }) => ({ slug, name }))).toEqual(website)
  })

  it('matches the independently verified nine-doctor identity list', () => {
    expect(DOCTORS.map(({ slug, name }) => ({ slug, name }))).toEqual(WEBSITE_IDENTITIES)
  })

  it('resolves every website doctor deterministically as available', () => {
    expect(DOCTORS.map(({ slug }) => resolveMedflexDoctor(slug).available)).toEqual(Array(9).fill(true))
  })

  it('pins every trusted doctor and specialty identifier independently', () => {
    const matrix = EXPECTED_SERVER_MATRIX.map(({ slug }) => {
      const doctor = resolveMedflexDoctor(slug)
      return { slug, doctorId: doctor.doctorId, lpuId: doctor.lpuId, townId: doctor.townId, types: doctor.appointmentTypes.map(({ key, specialityId }) => [key, specialityId]) }
    })
    expect(matrix).toEqual(EXPECTED_SERVER_MATRIX.map(({ slug, doctorId, types }) => ({ slug, doctorId, lpuId: 34871, townId: 1260, types })))
  })

  it('returns trusted clinic and doctor identity for a known server slug', () => {
    const result = resolveMedflexDoctor('odintsov')
    expect({ doctorId: result.doctorId, lpuId: result.lpuId, townId: result.townId, timeZone: result.timeZone, location: result.location, directAppointment: result.directAppointment }).toEqual({ doctorId: 70120, lpuId: 34871, townId: 1260, timeZone: 'Europe/Moscow', location: 'просп. Богатырский, д. 22, корп. 1', directAppointment: true })
  })

  it('resolves a trusted local appointment type without accepting a numeric browser identifier', () => {
    const result = resolveMedflexAppointmentType('vlasenko', 'gynecologist-endocrinologist')
    expect({ available: result.available, doctorId: result.doctorId, lpuId: result.lpuId, specialityId: result.specialityId, typeKey: result.typeKey }).toEqual({ available: true, doctorId: 392726, lpuId: 34871, specialityId: 186, typeKey: 'gynecologist-endocrinologist' })
  })

  it('keeps the configured appointment-type order in public output', () => {
    expect(listDoctorAppointmentTypes('prikhodko')).toEqual([
      { key: 'oncologist-mammologist', label: 'Онколог-маммолог' },
      { key: 'mammologist', label: 'Маммолог' },
      { key: 'surgeon', label: 'Хирург' },
      { key: 'ultrasound', label: 'Врач УЗИ' },
    ])
  })

  it('explicitly excludes the unverified mammologist type from Scurihin', () => {
    expect(listDoctorAppointmentTypes('skurihin').map(({ key }) => key)).toEqual(['oncologist', 'surgeon', 'ultrasound'])
  })

  it('returns no numeric Medflex identity or mutable configuration in the public doctor model', () => {
    expect(getDoctorBookingAvailability('kalinina')).toEqual({ available: true, slug: 'kalinina', name: 'Калинина Ирина Аркадьевна', appointmentTypes: [{ key: 'endocrinologist', label: 'Эндокринолог' }] })
  })

  it('returns an explicit frozen unavailable result for an unknown doctor', () => {
    const result = resolveMedflexDoctor('neizvestnyy-vrach')
    expect({ result, frozen: Object.isFrozen(result) }).toEqual({ result: { available: false, reason: 'DOCTOR_UNAVAILABLE' }, frozen: true })
  })

  it('returns an explicit unavailable result for an unallowed doctor appointment type', () => {
    expect(resolveMedflexAppointmentType('skurihin', 'mammologist')).toEqual({ available: false, reason: 'APPOINTMENT_TYPE_UNAVAILABLE' })
  })

  it('returns a frozen empty public type list for an unknown doctor', () => {
    const result = listDoctorAppointmentTypes('net-v-spiske')
    expect({ result, frozen: Object.isFrozen(result) }).toEqual({ result: [], frozen: true })
  })

  it('does not invoke a getter while rejecting a hostile doctor slug', () => {
    let reads = 0
    const slug = Object.defineProperty({}, 'toString', { get: () => { reads += 1; return () => 'odintsov' } })
    const result = resolveMedflexDoctor(slug)
    expect({ reads, result }).toEqual({ reads: 0, result: { available: false, reason: 'DOCTOR_UNAVAILABLE' } })
  })

  it('does not invoke a getter while rejecting a hostile appointment-type key', () => {
    let reads = 0
    const key = Object.defineProperty({}, 'valueOf', { get: () => { reads += 1; return () => 'ultrasound' } })
    const result = resolveMedflexAppointmentType('odintsov', key)
    expect({ reads, result }).toEqual({ reads: 0, result: { available: false, reason: 'APPOINTMENT_TYPE_UNAVAILABLE' } })
  })

  it.each(['__proto__', 'constructor', 'prototype'])('fails closed for the hostile prototype key %s', (slug) => {
    expect(resolveMedflexDoctor(slug)).toEqual({ available: false, reason: 'DOCTOR_UNAVAILABLE' })
  })

  it('deeply freezes server and public registry results', () => {
    const server = resolveMedflexDoctor('egorova')
    const publicDoctor = getDoctorBookingAvailability('egorova')
    expect([server, server.appointmentTypes, ...server.appointmentTypes, publicDoctor, publicDoctor.appointmentTypes, ...publicDoctor.appointmentTypes].every(Object.isFrozen)).toBe(true)
  })
})

describe('Medflex doctor registry validation', () => {
  it('allows cross-doctor reuse of a configured appointment type', () => {
    const configuration = configurationWith((value) => { value.doctors[1].types = [{ key: 'mammologist', specialityId: 55 }] })
    const registry = createMedflexDoctorRegistry(configuration)
    expect(registry.resolveAppointmentType('issa-2', 'mammologist').specialityId).toBe(55)
  })

  it.each([
    ['duplicate doctor IDs', (value) => { value.doctors[1].doctorId = value.doctors[0].doctorId }],
    ['duplicate doctor slugs', (value) => { value.doctors[1].slug = value.doctors[0].slug }],
    ['duplicate type keys within one doctor', (value) => { value.doctors[0].types.push({ key: 'mammologist', specialityId: 55 }) }],
    ['duplicate type IDs within one doctor', (value) => { value.doctors[0].types.push({ key: 'ultrasound', specialityId: 55 }) }],
    ['unknown specialty catalog keys', (value) => { value.doctors[0].types[0] = { key: 'нейро-каталог', specialityId: 55 } }],
    ['unapproved specialty IDs', (value) => { value.doctors[0].types[0].specialityId = 550_055 }],
    ['unapproved LPU IDs', (value) => { value.doctors[0].lpuId = 34_872 }],
    ['unapproved town IDs', (value) => { value.doctors[0].townId = 1_261 }],
    ['empty doctor type lists', (value) => { value.doctors[0].types = [] }],
    ['unsafe doctor slugs', (value) => { value.doctors[0].slug = 'constructor' }],
    ['unsafe type keys', (value) => { value.types[0].key = '__proto__' }],
    ['direct booking disabled', (value) => { value.clinic.directAppointment = false }],
    ['duplicate normalized doctor names', (value) => { value.doctors[1].name = '  Ле\u0308ля   О’Коннор ' }],
  ])('fails fast for %s', (_label, change) => {
    expect(() => createMedflexDoctorRegistry(configurationWith(change))).toThrow(TypeError)
  })

  it('rejects an accessor configuration without invoking it', () => {
    let reads = 0
    const configuration = registryConfiguration()
    Object.defineProperty(configuration.doctors[0], 'name', { get: () => { reads += 1; return 'Подмена' }, enumerable: true })
    expect({ readsBefore: reads, failed: (() => { try { createMedflexDoctorRegistry(configuration); return false } catch { return true } })(), readsAfter: reads }).toEqual({ readsBefore: 0, failed: true, readsAfter: 0 })
  })

  it('detaches frozen registry output from later input mutation', () => {
    const configuration = registryConfiguration()
    const registry = createMedflexDoctorRegistry(configuration)
    configuration.types[0].label = 'Подменённая подпись'
    expect(registry.listAppointmentTypes('lyolya')[0].label).toBe('Маммолог')
  })
})

describe('Medflex discovery audit', () => {
  it('normalizes Unicode and collapses whitespace for exact name matching', () => {
    expect(normalizeMedflexName('  Скурихин\u00a0 Семе\u0308н\tСергеевич  ')).toBe('Скурихин Семён Сергеевич')
  })

  it('follows doctor pages with size fifty and only the approved LPU filter', async () => {
    const fixture = discoveryFixture([clinicRecord()], [page(unrelatedDoctorRecords(50), 2, 51), page([skurihinRecord()], 2, 51)])
    await discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })
    expect(fixture.calls).toEqual([
      { method: 'listLpus', options: {} },
      { method: 'listDoctors', options: { page: 1, size: 50, lpuIds: [34871] } },
      { method: 'listDoctors', options: { page: 2, size: 50, lpuIds: [34871] } },
    ])
  })

  it('rejects inconsistent page totals before a forged thousand-page request storm', async () => {
    const fixture = discoveryFixture([clinicRecord()], [page([skurihinRecord()], 1_000, 1)])
    const outcome = await discoveryFailureOutcome(fixture)
    expect(outcome).toEqual({ typeError: true, doctorRequests: 1 })
  })

  it('rejects an excessive but internally consistent catalog before a request storm', async () => {
    const repeatedPage = page(unrelatedDoctorRecords(50), 1_000, 50_000)
    const fixture = discoveryFixture([clinicRecord()], () => repeatedPage)
    const outcome = await discoveryFailureOutcome(fixture)
    expect(outcome).toEqual({ typeError: true, doctorRequests: 1 })
  })

  it('rejects a short non-final page before requesting its successor', async () => {
    const fixture = discoveryFixture([clinicRecord()], [page(unrelatedDoctorRecords(1), 2, 51), page([...unrelatedDoctorRecords(49, 1), skurihinRecord()], 2, 51)])
    const outcome = await discoveryFailureOutcome(fixture)
    expect(outcome).toEqual({ typeError: true, doctorRequests: 1 })
  })

  it('rejects an overfull intermediate page before requesting another page', async () => {
    const fixture = discoveryFixture([clinicRecord()], [page(unrelatedDoctorRecords(50), 3, 101), page([...unrelatedDoctorRecords(50, 50), skurihinRecord()], 3, 101)])
    const outcome = await discoveryFailureOutcome(fixture)
    expect(outcome).toEqual({ typeError: true, doctorRequests: 2 })
  })

  it('uses the client empty-catalog convention without requesting a phantom page', async () => {
    const fixture = discoveryFixture([clinicRecord()], [page([], 0, 0)])
    const outcome = await discoveryFailureOutcome(fixture)
    expect(outcome).toEqual({ typeError: true, doctorRequests: 1 })
  })

  it('returns only the sanitized clinic and configured doctor metadata', async () => {
    const fixture = discoveryFixture([clinicRecord()], [page([skurihinRecord()], 1)])
    const result = await discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })
    expect(result).toEqual({
      clinic: { id: 34871, name: '«Клиника доктора Одинцова»', townId: 1260, townName: 'Санкт-Петербург', location: 'просп. Богатырский, д. 22, корп. 1', timeZone: 'Europe/Moscow', timedelta: 3, directAppointment: true, cancel: true, secondNameRequired: false },
      doctors: [{ slug: 'skurihin', exactMatchCount: 1, id: 269686, name: 'Скурихин Семён Сергеевич', lpuId: 34871, specialties: [
        { key: 'oncologist', label: 'Онколог', specialityId: 51, price: 4_900, ageFrom: 18, ageTo: 100 },
        { key: 'surgeon', label: 'Хирург', specialityId: 16, price: 4_300, ageFrom: 18, ageTo: 100 },
        { key: 'ultrasound', label: 'Врач УЗИ', specialityId: 90, price: 3_700, ageFrom: 18, ageTo: 100 },
      ] }],
    })
  })

  it('canonicalizes the exact repeated production doctor specialties before allowlist checks', async () => {
    const doctor = skurihinRecord({ specialities: [51, 55, 16, 51, 90, 55, 246, 16, 55] })
    const fixture = discoveryFixture([clinicRecord({ is_visible: false })], [page([doctor], 1)])
    const result = await discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })
    expect(result.doctors[0].specialties.map(({ specialityId }) => specialityId)).toEqual([51, 16, 90])
  })

  it('does not copy arbitrary sensitive upstream fields into discovery JSON', async () => {
    const fixture = discoveryFixture([clinicRecord()], [page([skurihinRecord()], 1)])
    const result = await discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })
    expect(JSON.stringify(result)).not.toMatch(/НЕ-ПЕЧАТАТЬ|authorization|doctor_url|phone|legal_entity/i)
  })

  it('accepts false DMS-console visibility when direct booking is supported', async () => {
    const fixture = discoveryFixture([clinicRecord({ is_visible: false })], [page([skurihinRecord()], 1)])
    const result = await discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })
    expect({ directAppointment: result.clinic.directAppointment, doctorSlugs: result.doctors.map(({ slug }) => slug) }).toEqual({ directAppointment: true, doctorSlugs: ['skurihin'] })
  })

  it('rejects disabled direct booking independently of false DMS-console visibility', async () => {
    const fixture = discoveryFixture([clinicRecord({ direct_appointment_is_supported: false, is_visible: false })], [page([skurihinRecord()], 1)])
    await expect(discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })).rejects.toBeInstanceOf(TypeError)
  })

  it.each([
    ['missing clinic', [clinicRecord({ id: 34_872 })], [page([skurihinRecord()], 1)]],
    ['ambiguous clinic', [clinicRecord(), clinicRecord()], [page([skurihinRecord()], 1)]],
    ['non-boolean DMS visibility', [clinicRecord({ is_visible: 'false' })], [page([skurihinRecord()], 1)]],
    ['duplicate clinic specialty IDs', [clinicRecord({ specialities: [16, 51, 55, 55, 90] })], [page([skurihinRecord()], 1)]],
    ['clinic missing configured specialty', [clinicRecord({ specialities: [51] })], [page([skurihinRecord()], 1)]],
    ['missing doctor', [clinicRecord()], [page([], 0)]],
    ['ambiguous doctor', [clinicRecord()], [page([skurihinRecord(), skurihinRecord({ id: 900_269 })], 1)]],
    ['unsupported doctor identity', [clinicRecord()], [page([skurihinRecord({ id: 900_269 })], 1)]],
    ['unsupported doctor LPU', [clinicRecord()], [page([skurihinRecord({ lpus: [34_872] })], 1)]],
    ['nonpositive repeated doctor specialty', [clinicRecord()], [page([skurihinRecord({ specialities: [51, 55, 0, 51, 90, 16] })], 1)]],
    ['missing configured specialty', [clinicRecord()], [page([skurihinRecord({ specialities: [51] })], 1)]],
    ['legacy doctor schema', [clinicRecord()], [page([legacySkurihinRecord()], 1)]],
    ['missing branch price', [clinicRecord()], [page([skurihinRecord({ prices: skurihinRecord().prices.filter(({ speciality_id, lpu_id }) => speciality_id !== 16 || lpu_id !== 34871) })], 1)]],
    ['missing branch age', [clinicRecord()], [page([skurihinRecord({ allowed_age: skurihinRecord().allowed_age.filter(({ speciality_id, lpu_id }) => speciality_id !== 90 || lpu_id !== 34871) })], 1)]],
    ['duplicate branch price', [clinicRecord()], [page([skurihinRecord({ prices: [...skurihinRecord().prices, { speciality_id: 16, lpu_id: 34871, price: 4_300 }] })], 1)]],
    ['duplicate branch age', [clinicRecord()], [page([skurihinRecord({ allowed_age: [...skurihinRecord().allowed_age, { speciality_id: 90, lpu_id: 34871, min: 18, max: 100 }] })], 1)]],
    ['zero doctor pages with data', [clinicRecord()], [page([skurihinRecord()], 0, 1)]],
    ['doctor count drift', [clinicRecord()], [page(unrelatedDoctorRecords(50), 2, 51), page([skurihinRecord()], 2, 52)]],
    ['short final doctor page', [clinicRecord()], [page(unrelatedDoctorRecords(50), 2, 51), page([], 2, 51)]],
    ['overfull final doctor page', [clinicRecord()], [page(unrelatedDoctorRecords(50), 2, 51), page([skurihinRecord(), unrelatedDoctorRecords(1, 50)[0]], 2, 51)]],
    ['inconsistent LPU count', page([clinicRecord()], 1, 2), [page([skurihinRecord()], 1)]],
  ])('rejects %s without returning a partial mapping', async (_label, lpus, pages) => {
    const fixture = discoveryFixture(lpus, pages)
    await expect(discoverMedflexDoctors({ client: fixture.client, websiteDoctors: [WEBSITE_IDENTITIES[3]] })).rejects.toBeInstanceOf(TypeError)
  })
})
