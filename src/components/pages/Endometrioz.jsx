import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { ResponsiveDoctorCollection } from '../ResponsiveDoctorCollection.jsx'
import { ResponsiveDoctorHero } from '../ResponsiveDoctorHero.jsx'

export const ENDOMETRIOZ_FAQ = [
  {
    question: 'Что такое эндометриоз?',
    answer: 'Эндометриоз - заболевание, при котором ткань, похожая на эндометрий (внутреннюю оболочку матки), разрастается за её пределами: на яичниках, маточных трубах, брюшине, кишечнике, мочевом пузыре. Эти очаги реагируют на гормональный цикл - кровоточат во время менструации, вызывая воспаление и спаечный процесс.',
  },
  {
    question: 'Какие симптомы у эндометриоза?',
    answer: 'Наиболее частые симптомы: сильная боль во время менструации (дисменорея), хроническая тазовая боль, боль при половом контакте (диспареуния), обильные менструации, бесплодие. Выраженность симптомов не всегда соответствует распространённости процесса - минимальный эндометриоз может давать сильную боль.',
  },
  {
    question: 'Как диагностируют эндометриоз?',
    answer: 'Первичная диагностика включает осмотр гинеколога, трансвагинальное УЗИ (выявляет эндометриомы яичников) и МРТ малого таза (для глубокого инфильтративного эндометриоза). Маркер CA-125 неспецифичен и используется как вспомогательный. «Золотой стандарт» - лапароскопия с гистологической верификацией.',
  },
  {
    question: 'Можно ли вылечить эндометриоз без операции?',
    answer: 'Гормональная терапия (КОК, прогестины, ЛНГ-ВМС, агонисты ГнРГ) подавляет рост очагов и уменьшает симптомы. При эндометриомах, выраженном спаечном процессе или бесплодии может потребоваться хирургическое лечение - лапароскопическое удаление очагов. После операции обычно назначают гормональную поддержку.',
  },
  {
    question: 'Влияет ли эндометриоз на возможность забеременеть?',
    answer: 'Эндометриоз - одна из частых причин женского бесплодия: он обнаруживается у 30-50% женщин с проблемами зачатия. Механизм - спаечный процесс, нарушение функции яичников и изменение среды в малом тазу. При планировании беременности гинеколог подберёт тактику с учётом стадии заболевания.',
  },
  {
    question: 'Когда стоит обратиться к гинекологу?',
    answer: 'Поводом для консультации служат: боль внизу живота, не проходящая после менструации, очень болезненные месячные, боль при половом контакте, обильные кровотечения, а также безуспешные попытки забеременеть в течение года.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /гинеколог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('gynecology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Сильная боль во время менструации (дисменорея)' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Хроническая тазовая боль вне менструации' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Боль при половом контакте (диспареуния)' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Обильные менструации со сгустками' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Бесплодие или безуспешные попытки зачатия' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Боль при мочеиспускании или дефекации в дни менструации' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Трансвагинальное УЗИ', desc: 'Выявляет эндометриомы яичников и косвенные признаки спаечного процесса. Первый метод визуализации при подозрении на эндометриоз.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'МРТ малого таза', desc: 'Информативна при глубоком инфильтративном эндометриозе. Оценивает распространённость и вовлечение соседних органов.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Лапароскопия с биопсией', desc: '«Золотой стандарт» диагностики. Позволяет визуализировать очаги, взять биопсию и при необходимости провести лечение в рамках одного вмешательства.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Гормональная терапия', desc: 'КОК, прогестины, левоноргестрел-содержащая ВМС, агонисты ГнРГ - подавляют рост очагов и уменьшают болевой синдром.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Лапароскопическое удаление', desc: 'Иссечение или коагуляция очагов эндометриоза, удаление эндометриом, рассечение спаек. После операции - гормональная поддержка.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Комплексное ведение', desc: 'Сочетание медикаментозного и хирургического лечения, индивидуальная схема при планировании беременности или хронической боли.' },
]

const steps = [
  { n: '01', title: 'Приём гинеколога', desc: 'Сбор анамнеза, оценка болевого синдрома, осмотр. При необходимости - направление на обследование в день приёма.' },
  { n: '02', title: 'Инструментальная диагностика', desc: 'Трансвагинальное УЗИ, при показаниях - МРТ малого таза. Лабораторные анализы (CA-125, гормональный профиль).' },
  { n: '03', title: 'Определение стадии', desc: 'Гинеколог интерпретирует результаты, определяет распространённость процесса и формулирует тактику.' },
  { n: '04', title: 'Выбор лечения', desc: 'Гормональная терапия, хирургическое лечение или комбинированный подход - с учётом репродуктивных планов пациентки.' },
  { n: '05', title: 'Наблюдение и контроль', desc: 'УЗИ-контроль, коррекция терапии, мониторинг рецидивов. Частота визитов - по индивидуальному графику.' },
]

const relatedArticles = [
  { href: '/blog/endometrioz-prichiny-simptomy', title: 'Эндометриоз: причины, симптомы и лечение' },
  { href: '/blog/tazovye-boli-u-zhenshchin', title: 'Тазовые боли у женщин: 6 причин, которые нельзя игнорировать' },
  { href: '/blog/kak-prokhodit-priem-ginekologa', title: 'Как проходит приём гинеколога' },
]

const PAGE_STATS = [
  { val: '10', unit: '%', label: 'Женщин репродуктивного возраста страдают эндометриозом' },
  { val: '30-50', unit: '%', label: 'Пациенток с бесплодием имеют эндометриоз' },
  { val: '7-10', unit: 'лет', label: 'Среднее время до постановки диагноза' },
  { val: 'Лапаро', unit: '', label: 'Золотой стандарт диагностики' },
]

