import { test as base, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { isDeepStrictEqual } from 'node:util'

const DOCTORS = Object.freeze([
  Object.freeze({ slug: 'odintsov', name: 'Одинцов Владислав Александрович', specialization: 'Онколог-маммолог, врач УЗД, ДМН' }),
  Object.freeze({ slug: 'prikhodko', name: 'Приходько Кирилл Андреевич', specialization: 'Онколог-маммолог, хирург, врач УЗД' }),
  Object.freeze({ slug: 'macuchov', name: 'Мацухов Алим Суфьянович', specialization: 'Онколог-маммолог, хирург, врач УЗД' }),
  Object.freeze({ slug: 'skurihin', name: 'Скурихин Семён Сергеевич', specialization: 'Онколог-маммолог, хирург, врач УЗД' }),
  Object.freeze({ slug: 'egorova', name: 'Егорова Анастасия Александровна', specialization: 'Онколог-маммолог, гинеколог, врач УЗД' }),
  Object.freeze({ slug: 'vlasenko', name: 'Власенко Ольга Сергеевна', specialization: 'Гинеколог, акушер-гинеколог, врач УЗД' }),
  Object.freeze({ slug: 'zaharova', name: 'Захарова Татьяна Николаевна', specialization: 'Гинеколог, акушер-гинеколог, врач УЗД' }),
  Object.freeze({ slug: 'nevzorova', name: 'Невзорова Елена Александровна', specialization: 'Гинеколог, акушер-гинеколог, нутрициолог, врач УЗД' }),
  Object.freeze({ slug: 'kalinina', name: 'Калинина Ирина Аркадьевна', specialization: 'Эндокринолог, нутрициолог' }),
])
const SINGLE_TYPE = Object.freeze([
  Object.freeze({ key: 'mammologist', label: 'Маммолог', price: 4_900, minAge: 18, maxAge: 65 }),
])
const MULTIPLE_TYPES = Object.freeze([
  ...SINGLE_TYPE,
  Object.freeze({ key: 'ultrasound', label: 'Врач УЗИ', price: 3_500, minAge: 0, maxAge: null }),
])
const PATIENT = Object.freeze({
  lastName: 'Тестова',
  firstName: 'Безопасная',
  secondName: 'Пациентка',
  phone: '+7 (900) 000-00-01',
  birthday: '1988-02-29',
  comment: 'E2E без реальной записи',
})
const CLAIM_ID = '872bb8e7-fdc5-4886-8c54-2be1fe31d7fb'
const CLINIC_LOCATION = 'просп. Богатырский, д. 22, корп. 1'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const MEDFLEX_HOSTS = new Set(['api.medflex.ru', 'booking.medflex.ru'])

function reply(json, status = 200, headers = {}) {
  return { status, json, headers }
}

function plusDays(value, count) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

function slot(date, time = '10:20') {
  const startsAt = new Date(`${date}T${time}:00+03:00`)
  const endsAt = new Date(startsAt.getTime() + 40 * 60 * 1000)
  const hour = Number(time.slice(0, 2))
  const period = hour < 12 ? 'morning' : hour < 17 ? 'day' : 'evening'
  return Object.freeze({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), time, period })
}

function doctorBySlug(slug) {
  const doctor = DOCTORS.find((candidate) => candidate.slug === slug)
  if (!doctor) throw new TypeError(`Unknown public doctor slug: ${slug}`)
  return doctor
}

function publicDoctor(slug) {
  const doctor = doctorBySlug(slug)
  return { slug: doctor.slug, name: doctor.name, location: CLINIC_LOCATION, timeZone: 'Europe/Moscow' }
}

function availableSchedule(url, slug, { appointmentTypes = SINGLE_TYPE, time = '10:20' } = {}) {
  const from = url.searchParams.get('from')
  if (!from) throw new TypeError('Schedule request must contain from')
  const date = plusDays(from, 1)
  const appointment = slot(date, time)
  return reply({ data: { available: true, reason: 'AVAILABLE', doctor: publicDoctor(slug), appointmentTypes, dates: [{ date, count: 1, slots: [appointment] }] } })
}

function emptySchedule(url, slug) {
  if (!url.searchParams.get('from')) throw new TypeError('Schedule request must contain from')
  return reply({ data: { available: false, reason: 'NO_SLOTS', doctor: publicDoctor(slug), appointmentTypes: SINGLE_TYPE, dates: [] } })
}

