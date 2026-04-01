import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, MessageCircle, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'

export const KISTA_FAQ = [
  {
    question: 'Что такое киста молочной железы?',
    answer: 'Киста — округлая полость, заполненная жидкостью, внутри молочной железы. Образуется при расширении молочных протоков. Кисты бывают простыми (однокамерными) и сложными (с перегородками или внутренним содержимым). Простые кисты доброкачественны; сложные требуют морфологической верификации.',
  },
  {
    question: 'Нужно ли лечить кисту молочной железы?',
    answer: 'Небольшие простые кисты нередко не требуют лечения — достаточно динамического наблюдения. При больших размерах, выраженном дискомфорте или сложной структуре врач обсуждает аспирацию, склерозирование или ВАБ по показаниям. Тактику определяют после УЗИ и консультации.',
  },
  {
    question: 'Чем аспирация отличается от ВАБ?',
    answer: 'Аспирация — удаление жидкости из кисты тонкой иглой под контролем УЗИ. Это быстрая и малоболезненная процедура. ВАБ применяется при солидном компоненте или для одновременного удаления образования и отправки материала на гистологию. Выбор метода зависит от структуры кисты.',
  },
  {
    question: 'Может ли киста молочной железы переродиться в рак?',
    answer: 'Простые однокамерные кисты не являются предраковым состоянием. Однако сложные кисты с пристеночными разрастаниями или солидным компонентом требуют гистологической проверки, поскольку в редких случаях могут содержать атипичные клетки.',
  },
  {
    question: 'Может ли киста рассосаться самостоятельно?',
    answer: 'Небольшие кисты иногда регрессируют, особенно на фоне нормализации гормонального фона. Однако рассчитывать на самостоятельное исчезновение крупных кист не стоит — их следует вести под контролем врача.',
  },
  {
    question: 'Как часто нужно делать УЗИ при кисте?',
    answer: 'При простой кисте до 1–1,5 см — раз в 12 месяцев. При более крупных или нескольких кистах — раз в 6 месяцев или по индивидуальному графику, который назначает маммолог.',
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
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Иногда — видимое выбухание при крупных кистах' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'УЗИ молочных желёз', desc: 'Точно разграничивает простые и сложные кисты, оценивает стенки, перегородки и содержимое.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Пункция с цитологией', desc: 'Тонкоигольная аспирация содержимого под контролем УЗИ. Цитологическое исследование жидкости помогает уточнить характер кисты.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Биопсия при сложных кистах', desc: 'При солидном компоненте, пристеночных разрастаниях или кальцинатах — гистологическое исследование для исключения атипии.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Наблюдение', desc: 'При маленьких простых кистах без симптомов врач назначает контрольное УЗИ через 6–12 месяцев.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Аспирация и склерозирование', desc: 'Жидкость удаляется иглой; при необходимости в полость вводится склерозирующий агент для профилактики рецидива.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'ВАБ при сложных кистах', desc: 'При солидном компоненте или рецидивирующей кисте маммолог рассматривает ВАБ с гистологией — по показаниям после очной оценки.' },
]

const steps = [
  { n: '01', title: 'Консультация онколога-маммолога', desc: 'Осмотр, сбор анамнеза, оценка предыдущих снимков. УЗИ сразу на приёме при необходимости.' },
  { n: '02', title: 'Оценка структуры кисты', desc: 'УЗИ разграничивает простую и сложную кисту. При сложной — обсуждение пункции или биопсии.' },
  { n: '03', title: 'Морфологическая верификация', desc: 'При необходимости — пункция с цитологией или биопсия для исключения атипии.' },
  { n: '04', title: 'Выбор тактики', desc: 'Наблюдение, аспирация, склерозирование или ВАБ — врач объясняет каждый вариант и его обоснование.' },
  { n: '05', title: 'Контрольное наблюдение', desc: 'После вмешательства — контрольное УЗИ для оценки результата и динамики.' },
]

