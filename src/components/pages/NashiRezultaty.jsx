import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  Heart,
  MapPin,
  Phone,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import { DOCTORS } from '../../lib/doctors-data.js'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { FadeInSection } from '../FadeInSection.jsx'

const KEY_STATS = [
  {
    icon: Activity,
    iconBg: 'icon-circle-mint',
    value: 1000,
    suffix: '+',
    label: 'процедур ВАБ выполнено',
    card: 'clay-card',
    color: 'text-clay-mint',
  },
  {
    icon: Award,
    iconBg: 'icon-circle-peach',
    value: 15,
    suffix: '+',
    label: 'лет клинического опыта главного врача',
    card: 'clay-card',
    color: 'text-clay-peach',
  },
  {
    icon: Users,
    iconBg: 'icon-circle-blue',
    value: 50,
    suffix: '+',
    label: 'врачей из других клиник прошли обучение',
    card: 'clay-card',
    color: 'text-clay-blue',
  },
  {
    icon: Heart,
    iconBg: 'icon-circle-lavender',
    value: 9,
    suffix: '',
    label: 'врачей-специалистов в команде',
    card: 'clay-card',
    color: 'text-clay-lavender',
  },
]

const PROCEDURES_BY_YEAR = [
  { year: '2020', count: 120, label: '120+' },
  { year: '2021', count: 180, label: '180+' },
  { year: '2022', count: 220, label: '220+' },
  { year: '2023', count: 250, label: '250+' },
  { year: '2024', count: 280, label: '280+' },
  { year: '2025', count: 200, label: '200+' },
]

const MAX_PROCEDURES = 280

const GEOGRAPHY = [
  { label: 'Санкт-Петербург и Ленинградская область', percent: 60, colorClass: 'bg-clay-mint' },
  { label: 'Москва и Московская область', percent: 15, colorClass: 'bg-clay-blue' },
  { label: 'Другие регионы России', percent: 15, colorClass: 'bg-clay-peach' },
  { label: 'Казахстан, Белоруссия', percent: 10, colorClass: 'bg-clay-lavender' },
]

const RATING_CARDS = [
  {
    platform: 'ПроДокторов',
    subLabel: 'Профиль клиники',
    reviewCount: 156,
    rating: 4.8,
    url: 'https://prodoctorov.ru/spb/lpu/72209-klinika-odntsova/',
    color: 'clay-card-soft-mint',
    starColor: 'var(--color-mint)',
    linkLabel: 'Читать на ПроДокторов',
  },
  {
    platform: 'Яндекс Карты',
    subLabel: 'Профиль клиники',
    reviewCount: 247,
    rating: 5.0,
    url: 'https://yandex.ru/maps/org/klinika_doktora_odintsova/124591604873/',
    color: 'clay-card-soft-peach',
    starColor: 'var(--color-peach)',
    linkLabel: 'Читать на Яндекс Картах',
  },
]

function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)
  const hasAnimated = useRef(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!isVisible) return
    const start = performance.now()
    let frame
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [isVisible, target, duration])
  return { count, ref }
}

function StatCard({ stat }) {
  const { count, ref } = useCountUp(stat.value)
  const Icon = stat.icon
  return (
    <div ref={ref} className={`clay ${stat.card} p-6 flex flex-col items-center text-center gap-3`}>
      <div className={`${stat.iconBg} clay flex items-center justify-center w-12 h-12`}>
        <Icon size={22} />
      </div>
      <div className={`text-5xl heading-serif ${stat.color} tabular-nums`}>
        {count}{stat.suffix}
      </div>
      <div className="text-clay-muted text-sm leading-snug">{stat.label}</div>
    </div>
  )
}

function ProcedureBar({ item, index }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.2 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const widthPercent = Math.round((item.count / MAX_PROCEDURES) * 100)
  return (
    <div ref={ref} className="grid gap-2 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-center">
      <div className="text-sm font-bold text-clay-dark sm:text-right">{item.year}</div>
      <div className="flex-1 bg-[color:var(--surface-muted)] rounded-full h-8 overflow-hidden">
        <div
          className="bg-clay-mint h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out"
          style={{
            width: visible ? `${widthPercent}%` : '0%',
            transitionDelay: `${index * 80}ms`,
          }}
        >
          <span className="text-xs font-bold text-white">{item.label}</span>
        </div>
      </div>
    </div>
  )
}

function GeographyBar({ item, index }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.2 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-clay-text font-medium">{item.label}</span>
        <span className="font-bold text-clay-dark ml-4 shrink-0">{item.percent}%</span>
      </div>
      <div className="bg-[color:var(--surface-muted)] rounded-full h-3 overflow-hidden">
        <div
          className={`${item.colorClass} h-full rounded-full transition-all duration-700 ease-out`}
          style={{
            width: visible ? `${item.percent}%` : '0%',
            transitionDelay: `${index * 100}ms`,
          }}
        />
      </div>
    </div>
  )
}

function StarRating({ rating, color }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < fullStars || (i === fullStars && hasHalf)
        return (
          <Star
            key={i}
            size={18}
            fill={filled ? color : 'none'}
            stroke={color}
          />
        )
      })}
    </div>
  )
}

