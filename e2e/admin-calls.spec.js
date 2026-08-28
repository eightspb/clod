import { expect, test } from '@playwright/test'

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const CALL = { entryId: 'entry-e2e', patientId: PATIENT_ID, status: 'missed', callerMask: '+7 •••••••• 29', repeatCaller: false, lineNumber: '78127482210', operatorExtension: '123', startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: null, answeredAt: null, endedAt: '2026-08-26T10:01:00.000Z', waitSeconds: 60, talkSeconds: 0, disconnectReason: null, finalizedAt: '2026-08-26T10:01:00.000Z', createdAt: '2026-08-26T10:02:00.000Z', updatedAt: '2026-08-26T10:02:00.000Z', piiDestroyedAt: null }
const METRICS = { active: 0, incoming: 1, answered: 0, missed: 1, answerRate: 0, averageWaitSeconds: 60, averageTalkSeconds: 0 }
const PATIENT = { id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: CALL.callerMask, firstSeenAt: null, lastSeenAt: null, createdAt: CALL.createdAt, updatedAt: CALL.updatedAt, piiDestroyedAt: null, externalIdentifierCount: 2, clinicCardCount: 1, contactCount: 1, previousLastNameCount: 1, historicalVisitCount: 3, issueCount: 0, attachmentCount: 0 }
const DETAIL = { data: PATIENT, history: { visits: { data: [], page: { number: 1, size: 10, total: 0, pages: 0 } }, issues: { data: [], page: { number: 1, size: 10, total: 0, pages: 0 } }, attachments: [] } }

async function authenticate(page, baseURL) {
  const response = await page.request.post('/api/auth/login', { data: { password: process.env.ADMIN_PASSWORD }, headers: { Origin: baseURL } })
  expect(response.status(), await response.text()).toBe(200)
}

test('administrator monitors a masked call and opens the linked patient journal', async ({ baseURL, page }) => {
  await page.route('**/api/admin/calls?**', (route) => route.fulfill({ contentType: 'application/json', json: { data: [CALL], page: { number: 1, size: 50, total: 1, pages: 1 }, metrics: METRICS } }))
  await page.route(`**/api/admin/calls/${CALL.entryId}/reveal`, (route) => route.fulfill({ contentType: 'application/json', json: { data: { entryId: CALL.entryId, phone: '79215550129', revealedAt: '2026-08-26T10:03:00.000Z' } } }))
  await page.route('**/api/admin/patients?**', (route) => route.fulfill({ contentType: 'application/json', json: { data: [PATIENT], page: { number: 1, size: 50, total: 1, pages: 1 } } }))
  await page.route(`**/api/admin/patients/${PATIENT_ID}?**`, (route) => route.fulfill({ contentType: 'application/json', json: DETAIL }))
  await authenticate(page, baseURL)
  await page.goto('/admin/calls')
  await expect(page.getByRole('heading', { name: 'Журнал звонков' })).toBeVisible()
  await expect(page.getByText(CALL.callerMask)).toBeVisible()
  await expect(page.getByText('79215550129')).toHaveCount(0)
  await page.getByRole('button', { name: `Показать номер ${CALL.callerMask}` }).click()
  await expect(page.getByText('79215550129')).toBeVisible()
  await page.getByRole('table').getByRole('link', { name: '79215550129' }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/patients\\?patient=${PATIENT_ID}$`))
  await expect(page.getByRole('region', { name: `Карточка пациента ${PATIENT.name}` })).toBeVisible()
})
