import { ArrowRight, Shield, Database, MessageCircle, CheckCircle, Lock, Phone, Star } from 'lucide-react'

const principles = [
  {
    icon: <Shield size={24} className="text-white" />,
    bg: 'clay-card-mint',
    title: 'Без доплат',
    desc: 'Если в плане лечения ВАБ указана сумма — она финальная. В неё включены расходные материалы, анестезия, гистологическое исследование и послеоперационное наблюдение.',
    tag: 'Гарантия',
  },
  {
    icon: <Database size={24} className="text-white" />,
    bg: 'clay-card-blue',
    title: 'Цифровая история',
    desc: 'Все ваши протоколы, снимки и анализы хранятся в защищённом облаке. Доступ к ним — из любой точки мира через личный кабинет 24/7.',
    tag: 'Личный кабинет',
  },
  {
    icon: <MessageCircle size={24} className="text-white" />,
    bg: 'clay-card-peach',
    title: 'Прямая связь',
    desc: 'После процедур лечащий доктор остаётся на связи в мессенджере. Любой вопрос о вашем состоянии — ответ в тот же день, без промежуточных звонков в колл-центр.',
    tag: 'Врач в мессенджере',
  },
]

export function Prices({ servicesData = [] }) {
  const included = [
    'Подготовка к процедуре',
    'Местная анестезия',
    'Все расходные материалы',
    'Гистологическое исследование',
    'Послеоперационное наблюдение',
    'Снимок после процедуры',
    'Консультация по результатам гистологии',
    'Связь с доктором в мессенджере (2 недели)',
  ]

  // Группируем услуги по направлениям
  const defaultCategories = [
    {
      title: 'Маммология',
      color: 'clay-card-soft-mint',
      accent: '#3AB89A',
      icon: '🩺',
      items: [],
    },
    {
      title: 'Гинекология',
      color: 'clay-card-soft-peach',
      accent: '#D07858',
      icon: '🌸',
      items: [],
    },
    {
      title: 'Эндокринология',
      color: 'clay-card-soft-blue',
      accent: '#4880B0',
      icon: '⚡',
      items: [],
    },
    {
      title: 'Неврология',
      color: 'clay-card-soft-lavender',
      accent: '#7060A8',
      icon: '🧠',
      items: [],
    },
  ]

  let priceCategories = defaultCategories

  if (servicesData.length > 0) {
    priceCategories = defaultCategories.map(cat => ({
      ...cat,
      items: servicesData
        .filter(s => s.direction === cat.title)
        .map(s => ({
          name: s.title,
          price: s.price === 0 ? '0 — бесплатно' : (s.price.toString().startsWith('от') ? s.price : `от ${s.price}`), // форматирование цены
          rawPrice: s.price
        }))
        .sort((a, b) => a.rawPrice - b.rawPrice) // простая сортировка
    }))
  } else {
    // Fallback if no db data
    priceCategories[0].items = [
      { name: 'Консультация онколога-маммолога', price: '3 500' },
      { name: 'УЗИ молочных желёз', price: '2 500' },
      { name: 'ВАБ (вакуумная аспирационная биопсия)', price: 'от 25 000' },
      { name: 'ВАБ + гистология (всё включено)', price: 'от 35 000' },
      { name: 'Второе мнение по снимкам', price: '0 — бесплатно' },
    ]
    priceCategories[1].items = [
      { name: 'Консультация гинеколога', price: '3 000' },
      { name: 'УЗИ органов малого таза', price: '2 500' },
      { name: 'Кольпоскопия', price: '3 500' },
      { name: 'ПЦР-диагностика ИППП (12 инфекций)', price: '4 800' },
      { name: 'Комплекс «Полный скрининг»', price: '8 900' },
    ]
    priceCategories[2].items = [
      { name: 'Консультация эндокринолога', price: '3 500' },
      { name: 'Анализ на ТТГ, Т3, Т4 свободный', price: '2 200' },
      { name: 'Расширенный гормональный профиль', price: '7 400' },
      { name: 'Комплекс «Энергия и метаболизм»', price: '12 900' },
      { name: 'Повторная консультация + план', price: '2 500' },
    ]
    priceCategories[3].items = [
      { name: 'Консультация невролога', price: '3 500' },
      { name: 'Лечебная блокада (1 зона)', price: 'от 5 500' },
      { name: 'Блокада под УЗИ-навигацией', price: 'от 7 900' },
      { name: 'Курс лечебных блокад (3 процедуры)', price: 'от 18 000' },
      { name: 'МРТ позвоночника (1 отдел)', price: '4 200' },
    ]
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-20">

        <div className="container-clay relative z-10">
          <a href="/" className="inline-flex items-center gap-1 text-sm text-clay-muted hover:text-clay-mint transition-colors mb-6">
            ← Назад на главную
          </a>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(78,200,168,0.12)', color: '#3AB89A' }}>
              <Shield size={12} />
              Честная медицина
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Честная медицина:{' '}
              <span className="text-clay-mint">фиксированная цена</span> и полная прозрачность
            </h1>
            <p className="text-clay-muted leading-relaxed mb-8 max-w-2xl text-lg">
              Никаких скрытых доплат в день процедуры. Цена, которую назвали — цена, которую заплатите.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                Записаться на консультацию
                <ArrowRight size={16} />
              </a>
              <a href="tel:+78127482210" className="clay btn-clay-secondary gap-2">
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
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Три принципа прозрачности</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Наша политика в ценообразовании</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {principles.map((p) => (
              <div key={p.title} className={`clay ${p.bg} p-7 flex flex-col relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10">
                  <div className="inline-block px-3 py-1 rounded-full bg-white/25 text-white text-xs font-bold mb-4">{p.tag}</div>
                  <h3 className="font-bold text-white text-xl mb-3">{p.title}</h3>
                  <p className="text-white/90 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ВАБ ALL INCLUSIVE */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="stat-pill mb-4">Всё включено</div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
                  ВАБ «под ключ»
                </h2>
                <p className="text-clay-muted leading-relaxed mb-4">
                  Стоимость процедуры ВАБ включает всё — от подготовки до получения результата гистологии. Никаких сюрпризов в день оплаты.
                </p>
                <div className="text-4xl font-extrabold text-clay-mint mb-1">от 35 000 ₽</div>
                <p className="text-sm text-clay-muted mb-6">Финальная цена, без доплат</p>
                <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                  Записаться на ВАБ
                  <ArrowRight size={16} />
                </a>
              </div>
              <div>
                <p className="text-sm font-semibold text-clay-dark mb-3">Что входит в стоимость:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {included.map((item) => (
                    <div key={item} className="clay clay-card flex items-center gap-2.5 px-3 py-2.5">
                      <CheckCircle size={15} className="text-clay-mint flex-shrink-0" />
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
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Прайс-лист</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Актуальные цены на все направления. Финальную стоимость уточняйте на консультации.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {priceCategories.map((cat) => (
              <div key={cat.title} className={`clay ${cat.color} p-6`}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="font-bold text-clay-dark text-lg">{cat.title}</h3>
                </div>
                <div className="space-y-2.5">
                  {cat.items.map((item) => (
                    <div key={item.name} className="bg-white/60 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-clay-dark flex-1">{item.name}</span>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: cat.accent }}>
                        {item.price} ₽
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-clay-muted text-center mt-5">
            * Цены указаны в рублях. Финальная стоимость определяется на консультации и зависит от объёма вмешательства.
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
                  Все ваши медицинские данные хранятся в зашифрованном облаке с сертификацией по 152-ФЗ. Доступ только у вас и вашего доктора.
                </p>
              </div>
            </div>
            <div className="clay clay-card p-6 flex items-start gap-4">
              <div className="icon-circle-blue flex-shrink-0">
                <Database size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-clay-dark mb-2">Личный кабинет</h3>
                <p className="text-clay-muted text-sm leading-relaxed">
                  Все протоколы, снимки и анализы доступны онлайн 24/7. Делитесь с другими специалистами одной ссылкой — без распечаток.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-8 md:p-12 text-center relative overflow-hidden">
            <div className="blob-mint absolute -top-10 -right-10 w-40 h-40 opacity-40 pointer-events-none" />
            <div className="blob-peach absolute -bottom-10 -left-10 w-40 h-40 opacity-35 pointer-events-none" />
            <div className="relative z-10">
              <Star size={40} className="text-clay-mint mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
                Остались вопросы по ценам?
              </h2>
              <p className="text-clay-muted mb-8 max-w-md mx-auto">
                Ответим в WhatsApp в течение 2 минут и назовём точную стоимость для вашей ситуации.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="tel:+78127482210" className="clay btn-clay-primary gap-2">
                  <Phone size={16} />
                  Позвонить
                </a>
                <a href="https://wa.me/79119258022" className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
