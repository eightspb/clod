import { ArrowRight, Shield, Database, MessageCircle, CheckCircle, Lock, Phone, Star, Clock, Stethoscope, HeartPulse, Activity, Leaf, ReceiptText, FileText, WalletCards, Landmark } from 'lucide-react'
import { PHONE_NUMBER, TELEGRAM_URL } from '../../lib/contacts.js'
import {
  FULL_PRICE_LIST_PATH,
  OFFICIAL_PRICE_LIST_UPDATED_AT,
  SHORT_PRICE_CATEGORIES,
  formatPriceLabel,
} from '../../lib/price-list.js'
import { FadeInSection } from '../FadeInSection.jsx'

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
    desc: 'После приёма вы получаете заключение и рекомендации, а администратор помогает с маршрутом дальнейших исследований и выдачей документов.',
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

const PRICE_CATEGORY_ICONS = {
  mammology: Stethoscope,
  gynecology: HeartPulse,
  endocrinology: Activity,
  nutrition: Leaf,
}

const PAYMENT_METHODS = [
  {
    icon: WalletCards,
    iconClass: 'icon-circle-mint',
    cardClass: 'clay-card-soft-mint',
    title: 'Наличные и карты',
    desc: 'Принимаем наличные и банковские карты любых платёжных систем: Visa, Mastercard, МИР. Оплата в день процедуры или по счёту.',
    items: ['Наличные рубли', 'Банковские карты', 'Оплата по QR-коду', 'Безналичный расчёт'],
    checkClass: 'text-clay-mint',
  },
  {
    icon: Landmark,
    iconClass: 'icon-circle-blue',
    cardClass: 'clay-card-soft-blue',
    title: 'ДМС',
    desc: 'Работаем с полисами добровольного медицинского страхования ведущих страховых компаний. Уточните наличие вашей страховой при записи.',
    items: ['СОГАЗ', 'Ингосстрах', 'АльфаСтрахование', 'ВСК и другие'],
    checkClass: 'text-clay-blue',
  },
  {
    icon: Clock,
    iconClass: 'icon-circle-peach',
    cardClass: 'clay-card-soft-peach',
    title: 'Рассрочка',
    desc: 'Разделите стоимость лечения на удобные платежи без переплат. Рассрочка доступна для процедур от 10 000 ₽ через партнёрские банки.',
    items: ['От 0% переплаты', 'Срок до 12 месяцев', 'Решение за 5 минут', 'Без первоначального взноса'],
    checkClass: 'text-clay-peach',
  },
]

