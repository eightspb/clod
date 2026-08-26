import { test, expect } from '@playwright/test'
import sharp from 'sharp'

test.describe.configure({ mode: 'serial' })

const MOBILE_VIEWPORT = { width: 375, height: 812 }
const MOBILE_ACCEPTANCE_VIEWPORTS = [{ width: 320, height: 568 }, MOBILE_VIEWPORT, { width: 430, height: 932 }]
const DOCTOR_PROFILE_PATHS = ['/doctors/odintsov', '/doctors/prikhodko', '/doctors/macuchov', '/doctors/skurihin', '/doctors/egorova', '/doctors/vlasenko', '/doctors/zaharova', '/doctors/nevzorova', '/doctors/kalinina']
const CAROUSEL_SELECTOR = '[data-mobile-doctor-carousel]'
const HYDRATED_CAROUSEL_SELECTOR = `astro-island:has(${CAROUSEL_SELECTOR}):not([ssr])`
const THEME_SWITCHER_SELECTOR = '.theme-switcher-root'
const DEPTH_POSITIONS = ['current', 'next', 'next-far']
const PORTRAIT_POSITIONS = ['current', 'previous', 'next']
const RECEDING_POSITIONS = ['previous', 'next', 'previous-far', 'next-far']
const NEAR_POSITIONS = ['previous', 'next']
const FAR_POSITIONS = ['previous-far', 'next-far']

test.use({ viewport: MOBILE_VIEWPORT })

async function gotoHydratedDoctors(page) {
  await page.goto('/doctors')
  await page.locator(HYDRATED_CAROUSEL_SELECTOR).waitFor()
}

async function computedDisplay(page, selector) {
  return page.locator(selector).evaluate((element) => getComputedStyle(element).display)
}

async function selectionOrder(page) {
  return page.evaluate(() => {
    const header = document.querySelector('header[role="banner"]')?.getBoundingClientRect()
    const heading = document.querySelector('[data-doctors-collection-heading]')?.getBoundingClientRect()
    const filters = document.querySelector('[data-doctors-filter-group]')?.getBoundingClientRect()
    const carousel = document.querySelector('[data-mobile-doctor-carousel]')?.getBoundingClientRect()
    const editorial = document.querySelector('[data-doctors-editorial]')?.getBoundingClientRect()
    return {
      scrollY: window.scrollY,
      headerBeforeHeading: Boolean(header && heading && heading.top >= header.bottom),
      headingBeforeFilters: Boolean(heading && filters && filters.top > heading.bottom),
      filtersBeforeCarousel: Boolean(filters && carousel && carousel.top > filters.bottom),
      carouselBeforeEditorial: Boolean(carousel && editorial && editorial.top >= carousel.bottom),
    }
  })
}

async function narrowFilterContainment(page) {
  return page.evaluate(() => {
    const filters = document.querySelector('[data-doctors-filter-group]')
    return {
      stripScrolls: Boolean(filters && filters.scrollWidth > filters.clientWidth),
      pageFitsViewport: document.documentElement.scrollWidth === window.innerWidth,
    }
  })
}

async function collectionPresentation(page) {
  return page.evaluate(() => {
    const color = (selector) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element).color : null
    }
    const display = (selector) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element).display : null
    }
    const filters = document.querySelector('[data-doctors-filter-group]')?.getBoundingClientRect()
    const desktopGrid = document.querySelector('[data-doctors-desktop-grid]')?.getBoundingClientRect()
    const editorial = document.querySelector('[data-doctors-editorial]')?.getBoundingClientRect()
    return {
      desktopStarColor: color('[data-doctors-desktop-grid] .doctor-card-rating svg'),
      desktopGridDisplay: display('[data-doctors-desktop-grid]'),
      mobileCarouselDisplay: display('[data-mobile-doctor-carousel]'),
      filtersBeforeDesktopGrid: Boolean(filters && desktopGrid && desktopGrid.top > filters.bottom),
      desktopGridBeforeEditorial: Boolean(desktopGrid && editorial && editorial.top >= desktopGrid.bottom),
    }
  })
}

async function portraitTransforms(page) {
  return page.locator(CAROUSEL_SELECTOR).evaluate((carousel, positions) => Object.fromEntries(positions.map((position) => [
    position,
    getComputedStyle(carousel.querySelector(`[data-coverflow-position="${position}"] .mobile-doctor-portrait`)).transform,
  ])), PORTRAIT_POSITIONS)
}

