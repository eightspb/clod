import { test, expect } from '@playwright/test'

async function openScrolledArticle(page) {
  await page.goto('/blog/testirovaniye-gormonov-menopauza')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  await page.waitForFunction(() => {
    const header = document.querySelector('header[role="banner"]')
    return header.classList.contains('py-1') && !header.getAnimations().length
  })
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
}

test('scrolls the desktop sidebar without moving the article', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await openScrolledArticle(page)
  const sidebar = page.locator('.blog-article-sidebar')
  const articleScroll = await page.evaluate(() => window.scrollY)
  const bounds = await sidebar.boundingBox()
  await page.mouse.move(bounds.x + bounds.width / 2, 400)
  await page.mouse.wheel(0, 360)
  await expect.poll(async () => ({ sidebarMoved: await sidebar.evaluate((node) => node.scrollTop > 0), articleScroll: await page.evaluate(() => window.scrollY) })).toEqual({ sidebarMoved: true, articleScroll })
})

for (const viewport of [{ width: 1440, height: 800 }, { width: 1024, height: 600 }]) {
  test(`keeps the sidebar between the header and viewport bottom at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openScrolledArticle(page)
    const fits = await page.locator('.blog-article-sidebar').evaluate((node) => {
      const bounds = node.getBoundingClientRect()
      return bounds.top >= document.querySelector('header[role="banner"]').getBoundingClientRect().bottom && bounds.bottom <= window.innerHeight
    })
    expect(fits).toBe(true)
  })
}

test('reaches the last sidebar link with the keyboard without moving the article', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await openScrolledArticle(page)
  const sidebar = page.getByRole('complementary', { name: 'Информация о статье' })
  await sidebar.focus()
  await page.keyboard.press('End')
  await expect.poll(async () => sidebar.evaluate((node) => node.scrollTop > 0 && Math.abs(node.scrollHeight - node.clientHeight - node.scrollTop) < 2 && window.scrollY === 900)).toBe(true)
})

test('keeps the sidebar hidden on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog/testirovaniye-gormonov-menopauza')
  await expect(page.locator('.blog-article-sidebar')).toBeHidden()
})

test.describe('Блог', () => {
  test('ссылки в боковой колонке ведут на существующие статьи', async ({ page }) => {
    await page.goto('/blog/kak-podgotovitsya-k-vab')
    const links = await page.locator('.blog-article-sidebar a[href^="/blog/"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))
    expect(links.length > 0 && links.every((href) => !href.includes('undefined'))).toBe(true)
  })

  test('содержание ведёт к реальным разделам статьи', async ({ page }) => {
    await page.goto('/blog/vab-ili-operatsiya')
    const valid = await page.locator('nav[aria-label="Содержание статьи"] a').evaluateAll((nodes) => nodes.length > 1 && nodes.every((node) => document.getElementById(decodeURIComponent(node.hash.slice(1)))))
    expect(valid).toBe(true)
  })

  test('статья связывает автора и издателя с их профилями', async ({ page }) => {
    await page.goto('/blog/kak-podgotovitsya-k-vab')
    const article = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent)).find((node) => node['@type'] === 'BlogPosting'))
    expect({ author: article?.author?.['@id'], publisher: article?.publisher?.['@id'], logo: article?.publisher?.logo?.url }).toEqual({ author: 'https://odintsovclinic.ru/doctors/odintsov#person', publisher: 'https://odintsovclinic.ru/#clinic', logo: 'https://odintsovclinic.ru/images/logo.png' })
  })

  test('detail route рендерит существующий пост без редиректа и с корректным canonical', async ({ page }) => {
    await page.goto('/blog/eroziya-sheyki-matki')

    await expect(page).toHaveURL(/\/blog\/eroziya-sheyki-matki\/?$/)
    await expect(page.locator('article h1').first()).toContainText('Эрозия шейки матки')

    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonicalHref).toBe('https://odintsovclinic.ru/blog/eroziya-sheyki-matki')
  })
})
