import { Briefcase, Mail, Phone, Users, Heart, GraduationCap } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'

const HR_EMAIL = 'dir@odintsovclinic.ru'

const VALUES = [
  {
    icon: Users,
    iconBg: 'icon-circle-mint',
    title: 'Командная работа',
    desc: 'Маммологи, гинекологи, эндокринологи и нутрициологи ведут пациента вместе, а не по очереди.',
  },
  {
    icon: GraduationCap,
    iconBg: 'icon-circle-blue',
    title: 'Обучение и практика',
    desc: 'Врачи клиники обучают коллег методике ВАБ и регулярно проходят повышение квалификации.',
  },
  {
    icon: Heart,
    iconBg: 'icon-circle-peach',
    title: 'Уважение к пациенту и врачу',
    desc: 'Спокойный приём без давления, понятный маршрут и достаточное время на консультацию.',
  },
]

export function Vacancies() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
              <Briefcase size={14} aria-hidden="true" />
              Работа в клинике
            </div>
            <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">Вакансии</h1>
            <p className="text-lg text-clay-muted leading-relaxed max-w-2xl">
              Сейчас открытых вакансий нет. Мы всегда рады познакомиться с врачами и администраторами, которым близок наш подход, поэтому резюме принимаем постоянно и возвращаемся к нему, когда появляется подходящая позиция.
            </p>
          </div>
        </div>
      </section>
      <section className="section pt-4">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">Кого мы ищем</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {VALUES.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="clay clay-card p-6 flex flex-col gap-4 h-full">
                  <div className={item.iconBg}>
                    <Icon size={20} className="text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-clay-dark mb-2">{item.title}</h3>
                    <p className="text-clay-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <div className="clay cta-gradient-card p-6 md:p-8">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Отправить резюме</h2>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Пришлите резюме с указанием специальности, стажа и удобного формата работы. Персональные данные из резюме используются только для рассмотрения кандидатуры и не передаются третьим лицам.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={`mailto:${HR_EMAIL}?subject=Резюме`} className="clay btn-clay-primary inline-flex items-center gap-2">
                <Mail size={16} aria-hidden="true" />
                {HR_EMAIL}
              </a>
              <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary inline-flex items-center gap-2">
                <Phone size={16} aria-hidden="true" />
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
