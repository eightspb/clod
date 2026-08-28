import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Patients } from './Patients.jsx'

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const PATIENT = Object.freeze({ id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29', firstSeenAt: '2026-08-26T10:00:00.000Z', lastSeenAt: '2026-08-27T10:00:00.000Z', createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z', piiDestroyedAt: null, externalIdentifierCount: 3, clinicCardCount: 2, contactCount: 2, previousLastNameCount: 1, historicalVisitCount: 7, issueCount: 2, attachmentCount: 0 })
const PAGE = Object.freeze({ data: Object.freeze([PATIENT]), page: Object.freeze({ number: 1, size: 50, total: 1, pages: 2 }) })
const NEWEST_PATIENT = Object.freeze({ ...PATIENT, id: 'b780de13-a61f-49fc-a56a-861de5cb145d', name: 'Шелкович Эльвира Фоминична', phoneMask: '+7 •••••••• 37' })
const NEWEST_PAGE = Object.freeze({ data: Object.freeze([NEWEST_PATIENT]), page: Object.freeze({ number: 1, size: 50, total: 1, pages: 1 }) })
const NO_PHONE_PATIENT = Object.freeze({ ...PATIENT, id: 'c591ef24-b720-4ec0-b904-972ef6dc256e', name: 'Ия Безтелефонова', phoneMask: null })
const NO_PHONE_PAGE = Object.freeze({ data: Object.freeze([NO_PHONE_PATIENT]), page: Object.freeze({ number: 1, size: 50, total: 1, pages: 1 }) })
const DETAIL = Object.freeze({ data: PATIENT, history: Object.freeze({ visits: Object.freeze({ data: Object.freeze([]), page: Object.freeze({ number: 1, size: 10, total: 0, pages: 0 }) }), issues: Object.freeze({ data: Object.freeze([]), page: Object.freeze({ number: 1, size: 10, total: 0, pages: 0 }) }), attachments: Object.freeze([]) }) })
const REVEALED = Object.freeze({ id: PATIENT_ID, profile: Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '79215550129', birthday: '1988-02-29' }), contacts: Object.freeze([]), previousLastNames: Object.freeze([]), externalIdentifiers: Object.freeze([]), privateData: null, consents: Object.freeze([]), attachments: Object.freeze([]), historicalVisits: Object.freeze([]), revealedAt: '2026-08-27T11:00:00.000Z' })

function json(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function transport(responses) {
  const calls = []
  const fetcher = vi.fn(async (...input) => {
    calls.push(input)
    const response = responses.shift()
    if (response instanceof Error) throw response
    return typeof response === 'function' ? response(...input) : response
  })
  vi.stubGlobal('fetch', fetcher)
  return calls
}

function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}

