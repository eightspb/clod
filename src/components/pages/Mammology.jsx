import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, MessageCircle } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'

export const MAMMOLOGY_FAQ = [
  {
    question: 'Когда нужно обратиться к маммологу?',
    answer: 'К маммологу стоит обратиться при любых изменениях в молочных железах: уплотнениях, болезненности, выделениях из сосков, изменении формы или кожи груди. Профилактический осмотр рекомендуется раз в год даже при отсутствии жалоб, особенно после 35 лет или при наследственной предрасположенности.',
  },
  {
    question: 'Как часто нужно делать УЗИ молочных желёз?',
    answer: 'УЗИ молочных желёз рекомендуется проходить раз в год начиная с 18–20 лет. После 40 лет УЗИ обычно дополняют маммографией. При выявленных образованиях или повышенном риске врач может назначить контроль раз в 6 месяцев.',
  },
  {
    question: 'Чем отличается маммография от УЗИ?',
    answer: 'УЗИ лучше визуализирует мягкие ткани и подходит для плотной железистой ткани, характерной для молодых женщин. Маммография эффективнее выявляет микрокальцинаты и ранние изменения в жировой ткани. Методы дополняют друг друга, и выбор зависит от возраста, плотности ткани и клинической задачи.',
  },
  {
    question: 'Что такое ВАБ и когда она нужна?',
    answer: 'ВАБ (вакуумная аспирационная биопсия) — это малоинвазивное удаление образований молочной железы через прокол 2 мм под контролем УЗИ. Метод применяется при фиброаденомах, кистах, внутрипротоковых папилломах и подозрительных узлах. Решение о проведении ВАБ принимает врач после очной консультации и оценки снимков.',
  },
  {
    question: 'Болезненна ли биопсия молочной железы?',
    answer: 'Нет, биопсия проводится под местной анестезией и не вызывает боли. Вы можете ощущать лёгкое давление или вибрацию во время процедуры. Большинство пациенток оценивают дискомфорт на 1–2 балла из 10.',
  },
  {
    question: 'Можно ли прийти без направления?',
    answer: 'Да, направление не требуется. Вы можете записаться напрямую по телефону, через мессенджер или онлайн-форму. На первичном приёме онколог-маммолог проведёт осмотр и УЗИ, после чего обсудит дальнейший план.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /онколог-маммолог/i.test(d.specialization)
)
const MAMMOLOGY_PRICE_CATEGORY = getShortPriceCategoryBySlug('mammology')

const features = [
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Малоинвазивная ВАБ',
    subtitle: 'Вакуумная аспирационная биопсия по показаниям',
    desc: 'Метод рассматриваем после очной консультации, УЗИ и оценки снимков. Он позволяет удалить образование через минимальный доступ и сразу отправить материал на гистологию.',
    detail: 'Амбулаторный формат',
  },
  {
    icon: <Eye size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Щадящий доступ',
    subtitle: 'Минимальный прокол вместо разреза',
    desc: 'Процедура выполняется через небольшой прокол. Это помогает сократить травматичность вмешательства и облегчить восстановление по сравнению с более объёмной операцией.',
    detail: 'Минимальный рубец',
  },
  {
    icon: <Shield size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Локальное обезболивание',
    subtitle: 'Без общего наркоза',
    desc: 'Процедура проходит под местной анестезией и под контролем врача. После наблюдения вы уходите домой по согласованию с доктором.',
    detail: 'Амбулаторное наблюдение',
  },
  {
    icon: <Microscope size={22} className="text-white" />,
    bg: 'icon-circle-lavender',
    card: 'clay-card-soft-lavender',
    title: 'Гистология материала',
    subtitle: 'Подтверждение диагноза',
    desc: 'Удалённая ткань отправляется на исследование. Это помогает уточнить диагноз и определить дальнейшую тактику.',
    detail: 'Решение по результату',
  },
]

