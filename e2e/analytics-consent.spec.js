import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

function analyticsRequests(page) {
  const urls = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/analytics/')) urls.push(request.url())
  })
  return urls
}

test('does not contact analytics before the visitor decides', async ({ page }) => {
  const urls = analyticsRequests(page)
  await page.route('**/api/analytics/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{"accepted":true}}' }))
  await page.goto('/about')
  await expect(page.getByRole('region', { name: 'Согласие на аналитику' })).toBeVisible()
  await page.waitForTimeout(1500)
  expect(urls).toEqual([])
})

test('starts the tracker after consent and stops it after withdrawal on the privacy page', async ({ page }) => {
  const urls = analyticsRequests(page)
  await page.route('**/api/analytics/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{"accepted":true}}' }))
  await page.goto('/about')
  await page.getByRole('button', { name: 'Разрешить' }).click()
  await expect.poll(() => urls.length).toBeGreaterThan(0)
  await page.goto('/privacy-policy')
  await page.getByRole('button', { name: 'Отозвать согласие на аналитику' }).click()
  const state = await page.evaluate(() => ({ consent: localStorage.getItem('clod-analytics-consent'), visitor: localStorage.getItem('_vid') }))
  expect(state).toEqual({ consent: 'denied', visitor: null })
})

test('keeps the banner hidden after a refusal', async ({ page }) => {
  await page.goto('/about')
  await page.getByRole('button', { name: 'Отклонить' }).click()
  await page.goto('/contacts')
  await expect(page.getByRole('region', { name: 'Согласие на аналитику' })).toBeHidden()
})