export function Prices() {
  return (
    <div className="grain-overlay">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
                <Shield size={14} aria-hidden="true" />
                Прозрачная стоимость
              </div>
              <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Короткий и полный прайс-лист клиники
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-5 font-medium max-w-2xl">
                Сначала показываем самые востребованные позиции по направлениям, а ниже можно перейти к полному официальному прайс-листу со всеми услугами.
              </p>
              <p className="text-sm text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Официальный прайс-лист ООО «Клиника Одинцова» обновлён {OFFICIAL_PRICE_LIST_UPDATED_AT}. Принимаем в Санкт-Петербурге, в Приморском районе, рядом с м. Комендантский проспект и м. Старая Деревня.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={FULL_PRICE_LIST_PATH} className="clay btn-clay-primary gap-2">
                  Смотреть все услуги и цены
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться на приём
                </button>
              </div>
            </div>
            <div className="clay clay-card p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="icon-circle-mint">
                  <ReceiptText size={20} className="text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-clay-dark">Официальный прайс</p>
                  <p className="text-xs text-clay-muted">Короткая и полная версии</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[18px] bg-[color:var(--surface-accent)] p-4">
                  <p className="text-sm font-semibold text-clay-dark">Короткий список</p>
                  <p className="mt-1 text-xs leading-relaxed text-clay-muted">Самые востребованные позиции по направлениям.</p>
                </div>
                <div className="rounded-[18px] bg-[color:var(--surface-muted)] p-4">
                  <p className="text-sm font-semibold text-clay-dark">Полный список</p>
                  <p className="mt-1 text-xs leading-relaxed text-clay-muted">Все услуги, коды и цены отдельной страницей.</p>
                </div>
              </div>
              <a href={FULL_PRICE_LIST_PATH} className="mt-5 clay btn-clay-secondary w-full gap-2">
                Открыть полный прайс
                <FileText size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Три принципа прозрачности</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Поясняем состав услуги и варианты оплаты без лишней рекламной формы.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {principles.map((p, i) => (
                <FadeInSection key={p.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${p.bg} card-interactive p-5 flex flex-col relative overflow-hidden`}>
                    <div className="relative z-10">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 shadow-sm">
                        <p.Icon size={24} className="text-clay-dark" />
                      </div>
                      <div className="inline-block px-3 py-1 rounded-full bg-white/70 text-clay-dark text-xs font-bold mb-4">{p.tag}</div>
                      <h3 className="font-bold text-clay-dark text-xl mb-3">{p.title}</h3>
                      <p className="text-clay-dark/85 text-sm leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ВАБ ALL INCLUSIVE */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="stat-pill mb-4">Ключевая процедура</div>
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                    ВАБ - вакуумная аспирационная биопсия
                  </h2>
                  <p className="text-clay-muted leading-relaxed mb-4">
                    Базовую стоимость и дополнительные позиции обсуждаем заранее. Итоговая сумма зависит от объёма вмешательства и клинической ситуации.
                  </p>
                  <div className="clay clay-card-soft-mint mb-6 inline-flex flex-col rounded-[18px] px-5 py-4">
                    <span className="text-4xl font-serif font-light text-clay-dark leading-none">от 80 000 ₽</span>
                    <span className="mt-1 text-sm font-semibold text-clay-muted">Базовая стоимость процедуры</span>
                  </div>
                  <div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                    Записаться на ВАБ
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-clay-dark mb-2">Базовая стоимость включает:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {['Консультация онколога-маммолога', 'УЗИ молочных желёз', 'Сама процедура ВАБ', 'Все расходные материалы'].map((item) => (
                      <div key={item} className="clay clay-card flex items-center gap-2.5 px-3 py-2.5 rounded-[16px]">
                        <CheckCircle size={15} className="text-clay-mint flex-shrink-0" aria-hidden="true" />
                        <span className="text-xs font-medium text-clay-dark">{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-clay-dark mb-2">Дополнительные услуги (оплачиваются отдельно):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['Подготовка к процедуре', 'Местная анестезия', 'Гистологическое исследование', 'Послеоперационное наблюдение', 'Контрольный снимок после процедуры'].map((item) => (
                      <div key={item} className="clay clay-card-soft-peach flex items-center gap-2.5 px-3 py-2.5 rounded-[16px]">
                        <CheckCircle size={15} className="text-clay-peach flex-shrink-0" aria-hidden="true" />
                        <span className="text-xs font-medium text-clay-dark">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* PRICE TABLES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Короткий прайс-лист</h2>
              <p className="text-clay-muted max-w-2xl mx-auto">
                Основные и самые популярные позиции по направлениям. Полный прайс-лист со всеми кодами и услугами доступен отдельной страницей.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {SHORT_PRICE_CATEGORIES.map((cat, i) => {
                const Icon = PRICE_CATEGORY_ICONS[cat.slug] || Stethoscope
                return (
                  <FadeInSection key={cat.title} staggerIndex={i} className="h-full">
                    <div className={`clay ${cat.color} p-6`}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="icon-circle-mint h-11 w-11 rounded-2xl">
                          <Icon size={20} className="text-white" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-bold text-clay-dark text-lg">{cat.title}</h3>
                          <p className="text-xs font-semibold text-clay-muted">{cat.items.length} поз.</p>
                        </div>
                      </div>
                      <p className="text-sm text-clay-muted leading-relaxed mb-4">{cat.intro}</p>
                      <div className="grid gap-2.5">
                        {cat.items.map((item) => (
                          <div key={item.name} className="grid gap-2 rounded-[16px] bg-white/70 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                            <span className="text-sm text-clay-dark">{item.name}</span>
                            <span className="text-sm font-bold sm:text-right" style={{ color: cat.accent }}>
                              {formatPriceLabel(item.price, item.isFrom)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {cat.note ? (
                        <p className="text-xs text-clay-muted leading-relaxed mt-4">{cat.note}</p>
                      ) : null}
                      <div className="mt-5">
                        <a href={cat.fullPriceHref} className="clay btn-clay-secondary text-sm">
                          Перейти в полный прайс-лист
                          <ArrowRight size={15} aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  </FadeInSection>
                )
              })}
            </div>
            <p className="text-xs text-clay-muted text-center mt-5">
              * Цены указаны в рублях. Для услуг с пометкой «от» окончательная стоимость зависит от объёма программы или вмешательства.
            </p>
            <div className="text-center mt-6">
              <a href={FULL_PRICE_LIST_PATH} className="clay btn-clay-secondary text-sm">
                Смотреть все услуги и цены
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* PRIVACY / DIGITAL */}
      <FadeInSection>
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
                    Заключения, снимки и протоколы можно получить в клинике. Если планируется повторный приём, подскажем, какие материалы лучше взять с собой.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* PAYMENT METHODS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Способы оплаты</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Выбирайте удобный для вас формат - принимаем все основные способы оплаты</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon
                return (
                  <div key={method.title} className={`clay ${method.cardClass} p-5 flex flex-col gap-4`}>
                    <div className={method.iconClass}>
                      <Icon size={20} className="text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-clay-dark text-lg mb-2">{method.title}</h3>
                      <p className="text-clay-muted text-sm leading-relaxed mb-4">
                        {method.desc}
                      </p>
                      <div className="space-y-2">
                        {method.items.map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <CheckCircle size={14} className={`flex-shrink-0 ${method.checkClass}`} aria-hidden="true" />
                            <span className="text-sm text-clay-dark">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-clay-mint/12 flex items-center justify-center mx-auto mb-4">
                <Star size={24} className="text-clay-mint" />
              </div>
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
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
        </section>
      </FadeInSection>
    </div>
  )
}
