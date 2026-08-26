import { test, expect } from '@playwright/test'

test.describe('Навигация', () => {
  test('переход на страницу О клинике', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /о клинике/i }).first().click()
    await expect(page).toHaveURL(/.*about/)
  })

  test('переход на страницу Доктора', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /^доктора$/i }).first().click()
    await expect(page).toHaveURL(/.*doctors/)
  })

  test('переход на страницу Доктора из мобильного меню', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.locator('astro-island:has(header[role="banner"]):not([ssr])').waitFor()
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    await page.locator('#mobile-menu').getByRole('link', { name: /^доктора$/i }).click()
    await expect(page).toHaveURL(/.*doctors/)
  })

  test('переход на страницу Контакты', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /контакты/i }).first().click()
    await expect(page).toHaveURL(/.*contacts/)
  })

  test('страница блога загружается', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { level: 1, name: /блог/i })).toBeVisible()
  })
})
