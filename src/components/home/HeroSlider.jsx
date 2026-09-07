import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle, ChevronRight, ChevronLeft, Pause, Play } from 'lucide-react'
import { DOCTOR_AUTOPLAY_INTERVAL, MobileDoctorCarousel } from '../MobileDoctorCarousel.jsx'
import { DOCTORS } from '../../lib/doctors-data.js'
import { useReducedMotion } from '../../lib/use-reduced-motion.js'

const HERO_AUTOPLAY_INTERVAL = 6000
const HERO_CAROUSEL_LABEL = 'Карусель врачей в главном слайдере'
const HERO_PORTRAIT_MEDIA = '(min-width: 1024px)'

const heroSlides = [
  {
    trustBadge: 'Клиника экспертной медицины',
    title: <>Медицинский маршрут <br /><span className="heading-accent">без лишней тревоги</span></>,
    desc: 'Маммология, гинекология, эндокринология и нутрициология в одном спокойном маршруте пациента.',
    primaryBtn: { label: 'Записаться', href: '#appointment-form' },
    secondaryBtn: { label: 'Выбрать врача', href: '/doctors' },
  },
  {
    trustBadge: 'Маммология и ВАБ',
    title: <>ВАБ под УЗ-контролем <br /><span className="heading-accent">по показаниям</span></>,
    desc: 'Заранее обсуждаем показания, объём вмешательства и дальнейшее наблюдение после процедуры.',
    primaryBtn: { label: 'Записаться', href: '#appointment-form' },
    secondaryBtn: { label: 'Подробнее о ВАБ', href: '/vab' },
  },
  {
    trustBadge: 'Второе мнение',
    title: <>Второе мнение врача-онколога-маммолога <br /><span className="heading-accent">с разбором документов</span></>,
    desc: 'Перепроверяем снимки и заключения, объясняем тактику и следующий шаг понятным языком.',
    primaryBtn: { label: 'Проверить операцию', href: '/second-opinion' },
    secondaryBtn: { label: 'Как это работает', href: '/second-opinion' },
  },
  {
    trustBadge: 'Гинекология',
    title: <>Бережный приём гинеколога <br /><span className="heading-accent">без лишних назначений</span></>,
    desc: 'Осмотр, кольпоскопия и УЗИ по показаниям. Лечим только то, что действительно требует лечения.',
    primaryBtn: { label: 'Записаться', href: '#appointment-form' },
    secondaryBtn: { label: 'Подробнее о гинекологии', href: '/gynecology' },
  },
  {
    trustBadge: 'Эндокринология',
    title: <>Щитовидная железа, гормоны и вес <br /><span className="heading-accent">по шагам</span></>,
    desc: 'Разбираем жалобы и анализы, назначаем только нужные исследования и объясняем следующий шаг.',
    primaryBtn: { label: 'Записаться', href: '#appointment-form' },
    secondaryBtn: { label: 'Подробнее об эндокринологии', href: '/endocrinology' },
  },
  {
    trustBadge: 'Нутрициология',
    title: <>Питание с опорой на анализы <br /><span className="heading-accent">без жёстких диет</span></>,
    desc: 'Персональный план питания с учётом дефицитов и привычного ритма жизни, добавки — по показаниям.',
    primaryBtn: { label: 'Записаться', href: '#appointment-form' },
    secondaryBtn: { label: 'Подробнее о нутрициологии', href: '/nutrition' },
  },
]

