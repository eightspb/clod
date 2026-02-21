import { Shield, Lock, Eye, UserCheck, Database, Phone, MapPin } from 'lucide-react'

const SECTIONS = [
  {
    id: 'general',
    icon: <Shield size={22} className="text-white" />,
    color: 'clay-card-mint',
    title: '1. Общие положения',
    content: [
      'Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных физических лиц (далее — «Пользователи»), которые используют сайт и услуги ООО «Клиника Одинцова» (далее — «Клиника»).',
      'Обрабатывая ваши персональные данные, Клиника руководствуется Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных», иными нормативными правовыми актами Российской Федерации, а также настоящей Политикой.',
      'Использование сайта или запись на приём означает ваше согласие с условиями настоящей Политики. Если вы не согласны с какими-либо условиями, пожалуйста, прекратите использование сайта.',
    ],
  },
  {
    id: 'data',
    icon: <Database size={22} className="text-white" />,
    color: 'clay-card-blue',
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
    color: 'clay-card-peach',
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
    color: 'clay-card-lavender',
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
    color: 'clay-card-mint',
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
    color: 'clay-card-blue',
    title: '6. Файлы cookie',
    content: [
      'Сайт использует файлы cookie — небольшие текстовые файлы, сохраняемые на вашем устройстве. Cookie помогают нам анализировать посещаемость сайта, запоминать ваши предпочтения и улучшать работу сервиса.',
      'Вы можете отключить использование cookie в настройках вашего браузера. Обратите внимание, что это может повлиять на функциональность некоторых разделов сайта.',
    ],
  },
  {
    id: 'third-party',
    icon: <Shield size={22} className="text-white" />,
    color: 'clay-card-peach',
    title: '7. Передача данных третьим лицам',
    content: [
      'Клиника не передаёт ваши персональные данные третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством Российской Федерации.',
      'Передача данных может осуществляться в следующих случаях: по запросу уполномоченных государственных органов, в целях оказания медицинской помощи (направление к специалистам, лабораторные исследования), а также в иных случаях, прямо предусмотренных законом.',
    ],
  },
  {
    id: 'changes',
    icon: <Database size={22} className="text-white" />,
    color: 'clay-card-lavender',
    title: '8. Изменения в Политике',
    content: [
      'Клиника оставляет за собой право вносить изменения в настоящую Политику. Актуальная версия всегда доступна на данной странице.',
      'Продолжение использования сайта после внесения изменений означает ваше согласие с обновлённой редакцией Политики. Рекомендуем периодически проверять эту страницу.',
      'Настоящая редакция Политики действует с 1 января 2026 года.',
    ],
  },
]

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-clay-border shadow-sm mb-5">
          <Shield size={16} className="text-clay-mint" />
          <span className="text-sm font-medium text-clay-muted">Защита данных</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-clay-dark mb-4 leading-tight">
          Политика конфиденциальности
        </h1>
        <p className="text-clay-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Мы бережно относимся к вашим персональным данным и обеспечиваем их надёжную защиту в соответствии с требованиями законодательства.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <div className="clay clay-card-mint p-5 flex flex-col gap-2">
          <Lock size={20} className="text-white opacity-90" />
          <p className="text-white font-semibold text-sm leading-snug">Надёжное шифрование данных</p>
        </div>
        <div className="clay clay-card-peach p-5 flex flex-col gap-2">
          <UserCheck size={20} className="text-white opacity-90" />
          <p className="text-white font-semibold text-sm leading-snug">Данные не передаются без согласия</p>
        </div>
        <div className="clay clay-card-blue p-5 flex flex-col gap-2">
          <Shield size={20} className="text-white opacity-90" />
          <p className="text-white font-semibold text-sm leading-snug">Медицинская тайна гарантирована</p>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <div key={section.id} className="clay clay-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className={`clay ${section.color} w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0`}>
                {section.icon}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-clay-dark">{section.title}</h2>
            </div>

            <div className="flex flex-col gap-3 text-clay-text text-sm sm:text-base leading-relaxed">
              {section.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}

              {section.list && (
                <ul className="flex flex-col gap-2 mt-1">
                  {section.list.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-clay-mint flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.contentAfter && section.contentAfter.map((para, i) => (
                <p key={`after-${i}`}>{para}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact block */}
      <div className="clay clay-card-mint mt-8 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white mb-2">9. Контакты</h2>
        <p className="text-white/90 text-sm sm:text-base mb-5 leading-relaxed">
          По вопросам обработки персональных данных, реализации ваших прав или отзыва согласия обращайтесь к нам:
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="clay bg-white/20 rounded-2xl px-5 py-3 flex items-center gap-3">
            <Phone size={18} className="text-white flex-shrink-0" />
            <div>
              <p className="text-white/70 text-xs">Телефон</p>
              <a href="tel:+78127482210" className="text-white font-semibold text-sm block hover:text-white/80 transition-colors">+7 (812) 748-22-10</a>
              <a href="tel:+79119258022" className="text-white font-semibold text-sm block hover:text-white/80 transition-colors">+7 (911) 925-80-22</a>
            </div>
          </div>
          <div className="clay bg-white/20 rounded-2xl px-5 py-3 flex items-center gap-3">
            <MapPin size={18} className="text-white flex-shrink-0" />
            <div>
              <p className="text-white/70 text-xs">Адрес</p>
              <p className="text-white font-semibold text-sm">Санкт-Петербург, пр. Богатырский 22 к.1</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