function confirmation(body) {
  const doctor = publicDoctor(body.doctorSlug)
  const type = [...MULTIPLE_TYPES].find((candidate) => candidate.key === body.appointmentType) ?? SINGLE_TYPE[0]
  return reply({ data: { status: 'confirmed', claimId: CLAIM_ID, doctor, appointmentType: { key: type.key, label: type.label }, startsAt: body.dtStart, endsAt: body.dtEnd, price: type.price } }, 201)
}

async function fulfillJson(route, response) {
  await route.fulfill({
    status: response.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...response.headers },
    body: JSON.stringify(response.json),
  })
}

function assertNoExternalAborts(attempts) {
  expect(attempts).toBe(0)
}

const test = base.extend({
  bookingNetwork: async ({ page }, provideFixture) => {
    const state = {
      medflexAttempts: 0,
      externalAborts: 0,
      unhandledAppointmentRequests: 0,
      blockedLocalRequests: [],
      routeErrors: 0,
      slotQueries: [],
      bookBodies: [],
      bookRequests: [],
      analyticsPayloads: [],
      bookingAnalyticsWaiters: [],
      slotsResponder: undefined,
      bookResponder: undefined,
    }
    const bookingNetwork = {
      respondSlots(responder) {
        state.slotsResponder = responder
      },
      respondBook(responder) {
        state.bookResponder = responder
      },
      async probeBlockedLocalMutations() {
        const probes = [
          { method: 'POST', pathname: '/api/appointments/slots' },
          { method: 'POST', pathname: '/api/appointments/book/' },
          { method: 'GET', pathname: '/api/appointments/unknown' },
          { method: 'PATCH', pathname: '/__e2e__/unknown-mutation' },
        ]
        const responses = await page.evaluate(async (requests) => {
          const result = []
          for (const request of requests) {
            const options = { method: request.method }
            if (request.method !== 'GET' && request.method !== 'HEAD') options.body = JSON.stringify({ probe: 'Клиника Ω' })
            const response = await fetch(request.pathname, options)
            result.push({ ...request, status: response.status, fence: response.headers.get('x-e2e-network-fence') })
          }
          return result
        }, probes)
        const blocked = state.blockedLocalRequests.splice(0)
        return { responses, blocked }
      },
      get slotQueries() {
        return [...state.slotQueries]
      },
      get bookBodies() {
        return [...state.bookBodies]
      },
      get bookRequests() {
        return [...state.bookRequests]
      },
      get analyticsPayloads() {
        return [...state.analyticsPayloads]
      },
      waitForBookingAnalyticsBatch() {
        const existing = state.analyticsPayloads.find(containsBookingInteraction)
        if (existing) return Promise.resolve(existing)
        return new Promise((resolve) => state.bookingAnalyticsWaiters.push(resolve))
      },
      auditControlledExternalProbe() {
        const attempts = state.externalAborts
        let rejected = false
        try {
          assertNoExternalAborts(attempts)
        } catch {
          rejected = true
        }
        state.externalAborts = 0
        return { attempts, rejected }
      },
    }
    await page.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()
      const blockLocal = async (status) => {
        state.blockedLocalRequests.push({ method, pathname: url.pathname })
        await fulfillJson(route, reply({ error: 'TEST_NETWORK_FENCE', message: 'Blocked by isolated E2E network fence' }, status, { 'X-E2E-Network-Fence': 'blocked' }))
      }
      if (MEDFLEX_HOSTS.has(url.hostname)) {
        state.medflexAttempts += 1
        await route.abort('blockedbyclient')
        return
      }
      if (!LOCAL_HOSTS.has(url.hostname)) {
        state.externalAborts += 1
        await route.abort('blockedbyclient')
        return
      }
      if (url.pathname === '/api/analytics/event' || url.pathname === '/api/analytics/heartbeat') {
        if (method !== 'POST') {
          await blockLocal(405)
          return
        }
        let payload
        try {
          payload = JSON.parse(request.postData() ?? '')
        } catch {
          state.routeErrors += 1
          await fulfillJson(route, reply({ error: 'TEST_ANALYTICS_INVALID', message: 'Analytics test body is not JSON' }, 400))
          return
        }
        state.analyticsPayloads.push(payload)
        if (containsBookingInteraction(payload)) {
          const waiters = state.bookingAnalyticsWaiters.splice(0)
          waiters.forEach((resolve) => resolve(payload))
        }
        await fulfillJson(route, reply({ data: { accepted: true } }))
        return
      }
      if (url.pathname === '/api/appointments/slots') {
        if (method !== 'GET') {
          await blockLocal(405)
          return
        }
        const slug = url.searchParams.get('doctor') ?? ''
        state.slotQueries.push({ method, slug })
        if (!state.slotsResponder) {
          state.unhandledAppointmentRequests += 1
          await fulfillJson(route, reply({ error: 'TEST_ROUTE_MISSING', message: 'No schedule response configured' }, 503))
          return
        }
        try {
          await fulfillJson(route, await state.slotsResponder({ url, slug, index: state.slotQueries.length - 1 }))
        } catch {
          state.routeErrors += 1
          await fulfillJson(route, reply({ error: 'TEST_ROUTE_ERROR', message: 'Schedule mock failed closed' }, 503))
        }
        return
      }
      if (url.pathname === '/api/appointments/book') {
        if (method !== 'POST') {
          await blockLocal(405)
          return
        }
        const raw = request.postData() ?? ''
        let body
        try {
          body = JSON.parse(raw)
        } catch {
          state.routeErrors += 1
          await fulfillJson(route, reply({ error: 'TEST_BODY_INVALID', message: 'Booking test body is not JSON' }, 400))
          return
        }
        state.bookBodies.push(body)
        state.bookRequests.push({ raw, body })
        if (!state.bookResponder) {
          state.unhandledAppointmentRequests += 1
          await fulfillJson(route, reply({ error: 'TEST_ROUTE_MISSING', message: 'No booking response configured' }, 503))
          return
        }
        try {
          await fulfillJson(route, await state.bookResponder({ body, index: state.bookBodies.length - 1 }))
        } catch {
          state.routeErrors += 1
          await fulfillJson(route, reply({ error: 'TEST_ROUTE_ERROR', message: 'Booking mock failed closed' }, 503))
        }
        return
      }
      if (url.pathname === '/api/appointments' || url.pathname.startsWith('/api/appointments/')) {
        await blockLocal(404)
        return
      }
      if (method !== 'GET' && method !== 'HEAD') {
        await blockLocal(405)
        return
      }
      await route.continue()
    })
    await provideFixture(bookingNetwork)
    expect(state.medflexAttempts).toBe(0)
    assertNoExternalAborts(state.externalAborts)
    expect(state.unhandledAppointmentRequests).toBe(0)
    expect(state.blockedLocalRequests).toHaveLength(0)
    expect(state.bookingAnalyticsWaiters).toHaveLength(0)
    expect(state.routeErrors).toBe(0)
  },
})

