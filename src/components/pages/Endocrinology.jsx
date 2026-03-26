import { ArrowRight, Activity, TrendingUp, Scale, CheckCircle, Zap, MessageCircle, Users, Clock } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'

export const ENDOCRINOLOGY_FAQ = [
  {
    question: 'Какие симптомы говорят о проблемах с щитовидной железой?',
    answer: 'Усталость без причины, набор веса при обычном питании, выпадение волос, зябкость, запоры, депрессия - могут указывать на гипотиреоз. Раздражительность, потливость, учащённое сердцебиение, похудение - на гипертиреоз. Для точного диагноза нужны анализы на ТТГ, Т3, Т4.',
  },
  {
    question: 'Какие анализы нужно сдать эндокринологу?',
    answer: 'На первичный приём достаточно прийти без анализов - врач назначит нужные по жалобам и осмотру. Чаще всего в работе используются ТТГ, свободный Т4, ферритин, витамин D, общий анализ крови, а при подозрении на нарушения углеводного обмена - глюкоза и HbA1c.',
  },
  {
    question: 'Можно ли похудеть с помощью эндокринолога?',
    answer: 'Если лишний вес связан с эндокринными причинами, их коррекция помогает улучшить самочувствие и упростить снижение массы тела. Эндокринолог не обещает быстрый результат, а разбирает причины набора веса и подбирает план по показаниям.',
  },
  {
    question: 'Как часто нужно проверять щитовидную железу?',
    answer: 'Здоровым людям - раз в 2–3 года. При выявленных нарушениях (гипотиреоз, узлы) - раз в 6–12 месяцев по назначению врача. Женщинам при планировании беременности - обязательно.',
  },
  {
    question: 'Нужно ли принимать йод для профилактики?',
    answer: 'Не всегда. Бесконтрольный приём йода при некоторых заболеваниях щитовидной железы (аутоиммунный тиреоидит) может навредить. Решение о приёме йода должен принимать врач на основании анализов.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /^эндокринолог/i.test(d.specialization)
)
const ENDOCRINOLOGY_PRICE_CATEGORY = getShortPriceCategoryBySlug('endocrinology')

const features = [
  {
    icon: <Activity size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Комплексная диагностика',
    subtitle: 'Смотрим шире одного анализа',
    desc: 'Анализируем жалобы, анамнез и только необходимые лабораторные показатели, чтобы понять причину симптомов без лишнего обследования.',
    badge: 'По показаниям',
  },
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-yellow',
    card: 'clay-card-soft-mint',
    title: 'Пошаговое наблюдение',
    subtitle: 'Сроки зависят от причины',
    desc: 'Первые изменения оцениваем на повторном визите. Сроки коррекции зависят от диагноза, исходных анализов и ответа на терапию.',
    badge: 'Контроль в динамике',
  },
  {
    icon: <Scale size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Работа с весом',
    subtitle: 'Без жёстких диет и обещаний',
    desc: 'Ищем медицинские причины набора веса и обсуждаем реалистичный план коррекции. Лекарственная поддержка назначается только при наличии показаний.',
    badge: 'Осознанный план',
  },
]

const symptoms = [
  'Постоянная усталость без причины',
  'Набор веса, который нельзя сбросить',
  'Нарушения сна (бессонница или сонливость)',
  'Выпадение волос',
  'Зябкость рук и ног',
  'Тревожность и перепады настроения',
  'Отёки',
  'Снижение либидо',
  'Ухудшение памяти и концентрации',
  'Сухость кожи',
]

const conditions = [
  { name: 'Гипотиреоз', color: 'clay-card-soft-blue' },
  { name: 'Гипертиреоз', color: 'clay-card-soft-peach' },
  { name: 'Диабет 2 типа', color: 'clay-card-soft-mint' },
  { name: 'Инсулинорезистентность', color: 'clay-card-soft-lavender' },
  { name: 'Дефицит витамина D', color: 'clay-card-soft-mint' },
  { name: 'Нарушения обмена веществ', color: 'clay-card-soft-peach' },
  { name: 'СПКЯ', color: 'clay-card-soft-blue' },
  { name: 'Нарушение обмена железа', color: 'clay-card-soft-lavender' },
]

