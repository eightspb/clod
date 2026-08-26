import { test, expect } from '@playwright/test'

const LAYOUT_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 320, height: 568 }),
  Object.freeze({ width: 640, height: 450 }),
])
const SCALE_REGRESSION_VIEWPORT = Object.freeze({ width: 320, height: 568 })
const SCALE_REGRESSION_DOCTOR = Object.freeze({ slug: 'egorova', name: 'Егорова Анастасия Александровна', location: 'просп. Богатырский, д. 22, корп. 1' })
const FONT_SIZE_STEPS = Object.freeze([65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135])
const EXTREME_FONT_SIZES = Object.freeze([65, 100, 135])
const CONFIRMED_CLAIM_ID = '872bb8e7-fdc5-4886-8c54-2be1fe31d7fb'
const SCALE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 320, height: 568 }),
  Object.freeze({ width: 375, height: 667 }),
  Object.freeze({ width: 640, height: 450 }),
  Object.freeze({ width: 768, height: 600 }),
  Object.freeze({ width: 1024, height: 700 }),
  Object.freeze({ width: 1280, height: 720 }),
  Object.freeze({ width: 1470, height: 956 }),
])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function nextDay(value) {
  const date = new Date(`${value}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

async function isolateBookingNetwork(page, doctor = { slug: 'odintsov', name: 'Одинцов Владислав Александрович', location: 'просп. Богатырский, д. 22, корп. 1' }) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (!LOCAL_HOSTS.has(url.hostname)) {
      await route.abort('blockedbyclient')
      return
    }
    if (url.pathname.startsWith('/api/analytics/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accepted: true } }) })
      return
    }
    if (url.pathname === '/api/appointments/slots') {
      const date = nextDay(url.searchParams.get('from'))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { available: true, reason: 'AVAILABLE', doctor: { ...doctor, timeZone: 'Europe/Moscow' }, appointmentTypes: [{ key: 'mammologist', label: 'Маммолог', price: 4_900, minAge: 18, maxAge: 65 }], dates: [{ date, count: 1, slots: [{ startsAt: `${date}T07:20:00.000Z`, endsAt: `${date}T08:00:00.000Z`, time: '10:20', period: 'morning' }] }] } }) })
      return
    }
    if (url.pathname === '/api/appointments/book') {
      const body = route.request().postDataJSON()
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { status: 'confirmed', claimId: CONFIRMED_CLAIM_ID, doctor: { ...doctor, timeZone: 'Europe/Moscow' }, appointmentType: { key: body.appointmentType, label: 'Маммолог' }, startsAt: body.dtStart, endsAt: body.dtEnd, price: 4_900 } }) })
      return
    }
    await route.continue()
  })
}

async function openScheduleStep(page, slug = 'odintsov') {
  await page.goto(`/doctors/${slug}`)
  await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; pointer-events: none !important; }' })
  await page.locator('astro-dev-toolbar').evaluateAll((elements) => elements.forEach((element) => element.remove()))
  await page.locator('astro-island[component-export="BookingFlow"]:not([ssr])').waitFor({ state: 'attached' })
  await page.locator(`main [data-booking-doctor="${slug}"]`).first().click()
  const dialog = page.getByRole('dialog', { name: 'Онлайн-запись' })
  await dialog.getByRole('heading', { name: 'Выберите дату и время' }).waitFor()
  return dialog
}

async function scaleFailures(page, dialog) {
  const failures = []
  for (const viewport of SCALE_VIEWPORTS) {
    await page.setViewportSize(viewport)
    const states = await dialog.evaluate((element, sizes) => sizes.map((size) => {
        document.documentElement.style.fontSize = `${size}%`
        const boundary = element.getBoundingClientRect()
        const scroll = element.querySelector('.booking-dialog-scroll')
        const actions = element.querySelector('.booking-dialog-actions')
        const primary = actions.querySelector('.booking-primary-action')
        const actionBox = primary.getBoundingClientRect()
        const configuredScrollers = [element, ...element.querySelectorAll('*')].filter((node) => ['auto', 'scroll'].includes(getComputedStyle(node).overflowY)).map((node) => [...node.classList].find((name) => name.startsWith('booking-')) ?? node.tagName.toLowerCase())
        const text = [...element.querySelectorAll('.booking-summary-name,.booking-summary-type,.booking-summary-price,.booking-summary-location,.booking-dialog-content h3,.booking-dialog-actions button,.booking-dialog-actions a')].filter((node) => getComputedStyle(node).display !== 'none')
        return { fontSize: size, dialogInside: boundary.left >= -1 && boundary.top >= -1 && boundary.right <= innerWidth + 1 && boundary.bottom <= innerHeight + 1, scrollHeight: scroll.clientHeight, actionInside: actionBox.left >= boundary.left - 1 && actionBox.top >= boundary.top - 1 && actionBox.right <= boundary.right + 1 && actionBox.bottom <= boundary.bottom + 1, actionTextFit: primary.scrollWidth <= primary.clientWidth + 1 && primary.scrollHeight <= primary.clientHeight + 1, horizontalFit: element.scrollWidth <= element.clientWidth + 1, configuredScrollers, clippedText: text.filter((node) => ['hidden', 'clip'].includes(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 1 || ['hidden', 'clip'].includes(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1).map((node) => node.className) }
      }), FONT_SIZE_STEPS)
    for (const state of states) {
      if (!state.dialogInside || state.scrollHeight <= 0 || !state.actionInside || !state.actionTextFit || !state.horizontalFit || state.configuredScrollers.join(',') !== 'booking-dialog-scroll' || state.clippedText.length > 0) failures.push({ viewport: `${viewport.width}x${viewport.height}`, ...state })
    }
  }
  return failures
}

async function stepScaleFailures(page, dialog, step) {
  const failures = []
  for (const viewport of [SCALE_VIEWPORTS[0], SCALE_VIEWPORTS.at(-1)]) {
    await page.setViewportSize(viewport)
    const states = await dialog.evaluate((element, sizes) => sizes.map((size) => {
      document.documentElement.style.fontSize = `${size}%`
      const boundary = element.getBoundingClientRect()
      const scroll = element.querySelector('.booking-dialog-scroll')
      const actions = [...element.querySelectorAll('.booking-dialog-actions button,.booking-dialog-actions a')]
      return { fontSize: size, scrollHeight: scroll.clientHeight, actionsInside: actions.every((action) => { const box = action.getBoundingClientRect(); return box.left >= boundary.left - 1 && box.top >= boundary.top - 1 && box.right <= boundary.right + 1 && box.bottom <= boundary.bottom + 1 }), actionsFit: actions.every((action) => action.scrollWidth <= action.clientWidth + 1 && action.scrollHeight <= action.clientHeight + 1), actionCount: actions.length }
    }), EXTREME_FONT_SIZES)
    for (const state of states) if (state.scrollHeight <= 0 || !state.actionsInside || !state.actionsFit || state.actionCount === 0) failures.push({ step, viewport: `${viewport.width}x${viewport.height}`, ...state })
  }
  return failures
}

async function fillPatientStep(dialog) {
  await dialog.getByLabel('Фамилия').fill('О’Коннор-Сидорова')
  await dialog.getByLabel('Имя').fill('Лёля')
  await dialog.getByLabel('Отчество').fill('Алиевна')
  await dialog.getByLabel('Телефон').fill('+7 (921) 555-01-29')
  await dialog.getByLabel('Дата рождения').fill('1988-02-29')
  await dialog.getByRole('checkbox', { name: /Согласие на обработку/ }).check()
}

test('keeps Continue inside the dialog at 135 percent on a short mobile viewport', async ({ page }) => {
  await page.setViewportSize(SCALE_REGRESSION_VIEWPORT)
  await page.addInitScript(() => localStorage.setItem('clod-font-size', '135'))
  await isolateBookingNetwork(page, SCALE_REGRESSION_DOCTOR)
  const dialog = await openScheduleStep(page, SCALE_REGRESSION_DOCTOR.slug)
  const inside = await dialog.getByRole('button', { name: 'Продолжить', exact: true }).evaluate((button) => {
    const action = button.getBoundingClientRect()
    const boundary = button.closest('.booking-dialog').getBoundingClientRect()
    return action.top >= boundary.top && action.bottom <= boundary.bottom
  })
  expect(inside).toBe(true)
})

test('fits the schedule and complete action text at every supported scale', async ({ page }) => {
  await isolateBookingNetwork(page, SCALE_REGRESSION_DOCTOR)
  const dialog = await openScheduleStep(page, SCALE_REGRESSION_DOCTOR.slug)
  const failures = await scaleFailures(page, dialog)
  expect(failures).toEqual([])
})

test('shows the requested compact summary order on mobile', async ({ page }) => {
  await page.setViewportSize(SCALE_REGRESSION_VIEWPORT)
  await isolateBookingNetwork(page, SCALE_REGRESSION_DOCTOR)
  const dialog = await openScheduleStep(page, SCALE_REGRESSION_DOCTOR.slug)
  const summary = await dialog.locator('.booking-doctor-summary').evaluate((element) => ({ name: element.querySelector('.booking-summary-name').textContent, type: element.querySelector('.booking-summary-type').textContent, price: element.querySelector('.booking-summary-price').textContent, location: element.querySelector('.booking-summary-location').textContent, photo: getComputedStyle(element.querySelector('img')).display, specialization: getComputedStyle(element.querySelector('.booking-summary-specialization')).display, typeBeforeAddress: element.querySelector('.booking-summary-appointment').getBoundingClientRect().top < element.querySelector('.booking-summary-location').getBoundingClientRect().top }))
  expect(summary).toEqual({ name: 'Егорова Анастасия Александровна', type: 'Маммолог', price: '4 900 ₽', location: 'просп. Богатырский, д. 22к1', photo: 'none', specialization: 'none', typeBeforeAddress: true })
})

test('keeps the summary and schedule in two desktop columns', async ({ page }) => {
  await page.setViewportSize({ width: 1470, height: 956 })
  await page.addInitScript(() => localStorage.setItem('clod-font-size', '135'))
  await isolateBookingNetwork(page, SCALE_REGRESSION_DOCTOR)
  const dialog = await openScheduleStep(page, SCALE_REGRESSION_DOCTOR.slug)
  const columns = await dialog.locator('.booking-dialog-scroll').evaluate((element) => ({ count: getComputedStyle(element).gridTemplateColumns.split(' ').length, summaryBeforeContent: element.querySelector('.booking-doctor-summary').getBoundingClientRect().right <= element.querySelector('.booking-dialog-content').getBoundingClientRect().left }))
  expect(columns).toEqual({ count: 2, summaryBeforeContent: true })
})

test('keeps patient, review, and result actions complete at extreme scales', async ({ page }) => {
  await isolateBookingNetwork(page, SCALE_REGRESSION_DOCTOR)
  const dialog = await openPatientStep(page, SCALE_REGRESSION_DOCTOR.slug)
  const failures = await stepScaleFailures(page, dialog, 'patient')
  await fillPatientStep(dialog)
  await dialog.getByRole('button', { name: 'Проверить запись' }).click()
  await dialog.getByRole('heading', { name: 'Проверьте запись' }).waitFor()
  failures.push(...await stepScaleFailures(page, dialog, 'review'))
  await dialog.getByRole('button', { name: 'Подтвердить запись' }).click()
  await dialog.getByRole('heading', { name: 'Запись подтверждена' }).waitFor()
  failures.push(...await stepScaleFailures(page, dialog, 'result'))
  expect(failures).toEqual([])
})

async function openPatientStep(page, slug = 'odintsov') {
  const dialog = await openScheduleStep(page, slug)
  await dialog.getByRole('button', { name: '10:20', exact: true }).click()
  await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await dialog.getByRole('heading', { name: 'Данные пациента' }).waitFor()
  return dialog
}

async function bookingLayout(dialog, page) {
  await dialog.getByRole('button', { name: 'Закрыть запись' }).focus()
  await page.keyboard.press('Tab')
  const skippedSummary = await page.evaluate(() => !document.activeElement?.closest('.booking-doctor-summary'))
  await dialog.locator('.booking-dialog-scroll').evaluate((scroll) => { scroll.scrollTop = scroll.scrollHeight })
  return dialog.evaluate((element, summaryWasSkipped) => {
    const content = element.querySelector('.booking-dialog-content')
    const body = element.querySelector('.booking-dialog-body')
    const scroll = element.querySelector('.booking-dialog-scroll')
    const actions = element.querySelector('.booking-dialog-actions')
    const summary = element.querySelector('.booking-doctor-summary')
    const footer = element.querySelector('.booking-dialog-footer')
    const primary = footer.querySelector('button')
    const bodyRect = body.getBoundingClientRect()
    const dialogRect = element.getBoundingClientRect()
    const actionsRect = actions.getBoundingClientRect()
    const primaryRect = primary.getBoundingClientRect()
    const verticalScrollers = [element, ...element.querySelectorAll('*')].filter((node) => {
      const overflow = getComputedStyle(node).overflowY
      return ['auto', 'scroll'].includes(overflow) && node.scrollHeight > node.clientHeight + 1
    }).map((node) => [...node.classList].find((name) => name.startsWith('booking-')) ?? node.tagName.toLowerCase())
    return {
      viewport: [window.innerWidth, window.innerHeight],
      dialogBox: [Math.round(dialogRect.left), Math.round(dialogRect.top), Math.round(dialogRect.width), Math.round(dialogRect.height)],
      dialogOverflow: getComputedStyle(element).overflowY,
      bodyOverflow: getComputedStyle(body).overflowY,
      contentOverflow: getComputedStyle(content).overflowY,
      scrollOverflow: getComputedStyle(scroll).overflowY,
      scrollScrollable: scroll.scrollHeight > scroll.clientHeight + 1,
      verticalScrollers,
      summaryFits: summary.scrollHeight <= summary.clientHeight + 1,
      summaryOverflow: getComputedStyle(summary).overflowY,
      summaryTabIndex: summary.tabIndex,
      skippedSummary: summaryWasSkipped,
      actionsPinned: Math.abs(bodyRect.bottom - actionsRect.bottom) <= 2,
      actionVisible: primaryRect.top >= dialogRect.top && primaryRect.bottom <= dialogRect.bottom,
      safeAreaFallback: CSS.supports('padding-top: env(safe-area-inset-top)') && Number.parseFloat(getComputedStyle(element.querySelector('.booking-dialog-header')).paddingTop) >= 16 && Number.parseFloat(getComputedStyle(actions).paddingBottom) >= 16,
      reducedMotion: getComputedStyle(primary).transitionDuration === '0s' && getComputedStyle(primary).animationDuration === '0s' && getComputedStyle(scroll).scrollBehavior === 'auto',
    }
  }, skippedSummary)
}

async function interactionStyle(page, selector) {
  const button = page.locator(selector)
  const base = await button.evaluate((element) => getComputedStyle(element).backgroundColor)
  await button.focus()
  const focused = await button.evaluate((element) => ({ minHeight: getComputedStyle(element).minHeight, cursor: getComputedStyle(element).cursor, shadowed: getComputedStyle(element).boxShadow !== 'none', outlineWidth: getComputedStyle(element).outlineWidth, outlineOffset: getComputedStyle(element).outlineOffset }))
  await button.hover()
  const hovered = await button.evaluate((element) => getComputedStyle(element).backgroundColor)
  return { ...focused, hoverChanged: hovered !== base }
}

async function disabledHoverStyle(page, button) {
  await page.mouse.move(0, 0)
  const before = await button.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, shadow: style.boxShadow, transform: style.transform, cursor: style.cursor, opacity: style.opacity }
  })
  await button.hover()
  const after = await button.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, shadow: style.boxShadow, transform: style.transform, cursor: style.cursor, opacity: style.opacity }
  })
  return {
    disabled: await button.isDisabled(),
    changed: Object.keys(before).filter((property) => before[property] !== after[property]),
    cursor: before.cursor,
    opacity: before.opacity,
  }
}

for (const viewport of LAYOUT_VIEWPORTS) {
  test(`keeps one vertical booking scroller at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await isolateBookingNetwork(page)
    const dialog = await openPatientStep(page)
    const layout = await bookingLayout(dialog, page)
    expect(layout).toEqual({ viewport: [viewport.width, viewport.height], dialogBox: [0, 0, viewport.width, viewport.height], dialogOverflow: 'hidden', bodyOverflow: 'hidden', contentOverflow: 'visible', scrollOverflow: 'auto', scrollScrollable: true, verticalScrollers: ['booking-dialog-scroll'], summaryFits: true, summaryOverflow: 'visible', summaryTabIndex: -1, skippedSummary: true, actionsPinned: true, actionVisible: true, safeAreaFallback: true, reducedMotion: true })
  })
}

