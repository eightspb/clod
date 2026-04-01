import { ArrowRight, CheckCircle, Clock, Shield, Zap, Heart, ChevronRight, Phone, MessageCircle, ChevronLeft, Star, User, Send, Award } from 'lucide-react'
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { DoctorCard } from '../DoctorCard.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { StarRating } from '../StarRating.jsx'
import { FILTER_TABS_SHORT, FILTER_BG_FLAT, matchesFilter } from '../../lib/filters.js'
import { SERVICES, WHY_ITEMS } from '../../lib/clinic-info.js'
import { PHONE_NUMBER, TELEGRAM_URL } from '../../lib/contacts.js'
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

const HOME_SERVICES = SERVICES.map((service) => {
  if (service.to === '/vab') {
    return {
      ...service,
      tag: 'Малоинвазивная процедура',
      desc: 'Вакуумная аспирационная биопсия под УЗ-контролем. Обсуждаем показания, объём вмешательства и наблюдение заранее.',
    }
  }

  if (service.to === '/gynecology') {
    return {
      ...service,
      tag: 'Приём по показаниям',
      desc: 'Бережный гинекологический приём с понятными объяснениями, без давления и лишних назначений.',
    }
  }

  if (service.to === '/endocrinology') {
    return {
      ...service,
      tag: 'Поэтапная диагностика',
      desc: 'Разбираем жалобы, анализы и динамику поэтапно. Без обещаний мгновенного результата.',
    }
  }

  if (service.to === '/nutrition') {
    return {
      ...service,
      desc: 'Помогаем выстроить питание с учётом анализов, жалоб и привычного ритма жизни.',
    }
  }

  if (service.to === '/mammology') {
    return {
      ...service,
      desc: 'Диагностика и лечение заболеваний молочной железы с понятным маршрутом пациента и опорой на показания.',
    }
  }

  return service
})

const HOME_WHY_ITEMS = WHY_ITEMS.map((item) => {
  if (item.title === 'Без боли и стресса') {
    return {
      ...item,
      title: 'Уважительный приём',
      desc: 'Спокойная коммуникация, аккуратный осмотр и понятные объяснения на каждом этапе.',
    }
  }

  if (item.title === 'Сервис без ожидания') {
    return {
      ...item,
      title: 'Понятные сроки',
      desc: 'Сообщаем, когда ждать результаты и какой шаг будет следующим.',
    }
  }

  if (item.title === 'Высокие технологии') {
    return {
      ...item,
      title: 'Технологии по делу',
      desc: 'Используем оборудование там, где оно действительно помогает в диагностике и лечении.',
    }
  }

  return {
    ...item,
    desc: 'Назначаем только обоснованные обследования и сохраняем спокойный, уважительный тон приёма.',
  }
})

const HOME_REASONS = [
  'Врачи объясняют решения простым языком и без давления',
  'Маршрут пациента строим от жалобы к следующему шагу',
  'По необходимости организуем очный приём в Санкт-Петербурге',
  'После приёма подсказываем, какие документы и результаты взять с собой',
]

const WHY_STATS = [
  { val: '30 мин', color: 'text-clay-mint', card: 'clay-card-soft-mint', label: 'типичная длительность ВАБ', desc: 'Процедура проходит амбулаторно, а дальнейшие рекомендации команда объясняет сразу после неё.' },
  { val: '9', color: 'text-clay-peach', card: 'clay-card-soft-peach', label: 'врачей в команде клиники', desc: 'Маммологи, гинекологи, эндокринологи и нутрициологи работают в одном маршруте пациента.' },
  { val: '2', color: 'text-clay-blue', card: 'clay-card-soft-blue', label: 'канала для связи с клиникой', desc: 'Сообщаем о готовности документов и подсказываем следующий шаг по телефону или в Telegram.' },
]

