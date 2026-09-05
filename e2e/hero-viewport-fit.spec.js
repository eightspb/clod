import { test, expect } from '@playwright/test'

const DESKTOP_VIEWPORTS = [{ width: 1440, height: 800 }, { width: 1280, height: 800 }]
/** /doctors and /tax-form open with a collection and a form instead of a hero, so their first section is legitimately taller than a screen */
const HERO_ROUTES = ['/', '/about', '/adenomioz', '/blog', '/blog/vab-ili-operatsiya', '/contacts', '/dlya-inogorodnikh', '/endocrinology', '/endometrioz', '/eroziya-sheyki-matki', '/fibroadenoma', '/gipotireoz', '/gynecology', '/kista-molochnoy-zhelezy', '/licenses', '/mammology', '/mastopatiya', '/media', '/nashi-rezultaty', '/nutrition', '/prices', '/prices/full', '/privacy-policy', '/second-opinion', '/tireoidit-khashimoto', '/vab']

async function heroFit(page) {
  return page.locator('h1').first().evaluate((heading) => {
    const hero = heading.closest('section') || heading.parentElement
    const box = hero.getBoundingClientRect()
    return { scrollY: window.scrollY, top: Math.round(box.top), bottom: Math.round(box.bottom), viewport: window.innerHeight, fits: box.bottom <= window.innerHeight }
  })
}

for (const viewport of DESKTOP_VIEWPORTS) {
  test(`keeps every hero section fully inside a ${viewport.width}x${viewport.height} viewport`, async ({ page }) => {
    test.setTimeout(180000)
    await page.setViewportSize(viewport)
    const results = {}
    for (const path of HERO_ROUTES) {
      await page.goto(path)
      await page.locator('h1').first().waitFor()
      results[path] = await heroFit(page)
    }
    const overflowing = Object.fromEntries(Object.entries(results).filter(([, fit]) => !fit.fits || fit.scrollY !== 0))
    expect(overflowing, JSON.stringify(results)).toEqual({})
  })
}
