import { ArrowRight, Apple, Target, BookOpen, CheckCircle, MessageCircle, Zap, Users, Clock } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data.js'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'

export const NUTRITION_FAQ = [
  {
    question: 'Чем нутрициолог отличается от диетолога?',
    answer: 'Диетолог — это врач, который назначает лечебные диеты при заболеваниях. Нутрициолог фокусируется на оптимизации повседневного питания, коррекции дефицитов и формировании устойчивых пищевых привычек. В нашей клинике нутрициолог работает в связке с эндокринологом, что позволяет учитывать медицинский контекст.',
  },
  {
    question: 'Когда стоит обратиться к нутрициологу?',
    answer: 'Консультация полезна при сложностях со снижением или набором веса, хронической усталости, проблемах с пищеварением, выпадении волос и ломкости ногтей. Также нутрициолог помогает при подготовке к беременности и при необходимости скорректировать питание на фоне эндокринных нарушений.',
  },
  {
    question: 'Как проходит приём нутрициолога?',
    answer: 'На первичном приёме специалист подробно разбирает ваш рацион, режим дня, образ жизни и имеющиеся жалобы. При наличии анализов — оценивает дефициты. По итогам составляется индивидуальный план питания с учётом ваших предпочтений, бюджета и целей.',
  },
  {
    question: 'Нужны ли анализы перед приёмом?',
    answer: 'Если есть свежие результаты анализов (не старше 3–6 месяцев), возьмите их с собой. Если анализов нет — приходите без них. Специалист соберёт анамнез и назначит только те исследования, которые действительно нужны в вашем случае.',
  },
  {
    question: 'Поможет ли нутрициолог при гормональных нарушениях?',
    answer: 'Да, питание играет важную роль при инсулинорезистентности, гипотиреозе, СПКЯ и других эндокринных состояниях. Коррекция рациона помогает улучшить самочувствие и усилить эффект медикаментозной терапии. Нутрициолог согласовывает план питания с лечащим эндокринологом.',
  },
  {
    question: 'Сколько длится курс нутрициологической поддержки?',
    answer: 'Обычно достаточно 2–3 приёмов: первичная для сбора информации, повторная для выдачи плана питания с учётом анализов и контрольная через 1–2 месяца для оценки динамики. При сложных случаях сопровождение может быть более длительным.',
  },
]

const features = [
  {
    icon: <Target size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Персональный план',
    subtitle: 'Под цели, ритм и ограничения',
    desc: 'Мы не выдаём шаблонные меню на неделю. Рацион учитывает предпочтения, бюджет, график и сопутствующие состояния.',
    badge: 'Индивидуально',
  },
  {
    icon: <BookOpen size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Доказательная база',
    subtitle: 'Без добавок "на всякий случай"',
    desc: 'Опираемся на современные клинические рекомендации и назначаем добавки только при подтверждённых дефицитах.',
    badge: 'Только наука',
  },
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Постепенные изменения',
    subtitle: 'Без жёстких ограничений',
    desc: 'Работаем с пищевым поведением бережно и без давления, чтобы новые привычки были устойчивыми в повседневной жизни.',
    badge: 'Бережно',
  },
]

const conditions = [
  { name: 'Избыточный вес и ожирение', icon: '⚖️' },
  { name: 'Дефицит массы тела', icon: '📉' },
  { name: 'Инсулинорезистентность', icon: '🩸' },
  { name: 'Нарушения пищеварения (СРК, вздутия)', icon: '🥗' },
  { name: 'Хроническая усталость и упадок сил', icon: '🔋' },
  { name: 'Выпадение волос и ломкость ногтей', icon: '💅' },
  { name: 'Дефициты витаминов и минералов', icon: '💊' },
  { name: 'Подготовка к беременности', icon: '👶' },
  { name: 'Нарушения пищевого поведения', icon: '🧠' },
  { name: 'Заболевания щитовидной железы', icon: '🦋' },
]

