import { test, expect } from '@playwright/test'

const LEGACY_PAGES = [
  ['/exams/programma-pitaniya', '/nutrition'],
  ['/exam/pervichny-priem-endocrinolog', '/endocrinology'],
  ['/esm', '/blog/eroziya-sheyki-matki'],
  ['/ozonecyst', '/kista-molochnoy-zhelezy'],
  ['/patients', '/blog'],
  ['/news/170328', '/contacts'],
  ['/cyst', '/blog/mylnaya-opera-o-kistoznoy-mastopatii'],
]

for (const [legacy, destination] of LEGACY_PAGES) {
  test(`старый адрес ${legacy} постоянно ведёт на соответствующую страницу`, async ({ request }) => {
    const response = await request.get(legacy, { maxRedirects: 0 })
    expect({ status: response.status(), location: response.headers().location }).toEqual({ status: 301, location: destination })
    const target = await request.get(destination, { maxRedirects: 0 })
    expect(target.status()).toBe(200)
  })
}