async function gotoHydrated(page, path) {
  await page.goto(path)
  await expect(page.locator('astro-island[component-export="BookingFlow"]:not([ssr])')).toHaveCount(1)
}

async function openGeneralBooking(page) {
  await gotoHydrated(page, '/')
  const trigger = page.locator('#appointment-form [data-booking-btn]').first()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
  await expect(dialog.getByRole('heading', { name: 'Выберите врача' })).toBeVisible()
  return { dialog, trigger }
}

async function openDoctorBooking(page, slug) {
  await gotoHydrated(page, `/doctors/${slug}`)
  const trigger = page.locator(`main [data-booking-doctor="${slug}"]`).first()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
  await expect(dialog.getByRole('heading', { name: 'Выберите дату и время' })).toBeVisible()
  return { dialog, trigger }
}

async function chooseDoctor(dialog, doctor) {
  await dialog.getByRole('button', { name: doctor.name, exact: false }).click()
}

async function chooseAppointmentType(dialog) {
  await dialog.getByRole('button', { name: /^Маммолог/ }).click()
  await expect(dialog.getByRole('heading', { name: 'Выберите дату и время' })).toBeVisible()
}

async function reachPatient(dialog, time = '10:20') {
  await dialog.getByRole('button', { name: time, exact: true }).click()
  await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Данные пациента' })).toBeVisible()
}

async function fillPatient(dialog) {
  await dialog.getByLabel('Фамилия', { exact: true }).fill(PATIENT.lastName)
  await dialog.getByLabel('Имя', { exact: true }).fill(PATIENT.firstName)
  await dialog.getByLabel('Отчество', { exact: true }).fill(PATIENT.secondName)
  await dialog.getByLabel('Телефон', { exact: true }).fill(PATIENT.phone)
  await dialog.getByLabel('Дата рождения', { exact: true }).fill(PATIENT.birthday)
  await dialog.getByLabel('Комментарий', { exact: true }).fill(PATIENT.comment)
  await dialog.getByRole('checkbox', { name: /Согласие на обработку/ }).check()
}