const VISIT_REASONS = [
  { text: 'Сильная боль во время менструации' },
  { text: 'Хроническая тазовая боль вне цикла' },
  { text: 'Боль при половом контакте' },
  { text: 'Не удаётся забеременеть более года' },
  { text: 'На УЗИ обнаружена эндометриома' },
]

const EXTRA_LINKS = [
  { href: '/gynecology', title: 'Гинекология - обзор направления', desc: 'Приём гинеколога и диагностика в Клинике Одинцова' },
]

const PAGE = {
  specialtyLabel: 'Гинекология, Приморский район СПб',
}

export function Endometrioz() {
  return (
    <div className="bg-[color:var(--surface-page)]">
      <section className="relative overflow-hidden grain-overlay border-b border-[color:var(--border-color)] bg-[color:var(--surface-accent)]">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="badge-specialty-peach-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                {PAGE.specialtyLabel}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Эндометриоз:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём гинеколога, УЗИ малого таза и подбор терапии в Клинике Одинцова на Богатырском проспекте.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Эндометриоз может быть причиной хронической тазовой боли и трудностей с зачатием. Гинеколог подберёт тактику с учётом симптомов и репродуктивных планов.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-peach gap-2">
                  Записаться к гинекологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Получить второе мнение
                </button>
              </div>
            </div>
            <ResponsiveDoctorHero
              doctors={SPECIALTY_DOCTORS}
              label="Карусель гинекологов на странице об эндометриозе"
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
                      <span className="text-3xl sm:text-4xl font-serif font-light text-clay-peach leading-none">{s.val}</span>
                      {s.unit && <span className="text-sm font-bold text-clay-peach leading-none pb-1">{s.unit}</span>}
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое эндометриоз</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>Эндометриоз - заболевание, при котором ткань, подобная эндометрию, обнаруживается за пределами полости матки: на яичниках, трубах, брюшине, иногда на кишечнике и мочевом пузыре.</p>
                  <p>Эти очаги реагируют на менструальный цикл, вызывая хроническое воспаление и формирование спаек. Симптомы варьируются от лёгкого дискомфорта до выраженной боли и бесплодия.</p>
                </div>
              </div>
              <aside className="clay clay-card-soft-peach p-5 md:p-6">
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика эндометриоза</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Комплексная диагностика помогает определить распространённость процесса и выбрать тактику.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение эндометриоза</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Тактика зависит от стадии, выраженности симптомов и репродуктивных планов.</p>
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
                <p className="text-clay-muted leading-relaxed mb-7">Пошагово от консультации до контроля над заболеванием.</p>
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
                <div className="clay clay-card-peach p-6 relative overflow-hidden">
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Второе мнение гинеколога</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Вам поставили диагноз эндометриоз и назначили операцию? Принесите результаты обследований, гинеколог оценит показания и обсудит варианты.</p>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/65 border border-white/80 px-4 py-2.5 text-clay-dark text-sm font-bold mb-4">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white text-sm py-2.5 w-full justify-center">
                    Получить второе мнение
                  </button>
                </div>
                <div className="clay clay-card p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-4">Когда стоит обратиться</h3>
                  <div className="space-y-3">
                    {VISIT_REASONS.map((item) => (
                      <div key={item.text} className="flex items-start gap-3">
                        <CheckCircle size={16} className="text-clay-peach mt-0.5 flex-shrink-0" />
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
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши гинекологи</h2>
                  <p className="text-clay-muted leading-relaxed max-w-2xl">Ведут приём в Приморском районе Санкт-Петербурга.</p>
                </div>
                <ResponsiveDoctorCollection
                  doctors={SPECIALTY_DOCTORS}
                  label="Карусель гинекологов клиники на странице об эндометриозе"
                  mobileClassName="md:hidden pt-8"
                  desktopClassName="hidden md:grid md:grid-cols-2 gap-6 pt-8"
                />
              </div>
              <aside className="clay clay-card-lg p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на гинекологию в СПб</h2>
                <p className="text-clay-muted leading-relaxed mb-5">Основные позиции для первичного визита. Полный перечень доступен в разделе цен.</p>
                <div className="divide-y divide-[color:var(--border-color)]">
                  {PRICE_CATEGORY.items.map((item) => (
                    <div key={item.name} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                      <span className="text-clay-peach font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
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
              <div className="clay clay-card-soft-peach p-6 md:p-8">
                <Clock size={34} className="text-clay-peach mb-4" />
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Запишитесь к гинекологу в Санкт-Петербурге</h2>
                <p className="text-clay-muted mb-5 leading-relaxed">Клиника Одинцова находится на Богатырском проспекте, рядом с м. Комендантский проспект и м. Старая Деревня.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-peach gap-2">
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
                    <a key={a.href} href={a.href} className="clay clay-card-soft-peach card-interactive card-interactive-peach p-5 flex items-start gap-3 group">
                      <BookOpen size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">{a.title}</p>
                        <p className="text-clay-muted text-xs">Читать статью</p>
                      </div>
                    </a>
                  ))}
                  {EXTRA_LINKS.map((a) => (
                    <a key={a.href} href={a.href} className="clay clay-card card-interactive card-interactive-peach p-5 flex items-start gap-3 group">
                      <Zap size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">{a.title}</p>
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
        <FaqSection items={ENDOMETRIOZ_FAQ} title="Частые вопросы об эндометриозе" />
      </div>
    </div>
  )
}
