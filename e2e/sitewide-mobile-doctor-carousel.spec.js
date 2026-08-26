import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = Object.freeze({ width: 393, height: 852 })
const DESKTOP_VIEWPORT = Object.freeze({ width: 1280, height: 900 })
const CAROUSEL_SELECTOR = '[data-mobile-doctor-carousel]'
const HYDRATED_CAROUSEL_ISLAND_SELECTOR = `main astro-island:has(${CAROUSEL_SELECTOR}):not([ssr])`
const LEGACY_DOCTOR_STRIP_SELECTOR = 'main .overflow-x-auto:has(.doctor-card)'
const HERO_CAROUSEL_LABEL = 'Карусель маммологов в начале страницы'
const LOWER_CAROUSEL_LABEL = 'Карусель маммологов клиники'
const NEXT_DOCTOR_LABEL = 'Следующий врач'
const KALININA = Object.freeze({ slug: 'kalinina', name: 'Калинина Ирина Аркадьевна', profile: '/doctors/kalinina' })
const MAMMOLOGY_DOCTORS = Object.freeze([
  Object.freeze({ slug: 'odintsov', name: 'Одинцов Владислав Александрович', profile: '/doctors/odintsov' }),
  Object.freeze({ slug: 'prikhodko', name: 'Приходько Кирилл Андреевич', profile: '/doctors/prikhodko' }),
  Object.freeze({ slug: 'macuchov', name: 'Мацухов Алим Суфьянович', profile: '/doctors/macuchov' }),
])
const MOBILE_ROUTES = Object.freeze([
  Object.freeze({ route: '/mammology', carousels: 2 }),
  Object.freeze({ route: '/gynecology', carousels: 2 }),
  Object.freeze({ route: '/vab', carousels: 2 }),
  Object.freeze({ route: '/adenomioz', carousels: 2 }),
  Object.freeze({ route: '/endometrioz', carousels: 2 }),
  Object.freeze({ route: '/eroziya-sheyki-matki', carousels: 2 }),
  Object.freeze({ route: '/fibroadenoma', carousels: 2 }),
  Object.freeze({ route: '/kista-molochnoy-zhelezy', carousels: 2 }),
  Object.freeze({ route: '/mastopatiya', carousels: 2 }),
  Object.freeze({ route: '/nutrition', carousels: 1 }),
  Object.freeze({ route: '/second-opinion', carousels: 1 }),
  Object.freeze({ route: '/endocrinology', carousels: 0 }),
  Object.freeze({ route: '/gipotireoz', carousels: 0 }),
  Object.freeze({ route: '/tireoidit-khashimoto', carousels: 0 }),
])
const SINGLE_DOCTOR_ROUTES = Object.freeze([
  Object.freeze({ route: '/endocrinology', sectionHeading: 'Эндокринологи клиники', heroDoctor: KALININA.name }),
  Object.freeze({ route: '/gipotireoz', sectionHeading: 'Наши эндокринологи', heroDoctor: null }),
  Object.freeze({ route: '/tireoidit-khashimoto', sectionHeading: 'Наши эндокринологи', heroDoctor: null }),
])

function configuredOrigin(baseURL) {
  const validType = typeof baseURL === 'string' && baseURL.trim() !== '' || baseURL instanceof URL
  if (!validType) throw new TypeError('Playwright project baseURL must be a non-empty absolute URL')
  const url = new URL(baseURL)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new TypeError('Playwright project baseURL must use HTTP or HTTPS')
  return url.origin
}

async function isolateNetwork(page, origin) {
  await page.route('**/*', async (requestRoute) => {
    const url = new URL(requestRoute.request().url())
    if (url.origin !== origin) return requestRoute.abort('blockedbyclient')
    if (url.pathname.startsWith('/api/analytics/')) return requestRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accepted: true } }) })
    return requestRoute.continue()
  })
}

async function visitRoute(page, route, viewport) {
  await page.setViewportSize(viewport)
  const response = await page.goto(route)
  if (!response?.ok()) throw new Error(`Route ${route} returned status ${response?.status() ?? 'unknown'}`)
  const pathname = new URL(page.url()).pathname
  if (pathname !== route) throw new Error(`Route ${route} resolved to ${pathname}`)
}

async function visitCarouselRoute(page, route, viewport) {
  await visitRoute(page, route, viewport)
  await page.locator(HYDRATED_CAROUSEL_ISLAND_SELECTOR).waitFor({ state: 'attached', timeout: 5_000 })
}

