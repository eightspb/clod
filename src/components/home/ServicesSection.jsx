import { ChevronRight } from 'lucide-react'
import { FadeInSection } from '../FadeInSection.jsx'
import { SERVICES } from '../../lib/clinic-info.js'

const HOME_SERVICES = SERVICES.map((service) => {
  if (service.to === '/vab') {
    return { ...service, tag: 'Малоинвазивная процедура', desc: 'Вакуумная аспирационная биопсия под УЗ-контролем. Обсуждаем показания, объём вмешательства и наблюдение заранее.' }
  }
  if (service.to === '/gynecology') {
    return { ...service, tag: 'Приём по показаниям', desc: 'Бережный гинекологический приём с понятными объяснениями, без давления и лишних назначений.' }
  }
  if (service.to === '/endocrinology') {
    return { ...service, tag: 'Поэтапная диагностика', desc: 'Разбираем жалобы, анализы и динамику поэтапно. Без обещаний мгновенного результата.' }
  }
  if (service.to === '/nutrition') {
    return { ...service, desc: 'Помогаем выстроить питание с учётом анализов, жалоб и привычного ритма жизни.' }
  }
  if (service.to === '/mammology') {
    return { ...service, desc: 'Диагностика и лечение заболеваний молочной железы с понятным маршрутом пациента и опорой на показания.' }
  }
  return service
})

export function ServicesSection() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">Направления клиники</h2>
          <p className="text-clay-muted max-w-xl mx-auto">Понятный маршрут от первичного обращения до следующего шага без лишнего давления</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:auto-rows-[1fr] gap-5">
          {HOME_SERVICES.map((s, i) => (
            <FadeInSection key={s.to} staggerIndex={i} className="h-full">
            <a href={s.to} className="group block">
              <div className={`clay ${s.color} card-interactive p-6 h-full flex flex-col transition-transform duration-200 group-hover:-translate-y-1`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`${s.iconBg} text-2xl`}>
                      <span>{s.icon}</span>
                    </div>
                    <div>
                      {s.tag && <span className="stat-pill text-xs mb-1 block w-fit">{s.tag}</span>}
                      <h3 className="font-bold text-clay-dark text-lg leading-tight">{s.title}</h3>
                    </div>
                  </div>
                  <div className="clay clay-card px-3 py-1.5 text-center">
                    <p className="font-extrabold text-clay-mint-dark text-base leading-none">{s.stat}</p>
                    <p className="text-clay-muted text-xs">{s.statLabel}</p>
                  </div>
                </div>
                <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{s.desc}</p>
                <div className="flex items-center gap-1 text-clay-mint-dark text-sm font-semibold">
                  Подробнее <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            </a>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  )
}