export function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0)
  const isAutoplayDisabled = useReducedMotion()
  const [isPaused, setIsPaused] = useState(false)
  const [isEngaged, setIsEngaged] = useState(false)
  const isAutoplayActive = !isAutoplayDisabled && !isPaused && !isEngaged
  useEffect(() => {
    if (!isAutoplayActive) return undefined
    const timer = setInterval(() => setActiveSlide((prev) => (prev + 1) % heroSlides.length), HERO_AUTOPLAY_INTERVAL)
    return () => clearInterval(timer)
  }, [isAutoplayActive])
  function prevSlide() {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }
  function nextSlide() {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length)
  }
  return (
    <section
      className="relative overflow-hidden grain-overlay"
      aria-roledescription="carousel"
      aria-label="Главный слайдер"
      onMouseEnter={() => setIsEngaged(true)}
      onMouseLeave={() => setIsEngaged(false)}
      onFocus={() => setIsEngaged(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsEngaged(false) }}
    >
      <div className="absolute inset-0 hero-gradient pointer-events-none" style={{ zIndex: 0 }} />
      <div className="container-clay relative z-10 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem] gap-8 lg:gap-14 items-start">
          <div
            className="grid"
            aria-live="polite"
            aria-atomic="false"
          >
            {heroSlides.map((slide, idx) => {
              const isActive = activeSlide === idx
              return (
              <div
                key={idx}
                role="group"
                aria-roledescription="slide"
                aria-label={`Слайд ${idx + 1} из ${heroSlides.length}`}
                aria-hidden={!isActive}
                className="col-start-1 row-start-1 transition-all duration-[800ms] ease-out"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
                  filter: isActive ? 'blur(0px)' : 'blur(4px)',
                  pointerEvents: isActive ? 'auto' : 'none',
                  visibility: isActive ? 'visible' : 'hidden',
                }}
              >
                <div className="max-w-3xl self-start text-left">
                  <div className="mb-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
                      <CheckCircle size={12} />
                      {slide.trustBadge}
                    </div>
                  </div>
                  {activeSlide === idx ? (
                    <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">
                      {slide.title}
                    </h1>
                  ) : (
                    <div role="heading" aria-level="1" aria-hidden="true" className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">
                      {slide.title}
                    </div>
                  )}
                  <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-6 max-w-2xl">
                    {slide.desc}
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <a href={slide.primaryBtn.href} data-booking-btn={slide.primaryBtn.label.includes('Записаться') ? "true" : undefined} className="clay btn-clay-primary gap-2">
                      {slide.primaryBtn.label}
                      <ArrowRight size={16} />
                    </a>
                    <a href={slide.secondaryBtn.href} data-booking-btn={slide.secondaryBtn.label.includes('Записаться') ? "true" : undefined} className="clay btn-clay-secondary">
                      {slide.secondaryBtn.label}
                    </a>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
          <div className="hidden lg:block">
            <MobileDoctorCarousel doctors={DOCTORS} label={HERO_CAROUSEL_LABEL} variant="desktop" portraitMedia={HERO_PORTRAIT_MEDIA} autoplayMs={DOCTOR_AUTOPLAY_INTERVAL} />
          </div>
        </div>
        <div className="flex justify-center items-center gap-3 mt-8 lg:mt-0">
          <button
            type="button"
            onClick={prevSlide}
            className="rounded-full flex items-center justify-center transition-colors lg:absolute lg:left-0 lg:-translate-y-1/2 xl:left-[calc(2rem-46px)]"
            style={{ width: '44px', height: '44px', flexShrink: 0, top: '50%', background: 'rgb(var(--color-mint-rgb) / 0.10)', border: '1px solid rgb(var(--color-mint-rgb) / 0.16)' }}
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft size={14} className="text-clay-mint" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="rounded-full flex items-center justify-center transition-colors lg:absolute lg:right-0 lg:-translate-y-1/2 xl:right-[calc(2rem-46px)]"
            style={{ width: '44px', height: '44px', flexShrink: 0, top: '50%', background: 'rgb(var(--color-mint-rgb) / 0.10)', border: '1px solid rgb(var(--color-mint-rgb) / 0.16)' }}
            aria-label="Следующий слайд"
          >
            <ChevronRight size={14} className="text-clay-mint" />
          </button>
          {!isAutoplayDisabled && (
            <button
              type="button"
              onClick={() => setIsPaused((current) => !current)}
              className="rounded-full flex items-center justify-center transition-colors lg:absolute lg:right-0 lg:bottom-0 xl:right-[calc(2rem-46px)]"
              style={{ width: '44px', height: '44px', flexShrink: 0, background: 'rgb(var(--color-mint-rgb) / 0.10)', border: '1px solid rgb(var(--color-mint-rgb) / 0.16)' }}
              aria-pressed={isPaused}
              aria-label={isPaused ? 'Возобновить автопрокрутку слайдов' : 'Приостановить автопрокрутку слайдов'}
            >
              {isPaused ? <Play size={14} className="text-clay-mint" /> : <Pause size={14} className="text-clay-mint" />}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
