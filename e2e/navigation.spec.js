import { test, expect } from '@playwright/test'

test.describe('Навигация', () => {
  test('переход на страницу О клинике', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /о клинике/i }).first().click()
    await expect(page).toHaveURL(/.*about/)
  })

  test('переход на страницу Доктора', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /доктора/i }).first().click()
    await expect(page).toHaveURL(/.*doctors/)
  })

  test('переход на страницу Контакты', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /контакты/i }).first().click()
    await expect(page).toHaveURL(/.*contacts/)
  })

  test('страница блога загружается', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { level: 1, name: /блог клиники/i })).toBeVisible()
  })
})
