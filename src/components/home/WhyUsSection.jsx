import { Shield, Zap, Clock, Heart } from 'lucide-react'
import { WHY_ITEMS } from '../../lib/clinic-info.js'

const HOME_WHY_ITEMS = WHY_ITEMS.map((item) => {
  if (item.title === 'Без боли и стресса') {
    return { ...item, title: 'Уважительный приём', desc: 'Спокойная коммуникация, аккуратный осмотр и понятные объяснения на каждом этапе.' }
  }
  if (item.title === 'Сервис без ожидания') {
    return { ...item, title: 'Понятные сроки', desc: 'Сообщаем, когда ждать результаты и какой шаг будет следующим.' }
  }
  if (item.title === 'Высокие технологии') {
    return { ...item, title: 'Технологии по делу', desc: 'Используем оборудование там, где оно действительно помогает в диагностике и лечении.' }
  }
  return { ...item, desc: 'Назначаем только обоснованные обследования и сохраняем спокойный, уважительный тон приёма.' }
})

const WHY_STATS = [
  { val: '30 мин', color: 'text-clay-mint', card: 'clay-card-soft-mint', label: 'типичная длительность ВАБ', desc: 'Процедура проходит амбулаторно, а дальнейшие рекомендации команда объясняет сразу после неё.' },
  { val: '9', color: 'text-clay-peach', card: 'clay-card-soft-peach', label: 'врачей в команде клиники', desc: 'Маммологи, гинекологи, эндокринологи и нутрициологи работают в одном маршруте пациента.' },
  { val: '2', color: 'text-clay-blue', card: 'clay-card-soft-blue', label: 'канала для связи с клиникой', desc: 'Сообщаем о готовности документов и подсказываем следующий шаг по телефону или в Telegram.' },
]

const WHY_ICONS = { Shield, Zap, Clock, Heart }

export function WhyUsSection() {
  return (
    <section className="section bg-[color:var(--surface-accent)] border-y border-[color:var(--border-color)]">
      <div className="container-clay">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-4">
              Почему выбирают Клинику Одинцова
            </h2>
            <p className="text-clay-muted leading-relaxed mb-8">
              Мы помогаем принимать медицинские решения спокойно: по показаниям, без давления и с понятным следующим шагом.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HOME_WHY_ITEMS.map((item) => {
                const Icon = WHY_ICONS[item.iconName]
                return (
                  <div key={item.title} className="clay clay-card card-interactive p-4 flex items-start gap-3">
                    <div className={item.bg}><Icon size={20} className="text-white" /></div>
                    <div>
                      <h3 className="font-bold text-clay-dark mb-1">{item.title}</h3>
                      <p className="text-clay-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="space-y-4">
            {WHY_STATS.map((s) => (
              <div key={s.val} className={`clay ${s.card} p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`font-serif font-light text-4xl sm:text-5xl text-clay-dark leading-none`}>{s.val}</div>
                  <div>
                    <p className="font-bold text-clay-dark mb-1">{s.label}</p>
                    <p className="text-clay-muted leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
