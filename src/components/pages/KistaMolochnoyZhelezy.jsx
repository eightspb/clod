import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { ResponsiveDoctorCollection } from '../ResponsiveDoctorCollection.jsx'
import { ResponsiveDoctorHero } from '../ResponsiveDoctorHero.jsx'

export const KISTA_FAQ = [
  {
    question: 'Что такое киста молочной железы?',
    answer: 'Киста - округлая полость, заполненная жидкостью, внутри молочной железы. Образуется при расширении молочных протоков. Кисты бывают простыми (однокамерными) и сложными (с перегородками или внутренним содержимым). Простые кисты доброкачественны; сложные требуют морфологической верификации.',
  },
  {
    question: 'Нужно ли лечить кисту молочной железы?',
    answer: 'Небольшие простые кисты нередко не требуют лечения - достаточно динамического наблюдения. При больших размерах, выраженном дискомфорте или сложной структуре врач обсуждает аспирацию, склерозирование или ВАБ по показаниям. Тактику определяют после УЗИ и консультации.',
  },
  {
    question: 'Чем аспирация отличается от ВАБ?',
    answer: 'Аспирация - удаление жидкости из кисты тонкой иглой под контролем УЗИ. Это быстрая и малоболезненная процедура. ВАБ применяется при солидном компоненте или для одновременного удаления образования и отправки материала на гистологию. Выбор метода зависит от структуры кисты.',
  },
  {
    question: 'Может ли киста молочной железы переродиться в рак?',
    answer: 'Простые однокамерные кисты не являются предраковым состоянием. Однако сложные кисты с пристеночными разрастаниями или солидным компонентом требуют гистологической проверки, поскольку в редких случаях могут содержать атипичные клетки.',
  },
  {
    question: 'Может ли киста рассосаться самостоятельно?',
    answer: 'Небольшие кисты иногда регрессируют, особенно на фоне нормализации гормонального фона. Однако рассчитывать на самостоятельное исчезновение крупных кист не стоит - их следует вести под контролем врача.',
  },
  {
    question: 'Как часто нужно делать УЗИ при кисте?',
    answer: 'При простой кисте до 1-1,5 см - раз в 12 месяцев. При более крупных или нескольких кистах - раз в 6 месяцев или по индивидуальному графику, который назначает маммолог.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /онколог-маммолог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('mammology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Ощущение округлого образования при пальпации' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Тянущая боль или тяжесть в груди' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Изменение симптомов в разные фазы цикла' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Болезненность при надавливании' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Случайная находка при плановом УЗИ' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Иногда - видимое выбухание при крупных кистах' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'УЗИ молочных желёз', desc: 'Точно разграничивает простые и сложные кисты, оценивает стенки, перегородки и содержимое.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Пункция с цитологией', desc: 'Тонкоигольная аспирация содержимого под контролем УЗИ. Цитологическое исследование жидкости помогает уточнить характер кисты.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Биопсия при сложных кистах', desc: 'При солидном компоненте, пристеночных разрастаниях или кальцинатах - гистологическое исследование для исключения атипии.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Наблюдение', desc: 'При маленьких простых кистах без симптомов врач назначает контрольное УЗИ через 6-12 месяцев.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Аспирация и склерозирование', desc: 'Жидкость удаляется иглой; при необходимости в полость вводится склерозирующий агент для профилактики рецидива.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'ВАБ при сложных кистах', desc: 'При солидном компоненте или рецидивирующей кисте маммолог рассматривает ВАБ с гистологией - по показаниям после очной оценки.' },
]

const steps = [
  { n: '01', title: 'Консультация онколога-маммолога', desc: 'Осмотр, сбор анамнеза, оценка предыдущих снимков. УЗИ сразу на приёме при необходимости.' },
  { n: '02', title: 'Оценка структуры кисты', desc: 'УЗИ разграничивает простую и сложную кисту. При сложной - обсуждение пункции или биопсии.' },
  { n: '03', title: 'Морфологическая верификация', desc: 'При необходимости - пункция с цитологией или биопсия для исключения атипии.' },
  { n: '04', title: 'Выбор тактики', desc: 'Наблюдение, аспирация, склерозирование или ВАБ - врач объясняет каждый вариант и его обоснование.' },
  { n: '05', title: 'Контрольное наблюдение', desc: 'После вмешательства - контрольное УЗИ для оценки результата и динамики.' },
]

const relatedArticles = [
  { href: '/blog/kista-molochnoy-zhelezy', title: 'Киста молочной железы: причины, симптомы, лечение' },
  { href: '/blog/mammografiya-ili-uzi', title: 'Маммография или УЗИ: что выбрать' },
]

const PAGE_STATS = [
  { val: '2', unit: 'типа', label: 'Простые и сложные кисты' },
  { val: 'УЗИ', unit: '', label: 'Основной метод диагностики' },
  { val: '2', unit: 'мм', label: 'Прокол при аспирации или ВАБ' },
  { val: 'Цитология', unit: '', label: 'Содержимое исследуем в лаборатории' },
]

const VISIT_REASONS = [
  { text: 'УЗИ выявило кисту молочной железы' },
  { text: 'Киста увеличивается в динамике' },
  { text: 'Есть дискомфорт или боль в груди' },
  { text: 'Назначена операция, хотите уточнить показания' },
  { text: 'Плановое обследование' },
]

const EXTRA_LINKS = [
  { href: '/mammology', title: 'Маммология - обзор направления', desc: 'Консультация, УЗИ и ВАБ в Клинике Одинцова' },
  { href: '/vab', title: 'ВАБ - подробнее о процедуре', desc: 'Малоинвазивное удаление образований' },
]

const PAGE = {
  specialtyLabel: 'Маммология, Приморский район СПб',
}

export function KistaMolochnoyZhelezy() {
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
                Киста молочной железы:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Консультация онколога-маммолога, УЗИ и подбор тактики в Клинике Одинцова на Богатырском проспекте.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Большинство кист молочной железы доброкачественны и требуют наблюдения или малоинвазивного лечения по показаниям. Врач объяснит ситуацию и следующий шаг.
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
              label="Карусель маммологов на странице о кисте молочной железы"
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое киста молочной железы</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>Киста молочной железы - полость, заполненная жидкостью, которая образуется при расширении молочных протоков. Часто связана с гормональными влияниями и выявляется на УЗИ.</p>
                  <p>Простые кисты с тонкими стенками и однородным содержимым, как правило, доброкачественны. Сложные кисты с перегородками, утолщёнными стенками или солидным компонентом требуют дополнительного обследования.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика кисты</h2>
                <p className="text-clay-muted leading-relaxed mb-6">До выбора тактики важно понять структуру кисты и определить, нужна ли морфологическая проверка.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение кисты молочной железы</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Тактика определяется типом кисты, её размером, симптомами и данными УЗИ.</p>
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
                <p className="text-clay-muted leading-relaxed mb-7">Пошаговый путь от первого визита до ясного результата.</p>
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
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Назначили операцию или пункцию по поводу кисты? Принесите снимки, онколог-маммолог рассмотрит ситуацию и объяснит варианты.</p>
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
                  <p className="text-clay-muted leading-relaxed max-w-2xl">Онкологи-маммологи, ведущие приём в Санкт-Петербурге.</p>
                </div>
                <ResponsiveDoctorCollection
                  doctors={SPECIALTY_DOCTORS}
                  label="Карусель маммологов клиники на странице о кисте молочной железы"
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Нужен приём по кисте молочной железы?</h2>
                <p className="text-clay-muted mb-5 leading-relaxed">Клиника Одинцова находится на Богатырском проспекте, рядом с м. Комендантский проспект.</p>
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
        <FaqSection items={KISTA_FAQ} title="Частые вопросы о кисте молочной железы" />
      </div>
    </div>
  )
}
