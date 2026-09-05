import { test, expect } from '@playwright/test'

const DESKTOP_VIEWPORTS = [{ width: 1440, height: 800 }, { width: 1280, height: 800 }]
const DOCTOR_PROFILE_PATHS = ['/doctors/odintsov', '/doctors/prikhodko', '/doctors/macuchov', '/doctors/skurihin', '/doctors/egorova', '/doctors/vlasenko', '/doctors/zaharova', '/doctors/nevzorova', '/doctors/kalinina']

async function heroCardFit(page) {
  return page.locator('h1').first().evaluate((heading) => {
    const card = heading.closest('.clay-card-lg')
    const box = card.getBoundingClientRect()
    const portrait = card.querySelector('img')
    const portraitBox = portrait.getBoundingClientRect()
    return { scrollY: window.scrollY, cardTop: Math.round(box.top), cardBottom: Math.round(box.bottom), viewport: window.innerHeight, portraitHeight: Math.round(portraitBox.height), fits: box.bottom <= window.innerHeight }
  })
}

for (const viewport of DESKTOP_VIEWPORTS) {
  test(`keeps every doctor hero card fully inside a ${viewport.width}x${viewport.height} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const results = {}
    for (const path of DOCTOR_PROFILE_PATHS) {
      await page.goto(path)
      await page.locator('h1').first().waitFor()
      results[path] = await heroCardFit(page)
    }
    const overflowing = Object.fromEntries(Object.entries(results).filter(([, fit]) => !fit.fits || fit.scrollY !== 0))
    expect(overflowing, JSON.stringify(results)).toEqual({})
  })
}
