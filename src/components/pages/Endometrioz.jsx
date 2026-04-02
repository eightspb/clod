import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'

export const ENDOMETRIOZ_FAQ = [
  {
    question: 'Что такое эндометриоз?',
    answer: 'Эндометриоз — заболевание, при котором ткань, похожая на эндометрий (внутреннюю оболочку матки), разрастается за её пределами: на яичниках, маточных трубах, брюшине, кишечнике, мочевом пузыре. Эти очаги реагируют на гормональный цикл — кровоточат во время менструации, вызывая воспаление и спаечный процесс.',
  },
  {
    question: 'Какие симптомы у эндометриоза?',
    answer: 'Наиболее частые симптомы: сильная боль во время менструации (дисменорея), хроническая тазовая боль, боль при половом контакте (диспареуния), обильные менструации, бесплодие. Выраженность симптомов не всегда соответствует распространённости процесса — минимальный эндометриоз может давать сильную боль.',
  },
  {
    question: 'Как диагностируют эндометриоз?',
    answer: 'Первичная диагностика включает осмотр гинеколога, трансвагинальное УЗИ (выявляет эндометриомы яичников) и МРТ малого таза (для глубокого инфильтративного эндометриоза). Маркер CA-125 неспецифичен и используется как вспомогательный. «Золотой стандарт» — лапароскопия с гистологической верификацией.',
  },
  {
    question: 'Можно ли вылечить эндометриоз без операции?',
    answer: 'Гормональная терапия (КОК, прогестины, ЛНГ-ВМС, агонисты ГнРГ) подавляет рост очагов и уменьшает симптомы. При эндометриомах, выраженном спаечном процессе или бесплодии может потребоваться хирургическое лечение — лапароскопическое удаление очагов. После операции обычно назначают гормональную поддержку.',
  },
  {
    question: 'Влияет ли эндометриоз на возможность забеременеть?',
    answer: 'Эндометриоз — одна из частых причин женского бесплодия: он обнаруживается у 30–50% женщин с проблемами зачатия. Механизм — спаечный процесс, нарушение функции яичников и изменение среды в малом тазу. При планировании беременности гинеколог подберёт тактику с учётом стадии заболевания.',
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
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Гормональная терапия', desc: 'КОК, прогестины, левоноргестрел-содержащая ВМС, агонисты ГнРГ — подавляют рост очагов и уменьшают болевой синдром.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Лапароскопическое удаление', desc: 'Иссечение или коагуляция очагов эндометриоза, удаление эндометриом, рассечение спаек. После операции — гормональная поддержка.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Комплексное ведение', desc: 'Сочетание медикаментозного и хирургического лечения, индивидуальная схема при планировании беременности или хронической боли.' },
]

const steps = [
  { n: '01', title: 'Приём гинеколога', desc: 'Сбор анамнеза, оценка болевого синдрома, осмотр. При необходимости — направление на обследование в день приёма.' },
  { n: '02', title: 'Инструментальная диагностика', desc: 'Трансвагинальное УЗИ, при показаниях — МРТ малого таза. Лабораторные анализы (CA-125, гормональный профиль).' },
  { n: '03', title: 'Определение стадии', desc: 'Гинеколог интерпретирует результаты, определяет распространённость процесса и формулирует тактику.' },
  { n: '04', title: 'Выбор лечения', desc: 'Гормональная терапия, хирургическое лечение или комбинированный подход — с учётом репродуктивных планов пациентки.' },
  { n: '05', title: 'Наблюдение и контроль', desc: 'УЗИ-контроль, коррекция терапии, мониторинг рецидивов. Частота визитов — по индивидуальному графику.' },
]

const relatedArticles = [
  { href: '/blog/endometrioz-prichiny-simptomy', title: 'Эндометриоз: причины, симптомы и лечение' },
  { href: '/blog/tazovye-boli-u-zhenshchin', title: 'Тазовые боли у женщин: 6 причин, которые нельзя игнорировать' },
  { href: '/blog/kak-prokhodit-priem-ginekologa', title: 'Как проходит приём гинеколога' },
]

export function Endometrioz() {
  return (
    <div>
      <section className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div>
              <div className="badge-specialty-peach-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                Гинекология · Приморский район СПб
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Эндометриоз:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём гинеколога, УЗИ малого таза и подбор терапии — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Эндометриоз — одна из самых частых причин хронической тазовой боли и бесплодия у женщин. Гинеколог определит стадию заболевания и подберёт тактику лечения с учётом ваших репродуктивных планов.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться к гинекологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Получить второе мнение
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
                { val: '10', unit: '%', label: 'Женщин репродуктивного возраста страдают эндометриозом' },
                { val: '30–50', unit: '%', label: 'Пациенток с бесплодием имеют эндометриоз' },
                { val: '7–10', unit: 'лет', label: 'Среднее время до постановки диагноза' },
                { val: 'Лапаро', unit: '', label: '«Золотой стандарт» диагностики' },
              ].map((s) => (
                <div key={s.label} className="clay clay-card card-interactive p-4 text-center">
                  <div className="flex items-end justify-center gap-0.5">
                    <span className="text-3xl sm:text-4xl font-serif font-light text-clay-peach leading-none">{s.val}</span>
                    {s.unit && <span className="text-lg font-bold text-clay-peach leading-none pb-0.5">{s.unit}</span>}
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
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое эндометриоз</h2>
            <p className="text-clay-muted mb-4 max-w-2xl leading-relaxed">
              Эндометриоз — заболевание, при котором ткань, подобная эндометрию (внутренней оболочке матки), обнаруживается за пределами полости матки: на яичниках, маточных трубах, брюшине, иногда — на кишечнике и мочевом пузыре. Эти очаги реагируют на менструальный цикл — кровоточат, вызывая хроническое воспаление и формирование спаек.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Одна из основных теорий развития — ретроградная менструация: заброс менструальной крови через маточные трубы в брюшную полость. Симптомы варьируются от лёгкого дискомфорта до изнуряющей боли и бесплодия.
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика эндометриоза</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Комплексная диагностика для определения стадии и распространённости процесса</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение эндометриоза</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Тактика зависит от стадии, выраженности симптомов и репродуктивных планов</p>
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
                <p className="text-clay-muted mb-6 leading-relaxed">Пошагово — от консультации до контроля над заболеванием</p>
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
                <div className="clay clay-card-peach p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Второе мнение гинеколога</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">
                    Вам поставили диагноз «эндометриоз» и назначили операцию? Принесите результаты обследований — гинеколог оценит показания и обсудит варианты.
                  </p>
                  <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-clay-dark text-sm font-bold">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white mt-4 text-sm py-2.5 w-full justify-center">
                    Получить второе мнение
                  </button>
                </div>
                <div className="clay clay-card card-interactive p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-3">Когда стоит обратиться</h3>
                  <div className="space-y-2.5">
                    {[
                      'Сильная боль во время менструации',
                      'Хроническая тазовая боль вне цикла',
                      'Боль при половом контакте',
                      'Не удаётся забеременеть более года',
                      'На УЗИ обнаружена эндометриома',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши гинекологи</h2>
              <p className="text-clay-muted">Ведут приём в Приморском районе Санкт-Петербурга</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на гинекологию в СПб</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {PRICE_CATEGORY.items.map((item) => (
                <div key={item.name} className="clay clay-card card-interactive flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-peach font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedArticles.map((a) => (
                <a key={a.href} href={a.href} className="clay clay-card-soft-peach card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                  <BookOpen size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">{a.title}</p>
                    <p className="text-clay-muted text-xs">Читать статью →</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-4">
              <a href="/gynecology" className="clay clay-card card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow inline-flex max-w-md">
                <Zap size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Гинекология — обзор направления</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Приём гинеколога и диагностика в Клинике Одинцова</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-soft-peach p-6 md:p-8 text-center">
              <Clock size={40} className="text-clay-peach mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                Запишитесь к гинекологу в Санкт-Петербурге
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
        <FaqSection items={ENDOMETRIOZ_FAQ} title="Частые вопросы об эндометриозе" />
      </div>
    </div>
  )
}
