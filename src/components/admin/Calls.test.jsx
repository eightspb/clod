import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Calls } from './Calls.jsx'

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const PATIENT_NAME = 'О’Коннор-Сидорова Лёля Алиевна'
const CALL = Object.freeze({ entryId: 'entry:clinic:1', patientId: PATIENT_ID, patientName: PATIENT_NAME, status: 'answered', callerMask: '+7 •••••••• 29', repeatCaller: true, lineNumber: '78127482210', operatorExtension: '123', startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: '2026-08-26T10:00:05.000Z', answeredAt: '2026-08-26T10:00:10.000Z', endedAt: '2026-08-26T10:01:10.000Z', waitSeconds: 10, talkSeconds: 60, disconnectReason: '1100', finalizedAt: '2026-08-26T10:01:10.000Z', createdAt: '2026-08-26T10:02:00.000Z', updatedAt: '2026-08-26T10:02:00.000Z', piiDestroyedAt: null })
const ACTIVE_CALL = Object.freeze({ ...CALL, entryId: 'entry:clinic:active', status: 'connected', callerMask: '+7 •••••••• 47', startedAt: '2026-08-26T10:05:00.000Z', forwardedAt: '2026-08-26T10:05:02.000Z', answeredAt: '2026-08-26T10:05:05.000Z', endedAt: null, waitSeconds: 5, talkSeconds: 38, disconnectReason: null, finalizedAt: null, createdAt: '2026-08-26T10:05:00.000Z', updatedAt: '2026-08-26T10:05:43.000Z' })
const METRICS = Object.freeze({ active: 1, incoming: 3, answered: 1, missed: 1, answerRate: 50, averageWaitSeconds: 20, averageTalkSeconds: 30, lastEventAt: '2026-08-26T10:05:43.000Z' })
const PAGE = Object.freeze({ data: Object.freeze([CALL]), page: Object.freeze({ number: 1, size: 50, total: 1, pages: 2 }), activeCalls: Object.freeze([ACTIVE_CALL]), metrics: METRICS })

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

