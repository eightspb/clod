import { test, expect } from '@playwright/test'

const VIEWPORTS = [{ width: 1440, height: 800 }, { width: 1280, height: 800 }, { width: 1024, height: 800 }, { width: 390, height: 844 }]
const PUBLIC_ROUTES = ['/', '/about', '/adenomioz', '/dlya-inogorodnikh', '/doctors', '/endocrinology', '/endometrioz', '/eroziya-sheyki-matki', '/fibroadenoma', '/gipotireoz', '/gynecology', '/kista-molochnoy-zhelezy', '/mammology', '/mastopatiya', '/media', '/nashi-rezultaty', '/nutrition', '/prices', '/second-opinion', '/tireoidit-khashimoto', '/vab']

/** Text that is wider than its own block or cut by an overflow-hidden ancestor */
async function clippedText(page) {
  return page.evaluate(() => {
    const clippingAncestor = (node) => {
      for (let el = node.parentElement; el; el = el.parentElement) {
        const overflow = getComputedStyle(el).overflowX
        if (overflow === 'hidden' || overflow === 'clip') return el
      }
      return undefined
    }
    const walker = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT)
    const problems = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.trim()
      const el = node.parentElement
      if (!text || !el || el.closest('header, footer, [role="dialog"], script, style, .sr-only')) continue
      if (el.getClientRects().length === 0 || getComputedStyle(el).textOverflow === 'ellipsis') continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = Array.from(range.getClientRects())
      const box = el.getBoundingClientRect()
      const clipper = clippingAncestor(el)
      const limit = clipper ? Math.min(box.right, clipper.getBoundingClientRect().right) : box.right
      const spill = Math.max(0, ...rects.map((rect) => rect.right - limit))
      if (spill > 1) problems.push({ text: text.slice(0, 40), spill: Math.round(spill), by: clipper ? 'clip' : 'box' })
    }
    return problems
  })
}

for (const viewport of VIEWPORTS) {
  test(`renders every text without horizontal clipping at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(240000)
    await page.setViewportSize(viewport)
    const results = {}
    for (const path of PUBLIC_ROUTES) {
      await page.goto(path)
      await page.locator('h1').first().waitFor({ state: 'attached' })
      await page.evaluate(() => document.fonts.ready)
      const problems = await clippedText(page)
      if (problems.length) results[path] = problems
    }
    expect(results, JSON.stringify(results, null, 1)).toEqual({})
  })
}
