import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, MessageCircle, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'

export const FIBROADENOMA_FAQ = [
  {
    question: 'Что такое фиброаденома молочной железы?',
    answer: 'Фиброаденома — это доброкачественное опухолевидное образование молочной железы, состоящее из железистой и соединительной ткани. Она не является злокачественной опухолью, однако требует наблюдения или лечения по показаниям. Чаще встречается у женщин 15–35 лет.',
  },
  {
    question: 'Нужно ли удалять фиброаденому?',
    answer: 'Тактика зависит от размера, динамики роста и гистологического типа. Небольшие стабильные фиброаденомы нередко ведут под наблюдением. При росте, большом размере или беспокойстве пациентки врач обсуждает варианты вмешательства, включая ВАБ. Решение принимается индивидуально после очной консультации.',
  },
  {
    question: 'Что такое ВАБ и чем она отличается от операции?',
    answer: 'ВАБ (вакуумная аспирационная биопсия) — малоинвазивное удаление образования через прокол 2 мм под контролем УЗИ под местной анестезией. В отличие от операции, не требует общего наркоза и разреза. После процедуры пациентка находится под наблюдением и уходит домой в тот же день. Показания оценивает врач.',
  },
  {
    question: 'Может ли фиброаденома стать злокачественной?',
    answer: 'Обычная (простая) фиброаденома не перерождается в рак. Листовидная (филлоидная) фиброаденома относится к пограничным опухолям и требует более активной тактики. Именно поэтому важно подтвердить диагноз морфологически — через пункцию или биопсию.',
  },
  {
    question: 'Какие симптомы указывают на фиброаденому?',
    answer: 'Чаще всего это плотное подвижное безболезненное уплотнение, которое случайно обнаруживает сама пациентка или врач при осмотре. Иногда отмечается лёгкая болезненность. Точный диагноз ставится только после УЗИ и, при необходимости, морфологического исследования.',
  },
  {
    question: 'Можно ли прийти без направления и УЗИ?',
    answer: 'Да, направление не нужно. Если у вас нет свежего УЗИ, врач выполнит его на консультации. Возьмите с собой предыдущие снимки и заключения, если они есть — это поможет оценить динамику.',
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
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Динамическое наблюдение', desc: 'При стабильных небольших образованиях врач может рекомендовать УЗИ-контроль раз в 6–12 месяцев без вмешательства.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'ВАБ (вакуумная аспирационная биопсия)', desc: 'Малоинвазивное удаление образования через прокол 2 мм под контролем УЗИ. Рассматривается по показаниям после консультации.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Хирургическое удаление', desc: 'Применяется при крупных, быстро растущих или листовидных формах. Вопрос операции обсуждается индивидуально.' },
]

const steps = [
  { n: '01', title: 'Консультация онколога-маммолога', desc: 'Врач проводит осмотр, изучает жалобы и предыдущие снимки. Сразу же выполняет УЗИ при необходимости.' },
  { n: '02', title: 'Морфологическая верификация', desc: 'При необходимости — пункция или трепан-биопсия под УЗИ-контролем для подтверждения диагноза.' },
  { n: '03', title: 'Выбор тактики', desc: 'Врач спокойно объясняет варианты: наблюдение, ВАБ или операция. Решение принимается вместе с пациенткой.' },
  { n: '04', title: 'Вмешательство по показаниям', desc: 'Процедура проходит в амбулаторных условиях. Материал отправляется на гистологию.' },
  { n: '05', title: 'Контроль и наблюдение', desc: 'После вмешательства врач назначает контрольное УЗИ и объясняет план наблюдения.' },
]

const relatedArticles = [
  { href: '/blog/chto-takoe-fibroadenoma', title: 'Фиброаденома: причины, симптомы, лечение' },
  { href: '/blog/vab-ili-operatsiya', title: 'ВАБ или операция при фиброаденоме' },
  { href: '/blog/fibroadenoma-chastye-voprosy', title: 'Фиброаденома. Частые вопросы' },
]