const myths = [
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
const NUTRITION_DOCTORS = DOCTORS.filter(d => /нутрициолог/i.test(d.specialization))
const NUTRITION_PRICE_CATEGORY = getShortPriceCategoryBySlug('nutrition')

export function Nutrition() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div>
              <div className="badge-specialty-mint inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Apple size={12} />
                Нутрициология
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Нутрициология в Санкт-Петербурге:{' '}
                <span className="heading-accent">персональный план питания</span> без жёстких диет
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Если хочется выстроить питание спокойно и без крайностей, начнём с анализа привычек и результатов обследований
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Санкт-Петербург, Приморский район, Богатырский проспект. Удобно добираться от м. Комендантский проспект и м. Старая Деревня. Сначала оцениваем привычки и дефициты, затем обсуждаем реалистичный план.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться к нутрициологу
                  <ArrowRight size={16} />
                </button>
                <a href="/prices" className="clay btn-clay-secondary">
                  Посмотреть цены
                </a>
              </div>
            </div>
            <HeroDoctorCard doctors={NUTRITION_DOCTORS} />
          </div>
        </div>
      </section>

      {/* STATS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { val: 'План', label: 'подбираем рацион под образ жизни и цели' },
                { val: 'Без диет', label: 'жёстких ограничений как основы подхода' },
                { val: '2–3', label: 'приёма для старта и корректировки плана' },
                { val: 'Доказательно', label: 'опираемся на клинические рекомендации' },
              ].map((s) => (
                <div key={s.label} className="clay clay-card p-4 text-center">
                  <div className="text-3xl sm:text-4xl font-serif font-light text-clay-mint leading-none mb-1.5">{s.val}</div>
                  <p className="text-xs text-clay-muted leading-tight">{s.label}</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наш подход к питанию</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Научно обоснованный разбор питания, анализов и привычек без перегрузки и давления</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <FadeInSection key={f.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${f.card} card-interactive p-6 flex flex-col`}>
                    <div className={`${f.bg} mb-4`}>{f.icon}</div>
                    <h3 className="font-bold text-clay-dark text-lg mb-1">{f.title}</h3>
                    <p className="text-clay-mint text-sm font-semibold mb-3">{f.subtitle}</p>
                    <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{f.desc}</p>
                    <div className="badge-specialty-mint inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl heading-serif text-clay-dark mb-4">С чем можно обратиться</h2>
                <p className="text-clay-muted text-sm leading-relaxed mb-5">
                  Работаем с питанием при различных состояниях здоровья и при запросе на более устойчивые привычки
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {conditions.map((c) => (
                    <div key={c.name} className="clay clay-card flex items-center gap-3 px-4 py-3">
                      <span className="text-lg flex-shrink-0">{c.icon}</span>
                      <span className="text-sm font-medium text-clay-dark">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl heading-serif text-clay-dark mb-2">Мифы о питании</h2>
                <p className="text-clay-muted text-sm mb-4">Спокойно разбираем популярные стереотипы и оставляем только то, что работает на практике</p>
                {myths.map((m, i) => (
                  <div key={i} className="clay clay-card p-5">
                    <p className="font-semibold text-clay-dark text-sm mb-2">{m.myth}</p>
                    <p className="text-clay-muted text-sm leading-relaxed border-l-2 border-clay-mint pl-3">{m.truth}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* SPOTLIGHT */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-mint p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                    Персональный план питания
                  </h2>
                  <p className="text-clay-text leading-relaxed mb-5">
                    Это не распечатка стандартной диеты из интернета. Мы анализируем ваш дневник питания, анализы и образ жизни, чтобы создать последовательный план, который реально вписать в повседневность.
                  </p>
                  <div className="space-y-3">
                    {[
                      'Анализ текущего рациона и выявление ошибок',
                      'Индивидуальный расчёт КБЖУ',
                      'Списки покупок и конструктор блюд',
                      'Коррекция дефицитов по анализам',
                    ].map((p) => (
                      <div key={p} className="flex items-center gap-2 text-clay-text text-sm">
                        <CheckCircle size={16} className="flex-shrink-0 text-clay-mint" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { q: 'Нужно ли считать калории?', a: 'Не обязательно. Мы предлагаем разные методы: правило тарелки, порции с ладонь, интуитивное питание.' },
                    { q: 'Можно ли есть сладкое?', a: 'Да! Мы поможем вписать любимые десерты в рацион так, чтобы они не мешали результату.' },
                    { q: 'Как долго соблюдать план?', a: 'План пересматривается в динамике и может меняться вместе с вашими целями и состоянием здоровья.' },
                  ].map((faq) => (
                    <div key={faq.q} className="bg-white/55 border border-white/75 rounded-2xl p-4">
                      <p className="font-bold text-clay-dark text-sm mb-1">- {faq.q}</p>
                      <p className="text-clay-text text-sm">{faq.a}</p>
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
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Ориентировочные цены на нутрициологию</h2>
              <p className="text-clay-muted">Стоимость зависит от формата приёма и объёма сопровождения</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {NUTRITION_PRICE_CATEGORY.items.map((item) => (
                <div key={item.name} className="clay clay-card flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-mint font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-clay-muted max-w-2xl mx-auto leading-relaxed mb-5">
              {NUTRITION_PRICE_CATEGORY.note}
            </p>
            <div className="text-center">
              <a href={NUTRITION_PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
                Полный прайс-лист →
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* INTERNAL LINKS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-xl heading-serif text-clay-dark mb-5">Полезные разделы</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/doctors" className="clay clay-card-soft-mint p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <Users size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1">Наши специалисты</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Врачи доказательной медицины</p>
                </div>
              </a>
              <a href={NUTRITION_PRICE_CATEGORY.fullPriceHref} className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <CheckCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1">Цены на услуги</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Официальный полный прайс-лист клиники</p>
                </div>
              </a>
              <a href="/contacts" className="clay clay-card-soft-blue p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <Clock size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1">Как добраться</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Адрес, район и удобные ориентиры для визита</p>
                </div>
              </a>
              <button type="button" data-booking-btn="true" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <MessageCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold text-clay-dark text-sm mb-1">Записаться на приём</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Поможем выбрать удобное время и формат визита</p>
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
              <Apple size={40} className="text-clay-mint mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                Нужен спокойный план питания без крайностей?
              </h2>
              <p className="text-clay-muted mb-5 max-w-md mx-auto">
                Запишитесь к нутрициологу. Разберём жалобы, дефициты и привычки, чтобы предложить реалистичный план.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
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
        </section>
      </FadeInSection>

      <div className="container-clay">
        <FaqSection items={NUTRITION_FAQ} title="Частые вопросы о нутрициологии" />
      </div>
    </div>
  )
}
