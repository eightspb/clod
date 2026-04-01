import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, MessageCircle, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'

export const MASTOPATIYA_FAQ = [
  {
    question: 'Что такое мастопатия?',
    answer: 'Мастопатия (фиброзно-кистозная болезнь) — доброкачественное изменение структуры молочной железы с нарушением соотношения железистой, соединительной и жировой ткани. Это не рак и не предрак, а изменения, требующие наблюдения и при необходимости — коррекции. Встречается у 30–50% женщин репродуктивного возраста.',
  },
  {
    question: 'Нужно ли лечить мастопатию?',
    answer: 'Диффузная мастопатия без выраженных симптомов нередко не требует активного вмешательства — достаточно наблюдения, УЗИ раз в год и коррекции образа жизни. При узловых формах, нарастании болей или выявлении подозрительных изменений врач обсудит варианты лечения, в том числе возможность ВАБ.',
  },
  {
    question: 'Чем мастопатия отличается от рака?',
    answer: 'Мастопатия — доброкачественный процесс. Злокачественная опухоль имеет принципиально иную морфологическую картину. Однако на фоне мастопатии труднее выявить ранний рак, поэтому регулярные обследования (УЗИ, маммография по показаниям) особенно важны.',
  },
  {
    question: 'Влияют ли гормоны на мастопатию?',
    answer: 'Да, мастопатия тесно связана с гормональным фоном: нарушением соотношения эстрогенов и прогестерона, заболеваниями щитовидной железы и яичников. Именно поэтому важен комплексный подход — гинеколог и эндокринолог при необходимости дополняют маммолога.',
  },
  {
    question: 'Что делать, если грудь болит каждый месяц перед менструацией?',
    answer: 'Цикличная болезненность (мастодиния) — частый симптом диффузной мастопатии. Сама по себе она не опасна, но снижает качество жизни. Врач оценит выраженность симптомов и при необходимости порекомендует методы коррекции — от изменения образа жизни до медикаментозной поддержки.',
  },
  {
    question: 'Как часто нужно делать УЗИ при мастопатии?',
    answer: 'При диффузных изменениях без образований — раз в 12 месяцев. При выявленных узлах или быстрой динамике — раз в 6 месяцев или чаще, по усмотрению врача. После 40 лет к УЗИ добавляют маммографию.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /онколог-маммолог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('mammology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Болезненность груди перед менструацией' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Диффузная тяжесть и распирание' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Мелкозернистые уплотнения при пальпации' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Уплотнение, меняющееся в течение цикла' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Прозрачные или молочные выделения из соска' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Единичный или множественные узлы' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'УЗИ молочных желёз', desc: 'Первичный скрининг структуры ткани, оценка кист и узловых образований. Предпочтительно в 1-ю фазу цикла (5–12 день).' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Маммография', desc: 'Рекомендуется женщинам старше 40 лет. Дополняет УЗИ, выявляет кальцинаты и изменения жировой ткани.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Биопсия при узловых формах', desc: 'Цитологическое или гистологическое исследование для исключения злокачественного процесса при выявленных узлах.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Наблюдение и образ жизни', desc: 'При диффузных формах без симптоматики — регулярный УЗИ-контроль. Врач даёт рекомендации по питанию, уровню стресса и нижнему белью.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Медикаментозная коррекция', desc: 'При выраженных болях и гормональном дисбалансе врач может порекомендовать фитопрепараты, местные гели или гормональную поддержку по показаниям.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'ВАБ при узловых формах', desc: 'При крупных узлах или кистах маммолог рассматривает ВАБ как малоинвазивный вариант. Решение принимается после очной оценки.' },
]

const steps = [
  { n: '01', title: 'Консультация онколога-маммолога', desc: 'Осмотр, изучение снимков, сбор жалоб. УЗИ — сразу на приёме при необходимости.' },
  { n: '02', title: 'Оценка типа мастопатии', desc: 'Дифференциация диффузной и узловой форм. При узловой — определение показаний к биопсии.' },
  { n: '03', title: 'Лабораторная и гормональная картина', desc: 'При необходимости направление на анализы гормонов и консультацию гинеколога или эндокринолога.' },
  { n: '04', title: 'Выбор тактики', desc: 'Врач объясняет: наблюдение, медикаментозная поддержка или малоинвазивное вмешательство по показаниям.' },
]

const relatedArticles = [
  { href: '/blog/mylnaya-opera-o-kistoznoy-mastopatii', title: 'Мыльная опера о кистозной мастопатии' },
  { href: '/blog/mammografiya-ili-uzi', title: 'Маммография или УЗИ: что выбрать' },
]

export function Mastopatiya() {
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
                Мастопатия молочной железы:{' '}
                <span className="heading-accent">наблюдение и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём онколога-маммолога, УЗИ и подбор тактики наблюдения — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Мастопатия — самое распространённое состояние молочных желёз. Врач оценит тип изменений и предложит план наблюдения или лечения, подходящий именно вам.
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
                { val: '30–50', unit: '%', label: 'Женщин репродуктивного возраста имеют мастопатию' },
                { val: '1–12', unit: '', label: 'Предпочтительный день цикла для УЗИ' },
                { val: '2', unit: 'типа', label: 'Диффузная и узловая формы' },
                { val: 'Ежегодно', unit: '', label: 'Рекомендуемый контроль УЗИ' },
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
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое мастопатия</h2>
            <p className="text-clay-muted mb-4 max-w-2xl leading-relaxed">
              Мастопатия (фиброзно-кистозная болезнь) — доброкачественное изменение структуры молочной железы. Развивается на фоне дисбаланса половых гормонов и проявляется болезненностью, уплотнениями и нередко кистами.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Различают диффузную форму (равномерные изменения ткани) и узловую (с чётко выраженными уплотнениями). Узловая форма требует морфологического исследования для исключения атипии.
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика мастопатии</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Комплекс методов для точной оценки состояния ткани</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Тактика лечения</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Определяется по типу мастопатии, симптомам и данным обследования</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Маршрут пациентки</h2>
                <p className="text-clay-muted mb-6 leading-relaxed">От первого приёма до понятного плана</p>
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
                    Вам уже назначили лечение или операцию по поводу мастопатии? Принесите снимки — онколог-маммолог проверит заключение и расскажет о возможных вариантах.
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
                      'Грудь болит перед менструацией',
                      'УЗИ выявило диффузные изменения',
                      'Появился новый узел или уплотнение',
                      'Выделения из соска без травмы',
                      'Плановый визит — не были у маммолога более года',
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
              <p className="text-clay-muted">Специалисты, которые ведут приём по маммологии в СПб</p>
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
              <p className="text-clay-muted">Базовые позиции для первичного визита</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <p className="text-clay-muted text-xs leading-relaxed">Малоинвазивное удаление узловых образований</p>
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
                Запишитесь к маммологу в Санкт-Петербурге
              </h2>
              <p className="text-clay-muted mb-5 max-w-md mx-auto">
                Клиника Одинцова: Богатырский проспект, д. 22 к. 1, рядом с м. Комендантский проспект и м. Старая Деревня.
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
        <FaqSection items={MASTOPATIYA_FAQ} title="Частые вопросы о мастопатии" />
      </div>
    </div>
  )
}
