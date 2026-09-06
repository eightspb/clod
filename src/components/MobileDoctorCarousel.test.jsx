import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MobileDoctorCarousel } from './MobileDoctorCarousel.jsx'

const DOCTORS = Object.freeze([
  {
    slug: 'belova',
    name: 'Белова Эльвира Рашидовна',
    specialization: 'Онколог-маммолог, врач УЗД',
    experienceYears: 12,
    photo: '/images/doctors/belova.webp',
    photoFull: '/images/doctors/belova.png',
    photoMobile: '/images/doctors/belova-mobile.webp',
    tagline: 'Длинное описание не должно попадать в мобильную сцену',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/101/',
    proDoctorovRating: { score: 5, reviewCount: 37 },
  },
  {
    slug: 'karimov',
    name: 'Каримов Руслан Фаридович',
    specialization: 'Хирург, онколог',
    experienceYears: 9,
    photo: '/images/doctors/karimov.webp',
    photoFull: '/images/doctors/karimov.png',
    photoMobile: '/images/doctors/karimov-mobile.webp',
    tagline: 'Ещё одно описание',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/202/',
    proDoctorovRating: { score: 4.9, reviewCount: 84 },
  },
  {
    slug: 'wang',
    name: 'Ван Мария Юрьевна',
    specialization: 'Эндокринолог, нутрициолог',
    experienceYears: 15,
    photo: '/images/doctors/wang.webp',
    photoFull: '/images/doctors/wang.png',
    photoMobile: '/images/doctors/wang-mobile.webp',
    tagline: 'Третье описание',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/303/',
    proDoctorovRating: { score: 4.8, reviewCount: 19 },
  },
  {
    slug: 'akopyan',
    name: 'Акопян Лусине Арменовна',
    specialization: 'Гинеколог, врач УЗД',
    photo: '/images/doctors/akopyan.webp',
    photoFull: '/images/doctors/akopyan.png',
    photoMobile: '/images/doctors/akopyan-mobile.webp',
    tagline: 'Четвёртое описание',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/404/',
    proDoctorovRating: { score: 5, reviewCount: 62 },
  },
])

function installSelectionFeedbackFakes({ state = 'running' } = {}) {
  const calls = { contexts: 0, starts: 0, closes: 0, resumes: 0, vibrations: [] }
  class FakeAudioContext {
    constructor() {
      calls.contexts += 1
      this.currentTime = 4
      this.destination = {}
      this.state = state
    }
    createOscillator() {
      return {
        connect() {},
        frequency: { exponentialRampToValueAtTime() {}, setValueAtTime() {} },
        start() { calls.starts += 1 },
        stop() {},
        type: 'sine',
      }
    }
    createGain() {
      return { connect() {}, gain: { exponentialRampToValueAtTime() {}, setValueAtTime() {} } }
    }
    close() {
      calls.closes += 1
      return Promise.resolve()
    }
    resume() {
      calls.resumes += 1
      this.state = 'running'
      return Promise.resolve()
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('navigator', { vibrate: (duration) => calls.vibrations.push(duration) })
  return calls
}

function pointerEvent(type, { x, y, pointerId = 7, isPrimary = true, pointerType = 'mouse' }) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
  Object.defineProperties(event, { isPrimary: { value: isPrimary }, pointerId: { value: pointerId }, pointerType: { value: pointerType } })
  return event
}

function touchEvent(type, point) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const touches = point ? [{ clientX: point.x, clientY: point.y, identifier: 1 }] : []
  Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: touches } })
  return event
}

function fingerSwipe(stage, points) {
  const [first, ...rest] = points
  fireEvent(stage, touchEvent('touchstart', first))
  const moves = rest.map((point) => {
    const event = touchEvent('touchmove', point)
    fireEvent(stage, event)
    return event
  })
  fireEvent(stage, touchEvent('touchend'))
  return moves
}

afterEach(() => vi.unstubAllGlobals())

