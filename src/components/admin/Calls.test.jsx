import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Calls } from './Calls.jsx'

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const CALL = Object.freeze({ entryId: 'entry:clinic:1', patientId: PATIENT_ID, status: 'answered', callerMask: '+7 •••••••• 29', repeatCaller: true, lineNumber: '78127482210', operatorExtension: '123', startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: '2026-08-26T10:00:05.000Z', answeredAt: '2026-08-26T10:00:10.000Z', endedAt: '2026-08-26T10:01:10.000Z', waitSeconds: 10, talkSeconds: 60, disconnectReason: '1100', finalizedAt: '2026-08-26T10:01:10.000Z', createdAt: '2026-08-26T10:02:00.000Z', updatedAt: '2026-08-26T10:02:00.000Z', piiDestroyedAt: null })
const ACTIVE_CALL = Object.freeze({ ...CALL, entryId: 'entry:clinic:active', status: 'connected', callerMask: '+7 •••••••• 47', startedAt: '2026-08-26T10:05:00.000Z', forwardedAt: '2026-08-26T10:05:02.000Z', answeredAt: '2026-08-26T10:05:05.000Z', endedAt: null, waitSeconds: 5, talkSeconds: 38, disconnectReason: null, finalizedAt: null, createdAt: '2026-08-26T10:05:00.000Z', updatedAt: '2026-08-26T10:05:43.000Z' })
const METRICS = Object.freeze({ active: 1, incoming: 3, answered: 1, missed: 1, answerRate: 50, averageWaitSeconds: 20, averageTalkSeconds: 30 })
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
    expect(screen.getByRole('link', { name: 'Открыть пациента' })).toHaveAttribute('href', `/admin/patients?patient=${PATIENT_ID}`)
  })

  it('shows an unknown-caller label when no patient is linked', async () => {
    transport([json({ ...PAGE, data: [{ ...CALL, entryId: 'entry-2', patientId: null, repeatCaller: false }] })])
    render(<Calls />)
    expect(await screen.findByText('Новый звонящий')).toBeVisible()
  })

  it('keeps every active call visible when the journal is filtered to missed calls', async () => {
    const second = Object.freeze({ ...ACTIVE_CALL, entryId: 'entry:clinic:queued', patientId: null, status: 'queued', operatorExtension: null })
    transport([json({ ...PAGE, activeCalls: [ACTIVE_CALL, second] }), json({ ...PAGE, activeCalls: [ACTIVE_CALL, second] })])
    render(<Calls />)
    await screen.findByRole('region', { name: 'Текущие звонки' })
    fireEvent.change(screen.getByLabelText('Статус звонка'), { target: { value: 'missed' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры звонков' }))
    const current = await screen.findByRole('region', { name: 'Текущие звонки' })
    expect(current.querySelectorAll('article')).toHaveLength(2)
  })

  it('applies exact filters and keeps them while advancing pagination', async () => {
    const calls = transport([json(PAGE), json(PAGE), json(PAGE)])
    render(<Calls />)
    await screen.findByRole('table')
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
