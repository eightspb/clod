import { Shield, Lock, Eye, UserCheck, Database, Phone, MapPin, Mail } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY, PHONE_NUMBER_2, PHONE_DISPLAY_2, ADDRESS } from '../../lib/contacts.js'

const SECTIONS = [
  {
    id: 'general',
    icon: <Shield size={22} className="text-white" />,
    color: 'icon-circle-mint',
    title: '1. Общие положения',
    content: [
      'Настоящая Политика конфиденциальности (далее - «Политика») определяет порядок обработки и защиты персональных данных физических лиц (далее - «Пользователи»), которые используют сайт и услуги ООО «Клиника Одинцова» (далее - «Клиника»).',
      'Обрабатывая ваши персональные данные, Клиника руководствуется Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных», иными нормативными правовыми актами Российской Федерации, а также настоящей Политикой.',
      'Использование сайта или запись на приём означает ваше согласие с условиями настоящей Политики. Если вы не согласны с какими-либо условиями, пожалуйста, прекратите использование сайта.',
    ],
  },
  {
    id: 'data',
    icon: <Database size={22} className="text-white" />,
    color: 'icon-circle-blue',
    title: '2. Какие данные мы собираем',
    content: [
      'Клиника может собирать следующие категории персональных данных:',
    ],
    list: [
      'Фамилия, имя, отчество',
      'Номер телефона и адрес электронной почты',
      'Дата рождения',
      'Сведения о состоянии здоровья, необходимые для оказания медицинских услуг',
      'Данные, автоматически передаваемые при посещении сайта: IP-адрес, тип браузера, страницы посещений, файлы cookie',
    ],
    contentAfter: [
      'Мы собираем только те данные, которые необходимы для оказания медицинской помощи, записи на приём и улучшения качества обслуживания.',
    ],
  },
  {
    id: 'purpose',
    icon: <Eye size={22} className="text-white" />,
    color: 'icon-circle-peach',
    title: '3. Цели обработки данных',
    content: [
      'Персональные данные обрабатываются в следующих целях:',
    ],
    list: [
      'Запись пациентов на приём и оказание медицинских услуг',
      'Ведение медицинской документации в соответствии с требованиями законодательства',
      'Информирование о результатах обследований, изменениях в расписании и акциях',
      'Улучшение качества работы сайта и персонализация пользовательского опыта',
      'Исполнение требований законодательства Российской Федерации',
    ],
  },
  {
    id: 'protection',
    icon: <Lock size={22} className="text-white" />,
    color: 'icon-circle-lavender',
    title: '4. Защита персональных данных',
    content: [
      'Клиника принимает все необходимые организационные и технические меры для защиты персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.',
      'Доступ к персональным данным имеют только те сотрудники, которым это необходимо для выполнения профессиональных обязанностей. Все сотрудники обязаны соблюдать конфиденциальность персональных данных.',
      'Данные о состоянии здоровья составляют медицинскую тайну и охраняются в соответствии с Федеральным законом от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации».',
    ],
  },
  {
    id: 'rights',
    icon: <UserCheck size={22} className="text-white" />,
    color: 'icon-circle-mint',
    title: '5. Ваши права',
    content: [
      'В соответствии с действующим законодательством вы имеете право:',
    ],
    list: [
      'Получить информацию об обработке ваших персональных данных',
      'Требовать уточнения, блокирования или уничтожения персональных данных, если они являются неполными, устаревшими, неточными или незаконно полученными',
      'Отозвать согласие на обработку персональных данных',
      'Обжаловать действия или бездействие Клиники в уполномоченный орган по защите прав субъектов персональных данных',
    ],
    contentAfter: [
      'Для реализации ваших прав обратитесь к нам по контактам, указанным в разделе «Контакты».',
    ],
  },
  {
    id: 'cookies',
    icon: <Eye size={22} className="text-white" />,
    color: 'icon-circle-blue',
    title: '6. Файлы cookie',
    content: [
      'Сайт использует файлы cookie - небольшие текстовые файлы, сохраняемые на вашем устройстве. Cookie помогают нам анализировать посещаемость сайта, запоминать ваши предпочтения и улучшать работу сервиса.',
      'Вы можете отключить использование cookie в настройках вашего браузера. Обратите внимание, что это может повлиять на функциональность некоторых разделов сайта.',
    ],
  },
  {
    id: 'third-party',
    icon: <Shield size={22} className="text-white" />,
    color: 'icon-circle-peach',
    title: '7. Передача данных третьим лицам',
    content: [
      'Клиника не передаёт ваши персональные данные третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством Российской Федерации.',
      'Передача данных может осуществляться в следующих случаях: по запросу уполномоченных государственных органов, в целях оказания медицинской помощи (направление к специалистам, лабораторные исследования), а также в иных случаях, прямо предусмотренных законом.',
    ],
  },
  {
    id: 'changes',
    icon: <Database size={22} className="text-white" />,
    color: 'icon-circle-lavender',
    title: '8. Изменения в Политике',
    content: [
      'Клиника оставляет за собой право вносить изменения в настоящую Политику. Актуальная версия всегда доступна на данной странице.',
      'Продолжение использования сайта после внесения изменений означает ваше согласие с обновлённой редакцией Политики. Рекомендуем периодически проверять эту страницу.',
      'Настоящая редакция Политики действует с 1 января 2026 года.',
    ],
  },
]

