import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75 })

function portraitRequests(page) {
  const requests = new Map()
  page.on('request', (request) => {
    const match = new URL(request.url()).pathname.match(/\/images\/doctors\/([a-z]+)-mobile(?:-\d+)?\.webp$/)
    if (!match) return
    const resources = requests.get(match[1]) || new Set()
    resources.add(request.url())
    requests.set(match[1], resources)
  })
  return requests
}

async function cyclePortraits(carousel) {
  for (let index = 0; index < 9; index += 1) {
    await expect.poll(() => carousel.locator('picture img').evaluateAll((images) => images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 1))).toBe(true)
    await carousel.getByRole('button', { name: 'Следующий врач', exact: true }).click()
    await expect(carousel.locator('.mobile-doctor-carousel-count')).toHaveText(`${(index + 1) % 9 + 1} / 9`)
  }
}

test('downloads one responsive portrait per doctor through a full carousel cycle', async ({ page }) => {
  const requests = portraitRequests(page)
  await page.goto('/')
  await cyclePortraits(page.getByRole('region', { name: 'Карусель врачей в начале страницы', exact: true }))
  expect({ doctors: requests.size, duplicates: [...requests].filter(([, urls]) => urls.size > 1).map(([doctor]) => doctor) }).toEqual({ doctors: 9, duplicates: [] })
})
