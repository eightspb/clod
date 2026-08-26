import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookingFlow } from './BookingFlow.jsx'
import { BookingResult } from './BookingResult.jsx'

const PUBLIC_DOCTORS = Object.freeze([
  Object.freeze({ slug: 'odintsov', name: 'Одинцов Владислав Александрович', specialization: 'Онколог-маммолог, врач УЗД, ДМН', photo: '/images/doctors/odintsov.webp' }),
  Object.freeze({ slug: 'egorova', name: 'Ёлкина А\u0301нна О’Коннор', specialization: 'Гинеколог-эндокринолог, врач УЗД', photo: '/images/doctors/egorova.webp' }),
  Object.freeze({ slug: 'kalinina', name: 'Калинина Мария Сергеевна', specialization: 'Нутрициолог', photo: '/images/doctors/kalinina.webp' }),
  Object.freeze({ slug: 'petrova', name: 'Петрова Елена Игоревна', specialization: 'Маммолог-онколог', photo: '/images/doctors/petrova.webp' }),
  Object.freeze({ slug: 'smirnov', name: 'Смирнов Алексей Олегович', specialization: 'Онколог-хирург', photo: '/images/doctors/smirnov.webp' }),
  Object.freeze({ slug: 'volkova', name: 'Волкова Ирина Павловна', specialization: 'Гинеколог, акушер-гинеколог, врач УЗД', photo: '/images/doctors/volkova.webp' }),
])
const FIRST_INTENT_ID = '3335ac38-8090-42f1-8e05-f6c29bc73a9c'
const SECOND_INTENT_ID = '3027f8bc-9637-4d3d-8b8c-0b0b58e93b3a'
const CLAIM_ID = '872bb8e7-fdc5-4886-8c54-2be1fe31d7fb'
const TEST_NOW = new Date('2026-08-25T08:00:00.000Z')
const SINGLE_TYPE = Object.freeze([{ key: 'mammologist', label: 'Маммолог', price: 4_900, minAge: 18, maxAge: 65 }])
const MULTIPLE_TYPES = Object.freeze([
  ...SINGLE_TYPE,
  Object.freeze({ key: 'ultrasound', label: 'Врач УЗИ', price: 0, minAge: 0, maxAge: null }),
])
const REPLACEMENT_TYPES = Object.freeze([
  Object.freeze({ key: 'ultrasound', label: 'Врач УЗИ', price: 5_100, minAge: 0, maxAge: null }),
  Object.freeze({ key: 'surgeon-endocrinologist', label: 'Хирург-эндокринолог', price: 5_500, minAge: 18, maxAge: null }),
])
const AVAILABLE_DATES = Object.freeze([
  Object.freeze({ date: '2026-08-27', count: 2, slots: Object.freeze([
    Object.freeze({ startsAt: '2026-08-27T10:20:00+03:00', endsAt: '2026-08-27T11:00:00+03:00', time: '10:20', period: 'morning' }),
    Object.freeze({ startsAt: '2026-08-27T11:10:00+03:00', endsAt: '2026-08-27T11:50:00+03:00', time: '11:10', period: 'day' }),
  ]) }),
  Object.freeze({ date: '2026-08-28', count: 1, slots: Object.freeze([
    Object.freeze({ startsAt: '2026-08-28T17:05:00+03:00', endsAt: '2026-08-28T17:45:00+03:00', time: '17:05', period: 'evening' }),
  ]) }),
])
const SPARSE_AVAILABLE_DATES = Object.freeze([
  AVAILABLE_DATES[0],
  Object.freeze({ date: '2026-09-03', count: 1, slots: Object.freeze([
    Object.freeze({ startsAt: '2026-09-03T17:05:00+03:00', endsAt: '2026-09-03T17:45:00+03:00', time: '17:05', period: 'evening' }),
  ]) }),
])

function emptySchedule(slug = 'odintsov') {
  const doctor = PUBLIC_DOCTORS.find((candidate) => candidate.slug === slug) ?? PUBLIC_DOCTORS[0]
  return { data: { available: false, reason: 'NO_SLOTS', doctor: { slug: doctor.slug, name: doctor.name, location: 'просп. Богатырский, д. 22, корп. 1', timeZone: 'Europe/Moscow' }, appointmentTypes: [], dates: [] } }
}

function availableSchedule({ slug = 'odintsov', appointmentTypes = SINGLE_TYPE, dates = AVAILABLE_DATES } = {}) {
  const doctor = PUBLIC_DOCTORS.find((candidate) => candidate.slug === slug) ?? PUBLIC_DOCTORS[0]
  return { data: { available: true, reason: 'AVAILABLE', doctor: { slug: doctor.slug, name: doctor.name, location: 'просп. Богатырский, д. 22, корп. 1', timeZone: 'Europe/Moscow' }, appointmentTypes, dates } }
}