const SUMMARY_ITEMS = [
  {
    icon: Lock,
    cardClass: 'clay-card-soft-mint',
    iconClass: 'icon-circle-mint',
    title: 'Защита персональных данных',
  },
  {
    icon: UserCheck,
    cardClass: 'clay-card-soft-peach',
    iconClass: 'icon-circle-peach',
    title: 'Права пользователя',
  },
  {
    icon: Shield,
    cardClass: 'clay-card-soft-blue',
    iconClass: 'icon-circle-blue',
    title: 'Медицинская тайна',
  },
]

export function PrivacyPolicy() {
  return (
    <main className="grain-overlay">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
              <Shield size={14} aria-hidden="true" />
              Защита данных
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
              Политика конфиденциальности
            </h1>
            <p className="text-clay-muted text-lg max-w-2xl leading-relaxed">
              Мы бережно относимся к вашим персональным данным и обеспечиваем их надёжную защиту в соответствии с требованиями законодательства.
            </p>
          </div>
        </div>
      </section>
      <section className="section pt-4">
        <div className="container-clay">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SUMMARY_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className={`clay ${item.cardClass} p-5 flex items-center gap-4`}>
                  <div className={`${item.iconClass} h-11 w-11 rounded-2xl`}>
                    <Icon size={20} className="text-white" aria-hidden="true" />
                  </div>
                  <p className="font-semibold text-clay-dark text-sm leading-snug">{item.title}</p>
                </div>
              )
            })}
          </div>
          <nav aria-label="Разделы политики" className="mt-5 clay clay-card p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-[16px] px-3 py-2 text-sm font-semibold text-clay-muted transition-colors hover:bg-[color:var(--surface-muted)] hover:text-clay-dark"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <div className="flex flex-col gap-5">
            {SECTIONS.map((section) => (
              <article key={section.id} id={section.id} className="clay clay-card p-6 sm:p-8 scroll-mt-24">
                <div className="mb-5 flex items-center gap-3">
                  <div className={`${section.color} h-11 w-11 rounded-2xl flex-shrink-0`}>
                    {section.icon}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-clay-dark">{section.title}</h2>
                </div>
                <div className="flex flex-col gap-3 text-clay-text text-sm sm:text-base leading-relaxed">
                  {section.content.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                  {section.list && (
                    <ul className="grid gap-2 mt-1">
                      {section.list.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <CheckIcon />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.contentAfter && section.contentAfter.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <div className="clay cta-gradient-card p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">9. Контакты</h2>
            <p className="text-clay-muted text-sm sm:text-base mb-5 leading-relaxed max-w-3xl">
              По вопросам обработки персональных данных, реализации ваших прав или отзыва согласия обращайтесь к нам:
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="clay clay-card p-5 flex items-center gap-3">
                <Phone size={18} className="text-clay-mint flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-clay-muted text-xs">Телефон</p>
                  <a href={`tel:${PHONE_NUMBER}`} className="text-clay-dark font-semibold text-sm block hover:text-clay-mint transition-colors">{PHONE_DISPLAY}</a>
                  <a href={`tel:${PHONE_NUMBER_2}`} className="text-clay-dark font-semibold text-sm block hover:text-clay-mint transition-colors">{PHONE_DISPLAY_2}</a>
                </div>
              </div>
              <a
                href="mailto:info@odintsovclinic.ru"
                className="clay clay-card p-5 flex items-center gap-3 transition-colors hover:bg-[color:var(--surface-card-hover)]"
              >
                <Mail size={18} className="text-clay-mint flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-clay-muted text-xs">Электронная почта</p>
                  <p className="text-clay-dark font-semibold text-sm">info@odintsovclinic.ru</p>
                </div>
              </a>
              <div className="clay clay-card p-5 flex items-center gap-3">
                <MapPin size={18} className="text-clay-mint flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-clay-muted text-xs">Адрес</p>
                  <p className="text-clay-dark font-semibold text-sm">{ADDRESS}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function CheckIcon() {
  return <span className="mt-1.5 h-2 w-2 rounded-full bg-clay-mint flex-shrink-0" aria-hidden="true" />
}