export function Fibroadenoma() {
  return (
    <div>
      <section className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="badge-specialty-mint-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
              <Zap size={12} />
              Маммология · Приморский район СПб
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
              Фиброаденома молочной железы:{' '}
              <span className="heading-accent">диагностика и лечение в СПб</span>
            </h1>
            <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
              Консультация онколога-маммолога, УЗИ и обсуждение вариантов лечения — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
            </p>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Фиброаденома — доброкачественное образование, не всегда требующее вмешательства. Врач оценит ситуацию и спокойно расскажет о вариантах: наблюдение, ВАБ или операция.
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
        </div>
      </section>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { val: '15–35', unit: '', label: 'Возраст наибольшей частоты, лет' },
                { val: '2', unit: 'мм', label: 'Прокол при ВАБ' },
                { val: '30', unit: 'мин', label: 'Длительность ВАБ-процедуры' },
                { val: 'Гистология', unit: '', label: 'Материал отправляем на исследование' },
              ].map((s) => (
                <div key={s.label} className="clay clay-card card-interactive p-4 text-center">
                  <div className="flex items-end justify-center gap-0.5">
                    <span className="text-3xl sm:text-4xl font-serif font-light text-clay-mint leading-none">{s.val}</span>
                    {s.unit && <span className="text-lg font-bold text-clay-mint leading-none pb-0.5">{s.unit}</span>}
                  </div>
                  <p className="text-xs text-clay-muted mt-1.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое фиброаденома</h2>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Фиброаденома — доброкачественное образование молочной железы, состоящее из железистых клеток и соединительной ткани. Это самое распространённое доброкачественное новообразование у молодых женщин. При пальпации ощущается как плотный, подвижный, безболезненный узел с чёткими контурами.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Простая фиброаденома не перерождается в злокачественную опухоль. Листовидная форма — более редкая и требует более внимательного подхода. Точный тип определяется только морфологически.
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика фиброаденомы</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Достоверный диагноз требует сочетания инструментальных и морфологических методов</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {diagnostics.map((d, i) => (
                <FadeInSection key={d.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${d.card} card-interactive p-6`}>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Варианты лечения</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Тактика подбирается индивидуально после очной оценки</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {treatments.map((t, i) => (
                <FadeInSection key={t.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${t.card} card-interactive p-6`}>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">
                  Маршрут пациентки
                </h2>
                <p className="text-clay-muted mb-6 leading-relaxed">
                  От первого обращения до ясного плана действий — шаг за шагом
                </p>
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
                    Вам уже рекомендовали операцию по поводу фиброаденомы? Принесите снимки — онколог-маммолог оценит показания и расскажет о вариантах.
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
                      'Вы нащупали уплотнение в груди',
                      'УЗИ выявило образование',
                      'Образование увеличивается в динамике',
                      'Рекомендована операция, хотите второе мнение',
                      'Плановое обследование молочных желёз',
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
              <p className="text-clay-muted">Онкологи-маммологи, которые проведут консультацию и процедуру</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SPECIALTY_DOCTORS.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
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
              <p className="text-clay-muted">Основные позиции для первичного визита</p>
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
            <h2 className="text-xl heading-serif text-clay-dark mb-5">Полезные материалы</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedArticles.map((a) => (
                <a key={a.href} href={a.href} className="clay clay-card-soft-mint card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                  <BookOpen size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">{a.title}</p>
                    <p className="text-clay-muted text-xs">Читать статью →</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <a href="/mammology" className="clay clay-card card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <Zap size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">Маммология — обзор направления</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Консультация, УЗИ и ВАБ в Клинике Одинцова</p>
                </div>
              </a>
              <a href="/vab" className="clay clay-card card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <MessageCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">ВАБ — подробнее о процедуре</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Как проходит, показания, сравнение с операцией</p>
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
                Нужен приём по фиброаденоме?
              </h2>
              <p className="text-clay-muted mb-5 max-w-md mx-auto">
                Запишитесь к онкологу-маммологу в Клинике Одинцова. Богатырский проспект, д. 22 к. 1, рядом с м. Комендантский проспект.
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
        <FaqSection items={FIBROADENOMA_FAQ} title="Частые вопросы о фиброаденоме" />
      </div>
    </div>
  )
}