afterEach(() => {
  window.history.replaceState({}, '', '/admin/calls')
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Calls admin view', () => {
  it('shows the telephony silence banner when MANGO events stopped during clinic hours', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-26T12:00:00.000Z'), shouldAdvanceTime: true })
    transport([json({ ...PAGE, metrics: { ...METRICS, lastEventAt: '2026-08-26T06:30:00.000Z' } })])
    render(<Calls />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Телефония молчит')
  })

  it('keeps call filters collapsed until an administrator opens them', async () => {
    transport([json(PAGE)])
    render(<Calls />)
    await screen.findByRole('heading', { name: 'Журнал звонков' })
    const toggle = screen.getByRole('button', { name: 'Показать фильтры звонков' })
    expect({ expanded: toggle.getAttribute('aria-expanded'), form: screen.queryByRole('form', { name: 'Фильтры звонков' }) }).toEqual({ expanded: 'false', form: null })
  })

  it('applies call date, repetition, and patient-link filters', async () => {
    const calls = transport([json(PAGE), json(PAGE)])
    render(<Calls />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Показать фильтры звонков' }))
    fireEvent.change(screen.getByLabelText('Звонки с'), { target: { value: '2026-08-26' } })
    fireEvent.change(screen.getByLabelText('Звонки по'), { target: { value: '2026-08-27' } })
    fireEvent.change(screen.getByLabelText('Обращение'), { target: { value: 'repeat' } })
    fireEvent.change(screen.getByLabelText('Связь с пациентом'), { target: { value: 'linked' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры звонков' }))
    await waitFor(() => expect(calls.length).toBe(2))
    expect(String(calls[1][0])).toBe('/api/admin/calls?page=1&pageSize=50&from=2026-08-25T21%3A00%3A00.000Z&to=2026-08-27T21%3A00%3A00.000Z&repeat=repeat&patientLink=linked')
    expect(screen.getByText('3 активных')).toBeTruthy()
  })

  it('shows an explicit loading state before the first call page arrives', () => {
    transport([new Promise(() => undefined)])
    render(<Calls />)
    expect(screen.getByRole('status')).toHaveTextContent('Загружаем звонки')
  })

  it('renders metrics, Russian status, Moscow time, patient link, and masked caller', async () => {
    transport([json(PAGE)])
    render(<Calls />)
    expect(await screen.findByRole('heading', { name: 'Журнал звонков' })).toBeVisible()
    expect(screen.getByText('Входящие сегодня').parentElement).toHaveTextContent('3')
    expect(screen.getByText('Доля ответов').parentElement).toHaveTextContent('50%')
    expect(screen.getByText('Средний разговор').parentElement).toHaveTextContent('30 с')
    expect(screen.getByRole('table')).toHaveTextContent('Отвечен')
    expect(screen.getByText('26.08.2026, 13:00')).toBeVisible()
    expect(screen.getByText(CALL.callerMask)).toBeVisible()
    expect(screen.queryByText('79215550129')).toBeNull()
    expect(screen.getAllByRole('link', { name: PATIENT_NAME })[1]).toHaveAttribute('href', `/admin/patients?patient=${PATIENT_ID}`)
  })

  it('links patient names below unlinked caller numbers in live and completed calls', async () => {
    transport([json(PAGE)])
    render(<Calls />)
    const current = await screen.findByRole('region', { name: 'Текущие звонки' })
    const table = screen.getByRole('table')
    const links = [table.querySelector(`a[href="/admin/patients?patient=${PATIENT_ID}"]`), current.querySelector(`a[href="/admin/patients?patient=${PATIENT_ID}"]`)]
    const linkedNumbers = [table, current].map((scope) => [...scope.querySelectorAll('a')].some((link) => [CALL.callerMask, ACTIVE_CALL.callerMask].includes(link.textContent)))
    expect({ names: links.map((link) => link?.textContent), linkedNumbers }).toEqual({ names: [PATIENT_NAME, PATIENT_NAME], linkedNumbers: [false, false] })
  })

  it('rounds average call durations to whole seconds', async () => {
    const metrics = { ...METRICS, averageWaitSeconds: 11.4, averageTalkSeconds: 88.20000000000003 }
    transport([json({ ...PAGE, metrics })])
    render(<Calls />)
    await screen.findByRole('heading', { name: 'Журнал звонков' })
    expect(['Среднее ожидание', 'Средний разговор'].map((label) => screen.getByText(label).parentElement.textContent)).toEqual(['Среднее ожидание11 с', 'Средний разговор1 мин 28 с'])
  })

  it('shows an unknown-caller label when no patient is linked', async () => {
    transport([json({ ...PAGE, data: [{ ...CALL, entryId: 'entry-2', patientId: null, patientName: null, repeatCaller: false }] })])
    render(<Calls />)
    expect(await screen.findByText('Новый звонящий')).toBeVisible()
  })

  it('keeps every active call visible when the journal is filtered to missed calls', async () => {
    const second = Object.freeze({ ...ACTIVE_CALL, entryId: 'entry:clinic:queued', patientId: null, patientName: null, status: 'queued', operatorExtension: null })
    transport([json({ ...PAGE, activeCalls: [ACTIVE_CALL, second] }), json({ ...PAGE, activeCalls: [ACTIVE_CALL, second] })])
    render(<Calls />)
    await screen.findByRole('region', { name: 'Текущие звонки' })
    fireEvent.click(screen.getByRole('button', { name: 'Показать фильтры звонков' }))
    fireEvent.change(screen.getByLabelText('Статус звонка'), { target: { value: 'missed' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры звонков' }))
    const current = await screen.findByRole('region', { name: 'Текущие звонки' })
    expect(current.querySelectorAll('article')).toHaveLength(2)
  })

  it('applies exact filters and keeps them while advancing pagination', async () => {
    const calls = transport([json(PAGE), json(PAGE), json(PAGE)])
    render(<Calls />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Показать фильтры звонков' }))
    fireEvent.change(screen.getByLabelText('Статус звонка'), { target: { value: 'missed' } })
    fireEvent.change(screen.getByLabelText('Линия клиники'), { target: { value: '+7 812 748-22-10' } })
    fireEvent.change(screen.getByLabelText('Добавочный'), { target: { value: '321' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры звонков' }))
    await waitFor(() => expect(calls.length).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))
    await waitFor(() => expect(calls.length).toBe(3))
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/calls?page=1&pageSize=50', '/api/admin/calls?page=1&pageSize=50&status=missed&lineNumber=%2B7+812+748-22-10&operatorExtension=321', '/api/admin/calls?page=2&pageSize=50&status=missed&lineNumber=%2B7+812+748-22-10&operatorExtension=321'])
  })

  it('applies a supported status filter from a dashboard deep link', async () => {
    window.history.replaceState({}, '', '/admin/calls?status=missed')
    const calls = transport([json(PAGE)])
    render(<Calls />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Показать фильтры звонков' }))
    expect(screen.getByLabelText('Статус звонка')).toHaveValue('missed')
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/calls?page=1&pageSize=50&status=missed'])
  })

  it('reveals a caller explicitly and discards plaintext after thirty seconds', async () => {
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    transport([json(PAGE), json({ data: { entryId: CALL.entryId, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } })])
    render(<Calls />)
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: `Показать номер ${CALL.callerMask}` }))
    await act(async () => undefined)
    expect(screen.getByText('79215550129')).toBeVisible()
    act(() => vi.advanceTimersByTime(30_000))
    expect(screen.queryByText('79215550129')).toBeNull()
    expect(screen.getByText(CALL.callerMask)).toBeVisible()
  })

  it('hides a revealed caller as soon as the browser tab becomes hidden', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    transport([json(PAGE), json({ data: { entryId: CALL.entryId, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } })])
    render(<Calls />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: `Показать номер ${CALL.callerMask}` }))
    await screen.findByText('79215550129')
    visibility.mockReturnValue('hidden')
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(screen.queryByText('79215550129')).toBeNull()
  })

  it('requires confirmation and anonymizes a destroyed caller without deleting metrics', async () => {
    transport([json(PAGE), json({ data: { entryId: CALL.entryId, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } })])
    render(<Calls />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: `Уничтожить номер ${CALL.callerMask}` }))
    const dialog = screen.getByRole('dialog', { name: 'Уничтожить данные звонящего?' })
    expect(dialog).toBeVisible()
    expect(screen.getByRole('button', { name: 'Отмена' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Уничтожить безвозвратно' }))
    expect(await screen.findByText('Данные уничтожены')).toBeVisible()
    expect(screen.queryByText(CALL.callerMask)).toBeNull()
    expect(screen.getByText('Входящие сегодня').parentElement).toHaveTextContent('3')
  })

  it('polls every five seconds only while visible and keeps current rows during refresh', async () => {
    vi.useFakeTimers()
    let visible = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible)
    const pending = new Promise(() => undefined)
    const calls = transport([json(PAGE), pending])
    const view = render(<Calls />)
    await act(async () => undefined)
    expect(screen.getByRole('table')).toHaveTextContent('Отвечен')
    act(() => vi.advanceTimersByTime(5_000))
    expect(calls.length).toBe(2)
    expect(screen.getByRole('table')).toHaveTextContent('Отвечен')
    visible = 'hidden'
    act(() => vi.advanceTimersByTime(10_000))
    expect(calls.length).toBe(2)
    view.unmount()
    visible = 'visible'
    act(() => vi.advanceTimersByTime(10_000))
    expect(calls.length).toBe(2)
  })

  it('shows a stable first-load error without transport or PII details', async () => {
    transport([json({ error: 'CALLS_UNAVAILABLE', secret: '79215550129' }, 503)])
    render(<Calls />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось загрузить звонки')
    expect(alert).not.toHaveTextContent('79215550129')
  })
})