const WHY_ICONS = { Shield, Zap, Clock, Heart }
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const REVIEWS = [
  {
    id: 1,
    name: 'Анна Петрова',
    date: '12 января 2025',
    rating: 5,
    text: 'Обратилась с направлением на операцию из другой клиники. Здесь спокойно перепроверили документы, объяснили варианты и предложили малоинвазивное решение по показаниям.',
  },
  {
    id: 2,
    name: 'Марина Соколова',
    date: '3 февраля 2025',
    rating: 5,
    text: 'На приёме по гинекологии всё объяснили спокойно, без давления и лишних назначений. Понравилось, что сразу обозначили следующий шаг.',
  },
  {
    id: 3,
    name: 'Елена Кузнецова',
    date: '18 февраля 2025',
    rating: 5,
    text: 'Эндокринолог помогла собрать анализы в понятную картину и дала спокойный план наблюдения. Всё прошло без спешки и лишних обещаний.',
  },
  {
    id: 4,
    name: 'Ольга Иванова',
    date: '5 марта 2025',
    rating: 5,
    text: 'На приёме по нутрициологии разобрали питание и дефициты без жёстких схем. Понравился спокойный, уважительный тон.',
  },
]

function CountUp({ target, suffix = '' }) {
  const ref = useRef(null)
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [started])
  useEffect(() => {
    if (!started) return
    const duration = 1500
    const startTime = performance.now()
    function animate(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [started, target])
  return <span ref={ref}>{count}{suffix}</span>
}

function ReviewStars({ count = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} fill="currentColor" className="text-clay-peach" />
      ))}
    </div>
  )
}

