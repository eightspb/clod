import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, MessageCircle } from 'lucide-react'

const features = [
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Технология ВАБ',
    subtitle: 'Вакуумная аспирационная биопсия',
    desc: 'Роботизированное удаление опухоли до 3 см под постоянным контролем УЗИ. Прибор сам откачивает удалённую ткань — без разрезов, без крови.',
    detail: 'Устройство EnCor Enspire (США)',
  },
  {
    icon: <Eye size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Эстетика результата',
    subtitle: 'Прокол 2 мм — и больше ничего',
    desc: 'Вместо разреза — микропрокол, который заживает за 2 месяца без следа. Форма и объём груди не меняются. Никаких шрамов, деформаций или отёков.',
    detail: 'Полное заживление за 2 месяца',
  },
  {
    icon: <Shield size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Полная безопасность',
    subtitle: 'Местная анестезия — вы в сознании',
    desc: 'Местная анестезия позволяет вам разговаривать с врачом в процессе. Процедура длится 30 минут. Уже через 20 минут после её окончания вы уедете домой за рулём.',
    detail: 'Уехать домой через 20 минут',
  },
  {
    icon: <Microscope size={22} className="text-white" />,
    bg: 'icon-circle-lavender',
    card: 'clay-card-soft-lavender',
    title: 'Максимальная точность',
    subtitle: 'Гистология 100% материала',
    desc: 'Всё удалённое образование полностью отправляется на гистологическое исследование. Это в 10 раз информативнее, чем обычная пункционная биопсия с одним столбиком ткани.',
    detail: 'В 10× информативнее пункции',
  },
]

const steps = [
  { n: '01', title: 'Консультация', desc: 'Онколог-маммолог анализирует ваши снимки и осматривает. Ставим точный диагноз.' },
  { n: '02', title: 'Планирование', desc: 'Определяем оптимальный доступ, объём удаления и параметры процедуры под УЗИ-контролем.' },
  { n: '03', title: 'Процедура', desc: 'Местная анестезия, прокол 2 мм, удаление образования прибором EnCor Enspire. 30 минут.' },
  { n: '04', title: 'Результат', desc: 'Отдыхаете 20 минут и едете домой. Материал уходит на гистологию. Врач на связи в мессенджере.' },
]

const checks = [
  'Новообразование до 3 см',
  'Фиброаденома',
  'Киста любого размера',
  'Внутрипротоковая папиллома',
  'Липома груди',
  'Лимфоузел подозрительного характера',
]

