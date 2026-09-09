import { expect, test } from '@playwright/test'

const STAFF_PASSWORD = 'пароль-сотрудника-Ω-2026'

async function hydrated(page, component) {
  await page.waitForSelector(`astro-island[component-export="${component}"]:not([ssr])`)
}

async function login(page, baseURL, credentials) {
  const response = await page.request.post('/api/auth/login', { data: credentials, headers: { Origin: baseURL } })
  expect(response.status(), await response.text()).toBe(200)
}

test('admin creates a staff user who cannot reach user management or end all sessions', async ({ baseURL, browser, page }) => {
  const login_ = `e2e-${Date.now().toString(36)}`
  await login(page, baseURL, { login: 'admin', password: process.env.ADMIN_PASSWORD })
  await page.goto('/admin/users')
  await hydrated(page, 'AdminUsers')
  await page.getByLabel('Имя пользователя').fill(login_)
  await page.getByLabel('Отображаемое имя').fill('Сотрудник E2E')
  await page.getByRole('textbox', { name: 'Пароль' }).fill(STAFF_PASSWORD)
  await page.getByRole('button', { name: 'Добавить сотрудника' }).click()
  await expect(page.getByRole('status')).toHaveText(`Сотрудник ${login_} добавлен`)
  const staffContext = await browser.newContext({ baseURL })
  const staff = await staffContext.newPage()
  await login(staff, baseURL, { login: login_, password: STAFF_PASSWORD })
  await staff.goto('/admin')
  await expect(staff.locator('.page-header')).toContainText('Сотрудник E2E · Сотрудник')
  const nav = { users: await staff.locator('a[href="/admin/users"]').count(), posters: await staff.locator('a[href="/admin/blog-images"]').count(), logoutAll: await staff.locator('#logout-all-btn').count() }
  await staff.goto('/admin/users')
  const redirected = staff.url()
  const logoutAll = await staff.request.post('/api/auth/logout-all', { headers: { Origin: baseURL } })
  expect({ nav, redirected: new URL(redirected).pathname, logoutAll: logoutAll.status() }).toEqual({ nav: { users: 0, posters: 0, logoutAll: 0 }, redirected: '/admin', logoutAll: 403 })
  await staffContext.close()
})

test('blocking a staff user ends their session immediately', async ({ baseURL, browser, page }) => {
  const login_ = `e2e-block-${Date.now().toString(36)}`
  await login(page, baseURL, { login: 'admin', password: process.env.ADMIN_PASSWORD })
  const created = await page.request.post('/api/admin/users', { data: { login: login_, displayName: 'Блокируемый', password: STAFF_PASSWORD }, headers: { Origin: baseURL } })
  const { data } = await created.json()
  const staffContext = await browser.newContext({ baseURL })
  const staff = await staffContext.newPage()
  await login(staff, baseURL, { login: login_, password: STAFF_PASSWORD })
  await page.goto('/admin/users')
  await hydrated(page, 'AdminUsers')
  await page.getByRole('button', { name: `Заблокировать ${login_}` }).click()
  await expect(page.getByRole('status')).toContainText('заблокирован')
  const probe = await staff.request.get('/api/admin/stats')
  expect({ id: typeof data.id, status: probe.status() }).toEqual({ id: 'string', status: 401 })
  await staffContext.close()
})

test('login form signs in with user name and password', async ({ page }) => {
  await page.goto('/admin/login')
  await hydrated(page, 'LoginForm')
  await page.getByLabel('Имя пользователя').fill('admin')
  await page.getByLabel('Пароль').fill(process.env.ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/admin$/)
})