function RatingCard({ card }) {
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`clay ${card.color} card-interactive p-6 flex flex-col gap-4 group hover:shadow-clay-lg transition-shadow duration-200`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-clay-muted mb-1">{card.platform}</div>
          <div className="text-lg font-extrabold text-clay-dark">{card.subLabel}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0 bg-white/60 rounded-xl px-3 py-1.5">
          <Star size={16} fill={card.starColor} stroke={card.starColor} />
          <span className="text-lg font-extrabold text-clay-dark">{card.rating}</span>
        </div>
      </div>
      <StarRating rating={card.rating} color={card.starColor} />
      <div className="text-clay-muted text-sm">{card.reviewCount}+ отзывов</div>
      <div className="flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all duration-150" style={{ color: card.starColor }}>
        {card.linkLabel}
        <ArrowRight size={14} />
      </div>
    </a>
  )
}

function TeamStats() {
  const totalDoctors = DOCTORS.length
  const avgExperience = Math.round(
    DOCTORS.reduce((sum, d) => sum + d.experienceYears, 0) / totalDoctors
  )
  const doctorsWithDegree = DOCTORS.filter((d) => d.degree).length
  const specializations = [
    ...new Set(DOCTORS.map((d) => d.specialization.split(',')[0].trim())),
  ].length
  const items = [
    { icon: Users, iconBg: 'icon-circle-mint', value: totalDoctors, label: 'специалистов в команде' },
    { icon: Calendar, iconBg: 'icon-circle-peach', value: avgExperience, suffix: '+', label: 'лет средний стаж врача' },
    { icon: TrendingUp, iconBg: 'icon-circle-blue', value: specializations, label: 'специализации охвачены' },
    { icon: Award, iconBg: 'icon-circle-lavender', value: doctorsWithDegree, label: 'доктора с учёной степенью' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="clay clay-card p-5 flex flex-col items-center text-center gap-2">
            <div className={`${item.iconBg} clay flex items-center justify-center w-10 h-10`}>
              <Icon size={18} />
            </div>
            <div className="text-3xl heading-serif text-clay-dark tabular-nums">
              {item.value}{item.suffix ?? ''}
            </div>
            <div className="text-clay-muted text-xs leading-snug">{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export function NashiRezultaty() {
  return (
    <div>
      <section className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl self-start text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Наши{' '}
                <span className="heading-accent">результаты</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-5 font-medium max-w-2xl">
                Статистика процедур, опыт команды, география пациентов и независимые рейтинги клиники.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                  <Phone size={16} />
                  {PHONE_DISPLAY}
                </a>
              </div>
            </div>
            <div className="clay-card p-5">
              <p className="text-sm font-semibold text-clay-dark mb-3">Что можно проверить</p>
              <div className="space-y-3 text-sm text-clay-muted">
                <div className="rounded-[14px] border border-[color:var(--border-color)] bg-[color:var(--surface-card-hover)] p-3">Динамика процедур ВАБ по годам</div>
                <div className="rounded-[14px] border border-[color:var(--border-color)] bg-[color:var(--surface-card-hover)] p-3">География пациентов и обращения из регионов</div>
                <div className="rounded-[14px] border border-[color:var(--border-color)] bg-[color:var(--surface-card-hover)] p-3">Отзывы на независимых площадках</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-2">
              Ключевые показатели
            </h2>
            <p className="text-clay-muted mb-8 max-w-xl">
              Опыт, накопленный с момента основания клиники в 2014 году.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {KEY_STATS.map((stat, i) => (
                <FadeInSection key={stat.label} staggerIndex={i} className="h-full">
                  <StatCard stat={stat} />
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-circle-mint clay flex items-center justify-center w-10 h-10">
                  <TrendingUp size={18} />
                </div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark">
                  Процедуры ВАБ по годам
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                {PROCEDURES_BY_YEAR.map((item, index) => (
                  <ProcedureBar key={item.year} item={item} index={index} />
                ))}
              </div>
              <p className="text-clay-muted text-xs mt-5">
                * 2025 год - данные за отчётный период, учёт продолжается.
              </p>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-circle-blue clay flex items-center justify-center w-10 h-10">
                <MapPin size={18} />
              </div>
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark">
                География пациентов
              </h2>
            </div>
            <div className="clay clay-card p-6 md:p-8 max-w-2xl">
              <div className="flex flex-col gap-6">
                {GEOGRAPHY.map((item, index) => (
                  <GeographyBar key={item.label} item={item} index={index} />
                ))}
              </div>
              <p className="text-clay-muted text-xs mt-6">
                Пациенты приезжают из других городов на консультацию и процедуру ВАБ, в том числе в рамках программы «Бесплатное второе мнение».
              </p>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-circle-peach clay flex items-center justify-center w-10 h-10">
                <Star size={18} />
              </div>
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark">
                Независимые рейтинги
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
              {RATING_CARDS.map((card, i) => (
                <FadeInSection key={card.platform} staggerIndex={i} className="h-full">
                  <RatingCard card={card} />
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-circle-lavender clay flex items-center justify-center w-10 h-10">
                <Users size={18} />
              </div>
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark">
                Наша команда в цифрах
              </h2>
            </div>
            <TeamStats />
            <div className="mt-6">
              <a href="/doctors" className="clay btn-clay-secondary gap-2 inline-flex items-center">
                Все врачи клиники
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-8 md:p-12 text-center max-w-2xl mx-auto">
              <div className="icon-circle-mint clay flex items-center justify-center w-14 h-14 mx-auto mb-5">
                <Heart size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                Готовы помочь
              </h2>
              <p className="text-clay-muted leading-relaxed mb-7 max-w-md mx-auto">
                Запишитесь на приём или задайте вопрос - ответим в день обращения.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-white gap-2 inline-flex items-center">
                  <Phone size={16} />
                  Позвонить
                </a>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>
    </div>
  )
}
