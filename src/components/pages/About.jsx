import { ArrowRight, Award, Clock, Heart, Mail, Microscope, Monitor, Phone, Radio, Shield, Star, TestTube, Users, Zap } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { RING_COLOR_MAP } from '../../lib/constants.js'
import { FadeInSection } from '../FadeInSection.jsx'

const ADVANTAGES = [
  {
    icon: Shield,
    iconBg: 'icon-circle-mint',
    title: 'Доказательная медицина',
    desc: 'Назначаем обследования и лечение по показаниям, без лишних процедур и давления на пациента.',
  },
  {
    icon: Zap,
    iconBg: 'icon-circle-blue',
    title: 'Технология ВАБ',
    desc: 'Вакуумная аспирационная биопсия под УЗ-контролем. Обсуждаем объём вмешательства и дальнейшее наблюдение заранее.',
  },
  {
    icon: Users,
    iconBg: 'icon-circle-peach',
    title: 'Команда с опытом',
    desc: 'Врачи клиники регулярно повышают квалификацию и работают в связке, чтобы пациент понимал маршрут лечения.',
  },
  {
    icon: Clock,
    iconBg: 'icon-circle-lavender',
    title: 'Понятный план лечения',
    desc: 'На приёме заранее обсуждаем следующие шаги, сроки исследований и формат связи с клиникой.',
  },
  {
    icon: Heart,
    iconBg: 'icon-circle-mint',
    title: 'Бережный подход',
    desc: 'Спокойный приём, уважительный тон и аккуратные объяснения без лишней терминологии.',
  },
  {
    icon: Award,
    iconBg: 'icon-circle-peach',
    title: 'Прозрачное ценообразование',
    desc: 'Объём услуги и возможные дополнительные исследования обсуждаем до начала лечения.',
  },
]

const EQUIPMENT = [
  {
    icon: Microscope,
    title: 'Система XISHAN (Сишань)',
    desc: 'Оборудование для вакуумной аспирационной биопсии под контролем УЗИ. Используется для малоинвазивного лечения по показаниям.',
    tag: 'Основное направление',
    tagColor: '#3AB89A',
    tagBg: 'rgba(78,200,168,0.12)',
  },
  {
    icon: Radio,
    title: 'УЗИ экспертного класса',
    desc: 'Ультразвуковая диагностика помогает уточнять локализацию образования, объём вмешательства и дальнейшую тактику.',
    tag: 'Диагностика',
    tagColor: '#4880B0',
    tagBg: 'rgba(78,158,200,0.12)',
  },
  {
    icon: TestTube,
    title: 'Партнёрские лаборатории',
    desc: 'Гистологические и цитологические исследования выполняются в профильных партнёрских лабораториях. Сроки готовности зависят от вида исследования и обсуждаются на приёме.',
    tag: 'Лаборатория',
    tagColor: '#7060A8',
    tagBg: 'rgba(155,142,200,0.12)',
  },
  {
    icon: Monitor,
    title: 'Удобная выдача документов',
    desc: 'Заключения, снимки и протоколы можно получить в клинике, а администратор подскажет, какие материалы подготовить для повторного приёма или второго мнения.',
    tag: 'Сервис',
    tagColor: '#D07858',
    tagBg: 'rgba(240,168,136,0.12)',
  },
]

const PATIENT_JOURNEY = [
  {
    num: '01',
    title: 'Обращение',
    desc: 'Звонок или заявка онлайн. Администратор согласует удобное время и формат приёма.',
  },
  {
    num: '02',
    title: 'Диагностика',
    desc: 'Осмотр и УЗИ по показаниям. Врач объясняет, что видит и зачем нужно каждое исследование.',
  },
  {
    num: '03',
    title: 'Консилиум',
    desc: 'При необходимости случай обсуждается командой специалистов: маммолог, гинеколог, эндокринолог.',
  },
  {
    num: '04',
    title: 'Лечение',
    desc: 'Выбирается наименее инвазивный метод. Обсуждаем объём, риски и дальнейший план до начала.',
  },
  {
    num: '05',
    title: 'Наблюдение',
    desc: 'После лечения врач сообщает, когда и как продолжить наблюдение и что делать при изменении состояния.',
  },
]

