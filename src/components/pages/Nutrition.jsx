import { ArrowRight, Apple, Target, BookOpen, CheckCircle, MessageCircle, Zap, Users } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { FaqSection } from '../FaqSection.jsx'

export const NUTRITION_FAQ = [
  {
    question: 'Чем занимается нутрициолог?',
    answer: 'Нутрициолог анализирует ваш рацион, образ жизни и анализы для составления индивидуального плана питания. Мы помогаем скорректировать дефициты, снизить вес, улучшить самочувствие и пищеварение с помощью научно доказанных методов.',
  },
  {
    question: 'Нужно ли сдавать анализы перед приёмом?',
    answer: 'Если у вас есть свежие результаты анализов (не старше 3-6 месяцев) - возьмите их с собой. Если нет, лучше сначала прийти на первичную консультацию, где врач соберёт анамнез и назначит только те исследования, которые действительно необходимы в вашем случае.',
  },
  {
    question: 'Вы составляете жёсткие диеты?',
    answer: 'Нет. Жёсткие диеты не работают в долгосрочной перспективе и приводят к срывам. Мы обучаем принципам здорового питания, помогая сформировать комфортный рацион из доступных продуктов, который вы сможете поддерживать всю жизнь.',
  },
  {
    question: 'Помогаете ли вы при эндокринных нарушениях?',
    answer: 'Да, питание играет ключевую роль при инсулинорезистентности, гипотиреозе, СПКЯ и других состояниях. Наш нутрициолог работает в тесной связке с эндокринологом клиники для достижения наилучших результатов.',
  },
  {
    question: 'Как часто нужно посещать нутрициолога?',
    answer: 'Обычно достаточно 2-3 консультаций: первичная для сбора информации, повторная для разбора анализов и выдачи плана питания, и контрольная через 1-2 месяца для оценки результатов и корректировки плана.',
  },
]

const features = [
  {
    icon: <Target size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Персональный подход',
    subtitle: 'План под ваши цели и образ жизни',
    desc: 'Мы не выдаём шаблонные меню на неделю. Ваш рацион будет учитывать ваши вкусовые предпочтения, бюджет, график работы и наличие сопутствующих заболеваний.',
    badge: 'Индивидуально',
  },
  {
    icon: <BookOpen size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Доказательная база',
    subtitle: 'Без БАДов "на всякий случай"',
    desc: 'Опираемся на современные клинические рекомендации и научные данные. Назначаем добавки только при подтверждённых дефицитах, а основу здоровья строим через полноценный рацион.',
    badge: 'Только наука',
  },
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Комфортное внедрение',
    subtitle: 'Без срывов и чувства вины',
    desc: 'Работаем с пищевым поведением бережно. Помогаем выстроить здоровые отношения с едой, избавиться от тяги к сладкому и компульсивных перееданий без жёстких ограничений.',
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
    truth: 'Генетика влияет лишь на часть факторов. Правильно подобранный рацион и образ жизни способны значительно улучшить здоровье и качество жизни при любой генетике.',
  },
]