async function visiblePortraitTopGap(page) {
  const portrait = page.locator(`${CAROUSEL_SELECTOR} [aria-current="true"] .mobile-doctor-portrait`)
  await portrait.evaluate(async (image) => {
    if (!image.complete) await new Promise((resolve) => image.addEventListener('load', resolve, { once: true }))
    await Promise.all(image.getAnimations().map((animation) => animation.finished))
  })
  const bounds = await page.locator(CAROUSEL_SELECTOR).evaluate((carousel) => ({
    carouselTop: carousel.getBoundingClientRect().top,
    carouselBottom: carousel.getBoundingClientRect().bottom,
  }))
  const screenshot = await page.screenshot()
  const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const startX = Math.floor(info.width * 0.4)
  const endX = Math.ceil(info.width * 0.6)
  for (let y = Math.ceil(bounds.carouselTop); y < Math.floor(bounds.carouselBottom); y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const offset = (y * info.width + x) * info.channels
      if (data[offset] < 190 && data[offset + 1] < 190 && data[offset + 2] < 190) return y - bounds.carouselTop
    }
  }
  throw new Error('Visible portrait pixels were not found')
}

async function cycleDoctors(page, measurement) {
  await page.evaluate(() => document.fonts.ready)
  const doctorCount = await page.locator(`${CAROUSEL_SELECTOR} .mobile-doctor-slide:not([data-visual-clone="true"])`).count()
  const measurements = []
  for (let index = 0; index < doctorCount; index += 1) {
    measurements.push(await page.locator(CAROUSEL_SELECTOR).evaluate(measurement))
    await page.getByRole('button', { name: 'Следующий врач' }).click()
  }
  return measurements
}

async function cycleMobileViewports(page, measurement) {
  const measurements = []
  for (const viewport of MOBILE_ACCEPTANCE_VIEWPORTS) {
    await page.setViewportSize(viewport)
    await gotoHydratedDoctors(page)
    measurements.push(...await cycleDoctors(page, measurement))
  }
  return measurements
}

function profileIsReachable(carousel) {
  const action = carousel.querySelector('.mobile-doctor-profile')
  const profile = action?.getBoundingClientRect()
  const sticky = document.querySelector('[data-sticky-cta]')
  const visibleSticky = sticky && getComputedStyle(sticky).display !== 'none'
  const stickyTop = visibleSticky ? sticky.getBoundingClientRect().top : Number.POSITIVE_INFINITY
  return { profile: action?.getAttribute('href'), reachable: Boolean(profile && profile.width > 0 && profile.height > 0 && profile.left >= -0.5 && profile.right <= window.innerWidth + 0.5 && profile.bottom <= stickyTop) }
}

function numericRatingIsVisible(carousel) {
  const profile = carousel.querySelector('.mobile-doctor-profile')?.getAttribute('href')
  const rating = carousel.querySelector('.mobile-doctor-rating')?.getBoundingClientRect()
  const score = carousel.querySelector('.mobile-doctor-rating > :first-child > span > span:nth-child(2)')?.getBoundingClientRect()
  const actions = carousel.querySelector('.mobile-doctor-info-actions')?.getBoundingClientRect()
  return { profile, visible: Boolean(rating && score && actions && score.width > 0 && score.left >= rating.left - 0.5 && score.right <= rating.right + 0.5 && actions.right <= window.innerWidth) }
}

function doctorNameControlClearance(carousel) {
  const controls = carousel.querySelector('.mobile-doctor-carousel-controls')?.getBoundingClientRect()
  const name = carousel.querySelector('.mobile-doctor-name')?.getBoundingClientRect()
  return Number(((name?.top ?? 0) - (controls?.bottom ?? 0)).toFixed(2))
}

function doctorNamePlinthInset(carousel) {
  const plinth = carousel.querySelector('.mobile-doctor-plinth')?.getBoundingClientRect()
  const name = carousel.querySelector('.mobile-doctor-name')?.getBoundingClientRect()
  return Number(((name?.top ?? 0) - (plinth?.top ?? 0)).toFixed(2))
}

function expectedMobileMeasurements(status) {
  return MOBILE_ACCEPTANCE_VIEWPORTS.flatMap(() => DOCTOR_PROFILE_PATHS.map((profile) => ({ profile, [status]: true })))
}

test('shows selection controls before the mobile carousel and editorial block', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const order = await selectionOrder(page)
  expect(order).toEqual({ scrollY: 0, headerBeforeHeading: true, headingBeforeFilters: true, filtersBeforeCarousel: true, carouselBeforeEditorial: true })
})