const PRINCIPLES = [
  {
    icon: Shield,
    iconBg: 'icon-circle-mint',
    title: 'Доказательная медицина',
    desc: 'Решения принимаются на основе показаний и проверенных протоколов, без лишних назначений и давления.',
  },
  {
    icon: Award,
    iconBg: 'icon-circle-peach',
    title: 'Прозрачное ценообразование',
    desc: 'Объём услуги и возможные дополнительные исследования обсуждаем до начала лечения.',
  },
  {
    icon: Phone,
    iconBg: 'icon-circle-blue',
    title: 'Личная связь с врачом',
    desc: 'После приёма можно уточнить вопросы по телефону или в Telegram — без ожидания следующего визита.',
  },
  {
    icon: Users,
    iconBg: 'icon-circle-lavender',
    title: 'Командный подход',
    desc: 'Маммологи, гинекологи, эндокринологи и нутрициологи работают в едином маршруте пациента.',
  },
]

export function About() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-6 pb-10">
        {/* decorative blobs removed to reduce CSS payload */}
        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5 badge-specialty-mint">
              <Heart size={12} />
              Санкт-Петербург · Приморский район
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
              О клинике{' '}
              <span className="heading-accent">Одинцова</span>
            </h1>
            <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
              Клиника в Санкт-Петербурге, на Богатырском проспекте, рядом с м. Комендантский проспект и м. Старая Деревня. Работаем в маммологии, гинекологии, эндокринологии и нутрициологии.
            </p>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Наша задача - дать понятный маршрут: от первичного приёма и диагностики до обсуждения лечения и, при необходимости, малоинвазивной процедуры.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                Записаться на приём
                <ArrowRight size={16} />
              </button>
              <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                <Phone size={16} />
                Позвонить
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ПРИВЕТСТВЕННОЕ СЛОВО ГЛАВНОГО ВРАЧА */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">
              От главного врача
            </h2>
            <div className="clay clay-card card-interactive p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-start">
                <div className={`${RING_COLOR_MAP.mint} flex-shrink-0`}>
                  <img
                    src="/images/doctors/odintsov.webp"
                    alt="Владислав Александрович Одинцов"
                    className="w-48 h-48 md:w-64 md:h-64 rounded-full object-cover"
                    loading="eager"
                    // eslint-disable-next-line react/no-unknown-property
                    fetchpriority="high"
                    width="256"
                    height="256"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-5 text-clay-muted leading-relaxed">
                  <p>
                    Клиника Одинцова работает в Санкт-Петербурге, в Приморском районе, на Богатырском проспекте. Я основал клинику и лично отвечаю за направление маммологии, а также за организацию маршрута пациента.
                  </p>
                  <p>
                    Мы ведём приём по маммологии, гинекологии, эндокринологии и нутрициологии. В клинике важны не громкие обещания, а понятный план: осмотр, диагностика по показаниям, обсуждение вариантов и аккуратное лечение, если оно действительно нужно.
                  </p>
                  <p>
                    Для меня принципиально, чтобы пациент понимал, зачем назначено каждое обследование и чего ждать дальше. Если требуется малоинвазивная процедура, помогаем подготовиться к ней и заранее объясняем, как будет проходить восстановление.
                  </p>
                  <p>
                    Если случай требует дополнительного мнения, мы разбираем документы и подсказываем следующий шаг спокойно, без лишней спешки и давления.
                  </p>
                  <p className="font-bold text-clay-dark">
                    Владислав Александрович Одинцов<br />
                    доктор медицинских наук, маммолог-онколог, хирург, врач УЗД
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {[
                { val: '2014', color: 'text-clay-mint', card: 'clay-card-soft-mint', label: 'год основания', desc: 'Работаем в Санкт-Петербурге с 2014 года' },
                { val: '15+', color: 'text-clay-peach', card: 'clay-card-soft-peach', label: 'лет стаж врачей', desc: 'Средний опыт специалистов клиники' },
                { val: '4', color: 'text-clay-blue', card: 'clay-card-soft-blue', label: 'направления медицины', desc: 'Маммология, гинекология, эндокринология, нутрициология' },
                { val: 'СПб', color: 'text-clay-lavender', card: 'clay-card-soft-lavender', label: 'локация клиники', desc: 'Богатырский проспект 22 к.1, Приморский район' },
              ].map((s) => (
                <div key={s.val} className={`clay ${s.card} p-5`}>
                  <div className={`text-3xl font-extrabold ${s.color} leading-none mb-1`}>{s.val}</div>
                  <p className="font-bold text-clay-dark text-sm mb-1">{s.label}</p>
                  <p className="text-clay-muted text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* HISTORY / MISSION */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">
              История и миссия
            </h2>
            <div className="space-y-5 text-clay-muted leading-relaxed max-w-3xl">
              <p>
                Клиника Одинцова основана в 2014 году в Санкт-Петербурге командой врачей, объединённых общей идеей: медицина должна быть честной, доступной и ориентированной на пациента. Мы начинали как небольшой маммологический центр в Приморском районе и за несколько лет выросли в многопрофильную клинику экспертного уровня.
              </p>
              <p>
                Наша миссия - помочь каждому пациенту принять осознанное решение о своём здоровье. Мы не назначаем лишних анализов, не предлагаем операцию без оснований и всегда объясняем, почему выбран именно этот метод лечения.
              </p>
              <p>
                Основное направление клиники — вакуумная аспирационная биопсия (ВАБ), малоинвазивная процедура в маммологии. Мы помогаем уточнить диагноз, получить второе мнение и обсудить варианты лечения без спешки и лишних вмешательств.
              </p>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* LEADERSHIP */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">
              Руководство
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="clay clay-card card-interactive p-6">
                <h3 className="font-bold text-clay-dark text-lg mb-1">Владислав Александрович Одинцов</h3>
                <p className="text-clay-muted text-sm mb-4">Основатель и главный врач</p>
                <div className="space-y-2 text-sm text-clay-muted">
                  <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-2 hover:text-clay-mint transition-colors">
                    <Phone size={14} />
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              <div className="clay clay-card card-interactive p-6">
                <h3 className="font-bold text-clay-dark text-lg mb-1">Юлия Игоревна Борисенкова</h3>
                <p className="text-clay-muted text-sm mb-4">Генеральный директор</p>
                <div className="space-y-2 text-sm text-clay-muted">
                  <a href="mailto:dir@odintsovclinic.ru" className="flex items-center gap-2 hover:text-clay-mint transition-colors">
                    <Mail size={14} />
                    dir@odintsovclinic.ru
                  </a>
                  <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-2 hover:text-clay-mint transition-colors">
                    <Phone size={14} />
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              <div className="clay clay-card card-interactive p-6">
                <h3 className="font-bold text-clay-dark text-lg mb-1">Анна Анатольевна Никитинас</h3>
                <p className="text-clay-muted text-sm mb-4">Исполнительный директор</p>
                <div className="space-y-2 text-sm text-clay-muted">
                  <a href="mailto:anna@odintsovclinic.ru" className="flex items-center gap-2 hover:text-clay-mint transition-colors">
                    <Mail size={14} />
                    anna@odintsovclinic.ru
                  </a>
                  <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-2 hover:text-clay-mint transition-colors">
                    <Phone size={14} />
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ADVANTAGES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl heading-serif text-clay-dark mb-3">
                  Наши преимущества
                </h2>
                <p className="text-clay-muted max-w-xl mx-auto">
                Спокойный, понятный и медицински выверенный маршрут лечения
                </p>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ADVANTAGES.map((item, i) => {
                const Icon = item.icon
                return (
                  <FadeInSection key={item.title} staggerIndex={i} className="h-full">
                    <div className="clay clay-card card-interactive p-6 flex flex-col gap-4 h-full">
                      <div className={item.iconBg}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-clay-dark mb-2">{item.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </FadeInSection>
                )
              })}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* EQUIPMENT */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl heading-serif text-clay-dark mb-3">
                Оборудование и технологии
              </h2>
              <p className="text-clay-muted max-w-xl mx-auto">
                Современная база для точной диагностики и малоинвазивного лечения
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {EQUIPMENT.map((item, i) => {
                const Icon = item.icon
                return (
                  <FadeInSection key={item.title} staggerIndex={i} className="h-full">
                    <div className="clay clay-card card-interactive p-6 flex items-start gap-4 h-full">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: item.tagBg }}
                      >
                        <Icon size={24} style={{ color: item.tagColor }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-clay-dark">{item.title}</h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                            style={{ background: item.tagBg, color: item.tagColor }}
                          >
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-clay-muted text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </FadeInSection>
                )
              })}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* МАРШРУТ ПАЦИЕНТА */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl heading-serif text-clay-dark mb-3">
                Маршрут пациента
              </h2>
              <p className="text-clay-muted max-w-xl mx-auto">
                Понятный путь от обращения до наблюдения после лечения
              </p>
            </div>
            <div className="relative">
              <div className="absolute left-5 top-10 bottom-10 w-0.5 bg-clay-mint/20 md:hidden" />
              <div className="hidden md:flex items-start gap-0 mb-8">
                {PATIENT_JOURNEY.map((step, i) => (
                  <div key={step.num} className="flex-1 flex flex-col items-center text-center relative">
                    {i < PATIENT_JOURNEY.length - 1 && (
                      <div className="absolute top-5 left-1/2 right-0 h-0.5 bg-clay-mint/25" />
                    )}
                    <div className="relative z-10 w-10 h-10 rounded-full bg-clay-mint flex items-center justify-center flex-shrink-0 shadow-clay-mint mb-3">
                      <span className="text-sm font-bold text-white">{step.num}</span>
                    </div>
                    <h3 className="font-bold text-clay-dark text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-clay-muted leading-relaxed px-2">{step.desc}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4 md:hidden">
                {PATIENT_JOURNEY.map((step) => (
                  <div key={step.num} className="flex items-start gap-4 relative">
                    <div className="relative z-10 w-10 h-10 rounded-full bg-clay-mint flex items-center justify-center flex-shrink-0 shadow-clay-mint">
                      <span className="text-sm font-bold text-white">{step.num}</span>
                    </div>
                    <div className="flex-1 clay clay-card p-4 relative overflow-hidden">
                      <span className="deco-numeral absolute -top-4 -right-2 opacity-30">{step.num}</span>
                      <div className="relative z-10">
                        <h3 className="font-bold text-clay-dark text-base mb-1">{step.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* НАШИ ПРИНЦИПЫ */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl heading-serif text-clay-dark mb-3">
                Наши принципы
              </h2>
              <p className="text-clay-muted max-w-xl mx-auto">
                То, что остаётся неизменным в каждом приёме и решении
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {PRINCIPLES.map((item, i) => {
                const Icon = item.icon
                return (
                  <FadeInSection key={item.title} staggerIndex={i} className="h-full">
                    <div className="clay clay-card card-interactive p-6 flex items-start gap-4 h-full">
                      <div className={`${item.iconBg} flex-shrink-0`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-clay-dark mb-2">{item.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </FadeInSection>
                )
              })}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* DOCUMENTS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">
              Документы, регламентирующие деятельность Клиники
            </h2>
            <div className="clay clay-card p-6 md:p-8 space-y-6">
              <p className="text-clay-muted leading-relaxed">
                Медицинская деятельность в ООО «Клиника Одинцова» осуществляется в соответствии с Лицензией на осуществление медицинской деятельности, выданной Федеральной службой по надзору в сфере здравоохранения.
              </p>
              <p className="text-clay-muted leading-relaxed">
                ООО «Клиника Одинцова» включена в Единый государственный реестр юридических лиц.
              </p>
              <p className="text-clay-muted leading-relaxed">
                Учреждение в своей деятельности руководствуется Конституцией РФ, федеральными конституционными законами, актами Президента РФ, Правительства РФ, нормативными правовыми актами Министерства и Уставом.
              </p>
              <div>
                <h3 className="font-bold text-clay-dark mb-3">СОУТ</h3>
                <p className="text-clay-muted leading-relaxed">
                  Сводные данные о результатах специальной оценки условий труда (СОУТ) 2019 г.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-clay-dark mb-3">Права граждан при оказании медицинской помощи закреплены</h3>
                <ul className="list-disc list-inside text-clay-muted space-y-1">
                  <li>Закон РФ от 07.02.1992 №2300-1 «О защите прав потребителей»</li>
                  <li>Федеральный закон от 21.11.2011 N 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации»</li>
                  <li>Федеральный закон от 29.11.2010 N 326-ФЗ «Об обязательном медицинском страховании в Российской Федерации»</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-clay-dark mb-3">Контакты контролирующих организаций</h3>
                <ul className="list-disc list-inside text-clay-muted space-y-1">
                  <li><a href="https://minzdrav.gov.ru/" target="_blank" rel="noopener noreferrer" className="hover:text-clay-mint transition-colors underline underline-offset-2">Министерство здравоохранения РФ</a></li>
                  <li><a href="https://roszdravnadzor.gov.ru/" target="_blank" rel="noopener noreferrer" className="hover:text-clay-mint transition-colors underline underline-offset-2">Федеральная служба по надзору в сфере здравоохранения</a></li>
                  <li><a href="https://rospotrebnadzor.ru/" target="_blank" rel="noopener noreferrer" className="hover:text-clay-mint transition-colors underline underline-offset-2">Федеральная служба по надзору в сфере защиты прав потребителей и благополучия человека</a></li>
                  <li><a href="https://spboms.ru/" target="_blank" rel="noopener noreferrer" className="hover:text-clay-mint transition-colors underline underline-offset-2">Территориальный фонд обязательного медицинского страхования</a></li>
                  <li><a href="https://78reg.roszdravnadzor.gov.ru/" target="_blank" rel="noopener noreferrer" className="hover:text-clay-mint transition-colors underline underline-offset-2">Территориальный орган Росздравнадзора по Санкт-Петербургу и Ленинградской области</a></li>
                  <li><a href="https://78.rospotrebnadzor.ru/" target="_blank" rel="noopener noreferrer" className="hover:text-clay-mint transition-colors underline underline-offset-2">Управление Роспотребнадзора по городу Санкт-Петербургу</a></li>
                </ul>
              </div>
              <div className="clay clay-card-soft-mint p-5 mt-6">
                <h3 className="font-bold text-clay-dark mb-3">Наши реквизиты</h3>
                <div className="text-clay-muted text-sm leading-relaxed space-y-2">
                  <p>ООО «Клиника Одинцова»</p>
                  <p>г. Санкт-Петербург, пр. Богатырский д.22 корп. 1</p>
                  <p>ОГРН 1137847430412, ИНН 7801615591, КПП 781401001, ОКПО 31040358</p>
                  <p>Р/с 40702810903500008239 Точка ООО «Банк Точка», БИК 044525104, к/с 301 018 107 453 745 251 04</p>
                  <p>Генеральный директор Борисенкова Юлия Игоревна</p>
                  <p className="mt-4">Контактное лицо по вопросам о сотрудничестве: Никитинас Анна Анатольевна, Исполнительный директор ООО «Клиника Одинцова». Телефон: {PHONE_DISPLAY}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-mint p-6 md:p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/10 translate-y-1/2" />
              <div className="relative z-10">
                <Star size={40} className="text-clay-mint mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                  Готовы записаться?
                </h2>
                <p className="text-clay-text text-lg mb-5 max-w-xl mx-auto">
                  Позвоните нам или оставьте заявку - подскажем удобный формат связи и согласуем время приёма.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white gap-2">
                    Записаться онлайн
                    <ArrowRight size={16} />
                  </button>
                  <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                    <Phone size={16} />
                    Позвонить
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>
    </div>
  )
}