export function Mammology() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-20">
        <div className="blob-mint absolute -top-12 -right-12 w-72 h-72 opacity-65 pointer-events-none" />
        <div className="blob-peach absolute bottom-0 -left-10 w-56 h-56 opacity-50 pointer-events-none" />
        <div className="orb w-5 h-5 top-32 left-1/3 opacity-55" style={{ background: 'linear-gradient(145deg, #CCC0EC, #B4A4DC)' }} />
        <div className="orb w-4 h-4 bottom-24 right-1/4 opacity-60" style={{ background: 'linear-gradient(145deg, #FAC8B0, #F0A888)' }} />

        <div className="container-clay relative z-10">
          <a href="/" className="inline-flex items-center gap-1 text-sm text-clay-muted hover:text-clay-mint transition-colors mb-6">
            ← Назад на главную
          </a>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5 text-white" style={{ background: 'linear-gradient(145deg, #68D8B8, #44C4A0)' }}>
              <Zap size={12} />
              Флагманская услуга
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Удаление новообразований груди через прокол{' '}
              <span className="text-clay-mint">2 мм</span>: эстетика и точность
            </h1>
            <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium">
              «Боюсь шрамов и того, что под наркозом что-то пойдёт не так»
            </p>
            <p className="text-clay-muted leading-relaxed mb-8 max-w-2xl">
              Понимаем этот страх. Именно поэтому мы используем технологию ВАБ — вы остаётесь в сознании, разговариваете с врачом, а уже через 20 минут после процедуры едете домой.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                Записаться на ВАБ
                <ArrowRight size={16} />
              </a>
              <a href="/second-opinion" className="clay btn-clay-secondary">
                Получить второе мнение
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* KEY STATS */}
      <section className="pb-8">
        <div className="container-clay">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { val: '30', unit: 'мин', label: 'Длительность процедуры' },
              { val: '2', unit: 'мм', label: 'Размер прокола' },
              { val: '3', unit: 'см', label: 'Макс. размер опухоли' },
              { val: '10×', unit: '', label: 'Информативнее пункции' },
            ].map((s) => (
              <div key={s.label} className="clay clay-card p-4 text-center">
                <div className="flex items-end justify-center gap-0.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-clay-mint leading-none">{s.val}</span>
                  {s.unit && <span className="text-lg font-bold text-clay-mint leading-none pb-0.5">{s.unit}</span>}
                </div>
                <p className="text-xs text-clay-muted mt-1.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">4 причины выбрать ВАБ</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Технология, которая навсегда меняет представление о хирургии молочной железы</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f) => (
              <div key={f.title} className={`clay ${f.card} p-6`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={f.bg}>{f.icon}</div>
                  <div>
                    <h3 className="font-bold text-clay-dark text-lg leading-tight">{f.title}</h3>
                    <p className="text-clay-mint text-sm font-medium">{f.subtitle}</p>
                  </div>
                </div>
                <p className="text-clay-muted text-sm leading-relaxed mb-3">{f.desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(78,200,168,0.12)', color: '#3AB89A' }}>
                  <CheckCircle size={12} />
                  {f.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO NEEDS IT */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-4">
                Кому подходит ВАБ?
              </h2>
              <p className="text-clay-muted mb-6 leading-relaxed">
                ВАБ эффективна при большинстве доброкачественных и пограничных образований. Перед процедурой онколог-маммолог обязательно проведёт консультацию и оценит показания.
              </p>
              <div className="space-y-2.5">
                {checks.map((item) => (
                  <div key={item} className="clay clay-card flex items-center gap-3 px-4 py-3">
                    <CheckCircle size={18} className="text-clay-mint flex-shrink-0" />
                    <span className="text-sm font-medium text-clay-dark">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="clay clay-card-mint p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                <h3 className="font-bold text-white text-xl mb-2">Бесплатное второе мнение</h3>
                <p className="text-white/90 text-sm leading-relaxed mb-4">
                  Если вам уже назначили операцию в другой клинике — принесите снимки. Наш онколог-маммолог проверит, можно ли заменить операцию деликатной процедурой ВАБ.
                </p>
                <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2.5 text-white text-sm font-bold">
                  Цена: 0 ₽
                </div>
                <a href="/second-opinion" className="clay btn-clay-white mt-4 text-sm py-2.5 w-full justify-center">
                  Получить второе мнение
                </a>
              </div>
              <div className="clay clay-card p-6">
                <h3 className="font-bold text-clay-dark text-lg mb-4">Как проходит процедура</h3>
                <div className="space-y-4">
                  {steps.map((s) => (
                    <div key={s.n} className="flex items-start gap-3">
                      <div className="num-badge text-sm w-8 h-8">{s.n}</div>
                      <div>
                        <p className="font-semibold text-clay-dark text-sm">{s.title}</p>
                        <p className="text-clay-muted text-xs leading-relaxed mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-mint p-8 md:p-12 text-center">
            <Clock size={40} className="text-clay-mint mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Готовы решить вопрос раз и навсегда?
            </h2>
            <p className="text-clay-muted mb-8 max-w-md mx-auto">
              Запишитесь на консультацию или получите бесплатное второе мнение. Ответим в WhatsApp в течение 2 минут.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                Записаться на ВАБ
                <ArrowRight size={16} />
              </a>
              <a href="https://wa.me/78001234567" className="clay btn-clay-secondary gap-2">
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
