import { ArrowRight, Shield, Database, MessageCircle, CheckCircle, Lock, Phone, Star, CreditCard, Clock } from 'lucide-react'
import { PHONE_NUMBER, TELEGRAM_URL } from '../../lib/contacts.js'

const DEFAULT_PRICE_CATEGORIES = [
  {
    title: 'Маммология',
    color: 'clay-card-soft-mint',
    accent: '#2F8F7C',
    icon: '🩺',
    intro: 'Консультации, УЗИ, ВАБ и второе мнение по показаниям.',
    items: [
      { name: 'Консультация онколога-маммолога', price: 3500 },
      { name: 'УЗИ молочных желёз', price: 2500 },
      { name: 'ВАБ (вакуумная аспирационная биопсия)', price: 80000, isFrom: true },
      { name: 'ВАБ + гистология (всё включено)', price: 85000, isFrom: true },
      { name: 'Второе мнение по снимкам', price: 0 },
    ],
  },
  {
    title: 'Гинекология',
    color: 'clay-card-soft-peach',
    accent: '#B9654E',
    icon: '🌸',
    intro: 'Приём, УЗИ, кольпоскопия и исследования по показаниям.',
    items: [
      { name: 'Консультация гинеколога', price: 3000 },
      { name: 'УЗИ органов малого таза', price: 2500 },
      { name: 'Кольпоскопия', price: 3500 },
      { name: 'ПЦР-диагностика ИППП (12 инфекций)', price: 4800 },
      { name: 'Комплекс «Полный скрининг»', price: 8900, isFrom: true },
    ],
  },
  {
    title: 'Эндокринология',
    color: 'clay-card-soft-blue',
    accent: '#3F759E',
    icon: '⚡',
    intro: 'Консультации, УЗИ щитовидной железы и обследования по назначению.',
    items: [
      { name: 'Консультация эндокринолога', price: 3500 },
      { name: 'Анализ на ТТГ, Т3, Т4 свободный', price: 2200 },
      { name: 'Расширенный гормональный профиль', price: 7400 },
      { name: 'Комплекс «Энергия и метаболизм»', price: 12900, isFrom: true },
      { name: 'Повторная консультация + план', price: 2500 },
    ],
  },
  {
    title: 'Нутрициология',
    color: 'clay-card-soft-lavender',
    accent: '#64589B',
    icon: '🥗',
    intro: 'Разбор анализов, план питания и сопровождение по запросу.',
    items: [
      { name: 'Первичная консультация нутрициолога', price: 3500 },
      { name: 'Повторная консультация (разбор анализов)', price: 2500 },
      { name: 'Составление персонального плана питания', price: 5000 },
      { name: 'Месячное сопровождение (ведение)', price: 12000, isFrom: true },
      { name: 'Биоимпедансометрия', price: 1500 },
    ],
  },
]

function formatPriceLabel(amount, isFrom = false) {
  if (amount === 0) return 'Бесплатно'
  const formatted = amount.toLocaleString('ru-RU')
  return `${isFrom ? 'от ' : ''}${formatted} ₽`
}

function buildCategoryItems(categoryTitle, servicesData) {
  return servicesData
    .filter((service) => service.direction === categoryTitle)
    .map((service) => {
      const price = Number(service.price) || 0
      const isFrom = /ВАБ|комплекс|скрининг|сопровождение/i.test(service.title)

      return {
        name: service.title,
        price,
        isFrom: price > 0 ? isFrom : false,
      }
    })
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'ru'))
}

export function buildPriceCategories(servicesData = []) {
  if (!servicesData.length) return DEFAULT_PRICE_CATEGORIES

  return DEFAULT_PRICE_CATEGORIES.map((category) => ({
    ...category,
    items: buildCategoryItems(category.title, servicesData),
  }))
}

export function buildPriceSchemaItems(servicesData = []) {
  const categories = buildPriceCategories(servicesData)
  let position = 1

  return categories.flatMap((category) =>
    category.items.map((item) => ({
      '@type': 'ListItem',
      position: position++,
      item: {
        '@type': 'MedicalProcedure',
        name: item.name,
        description: `${category.title}. ${item.price === 0 ? 'Стоимость обсуждается на консультации.' : `Стоимость ${formatPriceLabel(item.price, item.isFrom)}.`}`,
        offers: {
          '@type': 'Offer',
          price: String(item.price),
          priceCurrency: 'RUB',
          seller: { '@type': 'MedicalBusiness', name: 'Клиника Одинцова' },
        },
      },
    }))
  )
}

