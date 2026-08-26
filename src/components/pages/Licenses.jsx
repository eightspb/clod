import { Shield, FileText, Award, CheckCircle, ArrowRight } from 'lucide-react'

const LICENSE_ITEMS = [
  {
    title: 'Лицензия на осуществление медицинской деятельности',
    number: 'ЛО-78-01-011234',
    issuer: 'Комитет по здравоохранению Санкт-Петербурга',
    date: '2020',
    color: 'clay-card-soft-mint',
    iconColor: 'icon-circle-mint',
  },
]

const SPECIALTIES = [
  'Онкология',
  'Маммология',
  'Гинекология',
  'Акушерство и гинекология',
  'Эндокринология',
  'Неврология',
  'Хирургия',
  'Ультразвуковая диагностика',
]

export function Licenses() {
  return (
    <main className="grain-overlay">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
              <Shield size={14} aria-hidden="true" />
              Официальные документы
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5 speakable">
              Лицензии и сертификаты клиники
            </h1>
            <p className="text-lg text-clay-muted leading-relaxed max-w-3xl">
              Клиника Одинцова работает на основании лицензии на осуществление медицинской деятельности,
              выданной Комитетом по здравоохранению Санкт-Петербурга. Все врачи клиники имеют действующие
              сертификаты и свидетельства об аккредитации по своим специальностям.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-5">Лицензия на медицинскую деятельность</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {LICENSE_ITEMS.map((item) => (
              <div key={item.number} className={`clay ${item.color} p-6 flex gap-4`}>
                <div className={`${item.iconColor} shrink-0`}>
                  <FileText size={22} className="text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-clay-dark mb-3">{item.title}</h3>
                  <dl className="grid gap-2 text-sm text-clay-muted">
                    <div className="grid gap-1 sm:grid-cols-[88px_1fr]">
                      <dt className="font-semibold text-clay-dark">Номер:</dt>
                      <dd>{item.number}</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[88px_1fr]">
                      <dt className="font-semibold text-clay-dark">Выдана:</dt>
                      <dd>{item.issuer}</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[88px_1fr]">
                      <dt className="font-semibold text-clay-dark">Год:</dt>
                      <dd>{item.date}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ))}
            <div className="clay clay-card flex min-h-48 flex-col items-center justify-center gap-3 border-2 border-dashed border-[color:var(--border-color-strong)] p-6 text-center">
              <Award size={32} className="text-clay-muted/60" aria-hidden="true" />
              <p className="text-clay-muted text-sm">
                Скан лицензии будет добавлен в ближайшее время
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="section bg-[color:var(--surface-accent)] border-y border-[color:var(--border-color)]">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-5">Лицензированные виды деятельности</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SPECIALTIES.map((spec) => (
              <div key={spec} className="clay clay-card p-4 flex items-center gap-3">
                <CheckCircle size={18} className="text-clay-mint shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-clay-dark">{spec}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Сертификаты и аккредитации врачей</h2>
                <p className="text-clay-muted leading-relaxed max-w-3xl">
                  Каждый врач клиники регулярно проходит повышение квалификации и подтверждает свою аккредитацию
                  в соответствии с требованиями Министерства здравоохранения РФ. Документы об образовании и
                  сертификаты специалистов доступны для ознакомления на странице каждого врача.
                </p>
              </div>
              <a href="/doctors" className="btn-clay-primary inline-flex items-center gap-2">
                Посмотреть врачей клиники
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <div className="clay cta-gradient-card p-6 md:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Есть вопросы о документах?</h2>
            <p className="text-clay-muted mb-6 max-w-lg mx-auto">
              Свяжитесь с нами - предоставим полный пакет документов по запросу.
            </p>
            <a href="/contacts" className="btn-clay-primary inline-flex items-center gap-2">
              Связаться с клиникой
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
