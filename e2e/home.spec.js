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

  test('hero сохраняет одинаковую высоту при смене слайдов', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    const heroSection = page.locator('section').first()
    const nextSlideButton = page.getByRole('button', { name: /следующий слайд/i })

    await expect(heroSection).toBeVisible()

    const heights = []

    for (let index = 0; index < 3; index += 1) {
      heights.push(await heroSection.evaluate((element) => element.getBoundingClientRect().height))

      if (index < 2) {
        await nextSlideButton.click()
        await page.waitForTimeout(900)
      }
    }

    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
  })
})
