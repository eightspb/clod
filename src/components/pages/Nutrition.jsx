import { ArrowRight, Apple, Target, BookOpen, CheckCircle, MessageCircle, Zap, Users, Clock } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data.js'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { ResponsiveDoctorHero } from '../ResponsiveDoctorHero.jsx'

export const NUTRITION_FAQ = [
  {
    question: 'Чем нутрициолог отличается от диетолога?',
    answer: 'Диетолог - это врач, который назначает лечебные диеты при заболеваниях. Нутрициолог фокусируется на оптимизации повседневного питания, коррекции дефицитов и формировании устойчивых пищевых привычек. В нашей клинике нутрициолог работает в связке с эндокринологом, что позволяет учитывать медицинский контекст.',
  },
  {
    question: 'Когда стоит обратиться к нутрициологу?',
    answer: 'Консультация полезна при сложностях со снижением или набором веса, хронической усталости, проблемах с пищеварением, выпадении волос и ломкости ногтей. Также нутрициолог помогает при подготовке к беременности и при необходимости скорректировать питание на фоне эндокринных нарушений.',
  },
  {
    question: 'Как проходит приём нутрициолога?',
    answer: 'На первичном приёме специалист подробно разбирает ваш рацион, режим дня, образ жизни и имеющиеся жалобы. При наличии анализов оценивает дефициты. По итогам составляется индивидуальный план питания с учётом ваших предпочтений, бюджета и целей.',
  },
  {
    question: 'Нужны ли анализы перед приёмом?',
    answer: 'Если есть свежие результаты анализов (не старше 3-6 месяцев), возьмите их с собой. Если анализов нет, приходите без них. Специалист соберёт анамнез и назначит только те исследования, которые действительно нужны в вашем случае.',
  },
  {
    question: 'Поможет ли нутрициолог при гормональных нарушениях?',
    answer: 'Да, питание играет важную роль при инсулинорезистентности, гипотиреозе, СПКЯ и других эндокринных состояниях. Коррекция рациона помогает улучшить самочувствие и усилить эффект медикаментозной терапии. Нутрициолог согласовывает план питания с лечащим эндокринологом.',
  },
  {
    question: 'Сколько длится курс нутрициологической поддержки?',
    answer: 'Обычно достаточно 2-3 приёмов: первичная для сбора информации, повторная для выдачи плана питания с учётом анализов и контрольная через 1-2 месяца для оценки динамики. При сложных случаях сопровождение может быть более длительным.',
  },
]

const NUTRITION_FEATURES = [
  {
    icon: <Target size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    title: 'Персональный план',
    subtitle: 'Под цели, ритм и ограничения',
    desc: 'Мы не выдаём шаблонные меню на неделю. Рацион учитывает предпочтения, бюджет, график и сопутствующие состояния.',
    badge: 'Индивидуально',
  },
  {
    icon: <BookOpen size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    title: 'Доказательная база',
    subtitle: 'Без добавок "на всякий случай"',
    desc: 'Опираемся на современные клинические рекомендации и назначаем добавки только при подтверждённых дефицитах.',
    badge: 'Только наука',
  },
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    title: 'Постепенные изменения',
    subtitle: 'Без жёстких ограничений',
    desc: 'Работаем с пищевым поведением бережно и без давления, чтобы новые привычки были устойчивыми в повседневной жизни.',
    badge: 'Бережно',
  },
]

const NUTRITION_CONDITIONS = [
  'Избыточный вес и ожирение',
  'Дефицит массы тела',
  'Инсулинорезистентность',
  'Нарушения пищеварения (СРК, вздутия)',
  'Хроническая усталость и упадок сил',
  'Выпадение волос и ломкость ногтей',
  'Дефициты витаминов и минералов',
  'Подготовка к беременности',
  'Нарушения пищевого поведения',
  'Заболевания щитовидной железы',
]

const NUTRITION_MYTHS = [
  {
    myth: '«Чтобы похудеть, нужно отказаться от сладкого, мучного и углеводов»',
    truth: 'Снижение веса зависит от баланса калорий. Мы учим вписывать любимые продукты в рацион так, чтобы худеть комфортно и без срывов.',
  },
  {
    myth: '«Здоровое питание - это дорого и сложно готовить»',
    truth: 'Основу здорового рациона составляют простые, доступные продукты: крупы, сезонные овощи, яйца, птица. Мы покажем, как питаться вкусно, недорого и быстро.',
  },
  {
    myth: '«У меня плохая генетика, питание не поможет»',
    truth: 'Генетика влияет лишь на часть факторов. Правильно подобранный рацион и образ жизни могут заметно улучшить самочувствие и повседневную устойчивость привычек.',
  },
]

