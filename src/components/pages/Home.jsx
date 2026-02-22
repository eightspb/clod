import { ArrowRight, CheckCircle, Clock, Shield, Zap, Heart, ChevronRight, Phone, MessageCircle, ChevronLeft, Star } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ClayContactBanner } from '../ClayContactBanner'
import { DoctorCard } from '../DoctorCard.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import { FILTER_TABS_SHORT, FILTER_BG_FLAT, matchesFilter } from '../../lib/filters.js'
import { SERVICES, WHY_ITEMS } from '../../lib/clinic-info.js'
import { PHONE_NUMBER, TELEGRAM_URL } from '../../lib/contacts.js'


const heroSlides = [
  {
    trustBadge: 'Технология 2024 года',
    badge: 'Хирургия без скальпеля — это реальность',
    title: <>Удаление образований груди<br /><span style={{ color: '#4EC8A8' }}>без операции и шрамов</span></>,
    desc: 'Боитесь скальпеля и общего наркоза? Технология ВАБ EnCor — это прокол 2 мм вместо разреза 5 см. Процедура занимает 30 минут, вы уходите домой в тот же день.',
    stats: [
      { val: '30', unit: 'мин', label: 'процедура' },
      { val: '2', unit: 'мм', label: 'прокол' },
      { val: '0', unit: '', label: 'швов и шрамов' },
    ],
    primaryBtn: { label: 'Записаться на ВАБ', href: '/second-opinion' },
    secondaryBtn: { label: 'Рассчитать стоимость', href: '/mammology' },
    visual: 'vab',
  },
  {
    trustBadge: 'Доказательная медицина',
    badge: 'Для тех, кому уже назначили операцию',
    title: <>Бесплатный экспертный<br /><span style={{ color: '#4EC8A8' }}>аудит вашего диагноза</span></>,
    desc: 'Получили направление на операцию в другой клинике? Мы перепроверим снимки и заключения. Каждый третий случай решается без операции — методом ВАБ за 30 минут.',
    stats: [
      { val: '0', unit: '₽', label: 'стоимость аудита' },
      { val: '1/3', unit: '', label: 'избегают операции' },
      { val: '48', unit: 'ч', label: 'срок проверки' },
    ],
    primaryBtn: { label: 'Загрузить документы', href: '/second-opinion' },
    secondaryBtn: { label: 'Записаться на приём', href: '/second-opinion' },
    visual: 'opinion',
  },
  {
    trustBadge: 'Премиальный сервис',
    badge: 'Здоровье как инвестиция в качество жизни',
    title: <>Гинекология, эндокринология<br /><span style={{ color: '#4EC8A8' }}>и неврология без боли</span></>,
    desc: 'Бережный осмотр без дискомфорта, точная настройка гормонального баланса, жизнь без мигреней. Атмосфера пятизвёздочного отеля, а не больницы.',
    stats: [
      { val: '0%', unit: '', label: 'гипердиагностики' },
      { val: '15+', unit: '', label: 'лет стаж докторов' },
      { val: '1–3', unit: '', label: 'визита до результата' },
    ],
    primaryBtn: { label: 'Выбрать специалиста', href: '/gynecology' },
    secondaryBtn: { label: 'Все направления', href: '/mammology' },
    visual: 'ecosystem',
  },
]

const WHY_ICONS = { Shield, Zap, Clock, Heart }

function HeroVisualVab() {
  return (
    <div className="clay clay-card-soft-mint p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3 mb-1">
        <div className="icon-circle-mint">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-clay-dark text-sm">Система XISHAN (Сишань)</p>
          <p className="text-xs text-clay-muted">Роботизированное удаление под УЗИ-контролем</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(78,200,168,0.15)' }}>
          <span className="text-lg font-extrabold" style={{ color: '#4EC8A8' }}>·</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-clay-dark">Прокол ВАБ</span>
            <span className="text-xs font-bold" style={{ color: '#4EC8A8' }}>2 мм</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(78,200,168,0.15)' }}>
            <div className="h-1.5 rounded-full" style={{ width: '4%', background: '#4EC8A8' }} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(240,168,136,0.15)' }}>
          <span className="text-lg font-extrabold" style={{ color: '#E8906A' }}>—</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-clay-dark">Обычный разрез</span>
            <span className="text-xs font-bold" style={{ color: '#E8906A' }}>5 см</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(240,168,136,0.15)' }}>
            <div className="h-1.5 rounded-full" style={{ width: '100%', background: '#F0A888' }} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <CheckCircle size={14} style={{ color: '#4EC8A8' }} />
        <span className="text-xs text-clay-muted">Заживление за 2 месяца без следов</span>
      </div>
    </div>
  )
}

