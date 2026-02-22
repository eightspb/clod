import { ArrowRight, CheckCircle, Clock, Shield, Zap, AlertCircle, MessageCircle, Star } from 'lucide-react'
import { WHATSAPP_URL, PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { FaqSection } from '../FaqSection.jsx'
import { DOCTORS } from '../../lib/doctors-data.js'
import { DoctorCard } from '../DoctorCard.jsx'

const VAB_DOCTORS = DOCTORS.filter((d) =>
  /онколог/i.test(d.specialization)
)

const STEPS = [
  {
    num: '01',
    title: 'Консультация и УЗИ',
    desc: 'Врач осматривает молочные железы, проводит УЗИ и определяет точные размеры и расположение образования. Принимается решение о целесообразности ВАБ.',
  },
  {
    num: '02',
    title: 'Местная анестезия',
    desc: 'Область вмешательства обезболивается местным анестетиком. Общий наркоз не требуется. Вы остаётесь в сознании и чувствуете себя комфортно.',
  },
  {
    num: '03',
    title: 'Прокол 2 мм',
    desc: 'Через микропрокол размером 2 мм вводится игла аппарата EnCor Enspire. Разрезов, скальпеля и швов нет. Рубца не остаётся.',
  },
  {
    num: '04',
    title: 'Удаление под контролем УЗИ',
    desc: 'Под постоянным контролем УЗИ врач точно наводит устройство на образование. Вакуумный механизм аспирирует ткань — образование удаляется полностью.',
  },
  {
    num: '05',
    title: 'Гистология',
    desc: 'Удалённый материал отправляется на гистологическое исследование. Результат готов через 7–10 дней — вы точно знаете, что было удалено.',
  },
  {
    num: '06',
    title: 'Выход домой',
    desc: 'Процедура занимает 30–40 минут. После 1–2 часов наблюдения вы уходите домой. Больничный лист не нужен. Возврат к работе — на следующий день.',
  },
]

const COMPARE_ROWS = [
  { param: 'Разрез', vab: 'Прокол 2 мм', op: 'Разрез 3–5 см' },
  { param: 'Наркоз', vab: 'Местная анестезия', op: 'Общий или спинальной' },
  { param: 'Длительность', vab: '30–40 минут', op: '60–90 минут' },
  { param: 'Госпитализация', vab: 'Не нужна', op: '1–3 дня в стационаре' },
  { param: 'Рубец', vab: 'Нет (след 2 мм)', op: 'Шрам 3–5 см' },
  { param: 'Восстановление', vab: '1–2 дня', op: '2–4 недели' },
  { param: 'Гистология', vab: 'Включена', op: 'Включена' },
  { param: 'Форма груди', vab: 'Не меняется', op: 'Возможна деформация' },
]

const INDICATIONS = [
  'Фиброаденома молочной железы',
  'Киста молочной железы',
  'Внутрипротоковая папиллома',
  'Липома молочной железы',
  'Образования до 3 см по данным УЗИ',
  'Подозрительные узлы (BI-RADS 4–5) для биопсии',
]

const FAQ_ITEMS = [
  {
    question: 'Что такое ВАБ?',
    answer: 'ВАБ (вакуумная аспирационная биопсия) — малоинвазивная процедура удаления доброкачественных образований молочной железы через прокол 2 мм без разреза и общего наркоза. Устройство EnCor Enspire (США) под контролем УЗИ точно удаляет образование, одновременно забирая материал для гистологии.',
  },
  {
    question: 'Больно ли делать ВАБ?',
    answer: 'Нет. Процедура проводится под местной анестезией. Вы можете ощущать лёгкое давление или вибрацию, но боли нет. Большинство пациенток оценивают дискомфорт на 1–2 из 10.',
  },
  {
    question: 'Сколько стоит ВАБ в Санкт-Петербурге?',
    answer: 'Стоимость ВАБ в Клинике Одинцова — от 35 000 ₽ «под ключ». В цену включены: консультация, УЗИ, анестезия, сама процедура и гистологическое исследование. Скрытых доплат нет.',
  },
  {
    question: 'Нужна ли госпитализация?',
    answer: 'Нет. ВАБ — амбулаторная процедура. После 1–2 часов наблюдения вы уходите домой. Больничный лист не нужен, на следующий день можно вернуться к работе.',
  },
  {
    question: 'Останется ли шрам?',
    answer: 'Нет. Прокол размером 2 мм полностью заживает за 6–8 недель без видимого следа. Форма и объём груди не меняются.',
  },
  {
    question: 'Можно ли убрать фиброаденому без операции?',
    answer: 'Да. ВАБ — это и есть альтернатива операции. Вместо разреза скальпелем — прокол 2 мм, вместо стационара — амбулатория, вместо общего наркоза — местная анестезия. Каждый третий пациент, которому рекомендовали операцию, после консультации в нашей клинике избегает её с помощью ВАБ.',
  },
  {
    question: 'Нужно ли направление от врача?',
    answer: 'Нет, направление не нужно. Вы можете записаться напрямую. На первичной консультации врач проведёт УЗИ и определит, показана ли вам процедура ВАБ.',
  },
  {
    question: 'Что делать, если мне уже назначили операцию?',
    answer: 'Воспользуйтесь нашим бесплатным вторым мнением. Онколог-маммолог бесплатно изучит ваши снимки и заключения и скажет, возможна ли замена операции на ВАБ в вашем случае.',
  },
]

export function Vab() {
  return (
    <div className="container-clay pb-20">

      {/* Hero */}
      <section className="pt-8 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-clay-mint/20 text-clay-text rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Zap size={15} className="text-clay-teal" />
          Флагманская технология клиники
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-clay-text mb-5 speakable">
          ВАБ — вакуумная аспирационная биопсия<br className="hidden md:block" /> в Санкт-Петербурге
        </h1>
        <p className="text-lg text-clay-muted max-w-2xl mx-auto mb-8 speakable">
          Удаление фиброаденом, кист и других образований молочной железы через прокол 2 мм.
          Без скальпеля, без общего наркоза, без швов. Процедура 30–40 минут — и вы идёте домой.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-clay-primary inline-flex items-center gap-2"
          >
            <MessageCircle size={18} />
            Записаться на ВАБ
          </a>
          <a href="/second-opinion" className="btn-clay-secondary inline-flex items-center gap-2">
            Бесплатное второе мнение
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Ключевые факты */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { value: '30 мин', label: 'длительность процедуры' },
          { value: '2 мм', label: 'размер прокола' },
          { value: '1–2 дня', label: 'восстановление' },
          { value: '1/3', label: 'пациентов избегают операции' },
        ].map((stat) => (
          <div key={stat.label} className="clay-card text-center py-5 px-3">
            <div className="text-2xl md:text-3xl font-bold text-clay-teal mb-1">{stat.value}</div>
            <div className="text-xs text-clay-muted leading-tight">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Показания */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-clay-text mb-6">Когда показана процедура ВАБ</h2>
        <div className="clay-card p-6 md:p-8">
          <ul className="grid sm:grid-cols-2 gap-3">
            {INDICATIONS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle size={18} className="text-clay-teal shrink-0 mt-0.5" />
                <span className="text-clay-text">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Как проходит */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-clay-text mb-2">Как проходит процедура ВАБ</h2>
        <p className="text-clay-muted mb-8">Пошагово — от консультации до выхода домой</p>
        <div className="grid md:grid-cols-2 gap-4">
          {STEPS.map((step) => (
            <div key={step.num} className="clay-card p-5 flex gap-4">
              <div className="num-badge shrink-0">{step.num}</div>
              <div>
                <div className="font-semibold text-clay-text mb-1">{step.title}</div>
                <div className="text-sm text-clay-muted leading-relaxed">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Оборудование */}
      <section className="mb-16">
        <div className="clay-card-mint p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="icon-circle-mint shrink-0">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Оборудование EnCor Enspire (США)</h2>
              <p className="text-white/85 leading-relaxed mb-4">
                Клиника Одинцова использует систему EnCor Enspire производства BD (Becton, Dickinson and Company, США) —
                одно из самых передовых устройств для вакуумной аспирационной биопсии в мире.
                Роботизированный механизм обеспечивает точное и полное удаление образований до 3 см
                под постоянным контролем УЗИ.
              </p>
              <ul className="space-y-2">
                {[
                  'Удаление образований до 3 см за одну процедуру',
                  'Постоянный УЗИ-контроль в реальном времени',
                  'Автоматическая аспирация — минимальный дискомфорт',
                  'Одновременный забор материала для гистологии',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                    <Star size={14} className="text-white shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ВАБ vs Операция */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-clay-text mb-2">ВАБ или операция: в чём разница</h2>
        <p className="text-clay-muted mb-6">
          В большинстве случаев ВАБ полностью заменяет традиционную секторальную резекцию молочной железы
        </p>
        <div className="overflow-x-auto">
          <table className="w-full clay-card text-sm">
            <thead>
              <tr className="border-b border-clay-border">
                <th className="text-left p-4 text-clay-muted font-medium">Параметр</th>
                <th className="text-left p-4 text-clay-teal font-semibold">ВАБ (наш метод)</th>
                <th className="text-left p-4 text-clay-muted font-medium">Традиционная операция</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr key={row.param} className={i % 2 === 0 ? 'bg-clay-bg/40' : ''}>
                  <td className="p-4 text-clay-muted">{row.param}</td>
                  <td className="p-4 font-medium text-clay-text">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-clay-teal shrink-0" />
                      {row.vab}
                    </span>
                  </td>
                  <td className="p-4 text-clay-muted">{row.op}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Цены */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-clay-text mb-2">Стоимость ВАБ в Санкт-Петербурге</h2>
        <p className="text-clay-muted mb-6">Фиксированные цены без скрытых доплат</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="clay-card p-6">
            <div className="text-sm text-clay-muted mb-1">ВАБ под ключ</div>
            <div className="text-3xl font-bold text-clay-teal mb-2">от 35 000 ₽</div>
            <ul className="space-y-1.5 text-sm text-clay-muted">
              {['Консультация онколога-маммолога', 'УЗИ молочных желёз', 'Местная анестезия', 'Процедура ВАБ EnCor Enspire', 'Гистологическое исследование'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle size={13} className="text-clay-teal shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="clay-card-peach p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-white" />
                <span className="font-semibold text-white">Бесплатное второе мнение</span>
              </div>
              <p className="text-sm text-white/85 mb-4">
                Уже получили заключение и вам рекомендовали операцию? Наш онколог-маммолог
                бесплатно изучит ваши снимки и скажет, возможна ли замена на ВАБ.
              </p>
            </div>
            <a href="/second-opinion" className="btn-clay-white text-sm inline-flex items-center gap-2">
              Получить второе мнение
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <p className="text-xs text-clay-muted mt-3">
          Точная стоимость определяется на консультации в зависимости от размера и количества образований.
          Принимаем ДМС: Ренессанс, АльфаСтрахование, ВСК, РЕСО-Гарантия.
        </p>
      </section>

      {/* Наши врачи */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-clay-text mb-2">Доктора, выполняющие ВАБ</h2>
        <p className="text-clay-muted mb-6">Онкологи-маммологи с опытом от 12 лет</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VAB_DOCTORS.map((doctor) => (
            <DoctorCard key={doctor.slug} doctor={doctor} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <FaqSection items={FAQ_ITEMS} title="Частые вопросы о ВАБ" />

      {/* CTA */}
      <section className="clay-card-mint p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Запишитесь на консультацию</h2>
        <p className="text-white/85 mb-6 max-w-lg mx-auto">
          Ответим в WhatsApp за 2 минуты. Запись день в день.
          Санкт-Петербург, пр. Богатырский 22 к.1 (м. Комендантский проспект)
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-clay-primary inline-flex items-center gap-2"
          >
            <MessageCircle size={18} />
            Написать в WhatsApp
          </a>
          <a href={`tel:${PHONE_NUMBER}`} className="btn-clay-secondary inline-flex items-center gap-2">
            <Clock size={18} />
            {PHONE_DISPLAY}
          </a>
        </div>
      </section>
    </div>
  )
}