test('keeps specialty filters inside the page at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await gotoHydratedDoctors(page)
  const containment = await narrowFilterContainment(page)
  expect(containment).toEqual({ stripScrolls: true, pageFitsViewport: true })
})

test('uses warm gold stars in both doctor collection presentations', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const mobileStarColor = await page.locator(`${CAROUSEL_SELECTOR} .mobile-doctor-rating svg`).first().evaluate((star) => getComputedStyle(star).color)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.reload()
  await page.locator(HYDRATED_CAROUSEL_SELECTOR).waitFor()
  const presentation = await collectionPresentation(page)
  expect({ mobileStarColor, ...presentation }).toEqual({ mobileStarColor: 'rgb(196, 151, 56)', desktopStarColor: 'rgb(196, 151, 56)', desktopGridDisplay: 'grid', mobileCarouselDisplay: 'none', filtersBeforeDesktopGrid: true, desktopGridBeforeEditorial: true })
})

test('keeps every visible doctor head close to the carousel top', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const doctorCount = await page.locator(`${CAROUSEL_SELECTOR} .mobile-doctor-slide:not([data-visual-clone="true"])`).count()
  const gaps = []
  for (let index = 0; index < doctorCount; index += 1) {
    gaps.push(await visiblePortraitTopGap(page))
    await page.getByRole('button', { name: 'Следующий врач' }).click()
  }
  expect(gaps.every((gap) => gap >= 8 && gap <= 80), `portrait gaps: ${gaps.join(', ')}`).toBe(true)
})

test('keeps every doctor profile action reachable on mobile screens', async ({ page }) => {
  const reachability = await cycleMobileViewports(page, profileIsReachable)
  expect(reachability).toEqual(expectedMobileMeasurements('reachable'))
})

test('keeps every doctor name clear of the carousel controls on mobile screens', async ({ page }) => {
  const clearances = await cycleMobileViewports(page, doctorNameControlClearance)
  expect(clearances.every((clearance) => clearance >= 12), `name clearances: ${clearances.join(', ')}`).toBe(true)
})

test('keeps every doctor name below the plinth top treatment on mobile screens', async ({ page }) => {
  const insets = await cycleMobileViewports(page, doctorNamePlinthInset)
  expect(insets.every((inset) => inset >= 32), `name plinth insets: ${insets.join(', ')}`).toBe(true)
})

test('hides the theme switcher only on the mobile doctors page', async ({ page }) => {
  await page.goto('/')
  const mobileHomeDisplay = await computedDisplay(page, THEME_SWITCHER_SELECTOR)
  await gotoHydratedDoctors(page)
  const mobileDoctorsDisplay = await computedDisplay(page, THEME_SWITCHER_SELECTOR)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.reload()
  await page.locator(HYDRATED_CAROUSEL_SELECTOR).waitFor()
  const desktopDoctorsDisplay = await computedDisplay(page, THEME_SWITCHER_SELECTOR)
  expect({ mobileHomeVisible: mobileHomeDisplay !== 'none', mobileDoctorsDisplay, desktopDoctorsVisible: desktopDoctorsDisplay !== 'none' }).toEqual({ mobileHomeVisible: true, mobileDoctorsDisplay: 'none', desktopDoctorsVisible: true })
})

test('renders current and forward slides at refined depth scales', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const scales = await page.locator(CAROUSEL_SELECTOR).evaluate((carousel, positions) => positions.map((position) => {
    const transform = getComputedStyle(carousel.querySelector(`[data-coverflow-position="${position}"]`)).transform
    const { m11, m12, m13 } = new DOMMatrixReadOnly(transform)
    return Number(Math.hypot(m11, m12, m13).toFixed(6))
  }), DEPTH_POSITIONS)
  expect(scales).toEqual([1, 0.757576, 0.573921])
})

test('preserves portrait placement when reduced motion is enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await gotoHydratedDoctors(page)
  const normal = await portraitTransforms(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await portraitTransforms(page)
  expect(reduced).toEqual(normal)
})

test('keeps receding portraits in a flat frontal projection', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const projection = await page.locator(CAROUSEL_SELECTOR).evaluate((carousel, positions) => ({
    perspective: getComputedStyle(carousel.querySelector('.mobile-doctor-carousel-track')).perspective,
    rotations: positions.map((position) => {
      const transform = getComputedStyle(carousel.querySelector(`[data-coverflow-position="${position}"]`)).transform
      const { m13, m31, m34, m43 } = new DOMMatrixReadOnly(transform)
      return [m13, m31, m34, m43].map((value) => Number(value.toFixed(6)))
    }),
  }), RECEDING_POSITIONS)
  expect(projection).toEqual({ perspective: 'none', rotations: RECEDING_POSITIONS.map(() => [0, 0, 0, 0]) })
})