const NUTRITION_STATS = [
  { val: 'План', label: 'подбираем рацион под образ жизни и цели' },
  { val: 'Без диет', label: 'жёстких ограничений как основы подхода' },
  { val: '2-3', label: 'приёма для старта и корректировки плана' },
  { val: 'Доказательно', label: 'опираемся на клинические рекомендации' },
]

const NUTRITION_PLAN_POINTS = [
  'Анализ текущего рациона и выявление ошибок',
  'Индивидуальный расчёт КБЖУ',
  'Списки покупок и конструктор блюд',
  'Коррекция дефицитов по анализам',
]

const NUTRITION_PLAN_FAQ = [
  { q: 'Нужно ли считать калории?', a: 'Не обязательно. Мы предлагаем разные методы: правило тарелки, порции с ладонь, интуитивное питание.' },
  { q: 'Можно ли есть сладкое?', a: 'Да! Мы поможем вписать любимые десерты в рацион так, чтобы они не мешали результату.' },
  { q: 'Как долго соблюдать план?', a: 'План пересматривается в динамике и может меняться вместе с вашими целями и состоянием здоровья.' },
]

const NUTRITION_DOCTORS = DOCTORS.filter(d => /нутрициолог/i.test(d.specialization))
const NUTRITION_PRICE_CATEGORY = getShortPriceCategoryBySlug('nutrition')