async function reachReview(dialog) {
  await reachPatient(dialog)
  await fillPatient(dialog)
  await dialog.getByRole('button', { name: 'Проверить запись', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Проверьте запись' })).toBeVisible()
}

async function viewportBounds(page, locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: window.innerWidth,
      height: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
    }
  })
}

function containsPatientData(payload) {
  const serialized = JSON.stringify(payload).toLocaleLowerCase('ru-RU')
  const needles = [PATIENT.lastName, PATIENT.firstName, PATIENT.secondName, PATIENT.phone, PATIENT.phone.replace(/\D/g, ''), PATIENT.birthday, PATIENT.comment]
  return needles.some((value) => serialized.includes(value.toLocaleLowerCase('ru-RU')))
}

function containsBookingInteraction(payload) {
  if (payload?.type !== 'batch' || !Array.isArray(payload.data?.events)) return false
  return payload.data.events.some((event) => event?.type === 'click' && String(event.details?.classes ?? '').split(' ').some((name) => name.startsWith('booking-')))
}

test('network fence blocks appointment variants and unknown local mutations before the BFF', async ({ page, bookingNetwork }) => {
  await gotoHydrated(page, '/')
  const contract = await bookingNetwork.probeBlockedLocalMutations()
  expect(contract).toEqual({
    responses: [
      { method: 'POST', pathname: '/api/appointments/slots', status: 405, fence: 'blocked' },
      { method: 'POST', pathname: '/api/appointments/book/', status: 404, fence: 'blocked' },
      { method: 'GET', pathname: '/api/appointments/unknown', status: 404, fence: 'blocked' },
      { method: 'PATCH', pathname: '/__e2e__/unknown-mutation', status: 405, fence: 'blocked' },
    ],
    blocked: [
      { method: 'POST', pathname: '/api/appointments/slots' },
      { method: 'POST', pathname: '/api/appointments/book/' },
      { method: 'GET', pathname: '/api/appointments/unknown' },
      { method: 'PATCH', pathname: '/__e2e__/unknown-mutation' },
    ],
  })
})

test('external network fence exposes a controlled third-party abort to its teardown audit', async ({ page, bookingNetwork }) => {
  await gotoHydrated(page, '/')
  let transport = 'continued'
  try {
    await page.goto('https://third-party.invalid/__e2e__/network-fence')
  } catch {
    transport = 'aborted'
  }
  const audit = bookingNetwork.auditControlledExternalProbe()
  expect({ transport, audit }).toEqual({ transport: 'aborted', audit: { attempts: 1, rejected: true } })
})

test('general CTA completes the first-party flow without leaking patient data to analytics', async ({ page, bookingNetwork }) => {
  bookingNetwork.respondSlots(({ url, slug }) => availableSchedule(url, slug, { appointmentTypes: MULTIPLE_TYPES }))
  bookingNetwork.respondBook(({ body }) => confirmation(body))
  const { dialog } = await openGeneralBooking(page)
  await chooseDoctor(dialog, doctorBySlug('odintsov'))
  await expect(dialog.getByRole('heading', { name: 'Выберите тип приёма' })).toBeVisible()
  await chooseAppointmentType(dialog)
  await reachReview(dialog)
  await dialog.getByRole('button', { name: 'Подтвердить запись', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Запись подтверждена' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Добавить в календарь' })).toBeVisible()
  const bodies = bookingNetwork.bookBodies
  const safeContract = {
    posts: bodies.length,
    keys: Object.keys(bodies[0] ?? {}).sort(),
    doctorSlug: bodies[0]?.doctorSlug,
    appointmentType: bodies[0]?.appointmentType,
    consent: bodies[0]?.consent,
    hasTrustedFields: ['doctorId', 'lpuId', 'specialityId', 'price', 'token'].some((key) => Object.hasOwn(bodies[0] ?? {}, key)),
  }
  expect(safeContract).toEqual({
    posts: 1,
    keys: ['appointmentType', 'comment', 'consent', 'doctorSlug', 'dtEnd', 'dtStart', 'intentId', 'patient'],
    doctorSlug: 'odintsov',
    appointmentType: 'mammologist',
    consent: true,
    hasTrustedFields: false,
  })
  const batch = await bookingNetwork.waitForBookingAnalyticsBatch()
  const analyticsPayloads = bookingNetwork.analyticsPayloads
  expect({
    batchType: batch?.type,
    bookingInteraction: containsBookingInteraction(batch),
    payloadsCaptured: analyticsPayloads.length > 2,
    everyPayloadPiiFree: analyticsPayloads.every((payload) => !containsPatientData(payload)),
  }).toEqual({ batchType: 'batch', bookingInteraction: true, payloadsCaptured: true, everyPayloadPiiFree: true })
})

