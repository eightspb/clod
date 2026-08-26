import { Phone, MessageCircle, Calendar, MapPin, Train, Plane, Hotel, FileText, Check, Globe } from 'lucide-react'
import {
  PHONE_NUMBER,
  PHONE_DISPLAY,
  PHONE_NUMBER_2,
  PHONE_DISPLAY_2,
  TELEGRAM_URL,
  ADDRESS,
} from '../../lib/contacts.js'

const CONTACT_CARDS = [
  {
    icon: <Phone size={20} className="text-white" />,
    iconBg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Позвоните нам',
    desc: 'Обсудим ваш случай, ответим на вопросы и подберём удобное время.',
    action: (
      <div className="space-y-2">
        <a
          href={`tel:${PHONE_NUMBER}`}
          className="block font-semibold text-clay-mint hover:underline"
        >
          {PHONE_DISPLAY}
        </a>
        <a
          href={`tel:${PHONE_NUMBER_2}`}
          className="block font-semibold text-clay-mint hover:underline"
        >
          {PHONE_DISPLAY_2}
        </a>
      </div>
    ),
  },
  {
    icon: <MessageCircle size={20} className="text-white" />,
    iconBg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Напишите в мессенджер',
    desc: 'Telegram - удобно для отправки снимков и документов.',
    action: (
      <a
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-clay-secondary text-sm inline-flex items-center gap-2 mt-1"
      >
        <MessageCircle size={14} />
        Написать в Telegram
      </a>
    ),
  },
  {
    icon: <Calendar size={20} className="text-white" />,
    iconBg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Онлайн-запись',
    desc: 'Выберите удобное время через наш виджет записи на сайте.',
    action: (
      <button
        type="button"
        data-booking-btn
        className="btn-clay-secondary text-sm inline-flex items-center gap-2 mt-1"
      >
        <Calendar size={14} />
        Записаться онлайн
      </button>
    ),
  },
]

const DOCUMENTS_CHECKLIST = [
  'Паспорт',
  'Полис ОМС (если есть)',
  'Результаты предыдущих обследований: УЗИ, маммография, МРТ',
  'Заключения и выписки от других врачей',
  'Результаты анализов (если есть)',
  'Направление (если есть, но не обязательно)',
]

const VAB_TIMELINE = [
  {
    day: 'День 1',
    title: 'Консультация и диагностика',
    desc: 'Консультация онколога-маммолога, УЗИ и совместное решение о тактике лечения.',
    accent: 'clay-card-soft-mint',
    dotColor: 'bg-clay-mint',
  },
  {
    day: 'День 2',
    title: 'Процедура ВАБ',
    desc: 'Вакуумная аспирационная биопсия - 30-40 минут, амбулаторно, без госпитализации.',
    accent: 'clay-card-soft-blue',
    dotColor: 'bg-clay-blue',
  },
  {
    day: 'День 3',
    title: 'Контрольный осмотр',
    desc: 'Врач осматривает место процедуры, убеждается, что всё хорошо. После этого можно отправляться домой.',
    accent: 'clay-card-soft-peach',
    dotColor: 'bg-clay-peach',
  },
]

const INTERNATIONAL_ITEMS = [
  {
    title: 'Безвизовый въезд',
    desc: 'Гражданам Казахстана и Белоруссии виза для въезда в Россию не требуется.',
    icon: <Globe size={20} className="text-white" />,
    iconBg: 'icon-circle-mint',
  },
  {
    title: 'Оплата',
    desc: 'Наличные рубли или банковская карта. Картами Visa, Mastercard, Мир.',
    icon: <FileText size={20} className="text-white" />,
    iconBg: 'icon-circle-blue',
  },
  {
    title: 'Документы',
    desc: 'Паспорт и медицинские документы. Если документы не на русском языке, лучше иметь перевод.',
    icon: <FileText size={20} className="text-white" />,
    iconBg: 'icon-circle-peach',
  },
]