export function Nutrition() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-12">
        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(78,200,168,0.18)', color: '#2B8A72' }}>
              <Apple size={12} />
              Нутрициология и превентивная медицина
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Нутрициология в Санкт-Петербурге:{' '}
              <span className="text-clay-mint">здоровье и энергия</span> через правильное питание
            </h1>
            <p className="text-lg text-clay-muted font-medium mb-3">
              «Устал от постоянных диет, срывов и отсутствия энергии»
            </p>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Еда — это основа вашего самочувствия. Мы помогаем нормализовать вес, восполнить дефициты и вернуть радость к жизни без жёстких ограничений и бесполезных БАДов.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #88DFB8, #4EC8A8)', boxShadow: '10px 10px 24px hsl(160, 15%, 70%), inset -4px -4px 9px hsla(160, 30%, 45%, 0.65), inset 0px 7px 14px hsla(160, 60%, 90%, 0.5)' }}>
                Записаться к нутрициологу
                <ArrowRight size={16} />
              </button>
              <a href="/prices" className="clay btn-clay-secondary">
                Посмотреть цены
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { val: 'Персонально', label: 'подбираем рацион под образ жизни и цели' },
              { val: '0', label: 'жёстких диет и запретов как основы подхода' },
              { val: '2–3', label: 'консультации для старта и корректировки плана' },
              { val: 'EBM', label: 'доказательная база' },
            ].map((s) => (
              <div key={s.label} className="clay clay-card p-4 text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-clay-mint leading-none mb-1.5">{s.val}</div>
                <p className="text-xs text-clay-muted leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Наш подход к питанию</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Научно обоснованные методы для долгосрочного результата</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className={`clay ${f.card} p-6 flex flex-col`}>
                <div className={`${f.bg} mb-4`}>{f.icon}</div>
                <h3 className="font-bold text-clay-dark text-lg mb-1">{f.title}</h3>
                <p className="text-clay-mint text-sm font-semibold mb-3">{f.subtitle}</p>
                <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{f.desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start" style={{ background: 'rgba(78,200,168,0.18)', color: '#2B8A72' }}>
                  <CheckCircle size={12} />
                  {f.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONDITIONS + MYTHS */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-extrabold text-clay-dark mb-4">С чем мы помогаем</h2>
              <p className="text-clay-muted text-sm leading-relaxed mb-5">
                Комплексная работа с питанием при различных состояниях здоровья и для достижения ваших целей
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
              <h2 className="text-2xl font-extrabold text-clay-dark mb-2">Мифы о питании</h2>
              <p className="text-clay-muted text-sm mb-4">Разрушаем популярные стереотипы доказательной медициной</p>
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

      {/* SPOTLIGHT */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-mint p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  Персональный план питания
                </h2>
                <p className="text-white/90 leading-relaxed mb-5">
                  Это не распечатка стандартной диеты из интернета. Мы анализируем ваш дневник питания, анализы и образ жизни, чтобы создать пошаговое руководство, которое будет работать именно для вас.
                </p>
                <div className="space-y-3">
                  {[
                    'Анализ текущего рациона и выявление ошибок',
                    'Индивидуальный расчёт КБЖУ',
                    'Списки покупок и конструктор блюд',
                    'Коррекция дефицитов по анализам',
                  ].map((p) => (
                    <div key={p} className="flex items-center gap-2 text-white/90 text-sm">
                      <CheckCircle size={16} className="flex-shrink-0 text-white" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { q: 'Нужно ли считать калории?', a: 'Не обязательно. Мы предлагаем разные методы: правило тарелки, порции с ладонь, интуитивное питание.' },
                  { q: 'Можно ли есть сладкое?', a: 'Да! Мы поможем вписать любимые десерты в рацион так, чтобы они не мешали результату.' },
                  { q: 'Как долго соблюдать план?', a: 'План разрабатывается так, чтобы стать вашим образом жизни навсегда, а не временной диетой.' },
                ].map((faq) => (
                  <div key={faq.q} className="bg-white/20 rounded-2xl p-4">
                    <p className="font-bold text-white text-sm mb-1">- {faq.q}</p>
                    <p className="text-white/85 text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Цены на нутрициологию</h2>
            <p className="text-clay-muted">Инвестиции в ваше здоровье и энергию</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { name: 'Первичная консультация нутрициолога', price: 'от 3 500 ₽' },
              { name: 'Повторная консультация (разбор анализов)', price: 'от 2 500 ₽' },
              { name: 'Составление персонального плана питания', price: 'от 5 000 ₽' },
              { name: 'Месячное сопровождение (ведение)', price: 'от 12 000 ₽' },
            ].map((item) => (
              <div key={item.name} className="clay clay-card flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                <span className="text-clay-mint font-bold text-sm whitespace-nowrap">{item.price}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a href="/prices" className="clay btn-clay-secondary text-sm">
              Полный прайс-лист →
            </a>
          </div>
        </div>
      </section>

      {/* INTERNAL LINKS */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-xl font-extrabold text-clay-dark mb-5">Полезные разделы</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a href="/doctors" className="clay clay-card-soft-mint p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <Users size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Наши специалисты</p>
                <p className="text-clay-muted text-xs leading-relaxed">Врачи доказательной медицины</p>
              </div>
            </a>
            <a href="/prices" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <CheckCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Цены на услуги</p>
                <p className="text-clay-muted text-xs leading-relaxed">Полный прайс-лист на все услуги клиники</p>
              </div>
            </a>
            <button type="button" data-booking-btn="true" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <MessageCircle size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-clay-dark text-sm mb-1">Записаться на приём</p>
                <p className="text-clay-muted text-xs leading-relaxed">Ответим в Telegram в течение 2 минут</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-mint p-6 md:p-8 text-center">
            <Apple size={40} className="text-clay-mint mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Готовы изменить жизнь к лучшему?
            </h2>
            <p className="text-clay-muted mb-5 max-w-md mx-auto">
              Запишитесь к нашему нутрициологу. Разберёмся в причине ваших жалоб и предложим конкретный план действий.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #88DFB8, #4EC8A8)', boxShadow: '10px 10px 24px hsl(160, 15%, 70%), inset -4px -4px 9px hsla(160, 30%, 45%, 0.65), inset 0px 7px 14px hsla(160, 60%, 90%, 0.5)' }}>
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

      <div className="container-clay">
        <FaqSection items={NUTRITION_FAQ} title="Частые вопросы о нутрициологии" />
      </div>
    </div>
  )
}