afterEach(() => {
  window.history.replaceState({}, '', '/admin/patients')
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Patients admin view', () => {
  it('shows a useful loading state while the first page is pending', () => {
    transport([new Promise(() => undefined)])
    render(<Patients />)
    expect(screen.getByRole('status').textContent).toContain('Загружаем пациентов')
  })

  it('renders only the patient name and masked phone by default', async () => {
    transport([json(PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    expect({ mask: screen.getByText(PATIENT.phoneMask).textContent, leaked: screen.queryByText('79215550129') }).toEqual({ mask: PATIENT.phoneMask, leaked: null })
  })

  it('links the patient name and masked phone to the patient card', async () => {
    transport([json(PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    const href = `/admin/patients?patient=${PATIENT_ID}`
    expect(screen.getAllByRole('link').filter((link) => link.getAttribute('href') === href).map((link) => link.textContent)).toEqual([PATIENT.name, PATIENT.phoneMask])
  })

  it('keeps detail access without offering phone reveal when an active patient has no phone', async () => {
    transport([json(NO_PHONE_PAGE), json({ ...DETAIL, data: NO_PHONE_PATIENT })])
    render(<Patients />)
    await screen.findByText(NO_PHONE_PATIENT.name)
    const detail = screen.getByRole('button', { name: `Открыть карточку ${NO_PHONE_PATIENT.name}` })
    expect(screen.queryByRole('button', { name: `Показать телефон ${NO_PHONE_PATIENT.name}` })).toBeNull()
    fireEvent.click(detail)
    expect(await screen.findByRole('button', { name: 'Раскрыть персональные данные' })).toBeVisible()
  })

  it('shows safe history badges without exposing a previous surname', async () => {
    transport([json(PAGE)])
    render(<Patients />)
    const row = (await screen.findByText(PATIENT.name)).closest('tr')
    expect({ summary: row.textContent, leaked: screen.queryByText('Прежняя-Синтетическая') }).toEqual({ summary: expect.stringContaining('3 карты · 7 визитов · 2 проблем'), leaked: null })
  })

  it('opens a patient detail from a calls deep link', async () => {
    window.history.replaceState({}, '', `/admin/patients?patient=${PATIENT_ID}`)
    const calls = transport([json(PAGE), json(DETAIL)])
    render(<Patients />)
    const detail = await screen.findByRole('region', { name: `Карточка пациента ${PATIENT.name}` })
    expect({ urls: calls.map(([url]) => String(url)), inline: detail.closest('tr')?.previousElementSibling?.textContent }).toEqual({ urls: [`/api/admin/patients?page=1&pageSize=50&patient=${PATIENT_ID}`, `/api/admin/patients/${PATIENT_ID}?callsPage=1&callsPageSize=10&visitsPage=1&visitsPageSize=10&issuesPage=1&issuesPageSize=10`], inline: expect.stringContaining(PATIENT.name) })
  })

  it('updates the deep link when a patient card is opened and clears it on close', async () => {
    transport([json(PAGE), json(DETAIL)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `Открыть карточку ${PATIENT.name}` }))
    await screen.findByRole('region', { name: `Карточка пациента ${PATIENT.name}` })
    const opened = window.location.search
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть карточку пациента' }))
    expect({ opened, closed: window.location.search, detail: screen.queryByRole('region', { name: `Карточка пациента ${PATIENT.name}` }) }).toEqual({ opened: `?patient=${PATIENT_ID}`, closed: '', detail: null })
  })

  it('expands the patient card directly below its table row', async () => {
    transport([json(PAGE), json(DETAIL)])
    render(<Patients />)
    const row = (await screen.findByText(PATIENT.name)).closest('tr')
    fireEvent.click(screen.getByRole('button', { name: `Открыть карточку ${PATIENT.name}` }))
    const detailRow = (await screen.findByRole('region', { name: `Карточка пациента ${PATIENT.name}` })).closest('tr')
    expect(detailRow?.previousElementSibling).toBe(row)
  })

  it('loads the unresolved visit queue only when an administrator opens it', async () => {
    const issues = { data: [], page: { number: 1, size: 50, total: 0, pages: 0 } }
    const calls = transport([json(PAGE), json(issues)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: 'Показать проблемы сопоставления' }))
    await screen.findByRole('region', { name: 'Проблемы сопоставления визитов' })
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/patients?page=1&pageSize=50', '/api/admin/patient-history/issues?page=1&pageSize=50&status=ambiguous'])
  })

  it('applies exact phone search and advances pagination', async () => {
    const calls = transport([json(PAGE), json(PAGE), json(PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.change(screen.getByLabelText('Точный телефон'), { target: { value: '+7 921 555-01-29' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры пациентов' }))
    await waitFor(() => expect(calls.length).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))
    await waitFor(() => expect(calls.length).toBe(3))
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/patients?page=1&pageSize=50', '/api/admin/patients?page=1&pageSize=50&phone=%2B7+921+555-01-29', '/api/admin/patients?page=2&pageSize=50&phone=%2B7+921+555-01-29'])
  })

  it('keeps the newest patient search when an older list response finishes last', async () => {
    const older = deferred()
    const newer = deferred()
    transport([json(PAGE), older.promise, newer.promise])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.change(screen.getByLabelText('Точный телефон'), { target: { value: '+7 921 555-01-29' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры пациентов' }))
    fireEvent.change(screen.getByLabelText('Точный телефон'), { target: { value: '+7 921 555-01-37' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры пациентов' }))
    await act(async () => { newer.resolve(await json(NEWEST_PAGE)) })
    await screen.findByText(NEWEST_PATIENT.name)
    await act(async () => { older.resolve(await json(PAGE)) })
    expect({ current: screen.queryByText(NEWEST_PATIENT.name)?.textContent, stale: screen.queryByText(PATIENT.name), staleAction: screen.queryByRole('button', { name: `Открыть карточку ${PATIENT.name}` }), page: screen.getByText('Страница 1 из 1').textContent, loading: screen.queryByRole('status'), error: screen.queryByRole('alert') }).toEqual({ current: NEWEST_PATIENT.name, stale: null, staleAction: null, page: 'Страница 1 из 1', loading: null, error: null })
  })

  it('clears the previous patient rows and reports a current search failure', async () => {
    transport([json(PAGE), json({ error: 'PATIENTS_UNAVAILABLE' }, 503)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.change(screen.getByLabelText('Точный телефон'), { target: { value: '+7 921 555-01-37' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры пациентов' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить пациентов')
    expect({ stale: screen.queryByText(PATIENT.name), filter: screen.getByLabelText('Точный телефон').value }).toEqual({ stale: null, filter: '+7 921 555-01-37' })
  })

  it('ignores an older failed patient search after a newer search succeeds', async () => {
    const older = deferred()
    transport([json(PAGE), older.promise, json(NEWEST_PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.change(screen.getByLabelText('Точный телефон'), { target: { value: '+7 921 555-01-29' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры пациентов' }))
    fireEvent.change(screen.getByLabelText('Точный телефон'), { target: { value: '+7 921 555-01-37' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры пациентов' }))
    await screen.findByText(NEWEST_PATIENT.name)
    await act(async () => { older.resolve(await json({ error: 'PATIENTS_UNAVAILABLE' }, 503)) })
    expect({ current: screen.queryByText(NEWEST_PATIENT.name)?.textContent, error: screen.queryByRole('alert') }).toEqual({ current: NEWEST_PATIENT.name, error: null })
  })

  it('reveals a phone explicitly and hides it again after thirty seconds', async () => {
    vi.useFakeTimers()
    transport([json(PAGE), json({ data: REVEALED })])
    render(<Patients />)
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: `Показать телефон ${PATIENT.name}` }))
    await act(async () => undefined)
    const revealed = screen.getByText('79215550129').textContent
    act(() => vi.advanceTimersByTime(30_000))
    expect({ revealed, hidden: screen.queryByText('79215550129'), mask: screen.getByText(PATIENT.phoneMask).textContent }).toEqual({ revealed: '79215550129', hidden: null, mask: PATIENT.phoneMask })
  })

  it('does not restore a pending phone reveal after selecting a patient', async () => {
    const pending = deferred()
    transport([json(PAGE), pending.promise, json(DETAIL)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `Показать телефон ${PATIENT.name}` }))
    fireEvent.click(screen.getByRole('button', { name: `Открыть карточку ${PATIENT.name}` }))
    await screen.findByRole('region', { name: `Карточка пациента ${PATIENT.name}` })
    await act(async () => {
      pending.resolve(await json({ data: REVEALED }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.queryByText(REVEALED.profile.phone)).toBeNull()
  })

  it('clears detail disclosure when the already-selected patient is selected again', async () => {
    transport([json(PAGE), json(DETAIL), json({ data: REVEALED }), json(DETAIL)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `Открыть карточку ${PATIENT.name}` }))
    await screen.findByRole('region', { name: `Карточка пациента ${PATIENT.name}` })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    await screen.findByText('Нет других фамилий')
    fireEvent.click(screen.getByRole('button', { name: `Открыть карточку ${PATIENT.name}` }))
    await waitFor(() => expect(screen.queryByText(REVEALED.profile.phone)).toBeNull())
  })

  it('requires dialog confirmation and renders an anonymized patient after destruction', async () => {
    transport([json(PAGE), json({ data: { id: PATIENT_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } })])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `Уничтожить данные ${PATIENT.name}` }))
    const dialog = screen.getByRole('dialog', { name: 'Уничтожить персональные данные?' })
    fireEvent.click(screen.getByRole('button', { name: 'Уничтожить безвозвратно' }))
    await screen.findByText('Данные уничтожены')
    expect({ dialog: Boolean(dialog), name: screen.queryByText(PATIENT.name), mask: screen.queryByText(PATIENT.phoneMask) }).toEqual({ dialog: true, name: null, mask: null })
  })

  it('restores focus after cancelling destruction from the patient list', async () => {
    transport([json(PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    const trigger = screen.getByRole('button', { name: `Уничтожить данные ${PATIENT.name}` })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(trigger).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside the patient-list destruction dialog', async () => {
    transport([json(PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `Уничтожить данные ${PATIENT.name}` }))
    const dialog = screen.getByRole('dialog', { name: 'Уничтожить персональные данные?' })
    const cancel = screen.getByRole('button', { name: 'Отмена' })
    const destroy = screen.getByRole('button', { name: 'Уничтожить безвозвратно' })
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(destroy).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(cancel).toHaveFocus()
  })

  it('shows an empty state when no patients match the filter', async () => {
    transport([json({ data: [], page: { number: 1, size: 50, total: 0, pages: 0 } })])
    render(<Patients />)
    expect(await screen.findByText('Пациенты не найдены')).toBeTruthy()
  })

  it('shows a stable error state without exposing transport details', async () => {
    transport([json({ error: 'PATIENTS_UNAVAILABLE' }, 503)])
    render(<Patients />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить пациентов')
  })

  it('loads a paginated masked call section for one patient on demand', async () => {
    const call = { entryId: 'entry-1', patientId: PATIENT_ID, status: 'missed', callerMask: PATIENT.phoneMask, repeatCaller: false, lineNumber: '78127482210', operatorExtension: null, startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: null, answeredAt: null, endedAt: '2026-08-26T10:01:00.000Z', waitSeconds: 60, talkSeconds: 0, disconnectReason: null, finalizedAt: '2026-08-26T10:01:00.000Z', createdAt: '2026-08-26T10:02:00.000Z', updatedAt: '2026-08-26T10:02:00.000Z', piiDestroyedAt: null }
    const calls = transport([json(PAGE), json({ data: PATIENT, calls: { data: [call], page: { number: 1, size: 10, total: 1, pages: 2 } } }), json({ data: PATIENT, calls: { data: [call], page: { number: 2, size: 10, total: 1, pages: 2 } } })])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `История звонков ${PATIENT.name}` }))
    expect(await screen.findByText('Звонки пациента')).toBeVisible()
    expect(screen.getByText('Пропущен')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница звонков' }))
    await waitFor(() => expect(calls.length).toBe(3))
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/patients?page=1&pageSize=50', `/api/admin/patients/${PATIENT_ID}?callsPage=1&callsPageSize=10`, `/api/admin/patients/${PATIENT_ID}?callsPage=2&callsPageSize=10`])
  })
})
