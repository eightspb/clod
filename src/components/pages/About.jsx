import { ArrowRight, Award, Clock, Heart, Mail, Shield, Star, Users, Zap, Phone } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { RING_COLOR_MAP } from '../../lib/constants.js'

const ADVANTAGES = [
  {
    icon: Shield,
    iconBg: 'icon-circle-mint',
    title: 'Доказательная медицина',
    desc: 'Только методы с доказанной эффективностью. Никакой гипердиагностики и лишних назначений - только то, что действительно нужно.',
  },
  {
    icon: Zap,
    iconBg: 'icon-circle-blue',
    title: 'Технология ВАБ',
    desc: 'Флагманская технология клиники: удаление образований груди за 30 минут без скальпеля, швов и наркоза. Прокол 2 мм.',
  },
  {
    icon: Users,
    iconBg: 'icon-circle-peach',
    title: 'Эксперты с опытом 15+ лет',
    desc: 'Каждый врач клиники прошёл обучение в ведущих медицинских центрах России и Европы. Средний стаж - более 15 лет.',
  },
  {
    icon: Clock,
    iconBg: 'icon-circle-lavender',
    title: 'Результаты за 24 часа',
    desc: 'Анализы и заключения поступают в личный кабинет в течение суток. Доктор остаётся на связи в мессенджере.',
  },
  {
    icon: Heart,
    iconBg: 'icon-circle-mint',
    title: 'Бережный подход',
    desc: 'Атмосфера пятизвёздочного отеля, а не больницы. Осмотры без дискомфорта, объяснения без медицинского жаргона.',
  },
  {
    icon: Award,
    iconBg: 'icon-circle-peach',
    title: 'Прозрачное ценообразование',
    desc: 'Цена, названная на консультации - финальная. Никаких доплат в день процедуры, никаких скрытых расходов.',
  },
]

const EQUIPMENT = [
  {
    icon: '🔬',
    title: 'Система XISHAN (Сишань)',
    desc: 'Роботизированная установка для вакуумной аспирационной биопсии под контролем УЗИ. Позволяет удалять образования до 3 см через прокол 2 мм.',
    tag: 'Флагман',
    tagColor: '#3AB89A',
    tagBg: 'rgba(78,200,168,0.12)',
  },
  {
    icon: '📡',
    title: 'УЗИ экспертного класса',
    desc: 'Ультразвуковые аппараты с разрешением, позволяющим выявлять образования от 2 мм. Все врачи клиники владеют УЗИ-диагностикой.',
    tag: 'Диагностика',
    tagColor: '#4880B0',
    tagBg: 'rgba(78,158,200,0.12)',
  },
  {
    icon: '🧪',
    title: 'Собственная лаборатория',
    desc: 'Гистологические и цитологические исследования выполняются в партнёрских лабораториях с сертификацией ISO. Результаты - в течение 24 часов.',
    tag: 'Лаборатория',
    tagColor: '#7060A8',
    tagBg: 'rgba(155,142,200,0.12)',
  },
  {
    icon: '💻',
    title: 'Цифровой личный кабинет',
    desc: 'Все результаты, снимки и протоколы хранятся в зашифрованном облаке. Доступ 24/7 из любой точки мира, возможность поделиться с другим специалистом.',
    tag: 'Цифровой',
    tagColor: '#D07858',
    tagBg: 'rgba(240,168,136,0.12)',
  },
]