function unavailableSchedule({ slug = 'odintsov', reason = 'NO_SLOTS', appointmentTypes = SINGLE_TYPE } = {}) {
  const doctor = PUBLIC_DOCTORS.find((candidate) => candidate.slug === slug) ?? PUBLIC_DOCTORS[0]
  return { data: { available: false, reason, doctor: { slug: doctor.slug, name: doctor.name, location: 'просп. Богатырский, д. 22, корп. 1', timeZone: 'Europe/Moscow' }, appointmentTypes, dates: [] } }
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function confirmation(overrides = {}) {
  return { data: { status: 'confirmed', claimId: CLAIM_ID, doctor: { slug: 'odintsov', name: 'Доверенный Врач Сервера', location: 'просп. Богатырский, д. 22, корп. 1', timeZone: 'Europe/Moscow' }, appointmentType: { key: 'mammologist', label: 'Маммолог' }, startsAt: '2026-08-27T07:20:00.000Z', endsAt: '2026-08-27T08:00:00.000Z', price: 5_350, ...overrides } }
}

function transport(responses) {
  const calls = []
  const fetcher = async (...input) => {
    calls.push(input)
    if (responses.length === 0) throw new Error('No queued booking response')
    const response = responses.shift()
    if (response instanceof Error) throw response
    if (typeof response === 'function') return response(...input)
    return response
  }
  return { calls, fetcher }
}

function renderFlow({ explicitDoctor, pageDoctorSlug = '', responseDoctor = 'odintsov', responses, uuid = () => FIRST_INTENT_ID, clock = () => TEST_NOW } = {}) {
  const queued = responses ? [...responses] : [json(emptySchedule(responseDoctor))]
  const request = transport(queued)
  const triggerProps = { 'data-booking-btn': '' }
  if (explicitDoctor !== undefined) triggerProps['data-booking-doctor'] = explicitDoctor
  const view = render(
    <>
      <button type="button" {...triggerProps}>Открыть запись</button>
      <BookingFlow doctors={PUBLIC_DOCTORS} pageDoctorSlug={pageDoctorSlug} fetcher={request.fetcher} uuid={uuid} clock={clock} />
    </>
  )
  const trigger = screen.getByRole('button', { name: 'Открыть запись' })
  fireEvent.click(trigger)
  return { ...request, trigger, unmount: view.unmount }
}

async function waitForCalls(request, count) {
  await waitFor(() => {
    if (request.calls.length !== count) throw new Error(`Expected ${count} booking request calls`)
  })
}

function deferred() {
  let resolve
  const promise = new Promise((release) => {
    resolve = release
  })
  return { promise, resolve }
}

async function reachPatient({ responses = [json(availableSchedule({}))], uuid, clock } = {}) {
  const request = renderFlow({ explicitDoctor: 'odintsov', responses, uuid, clock })
  fireEvent.click(await screen.findByRole('button', { name: '10:20' }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  await screen.findByRole('heading', { name: 'Данные пациента' })
  return request
}

function fillPatient({ consent = true } = {}) {
  fireEvent.change(screen.getByLabelText('Имя'), { target: { value: '  Лёля  ' } })
  fireEvent.change(screen.getByLabelText('Фамилия'), { target: { value: ' О’Коннор-Сидорова ' } })
  fireEvent.change(screen.getByLabelText('Отчество'), { target: { value: ' Алиевна ' } })
  fireEvent.change(screen.getByLabelText('Телефон'), { target: { value: '+7 (921) 555-01-29' } })
  fireEvent.change(screen.getByLabelText('Дата рождения'), { target: { value: '1988-02-29' } })
  fireEvent.change(screen.getByLabelText('Комментарий'), { target: { value: '  Нужен сурдопереводчик Ω  ' } })
  if (consent) fireEvent.click(screen.getByRole('checkbox', { name: /Согласие на обработку/ }))
}

async function reachReview({ responses, uuid, clock } = {}) {
  const request = await reachPatient({ responses, uuid, clock })
  fillPatient()
  fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
  await screen.findByRole('heading', { name: 'Проверьте запись' })
  return request
}

function postBodies(request) {
  return request.calls.filter(([, options]) => options?.method === 'POST').map(([, options]) => JSON.parse(options.body))
}

function uuidSequence(...ids) {
  let index = 0
  return () => ids[index++]
}

function parsedCalendar(link) {
  const encoded = link.getAttribute('href').replace('data:text/calendar;charset=utf-8,', '')
  const physical = decodeURIComponent(encoded).split('\r\n')
  const unfolded = []
  for (const line of physical) {
    if (line.startsWith(' ')) unfolded[unfolded.length - 1] += line.slice(1)
    else unfolded.push(line)
  }
  const fields = Object.fromEntries(unfolded.filter((line) => line.includes(':')).map((line) => {
    const separator = line.indexOf(':')
    return [line.slice(0, separator), line.slice(separator + 1)]
  }))
  return { fields, physical }
}

async function reachTypedReview({ responses, uuid } = {}) {
  const request = renderFlow({ explicitDoctor: 'odintsov', responses, uuid })
  fireEvent.click(await screen.findByRole('button', { name: /Маммолог/ }))
  fireEvent.click(screen.getByRole('button', { name: '10:20' }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  await screen.findByRole('heading', { name: 'Данные пациента' })
  fillPatient()
  fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
  await screen.findByRole('heading', { name: 'Проверьте запись' })
  return request
}

describe('BookingFlow delegated opening', () => {
  it('opens a general trigger on public doctor selection', () => {
    const request = renderFlow()
    const dialog = screen.getByRole('dialog', { name: 'Онлайн-запись' })
    expect({ step: screen.getByRole('heading', { name: 'Выберите врача' }).textContent, requests: request.calls.length, open: Boolean(dialog) }).toEqual({ step: 'Выберите врача', requests: 0, open: true })
  })

  it('inherits the public page doctor for a doctor-specific trigger', async () => {
    const request = renderFlow({ pageDoctorSlug: 'odintsov' })
    await waitForCalls(request, 1)
    expect(String(request.calls[0][0])).toContain('/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14')
  })

  it('prefers an explicit trigger doctor over page doctor context', async () => {
    const request = renderFlow({ explicitDoctor: 'egorova', pageDoctorSlug: 'odintsov', responseDoctor: 'egorova' })
    await waitForCalls(request, 1)
    expect(String(request.calls[0][0])).toContain('/api/appointments/slots?doctor=egorova&from=2026-08-25&days=14')
  })

  it('finds a public doctor by Unicode-normalized name and specialty', () => {
    renderFlow()
    const search = screen.getByRole('searchbox', { name: 'Поиск врача' })
    fireEvent.change(search, { target: { value: 'АННА' } })
    const byName = screen.getAllByRole('button', { name: /Ёлкина/ }).map((button) => button.textContent)
    fireEvent.change(search, { target: { value: 'ЭНДОКРИНОЛОГ' } })
    const bySpecialty = screen.getAllByRole('button', { name: /Ёлкина/ }).map((button) => button.textContent)
    expect({ byName, bySpecialty }).toEqual({ byName: ['Ёлкина А\u0301нна О’КоннорГинеколог-эндокринолог, врач УЗД'], bySpecialty: ['Ёлкина А\u0301нна О’КоннорГинеколог-эндокринолог, врач УЗД'] })
  })

  it('does not allocate a booking intent before submission semantics exist', () => {
    let allocations = 0
    renderFlow({ uuid: () => {
      allocations += 1
      return FIRST_INTENT_ID
    } })
    expect(allocations).toBe(0)
  })

  it('fails an unknown public doctor slug closed without loading a schedule', () => {
    const request = renderFlow({ explicitDoctor: 'not-published', responses: [] })
    expect({ title: screen.getByRole('heading', { name: 'Онлайн-запись недоступна' }).textContent, phone: screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href'), requests: request.calls.length }).toEqual({ title: 'Онлайн-запись недоступна', phone: 'tel:+78127482210', requests: 0 })
  })
})

describe('BookingFlow schedule selection', () => {
  it('shows multiple live appointment types with current price and age', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(availableSchedule({ appointmentTypes: MULTIPLE_TYPES }))] })
    await screen.findByRole('heading', { name: 'Выберите тип приёма' })
    const options = screen.getAllByRole('button', { name: /Маммолог|Врач УЗИ/ }).map((button) => button.textContent)
    expect(options).toEqual(['Маммолог4 900 ₽18–65 лет', 'Врач УЗИ0 ₽Без возрастных ограничений'])
  })

  it('shows only sparse available dates and switches their grouped times', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(availableSchedule({ dates: SPARSE_AVAILABLE_DATES }))] })
    await screen.findByRole('heading', { name: 'Выберите дату и время' })
    const dateStrip = document.querySelector('.booking-date-strip')
    const dateControls = [...dateStrip.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [tabindex]')]
    const selected = dateControls.find((control) => control.getAttribute('aria-pressed') === 'true')?.dataset.bookingDate
    const timeGroups = document.querySelector('.booking-time-groups')
    const before = { groups: [...timeGroups.querySelectorAll('h4')].map((heading) => heading.textContent), times: [...timeGroups.querySelectorAll('button')].map((button) => button.textContent) }
    fireEvent.click(dateControls.find((control) => control.dataset.bookingDate === '2026-09-03'))
    const after = { groups: [...timeGroups.querySelectorAll('h4')].map((heading) => heading.textContent), times: [...timeGroups.querySelectorAll('button')].map((button) => button.textContent) }
    expect({ controls: dateControls.map((control) => ({ date: control.dataset.bookingDate, label: control.getAttribute('aria-label'), disabled: control.disabled })), hasIntermediateLabel: dateStrip.textContent.includes('28 авг.') || dateControls.some((control) => control.getAttribute('aria-label')?.includes('28 августа')), selected, before, after }).toEqual({ controls: [{ date: '2026-08-27', label: '27 августа, четверг, 2 свободных времени', disabled: false }, { date: '2026-09-03', label: '3 сентября, четверг, 1 свободное время', disabled: false }], hasIntermediateLabel: false, selected: '2026-08-27', before: { groups: ['Утро', 'День'], times: ['10:20', '11:10'] }, after: { groups: ['Вечер'], times: ['17:05'] } })
  })

  it('supports keyboard appointment-type selection with a 44px control', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(availableSchedule({ appointmentTypes: MULTIPLE_TYPES }))] })
    const option = await screen.findByRole('button', { name: /Маммолог/ })
    fireEvent.keyDown(option, { key: 'Enter' })
    const schedule = await screen.findByRole('heading', { name: 'Выберите дату и время' })
    expect({ step: schedule.textContent, target: option.className.includes('min-h-11') }).toEqual({ step: 'Выберите дату и время', target: true })
  })

  it('advances later dates by one exact fourteen-day clinic window', async () => {
    const laterDates = [{ date: '2026-09-09', count: 1, slots: [{ startsAt: '2026-09-09T09:00:00+03:00', endsAt: '2026-09-09T09:40:00+03:00', time: '09:00', period: 'morning' }] }]
    const request = renderFlow({ explicitDoctor: 'odintsov', responses: [json(unavailableSchedule({})), json(availableSchedule({ dates: laterDates }))] })
    fireEvent.click(await screen.findByRole('button', { name: 'Следующие 14 дней' }))
    await screen.findByRole('button', { name: /9 сентября.*1 свободное время/i })
    expect(request.calls.map(([url]) => String(url))).toEqual(['/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14', '/api/appointments/slots?doctor=odintsov&from=2026-09-08&days=14'])
  })

  it('announces stable schedule loading while a request is pending', () => {
    const pending = deferred()
    renderFlow({ explicitDoctor: 'odintsov', responses: [pending.promise] })
    expect(screen.getByText('Загружаем расписание', { selector: '.booking-loading' })).toBeInTheDocument()
  })

  it('offers later dates, another doctor, and phone fallback for an empty schedule', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(unavailableSchedule({ reason: 'NO_SLOTS' }))] })
    await screen.findByRole('heading', { name: 'Нет свободного времени' })
    const actions = ['Следующие 14 дней', 'Выбрать другого врача', screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href')]
    expect(actions).toEqual(['Следующие 14 дней', 'Выбрать другого врача', 'tel:+78127482210'])
  })

  it('offers at most two same-specialty doctors without silently switching or loading them', async () => {
    const request = renderFlow({ explicitDoctor: 'odintsov', responses: [json(unavailableSchedule({ reason: 'NO_SLOTS' }))] })
    await screen.findByRole('heading', { name: 'Нет свободного времени' })
    const alternatives = [...document.querySelectorAll('[data-booking-alternative]')].map((button) => button.dataset.bookingAlternative)
    expect({ alternatives, current: screen.getByText('Одинцов Владислав Александрович').textContent, requests: request.calls.length }).toEqual({ alternatives: ['petrova', 'smirnov'], current: 'Одинцов Владислав Александрович', requests: 1 })
  })

  it('loads a same-specialty alternative only after its explicit selection', async () => {
    const request = renderFlow({ explicitDoctor: 'odintsov', responses: [json(unavailableSchedule({ reason: 'NO_SLOTS' })), json(availableSchedule({ slug: 'petrova' }))] })
    fireEvent.click(await screen.findByRole('button', { name: /Петрова Елена Игоревна/ }))
    await screen.findByRole('heading', { name: 'Выберите дату и время' })
    expect({ urls: request.calls.map(([url]) => String(url)), doctor: screen.getByText('Петрова Елена Игоревна').textContent }).toEqual({ urls: ['/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14', '/api/appointments/slots?doctor=petrova&from=2026-08-25&days=14'], doctor: 'Петрова Елена Игоревна' })
  })

  it('ignores shared qualification tokens when finding same-specialty alternatives', async () => {
    renderFlow({ explicitDoctor: 'egorova', responses: [json(unavailableSchedule({ slug: 'egorova', reason: 'NO_SLOTS' }))] })
    await screen.findByRole('heading', { name: 'Нет свободного времени' })
    const alternatives = [...document.querySelectorAll('[data-booking-alternative]')].map((button) => button.dataset.bookingAlternative)
    expect(alternatives).toEqual(['volkova'])
  })

  it('retries a rate-limited schedule in the same date window', async () => {
    const failure = { error: 'RATE_LIMITED', message: 'Слишком много запросов расписания. Попробуйте позже' }
    const request = renderFlow({ explicitDoctor: 'odintsov', responses: [json(failure, 429), json(availableSchedule({}))] })
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить загрузку' }))
    await screen.findByRole('heading', { name: 'Выберите дату и время' })
    expect(request.calls.map(([url]) => String(url))).toEqual(['/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14', '/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14'])
  })

  it('honors Retry-After before permitting a schedule retry', async () => {
    const failure = { error: 'RATE_LIMITED', message: 'Слишком много запросов расписания. Попробуйте позже' }
    const pending = deferred()
    const request = renderFlow({ explicitDoctor: 'odintsov', responses: [pending.promise, json(availableSchedule({}))] })
    vi.useFakeTimers()
    try {
      await act(async () => {
        pending.resolve(json(failure, 429, { 'Retry-After': '2' }))
        await Promise.resolve()
      })
      const retry = screen.getByRole('button', { name: 'Повторить через 2 с' })
      const initiallyDisabled = retry.disabled
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
      const enabledRetry = screen.getByRole('button', { name: 'Повторить загрузку' })
      const enabled = !enabledRetry.disabled
      fireEvent.click(enabledRetry)
      await act(async () => {
        await Promise.resolve()
      })
      expect({ initiallyDisabled, enabled, urls: request.calls.map(([url]) => String(url)) }).toEqual({ initiallyDisabled: true, enabled: true, urls: ['/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14', '/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14'] })
    } finally {
      vi.useRealTimers()
    }
  })

  it('fails closed when a successful schedule response is malformed', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json({ data: { available: true, appointmentTypes: 'unsafe' } })] })
    await screen.findByRole('heading', { name: 'Не удалось загрузить расписание' })
    expect(screen.getByRole('link', { name: /748-22-10/ })).toHaveAttribute('href', 'tel:+78127482210')
  })

  it('fails a schedule with a lone UTF-16 surrogate closed', async () => {
    const response = availableSchedule({})
    response.data.doctor.name = 'Врач\uD800'
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(response)] })
    await screen.findByRole('heading', { name: 'Не удалось загрузить расписание' })
    expect({ phone: screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href'), schedule: screen.queryByRole('heading', { name: 'Выберите дату и время' }) }).toEqual({ phone: 'tel:+78127482210', schedule: null })
  })

  it('fails closed when the schedule doctor differs from the requested public doctor', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(availableSchedule({ slug: 'egorova' }))] })
    await screen.findByRole('heading', { name: 'Не удалось загрузить расписание' })
    expect(screen.queryByText('Ёлкина А́нна О’Коннор')).not.toBeInTheDocument()
  })

  it.each([
    ['2026-08-24', '2026-08-24T10:20:00+03:00', '2026-08-24T11:00:00+03:00'],
    ['2026-09-08', '2026-09-08T10:20:00+03:00', '2026-09-08T11:00:00+03:00'],
  ])('fails a schedule date outside the requested window closed for %s', async (date, startsAt, endsAt) => {
    const dates = [{ date, count: 1, slots: [{ startsAt, endsAt, time: '10:20', period: 'morning' }] }]
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(availableSchedule({ dates }))] })
    await screen.findByRole('heading', { name: 'Не удалось загрузить расписание' })
    expect({ phone: screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href'), time: screen.queryByRole('button', { name: '10:20' }) }).toEqual({ phone: 'tel:+78127482210', time: null })
  })

  it.each([
    ['display time', { time: '15:00' }],
    ['display period', { period: 'day' }],
  ])('fails a slot with mismatched %s closed', async (_case, override) => {
    const candidate = { startsAt: '2026-08-27T10:20:00+03:00', endsAt: '2026-08-27T11:00:00+03:00', time: '10:20', period: 'morning', ...override }
    const dates = [{ date: '2026-08-27', count: 1, slots: [candidate] }]
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(availableSchedule({ dates }))] })
    await screen.findByRole('heading', { name: 'Не удалось загрузить расписание' })
    expect({ phone: screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href'), schedule: screen.queryByRole('heading', { name: 'Выберите дату и время' }) }).toEqual({ phone: 'tel:+78127482210', schedule: null })
  })

  it.each([
    ['NO_SCHEDULE', 'Расписание пока не опубликовано', []],
    ['NO_APPOINTMENT_TYPES', 'Нет доступных типов приёма', []],
    ['NO_SLOTS', 'Нет свободного времени', SINGLE_TYPE],
  ])('shows reason-specific empty copy for %s', async (reason, title, appointmentTypes) => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(unavailableSchedule({ reason, appointmentTypes }))] })
    await screen.findByRole('heading', { name: title })
    expect(screen.getByRole('dialog').getAttribute('data-empty-reason')).toBe(reason)
  })

  it('fails a contradictory empty reason payload closed', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(unavailableSchedule({ reason: 'NO_APPOINTMENT_TYPES', appointmentTypes: SINGLE_TYPE }))] })
    await screen.findByRole('heading', { name: 'Не удалось загрузить расписание' })
    expect(screen.getByRole('link', { name: /748-22-10/ })).toHaveAttribute('href', 'tel:+78127482210')
  })

  it.each([
    [429, 'RATE_LIMITED', 'Слишком много запросов расписания'],
    [503, 'SCHEDULE_UNAVAILABLE', 'Расписание временно недоступно'],
  ])('retries schedule HTTP %s in the exact same date window', async (status, error, message) => {
    const request = renderFlow({ explicitDoctor: 'odintsov', responses: [json({ error, message }, status), json(availableSchedule({}))] })
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить загрузку' }))
    await screen.findByRole('heading', { name: 'Выберите дату и время' })
    expect(request.calls.map(([url]) => String(url))).toEqual(['/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14', '/api/appointments/slots?doctor=odintsov&from=2026-08-25&days=14'])
  })

  it('uses a visible non-color marker for selected date and time controls', async () => {
    renderFlow({ explicitDoctor: 'odintsov', responses: [json(availableSchedule({}))] })
    const time = await screen.findByRole('button', { name: '10:20' })
    fireEvent.click(time)
    const date = document.querySelector('[data-booking-date][data-selected="true"]')
    expect({ dateMarker: date.querySelector('.booking-selected-indicator')?.textContent, timeMarker: time.querySelector('.booking-selected-indicator')?.textContent, datePressed: date.getAttribute('aria-pressed'), timePressed: time.getAttribute('aria-pressed') }).toEqual({ dateMarker: '✓', timeMarker: '✓', datePressed: 'true', timePressed: 'true' })
  })
})

