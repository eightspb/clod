import { test, expect } from '@playwright/test'

test.describe('Блог', () => {
  test('detail route рендерит существующий пост без редиректа и с корректным canonical', async ({ page }) => {
    await page.goto('/blog/eroziya-sheyki-matki')

    await expect(page).toHaveURL(/\/blog\/eroziya-sheyki-matki\/?$/)
    await expect(page.locator('article h1').first()).toContainText('Эрозия шейки матки')

    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonicalHref).toBe('https://odintsovclinic.ru/blog/eroziya-sheyki-matki')
  })
})
