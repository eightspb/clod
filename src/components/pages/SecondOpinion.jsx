import { ArrowRight, CheckCircle, FileText, Search, MessageCircle, Phone, Clock, Shield } from 'lucide-react'

const steps = [
  {
    n: '01',
    icon: <FileText size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Вы приносите снимки',
    desc: 'Берите снимки УЗИ или маммографии из другого центра, которым не более 3 месяцев. Ничего больше готовить не нужно.',
    note: 'Снимки не старше 3 месяцев',
  },
  {
    n: '02',
    icon: <Search size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Онколог проводит аудит',
    desc: 'Наш онколог-маммолог изучает заключение, смотрит снимки и при необходимости проводит собственный осмотр. Это занимает 30–40 минут.',
    note: '30–40 минут',
  },
  {
    n: '03',
    icon: <CheckCircle size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Вы получаете честный ответ',
    desc: 'Скажем прямо: нужна ли операция, или образование можно удалить через прокол с помощью ВАБ. Или что операция действительно необходима — и поможем выбрать хирурга.',
    note: 'Честно и без скрытых интересов',
  },
]

const guarantees = [
  { icon: <Shield size={18} className="text-clay-mint" />, text: 'Независимое мнение — у нас нет финансовой мотивации направить вас на операцию' },
  { icon: <Clock size={18} className="text-clay-mint" />, text: 'Ответ в тот же день — не нужно ждать недели результатов' },
  { icon: <MessageCircle size={18} className="text-clay-mint" />, text: 'Врач остаётся на связи — можно задать уточняющие вопросы после приёма' },
]

const faqs = [
  {
    q: 'Что взять с собой?',
    a: 'Снимки УЗИ или маммографии (не старше 3 месяцев) и заключение из предыдущей клиники. Если есть результаты анализов или биопсии — берите тоже.',
  },
  {
    q: 'Мне точно не придётся платить за консультацию?',
    a: 'Именно так. Второе мнение по вопросу показаний к операции — полностью бесплатно. Нам важно, чтобы вы приняли осознанное решение. Если понадобятся дополнительные обследования — скажем об этом честно и назовём стоимость заранее.',
  },
  {
    q: 'Что если ВАБ мне не подходит?',
    a: 'Скажем об этом прямо. Если операция действительно необходима — дадим рекомендацию по специалистам и учреждениям с хорошей репутацией. Мы не удерживаем пациентов ради выручки.',
  },
  {
    q: 'Сколько времени занимает весь процесс?',
    a: 'Консультация — 30–40 минут. Если по результатам решаете делать ВАБ — процедура занимает ещё 30 минут. Итого можно уйти домой через 1,5–2 часа с решённым вопросом.',
  },
]

export function SecondOpinion() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-20">

        <div className="container-clay relative z-10">
          <a href="/" className="inline-flex items-center gap-1 text-sm text-clay-muted hover:text-clay-mint transition-colors mb-6">
            ← Назад на главную
          </a>
          <div className="max-w-3xl">
            <div className="clay clay-card inline-flex items-center gap-2 px-5 py-2 mb-5">
              <span className="text-2xl font-extrabold text-clay-mint">0 ₽</span>
              <span className="text-sm font-semibold text-clay-dark">Второе мнение бесплатно</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Сомневаетесь в необходимости операции?{' '}
              <span className="text-clay-mint">Перепроверьте диагноз</span> у нас
            </h1>
            <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl text-lg">
              Каждый третий пациент, приходящий к нам с направлением на операцию из другой клиники, в итоге решает проблему с помощью ВАБ за 30 минут.
            </p>
            <div className="clay clay-card-soft-mint p-5 mb-8 max-w-xl">
              <p className="text-clay-dark font-medium text-sm leading-relaxed">
                Мы не заинтересованы в том, чтобы вы делали операцию. Нам важно, чтобы вы получили оптимальное решение — и это честно.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="tel:+78127482210" className="clay btn-clay-primary gap-2">
                <Phone size={16} />
                Позвонить сейчас
              </a>
              <a href="https://wa.me/79119258022" className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} />
                Написать в WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STAT BANNER */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { val: '1 из 3', desc: 'пациентов избегает операции благодаря ВАБ' },
              { val: '0 ₽', desc: 'стоимость второго мнения — полностью бесплатно' },
              { val: '30 мин', desc: 'процедура ВАБ вместо полноценной операции' },
            ].map((s) => (
              <div key={s.val} className="clay clay-card p-5 text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-clay-mint mb-1.5">{s.val}</div>
                <p className="text-sm text-clay-muted leading-tight">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Как это работает</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Три простых шага до ясности и спокойствия</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((s) => (
              <div key={s.n} className={`clay ${s.card} p-6 flex flex-col relative`}>
                <div className="absolute top-4 right-4 text-5xl font-extrabold opacity-10 text-clay-dark leading-none">
                  {s.n}
                </div>
                <div className={`${s.bg} mb-4`}>{s.icon}</div>
                <h3 className="font-bold text-clay-dark text-lg mb-2">{s.title}</h3>
                <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{s.desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start" style={{ background: 'rgba(78,200,168,0.12)', color: '#3AB89A' }}>
                  <CheckCircle size={12} />
                  {s.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GUARANTEES */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8">
            <h2 className="text-xl font-extrabold text-clay-dark mb-5">Наши гарантии</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {guarantees.map((g, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="clay clay-card p-2 rounded-2xl flex-shrink-0">{g.icon}</div>
                  <p className="text-sm text-clay-muted leading-relaxed">{g.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-6">Часто задаваемые вопросы</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="clay clay-card p-5">
                    <h4 className="font-bold text-clay-dark text-sm mb-2 flex items-start gap-2">
                      <span className="text-clay-mint">—</span>
                      {faq.q}
                    </h4>
                    <p className="text-clay-muted text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="sticky top-24">
              <div className="clay clay-card-mint p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center mb-4">
                    <span className="text-2xl font-extrabold text-white">0₽</span>
                  </div>
                  <h3 className="font-extrabold text-white text-2xl mb-3">
                    Второе мнение — бесплатно
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed mb-6">
                    Нам важно, чтобы вы приняли осознанное решение. Аудит заключения нашим онкологом-маммологом — без каких-либо условий.
                  </p>
                  <div className="space-y-3">
                    <a href="tel:+78127482210" className="clay btn-clay-white w-full justify-center gap-2">
                      <Phone size={16} />
                      Позвонить: +7 (812) 748-22-10
                    </a>
                    <a href="https://wa.me/79119258022" className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-colors" target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={16} />
                      Написать в WhatsApp
                    </a>
                  </div>
                  <p className="text-white/70 text-xs text-center mt-4">
                    Ответим в течение 2 минут в рабочее время
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