async function mobileRouteState(page, expectsCarousel) {
  const state = {
    carousels: await page.locator(`${CAROUSEL_SELECTOR}:visible`).count(),
    legacyDoctorStrips: await page.locator(`${LEGACY_DOCTOR_STRIP_SELECTOR}:visible`).count(),
  }
  if (!expectsCarousel) return state
  return { ...state, legacyDoctorCards: await page.locator('main .doctor-card:visible').count(), legacyHeroDoctorCards: await page.locator('main .hero-doctor-card:visible').count() }
}

async function carouselDoctorState(carousel) {
  return carousel.evaluate((element) => ({
    name: element.querySelector('.mobile-doctor-name')?.getAttribute('aria-label'),
    bookingSlug: element.querySelector('.mobile-doctor-booking')?.getAttribute('data-booking-doctor'),
    profileHref: element.querySelector('.mobile-doctor-profile')?.getAttribute('href'),
  }))
}

function mammologySections(page) {
  const hero = page.locator('main section').filter({ has: page.getByRole('heading', { level: 1 }) }).first()
  const lower = page.locator('main section').filter({ has: page.getByRole('heading', { level: 2, name: 'Доктора-маммологи клиники', exact: true }) })
  return { hero, lower }
}

function mammologyCarousels(page) {
  const { hero, lower } = mammologySections(page)
  return { hero: hero.getByRole('region', { name: HERO_CAROUSEL_LABEL, exact: true }), lower: lower.getByRole('region', { name: LOWER_CAROUSEL_LABEL, exact: true }) }
}

async function mammologyInteractionState(page) {
  const { hero, lower } = mammologyCarousels(page)
  const initial = { hero: await carouselDoctorState(hero), lower: await carouselDoctorState(lower) }
  await lower.getByRole('button', { name: NEXT_DOCTOR_LABEL }).click()
  await lower.locator(`.mobile-doctor-name[aria-label="${MAMMOLOGY_DOCTORS[1].name}"]`).waitFor()
  const afterLower = { hero: await carouselDoctorState(hero), lower: await carouselDoctorState(lower) }
  await hero.getByRole('button', { name: NEXT_DOCTOR_LABEL }).click()
  await hero.getByRole('button', { name: NEXT_DOCTOR_LABEL }).click()
  await hero.locator(`.mobile-doctor-name[aria-label="${MAMMOLOGY_DOCTORS[2].name}"]`).waitFor()
  return { initial, afterLower, afterHero: { hero: await carouselDoctorState(hero), lower: await carouselDoctorState(lower) } }
}

