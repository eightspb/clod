import { expect, test } from '@playwright/test'

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const SECOND_PATIENT_ID = 'b780de13-a61f-49fc-a56a-861de5cb145d'
const VISIT_ID = '72000000-0000-4000-8000-000000000002'
const PATIENT = { id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29', firstSeenAt: null, lastSeenAt: null, createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z', piiDestroyedAt: null, externalIdentifierCount: 3, clinicCardCount: 2, contactCount: 2, previousLastNameCount: 1, historicalVisitCount: 7, issueCount: 2, attachmentCount: 0 }
const VISIT = { id: VISIT_ID, sourceName: '544663c3807aab090001bad8_visits.csv', sourceRow: 29, startsAt: null, endsAt: null, sourceStatus: 'completed', linkStatus: 'linked', linkMethod: 'exact_ehr', evidenceLevel: 'exact', issueCount: 1, candidateCount: 0, protectedDetailsAvailable: true }
const DETAIL = { data: PATIENT, history: { visits: { data: [VISIT], page: { number: 1, size: 10, total: 1, pages: 1 } }, issues: { data: [], page: { number: 1, size: 10, total: 0, pages: 0 } }, attachments: [] } }
const REVEALED = { id: PATIENT_ID, profile: { firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '79215550129', birthday: '1988-02-29' }, contacts: [{ kind: 'email', value: 'synthetic@example.test', mask: 's••••••••@example.test', isPrimary: false, sourceName: '544663c3807aab090001bad8PD.csv', firstSeenAt: null, lastSeenAt: null }], previousLastNames: [{ lastName: 'Прежняя-Синтетическая', reason: 'surname_change', sourceName: '544663c3807aab090001bad8PD.csv', observedAt: null }], externalIdentifiers: [{ system: 'clinic_card', value: '64-2', isPrimary: true, sourceName: '544663c3807aab090001bad8PD.csv', sourceRow: 17 }], privateData: { passport: { series: '4012', number: '000149' }, address: { city: 'Синтетический город' }, notes: 'Синтетическая заметка' }, consents: [{ type: 'sms_notifications', status: 'granted', sourceName: 'Vse pacienty.xlsx', observedAt: null }], attachments: [], historicalVisits: [{ id: VISIT_ID, appointmentId: 'appointment-protected-29', doctor: 'Врач Защищённый', details: { services: ['Приём'] } }], revealedAt: '2026-08-27T11:00:00.000Z' }
const AMBIGUOUS = { id: '73000000-0000-4000-8000-000000000003', sourceName: VISIT.sourceName, sourceRow: 41, startsAt: null, sourceStatus: 'unknown', linkStatus: 'ambiguous', linkMethod: 'exact_clinic_card', evidenceLevel: 'strong', candidates: [{ patientId: PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }, { patientId: SECOND_PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }] }

async function authenticate(page, baseURL) {
  const response = await page.request.post('/api/auth/login', { data: { password: process.env.ADMIN_PASSWORD }, headers: { Origin: baseURL } })
  expect(response.status(), await response.text()).toBe(200)
}

test('administrator opens imported history and controls protected disclosure', async ({ baseURL, page }) => {
  await page.route('**/api/admin/patients?**', (route) => route.fulfill({ contentType: 'application/json', json: { data: [PATIENT], page: { number: 1, size: 50, total: 1, pages: 1 } } }))
  await page.route(`**/api/admin/patients/${PATIENT_ID}?**`, (route) => route.fulfill({ contentType: 'application/json', json: DETAIL }))
  await page.route(`**/api/admin/patients/${PATIENT_ID}/reveal-full`, (route) => route.fulfill({ contentType: 'application/json', json: { data: REVEALED } }))
  await page.route('**/api/admin/patient-history/issues?**', (route) => {
    const unmatched = new URL(route.request().url()).searchParams.get('status') === 'unmatched'
    return route.fulfill({ contentType: 'application/json', json: unmatched ? { data: [], page: { number: 1, size: 50, total: 0, pages: 0 } } : { data: [AMBIGUOUS], page: { number: 1, size: 50, total: 1, pages: 1 } } })
  })
  await authenticate(page, baseURL)
  await page.goto(`/admin/patients?patient=${PATIENT_ID}`)
  const detail = page.getByRole('region', { name: `Карточка пациента ${PATIENT.name}` })
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('3 внешние карты')
  await expect(detail.getByRole('tabpanel', { name: 'Исторические визиты' })).toContainText('Дата не указанаЗавершён')
  await expect(page.getByText(REVEALED.previousLastNames[0].lastName)).toHaveCount(0)
  await detail.getByRole('button', { name: 'Раскрыть персональные данные' }).click()
  await detail.getByLabel('Причина раскрытия полного досье').fill('Сверка паспорта перед договором')
  await detail.getByRole('button', { name: 'Раскрыть полное досье' }).click()
  await expect(page.getByText(REVEALED.previousLastNames[0].lastName)).toBeVisible()
  await detail.getByRole('tab', { name: 'Проблемы данных' }).click()
  await expect(page.getByText(REVEALED.previousLastNames[0].lastName)).toHaveCount(0)
  await page.getByRole('button', { name: 'Показать проблемы сопоставления' }).click()
  await expect(page.getByRole('region', { name: 'Проблемы сопоставления визитов' })).toContainText('Точная карта клиники')
  await page.getByLabel('Статус проблемы').selectOption('unmatched')
  await expect(page.getByLabel('Статус проблемы')).toHaveValue('unmatched')
  await expect(page.getByRole('region', { name: 'Проблемы сопоставления визитов' })).toContainText('Проблем этого типа нет')
  const destroyTrigger = detail.getByRole('button', { name: 'Уничтожить персональные данные' })
  await destroyTrigger.click()
  const dialog = page.getByRole('dialog', { name: 'Уничтожить персональные данные?' })
  const cancel = dialog.getByRole('button', { name: 'Отмена' })
  const destroy = dialog.getByRole('button', { name: 'Уничтожить безвозвратно' })
  const phrase = dialog.getByLabel('Введите слово УНИЧТОЖИТЬ')
  await expect(cancel).toBeFocused()
  await expect(destroy).toBeDisabled()
  await phrase.fill('УНИЧТОЖИТЬ')
  await expect(destroy).toBeEnabled()
  await destroy.focus()
  await destroy.press('Tab')
  await expect(phrase).toBeFocused()
  await phrase.press('Shift+Tab')
  await expect(destroy).toBeFocused()
  await destroy.press('Escape')
  await expect(destroyTrigger).toBeFocused()
})