export function Nutrition() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden grain-overlay">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-14 items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
                  <Apple size={12} />
                  Нутрициология
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Нутрициология в Санкт-Петербурге:{' '}
                <span className="heading-accent">персональный план питания</span> без жёстких диет
              </h1>
              <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Если хочется выстроить питание спокойно и без крайностей, начнём с анализа привычек и результатов обследований
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться к нутрициологу
                  <ArrowRight size={16} />
                </button>
                <a href="/prices" className="clay btn-clay-secondary">
                  Посмотреть цены
                </a>
              </div>
            </div>
            <ResponsiveDoctorHero doctors={NUTRITION_DOCTORS} label="Карусель нутрициологов в начале страницы" ctaHref="/second-opinion" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
              <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="border-b border-[color:var(--border-color)] p-5 md:p-6 lg:border-b-0 lg:border-r">
                  <p className="text-sm font-semibold text-clay-dark mb-2">План, который можно встроить в жизнь</p>
                  <p className="text-sm leading-relaxed text-clay-muted">
                    Санкт-Петербург, Приморский район, Богатырский проспект. Удобно добираться от м. Комендантский проспект и м. Старая Деревня. Сначала оцениваем привычки и дефициты, затем обсуждаем реалистичный план.
                  </p>
                </div>
                <div className="grid grid-cols-2" data-route-stats>
                  {NUTRITION_STATS.map((s, i) => (
                    <div key={s.label} className={`p-5 md:p-6 border-[color:var(--border-color)] ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''}`}>
                      <div className="text-xl sm:text-2xl xl:text-3xl font-serif font-light text-clay-mint leading-none mb-3">{s.val}</div>
                      <p className="text-sm md:text-base text-clay-muted leading-snug break-words">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FEATURES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="max-w-3xl mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наш подход к питанию</h2>
              <p className="text-clay-muted">Научно обоснованный разбор питания, анализов и привычек без перегрузки и давления</p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
              {NUTRITION_FEATURES.map((f, i) => (
                <FadeInSection key={f.title} staggerIndex={i}>
                  <div className={`grid gap-4 px-5 py-5 md:grid-cols-[56px_minmax(0,1fr)_auto] md:items-center ${i === NUTRITION_FEATURES.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                    <div className={f.bg}>{f.icon}</div>
                    <div>
                      <h3 className="font-bold text-clay-dark text-lg leading-tight">{f.title}</h3>
                      <p className="text-clay-mint text-sm font-semibold mt-1">{f.subtitle}</p>
                      <p className="text-clay-muted text-sm leading-relaxed mt-2">{f.desc}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-mint)] px-3 py-1.5 text-xs font-semibold text-clay-mint md:justify-self-end">
                      <CheckCircle size={12} />
                      {f.badge}
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CONDITIONS + MYTHS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-8">
              <div>
                <h2 className="text-2xl heading-serif text-clay-dark mb-4">С чем можно обратиться</h2>
                <p className="text-clay-muted text-sm leading-relaxed mb-5">
                  Работаем с питанием при различных состояниях здоровья и при запросе на более устойчивые привычки
                </p>
                <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-xs)]">
                  {NUTRITION_CONDITIONS.map((name, i) => (
                    <div key={name} className={`flex items-center gap-3 px-4 py-3 ${i === NUTRITION_CONDITIONS.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                      <CheckCircle size={16} className="text-clay-mint flex-shrink-0" />
                      <span className="text-sm font-medium text-clay-dark">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-2xl heading-serif text-clay-dark mb-2">Мифы о питании</h2>
                <p className="text-clay-muted text-sm mb-4">Спокойно разбираем популярные стереотипы и оставляем только то, что работает на практике</p>
                <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-xs)]">
                  {NUTRITION_MYTHS.map((m, i) => (
                    <div key={m.myth} className={`p-5 ${i === NUTRITION_MYTHS.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                      <p className="font-semibold text-clay-dark text-sm mb-2">{m.myth}</p>
                      <p className="text-clay-muted text-sm leading-relaxed">{m.truth}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* SPOTLIGHT */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-mint p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-8 items-start">
                <div>
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                    Персональный план питания
                  </h2>
                  <p className="text-clay-text leading-relaxed mb-5">
                    Это не распечатка стандартной диеты из интернета. Мы анализируем ваш дневник питания, анализы и образ жизни, чтобы создать последовательный план, который реально вписать в повседневность.
                  </p>
                  <div className="space-y-3">
                    {NUTRITION_PLAN_POINTS.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-clay-text text-sm">
                        <CheckCircle size={16} className="flex-shrink-0 text-clay-mint" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-[22px] border border-white/80 bg-white/60">
                  {NUTRITION_PLAN_FAQ.map((faq, i) => (
                    <div key={faq.q} className={`p-4 ${i === NUTRITION_PLAN_FAQ.length - 1 ? '' : 'border-b border-white/80'}`}>
                      <p className="font-bold text-clay-dark text-sm mb-1">{faq.q}</p>
                      <p className="text-clay-text text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* PRICES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="max-w-3xl mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Ориентировочные цены на нутрициологию</h2>
              <p className="text-clay-muted">Стоимость зависит от формата приёма и объёма сопровождения</p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)] mb-5">
              {NUTRITION_PRICE_CATEGORY.items.map((item, i) => (
                <div key={item.name} className={`flex items-center justify-between gap-4 px-5 py-4 ${i === NUTRITION_PRICE_CATEGORY.items.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-mint font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-clay-muted max-w-2xl leading-relaxed mb-5">
              {NUTRITION_PRICE_CATEGORY.note}
            </p>
            <a href={NUTRITION_PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
              Полный прайс-лист →
            </a>
          </div>
        </section>
      </FadeInSection>

      {/* INTERNAL LINKS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-xl heading-serif text-clay-dark mb-5">Полезные разделы</h2>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
              <a href="/doctors" className="group grid gap-3 px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <Users size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">Наши специалисты</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Врачи доказательной медицины</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-mint transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <a href={NUTRITION_PRICE_CATEGORY.fullPriceHref} className="group grid gap-3 border-t border-[color:var(--border-color)] px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <CheckCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">Цены на услуги</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Официальный полный прайс-лист клиники</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-mint transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <a href="/contacts" className="group grid gap-3 border-t border-[color:var(--border-color)] px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <Clock size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">Как добраться</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Адрес, район и удобные ориентиры для визита</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-blue transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <button type="button" data-booking-btn="true" className="group grid w-full gap-3 border-t border-[color:var(--border-color)] px-5 py-5 text-left transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <MessageCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">Записаться на приём</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Поможем выбрать удобное время и формат визита</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-mint transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </button>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <Apple size={32} className="text-clay-mint mb-4" />
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                    Нужен спокойный план питания без крайностей?
                  </h2>
                  <p className="text-clay-muted max-w-2xl">
                    Запишитесь к нутрициологу. Разберём жалобы, дефициты и привычки, чтобы предложить реалистичный план.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                    Записаться
                    <ArrowRight size={16} />
                  </button>
                  <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                    Telegram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <div className="container-clay">
        <FaqSection items={NUTRITION_FAQ} title="Частые вопросы о нутрициологии" />
      </div>
    </div>
  )
}