const steps = [
  { n: '01', title: 'Консультация', desc: 'Онколог-маммолог изучает ваши снимки, проводит осмотр и обсуждает жалобы. Затем объясняет возможные варианты.' },
  { n: '02', title: 'Планирование', desc: 'Определяем показания, объём вмешательства и параметры процедуры под УЗИ-контролем.' },
  { n: '03', title: 'Процедура', desc: 'Местная анестезия, минимальный доступ и удаление образования под контролем врача. Обычно это занимает около 30 минут.' },
  { n: '04', title: 'Результат', desc: 'Материал отправляется на гистологию, а врач объясняет дальнейшие шаги наблюдения и, при необходимости, связь с клиникой.' },
]

const checks = [
  'Новообразование до 3 см',
  'Фиброаденома',
  'Киста любого размера',
  'Внутрипротоковая папиллома',
  'Липома груди',
  'Лимфоузел подозрительного характера',
]

const MAMMOLOGY_CONDITIONS = [
  { href: '/fibroadenoma', title: 'Фиброаденома', desc: 'Доброкачественное образование — диагностика, наблюдение и ВАБ по показаниям' },
  { href: '/mastopatiya', title: 'Мастопатия', desc: 'Диффузные и узловые формы — обследование и индивидуальный план лечения' },
  { href: '/kista-molochnoy-zhelezy', title: 'Киста молочной железы', desc: 'Аспирация, склеротерапия и ВАБ для сложных кист' },
]