function HeroVisualOpinion() {
  return (
    <div className="clay clay-card-soft-blue p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3 mb-1">
        <div className="icon-circle-blue">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-clay-dark text-sm">Экспертный аудит диагноза</p>
          <p className="text-xs text-clay-muted">Анализ снимков и заключений</p>
        </div>
      </div>
      <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-clay-dark">Категория BI-RADS</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#4E9EC8' }}>3 → Пересмотр</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[1,2,3,4,5].map((n) => (
            <div
              key={n}
              className="h-6 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{
                background: n <= 3 ? (n === 3 ? '#4E9EC8' : 'rgba(78,158,200,0.25)') : 'rgba(61,74,68,0.08)',
                color: n <= 3 ? (n === 3 ? '#fff' : '#4E9EC8') : '#9BA8A2',
              }}
            >
              {n}
            </div>
          ))}
        </div>
        <p className="text-xs text-clay-muted mt-2">Доказательный подход к классификации</p>
      </div>
      <div className="flex flex-col gap-2">
        {['Загрузить МРТ / УЗИ', 'Загрузить заключение доктора', 'Получить экспертное мнение'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#4EC8A8' }}>
              {i + 1}
            </div>
            <span className="text-xs text-clay-dark">{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroVisualEcosystem() {
  const directions = [
    { icon: '🌸', name: 'Гинекология', color: '#F0A888', bg: 'rgba(240,168,136,0.12)', tag: 'Без боли' },
    { icon: '⚡', name: 'Эндокринология', color: '#4E9EC8', bg: 'rgba(78,158,200,0.12)', tag: 'Энергия' },
    { icon: '🧠', name: 'Неврология', color: '#9B8EC8', bg: 'rgba(155,142,200,0.12)', tag: 'Без мигреней' },
  ]
  return (
    <div className="clay clay-card-soft-peach p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3 mb-1">
        <div className="icon-circle-peach">
          <Heart size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-clay-dark text-sm">Экосистема здоровья</p>
          <p className="text-xs text-clay-muted">Три направления — один стандарт качества</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {directions.map((d) => (
          <div key={d.name} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: d.bg }}>
              {d.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-clay-dark">{d.name}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: d.bg, color: d.color }}>
              {d.tag}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Star size={13} style={{ color: '#F0A888' }} />
        <span className="text-xs text-clay-muted">Спокойная дружелюбная атмосфера</span>
      </div>
    </div>
  )
}


export function Home({ doctorsData = [] }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [sliderHeight, setSliderHeight] = useState(0)
  const slideRefs = useRef([])
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    const updateHeight = () => {
      const heights = slideRefs.current.map((el) => el?.offsetHeight ?? 0)
      const max = Math.max(...heights)
      if (max > 0) setSliderHeight(max)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  function goToSlide(idx) {
    setActiveSlide(idx)
  }

  function prevSlide() {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }

  function nextSlide() {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length)
  }

  const filteredDoctors = useMemo(
    () => doctorsData.filter((doc) => matchesFilter(doc, activeFilter)),
    [doctorsData, activeFilter]
  )

  return (
    <ErrorBoundary>
    <div>
      {/* ── HERO SLIDER ── */}
      <section className="relative overflow-hidden">
        {/* Фоновые блобы */}
        <div className="blob-mint absolute -top-32 -left-32 w-96 h-96 opacity-20 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="blob-peach absolute -bottom-24 -right-24 w-80 h-80 opacity-15 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="blob-blue absolute top-1/3 -right-40 w-72 h-72 opacity-10 pointer-events-none" style={{ zIndex: 0 }} />

        <div className="container-clay relative z-10 py-12 md:py-20">
          {/* Слайды */}
          <div className="relative" style={{ minHeight: sliderHeight > 0 ? `${sliderHeight}px` : undefined }}>
            {heroSlides.map((slide, idx) => (
              <div
                key={idx}
                ref={(el) => { slideRefs.current[idx] = el }}
                className="transition-opacity duration-500"
                style={{
                  opacity: activeSlide === idx ? 1 : 0,
                  position: sliderHeight > 0 ? 'absolute' : 'relative',
                  top: 0,
                  left: 0,
                  width: '100%',
                  pointerEvents: activeSlide === idx ? 'auto' : 'none',
                  visibility: activeSlide === idx ? 'visible' : 'hidden',
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                  {/* ── Левая колонка: текст ── */}
                  <div>
                    {/* Плашка доверия */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 uppercase tracking-wider" style={{ background: 'rgba(78,200,168,0.1)', border: '1px solid rgba(78,200,168,0.25)', color: '#2BA888' }}>
                      <CheckCircle size={12} />
                      {slide.trustBadge}
                    </div>

                    {/* Смысловой вектор */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-5 text-clay-muted" style={{ background: 'rgba(61,74,68,0.06)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-clay-mint animate-pulse" />
                      {slide.badge}
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5" style={{ lineHeight: '1.15' }}>
                      {slide.title}
                    </h1>

                    <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-8 max-w-lg" style={{ lineHeight: '1.75' }}>
                      {slide.desc}
                    </p>

                    {/* CTA кнопки */}
                    <div className="flex flex-wrap gap-3 mb-10">
                      <a href={slide.primaryBtn.href} className="clay btn-clay-primary gap-2">
                        {slide.primaryBtn.label}
                        <ArrowRight size={16} />
                      </a>
                      <a href={slide.secondaryBtn.href} className="clay btn-clay-secondary">
                        {slide.secondaryBtn.label}
                      </a>
                    </div>
                  </div>

                  {/* ── Правая колонка: визуальный блок ── */}
                  <div className="flex flex-col gap-4">
                    {/* Цифровой блок */}
                    <div className="clay clay-card p-6">
                      <div className="grid grid-cols-3 gap-4">
                        {slide.stats.map((s) => (
                          <div key={s.label} className="text-center">
                            <div className="flex items-end justify-center gap-0.5 mb-1">
                              <span className="text-3xl sm:text-4xl font-extrabold text-clay-dark leading-none">{s.val}</span>
                              {s.unit && <span className="text-lg font-bold pb-0.5" style={{ color: '#4EC8A8' }}>{s.unit}</span>}
                            </div>
                            <p className="text-xs text-clay-muted leading-tight">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Визуальная карточка — уникальная для каждого слайда */}
                    {slide.visual === 'vab' && <HeroVisualVab />}
                    {slide.visual === 'opinion' && <HeroVisualOpinion />}
                    {slide.visual === 'ecosystem' && <HeroVisualEcosystem />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Навигация */}
          <div className="flex items-center gap-4 mt-10">
            <button
              onClick={prevSlide}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(78,200,168,0.12)', border: '1px solid rgba(78,200,168,0.2)' }}
              aria-label="Предыдущий слайд"
            >
              <ChevronLeft size={16} className="text-clay-mint" />
            </button>
            <div className="flex items-center gap-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Слайд ${idx + 1}`}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: activeSlide === idx ? '28px' : '8px',
                    height: '8px',
                    background: activeSlide === idx ? '#4EC8A8' : 'rgba(78,200,168,0.3)',
                  }}
                />
              ))}
            </div>
            <button
              onClick={nextSlide}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(78,200,168,0.12)', border: '1px solid rgba(78,200,168,0.2)' }}
              aria-label="Следующий слайд"
            >
              <ChevronRight size={16} className="text-clay-mint" />
            </button>
            {/* Счётчик слайдов */}
            <span className="text-xs text-clay-muted ml-2 font-medium">
              {activeSlide + 1} / {heroSlides.length}
            </span>
          </div>
        </div>
      </section>

      {/* ── ВАБ FLAGSHIP ── */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-mint p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/10 translate-y-1/2" />
            <div className="relative z-10">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/25 text-white text-xs font-bold mb-4 uppercase tracking-wider">
                Флагман клиники
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3">
                Удаление образований в груди за 30 минут
              </h2>
              <p className="text-white/90 text-lg mb-8">Без скальпеля и швов. Прокол 2 мм полностью заживает за 2 месяца.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/20 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                      <Zap size={18} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Технология ВАБ</h4>
                      <p className="text-white/85 text-sm leading-relaxed">Роботизированное удаление опухоли до 3 см под контролем УЗИ. В 10 раз информативнее обычной пункции.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/20 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                      <Shield size={18} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Бесплатное второе мнение</h4>
                      <p className="text-white/85 text-sm leading-relaxed">Если вам уже назначили операцию — мы перепроверим диагноз. Каждый 3-й случай решается с ВАБ.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="/vab" className="clay btn-clay-white text-sm py-3">
                  Подробнее о ВАБ
                  <ArrowRight size={14} />
                </a>
                <a href="/second-opinion" className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-colors">
                  Бесплатное второе мнение
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">Направления клиники</h2>
            <p className="text-clay-muted max-w-xl mx-auto">Комплексная помощь по ключевым направлениям — от диагностики до результата</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {SERVICES.map((s) => (
              <a key={s.to} href={s.to} className="group block">
                <div className={`clay ${s.color} p-6 h-full flex flex-col transition-transform duration-200 group-hover:-translate-y-1`}>
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
                      <p className="font-extrabold text-clay-mint text-base leading-none">{s.stat}</p>
                      <p className="text-clay-muted text-xs">{s.statLabel}</p>
                    </div>
                  </div>
                  <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{s.desc}</p>
                  <div className="flex items-center gap-1 text-clay-mint text-sm font-semibold">
                    Подробнее <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-4">
                Почему выбирают<br />
                <span className="text-clay-mint">Клинику Одинцова</span>
              </h2>
              <p className="text-clay-muted leading-relaxed mb-8">
                Мы не просто лечим — мы помогаем вам принимать осознанные решения. Доказательная медицина, современные технологии и уважение к вашему времени.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WHY_ITEMS.map((item) => {
                  const Icon = WHY_ICONS[item.iconName]
                  return (
                    <div key={item.title} className="clay clay-card p-4 flex items-start gap-3">
                      <div className={item.bg}><Icon size={20} className="text-white" /></div>
                      <div>
                        <h4 className="font-bold text-clay-dark text-sm mb-1">{item.title}</h4>
                        <p className="text-clay-muted text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="space-y-4">
              {[
                { val: '1/3', color: 'text-clay-mint', card: 'clay-card-soft-mint', label: 'пациентов избегают операции', desc: 'Каждый третий пациент, пришедший с направлением на операцию из другой клиники, решает проблему с помощью ВАБ за 30 минут.' },
                { val: '15+', color: 'text-clay-peach', card: 'clay-card-soft-peach', label: 'лет средний стаж докторов', desc: 'Работаем только с экспертами, прошедшими обучение в ведущих клиниках России и Европы.' },
                { val: '24ч', color: 'text-clay-blue', card: 'clay-card-soft-blue', label: 'результаты анализов', desc: 'Все результаты приходят на ваш телефон. Личный кабинет с доступом из любой точки мира.' },
              ].map((s) => (
                <div key={s.val} className={`clay ${s.card} p-6`}>
                  <div className="flex items-start gap-4">
                    <div className={`text-4xl font-extrabold ${s.color} leading-none`}>{s.val}</div>
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

      {/* ── DOCTORS ── */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">Наши доктора</h2>
            <p className="text-clay-muted">Онкологи-маммологи, гинекологи и эндокринологи — все владеют УЗИ</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <DoctorCard key={doc.slug || doc.name} doctor={doc} />
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



      {/* ── CTA ── */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-8 md:p-12 text-center relative overflow-hidden">
            <div className="blob-peach absolute -top-10 -right-10 w-40 h-40 opacity-50 pointer-events-none" />
            <div className="blob-mint absolute -bottom-10 -left-10 w-40 h-40 opacity-40 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">
                Не знаете, к кому обратиться?
              </h2>
              <p className="text-clay-muted text-lg mb-8 max-w-xl mx-auto">
                Позвоните нам или напишите в мессенджер — поможем разобраться и направим к нужному специалисту.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-primary gap-2">
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
    </div>
    </ErrorBoundary>
  )
}