test('does not paint a white contour around transparent portraits', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const doctorCount = await page.locator(`${CAROUSEL_SELECTOR} .mobile-doctor-slide:not([data-visual-clone="true"])`).count()
  const filters = []
  for (let index = 0; index < doctorCount; index += 1) {
    filters.push(await page.locator(`${CAROUSEL_SELECTOR} [aria-current="true"] .mobile-doctor-portrait`)
      .evaluate((portrait) => getComputedStyle(portrait).filter))
    await page.getByRole('button', { name: 'Следующий врач' }).click()
  }
  expect(filters.some((filter) => /rgba?\(255,\s*255,\s*255/.test(filter))).toBe(false)
})

test('renders opaque high-key near doctors and softer color-preserving far doctors', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const layers = await page.locator(CAROUSEL_SELECTOR).evaluate((carousel, positions) => {
    function layerStyle(position) {
      const slide = carousel.querySelector(`[data-coverflow-position="${position}"]`)
      const portrait = slide.querySelector('.mobile-doctor-portrait')
      const slideStyle = getComputedStyle(slide)
      const portraitStyle = getComputedStyle(portrait)
      function filterValue(name, fallback) {
        const match = slideStyle.filter.match(new RegExp(`${name}\\(([-\\d.]+)(%|px)?\\)`))
        if (!match) return fallback
        return match[2] === '%' ? Number(match[1]) / 100 : Number(match[1])
      }
      return {
        slideOpacity: Number(slideStyle.opacity),
        portraitOpacity: Number(portraitStyle.opacity),
        saturation: filterValue('saturate', 1),
        brightness: filterValue('brightness', 1),
        contrast: filterValue('contrast', 1),
        blur: filterValue('blur', 0),
      }
    }
    return {
      near: positions.near.map(layerStyle),
      far: positions.far.map(layerStyle),
    }
  }, { near: NEAR_POSITIONS, far: FAR_POSITIONS })
  expect(layers).toEqual({
    near: NEAR_POSITIONS.map(() => ({ slideOpacity: 1, portraitOpacity: 1, saturation: 1, brightness: 1.22, contrast: 0.78, blur: 0.55 })),
    far: FAR_POSITIONS.map(() => ({ slideOpacity: 0.72, portraitOpacity: 1, saturation: 1, brightness: 1.32, contrast: 0.7, blur: 1.15 })),
  })
})

test('renders every active doctor name on exactly two visual lines', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const lineCounts = await cycleDoctors(page, (carousel) => {
    const name = carousel.querySelector('.mobile-doctor-name')
    const tops = Array.from(name.querySelectorAll('.mobile-doctor-name-line'), (line) => {
      const range = document.createRange()
      range.selectNodeContents(line)
      return Array.from(range.getClientRects(), (rect) => Math.round(rect.top * 10) / 10)
    }).flat()
    return new Set(tops).size
  })
  expect(lineCounts).toEqual(Array(9).fill(2))
})

test('keeps the information plinth geometry fixed for every doctor', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const geometries = await cycleDoctors(page, (carousel) => {
    const plinth = carousel.querySelector('.mobile-doctor-plinth').getBoundingClientRect()
    const selectors = ['.mobile-doctor-name', '.mobile-doctor-specialty', '.mobile-doctor-info-actions', '.mobile-doctor-booking', '.mobile-doctor-profile']
    return selectors.flatMap((selector) => {
      const rect = carousel.querySelector(selector).getBoundingClientRect()
      return [rect.top - plinth.top, rect.left - plinth.left, rect.width, rect.height].map((value) => Number(value.toFixed(2)))
    })
  })
  expect(geometries).toEqual(Array(9).fill(geometries[0]))
})

test('keeps the numeric rating visible beside both actions on narrow screens', async ({ page }) => {
  const visibility = await cycleMobileViewports(page, numericRatingIsVisible)
  expect(visibility).toEqual(expectedMobileMeasurements('visible'))
})

test('places the current slide 44.8 pixels below the carousel top', async ({ page }) => {
  await gotoHydratedDoctors(page)
  const currentSlide = page.locator(`${CAROUSEL_SELECTOR} [data-coverflow-position="current"]`)
  const top = await currentSlide.evaluate((slide) => Number.parseFloat(getComputedStyle(slide).top))
  expect(top).toBeCloseTo(44.8, 1)
})
