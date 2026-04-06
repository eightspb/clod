import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { ArrowRight, CheckCircle, ChevronRight, ChevronLeft, Award } from 'lucide-react'
import { StarRating } from '../StarRating.jsx'
import { DOCTORS } from '../../lib/doctors-data.js'

const HERO_AUTOPLAY_INTERVAL = 12000
const MAMMOLOGISTS = DOCTORS.filter(d => /онколог-маммолог/i.test(d.specialization))
const OTHER_DOCTORS = DOCTORS.filter(d => !MAMMOLOGISTS.includes(d))

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const heroSlides = [
  {
    trustBadge: 'Маммология и ВАБ',
    badge: 'Приморский район · Санкт-Петербург',
    title: <>Вакуумная аспирационная биопсия<br /><span className="heading-accent">по показаниям и под УЗ-контролем</span></>,
    desc: 'Обсуждаем объём вмешательства, показания и дальнейшее наблюдение заранее. Процедура обычно проходит амбулаторно и занимает около 30 минут.',
    stats: [
      { val: '30', unit: 'мин', label: 'обычная длительность' },
      { val: '2', unit: 'мм', label: 'прокол ВАБ' },
      { val: '1', unit: 'день', label: 'без госпитализации' },
    ],
    primaryBtn: { label: 'Записаться на ВАБ', href: '/second-opinion' },
    secondaryBtn: { label: 'Подробнее о ВАБ', href: '/vab' },
  },
  {
    trustBadge: 'Второе мнение',
    badge: 'Для пациентов из любого региона России',
    title: <>Второе мнение по маммологии<br /><span className="heading-accent">с разбором снимков и заключений</span></>,
    desc: 'Перепроверяем документы, обсуждаем тактику и объясняем следующий шаг спокойным, понятным языком. При необходимости помогаем с очной маршрутизацией в Санкт-Петербурге.',
    stats: [
      { val: '0', unit: '₽', label: 'второе мнение бесплатно' },
      { val: '1', unit: '', label: 'понятный план действий' },
      { val: 'СПб', unit: '', label: 'очная маршрутизация при необходимости' },
    ],
    primaryBtn: { label: 'Проверить, нужна ли операция', href: '/second-opinion' },
    secondaryBtn: { label: 'Записаться на приём', href: '/second-opinion' },
  },
  {
    trustBadge: 'Гинекология, эндокринология, нутрициология',
    badge: 'Понятный маршрут пациента',
    title: <>Приём по показаниям<br /><span className="heading-accent">с уважительным и спокойным подходом</span></>,
    desc: 'Разбираем жалобы, результаты анализов и план наблюдения без спешки. Объясняем следующий шаг понятным и спокойным языком.',
    stats: [
      { val: '4', unit: '', label: 'ключевых направления' },
      { val: '9', unit: '', label: 'врачей в команде' },
      { val: '1', unit: '', label: 'единый маршрут пациента' },
    ],
    primaryBtn: { label: 'Выбрать специалиста', href: '/gynecology' },
    secondaryBtn: { label: 'Все направления', href: '/mammology' },
  },
]

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [sliderHeight, setSliderHeight] = useState(0)
  const slideRefs = useRef([])
  const [heroDoctor, setHeroDoctor] = useState({
    0: MAMMOLOGISTS[0],
    1: DOCTORS.find(d => d.slug === 'prikhodko') || MAMMOLOGISTS[1],
    2: OTHER_DOCTORS[0],
  })
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useIsomorphicLayoutEffect(() => {
    function updateHeight() {
      const heights = slideRefs.current
        .map((el) => el?.offsetHeight ?? 0)
        .filter((height) => height > 0)
      if (heights.length === 0) return
      const max = Math.max(...heights)
      setSliderHeight((prevHeight) => (prevHeight === max ? prevHeight : max))
    }
    const frameId = window.requestAnimationFrame(updateHeight)
    const resizeObserver = new ResizeObserver(updateHeight)
    slideRefs.current.forEach((slide) => {
      if (slide) {
        resizeObserver.observe(slide)
      }
    })
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event) => {
      if (event.matches) {
        setIsAutoplayPaused(true)
      }
    }
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange)
    }
    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange)
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])
  useEffect(() => {
    if (isAutoplayPaused) return undefined
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % heroSlides.length
        setHeroDoctor(old => ({
          ...old,
          0: pickRandom(MAMMOLOGISTS),
          2: pickRandom(OTHER_DOCTORS),
        }))
        return next
      })
    }, HERO_AUTOPLAY_INTERVAL)
    return () => clearInterval(timer)
  }, [isAutoplayPaused])
  function goToSlide(idx) {
    setActiveSlide(idx)
    setHeroDoctor(old => ({
      ...old,
      0: pickRandom(MAMMOLOGISTS),
      2: pickRandom(OTHER_DOCTORS),
    }))
  }
  function prevSlide() {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
    setHeroDoctor(old => ({
      ...old,
      0: pickRandom(MAMMOLOGISTS),
      2: pickRandom(OTHER_DOCTORS),
    }))
  }
  function nextSlide() {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    setHeroDoctor(old => ({
      ...old,
      0: pickRandom(MAMMOLOGISTS),
      2: pickRandom(OTHER_DOCTORS),
    }))
  }
  return (
    <section
      className="relative overflow-hidden grain-overlay"
      aria-roledescription="carousel"
      aria-label="Главный слайдер"
    >
      <div className="absolute inset-0 hero-gradient pointer-events-none" style={{ zIndex: 0 }} />
      <div className="blob-mint absolute top-12 -left-32 w-96 h-96 opacity-20 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="blob-peach absolute -bottom-24 -right-24 w-80 h-80 opacity-15 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="blob-blue absolute top-1/3 -right-40 w-72 h-72 opacity-10 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="container-clay relative z-10 py-8 md:py-14">
        <div
          className="relative"
          aria-live="polite"
          aria-atomic="false"
          style={{ minHeight: sliderHeight > 0 ? `${sliderHeight}px` : undefined }}
        >
          {heroSlides.map((slide, idx) => {
            const isActive = activeSlide === idx
            return (
            <div
              key={idx}
              ref={(el) => { slideRefs.current[idx] = el }}
              role="group"
              aria-roledescription="slide"
              aria-label={`Слайд ${idx + 1} из ${heroSlides.length}`}
              aria-hidden={!isActive}
              className="transition-all duration-[800ms] ease-out"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
                filter: isActive ? 'blur(0px)' : 'blur(4px)',
                position: !isActive || sliderHeight > 0 ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                width: '100%',
                pointerEvents: isActive ? 'auto' : 'none',
                visibility: isActive ? 'visible' : 'hidden',
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
                <div>
                  <div className="flex flex-col gap-2 w-fit mb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider badge-specialty-mint">
                      <CheckCircle size={12} />
                      {slide.trustBadge}
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-clay-muted bg-gray-50">
                      <span className="w-1.5 h-1.5 rounded-full bg-clay-mint animate-pulse" />
                      {slide.badge}
                    </div>
                  </div>
                  {activeSlide === idx ? (
                    <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                      {slide.title}
                    </h1>
                  ) : (
                    <div role="heading" aria-level="1" aria-hidden="true" className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                      {slide.title}
                    </div>
                  )}
                  <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-5 max-w-lg">
                    {slide.desc}
                  </p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    <a href={slide.primaryBtn.href} data-booking-btn={slide.primaryBtn.label.includes('Записаться') ? "true" : undefined} className="clay btn-clay-secondary gap-2">
                      {slide.primaryBtn.label}
                      <ArrowRight size={16} />
                    </a>
                    <a href={slide.secondaryBtn.href} data-booking-btn={slide.secondaryBtn.label.includes('Записаться') ? "true" : undefined} className="clay btn-clay-secondary">
                      {slide.secondaryBtn.label}
                    </a>
                  </div>
                </div>
                <div className="hero-doctor-card">
                  {heroDoctor[idx] && (
                    <div className="clay clay-card hero-doctor-card-inner">
                      <a href={`/doctors/${heroDoctor[idx].slug}`} className="hero-doctor-photo-link group">
                        <img
                          src={heroDoctor[idx].photoFull || `/images/doctors/${heroDoctor[idx].slug}.webp`}
                          alt={heroDoctor[idx].name}
                          width={280}
                          height={380}
                          className="hero-doctor-photo"
                          loading={idx === 0 ? 'eager' : 'lazy'}
                        />
                      </a>
                      <div className="hero-doctor-info">
                        <a href={`/doctors/${heroDoctor[idx].slug}`} className="hero-doctor-name-link group">
                          <h3 className="hero-doctor-name">{heroDoctor[idx].name}</h3>
                        </a>
                        <p className="hero-doctor-spec">{heroDoctor[idx].specialization}</p>
                        <div className="hero-doctor-meta">
                          {heroDoctor[idx].experienceYears && (
                            <span className="hero-doctor-experience">
                              <Award size={14} />
                              Стаж {heroDoctor[idx].experienceYears} лет
                            </span>
                          )}
                          {heroDoctor[idx].proDoctorovRating && (
                            <StarRating
                              score={heroDoctor[idx].proDoctorovRating.score}
                              reviewCount={heroDoctor[idx].proDoctorovRating.reviewCount}
                              url={heroDoctor[idx].proDoctorovUrl}
                              size={14}
                              variant="compact"
                            />
                          )}
                        </div>
                        <a
                          href={slide.primaryBtn.href}
                          data-booking-btn="true"
                          className="btn-clay-primary hero-doctor-cta"
                        >
                          Записаться к {heroDoctor[idx].dativeShortName || 'врачу'}
                          <ArrowRight size={16} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
        <div className="flex justify-center items-center gap-2.5 mt-8" role="group" aria-label="Навигация по слайдам">
          {heroSlides.map((_, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => goToSlide(idx)}
              aria-label={`Перейти к слайду ${idx + 1}`}
              aria-current={activeSlide === idx ? 'true' : undefined}
              className="p-1.5 transition-all duration-300"
            >
              <span
                className="rounded-full block transition-all duration-300"
                style={{
                  width: activeSlide === idx ? '28px' : '8px',
                  height: '8px',
                  background: activeSlide === idx ? '#4EC8A8' : 'rgba(78,200,168,0.3)',
                }}
              />
            </button>
          ))}
        </div>
        <div className="flex justify-center items-center gap-3 mt-3">
          <button
            type="button"
            onClick={prevSlide}
            className="rounded-full flex items-center justify-center transition-colors"
            style={{ width: '44px', height: '44px', flexShrink: 0, background: 'rgba(78,200,168,0.12)', border: '1px solid rgba(78,200,168,0.2)' }}
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft size={14} className="text-clay-mint" />
          </button>
          <button
            type="button"
            onClick={() => setIsAutoplayPaused((current) => !current)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors bg-gray-50 text-gray-700"
            style={{ minHeight: '44px' }}
            aria-pressed={isAutoplayPaused}
            aria-label={isAutoplayPaused ? 'Возобновить автопрокрутку слайдов' : 'Пауза автопрокрутки слайдов'}
          >
            {isAutoplayPaused ? 'Возобновить автопрокрутку' : 'Пауза слайдов'}
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="rounded-full flex items-center justify-center transition-colors"
            style={{ width: '44px', height: '44px', flexShrink: 0, background: 'rgba(78,200,168,0.12)', border: '1px solid rgba(78,200,168,0.2)' }}
            aria-label="Следующий слайд"
          >
            <ChevronRight size={14} className="text-clay-mint" />
          </button>
        </div>
      </div>
    </section>
  )
}