export function DlyaInogorodnikh() {
  return (
    <div>
      <section className="pt-6 pb-8">
        <div className="container-clay">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl self-start text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Для иногородних пациентов
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed font-medium max-w-2xl">
                Мы принимаем пациентов со всей России, а также из Казахстана и Белоруссии.
                Поможем спланировать визит так, чтобы вы получили всё необходимое за один приезд.
              </p>
            </div>
            <div className="clay-card p-5">
              <p className="text-sm font-semibold text-clay-dark mb-3">Начать планирование визита</p>
              <div className="grid gap-3">
                <a href={`tel:${PHONE_NUMBER}`} className="btn-clay-primary justify-center gap-2">
                  <Phone size={16} />
                  Позвонить: {PHONE_DISPLAY}
                </a>
                <button type="button" data-booking-btn className="btn-clay-secondary justify-center gap-2">
                  <Calendar size={16} />
                  Записаться онлайн
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">Как записаться дистанционно</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {CONTACT_CARDS.map((card) => (
              <div key={card.title} className="clay-card p-6 flex flex-col gap-3">
                <div className={`${card.iconBg} shrink-0 self-start`}>{card.icon}</div>
                <div className="font-bold text-clay-dark">{card.title}</div>
                <p className="text-sm text-clay-muted leading-relaxed flex-1">{card.desc}</p>
                {card.action}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-5">Что привезти с собой</h2>
              <div className="clay-card p-6">
                <ul className="space-y-3">
                  {DOCUMENTS_CHECKLIST.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="icon-circle-mint shrink-0 w-7 h-7 flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </span>
                      <span className="text-clay-text text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <div className="clay-card p-6">
                <div className="font-bold text-clay-dark mb-2">Совет</div>
                <p className="text-sm text-clay-text leading-relaxed">
                  Перед поездкой отправьте нам снимки и заключения в Telegram - мы заранее изучим
                  ваш случай и сразу сможем предложить оптимальный план визита.
                </p>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-clay-secondary text-sm inline-flex items-center gap-2 mt-4"
                >
                  <MessageCircle size={14} />
                  Отправить документы в Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-2">Планирование поездки</h2>
          <p className="text-clay-muted mb-8 max-w-xl">
            Для процедуры ВАБ достаточно трёх дней. Для первичной консультации - одного визита на 1-2 часа.
          </p>
          <div className="space-y-4">
            {VAB_TIMELINE.map((step) => (
              <div key={step.day} className="clay-card p-5">
                <div className="grid gap-3 md:grid-cols-[auto_minmax(0,0.75fr)_minmax(0,1.25fr)] md:items-center">
                  <span className="stat-pill self-start">{step.day}</span>
                  <span className="font-bold text-clay-dark">{step.title}</span>
                  <p className="text-sm text-clay-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">Как добраться</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="clay-card p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="icon-circle-mint shrink-0">
                  <MapPin size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-clay-dark mb-1">Адрес клиники</div>
                  <div className="text-clay-muted text-sm leading-relaxed">{ADDRESS}</div>
                  <div className="text-clay-muted text-sm mt-1">Приморский район</div>
                </div>
              </div>
              <a
                href="https://yandex.ru/maps/?pt=30.251746,60.001014&z=16&l=map"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-clay-secondary text-sm inline-flex items-center gap-2"
              >
                <MapPin size={14} />
                Открыть в Яндекс.Картах
              </a>
            </div>

            <div className="clay-card p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="icon-circle-blue shrink-0">
                  <Train size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-clay-dark mb-1">С Московского вокзала</div>
                  <div className="text-sm text-clay-muted">Около 30 минут на метро. Доехать до м. Комендантский проспект, далее автобус или такси.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="icon-circle-peach shrink-0">
                  <Plane size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-clay-dark mb-1">Из аэропорта Пулково</div>
                  <div className="text-sm text-clay-muted">Около 40 минут на такси. Удобно добираться напрямую - район хорошо связан с КАД.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="icon-circle-lavender shrink-0">
                  <MapPin size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-clay-dark mb-1">Ближайшее метро</div>
                  <div className="text-sm text-clay-muted">М. Комендантский проспект (12 мин пешком) или м. Старая Деревня (15 мин пешком).</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">Где остановиться</h2>
          <div className="clay-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-5">
              <div className="icon-circle-mint shrink-0">
                <Hotel size={20} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-clay-dark mb-2">Варианты размещения рядом с клиникой</div>
                <p className="text-sm text-clay-muted leading-relaxed">
                  Мы не рекомендуем конкретные гостиницы, но в Приморском районе и ближайших кварталах
                  есть гостиницы и апартаменты на любой бюджет. Ищите на Яндекс.Путешествиях или Остров.ру.
                </p>
              </div>
            </div>
            <div className="rounded-[18px] border border-[color:var(--border-color)] bg-[color:var(--surface-card-hover)] p-4">
              <div className="flex items-start gap-2">
                <span className="text-clay-peach font-bold text-lg leading-none mt-0.5">!</span>
                <p className="text-sm text-clay-text leading-relaxed">
                  Для процедуры ВАБ рекомендуем бронировать на 2-3 ночи:
                  день приезда + консультация, процедура, контрольный осмотр.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">
            Для пациентов из Казахстана и Белоруссии
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {INTERNATIONAL_ITEMS.map((item) => (
              <div key={item.title} className="clay-card p-6">
                <div className={`${item.iconBg} shrink-0 mb-3`}>{item.icon}</div>
                <div className="font-bold text-clay-dark mb-2">{item.title}</div>
                <p className="text-sm text-clay-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <div className="clay-card p-8 md:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
              Свяжитесь с нами для планирования визита
            </h2>
            <p className="text-clay-text mb-6 max-w-md mx-auto text-sm leading-relaxed">
              Расскажите о вашем случае - поможем выстроить маршрут, чтобы вы получили максимум пользы от приезда.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="btn-clay-white gap-2 inline-flex items-center"
              >
                <Phone size={16} />
                Позвонить: {PHONE_DISPLAY}
              </a>
              <button
                type="button"
                data-booking-btn
                className="btn-clay-secondary gap-2 inline-flex items-center"
              >
                <Calendar size={16} />
                Записаться онлайн
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
