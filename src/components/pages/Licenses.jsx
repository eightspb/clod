import { Shield, FileText, Award, CheckCircle } from 'lucide-react'

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
    <div className="container-clay pb-12">

      {/* Hero */}
      <section className="pt-6 pb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-clay-mint/20 text-clay-text rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Shield size={15} className="text-clay-teal" />
            Официальные документы
          </div>
          <h1 className="text-3xl md:text-4xl heading-serif text-clay-dark mb-5 speakable">
            Лицензии и сертификаты клиники
          </h1>
          <p className="text-lg text-clay-muted leading-relaxed">
            Клиника Одинцова работает на основании лицензии на осуществление медицинской деятельности,
            выданной Комитетом по здравоохранению Санкт-Петербурга. Все врачи клиники имеют действующие
            сертификаты и свидетельства об аккредитации по своим специальностям.
          </p>
        </div>
      </section>

      {/* Лицензии */}
      <section className="mb-10">
        <h2 className="text-2xl heading-serif text-clay-dark mb-5">Лицензия на медицинскую деятельность</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {LICENSE_ITEMS.map((item) => (
            <div key={item.number} className={`clay-card ${item.color} p-6 flex gap-4`}>
              <div className={`${item.iconColor} shrink-0`}>
                <FileText size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-clay-text mb-2">{item.title}</h3>
                <dl className="space-y-1 text-sm text-clay-muted">
                  <div className="flex gap-2">
                    <dt className="font-medium text-clay-text">Номер:</dt>
                    <dd>{item.number}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium text-clay-text">Выдана:</dt>
                    <dd>{item.issuer}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium text-clay-text">Год:</dt>
                    <dd>{item.date}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ))}

          {/* Placeholder для скана */}
          <div className="clay-card p-6 flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-clay-border min-h-48">
            <Award size={32} className="text-clay-muted/50" />
            <p className="text-clay-muted text-sm">
              Скан лицензии будет добавлен в ближайшее время
            </p>
          </div>
        </div>
      </section>

      {/* Специальности */}
      <section className="mb-10">
        <h2 className="text-2xl heading-serif text-clay-dark mb-5">Лицензированные виды деятельности</h2>
        <div className="clay-card p-6 md:p-8">
          <ul className="grid sm:grid-cols-2 gap-3">
            {SPECIALTIES.map((spec) => (
              <li key={spec} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-clay-teal shrink-0" />
                <span className="text-clay-text">{spec}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Сертификаты врачей */}
      <section className="mb-10">
        <h2 className="text-2xl heading-serif text-clay-dark mb-4">Сертификаты и аккредитации врачей</h2>
        <p className="text-clay-muted leading-relaxed mb-6">
          Каждый врач клиники регулярно проходит повышение квалификации и подтверждает свою аккредитацию
          в соответствии с требованиями Министерства здравоохранения РФ. Документы об образовании и
          сертификаты специалистов доступны для ознакомления на странице каждого врача.
        </p>
        <a href="/doctors" className="btn-clay-primary inline-flex items-center gap-2">
          Посмотреть врачей клиники
        </a>
      </section>

      {/* CTA */}
      <section className="clay-card-soft-mint clay-card p-8 text-center">
        <h2 className="text-xl heading-serif text-clay-dark mb-3">Есть вопросы о документах?</h2>
        <p className="text-clay-muted mb-6 max-w-lg mx-auto">
          Свяжитесь с нами - предоставим полный пакет документов по запросу.
        </p>
        <a href="/contacts" className="btn-clay-primary inline-flex items-center gap-2">
          Связаться с клиникой
        </a>
      </section>

    </div>
  )
}