test('doctor route preselects its public slug and skips a single appointment type', async ({ page, bookingNetwork }) => {
  bookingNetwork.respondSlots(({ url, slug }) => availableSchedule(url, slug))
  const { dialog } = await openDoctorBooking(page, 'egorova')
  expect(bookingNetwork.slotQueries).toEqual([{ method: 'GET', slug: 'egorova' }])
  await expect(dialog.getByRole('heading', { name: 'Выберите тип приёма' })).toHaveCount(0)
  await expect(dialog.getByText('Егорова Анастасия Александровна', { exact: true })).toBeVisible()
})

test('375x812 mobile header trigger restores exact focus after Escape', async ({ page, bookingNetwork }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await gotoHydrated(page, '/')
  await page.getByRole('button', { name: 'Открыть меню' }).click()
  const menu = page.locator('#mobile-menu')
  const trigger = menu.getByRole('button', { name: 'Записаться на приём' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
  await expect(dialog).toBeFocused()
  const bounds = await viewportBounds(page, dialog)
  expect(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= bounds.width && bounds.bottom <= bounds.height).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(menu).toBeVisible()
  await expect(trigger).toBeFocused()
  expect(bookingNetwork.slotQueries).toHaveLength(0)
})

test('320x568 mobile doctor fallback stays visible without horizontal overflow', async ({ page, bookingNetwork }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  bookingNetwork.respondSlots(({ url, slug }) => emptySchedule(url, slug))
  await gotoHydrated(page, '/doctors/odintsov')
  await page.locator('astro-dev-toolbar').evaluateAll((elements) => elements.forEach((element) => element.remove()))
  await page.locator('[data-sticky-cta] [data-booking-btn]').click()
  const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
  await expect(dialog.getByRole('heading', { name: 'Нет свободного времени' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: /748-22-10/ })).toBeVisible()
  const bounds = await viewportBounds(page, dialog)
  expect(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= bounds.width && bounds.bottom <= bounds.height).toBe(true)
  expect(bounds.documentWidth <= bounds.width).toBe(true)
})

test('keyboard-only flow selects doctor and time then restores its trigger', async ({ page, bookingNetwork }) => {
  bookingNetwork.respondSlots(({ url, slug }) => availableSchedule(url, slug))
  await gotoHydrated(page, '/')
  const trigger = page.locator('#appointment-form [data-booking-btn]').first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
  await expect(dialog.getByRole('heading', { name: 'Выберите врача' })).toBeVisible()
  const doctor = dialog.getByRole('button', { name: doctorBySlug('odintsov').name, exact: false })
  await doctor.focus()
  await page.keyboard.press('Enter')
  const time = dialog.getByRole('button', { name: '10:20', exact: true })
  await expect(time).toBeVisible()
  await time.focus()
  await page.keyboard.press('Space')
  const continueButton = dialog.getByRole('button', { name: 'Продолжить', exact: true })
  await continueButton.focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('heading', { name: 'Данные пациента' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('slot conflict refreshes choices, focuses the replacement, and preserves patient input', async ({ page, bookingNetwork }) => {
  bookingNetwork.respondSlots(({ url, slug, index }) => availableSchedule(url, slug, { time: index === 0 ? '10:20' : '18:30' }))
  bookingNetwork.respondBook(() => reply({ error: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже недоступно', freshIntentRequired: true, refreshSchedule: true }, 409))
  const { dialog } = await openDoctorBooking(page, 'odintsov')
  await reachReview(dialog)
  await dialog.getByRole('button', { name: 'Подтвердить запись', exact: true }).click()
  const replacement = dialog.getByRole('button', { name: '18:30', exact: true })
  await expect(replacement).toBeFocused()
  await expect(page.locator('.booking-overlay')).toHaveAttribute('data-booking-conflict', 'slot')
  await replacement.click()
  await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Данные пациента' })).toBeVisible()
  const firstNamePreserved = await dialog.getByLabel('Имя', { exact: true }).evaluate((input, expected) => input.value === expected, PATIENT.firstName)
  expect(firstNamePreserved).toBe(true)
  await expect(dialog.getByRole('status')).toHaveText('Выбранное время изменилось. Выберите новое время')
  expect(bookingNetwork.bookBodies).toHaveLength(1)
  expect(bookingNetwork.slotQueries).toHaveLength(2)
})

test('empty schedule offers later dates, another doctor, and the phone fallback', async ({ page, bookingNetwork }) => {
  bookingNetwork.respondSlots(({ url, slug }) => emptySchedule(url, slug))
  await gotoHydrated(page, '/doctors/odintsov')
  await page.locator('main [data-booking-doctor="odintsov"]').first().click()
  const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
  await expect(dialog.getByRole('heading', { name: 'Нет свободного времени' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Следующие 14 дней' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Выбрать другого врача' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: /748-22-10/ })).toHaveAttribute('href', 'tel:+78127482210')
})

for (const scenario of [
  { status: 429, code: 'RATE_LIMITED', title: 'Слишком много запросов' },
  { status: 503, code: 'SCHEDULE_UNAVAILABLE', title: 'Расписание временно недоступно' },
]) {
  test(`GET ${scenario.status} keeps retry and phone recovery actions`, async ({ page, bookingNetwork }) => {
    bookingNetwork.respondSlots(() => reply({ error: scenario.code, message: scenario.title }, scenario.status))
    await gotoHydrated(page, '/doctors/odintsov')
    await page.locator('main [data-booking-doctor="odintsov"]').first().click()
    const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
    await expect(dialog.getByRole('heading', { name: scenario.title })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Повторить загрузку' })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /748-22-10/ })).toBeVisible()
  })
}

test('uncertain POST rechecks the exact intent and confirms without a third request', async ({ page, bookingNetwork }) => {
  bookingNetwork.respondSlots(({ url, slug }) => availableSchedule(url, slug))
  bookingNetwork.respondBook(({ body, index }) => {
    if (index === 0) return reply({ data: { status: 'uncertain', canRetry: false, phoneFallback: true } }, 202)
    if (index === 1) return confirmation(body)
    throw new TypeError('Unexpected third booking POST')
  })
  const { dialog } = await openDoctorBooking(page, 'odintsov')
  await reachReview(dialog)
  await dialog.getByRole('button', { name: 'Подтвердить запись', exact: true }).click()
  await dialog.getByRole('heading', { name: 'Статус записи не подтверждён' }).waitFor()
  const statusAction = dialog.getByRole('button', { name: 'Проверить статус' })
  const phoneHref = await dialog.getByRole('link', { name: /748-22-10/ }).getAttribute('href')
  await statusAction.click()
  const success = dialog.getByRole('heading', { name: 'Запись подтверждена' })
  await success.waitFor()
  const requests = bookingNetwork.bookRequests
  const first = requests[0]
  const second = requests[1]
  expect({
    posts: requests.length,
    byteIdentical: typeof first?.raw === 'string' && first.raw.length > 0 && Buffer.from(first.raw).equals(Buffer.from(second?.raw ?? '')),
    semanticallyIdentical: isDeepStrictEqual(first?.body, second?.body),
    sameIntentId: typeof first?.body.intentId === 'string' && first.body.intentId === second?.body.intentId,
    phoneHref,
    confirmed: await success.isVisible(),
  }).toEqual({ posts: 2, byteIdentical: true, semanticallyIdentical: true, sameIntentId: true, phoneHref: 'tel:+78127482210', confirmed: true })
})

for (const doctor of DOCTORS) {
  test(`doctor context smoke: ${doctor.slug}`, async ({ page, bookingNetwork }) => {
    bookingNetwork.respondSlots(({ url, slug }) => availableSchedule(url, slug))
    const { dialog } = await openDoctorBooking(page, doctor.slug)
    expect(bookingNetwork.slotQueries).toEqual([{ method: 'GET', slug: doctor.slug }])
    await expect(dialog.getByText(doctor.name, { exact: true })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Выберите дату и время' })).toBeVisible()
    expect(bookingNetwork.bookBodies).toHaveLength(0)
  })
}