describe('MobileDoctorCarousel', () => {
  it('exposes an accessible carousel region', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Выбор врача" />)
    expect(screen.getByRole('region', { name: 'Выбор врача' })).toHaveAttribute('aria-roledescription', 'carousel')
  })

  it('loads portraits for every visible coverflow layer', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Специалисты" />)
    expect(container.querySelectorAll('img')).toHaveLength(4)
  })

  it('loads the active portrait eagerly and the neighbours lazily', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Специалисты" />)
    const active = container.querySelector('[aria-current="true"] img')
    const others = Array.from(container.querySelectorAll('[aria-current="true"] ~ article img, article:has(~ [aria-current="true"]) img'))
    expect({ active: [active.getAttribute('loading'), active.getAttribute('fetchpriority')], others: others.map((portrait) => portrait.getAttribute('loading')) }).toEqual({ active: ['eager', 'high'], others: ['lazy', 'lazy', 'lazy'] })
  })

  it('media-gates every portrait source to mobile viewports', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Специалисты" />)
    expect(container.querySelectorAll('source[media="(max-width: 767px)"]')).toHaveLength(4)
    expect(screen.getAllByRole('img').every((portrait) => portrait.getAttribute('src').startsWith('data:image/gif'))).toBe(true)
  })

  it('uses optimized transparent portraits for every visible coverflow layer', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Специалисты" />)
    const sources = Array.from(container.querySelectorAll('source'), (source) => source.getAttribute('srcset'))
    expect(sources).toEqual(DOCTORS.map((doctor) => doctor.photoMobile))
  })

  it('keeps every mobile portrait fully visible and anchored to the podium', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Специалисты" />)
    for (const portrait of screen.getAllByRole('img')) {
      expect(portrait).toHaveClass('object-contain', 'object-bottom')
    }
  })

  it('moves to the next doctor with the next control', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Команда" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect(screen.getByRole('group', { name: /Каримов Руслан Фаридович/ })).toHaveAttribute('aria-current', 'true')
  })

  it('emits one selection click for a real doctor change', () => {
    const calls = installSelectionFeedbackFakes()
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Тактильный выбор" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect([calls.contexts, calls.starts, calls.vibrations]).toEqual([1, 1, [8]])
  })

  it('reuses one audio context across doctor changes', () => {
    const calls = installSelectionFeedbackFakes()
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Звуковой выбор" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect([calls.contexts, calls.starts]).toEqual([1, 2])
  })

  it('resumes an interrupted audio context before emitting the click', async () => {
    const calls = installSelectionFeedbackFakes({ state: 'interrupted' })
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Возобновление звука" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect([calls.resumes, calls.starts]).toEqual([1, 0])
    await Promise.resolve()
    expect(calls.starts).toBe(1)
  })

  it('closes selection audio resources on unmount', () => {
    const calls = installSelectionFeedbackFakes()
    const view = render(<MobileDoctorCarousel doctors={DOCTORS} label="Освобождение звука" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    view.unmount()
    expect(calls.closes).toBe(1)
  })

  it('does not emit selection feedback when the doctor cannot change', () => {
    const calls = installSelectionFeedbackFakes()
    render(<MobileDoctorCarousel doctors={DOCTORS.slice(0, 1)} label="Один врач" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect([calls.contexts, calls.starts, calls.vibrations]).toEqual([0, 0, []])
  })

  it('keeps a filter reset silent', () => {
    const calls = installSelectionFeedbackFakes()
    const view = render(<MobileDoctorCarousel doctors={DOCTORS} label="Фильтр врачей" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    view.rerender(<MobileDoctorCarousel doctors={DOCTORS.slice(2)} label="Фильтр врачей" />)
    expect([calls.contexts, calls.starts, calls.vibrations]).toEqual([1, 1, [8]])
  })

  it('still changes doctors when feedback APIs are unavailable', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    vi.stubGlobal('navigator', {})
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Без обратной связи" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect(screen.getByRole('group', { name: /Каримов Руслан Фаридович/ })).toHaveAttribute('aria-current', 'true')
  })

  it('wraps to the last doctor with the previous control', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Команда" />)
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущий врач' }))
    expect(screen.getByRole('group', { name: /Акопян Лусине Арменовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('keeps the previous and next doctors visible around the first doctor', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Объёмная карусель" />)
    const positions = Array.from(container.querySelectorAll('[data-coverflow-position]'), (slide) => slide.dataset.coverflowPosition)
    expect(positions).toEqual(['current', 'next', 'next-far', 'previous'])
  })

  it('shows each doctor of a two-doctor collection exactly once', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS.slice(0, 2)} label="Два врача" />)
    const positions = Array.from(container.querySelectorAll('[data-coverflow-position]'), (slide) => slide.dataset.coverflowPosition)
    expect(positions).toEqual(['current', 'next'])
  })

  it('moves to the next doctor after a horizontal pointer swipe', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Свайп врачей" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fireEvent(stage, pointerEvent('pointerdown', { x: 260, y: 140 }))
    fireEvent(stage, pointerEvent('pointerup', { x: 160, y: 145 }))
    expect(screen.getByRole('group', { name: /Каримов Руслан Фаридович/ })).toHaveAttribute('aria-current', 'true')
  })

  it('ignores a primarily vertical pointer gesture', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Вертикальный жест" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fireEvent(stage, pointerEvent('pointerdown', { x: 260, y: 140 }))
    fireEvent(stage, pointerEvent('pointerup', { x: 250, y: 240 }))
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('ignores a horizontal pointer gesture shorter than 48 pixels', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Короткий жест" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fireEvent(stage, pointerEvent('pointerdown', { x: 260, y: 140 }))
    fireEvent(stage, pointerEvent('pointerup', { x: 230, y: 142 }))
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('clears an interrupted pointer gesture', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Отменённый жест" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fireEvent(stage, pointerEvent('pointerdown', { x: 260, y: 140 }))
    fireEvent(stage, pointerEvent('pointercancel', { x: 210, y: 142 }))
    fireEvent(stage, pointerEvent('pointerup', { x: 160, y: 145 }))
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('ignores a non-primary pointer gesture', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Вторичный указатель" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fireEvent(stage, pointerEvent('pointerdown', { x: 260, y: 140, isPrimary: false }))
    fireEvent(stage, pointerEvent('pointerup', { x: 160, y: 145, isPrimary: false }))
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('ignores pointer events that mirror a touch gesture', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Дублирующий touch-указатель" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fireEvent(stage, pointerEvent('pointerdown', { x: 260, y: 140, pointerType: 'touch' }))
    fireEvent(stage, pointerEvent('pointerup', { x: 160, y: 145, pointerType: 'touch' }))
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('moves to the next doctor while a finger swipes left', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Свайп пальцем" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fingerSwipe(stage, [{ x: 260, y: 140 }, { x: 230, y: 143 }, { x: 190, y: 147 }])
    expect(screen.getByRole('group', { name: /Каримов Руслан Фаридович/ })).toHaveAttribute('aria-current', 'true')
  })

  it('moves to the previous doctor while a finger swipes right', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Свайп пальцем вправо" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fingerSwipe(stage, [{ x: 100, y: 140 }, { x: 130, y: 142 }, { x: 170, y: 146 }])
    expect(screen.getByRole('group', { name: /Акопян Лусине Арменовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('blocks native scrolling once a finger swipe is horizontal', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Горизонтальный жест" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    const moves = fingerSwipe(stage, [{ x: 260, y: 140 }, { x: 240, y: 142 }, { x: 236, y: 170 }])
    expect(moves.map((event) => event.defaultPrevented)).toEqual([true, true])
  })

  it('leaves native vertical scrolling untouched from the portrait track', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Вертикальная прокрутка" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    const moves = fingerSwipe(stage, [{ x: 260, y: 140 }, { x: 262, y: 165 }, { x: 200, y: 200 }])
    expect(moves.map((event) => event.defaultPrevented)).toEqual([false, false])
  })

  it('changes exactly one doctor per finger swipe', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Один шаг за жест" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fingerSwipe(stage, [{ x: 300, y: 140 }, { x: 200, y: 143 }, { x: 60, y: 147 }])
    expect(screen.getByRole('group', { name: /Каримов Руслан Фаридович/ })).toHaveAttribute('aria-current', 'true')
  })

  it('ignores a finger swipe shorter than 48 pixels', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Короткий свайп" />)
    const stage = screen.getByRole('group', { name: 'Листать врачей' })
    fingerSwipe(stage, [{ x: 260, y: 140 }, { x: 240, y: 142 }, { x: 225, y: 143 }])
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('hides the default carousel on desktop viewports', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Мобильная карусель" />)
    expect(screen.getByRole('region', { name: 'Мобильная карусель' })).toHaveClass('md:hidden')
  })

  it('renders the desktop variant without the mobile-only hiding class', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Карусель в hero" variant="desktop" portraitMedia="(min-width: 768px)" />)
    const region = screen.getByRole('region', { name: 'Карусель в hero' })
    expect({ variant: region.dataset.variant, hidden: region.classList.contains('md:hidden') }).toEqual({ variant: 'desktop', hidden: false })
  })

  it('media-gates desktop portraits to the supplied query', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Карусель в hero" variant="desktop" portraitMedia="(min-width: 1024px)" />)
    const media = Array.from(container.querySelectorAll('source'), (source) => source.getAttribute('media'))
    expect(new Set(media)).toEqual(new Set(['(min-width: 1024px)']))
  })

  it('supports ArrowLeft, ArrowRight, Home, and End keys', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Команда клиники" />)
    const track = screen.getByRole('group', { name: 'Листать врачей' })
    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(screen.getByRole('group', { name: /Каримов Руслан Фаридович/ })).toHaveAttribute('aria-current', 'true')
    fireEvent.keyDown(track, { key: 'ArrowLeft' })
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
    fireEvent.keyDown(track, { key: 'End' })
    expect(screen.getByRole('group', { name: /Акопян Лусине Арменовна/ })).toHaveAttribute('aria-current', 'true')
    fireEvent.keyDown(track, { key: 'Home' })
    expect(screen.getByRole('group', { name: /Белова Эльвира Рашидовна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('keeps only the active ProDoctorov rating actionable', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Рейтинг врачей" />)
    expect(screen.getByRole('link', { name: /5.0 \(37\).*ПроДокторов/ })).toHaveAttribute('href', DOCTORS[0].proDoctorovUrl)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect(screen.getByRole('link', { name: /4.9 \(84\).*ПроДокторов/ })).toHaveAttribute('href', DOCTORS[1].proDoctorovUrl)
  })

  it('resets to the first doctor when the filtered collection changes', () => {
    const view = render(<MobileDoctorCarousel doctors={DOCTORS} label="Врачи" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    view.rerender(<MobileDoctorCarousel doctors={DOCTORS.slice(2)} label="Врачи" />)
    expect(screen.getByRole('group', { name: /Ван Мария Юрьевна/ })).toHaveAttribute('aria-current', 'true')
  })

  it('renders one profile action for the active doctor', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Врачи клиники" />)
    expect(screen.getAllByRole('link', { name: /Профиль врача/, hidden: true })).toHaveLength(1)
  })

  it('updates the doctor-specific booking action with the active slide', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Онлайн-запись" />)
    const first = screen.getByRole('button', { name: /Записаться к Белова/ }).getAttribute('data-booking-doctor')
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    const second = screen.getByRole('button', { name: /Записаться к Каримов/ }).getAttribute('data-booking-doctor')
    expect([first, second]).toEqual(['belova', 'karimov'])
  })

  it('renders the name as surname and given name above the patronymic', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Две строки имени" />)
    const lines = () => Array.from(container.querySelectorAll('.mobile-doctor-name-line'), (line) => line.textContent)
    expect(lines()).toEqual(['Белова Эльвира', 'Рашидовна'])
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect(lines()).toEqual(['Каримов Руслан', 'Фаридович'])
    expect(screen.getByRole('heading', { name: 'Каримов Руслан Фаридович' })).toBeInTheDocument()
  })

  it('renders one shared dimensional information plinth', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Подиум врачей" />)
    expect(container.querySelectorAll('.mobile-doctor-plinth')).toHaveLength(1)
  })

  it('shows every specialty of the active doctor on the card', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Подиум врачей" />)
    expect(container.querySelector('.mobile-doctor-specialty').textContent).toBe('Онколог-маммолог, врач УЗД')
  })

  it('places the navigation controls inside the information card', () => {
    const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Навигация в карточке" />)
    expect(container.querySelector('.mobile-doctor-plinth .mobile-doctor-carousel-controls')).not.toBeNull()
  })

  it('announces the position as a slash-separated counter', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Счётчик врачей" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
  })

  it('shows the experience of the active doctor on the card', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Стаж врачей" />)
    fireEvent.click(screen.getByRole('button', { name: 'Следующий врач' }))
    expect(screen.getByText('Стаж 9 лет')).toBeInTheDocument()
  })

  it('omits the experience line for a doctor without a known experience', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS.slice(3)} label="Без стажа" />)
    expect(screen.queryByText(/Стаж/)).not.toBeInTheDocument()
  })

  it('omits long doctor descriptions from the mobile scene', () => {
    render(<MobileDoctorCarousel doctors={DOCTORS} label="Наши врачи" />)
    expect(screen.queryByText(DOCTORS[0].tagline)).not.toBeInTheDocument()
  })

  it('renders nothing for an empty doctor collection', () => {
    const { container } = render(<MobileDoctorCarousel doctors={[]} label="Пустой список" />)
    expect(container.firstChild).toBeNull()
  })
})
