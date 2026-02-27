import { test, expect } from '@playwright/test'

test.describe('Admin access security', () => {
  test('redirects unauthenticated user to login on admin page', async ({ page }) => {
    await page.goto('/admin')
    // Expect redirection to login page for UI access
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('admin API endpoints require auth (401)', async ({ page }) => {
    // Try to access an admin API endpoint without authentication
    // Directly call the admin API endpoint relative to the test server
    const resp = await page.request.get('/api/admin/stats')
    // Expect 401/403 depending on implementation
    expect([401, 403]).toContain(resp.status())
  })
})
