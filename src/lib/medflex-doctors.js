const ALLOWED_LPU_ID = 34871
const ALLOWED_TOWN_ID = 1260
const ALLOWED_TOWN_NAME = 'Санкт-Петербург'
const DISCOVERY_PAGE_SIZE = 50
const MAX_DISCOVERY_DOCTORS = 1_000
const MAX_DISCOVERY_PAGES = Math.ceil(MAX_DISCOVERY_DOCTORS / DISCOVERY_PAGE_SIZE)
const SAFE_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const RESERVED_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'])
const CONFIGURATION_KEYS = Object.freeze(['clinic', 'doctors', 'types'])
const CLINIC_KEYS = Object.freeze(['cancel', 'directAppointment', 'location', 'lpuId', 'name', 'secondNameRequired', 'timedelta', 'timeZone', 'townId'])
const CATALOG_TYPE_KEYS = Object.freeze(['key', 'label', 'specialityId'])
const DOCTOR_KEYS = Object.freeze(['doctorId', 'lpuId', 'name', 'slug', 'townId', 'types'])
const DOCTOR_TYPE_KEYS = Object.freeze(['key', 'specialityId'])
const DISCOVERY_KEYS = Object.freeze(['client', 'websiteDoctors'])
const CLIENT_KEYS = Object.freeze(['createDoctorAppointment', 'getAppointmentHistory', 'getSchedule', 'listDoctors', 'listLpus'])
const WEBSITE_DOCTOR_KEYS = Object.freeze(['name', 'slug'])
const PAGE_KEYS = Object.freeze(['count', 'data', 'num_pages'])
const DOCTOR_UNAVAILABLE = Object.freeze({ available: false, reason: 'DOCTOR_UNAVAILABLE' })
const APPOINTMENT_TYPE_UNAVAILABLE = Object.freeze({ available: false, reason: 'APPOINTMENT_TYPE_UNAVAILABLE' })
const EMPTY_APPOINTMENT_TYPES = Object.freeze([])
const APPROVED_CLINIC = Object.freeze({
  lpuId: ALLOWED_LPU_ID,
  townId: ALLOWED_TOWN_ID,
  name: '«Клиника доктора Одинцова»',
  location: 'просп. Богатырский, д. 22, корп. 1',
  timeZone: 'Europe/Moscow',
  timedelta: 3,
  directAppointment: true,
  cancel: true,
  secondNameRequired: false,
})
const APPROVED_TYPES = Object.freeze({
  endocrinologist: Object.freeze({ specialityId: 15, label: 'Эндокринолог' }),
  surgeon: Object.freeze({ specialityId: 16, label: 'Хирург' }),
  gynecologist: Object.freeze({ specialityId: 32, label: 'Гинеколог' }),
  oncologist: Object.freeze({ specialityId: 51, label: 'Онколог' }),
  mammologist: Object.freeze({ specialityId: 55, label: 'Маммолог' }),
  ultrasound: Object.freeze({ specialityId: 90, label: 'Врач УЗИ' }),
  'gynecologist-endocrinologist': Object.freeze({ specialityId: 186, label: 'Гинеколог-эндокринолог' }),
  'surgeon-endocrinologist': Object.freeze({ specialityId: 189, label: 'Хирург-эндокринолог' }),
  obstetrician: Object.freeze({ specialityId: 203, label: 'Акушер' }),
  'oncologist-mammologist': Object.freeze({ specialityId: 246, label: 'Онколог-маммолог' }),
})
const DEFAULT_CONFIGURATION = Object.freeze({
  clinic: APPROVED_CLINIC,
  types: Object.freeze(Object.entries(APPROVED_TYPES).map(([key, value]) => Object.freeze({ key, specialityId: value.specialityId, label: value.label }))),
  doctors: Object.freeze([
    doctorConfiguration('odintsov', 70120, 'Одинцов Владислав Александрович', [['mammologist', 55], ['ultrasound', 90], ['surgeon-endocrinologist', 189]]),
    doctorConfiguration('prikhodko', 132646, 'Приходько Кирилл Андреевич', [['oncologist-mammologist', 246], ['mammologist', 55], ['surgeon', 16], ['ultrasound', 90]]),
    doctorConfiguration('macuchov', 782713, 'Мацухов Алим Суфьянович', [['oncologist-mammologist', 246], ['ultrasound', 90]]),
    doctorConfiguration('skurihin', 269686, 'Скурихин Семён Сергеевич', [['oncologist', 51], ['surgeon', 16], ['ultrasound', 90]]),
    doctorConfiguration('egorova', 224878, 'Егорова Анастасия Александровна', [['oncologist-mammologist', 246], ['gynecologist', 32], ['ultrasound', 90]]),
    doctorConfiguration('vlasenko', 392726, 'Власенко Ольга Сергеевна', [['gynecologist', 32], ['obstetrician', 203], ['gynecologist-endocrinologist', 186], ['ultrasound', 90]]),
    doctorConfiguration('zaharova', 225946, 'Захарова Татьяна Николаевна', [['gynecologist', 32], ['obstetrician', 203], ['ultrasound', 90]]),
    doctorConfiguration('nevzorova', 752759, 'Невзорова Елена Александровна', [['gynecologist', 32], ['ultrasound', 90]]),
    doctorConfiguration('kalinina', 349008, 'Калинина Ирина Аркадьевна', [['endocrinologist', 15]]),
  ]),
})

