import { ArrowRight, CheckCircle, Clock, Shield, Zap, AlertCircle, MessageCircle, Star } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
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
    desc: 'Врач осматривает молочные железы, проводит УЗИ и определяет размеры и расположение образования. После этого обсуждается, подходит ли ВАБ в вашем случае.',
  },
  {
    num: '02',
    title: 'Местная анестезия',
    desc: 'Область вмешательства обезболивается местным анестетиком. Общий наркоз не требуется. Вы остаётесь в сознании и чувствуете себя комфортно.',
  },
  {
    num: '03',
    title: 'Прокол 2 мм',
    desc: 'Через микропрокол размером 2 мм вводится игла аппарата Xishan DK-B-MS. Вмешательство выполняется без разреза и швов.',
  },
  {
    num: '04',
    title: 'Удаление под контролем УЗИ',
    desc: 'Под постоянным контролем УЗИ врач точно наводит устройство на образование. Вакуумный механизм удаляет ткань поэтапно и позволяет отправить материал на исследование.',
  },
  {
    num: '05',
    title: 'Гистология',
    desc: 'Удалённый материал отправляется на гистологическое исследование. Результат готов через 7–10 дней - вы точно знаете, что было удалено.',
  },
  {
    num: '06',
    title: 'Выход домой',
    desc: 'Процедура занимает 30–40 минут. После 1–2 часов наблюдения вы уходите домой. Больничный лист не нужен. Возврат к работе - на следующий день.',
  },
]

