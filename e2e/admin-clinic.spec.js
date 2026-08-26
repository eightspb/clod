import { expect, test } from '@playwright/test'

const PATIENT = {
  id: 'patient-e2e',
  name: 'Анна Петрова',
  phoneMask: '+7 (***) ***-12-34',
  firstSeenAt: '2026-08-26T07:00:00.000Z',
  lastSeenAt: '2026-08-26T08:00:00.000Z',
  piiDestroyedAt: null,
}
const APPOINTMENT = {
  id: 'appointment-e2e',
  patient: { id: PATIENT.id, name: PATIENT.name, phoneMask: PATIENT.phoneMask },
  doctorName: 'Иван Иванов',
  specialityName: 'Терапевт',
  serviceName: 'Первичный приём',
  startsAt: '2026-08-27T07:20:00.000Z',
  source: 'website',
  status: 'confirmed',
  priceKopecks: 350000,
}

async function authenticate(page, baseURL) {
  const response = await page.request.post('/api/auth/login', {
    data: { password: process.env.ADMIN_PASSWORD },
    headers: { Origin: baseURL },
  })
  expect(response.status(), await response.text()).toBe(200)
}

test('authenticated administrator navigates masked clinic journals', async ({ baseURL, page }) => {
  await page.route('**/api/admin/patients?**', (route) => route.fulfill({
    contentType: 'application/json',
    json: { data: [PATIENT], page: { number: 1, size: 50, total: 1, pages: 1 } },
  }))
  await page.route('**/api/admin/appointments?**', (route) => route.fulfill({
    contentType: 'application/json',
    json: { data: [APPOINTMENT], page: { number: 1, size: 50, total: 1, pages: 1 } },
  }))
  await authenticate(page, baseURL)
  await page.goto('/admin/patients')
  await expect(page.getByRole('heading', { name: 'Пациенты клиники' })).toBeVisible()
  await expect(page.getByText(PATIENT.phoneMask)).toBeVisible()
  await expect(page.getByText('+7 921 555-12-34')).toHaveCount(0)
  await page.getByRole('link', { name: 'Записи' }).click()
  await expect(page).toHaveURL(/\/admin\/appointments$/)
  await expect(page.getByRole('heading', { name: 'Записи на приём' })).toBeVisible()
  await expect(page.getByRole('table').getByText('С сайта')).toBeVisible()
  await expect(page.getByRole('table').getByText('Подтверждена')).toBeVisible()
})