async function mobileHeroLayout(page) {
  const { hero, lower } = mammologySections(page)
  const { hero: carousel, lower: lowerCarousel } = mammologyCarousels(page)
  await carousel.waitFor()
  const layout = await hero.evaluate((element, label) => {
    const header = document.querySelector('header[role="banner"]')?.getBoundingClientRect()
    const copy = element.querySelector('h1')?.parentElement
    const carousel = Array.from(element.querySelectorAll('[data-mobile-doctor-carousel]')).find((candidate) => candidate.getAttribute('aria-label') === label)
    const heroBox = element.getBoundingClientRect()
    const copyBox = copy?.getBoundingClientRect()
    const carouselBox = carousel?.getBoundingClientRect()
    return { scrollY: window.scrollY, headerDoesNotOverlap: Boolean(header && heroBox.top >= header.bottom), pageFitsViewport: document.documentElement.scrollWidth === window.innerWidth, copyBeforeCarousel: Boolean(copy && carousel && copyBox && carouselBox && (copy.compareDocumentPosition(carousel) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && carouselBox.top >= copyBox.bottom) }
  }, HERO_CAROUSEL_LABEL)
  return { ...layout, heroLegacyCards: await hero.locator('.hero-doctor-card:visible').count(), lowerCarousels: await lowerCarousel.count(), lowerLegacyCards: await lower.locator('.doctor-card:visible').count() }
}

async function mammologyDesktopState(page) {
  const { hero, lower } = mammologySections(page)
  return { mobileCarousels: await page.locator(`${CAROUSEL_SELECTOR}:visible`).count(), heroCards: await hero.locator('.hero-doctor-card:visible').count(), doctorCards: await lower.locator('.doctor-card:visible').count() }
}

async function singleDoctorState(page, sectionHeading) {
  return page.locator('main').evaluate((main, heading) => {
    function visible(element) {
      if (!element) return false
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
    }
    function horizontalOverflow(card) {
      let ancestor = card.parentElement
      while (ancestor && ancestor !== main) {
        const overflow = getComputedStyle(ancestor).overflowX
        if (overflow === 'auto' || overflow === 'scroll') return overflow
        ancestor = ancestor.parentElement
      }
      return null
    }
    const sections = Array.from(main.querySelectorAll('section'))
    const hero = sections.find((section) => section.querySelector('h1'))
    const section = sections.find((candidate) => Array.from(candidate.querySelectorAll('h2')).some((title) => title.textContent.trim() === heading))
    const cards = Array.from(section?.querySelectorAll('.doctor-card') ?? []).filter(visible)
    const semanticCarousels = Array.from(main.querySelectorAll('[aria-roledescription="carousel"]')).filter(visible)
    const carouselHooks = Array.from(main.querySelectorAll('[data-mobile-doctor-carousel]')).filter(visible)
    const controls = Array.from(main.querySelectorAll('button')).filter((button) => visible(button) && (button.getAttribute('aria-label') === 'Предыдущий врач' || button.getAttribute('aria-label') === 'Следующий врач'))
    const heroName = hero?.querySelector('.hero-doctor-card .hero-doctor-name')
    return { carouselHooks: carouselHooks.length, semanticCarousels: semanticCarousels.length, controls: controls.length, heroDoctor: visible(heroName) ? heroName.textContent.trim() : null, sectionDoctors: cards.length, sectionHeadings: cards.map((card) => card.querySelector('h3')?.textContent.trim() ?? null), bookingSlugs: cards.map((card) => card.querySelector('[data-booking-doctor]')?.getAttribute('data-booking-doctor') ?? null), profileHrefs: cards.map((card) => card.querySelector('a[href^="/doctors/"]')?.getAttribute('href') ?? null), horizontalOverflow: cards.map(horizontalOverflow) }
  }, sectionHeading)
}

test.beforeEach(async ({ page }, testInfo) => {
  const origin = configuredOrigin(testInfo.project.use.baseURL)
  await isolateNetwork(page, origin)
})

for (const { route, carousels } of MOBILE_ROUTES) {
  test(`shows ${route} with ${carousels} mobile doctor carousels and no legacy doctor strip`, async ({ page }) => {
    if (carousels > 0) await visitCarouselRoute(page, route, MOBILE_VIEWPORT)
    else await visitRoute(page, route, MOBILE_VIEWPORT)
    const state = await mobileRouteState(page, carousels > 0)
    const expected = carousels > 0 ? { carousels, legacyDoctorStrips: 0, legacyDoctorCards: 0, legacyHeroDoctorCards: 0 } : { carousels, legacyDoctorStrips: 0 }
    expect(state).toEqual(expected)
  })
}

test('changes the /mammology hero doctor atomically while keeping the lower carousel independent', async ({ page }) => {
  await visitCarouselRoute(page, '/mammology', MOBILE_VIEWPORT)
  const state = await mammologyInteractionState(page)
  const first = MAMMOLOGY_DOCTORS[0]
  const second = MAMMOLOGY_DOCTORS[1]
  const third = MAMMOLOGY_DOCTORS[2]
  expect(state).toEqual({ initial: { hero: { name: first.name, bookingSlug: first.slug, profileHref: first.profile }, lower: { name: first.name, bookingSlug: first.slug, profileHref: first.profile } }, afterLower: { hero: { name: first.name, bookingSlug: first.slug, profileHref: first.profile }, lower: { name: second.name, bookingSlug: second.slug, profileHref: second.profile } }, afterHero: { hero: { name: third.name, bookingSlug: third.slug, profileHref: third.profile }, lower: { name: second.name, bookingSlug: second.slug, profileHref: second.profile } } })
})

test('keeps the /mammology mobile hero below the header and copy without page overflow', async ({ page }) => {
  await visitCarouselRoute(page, '/mammology', MOBILE_VIEWPORT)
  const layout = await mobileHeroLayout(page)
  expect(layout).toEqual({ scrollY: 0, headerDoesNotOverlap: true, pageFitsViewport: true, copyBeforeCarousel: true, heroLegacyCards: 0, lowerCarousels: 1, lowerLegacyCards: 0 })
})

test('keeps the /mammology desktop hero and doctor grid while hiding mobile carousels', async ({ page }) => {
  await visitCarouselRoute(page, '/mammology', DESKTOP_VIEWPORT)
  const state = await mammologyDesktopState(page)
  expect(state).toEqual({ mobileCarousels: 0, heroCards: 1, doctorCards: 5 })
})

for (const { route, sectionHeading, heroDoctor } of SINGLE_DOCTOR_ROUTES) {
  test(`keeps ${route} as a control-free single-doctor presentation in its original positions`, async ({ page }) => {
    await visitRoute(page, route, MOBILE_VIEWPORT)
    const state = await singleDoctorState(page, sectionHeading)
    expect(state).toEqual({ carouselHooks: 0, semanticCarousels: 0, controls: 0, heroDoctor, sectionDoctors: 1, sectionHeadings: [KALININA.name], bookingSlugs: [KALININA.slug], profileHrefs: [KALININA.profile], horizontalOverflow: [null] })
  })
}
