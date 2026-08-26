import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = Object.freeze({ width: 393, height: 852 })
const DESKTOP_VIEWPORT = Object.freeze({ width: 1280, height: 900 })
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const PAGE_ISLAND_SELECTOR = 'main astro-island:not([ssr])'
const CAROUSEL_SELECTOR = '[data-mobile-doctor-carousel]'
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

async function isolateNetwork(page) {
  await page.route('**/*', async (requestRoute) => {
    const url = new URL(requestRoute.request().url())
    if (!LOCAL_HOSTS.has(url.hostname)) return requestRoute.abort('blockedbyclient')
    if (url.pathname.startsWith('/api/analytics/')) return requestRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accepted: true } }) })
    return requestRoute.continue()
  })
}

async function visitHydratedRoute(page, route, viewport) {
  await isolateNetwork(page)
  await page.setViewportSize(viewport)
  await page.goto(route)
  await page.locator(PAGE_ISLAND_SELECTOR).waitFor({ state: 'attached', timeout: 10_000 })
}

async function mobileRouteState(page) {
  return {
    carousels: await page.locator(`${CAROUSEL_SELECTOR}:visible`).count(),
    legacyDoctorStrips: await page.locator(`${LEGACY_DOCTOR_STRIP_SELECTOR}:visible`).count(),
  }
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
  const hero = page.locator('main section').filter({ has: page.getByRole('heading', { level: 1 }) }).first()
  const section = page.locator('main section').filter({ has: page.getByRole('heading', { level: 2, name: sectionHeading }) })
  const card = section.locator('.doctor-card:visible')
  return { carousels: await page.locator(`main ${CAROUSEL_SELECTOR}:visible`).count(), semanticCarousels: await page.locator('main [role="region"][aria-roledescription="carousel"]:visible').count(), controls: await page.getByRole('button', { name: /Предыдущий врач|Следующий врач/ }).count(), heroDoctor: await hero.locator('.hero-doctor-card:visible .hero-doctor-name').evaluateAll((elements) => elements[0]?.textContent ?? null), sectionDoctors: await card.count(), sectionDoctor: await card.locator('h3').textContent(), bookingSlug: await card.locator('[data-booking-doctor]').getAttribute('data-booking-doctor'), profileHref: await card.locator(`a[href="${KALININA.profile}"]`).getAttribute('href') }
}

for (const { route, carousels } of MOBILE_ROUTES) {
  test(`shows ${route} with ${carousels} hydrated mobile doctor carousels and no legacy doctor strip`, async ({ page }) => {
    await visitHydratedRoute(page, route, MOBILE_VIEWPORT)
    const state = await mobileRouteState(page)
    expect(state).toEqual({ carousels, legacyDoctorStrips: 0 })
  })
}

test('changes the /mammology hero doctor atomically while keeping the lower carousel independent', async ({ page }) => {
  await visitHydratedRoute(page, '/mammology', MOBILE_VIEWPORT)
  const state = await mammologyInteractionState(page)
  const first = MAMMOLOGY_DOCTORS[0]
  const second = MAMMOLOGY_DOCTORS[1]
  const third = MAMMOLOGY_DOCTORS[2]
  expect(state).toEqual({ initial: { hero: { name: first.name, bookingSlug: first.slug, profileHref: first.profile }, lower: { name: first.name, bookingSlug: first.slug, profileHref: first.profile } }, afterLower: { hero: { name: first.name, bookingSlug: first.slug, profileHref: first.profile }, lower: { name: second.name, bookingSlug: second.slug, profileHref: second.profile } }, afterHero: { hero: { name: third.name, bookingSlug: third.slug, profileHref: third.profile }, lower: { name: second.name, bookingSlug: second.slug, profileHref: second.profile } } })
})

test('keeps the /mammology mobile hero below the header and copy without page overflow', async ({ page }) => {
  await visitHydratedRoute(page, '/mammology', MOBILE_VIEWPORT)
  const layout = await mobileHeroLayout(page)
  expect(layout).toEqual({ scrollY: 0, headerDoesNotOverlap: true, pageFitsViewport: true, copyBeforeCarousel: true, heroLegacyCards: 0, lowerCarousels: 1, lowerLegacyCards: 0 })
})

test('keeps the /mammology desktop hero and doctor grid while hiding mobile carousels', async ({ page }) => {
  await visitHydratedRoute(page, '/mammology', DESKTOP_VIEWPORT)
  const state = await mammologyDesktopState(page)
  expect(state).toEqual({ mobileCarousels: 0, heroCards: 1, doctorCards: 5 })
})

for (const { route, sectionHeading, heroDoctor } of SINGLE_DOCTOR_ROUTES) {
  test(`keeps ${route} as a control-free single-doctor presentation in its original positions`, async ({ page }) => {
    await visitHydratedRoute(page, route, MOBILE_VIEWPORT)
    const state = await singleDoctorState(page, sectionHeading)
    expect(state).toEqual({ carousels: 0, semanticCarousels: 0, controls: 0, heroDoctor, sectionDoctors: 1, sectionDoctor: KALININA.name, bookingSlug: KALININA.slug, profileHref: KALININA.profile })
  })
}