const COMPARE_ROWS = [
  { param: 'Разрез', vab: 'Прокол 2 мм', op: 'Разрез 3–5 см' },
  { param: 'Наркоз', vab: 'Местная анестезия', op: 'Общий или спинальный' },
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

export const FAQ_ITEMS = [
  {
    question: 'Что такое ВАБ?',
    answer: 'ВАБ (вакуумная аспирационная биопсия) - малоинвазивная процедура удаления доброкачественных образований молочной железы через прокол 2 мм без разреза и общего наркоза. Устройство Xishan под контролем УЗИ точно удаляет образование, одновременно забирая материал для гистологии.',
  },
  {
    question: 'Больно ли делать ВАБ?',
    answer: 'Нет. Процедура проводится под местной анестезией. Вы можете ощущать лёгкое давление или вибрацию, но боли нет. Большинство пациенток оценивают дискомфорт на 1–2 из 10.',
  },
  {
    question: 'Сколько стоит ВАБ в Санкт-Петербурге?',
    answer: 'Базовая стоимость процедуры ВАБ в Клинике Одинцова — от 80 000 ₽. В неё входят консультация, УЗИ и сама процедура. Анестезия, гистологическое исследование, послеоперационное наблюдение и контрольный снимок обсуждаются и оплачиваются отдельно. Точную смету врач назовёт после консультации.',
  },
  {
    question: 'Нужна ли госпитализация?',
    answer: 'Нет. ВАБ - амбулаторная процедура. После 1–2 часов наблюдения вы уходите домой. Больничный лист не нужен, на следующий день можно вернуться к работе.',
  },
  {
    question: 'Останется ли шрам?',
    answer: 'Как правило, остаётся только малозаметный след от прокола 2 мм. Срок заживления зависит от индивидуальных особенностей, объёма вмешательства и рекомендаций врача.',
  },
  {
    question: 'Можно ли убрать фиброаденому с помощью ВАБ?',
    answer: 'Да. ВАБ — малоинвазивный способ удаления фиброаденом через прокол 2 мм. Вместо разреза скальпелем — амбулаторная процедура под местной анестезией, а итоговое решение о показаниях принимается после очной консультации и УЗИ.',
  },
  {
    question: 'Нужно ли направление от врача?',
    answer: 'Нет, направление не нужно. Вы можете записаться напрямую. На первичной консультации врач проведёт УЗИ и определит, показана ли вам процедура ВАБ.',
  },
  {
    question: 'Что делать, если мне уже назначили операцию?',
    answer: 'Вы можете получить бесплатное второе мнение. Онколог-маммолог изучит снимки и заключения и скажет, возможна ли в вашем случае альтернатива операции в формате ВАБ.',
  },
]

export function Vab() {
  return (
    <div className="container-clay pb-12">

      {/* Hero */}
      <section className="pt-6 pb-8">
        <div className="inline-flex items-center gap-2 bg-clay-mint/20 text-clay-text rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Zap size={15} className="text-clay-teal" />
          Основное направление клиники
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-clay-text mb-5 speakable">
          ВАБ — вакуумная аспирационная биопсия<br className="hidden md:block" /> в Санкт-Петербурге
        </h1>
        <p className="text-lg text-clay-muted max-w-2xl mb-4 speakable">
          Малоинвазивное удаление доброкачественных образований молочной железы через прокол 2 мм.
          Процедура обычно занимает 30–40 минут и проводится амбулаторно по показаниям.
        </p>
        <p className="text-sm text-clay-muted max-w-2xl mb-8">
          Перед процедурой врач оценивает показания, проводит УЗИ и подробно обсуждает ожидаемый результат, цену и дальнейший план наблюдения.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-booking-btn="true"
            className="btn-clay-primary inline-flex items-center gap-2"
          >
            <MessageCircle size={18} />
            Записаться на ВАБ
          </button>
          <a href="/second-opinion" className="btn-clay-secondary inline-flex items-center gap-2">
            Бесплатное второе мнение
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Счётчики клиники */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { value: '2 мм', label: 'размер прокола' },
          { value: '30–40 мин', label: 'длительность процедуры' },
          { value: '1–2 дня', label: 'восстановление' },
          { value: 'УЗИ', label: 'контроль процедуры в реальном времени' },
        ].map((stat) => (
          <div key={stat.label} className="clay-card text-center py-5 px-3">
            <div className="text-2xl md:text-3xl font-bold text-clay-teal mb-1">{stat.value}</div>
            <div className="text-xs text-clay-muted leading-tight">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Блок достижений клиники */}
      <section className="clay-card-soft-mint clay-card p-6 md:p-8 mb-10">
        <h2 className="text-xl font-bold text-clay-text mb-5">Что важно знать о процедуре</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-clay-teal mb-2">2 мм</div>
            <p className="text-sm text-clay-muted leading-tight">микропрокол вместо хирургического разреза</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-extrabold text-clay-teal mb-2">30–40 мин</div>
            <p className="text-sm text-clay-muted leading-tight">средняя длительность процедуры</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-extrabold text-clay-teal mb-2">7–10 дней</div>
            <p className="text-sm text-clay-muted leading-tight">срок готовности гистологии после удаления</p>
          </div>
        </div>
      </section>

      {/* Показания */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-clay-text mb-5">Когда показана процедура ВАБ</h2>
        <div className="clay-card p-6 md:p-8">
          <ul className="grid sm:grid-cols-2 gap-3">
            {INDICATIONS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle size={18} className="text-clay-mint shrink-0 mt-0.5" />
                <span className="text-clay-text">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Как проходит */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-clay-text mb-2">Как проходит процедура ВАБ</h2>
        <p className="text-clay-muted mb-5">Пошагово - от консультации до выхода домой</p>
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
      <section className="mb-10">
        <div className="clay-card-mint p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="icon-circle-mint shrink-0">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-clay-dark mb-2">Оборудование Xishan DK-B-MS (Сишань)</h2>
              <p className="text-clay-text leading-relaxed mb-4">
                Клиника Одинцова использует систему Xishan DK-B-MS производства Xishan (Сишань)
                для проведения ВАБ под постоянным контролем УЗИ. Решение о применении метода принимается врачом после очной оценки.
              </p>
              <ul className="space-y-2">
                {[
                  'Удаление образований до 3 см по показаниям',
                  'Постоянный УЗИ-контроль в реальном времени',
                  'Автоматическая аспирация поэтапно',
                  'Одновременный забор материала для гистологии',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 rounded-xl bg-white/55 border border-white/70 px-3 py-2 text-sm text-clay-dark">
                    <Star size={14} className="text-clay-mint shrink-0" />
                    <span className="font-medium">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ВАБ vs Операция */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-clay-text mb-2">ВАБ или операция: в чём разница</h2>
        <p className="text-clay-muted mb-6">
          Во многих случаях ВАБ позволяет избежать более объемной операции, если по результатам осмотра и диагностики метод подходит
        </p>
        <div className="overflow-x-auto">
          <table className="w-full clay-card text-sm">
            <thead>
              <tr className="border-b border-clay-border">
                <th className="text-left p-4 text-clay-muted font-medium">Параметр</th>
                <th className="text-left p-4 text-clay-teal font-semibold">ВАБ</th>
                <th className="text-left p-4 text-clay-muted font-medium">Операция</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr key={row.param} className={i % 2 === 0 ? 'bg-clay-bg/40' : ''}>
                  <td className="p-4 text-clay-muted">{row.param}</td>
                  <td className="p-4 font-medium text-clay-text">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-clay-mint shrink-0" />
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
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-clay-text mb-2">Стоимость ВАБ в Санкт-Петербурге</h2>
        <p className="text-clay-muted mb-6">Базовая стоимость и дополнительные этапы разделены заранее, без скрытых формулировок</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="clay-card p-6">
            <div className="text-sm font-semibold text-clay-text mb-1">Базовая стоимость процедуры ВАБ</div>
            <div className="text-3xl font-bold text-clay-teal mb-4">от 80 000 ₽</div>
            <ul className="space-y-1.5 text-sm text-clay-muted">
              {['Консультация онколога-маммолога', 'УЗИ молочных желёз', 'Сама процедура ВАБ'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle size={13} className="text-clay-mint shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="clay-card p-6">
            <div className="text-sm font-semibold text-clay-text mb-3">Оплачивается отдельно</div>
            <ul className="space-y-2 text-sm">
              {[
                { name: 'Местная анестезия', price: 'отдельно' },
                { name: 'Гистологическое исследование', price: 'отдельно' },
                { name: 'Послеоперационное наблюдение', price: 'отдельно' },
                { name: 'Контрольный снимок после процедуры', price: 'отдельно' },
              ].map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-2">
                  <span className="text-clay-muted">{item.name}</span>
                  <span className="text-clay-teal font-medium text-xs whitespace-nowrap">{item.price}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-clay-muted mt-3">Точную смету врач назовёт после очной консультации и УЗИ</p>
          </div>
        </div>
        <div className="clay-card-peach p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-clay-peach" />
              <span className="font-semibold text-clay-dark">Бесплатное второе мнение</span>
            </div>
            <p className="text-sm text-clay-text">
              Уже получили заключение и вам рекомендовали операцию? Наш онколог-маммолог
              бесплатно изучит ваши снимки и скажет, есть ли в вашем случае более щадящий вариант.
            </p>
          </div>
          <a href="/second-opinion" className="btn-clay-white text-sm inline-flex items-center gap-2 shrink-0">
            Получить второе мнение
            <ArrowRight size={16} />
          </a>
        </div>
        <p className="text-xs text-clay-muted mt-3">
          Принимаем ДМС: Ренессанс, АльфаСтрахование, ВСК, РЕСО-Гарантия.
        </p>
      </section>

      {/* Наши врачи */}
      <section className="mb-10">
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
        <h2 className="text-2xl font-bold text-clay-dark mb-3">Запишитесь на консультацию</h2>
        <p className="text-clay-text mb-6 max-w-lg mx-auto">
          Санкт-Петербург, пр. Богатырский 22 к.1, Приморский район, рядом с м. Комендантский проспект и м. Старая Деревня.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            data-booking-btn="true"
            className="btn-clay-primary inline-flex items-center gap-2"
          >
            <MessageCircle size={18} />
            Записаться онлайн
          </button>
          <a href={`tel:${PHONE_NUMBER}`} className="btn-clay-white inline-flex items-center gap-2">
            <Clock size={18} />
            {PHONE_DISPLAY}
          </a>
        </div>
      </section>
    </div>
  )
}