const principles = [
  {
    Icon: Shield,
    bg: 'clay-card-mint',
    title: 'Понятно, что входит',
    desc: 'Состав услуги и дополнительные позиции обсуждаем заранее. Если объём зависит от показаний, врач объяснит это до записи.',
    tag: 'Состав услуги',
  },
  {
    Icon: Database,
    bg: 'clay-card-blue',
    title: 'Документы и рекомендации',
    desc: 'После консультации вы получаете заключение и рекомендации, а администратор помогает с маршрутом дальнейших исследований и выдачей документов.',
    tag: 'Документы',
  },
  {
    Icon: MessageCircle,
    bg: 'clay-card-peach',
    title: 'Связь с лечащим врачом',
    desc: 'После процедуры врач остаётся на связи по согласованному каналу и отвечает на вопросы о вашем состоянии без лишних промежуточных шагов.',
    tag: 'По согласованию',
  },
]

export function Prices({ servicesData = [] }) {
  const priceCategories = buildPriceCategories(servicesData)

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-12">

        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(47,143,124,0.10)', color: '#2F8F7C' }}>
              <Shield size={12} />
              Прозрачная стоимость
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Понятная стоимость и прозрачный маршрут лечения
            </h1>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl text-lg">
              В прайсе видно, что входит в приём, какие позиции оплачиваются отдельно и когда стоимость обсуждается после осмотра.
            </p>
            <p className="text-sm text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Принимаем в Санкт-Петербурге, в Приморском районе, рядом с м. Комендантский проспект и м. Старая Деревня.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                Записаться на консультацию
                <ArrowRight size={16} />
              </button>
              <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                <Phone size={16} />
                Уточнить цену
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Три принципа прозрачности</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Поясняем состав услуги и варианты оплаты без лишней рекламной формы.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {principles.map((p) => (
              <div key={p.title} className={`clay ${p.bg} p-5 flex flex-col relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 shadow-sm">
                    <p.Icon size={24} className="text-clay-dark" />
                  </div>
                  <div className="inline-block px-3 py-1 rounded-full bg-white/70 text-clay-dark text-xs font-bold mb-4">{p.tag}</div>
                  <h3 className="font-bold text-clay-dark text-xl mb-3">{p.title}</h3>
                  <p className="text-clay-dark/85 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ВАБ ALL INCLUSIVE */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="stat-pill mb-4">Ключевая процедура</div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
                  ВАБ — вакуумная аспирационная биопсия
                </h2>
                <p className="text-clay-muted leading-relaxed mb-4">
                  Базовую стоимость и дополнительные позиции обсуждаем заранее. Итоговая сумма зависит от объёма вмешательства и клинической ситуации.
                </p>
                <div className="text-4xl font-extrabold text-clay-mint mb-1">от 80 000 ₽</div>
                <p className="text-sm text-clay-muted mb-6">Базовая стоимость процедуры</p>
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на ВАБ
                  <ArrowRight size={16} />
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-clay-dark mb-2">Базовая стоимость включает:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {['Консультация онколога-маммолога', 'УЗИ молочных желёз', 'Сама процедура ВАБ', 'Все расходные материалы'].map((item) => (
                    <div key={item} className="clay clay-card flex items-center gap-2.5 px-3 py-2.5">
                      <CheckCircle size={15} className="text-clay-mint flex-shrink-0" />
                      <span className="text-xs font-medium text-clay-dark">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-clay-dark mb-2">Дополнительные услуги (оплачиваются отдельно):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['Подготовка к процедуре', 'Местная анестезия', 'Гистологическое исследование', 'Послеоперационное наблюдение', 'Контрольный снимок после процедуры'].map((item) => (
                    <div key={item} className="clay clay-card-soft-peach clay flex items-center gap-2.5 px-3 py-2.5">
                      <CheckCircle size={15} className="text-clay-peach flex-shrink-0" />
                      <span className="text-xs font-medium text-clay-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICE TABLES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Прайс-лист</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Актуальные цены по направлениям. Если объём услуги зависит от показаний, врач заранее это объяснит.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {priceCategories.map((cat) => (
              <div key={cat.title} className={`clay ${cat.color} p-6`}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="font-bold text-clay-dark text-lg">{cat.title}</h3>
                </div>
                <p className="text-sm text-clay-muted leading-relaxed mb-4">{cat.intro}</p>
                <div className="space-y-2.5">
                  {cat.items.map((item) => (
                    <div key={item.name} className="bg-white/60 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-clay-dark flex-1">{item.name}</span>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: cat.accent }}>
                        {formatPriceLabel(item.price, item.isFrom)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-clay-muted text-center mt-5">
            * Цены указаны в рублях. Для услуг с пометкой «от» окончательная стоимость зависит от объёма вмешательства и показаний.
          </p>
        </div>
      </section>

      {/* PRIVACY / DIGITAL */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="clay clay-card p-6 flex items-start gap-4">
              <div className="icon-circle-mint flex-shrink-0">
                <Lock size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-clay-dark mb-2">Защита данных</h3>
                <p className="text-clay-muted text-sm leading-relaxed">
                  Мы бережно относимся к медицинской информации и выдаём документы пациенту или его законному представителю в предусмотренном порядке.
                </p>
              </div>
            </div>
            <div className="clay clay-card p-6 flex items-start gap-4">
              <div className="icon-circle-blue flex-shrink-0">
                <Database size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-clay-dark mb-2">Получение документов</h3>
                <p className="text-clay-muted text-sm leading-relaxed">
                  Заключения, снимки и протоколы можно получить в клинике. Если планируется повторная консультация, подскажем, какие материалы лучше взять с собой.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAYMENT METHODS */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Способы оплаты</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Выбирайте удобный для вас формат - принимаем все основные способы оплаты</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="clay clay-card-soft-mint p-5 flex flex-col gap-4">
              <div className="icon-circle-mint">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-clay-dark text-lg mb-2">Наличные и карты</h3>
                <p className="text-clay-muted text-sm leading-relaxed mb-4">
                  Принимаем наличные и банковские карты любых платёжных систем: Visa, Mastercard, МИР. Оплата в день процедуры или по счёту.
                </p>
                <div className="space-y-2">
                  {['Наличные рубли', 'Банковские карты', 'Оплата по QR-коду', 'Безналичный расчёт'].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-clay-mint flex-shrink-0" />
                      <span className="text-sm text-clay-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="clay clay-card-soft-blue p-5 flex flex-col gap-4">
              <div className="icon-circle-blue">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-clay-dark text-lg mb-2">ДМС</h3>
                <p className="text-clay-muted text-sm leading-relaxed mb-4">
                  Работаем с полисами добровольного медицинского страхования ведущих страховых компаний. Уточните наличие вашей страховой при записи.
                </p>
                <div className="space-y-2">
                  {['СОГАЗ', 'Ингосстрах', 'АльфаСтрахование', 'ВСК и другие'].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle size={14} style={{ color: '#4880B0' }} className="flex-shrink-0" />
                      <span className="text-sm text-clay-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="clay clay-card-soft-peach p-5 flex flex-col gap-4">
              <div className="icon-circle-peach">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-clay-dark text-lg mb-2">Рассрочка</h3>
                <p className="text-clay-muted text-sm leading-relaxed mb-4">
                  Разделите стоимость лечения на удобные платежи без переплат. Рассрочка доступна для процедур от 10 000 ₽ через партнёрские банки.
                </p>
                <div className="space-y-2">
                  {['От 0% переплаты', 'Срок до 12 месяцев', 'Решение за 5 минут', 'Без первоначального взноса'].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle size={14} style={{ color: '#D07858' }} className="flex-shrink-0" />
                      <span className="text-sm text-clay-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8 text-center relative overflow-hidden">
            <div className="blob-mint absolute -top-10 -right-10 w-36 h-36 opacity-25 pointer-events-none" />
            <div className="blob-peach absolute -bottom-10 -left-10 w-36 h-36 opacity-22 pointer-events-none" />
            <div className="relative z-10">
              <Star size={40} className="text-clay-mint mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
                Остались вопросы по ценам?
              </h2>
              <p className="text-clay-muted mb-5 max-w-md mx-auto">
                Подскажем ориентир по стоимости и составу услуги удобным для вас способом.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-primary gap-2">
                  <Phone size={16} />
                  Позвонить
                </a>
                <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                  Написать в Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
