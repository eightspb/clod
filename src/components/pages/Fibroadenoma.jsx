import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { ResponsiveDoctorCollection } from '../ResponsiveDoctorCollection.jsx'
import { ResponsiveDoctorHero } from '../ResponsiveDoctorHero.jsx'

export const FIBROADENOMA_FAQ = [
  {
    question: 'Что такое фиброаденома молочной железы?',
    answer: 'Фиброаденома - это доброкачественное опухолевидное образование молочной железы, состоящее из железистой и соединительной ткани. Она не является злокачественной опухолью, однако требует наблюдения или лечения по показаниям. Чаще встречается у женщин 15-35 лет.',
  },
  {
    question: 'Нужно ли удалять фиброаденому?',
    answer: 'Тактика зависит от размера, динамики роста и гистологического типа. Небольшие стабильные фиброаденомы нередко ведут под наблюдением. При росте, большом размере или беспокойстве пациентки врач обсуждает варианты вмешательства, включая ВАБ. Решение принимается индивидуально после очной консультации.',
  },
  {
    question: 'Что такое ВАБ и чем она отличается от операции?',
    answer: 'ВАБ (вакуумная аспирационная биопсия) - малоинвазивное удаление образования через прокол 2 мм под контролем УЗИ под местной анестезией. В отличие от операции, не требует общего наркоза и разреза. После процедуры пациентка находится под наблюдением и уходит домой в тот же день. Показания оценивает врач.',
  },
  {
    question: 'Может ли фиброаденома стать злокачественной?',
    answer: 'Обычная (простая) фиброаденома не перерождается в рак. Листовидная (филлоидная) фиброаденома относится к пограничным опухолям и требует более активной тактики. Именно поэтому важно подтвердить диагноз морфологически - через пункцию или биопсию.',
  },
  {
    question: 'Какие симптомы указывают на фиброаденому?',
    answer: 'Чаще всего это плотное подвижное безболезненное уплотнение, которое случайно обнаруживает сама пациентка или врач при осмотре. Иногда отмечается лёгкая болезненность. Точный диагноз ставится только после УЗИ и, при необходимости, морфологического исследования.',
  },
  {
    question: 'Можно ли прийти без направления и УЗИ?',
    answer: 'Да, направление не нужно. Если у вас нет свежего УЗИ, врач выполнит его на консультации. Возьмите с собой предыдущие снимки и заключения, если они есть - это поможет оценить динамику.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /онколог-маммолог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('mammology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Плотное подвижное уплотнение в груди' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Округлая форма, чёткие границы' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Безболезненность или лёгкий дискомфорт' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Не связана с менструальным циклом' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Случайно обнаруживается при пальпации' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Может медленно увеличиваться в размере' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'УЗИ молочных желёз', desc: 'Основной метод первичной диагностики. Позволяет оценить размер, структуру и кровоток в образовании.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Пункция / биопсия', desc: 'Цитологическое или гистологическое исследование для подтверждения доброкачественной природы.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Пальпаторный осмотр', desc: 'Онколог-маммолог оценивает консистенцию, подвижность и изменения кожи над образованием.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Динамическое наблюдение', desc: 'При стабильных небольших образованиях врач может рекомендовать УЗИ-контроль раз в 6-12 месяцев без вмешательства.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'ВАБ (вакуумная аспирационная биопсия)', desc: 'Малоинвазивное удаление образования через прокол 2 мм под контролем УЗИ. Рассматривается по показаниям после консультации.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Хирургическое удаление', desc: 'Применяется при крупных, быстро растущих или листовидных формах. Вопрос операции обсуждается индивидуально.' },
]

const steps = [
  { n: '01', title: 'Консультация онколога-маммолога', desc: 'Врач проводит осмотр, изучает жалобы и предыдущие снимки. Сразу же выполняет УЗИ при необходимости.' },
  { n: '02', title: 'Морфологическая верификация', desc: 'При необходимости - пункция или трепан-биопсия под УЗИ-контролем для подтверждения диагноза.' },
  { n: '03', title: 'Выбор тактики', desc: 'Врач спокойно объясняет варианты: наблюдение, ВАБ или операция. Решение принимается вместе с пациенткой.' },
  { n: '04', title: 'Вмешательство по показаниям', desc: 'Процедура проходит в амбулаторных условиях. Материал отправляется на гистологию.' },
  { n: '05', title: 'Контроль и наблюдение', desc: 'После вмешательства врач назначает контрольное УЗИ и объясняет план наблюдения.' },
]

const relatedArticles = [
  { href: '/blog/chto-takoe-fibroadenoma', title: 'Фиброаденома: причины, симптомы, лечение' },
  { href: '/blog/vab-ili-operatsiya', title: 'ВАБ или операция при фиброаденоме' },
  { href: '/blog/fibroadenoma-chastye-voprosy', title: 'Фиброаденома. Частые вопросы' },
]

const PAGE_STATS = [
  { val: '15-35', unit: '', label: 'Возраст наибольшей частоты, лет' },
  { val: '2', unit: 'мм', label: 'Прокол при ВАБ' },
  { val: '30', unit: 'мин', label: 'Длительность ВАБ-процедуры' },
  { val: 'Гистология', unit: '', label: 'Материал отправляем на исследование' },
]

const VISIT_REASONS = [
  { text: 'Вы нащупали уплотнение в груди' },
  { text: 'УЗИ выявило образование' },
  { text: 'Образование увеличивается в динамике' },
  { text: 'Рекомендована операция, хотите второе мнение' },
  { text: 'Плановое обследование молочных желёз' },
]

const EXTRA_LINKS = [
  { href: '/mammology', title: 'Маммология - обзор направления', desc: 'Консультация, УЗИ и ВАБ в Клинике Одинцова' },
  { href: '/vab', title: 'ВАБ - подробнее о процедуре', desc: 'Как проходит, показания, сравнение с операцией' },
]

const PAGE = {
  specialtyLabel: 'Маммология, Приморский район СПб',
}

export function Fibroadenoma() {
  return (
    <div className="bg-[color:var(--surface-page)]">
      <section className="relative overflow-hidden grain-overlay border-b border-[color:var(--border-color)] bg-[color:var(--surface-accent)]">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="badge-specialty-mint-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                {PAGE.specialtyLabel}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Фиброаденома молочной железы:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Консультация онколога-маммолога, УЗИ и обсуждение вариантов лечения в Клинике Одинцова на Богатырском проспекте.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Фиброаденома доброкачественна, но тактика зависит от размера, роста и морфологии. Врач спокойно объяснит варианты наблюдения, ВАБ или операции.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Проверить, нужна ли операция
                </button>
              </div>
            </div>
            <ResponsiveDoctorHero
              doctors={SPECIALTY_DOCTORS}
              label="Карусель маммологов на странице о фиброаденоме"
              ctaHref="/second-opinion"
              desktopClassName="hidden lg:block [&_.hero-doctor-card-inner]:overflow-hidden [&_.hero-doctor-photo-link]:max-h-[260px] [&_.hero-doctor-photo-link]:overflow-hidden [&_.hero-doctor-photo]:max-h-[260px] [&_.hero-doctor-photo]:object-contain [&_.hero-doctor-info]:p-4"
              desktopMedia="(min-width: 1024px)"
            />
          </div>
        </div>
      </section>

      <FadeInSection>
        <section className="relative z-20 -mt-5 md:-mt-7">
          <div className="container-clay">
            <div className="clay clay-card-lg p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PAGE_STATS.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-[color:var(--surface-muted)] px-4 py-4">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl sm:text-4xl font-serif font-light text-clay-mint leading-none">{s.val}</span>
                      {s.unit && <span className="text-sm font-bold text-clay-mint leading-none pb-1">{s.unit}</span>}
                    </div>
                    <p className="text-sm text-clay-muted mt-2 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)] gap-6 lg:gap-10 items-start">
              <div className="clay clay-card-lg p-6 md:p-8">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое фиброаденома</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>Фиброаденома - доброкачественное образование молочной железы, состоящее из железистых клеток и соединительной ткани. При пальпации ощущается как плотный, подвижный, безболезненный узел с чёткими контурами.</p>
                  <p>Простая фиброаденома не перерождается в злокачественную опухоль. Листовидная форма встречается реже и требует более внимательного подхода. Точный тип определяется морфологически.</p>
                </div>
              </div>
              <aside className="clay clay-card-soft-mint p-5 md:p-6">
                <h3 className="font-bold text-clay-dark text-lg mb-4">На что обратить внимание</h3>
                <div className="space-y-3">
                  {symptoms.map((s) => (
                    <div key={s.text} className="flex items-start gap-3 rounded-2xl bg-white/55 px-3 py-3">
                      <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                      <span className="text-sm font-medium text-clay-dark leading-snug">{s.text}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section bg-[color:var(--surface-accent)] border-y border-[color:var(--border-color)]">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="clay clay-card p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика фиброаденомы</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Достоверный диагноз требует сочетания осмотра, визуализации и, при необходимости, морфологического исследования.</p>
                <div className="space-y-5">
                  {diagnostics.map((d) => (
                    <article key={d.title} className="flex items-start gap-4 border-t border-[color:var(--border-color)] pt-5 first:border-t-0 first:pt-0">
                      <div className={d.bg}>{d.icon}</div>
                      <div>
                        <h3 className="font-bold text-clay-dark text-base mb-1">{d.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{d.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="clay clay-card p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Варианты лечения</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Тактика подбирается индивидуально после очной оценки размера, динамики роста и результатов обследования.</p>
                <div className="space-y-5">
                  {treatments.map((t) => (
                    <article key={t.title} className="flex items-start gap-4 border-t border-[color:var(--border-color)] pt-5 first:border-t-0 first:pt-0">
                      <div className={t.bg}>{t.icon}</div>
                      <div>
                        <h3 className="font-bold text-clay-dark text-base mb-1">{t.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{t.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 items-start">
              <div className="clay clay-card-lg p-6 md:p-8">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Маршрут пациентки</h2>
                <p className="text-clay-muted leading-relaxed mb-7">От первого обращения до ясного плана действий, шаг за шагом.</p>
                <div className="space-y-5">
                  {steps.map((s) => (
                    <article key={s.n} className="grid grid-cols-[2.5rem_1fr] gap-4">
                      <div className="num-badge text-sm w-10 h-10">{s.n}</div>
                      <div className="border-b border-[color:var(--border-color)] pb-5 last:border-b-0 last:pb-0">
                        <h3 className="font-semibold text-clay-dark text-base mb-1">{s.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{s.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <aside className="space-y-4 lg:sticky lg:top-24">
                <div className="clay clay-card-mint p-6 relative overflow-hidden">
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Бесплатное второе мнение</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Вам уже рекомендовали операцию по поводу фиброаденомы? Принесите снимки, онколог-маммолог оценит показания и расскажет о вариантах.</p>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/65 border border-white/80 px-4 py-2.5 text-clay-dark text-sm font-bold mb-4">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white text-sm py-2.5 w-full justify-center">
                    Проверить, нужна ли операция
                  </button>
                </div>
                <div className="clay clay-card p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-4">Когда стоит обратиться</h3>
                  <div className="space-y-3">
                    {VISIT_REASONS.map((item) => (
                      <div key={item.text} className="flex items-start gap-3">
                        <CheckCircle size={16} className="text-clay-mint mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-clay-dark leading-snug">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section bg-[color:var(--surface-muted)] border-y border-[color:var(--border-color)]">
          <div className="container-clay">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-8 xl:gap-10 items-start">
              <div>
                <div className="mb-7">
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши маммологи</h2>
                  <p className="text-clay-muted leading-relaxed max-w-2xl">Онкологи-маммологи, которые проведут консультацию и процедуру по показаниям.</p>
                </div>
                <ResponsiveDoctorCollection
                  doctors={SPECIALTY_DOCTORS}
                  label="Карусель маммологов клиники на странице о фиброаденоме"
                  mobileClassName="md:hidden pt-8"
                  desktopClassName="hidden md:grid md:grid-cols-2 gap-6 pt-8"
                />
              </div>
              <aside className="clay clay-card-lg p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на маммологию в СПб</h2>
                <p className="text-clay-muted leading-relaxed mb-5">Основные позиции для первичного визита. Полный перечень доступен в разделе цен.</p>
                <div className="divide-y divide-[color:var(--border-color)]">
                  {PRICE_CATEGORY.items.map((item) => (
                    <div key={item.name} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                      <span className="text-clay-mint font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                    </div>
                  ))}
                </div>
                <a href={PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm mt-6 w-full justify-center gap-2">
                  Полный прайс-лист
                  <ArrowRight size={15} />
                </a>
              </aside>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6 lg:gap-8 items-start">
              <div className="clay clay-card-soft-mint p-6 md:p-8">
                <Clock size={34} className="text-clay-mint mb-4" />
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Нужен приём по фиброаденоме?</h2>
                <p className="text-clay-muted mb-5 leading-relaxed">Запишитесь к онкологу-маммологу. Клиника находится на Богатырском проспекте, рядом с м. Комендантский проспект.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                    Записаться на приём
                    <ArrowRight size={16} />
                  </button>
                  <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                    Написать в Telegram
                  </a>
                </div>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-5">Полезные материалы</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedArticles.map((a) => (
                    <a key={a.href} href={a.href} className="clay clay-card-soft-mint card-interactive card-interactive-mint p-5 flex items-start gap-3 group">
                      <BookOpen size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">{a.title}</p>
                        <p className="text-clay-muted text-xs">Читать статью</p>
                      </div>
                    </a>
                  ))}
                  {EXTRA_LINKS.map((a) => (
                    <a key={a.href} href={a.href} className="clay clay-card card-interactive card-interactive-mint p-5 flex items-start gap-3 group">
                      <Zap size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">{a.title}</p>
                        <p className="text-clay-muted text-xs leading-relaxed">{a.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <div className="container-clay">
        <FaqSection items={FIBROADENOMA_FAQ} title="Частые вопросы о фиброаденоме" />
      </div>
    </div>
  )
}