export function Endocrinology() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-12">

        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(114,184,224,0.15)', color: '#4890C0' }}>
              <Activity size={12} />
              Эндокринология
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Эндокринология в Санкт-Петербурге:{' '}
              <span className="text-clay-blue">спокойный разбор</span> гормонов и обмена веществ
            </h1>
            <p className="text-lg text-clay-muted font-medium mb-3">
              Если усталость, вес или сон мешают повседневной жизни, разберём причины по анализам и симптомам
            </p>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Санкт-Петербург, Приморский район, Богатырский проспект. Удобно добираться от м. Комендантский проспект и м. Старая Деревня. Сначала ищем причину, затем обсуждаем план лечения без лишних обещаний.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #9CD4F0, #68B8E4)', boxShadow: '10px 10px 24px hsl(205, 12%, 60%), inset -4px -4px 9px hsla(205, 25%, 42%, 0.65), inset 0px 7px 14px hsla(205, 60%, 88%, 0.5)' }}>
                Записаться к эндокринологу
                <ArrowRight size={16} />
              </button>
              <a href="/prices" className="clay btn-clay-secondary">
                Посмотреть цены
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SYMPTOMS */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-blue p-6 md:p-8">
            <h2 className="text-xl font-extrabold text-clay-dark mb-2">Узнаёте себя?</h2>
            <p className="text-clay-muted text-sm mb-5">Если несколько симптомов сочетаются между собой, это повод обсудить гормональный и метаболический профиль на приёме</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {symptoms.map((s) => (
                <div key={s} className="flex items-center gap-2.5 bg-white/60 rounded-xl px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#72B8E0' }} />
                  <span className="text-sm text-clay-dark">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Наш подход к лечению</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Три принципа, которые помогают понять причину и не перегрузить вас лишними назначениями</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className={`clay ${f.card} p-6 flex flex-col`}>
                <div className={`${f.bg} mb-4`}>{f.icon}</div>
                <h3 className="font-bold text-clay-dark text-lg mb-1">{f.title}</h3>
                <p className="text-clay-blue text-sm font-semibold mb-3">{f.subtitle}</p>
                <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{f.desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start" style={{ background: 'rgba(114,184,224,0.15)', color: '#4880B0' }}>
                  <CheckCircle size={12} />
                  {f.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONDITIONS + APPROACH */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-extrabold text-clay-dark mb-4">С чем можно обратиться</h2>
              <p className="text-clay-muted text-sm leading-relaxed mb-5">
                Диагностика и лечение эндокринных нарушений с опорой на жалобы, осмотр и лабораторные данные
              </p>
              <div className="grid grid-cols-2 gap-3">
                {conditions.map((c) => (
                  <div key={c.name} className={`clay ${c.color} p-4 flex items-center gap-2`}>
                    <div className="w-2 h-2 rounded-full bg-clay-blue flex-shrink-0" />
                    <span className="text-sm font-semibold text-clay-dark">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-clay-dark mb-2">Как строится работа</h2>
              {[
                { n: '01', title: 'Первичная консультация', desc: 'Разбираем жалобы, историю болезни и результаты прошлых обследований. Не назначаем лишнего.' },
                { n: '02', title: 'Диагностика по показаниям', desc: 'Врач выбирает только те анализы и УЗИ, которые действительно помогут уточнить причину симптомов.' },
                { n: '03', title: 'Индивидуальный план', desc: 'Обсуждаем лечение, коррекцию дефицитов и, при необходимости, изменения питания и образа жизни.' },
                { n: '04', title: 'Контроль и корректировка', desc: 'Повторный визит помогает оценить динамику и при необходимости скорректировать терапию.' },
              ].map((s) => (
                <div key={s.n} className="clay clay-card flex items-start gap-4 p-4">
                  <div className="num-badge text-sm w-8 h-8 flex-shrink-0">{s.n}</div>
                  <div>
                    <p className="font-semibold text-clay-dark text-sm mb-0.5">{s.title}</p>
                    <p className="text-clay-muted text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DOCTORS */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Эндокринологи клиники</h2>
            <p className="text-clay-muted">Специалисты, которые помогут разобраться в причинах жалоб и подобрать план по показаниям</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SPECIALTY_DOCTORS.map((doc) => (
              <DoctorCard key={doc.slug} doctor={doc} />
            ))}
          </div>
        </div>
      </section>

      {/* PRICES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Ориентировочные цены на эндокринологию в СПб</h2>
            <p className="text-clay-muted">Точная стоимость зависит от объёма приёма и обследований, которые нужны по ситуации</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {ENDOCRINOLOGY_PRICE_CATEGORY.items.map((item) => (
              <div key={item.name} className="clay clay-card flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                <span className="text-clay-blue font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a href={ENDOCRINOLOGY_PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
              Полный прайс-лист →
            </a>
          </div>
        </div>
      </section>

      {/* INTERNAL LINKS */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-xl font-extrabold text-clay-dark mb-5">Полезные разделы</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="/doctors" className="clay clay-card-soft-blue p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <Users size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Наши эндокринологи</p>
                <p className="text-clay-muted text-xs leading-relaxed">Специалисты с доказательным подходом и клиническим опытом</p>
              </div>
            </a>
            <a href={ENDOCRINOLOGY_PRICE_CATEGORY.fullPriceHref} className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <CheckCircle size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Цены на услуги</p>
                <p className="text-clay-muted text-xs leading-relaxed">Официальный полный прайс-лист клиники по эндокринологии</p>
              </div>
            </a>
            <a href="/contacts" className="clay clay-card-soft-peach p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <Clock size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Как добраться</p>
                <p className="text-clay-muted text-xs leading-relaxed">Адрес, маршрут и ориентиры в Приморском районе</p>
              </div>
            </a>
            <button type="button" data-booking-btn="true" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow text-left">
              <MessageCircle size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Записаться на приём</p>
                <p className="text-clay-muted text-xs leading-relaxed">Поможем выбрать удобное время и формат визита</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-blue p-6 md:p-8 text-center">
            <TrendingUp size={40} className="text-clay-blue mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Нужен спокойный разбор гормонов и самочувствия?
            </h2>
            <p className="text-clay-muted mb-5 max-w-md mx-auto">
              Запишитесь на консультацию. Разберём жалобы, обсудим анализы и составим план без лишних обещаний.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #9CD4F0, #68B8E4)', boxShadow: '10px 10px 24px hsl(205, 12%, 60%), inset -4px -4px 9px hsla(205, 25%, 42%, 0.65), inset 0px 7px 14px hsla(205, 60%, 88%, 0.5)' }}>
                Записаться
                <ArrowRight size={16} />
              </button>
              <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="container-clay">
        <FaqSection items={ENDOCRINOLOGY_FAQ} title="Частые вопросы об эндокринологии" />
      </div>
    </div>
  )
}