export function Mammology() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-6 pb-10">

        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="badge-specialty-mint-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
              <Zap size={12} />
              Приём в Приморском районе Санкт-Петербурга
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
              Маммология в Санкт-Петербурге:{' '}
              <span className="heading-accent">консультация, УЗИ и ВАБ</span> по показаниям
            </h1>
            <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
              Приём ведут онкологи-маммологи. Работаем в Санкт-Петербурге, на Богатырском проспекте, рядом с м. Комендантский проспект и м. Старая Деревня.
            </p>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Если нужно удалить образование, врач спокойно объяснит показания, возможные альтернативы и дальнейший план наблюдения.
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

      {/* KEY STATS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { val: '30', unit: 'мин', label: 'Длительность процедуры' },
                { val: '2', unit: 'мм', label: 'Размер прокола' },
                { val: '3', unit: 'см', label: 'Размер образований, которые оцениваем' },
                { val: 'Гистология', unit: '', label: 'Материал отправляем на исследование' },
              ].map((s) => (
                <div key={s.label} className="clay clay-card p-4 text-center">
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

      {/* FEATURES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">4 причины выбрать ВАБ</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Щадящий вариант вмешательства, когда врач считает его уместным по результатам осмотра и диагностики</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {features.map((f, i) => (
                <FadeInSection key={f.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${f.card} card-interactive p-6`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className={f.bg}>{f.icon}</div>
                      <div>
                        <h3 className="font-bold text-clay-dark text-lg leading-tight">{f.title}</h3>
                        <p className="text-clay-mint text-sm font-medium">{f.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-clay-muted text-sm leading-relaxed mb-3">{f.desc}</p>
                    <div className="badge-specialty-mint inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <CheckCircle size={12} />
                      {f.detail}
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* WHO NEEDS IT */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">
                  Кому подходит ВАБ?
                </h2>
                <p className="text-clay-muted mb-6 leading-relaxed">
                  ВАБ рассматриваем при доброкачественных и некоторых пограничных образованиях. Перед процедурой онколог-маммолог обязательно проведёт консультацию и оценит показания.
                </p>
                <div className="space-y-2.5">
                  {checks.map((item) => (
                    <div key={item} className="clay clay-card flex items-center gap-3 px-4 py-3">
                      <CheckCircle size={18} className="text-clay-mint flex-shrink-0" />
                      <span className="text-sm font-medium text-clay-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="clay clay-card-mint p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Бесплатное второе мнение</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">
                    Если вам уже рекомендовали операцию в другой клинике, принесите снимки. Наш онколог-маммолог спокойно проверит показания и расскажет о вариантах.
                  </p>
                  <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-clay-dark text-sm font-bold">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white mt-4 text-sm py-2.5 w-full justify-center">
                    Проверить, нужна ли операция
                  </button>
                </div>
                <div className="clay clay-card p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-4">Как проходит процедура</h3>
                  <div className="space-y-4">
                    {steps.map((s) => (
                      <div key={s.n} className="flex items-start gap-3 relative">
                        <div className="num-badge text-sm w-8 h-8">{s.n}</div>
                        <div>
                          <p className="font-semibold text-clay-dark text-sm">{s.title}</p>
                          <p className="text-clay-muted text-xs leading-relaxed mt-0.5">{s.desc}</p>
                        </div>
                        <span className="deco-numeral absolute -top-4 -right-2 opacity-30">{s.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* DOCTORS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Доктора-маммологи клиники</h2>
              <p className="text-clay-muted">Специалисты, которые проведут консультацию и процедуру</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
              {SPECIALTY_DOCTORS.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* PRICES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на маммологию в СПб</h2>
              <p className="text-clay-muted">Понятная структура оплаты и маршрута пациента</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {MAMMOLOGY_PRICE_CATEGORY.items.map((item) => (
                <div key={item.name} className="clay clay-card flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-mint font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-clay-muted max-w-2xl mx-auto leading-relaxed mb-5">
              В базовую стоимость ВАБ входят консультация, УЗИ и сама процедура. Анестезия, гистология, наблюдение и контрольный снимок обсуждаются отдельно после очной оценки.
            </p>
            <div className="text-center">
              <a href={MAMMOLOGY_PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
                Полный прайс-лист →
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CONDITIONS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Заболевания молочных желёз</h2>
            <p className="text-clay-muted mb-6 max-w-2xl">Подробно о каждом заболевании: симптомы, диагностика, современные методы лечения</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {MAMMOLOGY_CONDITIONS.map((c, i) => (
                <FadeInSection key={c.href} staggerIndex={i} className="h-full">
                  <a href={c.href} className="clay clay-card p-6 flex flex-col group hover:shadow-lg transition-shadow">
                    <h3 className="font-bold text-clay-dark text-lg mb-2 group-hover:text-clay-mint transition-colors">{c.title}</h3>
                    <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1">{c.desc}</p>
                    <span className="text-sm font-semibold text-clay-mint flex items-center gap-1">
                      Подробнее <ArrowRight size={14} />
                    </span>
                  </a>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* INTERNAL LINKS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-xl heading-serif text-clay-dark mb-5">Полезные разделы</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="/vab" className="clay clay-card-soft-mint p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <Zap size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">ВАБ - подробнее о процедуре</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Как проходит, показания, сравнение с операцией, цены</p>
                </div>
              </a>
              <a href="/doctors" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <CheckCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">Наши врачи-маммологи</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Онкологи-хирурги с опытом более 20 лет</p>
                </div>
              </a>
                <button type="button" data-booking-btn="true" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow text-left w-full">
                <MessageCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">Бесплатное второе мнение</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Рекомендовали операцию? Проверим показания и расскажем о вариантах</p>
                </div>
              </button>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-soft-mint p-6 md:p-8 text-center">
              <Clock size={40} className="text-clay-mint mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                Нужна спокойная очная оценка?
              </h2>
              <p className="text-clay-muted mb-5 max-w-md mx-auto">
                Запишитесь на приём или получите бесплатное второе мнение. Клиника находится в Санкт-Петербурге, на Богатырском проспекте, рядом с м. Комендантский проспект и м. Старая Деревня.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на ВАБ
                  <ArrowRight size={16} />
                </button>
                <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <div className="container-clay">
        <FaqSection items={MAMMOLOGY_FAQ} title="Частые вопросы о маммологии" />
      </div>
    </div>
  )
}
