import { test, expect } from '@playwright/test'

test.describe('Главная страница', () => {
  test('загружается и отображает заголовок', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('содержит ссылки на основные разделы', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /доктора/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /контакты/i }).first()).toBeVisible()
  })

  test('hero-секция с CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /записаться/i }).first()).toBeVisible()
  })
})
