import { Accessibility, ArrowRight, BookOpen, Building2, CalendarClock, ExternalLink, FileText, Scale, ShieldCheck } from 'lucide-react'
import { ADDRESS, HOURS_WEEKDAY, HOURS_WEEKEND, PHONE_DISPLAY } from '../../lib/contacts.js'

const PATIENT_RIGHTS = [
  'Уважительное и гуманное отношение со стороны медицинских работников',
  'Выбор врача и получение информации о его квалификации',
  'Получение полной информации о состоянии здоровья, методах диагностики и лечения, их рисках и альтернативах',
  'Информированное добровольное согласие на медицинское вмешательство и отказ от него',
  'Сохранение врачебной тайны и защита персональных данных',
  'Получение копий и выписок из медицинских документов',
  'Облегчение боли доступными методами и лекарственными препаратами',
  'Обжалование действий сотрудников клиники у руководства и в контролирующих органах',
]

const PATIENT_DUTIES = [
  'Заботиться о сохранении своего здоровья и соблюдать рекомендации врача',
  'Сообщать врачу достоверные сведения о состоянии здоровья, перенесённых заболеваниях, аллергии и принимаемых препаратах',
  'Соблюдать режим работы клиники и приходить к назначенному времени',
  'Уважительно относиться к другим пациентам и сотрудникам клиники',
]

const APPOINTMENT_RULES = [
  { title: 'Запись', desc: `По телефону ${PHONE_DISPLAY}, через онлайн-запись на сайте или в Max. Первичный приём длится от 30 минут.` },
  { title: 'Документы', desc: 'Паспорт, результаты предыдущих обследований и заключения других врачей. Для несовершеннолетних — паспорт законного представителя и свидетельство о рождении.' },
  { title: 'Опоздание и отмена', desc: 'Если вы опаздываете или не можете прийти, предупредите администратора: слот отдадим другому пациенту, а вам подберём новое время.' },
  { title: 'Оплата', desc: 'Медицинские услуги оказываются платно по прайс-листу клиники после подписания договора и информированного согласия. Принимаются наличные и банковские карты, выдаётся кассовый чек и документы для налогового вычета.' },
  { title: 'Режим работы', desc: `${HOURS_WEEKDAY}, ${HOURS_WEEKEND}. Адрес: ${ADDRESS}.` },
]

const REGULATIONS = [
  { title: 'Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации»', href: 'http://publication.pravo.gov.ru/Document/View/0001201111230001' },
  { title: 'Постановление Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг»', href: 'http://publication.pravo.gov.ru/document/0001202305150014' },
  { title: 'Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей»', href: 'http://pravo.gov.ru/proxy/ips/?docbody=&nd=102014356' },
  { title: 'Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных»', href: 'http://publication.pravo.gov.ru/Document/View/0001200607280009' },
  { title: 'Программа государственных гарантий бесплатного оказания гражданам медицинской помощи', href: 'https://www.gov.spb.ru/gov/otrasl/c_health/' },
]

const AUTHORITIES = [
  { name: 'Территориальный орган Росздравнадзора по г. Санкт-Петербургу и Ленинградской области', href: 'https://78reg.roszdravnadzor.gov.ru/', scope: 'Контроль качества и безопасности медицинской деятельности, лицензирование', address: '197342, Санкт-Петербург, ул. Кантемировская, д. 4, лит. А', phone: '8 (812) 246-69-86' },
  { name: 'Комитет по здравоохранению Санкт-Петербурга', href: 'https://zdrav.spb.ru/', scope: 'Орган исполнительной власти в сфере охраны здоровья', address: '191023, Санкт-Петербург, ул. Малая Садовая, д. 1', phone: '8 (812) 679-60-04' },
  { name: 'Управление Роспотребнадзора по городу Санкт-Петербургу', href: 'https://78.rospotrebnadzor.ru/', scope: 'Санитарно-эпидемиологический надзор и защита прав потребителей', address: '191025, Санкт-Петербург, ул. Стремянная, д. 19', phone: '8 (812) 679-67-07' },
]

