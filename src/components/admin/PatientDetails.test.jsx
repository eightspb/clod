import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PatientDetails } from './PatientDetails.jsx'

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const VISIT_ID = '72000000-0000-4000-8000-000000000002'
const PATIENT = Object.freeze({ id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29', firstSeenAt: null, lastSeenAt: null, createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z', piiDestroyedAt: null, externalIdentifierCount: 3, clinicCardCount: 2, contactCount: 2, previousLastNameCount: 1, historicalVisitCount: 7, issueCount: 2, attachmentCount: 0 })
const VISIT = Object.freeze({ id: VISIT_ID, sourceName: '544663c3807aab090001bad8_visits.csv', sourceRow: 29, startsAt: null, endsAt: null, sourceStatus: 'completed', linkStatus: 'linked', linkMethod: 'exact_ehr', evidenceLevel: 'exact', issueCount: 1, candidateCount: 0, protectedDetailsAvailable: true })
const ISSUE = Object.freeze({ id: '78000000-0000-4000-8000-000000000008', sourceName: VISIT.sourceName, sourceRow: 29, code: 'INVALID_START_DATE', historicalVisitId: VISIT_ID, createdAt: '2026-08-27T10:00:00.000Z', resolvedAt: null })
const DETAIL = Object.freeze({ data: PATIENT, history: Object.freeze({ visits: Object.freeze({ data: Object.freeze([VISIT]), page: Object.freeze({ number: 1, size: 10, total: 7, pages: 2 }) }), issues: Object.freeze({ data: Object.freeze([ISSUE]), page: Object.freeze({ number: 1, size: 10, total: 2, pages: 1 }) }), attachments: Object.freeze([]) }) })
const REVEALED = Object.freeze({ id: PATIENT_ID, profile: Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '79215550129', birthday: '1988-02-29' }), contacts: Object.freeze([{ kind: 'email', value: 'synthetic@example.test', mask: 's••••••••@example.test', isPrimary: false, sourceName: '544663c3807aab090001bad8PD.csv', firstSeenAt: null, lastSeenAt: null }]), previousLastNames: Object.freeze([{ lastName: 'Прежняя', reason: 'surname_change', sourceName: '544663c3807aab090001bad8PD.csv', observedAt: '2024-01-01T08:30:00.000Z' }, { lastName: 'Вариантная', reason: 'identity_alias', sourceName: '544663c3807aab090001bad8PD.csv', observedAt: null }]), externalIdentifiers: Object.freeze([{ system: 'clinic_card', value: '64-2', isPrimary: true, sourceName: '544663c3807aab090001bad8PD.csv', sourceRow: 17 }]), privateData: Object.freeze({ gender: 'female', genderSource: 'patronymic', genderInferred: true, passport: Object.freeze({ series: '4012', number: '000149', issuedBy: 'Тестовый орган', issuedAt: '2010-04-22T00:00:00.000Z', departmentCode: '780-088' }), address: Object.freeze({ postalCode: '190000', region: null, locality: 'Синтетический город', streetAddress: 'Тестовая 7' }), contract: 'Договор-149', notes: 'Синтетическая заметка' }), consents: Object.freeze([{ type: 'sms_notifications', status: 'granted', sourceName: 'Vse pacienty.xlsx', observedAt: null }]), attachments: Object.freeze([]), historicalVisits: Object.freeze([{ id: VISIT_ID, appointmentId: 'appointment-protected-29', doctor: 'Врач Защищённый', details: Object.freeze({ services: Object.freeze(['Приём']), cabinet: '7', comment: 'Позвонить вечером' }) }]), revealedAt: '2026-08-27T11:00:00.000Z' })
const RAW_VISIT_DETAILS = Object.freeze({ appointment_begin: '2023-04-26T15:20:00.000Z', appointment_end: '2023-04-26T15:40:00.000Z', appointment_id: '642ad00f2d63ba070739c6f1', cabinet: '12', comment: 'Повторный приём', doctor: 'Врач Защищённый', doctor_role: 'Маммолог', invoice_ids: 'invoice-29', patient_card: '4675', service_names: 'УЗИ молочных желёз', status: 'completed', structuralIssues: Object.freeze([]) })
const RAW_REVEALED = Object.freeze({ ...REVEALED, historicalVisits: Object.freeze([{ ...REVEALED.historicalVisits[0], details: RAW_VISIT_DETAILS }]) })
const CONFIRMED_SURNAME_TEXT = `${REVEALED.previousLastNames[0].lastName} · Подтверждённая прежняя фамилия`
const PRIVATE_DATA_TEXT = Object.freeze(['Серия: 4012', 'Номер: 000149', 'Адрес: 190000, Синтетический город, Тестовая 7', 'Пол: Женский', 'Источник данных о поле: отчество', 'Договор: Договор-149', 'Заметки: Синтетическая заметка'])