function ReviewsSection() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
            Отзывы пациентов
          </h2>
          <p className="text-clay-muted max-w-xl mx-auto">
            Реальные истории людей, которые выбрали доказательную медицину
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {REVIEWS.map((review) => (
            <div key={review.id} className="clay clay-card p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="icon-circle-peach flex-shrink-0">
                    <User size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-clay-dark text-sm">{review.name}</p>
                    <p className="text-xs text-clay-muted">{review.date}</p>
                  </div>
                </div>
                <ReviewStars count={review.rating} />
              </div>
              <p className="text-clay-muted text-sm leading-relaxed flex-1">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AppointmentFormSection() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setName('')
      setPhone('')
    }, 800)
  }

  return (
    <section id="appointment-form" className="section">
      <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8 relative overflow-hidden max-w-2xl mx-auto">
          <div className="blob-mint absolute -top-10 -right-10 w-40 h-40 opacity-30 pointer-events-none" />
          <div className="blob-peach absolute -bottom-10 -left-10 w-32 h-32 opacity-25 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-3 badge-specialty-mint">
                <Phone size={12} />
                Запись онлайн
              </div>
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-2">
                Записаться на приём
              </h2>
              <p className="text-clay-muted">
                Оставьте контакты - администратор свяжется с вами в рабочее время
              </p>
            </div>

            {isSubmitted ? (
              <div className="clay clay-card-soft-mint p-6 text-center">
                <CheckCircle size={40} className="text-clay-mint mx-auto mb-3" />
                <p className="font-bold text-clay-dark text-lg mb-1">Заявка принята!</p>
                <p className="text-clay-muted text-sm">Мы свяжемся с вами в рабочее время и согласуем удобный формат связи.</p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-4 text-sm text-clay-mint-dark font-semibold hover:underline"
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="appt-name" className="text-sm font-semibold text-clay-dark">
                    Ваше имя
                  </label>
                  <input
                    id="appt-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например, Анна"
                    required
                    className="clay clay-card px-4 py-3 text-sm text-clay-dark placeholder:text-clay-muted focus:ring-2 focus:ring-clay-mint focus:ring-offset-2 w-full"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="appt-phone" className="text-sm font-semibold text-clay-dark">
                    Телефон
                  </label>
                  <input
                    id="appt-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    required
                    className="clay clay-card px-4 py-3 text-sm text-clay-dark placeholder:text-clay-muted focus:ring-2 focus:ring-clay-mint focus:ring-offset-2 w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !phone.trim()}
                  className="clay btn-clay-primary gap-2 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>Отправляем...</>
                  ) : (
                    <>
                      <Send size={16} />
                      Записаться
                    </>
                  )}
                </button>
                <p className="text-xs text-clay-muted text-center">
                  Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function Home({ doctorsData = [] }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [sliderHeight, setSliderHeight] = useState(0)
  const slideRefs = useRef([])
  const [activeFilter, setActiveFilter] = useState('all')
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

  const filteredDoctors = useMemo(
    () => doctorsData.filter((doc) => matchesFilter(doc, activeFilter)),
    [doctorsData, activeFilter]
  )

  return (
    <ErrorBoundary>
    <div>
      {/* ── HERO SLIDER ── */}
      <section className="relative overflow-hidden grain-overlay">
        <div className="absolute inset-0 hero-gradient pointer-events-none" style={{ zIndex: 0 }} />
        {/* Фоновые блобы */}
        <div className="blob-mint absolute top-12 -left-32 w-96 h-96 opacity-20 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="blob-peach absolute -bottom-24 -right-24 w-80 h-80 opacity-15 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="blob-blue absolute top-1/3 -right-40 w-72 h-72 opacity-10 pointer-events-none" style={{ zIndex: 0 }} />

        <div className="container-clay relative z-10 py-8 md:py-14">
          {/* Слайды */}
          <div className="relative" style={{ minHeight: sliderHeight > 0 ? `${sliderHeight}px` : undefined }}>
            {heroSlides.map((slide, idx) => {
              const isActive = activeSlide === idx

              return (
              <div
                key={idx}
                ref={(el) => { slideRefs.current[idx] = el }}
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
                  {/* ── Левая колонка: текст ── */}
                  <div>
                    {/* Верхние плашки - всегда друг под другом */}
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
                      <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5" style={{ lineHeight: '1.15' }}>
                        {slide.title}
                      </h1>
                    ) : (
                      <div role="heading" aria-level="1" aria-hidden="true" className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5" style={{ lineHeight: '1.15' }}>
                        {slide.title}
                      </div>
                    )}

                    <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-5 max-w-lg" style={{ lineHeight: '1.75' }}>
                      {slide.desc}
                    </p>

                    {/* CTA кнопки */}
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

                  {/* ── Правая колонка: крупная карточка врача ── */}
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

          {/* Dot indicators */}
          <div className="flex justify-center items-center gap-2.5 mt-8" role="tablist" aria-label="Слайды">
            {heroSlides.map((_, idx) => (
              <button
                type="button"
                key={idx}
                role="tab"
                onClick={() => goToSlide(idx)}
                aria-label={`Слайд ${idx + 1}`}
                aria-selected={activeSlide === idx}
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
          {/* Slider controls */}
          <div className="flex justify-center items-center gap-3 mt-3">
            <button
              type="button"
              onClick={prevSlide}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(78,200,168,0.12)', border: '1px solid rgba(78,200,168,0.2)' }}
              aria-label="Предыдущий слайд"
            >
              <ChevronLeft size={14} className="text-clay-mint" />
            </button>
            <button
              type="button"
              onClick={() => setIsAutoplayPaused((current) => !current)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors bg-gray-50 text-gray-700"
              aria-pressed={isAutoplayPaused}
              aria-label={isAutoplayPaused ? 'Возобновить автопрокрутку слайдов' : 'Пауза автопрокрутки слайдов'}
            >
              {isAutoplayPaused ? 'Возобновить автопрокрутку' : 'Пауза слайдов'}
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(78,200,168,0.12)', border: '1px solid rgba(78,200,168,0.2)' }}
              aria-label="Следующий слайд"
            >
              <ChevronRight size={14} className="text-clay-mint" />
            </button>
          </div>
        </div>
      </section>

      {/* ── БЕСПЛАТНОЕ ВТОРОЕ МНЕНИЕ ── */}
      <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-peach p-0 relative overflow-hidden">
            <div className="blob-peach absolute -top-10 -right-10 w-40 h-40 opacity-20 pointer-events-none" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch">
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 uppercase tracking-wider badge-specialty-peach">
                  <Shield size={12} />
                  Бесплатно
                </div>
                <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                  Второе мнение по маммологии
                </h2>
                <p className="text-clay-muted leading-relaxed mb-4">
                  Если вам назначили операцию — перепроверим документы, обсудим тактику и объясним, нужна ли она на самом деле.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                    <span className="text-sm text-clay-dark">Разбираем снимки, заключения и результаты анализов</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                    <span className="text-sm text-clay-dark">Объясняем следующий шаг понятным языком</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                    <span className="text-sm text-clay-dark">Для пациентов из любого региона России</span>
                  </div>
                </div>
                <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                  Проверить, нужна ли операция
                  <ArrowRight size={16} />
                </a>
              </div>
              <img
                src="/images/vab-alternative.png"
                alt="Второе мнение по маммологии"
                width={400}
                height={400}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* ── ВАБ FLAGSHIP ── */}
      <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-mint p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/10 translate-y-1/2" />
            <div className="relative z-10">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/70 text-clay-dark text-xs font-bold mb-4 uppercase tracking-wider border border-white/80">
                Маммология и ВАБ
              </div>
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                Вакуумная аспирационная биопсия по показаниям
              </h2>
              <p className="text-clay-text text-lg mb-2">Помогаем пройти путь от диагностики до малоинвазивного лечения в одном месте.</p>
              <p className="text-clay-muted text-sm mb-5">Контроль под УЗИ, понятный маршрут для пациента и обсуждение дальнейшего наблюдения заранее.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-xl border border-white/80">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#EAF7F4] shadow-inner flex items-center justify-center flex-shrink-0">
                      <Zap size={24} className="text-[#2A9E80]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[#1a2f26] mb-1.5 text-lg">ВАБ под УЗ-контролем</h3>
                      <p className="text-[#3D4A44] text-sm leading-relaxed font-medium">Малоинвазивная процедура в маммологии, где заранее обсуждаем показания, объём вмешательства и наблюдение.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-xl border border-white/80">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#EAF7F4] shadow-inner flex items-center justify-center flex-shrink-0">
                      <Clock size={24} className="text-[#2A9E80]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[#1a2f26] mb-1.5 text-lg">Амбулаторно за 30 минут</h3>
                      <p className="text-[#3D4A44] text-sm leading-relaxed font-medium">Процедура проходит без госпитализации. Дальнейшие рекомендации обсуждаем сразу после неё.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <a href="/vab" className="clay btn-clay-white text-sm py-3 px-6 shadow-lg">
                  Подробнее о ВАБ
                  <ArrowRight size={16} />
                </a>
                <a href="/prices" className="clay btn-clay-secondary text-sm py-3 px-6 shadow-lg">
                  Узнать стоимость
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* ── SERVICES ── */}
      <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">Направления клиники</h2>
            <p className="text-clay-muted max-w-xl mx-auto">Понятный маршрут от первичного обращения до следующего шага без лишнего давления</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {HOME_SERVICES.map((s, i) => (
              <FadeInSection key={s.to} staggerIndex={i} className="h-full">
              <a href={s.to} className="group block">
                <div className={`clay ${s.color} card-interactive p-6 h-full flex flex-col transition-transform duration-200 group-hover:-translate-y-1`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`${s.iconBg} text-2xl`}>
                        <span>{s.icon}</span>
                      </div>
                      <div>
                        {s.tag && <span className="stat-pill text-xs mb-1 block w-fit">{s.tag}</span>}
                        <h3 className="font-bold text-clay-dark text-lg leading-tight">{s.title}</h3>
                      </div>
                    </div>
                    <div className="clay clay-card px-3 py-1.5 text-center">
                      <p className="font-extrabold text-clay-mint-dark text-base leading-none">{s.stat}</p>
                      <p className="text-clay-muted text-xs">{s.statLabel}</p>
                    </div>
                  </div>
                  <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{s.desc}</p>
                  <div className="flex items-center gap-1 text-clay-mint-dark text-sm font-semibold">
                    Подробнее <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </a>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* ── WHY US ── */}
      <FadeInSection>
      <section className="section" style={{ background: 'var(--surface-accent)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="badge-specialty-mint-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
                <Shield size={12} />
                Наши гарантии
              </div>
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-4">
                Почему выбирают<br />
                <span className="heading-accent">Клинику Одинцова</span>
              </h2>
              <p className="text-clay-muted leading-relaxed mb-8">
                Мы не просто лечим - мы помогаем вам принимать осознанные решения. Доказательная медицина, современные технологии и уважение к вашему времени.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {HOME_WHY_ITEMS.map((item) => {
                  const Icon = WHY_ICONS[item.iconName]
                  return (
                    <div key={item.title} className="clay clay-card card-interactive p-4 flex items-start gap-3">
                      <div className={item.bg}><Icon size={20} className="text-white" /></div>
                      <div>
                        <h3 className="font-bold text-clay-dark text-sm mb-1">{item.title}</h3>
                        <p className="text-clay-muted text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="space-y-4">
              {WHY_STATS.map((s) => (
                <div key={s.val} className={`clay ${s.card} p-6`}>
                  <div className="flex items-start gap-4">
                    <div className={`font-serif font-light text-4xl sm:text-5xl text-clay-dark leading-none`}>{s.val}</div>
                    <div>
                      <p className="font-bold text-clay-dark mb-1">{s.label}</p>
                      <p className="text-clay-muted text-sm leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* ── DOCTORS ── */}
      <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">Наши доктора</h2>
            <p className="text-clay-muted">Онкологи-маммологи, гинекологи, эндокринологи и нутрициологи - все владеют УЗИ</p>
          </div>

          {/* Фильтр-таблетки */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {FILTER_TABS_SHORT.map((tab, i) => {
              const isActive = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className="inline-flex items-center justify-center rounded-full text-sm font-semibold px-6 py-2.5 cursor-pointer transition-all duration-200 select-none"
                  style={isActive ? {
                    background: 'linear-gradient(145deg, #68D8B8, #44C4A0)',
                    color: '#fff',
                    boxShadow: '8px 8px 20px hsl(155,12%,60%), inset -3px -3px 8px hsla(155,25%,42%,0.6), inset 0px 6px 12px hsla(155,60%,88%,0.5)',
                  } : {
                    background: FILTER_BG_FLAT[i % FILTER_BG_FLAT.length],
                    color: '#3D4A44',
                    boxShadow: '6px 6px 16px hsl(0,0%,72%), inset -3px -3px 7px hsla(0,0%,55%,0.18), inset 0px 5px 10px hsla(0,0%,100%,0.7)',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Карточки докторов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
            {filteredDoctors.map((doc, i) => (
              <FadeInSection key={doc.slug || doc.name} staggerIndex={i} className="h-full">
                <DoctorCard doctor={doc} />
              </FadeInSection>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-12 text-clay-muted">
              Доктора по выбранному направлению не найдены
            </div>
          )}

          <div className="text-center mt-8">
            <a href="/doctors" className="clay btn-clay-secondary gap-2">
              Все доктора клиники
              <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </section>
      </FadeInSection>



      {/* ── ПРЯМАЯ СВЯЗЬ ── */}
      <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-mint p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 uppercase tracking-wider badge-specialty-mint">
                  <MessageCircle size={12} />
                  Прямая связь
                </div>
                <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                  Связь с лечащим врачом
                </h2>
                <p className="text-clay-muted leading-relaxed mb-4">
                  После процедуры лечащий врач остаётся на связи. Если появятся вопросы, мы поможем с ними в день обращения и подскажем дальнейший шаг.
                </p>
                <div className="space-y-3">
                  {HOME_REASONS.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle size={16} className="text-clay-mint flex-shrink-0" />
                      <span className="text-sm text-clay-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="clay clay-card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="icon-circle-mint">
                    <Phone size={18} className="text-white" />
                  </div>
                <div>
                  <p className="font-bold text-clay-dark">Записаться на приём</p>
                  <p className="text-xs text-clay-muted">Подскажем удобный формат связи</p>
                </div>
              </div>
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2 justify-center">
                  <Phone size={16} />
                  Позвонить
                </a>
                <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2 justify-center" target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} />
                  Написать в Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* ── REVIEWS ── */}
      <FadeInSection>
        <ReviewsSection />
      </FadeInSection>

      {/* ── APPOINTMENT FORM ── */}
      <FadeInSection>
        <AppointmentFormSection />
      </FadeInSection>

      {/* ── CTA ── */}
      <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8 text-center relative overflow-hidden">
            <div className="blob-peach absolute -top-10 -right-10 w-40 h-40 opacity-50 pointer-events-none" />
            <div className="blob-mint absolute -bottom-10 -left-10 w-40 h-40 opacity-40 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                Не знаете, к кому обратиться?
              </h2>
              <p className="text-clay-muted text-lg mb-5 max-w-xl mx-auto">
                Позвоните нам или напишите в мессенджер - поможем с маршрутом и подскажем, с чего лучше начать.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                  <Phone size={16} />
                  Позвонить
                </a>
                <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} />
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeInSection>
    </div>
    </ErrorBoundary>
  )
}