export function About() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-12">
        <div className="blob-mint absolute -top-32 -left-32 w-96 h-96 opacity-20 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="blob-peach absolute -bottom-24 -right-24 w-80 h-80 opacity-15 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(78,200,168,0.12)', color: '#3AB89A' }}>
              <Heart size={12} />
              Санкт-Петербург
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              О клинике{' '}
              <span className="text-clay-mint">Одинцова</span>
            </h1>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl text-lg">
              Экспертная медицина в маммологии, гинекологии, эндокринологии и неврологии. Мы помогаем принимать осознанные решения о здоровье.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                Записаться на приём
                <ArrowRight size={16} />
              </a>
              <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                <Phone size={16} />
                Позвонить
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ПРИВЕТСТВЕННОЕ СЛОВО ГЛАВНОГО ВРАЧА */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-6">
            Приветственное слово главного врача
          </h2>
          <div className="clay clay-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-start">
              <div className={`${RING_COLOR_MAP.mint} flex-shrink-0`}>
                <img
                  src="/images/doctors/odintsov.webp"
                  alt="Владислав Александрович Одинцов"
                  className="w-48 h-48 md:w-64 md:h-64 rounded-full object-cover"
                  loading="lazy"
                  width="256"
                  height="256"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-5 text-clay-muted leading-relaxed">
              <p>
                Добро пожаловать в мир «Клиники Одинцова», где забота о здоровье становится искусством. Здесь я являюсь основателем и главным врачом, а также доктором медицинских наук, маммологом-онкологом, хирургом, врачом УЗД. Вместе с моей командой мы предлагаем вам не только профессиональную медицинскую помощь, но и создаём уникальное пространство, где сливаются наука и искусство.
              </p>
              <p>
                В объединении маммологов, гинекологов, эндокринологов, хирургов, онкологов и врачей лучевой диагностики кроется успех в борьбе с заболеваниями молочных желез. Это коллективное усилие, направленное на сохранение и восстановление здоровья женского тела. Ведь здоровая грудь не только является воплощением гармонии женственности, но и символом социального благополучия.
              </p>
              <p>
                В «Клинике Одинцова» мы придерживаемся принципа, что молочные железы нельзя рассматривать в отрыве от репродуктивной и эндокринной систем женщины. Именно поэтому мы успешно справляемся с проблемами, связанными с молочными железами, объединяя усилия всех наших специалистов.
              </p>
              <p>
                Моя команда состоит из высококвалифицированных специалистов, поддерживающих мою философию искусства и заботы о здоровье. Вместе мы стремимся к оптимальным результатам для каждого пациента. Мы верим, что каждая встреча с нами должна быть уникальной и незабываемой.
              </p>
              <p>
                Если вы ищете место, где современное диагностическое оборудование сочетается с профессионализмом докторов и дружелюбной атмосферой, то «Клиника Одинцова» — идеальное место для вас. Наша эстетика искусства пронизывает каждый уголок клиники, создавая уютную и расслабляющую обстановку для наших пациентов. Каждая деталь внимательно продумана, чтобы отразить наше уважение к красоте и заботе о здоровье.
              </p>
              <p>
                В клинике «Одинцова» каждый пациент находит не только профессиональную медицинскую помощь, но и поддержку на каждом этапе своего пути к здоровью. Наша команда помогает людям почувствовать себя уверенно и спокойно, преодолевая страх и неопределённость. Мы сопровождаем наших пациентов на каждом шагу, показывая им, что забота об их здоровье — это искусство, которое мы с радостью освоили.
              </p>
              <p>
                Снова приглашаю Вас в мир «Клиники Одинцова», где забота о здоровье становится искусством, а забота о вас — нашей привилегией. Мы рады привнести красоту и эстетику в ваш путь к здоровью и помочь вам насладиться каждым моментом этого пути. Доверьтесь нам и откройте новое измерение заботы о вашем здоровье.
              </p>
              <p className="font-bold text-clay-dark">
                Будьте здоровы!<br />
                Владислав Александрович Одинцов
              </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              { val: '1/3', color: 'text-clay-mint', card: 'clay-card-soft-mint', label: 'пациентов избегают операции', desc: 'Благодаря технологии ВАБ' },
              { val: '15+', color: 'text-clay-peach', card: 'clay-card-soft-peach', label: 'лет стаж врачей', desc: 'Средний опыт специалистов' },
              { val: '4', color: 'text-clay-blue', card: 'clay-card-soft-blue', label: 'направления медицины', desc: 'Маммология, гинекология, эндокринология, неврология' },
              { val: '5.0', color: 'text-clay-lavender', card: 'clay-card-soft-lavender', label: 'средняя оценка', desc: 'По отзывам на Яндексе и ПроДокторов' },
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

      {/* HISTORY / MISSION */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-6">
            История и миссия
          </h2>
          <div className="space-y-5 text-clay-muted leading-relaxed max-w-3xl">
            <p>
              Клиника Одинцова основана в 2014 году в Санкт-Петербурге командой врачей, объединённых общей идеей: медицина должна быть честной, доступной и ориентированной на пациента. Мы начинали как небольшой маммологический центр в Приморском районе и за несколько лет выросли в многопрофильную клинику экспертного уровня.
            </p>
            <p>
              Наша миссия — помочь каждому пациенту принять осознанное решение о своём здоровье. Мы не назначаем лишних анализов, не направляем на операцию там, где можно обойтись малоинвазивной процедурой, и всегда объясняем, почему выбрали именно этот метод лечения.
            </p>
            <p>
              Флагманская технология клиники — вакуумная аспирационная биопсия (ВАБ). Благодаря ей каждый третий пациент, пришедший с направлением на полостную операцию из другой клиники, решает проблему за 30 минут без скальпеля и швов. Это не просто медицинская процедура — это другой стандарт помощи.
            </p>
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-6">
            Руководство
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="clay clay-card p-6">
              <h3 className="font-bold text-clay-dark text-lg mb-1">Владислав Александрович Одинцов</h3>
              <p className="text-clay-muted text-sm mb-4">Основатель и главный врач</p>
              <div className="space-y-2 text-sm text-clay-muted">
                <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-2 hover:text-clay-mint transition-colors">
                  <Phone size={14} />
                  {PHONE_DISPLAY}
                </a>
              </div>
            </div>
            <div className="clay clay-card p-6">
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
            <div className="clay clay-card p-6">
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

      {/* DOCUMENTS */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-6">
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
                <li>Министерство здравоохранения РФ</li>
                <li>Федеральная служба по надзору в сфере здравоохранения</li>
                <li>Федеральная служба по надзору в сфере защиты прав потребителей и благополучия человека</li>
                <li>Территориальный фонд обязательного медицинского страхования</li>
                <li>Территориальный орган Росздравнадзора по Санкт-Петербургу и Ленинградской области</li>
                <li>Управление Роспотребнадзора по городу Санкт-Петербургу</li>
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

      {/* ADVANTAGES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">
              Наши преимущества
            </h2>
            <p className="text-clay-muted max-w-xl mx-auto">
              Шесть причин, почему пациенты выбирают Клинику Одинцова
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ADVANTAGES.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="clay clay-card p-6 flex flex-col gap-4">
                  <div className={item.iconBg}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-clay-dark mb-2">{item.title}</h3>
                    <p className="text-clay-muted text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* EQUIPMENT */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">
              Оборудование и технологии
            </h2>
            <p className="text-clay-muted max-w-xl mx-auto">
              Современная база для точной диагностики и малоинвазивного лечения
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {EQUIPMENT.map((item) => (
              <div key={item.title} className="clay clay-card p-6 flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: item.tagBg }}
                >
                  {item.icon}
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
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-mint p-6 md:p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/10 translate-y-1/2" />
            <div className="relative z-10">
              <Star size={40} className="text-white/80 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Готовы записаться?
              </h2>
              <p className="text-white/90 text-lg mb-5 max-w-xl mx-auto">
                Позвоните нам или оставьте заявку - ответим в течение 15 минут и подберём удобное время.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="/second-opinion" className="clay btn-clay-white gap-2">
                  Записаться онлайн
                  <ArrowRight size={16} />
                </a>
                <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-colors">
                  <Phone size={16} />
                  Позвонить
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