test('keeps the actual disabled Continue action visually inert on hover', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await isolateBookingNetwork(page)
  const dialog = await openScheduleStep(page)
  const style = await disabledHoverStyle(page, dialog.getByRole('button', { name: 'Продолжить', exact: true }))
  expect(style).toEqual({ disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' })
})

test('keeps every disable-capable booking action visually inert on hover', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await isolateBookingNetwork(page)
  await page.goto('/')
  const actions = [
    ['booking-primary-action', 'btn-clay-primary disabled:cursor-not-allowed disabled:opacity-50'],
    ['booking-submit', 'btn-clay-primary disabled:cursor-not-allowed disabled:opacity-50'],
    ['booking-back', 'btn-clay-secondary disabled:cursor-not-allowed disabled:opacity-50'],
    ['booking-result-action', 'btn-clay-primary disabled:cursor-not-allowed disabled:opacity-50'],
    ['booking-close-result', 'btn-clay-secondary disabled:cursor-not-allowed disabled:opacity-50'],
    ['booking-close', 'hover:bg-clay-bg disabled:cursor-not-allowed disabled:opacity-50'],
    ['booking-retry', 'btn-clay-primary disabled:cursor-not-allowed disabled:opacity-50'],
    ['booking-type-option', ''],
    ['booking-time-option', ''],
  ]
  await page.evaluate((entries) => {
    const dialog = document.createElement('div')
    dialog.className = 'booking-dialog'
    dialog.style.cssText = 'position:fixed;inset:4rem;z-index:20000;display:flex;flex-wrap:wrap;gap:1rem;align-content:start'
    for (const [hook, companionClasses] of entries) {
      const button = document.createElement('button')
      button.className = `${hook} ${companionClasses}`
      button.textContent = hook
      button.disabled = true
      dialog.append(button)
    }
    document.body.append(dialog)
  }, actions)
  const styles = {}
  for (const [hook] of actions) styles[hook] = await disabledHoverStyle(page, page.locator(`.${hook}`))
  expect(styles).toEqual({
    'booking-primary-action': { disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' },
    'booking-submit': { disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' },
    'booking-back': { disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' },
    'booking-result-action': { disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' },
    'booking-close-result': { disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' },
    'booking-close': { disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' },
    'booking-retry': { disabled: true, changed: [], cursor: 'not-allowed', opacity: '0.5' },
    'booking-type-option': { disabled: true, changed: [], cursor: 'pointer', opacity: '0.58' },
    'booking-time-option': { disabled: true, changed: [], cursor: 'pointer', opacity: '0.58' },
  })
})

test('styles alternative and retry actions through their booking hooks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await isolateBookingNetwork(page)
  await page.goto('/')
  await page.evaluate(() => {
    const dialog = document.createElement('div')
    dialog.className = 'booking-dialog'
    dialog.style.position = 'fixed'
    dialog.style.inset = '0'
    dialog.style.zIndex = '20000'
    for (const className of ['booking-alternative', 'booking-retry']) {
      const button = document.createElement('button')
      button.className = className
      button.textContent = className
      dialog.append(button)
    }
    document.body.append(dialog)
  })
  const alternative = await interactionStyle(page, '.booking-alternative')
  const retry = await interactionStyle(page, '.booking-retry')
  expect({ alternative, retry }).toEqual({ alternative: { minHeight: '44px', cursor: 'pointer', shadowed: true, outlineWidth: '3px', outlineOffset: '3px', hoverChanged: true }, retry: { minHeight: '44px', cursor: 'pointer', shadowed: true, outlineWidth: '3px', outlineOffset: '3px', hoverChanged: true } })
})
