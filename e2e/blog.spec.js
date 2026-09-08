import { test, expect } from '@playwright/test'

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
