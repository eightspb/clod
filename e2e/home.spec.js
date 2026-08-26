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

  test('на мобильном направления видны сразу в верхней зоне страницы', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    const quickNav = page.getByRole('navigation', { name: /быстрый выбор направления/i })

    await expect(quickNav).toBeVisible()
    await expect(quickNav.getByRole('link', { name: /^маммология$/i })).toBeVisible()
    await expect(quickNav.getByRole('link', { name: /^гинекология$/i })).toBeVisible()
    await expect(quickNav.getByRole('link', { name: /^эндокринология$/i })).toBeVisible()
    await expect(quickNav.getByRole('link', { name: /^нутрициология$/i })).toBeVisible()
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

    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(5)
  })

  test('на десктопе стрелки находятся по сторонам hero-контента', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    const slide = await page.getByRole('group', { name: /слайд 1 из 3/i }).boundingBox()
    const previous = await page.getByRole('button', { name: /предыдущий слайд/i }).boundingBox()
    const next = await page.getByRole('button', { name: /следующий слайд/i }).boundingBox()
    const positions = {
      previous: previous.x + previous.width <= slide.x,
      next: next.x >= slide.x + slide.width,
    }
    expect(positions).toEqual({ previous: true, next: true })
  })

  test('на десктопе текст начинается от верхнего левого края hero-слайда', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    const slide = page.getByRole('group', { name: /слайд 1 из 3/i })
    const offset = await slide.evaluate((element) => {
      const slideBox = element.getBoundingClientRect()
      const textBox = element.querySelector('.max-w-3xl').getBoundingClientRect()
      return { top: textBox.top - slideBox.top, left: textBox.left - slideBox.left }
    })
    expect(offset).toEqual({ top: 0, left: 0 })
  })

  test('не показывает точки и управление автопрокруткой', async ({ page }) => {
    await page.goto('/')
    const hero = page.getByRole('region', { name: /главный слайдер/i })
    const controls = {
      indicators: await hero.getByRole('group', { name: /навигация по слайдам/i }).count(),
      autoplay: await hero.getByRole('button', { name: /пауза слайдов|возобновить автопрокрутку/i }).count(),
    }
    expect(controls).toEqual({ indicators: 0, autoplay: 0 })
  })

  test('на десктопе hero не меняет высоту после полного цикла', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    const hero = page.getByRole('region', { name: /главный слайдер/i })
    const next = page.getByRole('button', { name: /следующий слайд/i })
    const heights = [await hero.evaluate((element) => element.getBoundingClientRect().height)]
    for (let index = 0; index < 3; index += 1) {
      await next.click()
      await page.waitForTimeout(900)
      heights.push(await hero.evaluate((element) => element.getBoundingClientRect().height))
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
  })
})