function json(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function transport(responses) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (...input) => {
    calls.push(input)
    const response = responses.shift()
    return typeof response === 'function' ? response(...input) : response
  }))
  return calls
}

function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PatientDetails', () => {
  it('shows safe counts and a missing visit date without revealing protected values', async () => {
    transport([json(DETAIL)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    const region = await screen.findByRole('region', { name: `Карточка пациента ${PATIENT.name}` })
    expect({ summary: region.textContent, protected: screen.queryByText(REVEALED.previousLastNames[0].lastName) }).toEqual({ summary: expect.stringContaining('3 внешние карты'), protected: null })
  })

  it('renders historical visit status and an explicit missing-date label', async () => {
    transport([json(DETAIL)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    const visits = await screen.findByRole('tabpanel', { name: 'Исторические визиты' })
    expect(visits.textContent).toContain('Дата не указанаЗавершён')
  })

  it('filters visits and clears revealed data before changing the visit page', async () => {
    const calls = transport([json(DETAIL), json({ data: REVEALED }), json(DETAIL), json(DETAIL)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    await screen.findByText(CONFIRMED_SURNAME_TEXT)
    fireEvent.change(screen.getByLabelText('Статус связи визитов'), { target: { value: 'linked' } })
    await waitFor(() => expect(calls.length).toBe(3))
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница визитов' }))
    await waitFor(() => expect(calls.length).toBe(4))
    expect({ hidden: screen.queryByText(CONFIRMED_SURNAME_TEXT), url: String(calls[3][0]) }).toEqual({ hidden: null, url: `/api/admin/patients/${PATIENT_ID}?callsPage=1&callsPageSize=10&visitsPage=2&visitsPageSize=10&visitsStatus=linked&issuesPage=1&issuesPageSize=10` })
  })

  it('reveals all protected sections and discards them after thirty seconds', async () => {
    vi.useFakeTimers()
    const calls = transport([json(DETAIL), json({ data: REVEALED })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта перед договором' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    await act(async () => undefined)
    const disclosure = screen.getByLabelText('Раскрытые персональные данные')
    const exposed = [REVEALED.profile.phone, REVEALED.previousLastNames[0].lastName, REVEALED.privateData.passport.number].every((value) => within(disclosure).getByText((content) => content.includes(value)))
    act(() => vi.advanceTimersByTime(30_000))
    const request = calls[1][1]
    expect({ exposed, hidden: screen.queryByText(REVEALED.profile.phone), method: request.method, credentials: request.credentials, url: calls[1][0], body: JSON.parse(request.body) }).toEqual({ exposed: true, hidden: null, method: 'POST', credentials: 'same-origin', url: `/api/admin/patients/${PATIENT_ID}/reveal-full`, body: { scope: 'full', reason: 'Сверка паспорта перед договором' } })
  })

  it('shows the revealed phone in the protected card header', async () => {
    transport([json(DETAIL), json({ data: REVEALED })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    const heading = await screen.findByRole('heading', { name: PATIENT.name })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    await screen.findByLabelText('Раскрытые персональные данные')
    expect(heading.nextElementSibling.textContent).toBe(REVEALED.profile.phone)
  })

  it('renders private patient data as labelled text instead of JSON', async () => {
    transport([json(DETAIL), json({ data: REVEALED })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    const section = (await screen.findByRole('heading', { name: 'Паспорт, адрес и прочие данные' })).closest('section')
    expect({ readable: PRIVATE_DATA_TEXT.every((value) => section.textContent.includes(value)), issuedAt: screen.queryByText('22.04.2010') !== null, json: /[{}"]/.test(section.textContent) }).toEqual({ readable: true, issuedAt: true, json: false })
  })

  it('renders imported visit details as labelled text instead of JSON', async () => {
    transport([json(DETAIL), json({ data: RAW_REVEALED })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    const visits = await screen.findByRole('tabpanel', { name: 'Исторические визиты' })
    expect({ text: visits.textContent, json: /[{}"]|appointment_begin/.test(visits.textContent) }).toEqual({ text: expect.stringContaining('Специальность врача: МаммологУслуги: УЗИ молочных желёзКабинет: 12Комментарий: Повторный приём'), json: false })
  })

  it('labels confirmed and unordered surname variants without inventing chronology', async () => {
    transport([json(DETAIL), json({ data: REVEALED })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    const disclosure = await screen.findByLabelText('Раскрытые персональные данные')
    expect(disclosure.textContent).toContain('Другие фамилии и картыПрежняя · Подтверждённая прежняя фамилияВариантная · Вариант фамилии с неизвестным порядком')
  })

  it('clears protected state when the browser tab becomes hidden', async () => {
    let state = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state)
    transport([json(DETAIL), json({ data: REVEALED })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    await screen.findByText(CONFIRMED_SURNAME_TEXT)
    state = 'hidden'
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.queryByText(CONFIRMED_SURNAME_TEXT)).toBeNull()
  })

  it('does not restore a pending reveal after the browser tab becomes hidden', async () => {
    let state = 'visible'
    const pending = deferred()
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state)
    transport([json(DETAIL), pending.promise])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    state = 'hidden'
    fireEvent(document, new Event('visibilitychange'))
    await act(async () => { pending.resolve(await json({ data: REVEALED })) })
    expect(screen.queryByText(CONFIRMED_SURNAME_TEXT)).toBeNull()
  })

  it('keeps the newest visit-filter response when an older request finishes last', async () => {
    const pending = deferred()
    const newestVisit = Object.freeze({ ...VISIT, sourceStatus: 'cancelled', linkStatus: 'unmatched' })
    const newestDetail = Object.freeze({ ...DETAIL, history: Object.freeze({ ...DETAIL.history, visits: Object.freeze({ ...DETAIL.history.visits, data: Object.freeze([newestVisit]) }) }) })
    transport([json(DETAIL), pending.promise, json(newestDetail)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.change(screen.getByLabelText('Статус связи визитов'), { target: { value: 'linked' } })
    fireEvent.change(screen.getByLabelText('Статус связи визитов'), { target: { value: 'unmatched' } })
    await screen.findByText('Отменён')
    await act(async () => { pending.resolve(await json(DETAIL)) })
    expect({ newest: screen.queryByText('Отменён')?.textContent, stale: screen.queryByText('Завершён') }).toEqual({ newest: 'Отменён', stale: null })
  })

  it('clears previous history rows and reports a current visit-filter failure', async () => {
    transport([json(DETAIL), json({ error: 'PATIENTS_UNAVAILABLE' }, 503)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Завершён')
    fireEvent.change(screen.getByLabelText('Статус связи визитов'), { target: { value: 'unmatched' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить карточку пациента')
    expect({ stale: screen.queryByText('Завершён'), filter: screen.getByLabelText('Статус связи визитов').value }).toEqual({ stale: null, filter: 'unmatched' })
  })

  it('ignores an older failed visit filter after a newer filter succeeds', async () => {
    const older = deferred()
    const newestVisit = Object.freeze({ ...VISIT, sourceStatus: 'cancelled', linkStatus: 'unmatched' })
    const newestDetail = Object.freeze({ ...DETAIL, history: Object.freeze({ ...DETAIL.history, visits: Object.freeze({ ...DETAIL.history.visits, data: Object.freeze([newestVisit]) }) }) })
    transport([json(DETAIL), older.promise, json(newestDetail)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Завершён')
    fireEvent.change(screen.getByLabelText('Статус связи визитов'), { target: { value: 'linked' } })
    fireEvent.change(screen.getByLabelText('Статус связи визитов'), { target: { value: 'unmatched' } })
    await screen.findByText('Отменён')
    await act(async () => { older.resolve(await json({ error: 'PATIENTS_UNAVAILABLE' }, 503)) })
    expect({ current: screen.queryByText('Отменён')?.textContent, error: screen.queryByRole('alert') }).toEqual({ current: 'Отменён', error: null })
  })

  it('clears protected state on unmount and never updates the removed view', async () => {
    vi.useFakeTimers()
    transport([json(DETAIL), json({ data: REVEALED })])
    const view = render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    await act(async () => undefined)
    view.unmount()
    act(() => vi.advanceTimersByTime(30_000))
    expect(screen.queryByText(CONFIRMED_SURNAME_TEXT)).toBeNull()
  })

  it('requires explicit destruction confirmation and restores focus after cancelling', async () => {
    transport([json(DETAIL)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    const trigger = screen.getByRole('button', { name: 'Уничтожить персональные данные' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Уничтожить персональные данные?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }))
    expect(trigger).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside the detail destruction dialog', async () => {
    transport([json(DETAIL)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Уничтожить персональные данные' }))
    const dialog = screen.getByRole('dialog', { name: 'Уничтожить персональные данные?' })
    const cancel = screen.getByRole('button', { name: 'Отмена' })
    const phrase = screen.getByLabelText('Введите слово УНИЧТОЖИТЬ')
    fireEvent.change(phrase, { target: { value: 'УНИЧТОЖИТЬ' } })
    const destroy = screen.getByRole('button', { name: 'Уничтожить безвозвратно' })
    expect(cancel).toHaveFocus()
    destroy.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(phrase).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(destroy).toHaveFocus()
  })

  it('destroys through the protected mutation and reports the anonymized result', async () => {
    const destroyed = { id: PATIENT_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false }
    const onDestroyed = vi.fn()
    const calls = transport([json(DETAIL), json({ data: destroyed })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={onDestroyed} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Уничтожить персональные данные' }))
    fireEvent.change(screen.getByLabelText('Введите слово УНИЧТОЖИТЬ'), { target: { value: 'УНИЧТОЖИТЬ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Уничтожить безвозвратно' }))
    await waitFor(() => expect(onDestroyed).toHaveBeenCalledWith(destroyed))
    const request = calls[1][1]
    expect({ method: request.method, credentials: request.credentials, body: JSON.parse(request.body) }).toEqual({ method: 'DELETE', credentials: 'same-origin', body: { confirmation: 'УНИЧТОЖИТЬ', patientId: PATIENT_ID } })
  })

  it('keeps the reveal disabled until a reason of at least five characters is written', async () => {
    transport([json(DETAIL)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await screen.findByText('Дата не указана')
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'ок' } })
    expect(screen.getByRole('button', { name: 'Раскрыть полное досье' })).toBeDisabled()
  })

  it('lets the administrator extend the reveal window during the last seconds', async () => {
    vi.useFakeTimers()
    transport([json(DETAIL), json({ data: REVEALED })])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть персональные данные' }))
    fireEvent.change(screen.getByLabelText('Причина раскрытия полного досье'), { target: { value: 'Сверка паспорта' } })
    fireEvent.click(screen.getByRole('button', { name: 'Раскрыть полное досье' }))
    await act(async () => undefined)
    act(() => vi.advanceTimersByTime(25_000))
    fireEvent.click(screen.getByRole('button', { name: 'Продлить' }))
    act(() => vi.advanceTimersByTime(20_000))
    expect(screen.getByLabelText('Раскрытые персональные данные')).toBeVisible()
  })

  it('shows a value-free error when detail loading fails', async () => {
    transport([json({ error: 'PATIENTS_UNAVAILABLE', secret: '79215550129' }, 503)])
    render(<PatientDetails patientId={PATIENT_ID} onClose={() => undefined} onDestroyed={() => undefined} />)
    const alert = await screen.findByRole('alert')
    expect({ message: alert.textContent, leaked: alert.textContent.includes('79215550129') }).toEqual({ message: 'Не удалось загрузить карточку пациента', leaked: false })
  })
})