function doctorConfiguration(slug, doctorId, name, types) {
  return Object.freeze({ slug, doctorId, name, lpuId: ALLOWED_LPU_ID, townId: ALLOWED_TOWN_ID, types: Object.freeze(types.map(([key, specialityId]) => Object.freeze({ key, specialityId }))) })
}

function readRecord(input, allowed, scope) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`${scope} must be a plain data object`)
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${scope} must be a plain data object`)
  const value = Object.create(null)
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError(`${scope} contains unknown fields`)
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} must contain data fields only`)
    Object.defineProperty(value, key, { enumerable: true, value: descriptor.value })
  }
  return value
}

function requireFields(record, required, scope) {
  if (!required.every((key) => Object.hasOwn(record, key))) throw new TypeError(`${scope} is missing required fields`)
}

function readArray(input, scope, minimum = 0) {
  if (!Array.isArray(input)) throw new TypeError(`${scope} must be a dense data array`)
  const length = input.length
  if (!Number.isSafeInteger(length) || length < minimum) throw new TypeError(`${scope} must be a dense data array`)
  const indexes = new Set(Array.from({ length }, (_value, index) => String(index)))
  if (!Reflect.ownKeys(input).every((key) => key === 'length' || (typeof key === 'string' && indexes.has(key)))) throw new TypeError(`${scope} must not contain extra fields`)
  const value = new Array(length)
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index))
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} must be a dense data array`)
    value[index] = descriptor.value
  }
  return value
}

function normalizeText(value, scope, maximum) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be text`)
  const normalized = value.normalize('NFC').replace(/\s+/gu, ' ').trim()
  if (!normalized || [...normalized].length > maximum) throw new TypeError(`${scope} must be bounded text`)
  return normalized
}

/**
 * Normalizes a Medflex display name for exact, non-fuzzy identity comparison.
 */
export function normalizeMedflexName(value) {
  return normalizeText(value, 'Medflex name', 160)
}

function normalizeKey(value, scope) {
  if (typeof value !== 'string' || value.length > 64 || !SAFE_KEY_PATTERN.test(value) || RESERVED_KEYS.includes(value)) throw new TypeError(`${scope} must be a safe local key`)
  return value
}

function normalizePositiveInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${scope} must be a positive integer`)
  return value
}

function normalizeClinic(input) {
  const clinic = readRecord(input, CLINIC_KEYS, 'Medflex clinic configuration')
  requireFields(clinic, CLINIC_KEYS, 'Medflex clinic configuration')
  const normalized = {
    lpuId: normalizePositiveInteger(clinic.lpuId, 'Medflex clinic LPU ID'),
    townId: normalizePositiveInteger(clinic.townId, 'Medflex clinic town ID'),
    name: normalizeMedflexName(clinic.name),
    location: normalizeText(clinic.location, 'Medflex clinic location', 240),
    timeZone: normalizeText(clinic.timeZone, 'Medflex clinic time zone', 80),
    timedelta: clinic.timedelta,
    directAppointment: clinic.directAppointment,
    cancel: clinic.cancel,
    secondNameRequired: clinic.secondNameRequired,
  }
  if (normalized.lpuId !== ALLOWED_LPU_ID || normalized.townId !== ALLOWED_TOWN_ID) throw new TypeError('Medflex clinic must use the approved LPU and town')
  if (normalized.name !== APPROVED_CLINIC.name || normalized.location !== APPROVED_CLINIC.location || normalized.timeZone !== APPROVED_CLINIC.timeZone || normalized.timedelta !== APPROVED_CLINIC.timedelta) throw new TypeError('Medflex clinic identity does not match the approved clinic')
  if (normalized.directAppointment !== true) throw new TypeError('Medflex clinic must support direct appointment')
  if (normalized.cancel !== true || normalized.secondNameRequired !== false) throw new TypeError('Medflex clinic flags do not match the approved clinic')
  return Object.freeze(normalized)
}

function normalizeCatalog(input) {
  const types = readArray(input, 'Medflex appointment type catalog', 1)
  const byKey = new Map()
  const identifiers = new Set()
  for (const inputType of types) {
    const type = readRecord(inputType, CATALOG_TYPE_KEYS, 'Medflex appointment type')
    requireFields(type, CATALOG_TYPE_KEYS, 'Medflex appointment type')
    const key = normalizeKey(type.key, 'Medflex appointment type key')
    const specialityId = normalizePositiveInteger(type.specialityId, 'Medflex speciality ID')
    const label = normalizeText(type.label, 'Medflex appointment type label', 100)
    if (!Object.hasOwn(APPROVED_TYPES, key)) throw new TypeError('Medflex appointment type is not approved')
    if (APPROVED_TYPES[key].specialityId !== specialityId || APPROVED_TYPES[key].label !== label) throw new TypeError('Medflex appointment type identity is not approved')
    if (byKey.has(key) || identifiers.has(specialityId)) throw new TypeError('Medflex appointment type catalog contains duplicate identity')
    byKey.set(key, Object.freeze({ key, specialityId, label }))
    identifiers.add(specialityId)
  }
  return byKey
}

function normalizeDoctorTypes(input, catalog, scope) {
  const types = readArray(input, `${scope} appointment types`, 1)
  const keys = new Set()
  const identifiers = new Set()
  const server = []
  const publicTypes = []
  for (const inputType of types) {
    const type = readRecord(inputType, DOCTOR_TYPE_KEYS, `${scope} appointment type`)
    requireFields(type, DOCTOR_TYPE_KEYS, `${scope} appointment type`)
    const key = normalizeKey(type.key, `${scope} appointment type key`)
    const specialityId = normalizePositiveInteger(type.specialityId, `${scope} speciality ID`)
    if (keys.has(key) || identifiers.has(specialityId)) throw new TypeError(`${scope} contains duplicate appointment type identity`)
    const catalogType = catalog.get(key)
    if (!catalogType || catalogType.specialityId !== specialityId) throw new TypeError(`${scope} contains an unapproved appointment type`)
    keys.add(key)
    identifiers.add(specialityId)
    server.push(catalogType)
    publicTypes.push(Object.freeze({ key, label: catalogType.label }))
  }
  return Object.freeze({ server: Object.freeze(server), publicTypes: Object.freeze(publicTypes) })
}

function createDoctorResult(doctor, clinic, appointmentTypes) {
  return Object.freeze({
    available: true,
    slug: doctor.slug,
    name: doctor.name,
    doctorId: doctor.doctorId,
    lpuId: clinic.lpuId,
    townId: clinic.townId,
    timeZone: clinic.timeZone,
    location: clinic.location,
    timedelta: clinic.timedelta,
    directAppointment: clinic.directAppointment,
    cancel: clinic.cancel,
    secondNameRequired: clinic.secondNameRequired,
    appointmentTypes,
  })
}

function createAppointmentTypeResult(doctor, clinic, type) {
  return Object.freeze({
    available: true,
    slug: doctor.slug,
    name: doctor.name,
    doctorId: doctor.doctorId,
    lpuId: clinic.lpuId,
    townId: clinic.townId,
    timeZone: clinic.timeZone,
    location: clinic.location,
    timedelta: clinic.timedelta,
    directAppointment: clinic.directAppointment,
    cancel: clinic.cancel,
    secondNameRequired: clinic.secondNameRequired,
    typeKey: type.key,
    typeLabel: type.label,
    specialityId: type.specialityId,
  })
}

function safeLookup(index, key) {
  if (typeof key !== 'string' || !SAFE_KEY_PATTERN.test(key) || RESERVED_KEYS.includes(key)) return undefined
  return index.get(key)
}

/**
 * Validates and freezes a server-side doctor allowlist with browser-safe projections.
 */
export function createMedflexDoctorRegistry(input) {
  const configuration = readRecord(input, CONFIGURATION_KEYS, 'Medflex doctor registry')
  requireFields(configuration, CONFIGURATION_KEYS, 'Medflex doctor registry')
  const clinic = normalizeClinic(configuration.clinic)
  const catalog = normalizeCatalog(configuration.types)
  const inputDoctors = readArray(configuration.doctors, 'Medflex doctors', 1)
  const doctorIds = new Set()
  const doctorNames = new Set()
  const doctorIndex = new Map()
  const typeIndex = new Map()
  const publicTypeIndex = new Map()
  const publicDoctorIndex = new Map()
  const publicDoctors = []
  for (const inputDoctor of inputDoctors) {
    const record = readRecord(inputDoctor, DOCTOR_KEYS, 'Medflex doctor')
    requireFields(record, DOCTOR_KEYS, 'Medflex doctor')
    const doctor = {
      slug: normalizeKey(record.slug, 'Medflex doctor slug'),
      doctorId: normalizePositiveInteger(record.doctorId, 'Medflex doctor ID'),
      name: normalizeMedflexName(record.name),
      lpuId: normalizePositiveInteger(record.lpuId, 'Medflex doctor LPU ID'),
      townId: normalizePositiveInteger(record.townId, 'Medflex doctor town ID'),
    }
    if (doctor.lpuId !== clinic.lpuId || doctor.townId !== clinic.townId) throw new TypeError('Medflex doctor must belong to the approved clinic')
    if (doctorIndex.has(doctor.slug) || doctorIds.has(doctor.doctorId) || doctorNames.has(doctor.name)) throw new TypeError('Medflex doctor registry contains ambiguous identity')
    const types = normalizeDoctorTypes(record.types, catalog, `Medflex doctor ${doctor.slug}`)
    const serverDoctor = createDoctorResult(doctor, clinic, types.server)
    const publicDoctor = Object.freeze({ available: true, slug: doctor.slug, name: doctor.name, appointmentTypes: types.publicTypes })
    const doctorTypes = new Map(types.server.map((type) => [type.key, createAppointmentTypeResult(doctor, clinic, type)]))
    doctorIndex.set(doctor.slug, serverDoctor)
    typeIndex.set(doctor.slug, doctorTypes)
    publicTypeIndex.set(doctor.slug, types.publicTypes)
    publicDoctorIndex.set(doctor.slug, publicDoctor)
    publicDoctors.push(publicDoctor)
    doctorIds.add(doctor.doctorId)
    doctorNames.add(doctor.name)
  }
  const frozenDoctors = Object.freeze(publicDoctors)
  return Object.freeze({
    resolveDoctor: (slug) => safeLookup(doctorIndex, slug) || DOCTOR_UNAVAILABLE,
    resolveAppointmentType: (slug, typeKey) => {
      const doctorTypes = safeLookup(typeIndex, slug)
      if (!doctorTypes) return DOCTOR_UNAVAILABLE
      return safeLookup(doctorTypes, typeKey) || APPOINTMENT_TYPE_UNAVAILABLE
    },
    listAppointmentTypes: (slug) => safeLookup(publicTypeIndex, slug) || EMPTY_APPOINTMENT_TYPES,
    getDoctorAvailability: (slug) => safeLookup(publicDoctorIndex, slug) || DOCTOR_UNAVAILABLE,
    listDoctors: () => frozenDoctors,
  })
}

const DEFAULT_REGISTRY = createMedflexDoctorRegistry(DEFAULT_CONFIGURATION)

/**
 * Resolves a website slug to trusted server-only Medflex identity.
 */
export function resolveMedflexDoctor(slug) {
  return DEFAULT_REGISTRY.resolveDoctor(slug)
}

/**
 * Resolves a website slug and local appointment key to trusted server-only identity.
 */
export function resolveMedflexAppointmentType(slug, typeKey) {
  return DEFAULT_REGISTRY.resolveAppointmentType(slug, typeKey)
}

/**
 * Lists browser-safe appointment types for server-side serialization.
 */
export function listDoctorAppointmentTypes(slug) {
  return DEFAULT_REGISTRY.listAppointmentTypes(slug)
}

/**
 * Returns browser-safe booking availability for server-side serialization.
 */
export function getDoctorBookingAvailability(slug) {
  return DEFAULT_REGISTRY.getDoctorAvailability(slug)
}

/**
 * Lists browser-safe booking availability for server-side serialization.
 */
export function listBookableDoctors() {
  return DEFAULT_REGISTRY.listDoctors()
}

function ownValue(input, keys, scope, required = true) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`${scope} must be a plain data object`)
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${scope} must be a plain data object`)
  const values = []
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor) continue
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} must contain data fields only`)
    values.push(descriptor.value)
  }
  if (values.length > 1 && !values.every((value) => Object.is(value, values[0]))) throw new TypeError(`${scope} contains ambiguous aliases`)
  if (required && values.length === 0) throw new TypeError(`${scope} is missing a required field`)
  return values[0]
}

function normalizeBoolean(value, scope) {
  if (typeof value !== 'boolean') throw new TypeError(`${scope} must be boolean`)
  return value
}

function normalizeInteger(value, scope, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new TypeError(`${scope} must be an integer within range`)
  return value
}

function normalizeIdentifierArray(input, scope, minimum = 1) {
  const values = readArray(input, scope, minimum).map((value) => normalizePositiveInteger(value, scope))
  if (new Set(values).size !== values.length) throw new TypeError(`${scope} must not contain duplicate identifiers`)
  return Object.freeze(values)
}

function normalizeDoctorSpecialityIds(input) {
  const scope = 'Medflex doctor specialties'
  const values = readArray(input, scope, 1).map((value) => normalizePositiveInteger(value, scope))
  return Object.freeze([...new Set(values)])
}

function sanitizeClinic(input) {
  const specialityIds = normalizeIdentifierArray(ownValue(input, ['specialities'], 'Medflex LPU specialties'), 'Medflex LPU specialties')
  normalizeBoolean(ownValue(input, ['is_visible'], 'Medflex LPU visibility'), 'Medflex LPU visibility')
  const report = {
    id: normalizePositiveInteger(ownValue(input, ['id'], 'Medflex LPU'), 'Medflex LPU ID'),
    name: normalizeMedflexName(ownValue(input, ['name'], 'Medflex LPU')),
    townId: normalizePositiveInteger(ownValue(input, ['town_id'], 'Medflex LPU town'), 'Medflex LPU town ID'),
    townName: normalizeText(ownValue(input, ['town_name'], 'Medflex LPU town name'), 'Medflex LPU town name', 120),
    location: normalizeText(ownValue(input, ['address'], 'Medflex LPU location'), 'Medflex LPU location', 240),
    timeZone: APPROVED_CLINIC.timeZone,
    timedelta: normalizeInteger(ownValue(input, ['timedelta'], 'Medflex LPU timedelta'), 'Medflex LPU timedelta', -24, 24),
    directAppointment: normalizeBoolean(ownValue(input, ['direct_appointment_is_supported'], 'Medflex LPU direct appointment'), 'Medflex LPU direct appointment'),
    cancel: normalizeBoolean(ownValue(input, ['cancel_appointment_is_supported'], 'Medflex LPU cancellation'), 'Medflex LPU cancellation'),
    secondNameRequired: normalizeBoolean(ownValue(input, ['second_name_is_required'], 'Medflex LPU second name requirement'), 'Medflex LPU second name requirement'),
  }
  if (report.id !== APPROVED_CLINIC.lpuId || report.townId !== APPROVED_CLINIC.townId || report.townName !== ALLOWED_TOWN_NAME || report.name !== APPROVED_CLINIC.name) throw new TypeError('Medflex discovery found an unsupported clinic identity')
  if (report.location !== APPROVED_CLINIC.location || report.timeZone !== APPROVED_CLINIC.timeZone || report.timedelta !== APPROVED_CLINIC.timedelta) throw new TypeError('Medflex discovery found unsupported clinic metadata')
  if (report.directAppointment !== true || report.cancel !== true || report.secondNameRequired !== false) throw new TypeError('Medflex discovery found unsupported clinic booking flags')
  return Object.freeze({ report: Object.freeze(report), specialityIds })
}

function normalizePrice(value) {
  const price = typeof value === 'string' && /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value) ? Number(value) : value
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) throw new TypeError('Medflex specialty price must be a finite nonnegative number')
  return price
}

function matchesComposite(input, specialityId, lpuId, scope) {
  const recordSpecialityId = normalizePositiveInteger(ownValue(input, ['speciality_id'], scope), `${scope} speciality ID`)
  const recordLpuId = normalizePositiveInteger(ownValue(input, ['lpu_id'], scope), `${scope} LPU ID`)
  return recordSpecialityId === specialityId && recordLpuId === lpuId
}

function sanitizeCatalogSpecialty(type, lpuId, prices, ages) {
  const priceMatches = prices.filter((price) => matchesComposite(price, type.specialityId, lpuId, 'Medflex doctor price'))
  const ageMatches = ages.filter((age) => matchesComposite(age, type.specialityId, lpuId, 'Medflex doctor age'))
  if (priceMatches.length !== 1 || ageMatches.length !== 1) throw new TypeError('Medflex discovery found ambiguous or missing specialty metadata')
  const price = normalizePrice(ownValue(priceMatches[0], ['price'], 'Medflex doctor price'))
  const ageFrom = normalizeInteger(ownValue(ageMatches[0], ['min'], 'Medflex doctor minimum age'), 'Medflex doctor minimum age', 0, 130)
  const ageTo = normalizeInteger(ownValue(ageMatches[0], ['max'], 'Medflex doctor maximum age'), 'Medflex doctor maximum age', 0, 130)
  if (ageTo < ageFrom) throw new TypeError('Medflex discovery found an invalid specialty age range')
  return Object.freeze({ key: type.key, label: type.label, specialityId: type.specialityId, price, ageFrom, ageTo })
}

function sanitizeDoctor(input, websiteDoctor, expected, clinicSpecialityIds) {
  const id = normalizePositiveInteger(ownValue(input, ['id'], 'Medflex doctor'), 'Medflex doctor ID')
  const name = normalizeMedflexName(ownValue(input, ['efio'], 'Medflex doctor name'))
  const lpuIds = normalizeIdentifierArray(ownValue(input, ['lpus'], 'Medflex doctor LPUs'), 'Medflex doctor LPUs')
  const specialityIds = normalizeDoctorSpecialityIds(ownValue(input, ['specialities'], 'Medflex doctor specialties'))
  const prices = readArray(ownValue(input, ['prices'], 'Medflex doctor prices'), 'Medflex doctor prices', 1)
  const ages = readArray(ownValue(input, ['allowed_age'], 'Medflex doctor ages'), 'Medflex doctor ages', 1)
  if (id !== expected.doctorId || name !== websiteDoctor.name) throw new TypeError('Medflex discovery found an unsupported doctor identity')
  if (!lpuIds.includes(expected.lpuId)) throw new TypeError('Medflex discovery found an unsupported doctor LPU mapping')
  const specialties = expected.appointmentTypes.map((type) => {
    if (!specialityIds.includes(type.specialityId) || !clinicSpecialityIds.includes(type.specialityId)) throw new TypeError('Medflex discovery found an unsupported doctor specialty mapping')
    return sanitizeCatalogSpecialty(type, expected.lpuId, prices, ages)
  })
  return Object.freeze({ slug: websiteDoctor.slug, exactMatchCount: 1, id, name, lpuId: expected.lpuId, specialties: Object.freeze(specialties) })
}

function normalizeWebsiteDoctors(input) {
  const doctors = readArray(input, 'Website doctors', 1)
  const slugs = new Set()
  const names = new Set()
  return Object.freeze(doctors.map((inputDoctor) => {
    const record = readRecord(inputDoctor, WEBSITE_DOCTOR_KEYS, 'Website doctor')
    requireFields(record, WEBSITE_DOCTOR_KEYS, 'Website doctor')
    const doctor = Object.freeze({ slug: normalizeKey(record.slug, 'Website doctor slug'), name: normalizeMedflexName(record.name) })
    const expected = resolveMedflexDoctor(doctor.slug)
    if (!expected.available || expected.name !== doctor.name || slugs.has(doctor.slug) || names.has(doctor.name)) throw new TypeError('Website doctor identity is unsupported or ambiguous')
    slugs.add(doctor.slug)
    names.add(doctor.name)
    return doctor
  }))
}

function normalizePage(input, scope) {
  const page = readRecord(input, PAGE_KEYS, scope)
  requireFields(page, PAGE_KEYS, scope)
  const data = readArray(page.data, `${scope} data`)
  const count = normalizeInteger(page.count, `${scope} count`, 0, Number.MAX_SAFE_INTEGER)
  const pages = normalizeInteger(page.num_pages, `${scope} page count`, 0, MAX_DISCOVERY_PAGES)
  if ((pages === 0) !== (count === 0) || data.length > count || (pages === 0 && data.length !== 0)) throw new TypeError(`${scope} contains inconsistent pagination metadata`)
  return Object.freeze({ data: Object.freeze(data), count, pages })
}

function validateDoctorPage(page, pageNumber, count, pages) {
  const expectedPages = count === 0 ? 0 : Math.ceil(count / DISCOVERY_PAGE_SIZE)
  const remaining = count - (pageNumber - 1) * DISCOVERY_PAGE_SIZE
  const expectedLength = Math.max(0, Math.min(DISCOVERY_PAGE_SIZE, remaining))
  if (count > MAX_DISCOVERY_DOCTORS) throw new TypeError('Medflex doctor catalog exceeds the discovery limit')
  if (pages !== expectedPages) throw new TypeError('Medflex doctor pagination contains inconsistent totals')
  if (page.count !== count || page.pages !== pages) throw new TypeError('Medflex doctor pagination changed during discovery')
  if (page.data.length !== expectedLength) throw new TypeError('Medflex doctor pagination returned an inconsistent page size')
}

async function collectDoctorPages(client) {
  const doctors = []
  const first = normalizePage(await client.listDoctors({ page: 1, size: DISCOVERY_PAGE_SIZE, lpuIds: [ALLOWED_LPU_ID] }), 'Medflex doctor page')
  validateDoctorPage(first, 1, first.count, first.pages)
  doctors.push(...first.data)
  for (let page = 2; page <= first.pages; page += 1) {
    const next = normalizePage(await client.listDoctors({ page, size: DISCOVERY_PAGE_SIZE, lpuIds: [ALLOWED_LPU_ID] }), 'Medflex doctor page')
    validateDoctorPage(next, page, first.count, first.pages)
    doctors.push(...next.data)
  }
  if (doctors.length !== first.count) throw new TypeError('Medflex doctor pagination returned an incomplete catalog')
  return doctors
}

/**
 * Reads only LPU and doctor catalogs and returns a strict sanitized operator report.
 */
export async function discoverMedflexDoctors(input) {
  const options = readRecord(input, DISCOVERY_KEYS, 'Medflex discovery options')
  requireFields(options, DISCOVERY_KEYS, 'Medflex discovery options')
  const client = readRecord(options.client, CLIENT_KEYS, 'Medflex discovery client')
  requireFields(client, ['listDoctors', 'listLpus'], 'Medflex discovery client')
  if (typeof client.listDoctors !== 'function' || typeof client.listLpus !== 'function') throw new TypeError('Medflex discovery client methods must be functions')
  const websiteDoctors = normalizeWebsiteDoctors(options.websiteDoctors)
  const lpuPage = normalizePage(await client.listLpus({}), 'Medflex LPU page')
  if (lpuPage.pages > 1 || lpuPage.count !== lpuPage.data.length) throw new TypeError('Medflex LPU discovery pagination is unsupported')
  const clinicMatches = lpuPage.data.filter((lpu) => normalizeMedflexName(ownValue(lpu, ['name'], 'Medflex LPU')) === APPROVED_CLINIC.name)
  if (clinicMatches.length !== 1) throw new TypeError('Medflex discovery requires one exact clinic match')
  const clinic = sanitizeClinic(clinicMatches[0])
  const upstreamDoctors = await collectDoctorPages(client)
  const doctors = websiteDoctors.map((doctor) => {
    const matches = upstreamDoctors.filter((upstream) => normalizeMedflexName(ownValue(upstream, ['efio'], 'Medflex doctor name')) === doctor.name)
    if (matches.length !== 1) throw new TypeError('Medflex discovery requires one exact doctor match')
    return sanitizeDoctor(matches[0], doctor, resolveMedflexDoctor(doctor.slug), clinic.specialityIds)
  })
  return Object.freeze({ clinic: clinic.report, doctors: Object.freeze(doctors) })
}