const relatedArticles = [
  { href: '/blog/kista-molochnoy-zhelezy', title: 'Киста молочной железы: причины, симптомы, лечение' },
  { href: '/blog/mammografiya-ili-uzi', title: 'Маммография или УЗИ: что выбрать' },
]

export function KistaMolochnoyZhelezy() {
  return (
    <div>
      <section className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div>
              <div className="badge-specialty-mint-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                Маммология · Приморский район СПб
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Киста молочной железы:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Консультация онколога-маммолога, УЗИ и подбор тактики — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Большинство кист молочной железы доброкачественны и хорошо поддаются наблюдению или малоинвазивному лечению. Врач объяснит ситуацию и предложит понятный план.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Проверить, нужна ли операция
                </button>
              </div>
            </div>
            <HeroDoctorCard doctors={SPECIALTY_DOCTORS} />
          </div>
        </div>
      </section>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { val: '2', unit: 'типа', label: 'Простые и сложные кисты' },
                { val: 'УЗИ', unit: '', label: 'Основной метод диагностики' },
                { val: '2', unit: 'мм', label: 'Прокол при аспирации или ВАБ' },
                { val: 'Цитология', unit: '', label: 'Содержимое исследуем в лаборатории' },
              ].map((s) => (
                <div key={s.label} className="clay clay-card card-interactive p-5 text-center flex flex-col items-center justify-center h-full min-h-[120px]">
                  <div className="flex items-end justify-center gap-0.5">
                    <span className="text-3xl sm:text-4xl font-serif font-light text-clay-mint leading-none">{s.val}</span>
                    {s.unit && <span className="text-lg font-bold text-clay-mint leading-none pb-0.5">{s.unit}</span>}
                  </div>
                  <p className="text-sm text-clay-muted mt-2 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое киста молочной железы</h2>
            <p className="text-clay-muted mb-4 max-w-2xl leading-relaxed">
              Киста молочной железы — полость, заполненная жидкостью, которая образуется при расширении молочных протоков. Формируется при гормональном дисбалансе, чаще в репродуктивном возрасте.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Простые кисты с тонкими стенками и однородным содержимым, как правило, доброкачественны. Сложные кисты с перегородками, утолщёнными стенками или солидным компонентом требуют дополнительного обследования.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {symptoms.map((s, i) => (
                <FadeInSection key={i} staggerIndex={i} className="h-full">
                  <div className="clay clay-card card-interactive flex items-center gap-3 px-4 py-3">
                    {s.icon}
                    <span className="text-sm font-medium text-clay-dark">{s.text}</span>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика кисты</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Установить характер кисты важно до выбора тактики</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {diagnostics.map((d, i) => (
                <FadeInSection key={d.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${d.card} card-interactive p-6 h-full`}>
                    <div className="flex items-start gap-4 mb-3">
                      <div className={d.bg}>{d.icon}</div>
                      <h3 className="font-bold text-clay-dark text-lg leading-tight pt-1">{d.title}</h3>
                    </div>
                    <p className="text-clay-muted text-sm leading-relaxed">{d.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение кисты молочной железы</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Тактика определяется по типу кисты, её размеру и симптомам</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {treatments.map((t, i) => (
                <FadeInSection key={t.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${t.card} card-interactive p-6 h-full`}>
                    <div className="flex items-start gap-4 mb-3">
                      <div className={t.bg}>{t.icon}</div>
                      <h3 className="font-bold text-clay-dark text-lg leading-tight pt-1">{t.title}</h3>
                    </div>
                    <p className="text-clay-muted text-sm leading-relaxed">{t.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Маршрут пациентки</h2>
                <p className="text-clay-muted mb-6 leading-relaxed">Пошаговый путь от первого визита до ясного результата</p>
                <div className="space-y-4">
                  {steps.map((s, i) => (
                    <FadeInSection key={s.n} staggerIndex={i} className="h-full">
                      <div className="clay clay-card card-interactive flex items-start gap-3 px-4 py-4">
                        <div className="relative overflow-hidden flex-shrink-0">
                          <span className="deco-numeral absolute -top-4 -right-2 opacity-30">{s.n}</span>
                          <div className="relative z-10 num-badge text-sm w-8 h-8">{s.n}</div>
                        </div>
                        <div>
                          <p className="font-semibold text-clay-dark text-sm">{s.title}</p>
                          <p className="text-clay-muted text-xs leading-relaxed mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    </FadeInSection>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="clay clay-card-mint p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Бесплатное второе мнение</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">
                    Назначили операцию или пункцию по поводу кисты? Принесите снимки — онколог-маммолог рассмотрит ситуацию и объяснит варианты.
                  </p>
                  <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-clay-dark text-sm font-bold">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white mt-4 text-sm py-2.5 w-full justify-center">
                    Проверить, нужна ли операция
                  </button>
                </div>
                <div className="clay clay-card card-interactive p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-3">Когда стоит обратиться</h3>
                  <div className="space-y-2.5">
                    {[
                      'УЗИ выявило кисту молочной железы',
                      'Киста увеличивается в динамике',
                      'Есть дискомфорт или боль в груди',
                      'Назначена операция, хотите уточнить показания',
                      'Плановое обследование',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle size={16} className="text-clay-mint flex-shrink-0" />
                        <span className="text-sm text-clay-dark">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши маммологи</h2>
              <p className="text-clay-muted">Онкологи-маммологи, ведущие приём в Санкт-Петербурге</p>
            </div>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
              {SPECIALTY_DOCTORS.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>
            <div className="sm:hidden flex gap-4 pt-10 overflow-x-auto scroll-smooth snap-x snap-mandatory -mx-4 px-4 pb-4">
              {SPECIALTY_DOCTORS.map((doc) => (
                <div key={doc.slug} className="snap-start flex-shrink-0 w-[80vw]">
                  <DoctorCard doctor={doc} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на маммологию в СПб</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {PRICE_CATEGORY.items.map((item) => (
                <div key={item.name} className="clay clay-card card-interactive flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-mint font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <a href={PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
                Полный прайс-лист →
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Полезные материалы</h2>
            <p className="text-clay-muted mb-6 max-w-2xl">Статьи и справочные страницы по теме кист молочной железы</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {relatedArticles.map((a) => (
                <a key={a.href} href={a.href} className="clay clay-card-soft-mint card-interactive p-6 flex items-start gap-4 group hover:shadow-lg transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <BookOpen size={20} className="text-clay-mint" />
                  </div>
                  <div>
                    <p className="font-bold text-clay-dark text-base mb-1.5 group-hover:text-clay-mint transition-colors">{a.title}</p>
                    <p className="text-clay-muted text-sm">Читать статью →</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              <a href="/mammology" className="clay clay-card card-interactive p-6 flex items-start gap-4 group hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'var(--surface-mint)' }}>
                  <Zap size={20} className="text-clay-mint" />
                </div>
                <div>
                  <p className="font-bold text-clay-dark text-base mb-1.5 group-hover:text-clay-mint transition-colors">Маммология — обзор направления</p>
                  <p className="text-clay-muted text-sm leading-relaxed">Консультация, УЗИ и ВАБ в Клинике Одинцова</p>
                </div>
              </a>
              <a href="/vab" className="clay clay-card card-interactive p-6 flex items-start gap-4 group hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'var(--surface-mint)' }}>
                  <MessageCircle size={20} className="text-clay-mint" />
                </div>
                <div>
                  <p className="font-bold text-clay-dark text-base mb-1.5 group-hover:text-clay-mint transition-colors">ВАБ — подробнее о процедуре</p>
                  <p className="text-clay-muted text-sm leading-relaxed">Малоинвазивное удаление образований</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-soft-mint p-6 md:p-8 text-center">
              <Clock size={40} className="text-clay-mint mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                Нужен приём по кисте молочной железы?
              </h2>
              <p className="text-clay-muted mb-5 max-w-md mx-auto">
                Клиника Одинцова: Богатырский проспект, д. 22 к. 1, рядом с м. Комендантский проспект.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                  Написать в Telegram
                </a>
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
