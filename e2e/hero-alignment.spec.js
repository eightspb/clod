import { test, expect } from '@playwright/test'

const HERO_ROUTES = [
  '/about',
  '/adenomioz',
  '/contacts',
  '/dlya-inogorodnikh',
  '/endocrinology',
  '/endometrioz',
  '/eroziya-sheyki-matki',
  '/fibroadenoma',
  '/gipotireoz',
  '/gynecology',
  '/kista-molochnoy-zhelezy',
  '/mammology',
  '/mastopatiya',
  '/media',
  '/nashi-rezultaty',
  '/nutrition',
  '/prices',
  '/second-opinion',
  '/tireoidit-khashimoto',
  '/vab',
]

test.describe('Выравнивание текста в hero-блоках', () => {
  for (const route of HERO_ROUTES) {
    test(`${route}: текст начинается от верхнего левого края`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto(route)
      const heading = page.locator('h1').first()
      await expect(heading).toBeVisible()
      const offset = await heading.evaluate((element) => {
        const copy = element.parentElement
        const grid = copy.parentElement
        const copyBox = copy.getBoundingClientRect()
        const gridBox = grid.getBoundingClientRect()
        return {
          top: copyBox.top - gridBox.top,
          left: copyBox.left - gridBox.left,
        }
      })
      expect(Math.abs(offset.top)).toBeLessThanOrEqual(1)
      expect(Math.abs(offset.left)).toBeLessThanOrEqual(1)
    })
  }

  test('/: текст слайда закреплён у верхнего края hero независимо от высоты карусели врачей', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()
    const offset = await heading.evaluate((element) => {
      const copy = element.parentElement
      const heroGrid = copy.closest('[aria-live]').parentElement
      return copy.getBoundingClientRect().top - heroGrid.getBoundingClientRect().top
    })
    expect(Math.abs(offset)).toBeLessThanOrEqual(1)
  })

  test('/doctors: текст редакционного hero начинается от верхнего левого края', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/doctors')
    const heading = page.getByRole('heading', { level: 2, name: 'Врачи клиники Одинцова' })
    await expect(heading).toBeVisible()
    const offset = await heading.evaluate((element) => {
      const copy = element.parentElement
      const grid = copy.parentElement
      const copyBox = copy.getBoundingClientRect()
      const gridBox = grid.getBoundingClientRect()
      return {
        top: copyBox.top - gridBox.top,
        left: copyBox.left - gridBox.left,
      }
    })
    expect(Math.abs(offset.top)).toBeLessThanOrEqual(1)
    expect(Math.abs(offset.left)).toBeLessThanOrEqual(1)
  })
})