describe('BookingFlow patient review and submission', () => {
  it('associates and focuses the first invalid patient field', async () => {
    await reachPatient()
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    const field = screen.getByLabelText('Имя')
    await waitFor(() => {
      if (document.activeElement !== field) throw new Error('Expected first invalid field focus')
    })
    expect({ invalid: field.getAttribute('aria-invalid'), describedBy: field.getAttribute('aria-describedby'), message: document.getElementById(field.getAttribute('aria-describedby'))?.textContent }).toEqual({ invalid: 'true', describedBy: 'booking-patient-first-name-error', message: 'Укажите имя' })
  })

  it('requires explicit consent before review', async () => {
    await reachPatient()
    fillPatient({ consent: false })
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    const consent = screen.getByRole('checkbox', { name: /Согласие на обработку/ })
    await waitFor(() => {
      if (document.activeElement !== consent) throw new Error('Expected consent focus')
    })
    expect({ invalid: consent.getAttribute('aria-invalid'), message: screen.getByText('Подтвердите согласие').textContent }).toEqual({ invalid: 'true', message: 'Подтвердите согласие' })
  })

  it('refreshes a locally expired slot, focuses the replacement, and preserves patient input', async () => {
    let now = TEST_NOW
    const replacement = [{ date: '2026-08-27', count: 1, slots: [{ startsAt: '2026-08-27T18:30:00+03:00', endsAt: '2026-08-27T19:10:00+03:00', time: '18:30', period: 'evening' }] }]
    const request = await reachPatient({ responses: [json(availableSchedule({})), json(availableSchedule({ dates: replacement }))], clock: () => now })
    fillPatient()
    now = new Date('2026-08-27T07:30:00.000Z')
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    const time = await screen.findByRole('button', { name: '18:30' })
    await waitFor(() => {
      if (document.activeElement !== time) throw new Error('Expected refreshed slot focus')
    })
    const focused = document.activeElement === time
    fireEvent.click(time)
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect({ focused, firstName: screen.getByLabelText('Имя').value, requests: request.calls.length }).toEqual({ focused: true, firstName: '  Лёля  ', requests: 2 })
  })

  it('reviews doctor, current type, clinic-local slot, price, and patient details', async () => {
    await reachReview()
    const content = screen.getByRole('dialog').textContent
    expect(['Одинцов Владислав Александрович', 'Маммолог', 'просп. Богатырский, д. 22к1', '27 августа 2026', '10:20', '4 900 ₽', 'О’Коннор-Сидорова Лёля Алиевна'].every((value) => content.includes(value))).toBe(true)
  })

  it('posts only the exact safe booking contract with a first-use intent', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json(confirmation(), 201)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request)[0]).toEqual({ doctorSlug: 'odintsov', appointmentType: 'mammologist', intentId: FIRST_INTENT_ID, dtStart: '2026-08-27T10:20:00+03:00', dtEnd: '2026-08-27T11:00:00+03:00', patient: { firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '+7 (921) 555-01-29', birthday: '1988-02-29' }, comment: 'Нужен сурдопереводчик Ω', consent: true })
  })

  it('guards a rapid double submit before React can rerender', async () => {
    const pending = deferred()
    const request = await reachReview({ responses: [json(availableSchedule({})), pending.promise], uuid: () => FIRST_INTENT_ID })
    const submit = screen.getByRole('button', { name: 'Подтвердить запись' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(postBodies(request).length).toBe(1)
  })

  it('fails closed without posting when intent allocation throws', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({}))], uuid: () => { throw new Error('entropy unavailable') } })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Не удалось подтвердить запись' })
    expect({ posts: postBodies(request).length, phone: screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href') }).toEqual({ posts: 0, phone: 'tel:+78127482210' })
  })

  it.each([201, 200])('accepts a trusted confirmed response with HTTP %s', async (status) => {
    await reachReview({ responses: [json(availableSchedule({})), json(confirmation(), status)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const result = await screen.findByRole('heading', { name: 'Запись подтверждена' })
    const calendar = screen.getByRole('link', { name: 'Добавить в календарь' })
    const resultRoot = result.closest('[data-booking-result]')
    const calendarData = decodeURIComponent(calendar.getAttribute('href'))
    expect({ title: result.textContent, trusted: screen.getByRole('dialog').textContent.includes('Доверенный Врач Сервера'), price: screen.getByRole('dialog').textContent.includes('5 350 ₽'), localTime: screen.getByRole('dialog').textContent.includes('27 августа 2026, 10:20'), calendar: calendarData.includes('DTSTART:20260827T072000Z') && calendarData.includes('Доверенный Врач Сервера'), patientLeak: calendarData.includes('Лёля'), resultHooks: ['booking-result-confirmed', 'booking-result-success'].every((name) => resultRoot.classList.contains(name)), calendarHook: calendar.classList.contains('booking-calendar') }).toEqual({ title: 'Запись подтверждена', trusted: true, price: true, localTime: true, calendar: true, patientLeak: false, resultHooks: true, calendarHook: true })
  })

  it('builds a timestamped RFC5545 calendar with UTF-8-safe physical line folding', async () => {
    const doctor = { slug: 'odintsov', name: `Доверенный ${'ОченьдлинныйВрач'.repeat(8)}`, location: `Клиника ${'на Богатырском проспекте '.repeat(8)}`, timeZone: 'Europe/Moscow' }
    await reachReview({ responses: [json(availableSchedule({})), json(confirmation({ doctor }), 201)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const calendar = parsedCalendar(await screen.findByRole('link', { name: 'Добавить в календарь' }))
    const byteLengths = calendar.physical.map((line) => new TextEncoder().encode(line).length)
    expect({ dtstamp: calendar.fields.DTSTAMP, startsAt: calendar.fields.DTSTART, endsAt: calendar.fields.DTEND, withinLimit: byteLengths.every((length) => length <= 75), folded: calendar.physical.some((line) => line.startsWith(' ')) }).toEqual({ dtstamp: '20260825T080000Z', startsAt: '20260827T072000Z', endsAt: '20260827T080000Z', withinLimit: true, folded: true })
  })

  it('escapes lone calendar line breaks before folding physical lines', () => {
    const result = { status: 'confirmed', claimId: CLAIM_ID, doctor: { slug: 'odintsov', name: 'Доверенный врач', location: 'Первая\rВторая\nТретья', timeZone: 'Europe/Moscow' }, appointmentType: { key: 'mammologist', label: 'Маммолог' }, startsAt: '2026-08-27T07:20:00.000Z', endsAt: '2026-08-27T08:00:00.000Z', price: 5_350, dtstamp: TEST_NOW.toISOString() }
    render(<BookingResult result={result} isSubmitting={false} retryAfter={0} onAction={() => {}} onClose={() => {}} />)
    const calendar = parsedCalendar(screen.getByRole('link', { name: 'Добавить в календарь' }))
    expect({ location: calendar.fields.LOCATION, bareBreak: calendar.physical.some((line) => line.includes('\r')) }).toEqual({ location: 'Первая\\nВторая\\nТретья', bareBreak: false })
  })

  it('rejects control characters at the trusted confirmation boundary', async () => {
    const doctor = { slug: 'odintsov', name: 'Доверенный\rATTENDEE:malicious', location: 'Клиника', timeZone: 'Europe/Moscow' }
    await reachReview({ responses: [json(availableSchedule({})), json(confirmation({ doctor }), 201)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Статус записи не подтверждён' })
    expect({ calendar: screen.queryByRole('link', { name: 'Добавить в календарь' }), result: document.querySelector('[data-booking-result]')?.dataset.bookingResult }).toEqual({ calendar: null, result: 'uncertain' })
  })

  it.each([
    ['doctor name', { doctor: { slug: 'odintsov', name: 'Врач\uD800', location: 'Клиника', timeZone: 'Europe/Moscow' } }],
    ['doctor location', { doctor: { slug: 'odintsov', name: 'Доверенный врач', location: 'Клиника\uD800', timeZone: 'Europe/Moscow' } }],
    ['appointment type', { appointmentType: { key: 'mammologist', label: 'Маммолог\uD800' } }],
  ])('rejects a lone UTF-16 surrogate in confirmed %s text', async (_field, overrides) => {
    await reachReview({ responses: [json(availableSchedule({})), json(confirmation(overrides), 201)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Статус записи не подтверждён' })
    expect({ calendar: screen.queryByRole('link', { name: 'Добавить в календарь' }), result: document.querySelector('[data-booking-result]')?.dataset.bookingResult }).toEqual({ calendar: null, result: 'uncertain' })
  })
})

describe('BookingFlow protected retry and conflict outcomes', () => {
  it('refreshes a slot conflict, focuses choices, and preserves patient input', async () => {
    const replacement = [{ date: '2026-08-27', count: 1, slots: [{ startsAt: '2026-08-27T18:30:00+03:00', endsAt: '2026-08-27T19:10:00+03:00', time: '18:30', period: 'evening' }] }]
    await reachReview({ responses: [json(availableSchedule({})), json({ error: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже недоступно', freshIntentRequired: true, refreshSchedule: true }, 409), json(availableSchedule({ dates: replacement }))], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const time = await screen.findByRole('button', { name: '18:30' })
    await waitFor(() => {
      if (document.activeElement !== time) throw new Error('Expected refreshed slot focus')
    })
    const focused = document.activeElement === time
    const conflict = document.querySelector('.booking-overlay').dataset.bookingConflict
    fireEvent.click(time)
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect({ focused, conflict, firstName: screen.getByLabelText('Имя').value, notice: screen.getByRole('status').textContent }).toEqual({ focused: true, conflict: 'slot', firstName: '  Лёля  ', notice: 'Выбранное время изменилось. Выберите новое время' })
  })

  it('rotates the intent only after a different slot is submitted', async () => {
    const replacement = [{ date: '2026-08-27', count: 1, slots: [{ startsAt: '2026-08-27T18:30:00+03:00', endsAt: '2026-08-27T19:10:00+03:00', time: '18:30', period: 'evening' }] }]
    const request = await reachReview({ responses: [json(availableSchedule({})), json({ error: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже недоступно', freshIntentRequired: true, refreshSchedule: true }, 409), json(availableSchedule({ dates: replacement })), json(confirmation({ startsAt: '2026-08-27T15:30:00.000Z', endsAt: '2026-08-27T16:10:00.000Z' }), 201)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: '18:30' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request).map(({ intentId, dtStart }) => ({ intentId, dtStart }))).toEqual([{ intentId: FIRST_INTENT_ID, dtStart: '2026-08-27T10:20:00+03:00' }, { intentId: SECOND_INTENT_ID, dtStart: '2026-08-27T18:30:00+03:00' }])
  })

  it('keeps the existing intent when the same conflicted slot is retried', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json({ error: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже недоступно', freshIntentRequired: true, refreshSchedule: true }, 409), json(availableSchedule({})), json(confirmation(), 201)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: '10:20' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request).map(({ intentId }) => intentId)).toEqual([FIRST_INTENT_ID, FIRST_INTENT_ID])
  })

  it('keeps the immutable intent payload when a conflicted phone is reformatted equivalently', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json({ error: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже недоступно', freshIntentRequired: true, refreshSchedule: true }, 409), json(availableSchedule({})), json(confirmation(), 201)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: '10:20' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    fireEvent.change(screen.getByLabelText('Телефон'), { target: { value: '8 921 555-01-29' } })
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    const reviewPhone = screen.getByText('8 921 555-01-29').textContent
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect({ reviewPhone, bodies: postBodies(request) }).toEqual({ reviewPhone: '8 921 555-01-29', bodies: [postBodies(request)[0], postBodies(request)[0]] })
  })

  it('refreshes a type conflict, preserves patient input, focuses types, and rotates after change', async () => {
    const request = await reachTypedReview({ responses: [json(availableSchedule({ appointmentTypes: MULTIPLE_TYPES })), json({ error: 'APPOINTMENT_TYPE_UNAVAILABLE', message: 'Выбранный тип приёма недоступен', freshIntentRequired: true, refreshSchedule: true }, 409), json(availableSchedule({ appointmentTypes: REPLACEMENT_TYPES })), json(confirmation({ appointmentType: { key: 'ultrasound', label: 'Врач УЗИ' } }), 201)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const type = await screen.findByRole('button', { name: /Врач УЗИ/ })
    await waitFor(() => {
      if (document.activeElement !== type) throw new Error('Expected refreshed type focus')
    })
    const focused = document.activeElement === type
    const conflict = document.querySelector('.booking-overlay').dataset.bookingConflict
    fireEvent.click(type)
    fireEvent.click(screen.getByRole('button', { name: '10:20' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    const preserved = screen.getByLabelText('Имя').value
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect({ focused, conflict, preserved, intents: postBodies(request).map(({ intentId }) => intentId) }).toEqual({ focused: true, conflict: 'type', preserved: '  Лёля  ', intents: [FIRST_INTENT_ID, SECOND_INTENT_ID] })
  })

  it.each([
    [{ error: 'VALIDATION_ERROR', message: 'Проверьте данные', fields: { 'patient.phone': 'INVALID_FORMAT' } }, 'Телефон', 'Укажите российский номер телефона'],
    [{ error: 'AGE_NOT_ALLOWED', message: 'Этот приём недоступен для возраста пациента' }, 'Дата рождения', 'Этот тип приёма не подходит по возрасту'],
  ])('returns a safe patient error to the associated field', async (failure, label, message) => {
    await reachReview({ responses: [json(availableSchedule({})), json(failure, 400)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const field = await screen.findByLabelText(label)
    await waitFor(() => {
      if (document.activeElement !== field) throw new Error('Expected server field focus')
    })
    expect({ invalid: field.getAttribute('aria-invalid'), message: document.getElementById(field.getAttribute('aria-describedby'))?.textContent }).toEqual({ invalid: 'true', message })
  })

  it.each(['dtStart', 'dtEnd'])('refreshes a server %s validation failure and preserves patient input', async (field) => {
    const replacement = [{ date: '2026-08-27', count: 1, slots: [{ startsAt: '2026-08-27T18:30:00+03:00', endsAt: '2026-08-27T19:10:00+03:00', time: '18:30', period: 'evening' }] }]
    await reachReview({ responses: [json(availableSchedule({})), json({ error: 'VALIDATION_ERROR', message: 'Время приёма изменилось', fields: { [field]: 'NOT_FUTURE' } }, 400), json(availableSchedule({ dates: replacement }))], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const time = await screen.findByRole('button', { name: '18:30' })
    await waitFor(() => {
      if (document.activeElement !== time) throw new Error('Expected refreshed slot focus')
    })
    const focused = document.activeElement === time
    fireEvent.click(time)
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect({ focused, firstName: screen.getByLabelText('Имя').value, notice: screen.getByRole('status').textContent }).toEqual({ focused: true, firstName: '  Лёля  ', notice: 'Выбранное время изменилось. Выберите новое время' })
  })

  it('refreshes a server appointment-type validation failure and preserves patient input', async () => {
    await reachReview({ responses: [json(availableSchedule({})), json({ error: 'VALIDATION_ERROR', message: 'Тип приёма изменился', fields: { appointmentType: 'UNAVAILABLE' } }, 400), json(availableSchedule({ appointmentTypes: REPLACEMENT_TYPES }))], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const type = await screen.findByRole('button', { name: /Врач УЗИ/ })
    await waitFor(() => {
      if (document.activeElement !== type) throw new Error('Expected refreshed type focus')
    })
    const focused = document.activeElement === type
    fireEvent.click(type)
    fireEvent.click(screen.getByRole('button', { name: '10:20' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect({ focused, firstName: screen.getByLabelText('Имя').value, notice: screen.getByRole('status').textContent }).toEqual({ focused: true, firstName: '  Лёля  ', notice: 'Тип приёма изменился. Выберите новый тип приёма' })
  })

  it.each(['doctorSlug', 'intentId', 'unexpectedSemanticField'])('fails a server %s validation failure closed with phone fallback', async (field) => {
    await reachReview({ responses: [json(availableSchedule({})), json({ error: 'VALIDATION_ERROR', message: 'Семантика запроса недействительна', fields: { [field]: 'INVALID' } }, 400)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Не удалось подтвердить запись' })
    expect({ result: document.querySelector('[data-booking-result]')?.dataset.bookingResult, phone: screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href'), patient: screen.queryByRole('heading', { name: 'Данные пациента' }) }).toEqual({ result: 'failed', phone: 'tel:+78127482210', patient: null })
  })

  it('reuses the unacquired intent after unchanged server validation data is reviewed again', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json({ error: 'VALIDATION_ERROR', message: 'Проверьте данные', fields: { 'patient.phone': 'INVALID_FORMAT' } }, 400), json(confirmation(), 200)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByText('Укажите российский номер телефона')
    fireEvent.click(screen.getByRole('button', { name: 'Проверить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request).map(({ intentId }) => intentId)).toEqual([FIRST_INTENT_ID, FIRST_INTENT_ID])
  })

  it('honors Retry-After before permitting the same-intent rate-limit replay', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json({ error: 'RATE_LIMITED', message: 'Слишком много попыток записи' }, 429, { 'Retry-After': '2' }), json(confirmation(), 200)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    vi.useFakeTimers()
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
      await act(async () => {
        await Promise.resolve()
      })
      const retry = screen.getByRole('button', { name: 'Повторить через 2 с' })
      const initiallyDisabled = retry.disabled
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
      const enabledRetry = screen.getByRole('button', { name: 'Повторить отправку' })
      const enabled = !enabledRetry.disabled
      fireEvent.click(enabledRetry)
      await act(async () => {
        await Promise.resolve()
      })
      expect({ initiallyDisabled, enabled, result: document.querySelector('[data-booking-result]')?.dataset.bookingResult, bodies: postBodies(request) }).toEqual({ initiallyDisabled: true, enabled: true, result: 'confirmed', bodies: [postBodies(request)[0], postBodies(request)[0]] })
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    [429, { error: 'RATE_LIMITED', message: 'Слишком много попыток записи' }],
    [503, { error: 'BOOKING_UNAVAILABLE', message: 'Запись временно недоступна' }],
  ])('retries HTTP %s with the immutable submitted payload', async (status, failure) => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json(failure, status), json(confirmation(), 200)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить отправку' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request)).toEqual([postBodies(request)[0], postBodies(request)[0]])
  })

  it.each(['pending', 'uncertain'])('checks a %s outcome with the exact submitted intent', async (status) => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json({ data: { status, canRetry: false, ...(status === 'uncertain' ? { phoneFallback: true } : {}) } }, 202), json(confirmation(), 200)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const outcome = await screen.findByRole('heading', { name: status === 'pending' ? 'Запись обрабатывается' : 'Статус записи не подтверждён' })
    const outcomeRoot = outcome.closest('[data-booking-result]')
    const presentationHook = outcomeRoot.dataset.bookingResult === status && outcomeRoot.classList.contains(`booking-result-${status}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Проверить статус' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect({ presentationHook, bodies: postBodies(request) }).toEqual({ presentationHook: true, bodies: [postBodies(request)[0], postBodies(request)[0]] })
  })

  it('checks a network-ambiguous outcome with the exact submitted intent', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({})), new TypeError('connection lost after dispatch'), json(confirmation(), 200)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Проверить статус' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request)).toEqual([postBodies(request)[0], postBodies(request)[0]])
  })

  it('fails a malformed success closed and checks status with the same intent', async () => {
    const malformed = new Response('{"data":', { status: 201, headers: { 'Content-Type': 'application/json' } })
    const request = await reachReview({ responses: [json(availableSchedule({})), malformed, json(confirmation(), 200)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Проверить статус' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request).map(({ intentId }) => intentId)).toEqual([FIRST_INTENT_ID, FIRST_INTENT_ID])
  })

  it('fails an invalid confirmed timezone closed and checks status with the same intent', async () => {
    const invalid = confirmation({ doctor: { slug: 'odintsov', name: 'Доверенный Врач Сервера', location: 'Клиника', timeZone: 'Mars/Olympus' } })
    const request = await reachReview({ responses: [json(availableSchedule({})), json(invalid, 201), json(confirmation(), 200)], uuid: uuidSequence(FIRST_INTENT_ID, SECOND_INTENT_ID) })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Проверить статус' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(postBodies(request).map(({ intentId }) => intentId)).toEqual([FIRST_INTENT_ID, FIRST_INTENT_ID])
  })

  it('fails a valid confirmed timezone that differs from the trusted schedule closed', async () => {
    const mismatched = confirmation({ doctor: { slug: 'odintsov', name: 'Доверенный Врач Сервера', location: 'Клиника', timeZone: 'America/New_York' } })
    await reachReview({ responses: [json(availableSchedule({})), json(mismatched, 201)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Статус записи не подтверждён' })
    expect({ calendar: screen.queryByRole('link', { name: 'Добавить в календарь' }), result: document.querySelector('[data-booking-result]')?.dataset.bookingResult }).toEqual({ calendar: null, result: 'uncertain' })
  })

  it.each([
    [409, { error: 'BOOKING_REQUEST_CONFLICT', message: 'Эта попытка записи не может быть повторена' }],
    [422, { error: 'BOOKING_REJECTED', message: 'Не удалось подтвердить запись' }],
  ])('fails HTTP %s closed with phone fallback', async (status, failure) => {
    await reachReview({ responses: [json(availableSchedule({})), json(failure, status)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Не удалось подтвердить запись' })
    expect({ phone: screen.getByRole('link', { name: /748-22-10/ }).getAttribute('href'), retry: screen.queryByRole('button', { name: /Повторить|Проверить статус/ }) }).toEqual({ phone: 'tel:+78127482210', retry: null })
  })
})

describe('BookingFlow dialog lifecycle and accessibility', () => {
  it('labels the modal, announces loading politely, and focuses the dialog on open', async () => {
    const pending = deferred()
    renderFlow({ explicitDoctor: 'odintsov', responses: [pending.promise] })
    const dialog = screen.getByRole('dialog', { name: 'Онлайн-запись' })
    await waitFor(() => {
      if (document.activeElement !== dialog) throw new Error('Expected dialog focus')
    })
    const status = screen.getByRole('status')
    expect({ modal: dialog.getAttribute('aria-modal'), labelledBy: dialog.getAttribute('aria-labelledby'), title: document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent, live: status.getAttribute('aria-live'), atomic: status.getAttribute('aria-atomic'), message: status.textContent }).toEqual({ modal: 'true', labelledBy: 'booking-dialog-title', title: 'Онлайн-запись', live: 'polite', atomic: 'true', message: 'Загружаем расписание' })
  })

  it('wraps the initial reverse Tab from the focused dialog to its last control', async () => {
    renderFlow()
    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      if (document.activeElement !== dialog) throw new Error('Expected dialog focus')
    })
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(controls.at(-1))
  })

  it('exposes a namespaced responsive shell and dialog state hooks', () => {
    renderFlow()
    const overlay = document.querySelector('.booking-overlay')
    const dialog = screen.getByRole('dialog')
    const hooks = ['booking-dialog-header', 'booking-dialog-body', 'booking-dialog-content', 'booking-live-region']
    expect({ overlay: overlay.classList.contains('booking-overlay'), state: overlay.dataset.bookingState, submitting: overlay.dataset.submitting, dialog: dialog.classList.contains('booking-dialog'), hooks: hooks.every((name) => dialog.querySelector(`.${name}`)) }).toEqual({ overlay: true, state: 'doctor', submitting: 'false', dialog: true, hooks: true })
  })

  it('renders the active step footer inside the dedicated actions region', async () => {
    await reachPatient()
    const dialog = screen.getByRole('dialog')
    const scroll = dialog.querySelector('.booking-dialog-scroll')
    const actions = dialog.querySelector('.booking-dialog-actions')
    const footer = dialog.querySelector('.booking-dialog-footer')
    expect({ scroll: Boolean(scroll), actions: Boolean(actions), portaled: footer?.parentElement === actions }).toEqual({ scroll: true, actions: true, portaled: true })
  })

  it('exposes the complete compact booking summary with the requested address', async () => {
    await reachPatient()
    const summary = screen.getByRole('complementary', { name: 'Выбранная запись' })
    const values = ['name', 'type', 'price', 'location'].map((hook) => summary.querySelector(`.booking-summary-${hook}`)?.textContent)
    expect(values).toEqual(['Одинцов Владислав Александрович', 'Маммолог', '4 900 ₽', 'просп. Богатырский, д. 22к1'])
  })

  it('traps forward and reverse Tab navigation inside the dialog', async () => {
    renderFlow()
    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      if (document.activeElement !== dialog) throw new Error('Expected dialog focus')
    })
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
    const first = controls[0]
    const last = controls.at(-1)
    last.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    const forward = document.activeElement === first
    first.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect({ forward, reverse: document.activeElement === last }).toEqual({ forward: true, reverse: true })
  })

  it('keeps focus contained when the active submit control is replaced by a result', async () => {
    await reachReview({ responses: [json(availableSchedule({})), json(confirmation(), 201)], uuid: () => FIRST_INTENT_ID })
    const submit = screen.getByRole('button', { name: 'Подтвердить запись' })
    submit.focus()
    fireEvent.click(submit)
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      if (!dialog.contains(document.activeElement)) throw new Error('Expected focus to remain in dialog')
    })
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('keeps focus on the dialog when submission leaves no enabled controls', async () => {
    const pending = deferred()
    await reachReview({ responses: [json(availableSchedule({})), pending.promise], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      if (!screen.getByRole('button', { name: 'Подтверждаем запись' }).disabled) throw new Error('Expected disabled submit')
    })
    document.body.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(dialog)
  })

  it('blocks close, backdrop, and Escape while a POST is in flight', async () => {
    const pending = deferred()
    const request = await reachReview({ responses: [json(availableSchedule({})), pending.promise], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const dialog = screen.getByRole('dialog')
    const close = screen.getByRole('button', { name: 'Закрыть запись' })
    await waitFor(() => {
      if (!screen.getByRole('button', { name: 'Подтверждаем запись' }).disabled) throw new Error('Expected disabled submit')
    })
    fireEvent.click(close)
    fireEvent.click(document.querySelector('.booking-overlay'))
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect({ open: Boolean(screen.queryByRole('dialog')), closeDisabled: close.disabled, posts: postBodies(request).length }).toEqual({ open: true, closeDisabled: true, posts: 1 })
  })

  it('exposes submission busy state without creating a nested main landmark', async () => {
    const pending = deferred()
    await reachReview({ responses: [json(availableSchedule({})), pending.promise], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      if (dialog.getAttribute('aria-busy') !== 'true') throw new Error('Expected busy dialog')
    })
    expect({ busy: dialog.getAttribute('aria-busy'), submitting: document.querySelector('.booking-overlay').dataset.submitting, nestedMain: dialog.querySelector('main') }).toEqual({ busy: 'true', submitting: 'true', nestedMain: null })
  })

  it.each(['close', 'backdrop', 'escape'])('restores focus to the exact connected trigger after %s dismissal', async (dismissal) => {
    const request = transport([])
    render(
      <>
        <button type="button" data-booking-btn>Первая запись</button>
        <button type="button" data-booking-btn><span>Точная запись</span></button>
        <BookingFlow doctors={PUBLIC_DOCTORS} fetcher={request.fetcher} uuid={() => FIRST_INTENT_ID} clock={() => TEST_NOW} />
      </>
    )
    const trigger = screen.getByRole('button', { name: 'Точная запись' })
    trigger.focus()
    fireEvent.click(screen.getByText('Точная запись'))
    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      if (document.activeElement !== dialog) throw new Error('Expected dialog focus')
    })
    if (dismissal === 'close') fireEvent.click(screen.getByRole('button', { name: 'Закрыть запись' }))
    if (dismissal === 'backdrop') fireEvent.click(document.querySelector('.booking-overlay'))
    if (dismissal === 'escape') fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => {
      if (document.activeElement !== trigger) throw new Error('Expected exact trigger restoration')
    })
    expect(document.activeElement).toBe(trigger)
  })

  it('locks scroll with scrollbar compensation and restores exact inline styles on close', async () => {
    const original = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight, innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth }
    document.body.style.overflow = 'clip'
    document.body.style.paddingRight = '7px'
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1180 })
    renderFlow()
    await waitFor(() => {
      if (document.body.style.overflow !== 'hidden') throw new Error('Expected scroll lock')
    })
    const locked = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight }
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть запись' }))
    await waitFor(() => {
      if (document.body.style.overflow !== 'clip') throw new Error('Expected restored scroll style')
    })
    const restored = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight }
    document.body.style.overflow = original.overflow
    document.body.style.paddingRight = original.paddingRight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: original.innerWidth })
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: original.clientWidth })
    expect({ locked, restored }).toEqual({ locked: { overflow: 'hidden', paddingRight: '27px' }, restored: { overflow: 'clip', paddingRight: '7px' } })
  })

  it('restores exact body styles when the open island unmounts', async () => {
    const original = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight }
    document.body.style.overflow = 'visible'
    document.body.style.paddingRight = '3px'
    const request = renderFlow()
    await waitFor(() => {
      if (document.body.style.overflow !== 'hidden') throw new Error('Expected scroll lock')
    })
    request.unmount()
    const restored = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight }
    document.body.style.overflow = original.overflow
    document.body.style.paddingRight = original.paddingRight
    expect(restored).toEqual({ overflow: 'visible', paddingRight: '3px' })
  })

  it('keeps the privacy link inside the patient-step focus order', async () => {
    await reachPatient()
    const dialog = screen.getByRole('dialog')
    const controls = [...dialog.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')]
    const privacy = screen.getByRole('link', { name: 'политикой конфиденциальности' })
    const consent = screen.getByRole('checkbox', { name: /Согласие на обработку/ })
    const back = screen.getByRole('button', { name: 'Назад' })
    const positions = [controls.indexOf(consent), controls.indexOf(privacy), controls.indexOf(back)]
    expect({ privacyInside: dialog.contains(privacy), relativeOrder: [positions[1] - positions[0], positions[2] - positions[1]] }).toEqual({ privacyInside: true, relativeOrder: [1, 1] })
  })

  it('announces a trusted confirmation through the atomic live region', async () => {
    await reachReview({ responses: [json(availableSchedule({})), json(confirmation(), 201)], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    await screen.findByRole('heading', { name: 'Запись подтверждена' })
    expect(screen.getByRole('status').textContent).toBe('Запись подтверждена')
  })

  it('clears the confirmed sensitive draft before the next opening', async () => {
    const request = await reachReview({ responses: [json(availableSchedule({})), json(confirmation(), 201), json(availableSchedule({}))], uuid: () => FIRST_INTENT_ID })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Готово' }))
    fireEvent.click(request.trigger)
    fireEvent.click(await screen.findByRole('button', { name: '10:20' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    const values = ['Имя', 'Фамилия', 'Отчество', 'Телефон', 'Дата рождения', 'Комментарий'].map((label) => screen.getByLabelText(label).value)
    expect({ values, consent: screen.getByRole('checkbox', { name: /Согласие на обработку/ }).checked }).toEqual({ values: ['', '', '', '', '', ''], consent: false })
  })

  it('clears an intentionally dismissed sensitive draft before another opening', async () => {
    const request = await reachPatient({ responses: [json(availableSchedule({})), json(availableSchedule({}))] })
    fillPatient()
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть запись' }))
    fireEvent.click(request.trigger)
    fireEvent.click(await screen.findByRole('button', { name: '10:20' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    const values = ['Имя', 'Фамилия', 'Отчество', 'Телефон', 'Дата рождения', 'Комментарий'].map((label) => screen.getByLabelText(label).value)
    expect({ values, consent: screen.getByRole('checkbox', { name: /Согласие на обработку/ }).checked }).toEqual({ values: ['', '', '', '', '', ''], consent: false })
  })

  it('keeps patient data and intent identifiers out of state attributes and browser storage', async () => {
    await reachReview({ uuid: () => FIRST_INTENT_ID })
    const dataAttributes = [...document.querySelectorAll('*')].flatMap((element) => [...element.attributes].filter((attribute) => attribute.name.startsWith('data-')).map((attribute) => attribute.value)).join('|')
    const storage = [localStorage, sessionStorage].flatMap((area) => Array.from({ length: area.length }, (_, index) => `${area.key(index)}|${area.getItem(area.key(index))}`)).join('|')
    const leaked = ['Лёля', 'О’Коннор-Сидорова', '+7 (921) 555-01-29', '79215550129', 'Нужен сурдопереводчик', FIRST_INTENT_ID].some((value) => dataAttributes.includes(value) || storage.includes(value))
    expect(leaked).toBe(false)
  })
})