export function PatientInfo() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
              <BookOpen size={14} aria-hidden="true" />
              Пациентам
            </div>
            <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">Информация для пациентов</h1>
            <p className="text-lg text-clay-muted leading-relaxed max-w-2xl">
              Права и обязанности пациента, правила записи и приёма, нормативные документы и контролирующие органы. Сведения размещены в соответствии с требованиями к медицинским организациям, оказывающим платные медицинские услуги.
            </p>
          </div>
        </div>
      </section>
      <section className="section pt-4">
        <div className="container-clay grid gap-6 lg:grid-cols-2">
          <article className="clay clay-card p-6 md:p-8">
            <h2 className="mb-5 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
              <span className="icon-circle-mint flex-shrink-0"><ShieldCheck size={18} className="text-white" aria-hidden="true" /></span>
              Права пациента
            </h2>
            <ul className="grid gap-2 text-clay-muted">
              {PATIENT_RIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-clay-mint" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="clay clay-card p-6 md:p-8">
            <h2 className="mb-5 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
              <span className="icon-circle-peach flex-shrink-0"><Scale size={18} className="text-white" aria-hidden="true" /></span>
              Обязанности пациента
            </h2>
            <ul className="grid gap-2 text-clay-muted">
              {PATIENT_DUTIES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-clay-peach" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-clay-muted leading-relaxed">
              Права и обязанности закреплены статьями 19 и 27 Федерального закона № 323-ФЗ. Медицинская помощь оказывается только после подписания информированного добровольного согласия.
            </p>
          </article>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <h2 className="mb-5 flex items-center gap-3 text-2xl sm:text-3xl heading-serif text-clay-dark">
            <span className="icon-circle-blue flex-shrink-0"><CalendarClock size={18} className="text-white" aria-hidden="true" /></span>
            Правила записи и приёма
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {APPOINTMENT_RULES.map((rule) => (
              <div key={rule.title} className="clay clay-card p-5">
                <h3 className="font-bold text-clay-dark mb-2">{rule.title}</h3>
                <p className="text-clay-muted leading-relaxed">{rule.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay grid gap-6 lg:grid-cols-2">
          <article className="clay clay-card p-6 md:p-8">
            <h2 className="mb-5 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
              <span className="icon-circle-lavender flex-shrink-0"><FileText size={18} className="text-white" aria-hidden="true" /></span>
              Нормативные документы
            </h2>
            <ul className="grid gap-3">
              {REGULATIONS.map((doc) => (
                <li key={doc.href}>
                  <a href={doc.href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-clay-dark underline-offset-4 hover:underline">
                    <ExternalLink size={16} className="mt-1 flex-shrink-0 text-clay-mint" aria-hidden="true" />
                    <span>{doc.title}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-clay-muted leading-relaxed">
              Лицензия, реквизиты и сведения о специальной оценке условий труда — на страницах <a href="/licenses" className="text-clay-dark underline-offset-4 hover:underline">«Лицензии»</a> и <a href="/about" className="text-clay-dark underline-offset-4 hover:underline">«О клинике»</a>. Полный прайс-лист — в разделе <a href="/prices/full" className="text-clay-dark underline-offset-4 hover:underline">«Цены»</a>.
            </p>
          </article>
          <article className="clay clay-card p-6 md:p-8">
            <h2 className="mb-5 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
              <span className="icon-circle-mint flex-shrink-0"><Building2 size={18} className="text-white" aria-hidden="true" /></span>
              Контролирующие органы
            </h2>
            <ul className="grid gap-4">
              {AUTHORITIES.map((authority) => (
                <li key={authority.href} className="rounded-[16px] border border-[color:var(--border-color)] bg-[color:var(--surface-card-hover)] p-4">
                  <a href={authority.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-clay-dark underline-offset-4 hover:underline">{authority.name}</a>
                  <p className="mt-1 text-clay-muted">{authority.scope}</p>
                  <p className="mt-2 text-clay-muted">{authority.address}</p>
                  <a href={`tel:${authority.phone.replace(/[^\d+]/g, '').replace(/^8/, '+7')}`} className="text-clay-dark underline-offset-4 hover:underline">{authority.phone}</a>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-clay-muted leading-relaxed">
              Обращения и жалобы принимает руководство клиники по телефону {PHONE_DISPLAY} и на электронную почту, указанную на странице <a href="/contacts" className="text-clay-dark underline-offset-4 hover:underline">«Контакты»</a>.
            </p>
          </article>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <div className="clay clay-card-soft-mint p-6 md:p-8">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <h2 className="mb-3 flex items-center gap-3 text-2xl sm:text-3xl heading-serif text-clay-dark">
                  <span className="icon-circle-mint flex-shrink-0"><Accessibility size={18} className="text-white" aria-hidden="true" /></span>
                  Доступная среда
                </h2>
                <p className="text-clay-muted leading-relaxed max-w-3xl">
                  Как клиника принимает пациентов с инвалидностью и ограниченной мобильностью: кнопка вызова персонала у входа, сопровождение администратором, помощь при нарушениях зрения и слуха.
                </p>
              </div>
              <a href="/accessibility" className="clay btn-clay-primary inline-flex items-center gap-2">
                Подробнее о доступной среде
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
