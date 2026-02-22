import { ArrowRight, Brain, Target, BookOpen, CheckCircle, MessageCircle, Zap, Users } from 'lucide-react'
import { FaqSection } from '../FaqSection.jsx'

const NEUROLOGY_FAQ = [
  {
    question: 'Что лечит невролог?',
    answer: 'Невролог занимается диагностикой и лечением заболеваний нервной системы: мигрени, головные боли напряжения, боль в спине и шее, грыжа межпозвонкового диска, радикулит, онемение конечностей, головокружения.',
  },
  {
    question: 'Можно ли вылечить грыжу позвоночника без операции?',
    answer: 'В большинстве случаев — да. Более 90% пациентов с грыжей диска не нуждаются в операции. Лечебные блокады под УЗИ-навигацией, физиотерапия и правильно подобранная программа реабилитации позволяют устранить боль и вернуться к активной жизни.',
  },
  {
    question: 'Что такое лечебная блокада?',
    answer: 'Лечебная блокада — это введение обезболивающего и противовоспалительного препарата точно в очаг боли под контролем УЗИ. Эффект ощущается уже через несколько часов. Процедура занимает 15–20 минут и проводится амбулаторно.',
  },
  {
    question: 'Как быстро проходит мигрень после лечения?',
    answer: 'При правильно подобранной терапии частота и интенсивность мигреней снижается уже через 4–6 недель. Мы используем международные протоколы лечения мигрени, включая современные профилактические препараты.',
  },
  {
    question: 'Нужно ли МРТ перед приёмом невролога?',
    answer: 'Нет, МРТ не обязательно для первичного приёма. Врач проведёт неврологический осмотр и при необходимости направит на нужные исследования. Если у вас уже есть снимки — возьмите их с собой.',
  },
]

const features = [
  {
    icon: <Target size={22} className="text-white" />,
    bg: 'icon-circle-lavender',
    card: 'clay-card-soft-lavender',
    title: 'Точечная помощь',
    subtitle: 'Лечебные блокады под навигацией',
    desc: 'Выполняем лечебные блокады под контролем УЗИ-навигации — лекарство доставляется точно в эпицентр боли. Результат ощущается уже через несколько часов. Без горы таблеток.',
    badge: 'УЗИ-навигация',
  },
  {
    icon: <BookOpen size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Европейские протоколы',
    subtitle: 'Мигрень и хроническая боль',
    desc: 'Лечим мигрени и хронические боли в спине строго по международным клиническим рекомендациям. Никакого «курса капельниц на всякий случай» — только протокол с доказанной эффективностью.',
    badge: 'По международным стандартам',
  },
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Быстрый результат',
    subtitle: '1–3 посещения до активной жизни',
    desc: 'В большинстве случаев значительное улучшение наступает уже после первого-второго посещения. Если операция действительно нужна — скажем об этом честно и поможем выбрать хирурга.',
    badge: '1–3 визита',
  },
]

const conditions = [
  { name: 'Мигрень', icon: '🧠' },
  { name: 'Грыжа межпозвонковых дисков', icon: '🦴' },
  { name: 'Боль в шее (цервикалгия)', icon: '📍' },
  { name: 'Боль в пояснице', icon: '📍' },
  { name: 'Головные боли напряжения', icon: '💆' },
  { name: 'Онемение рук и ног', icon: '✋' },
  { name: 'Хроническая боль в спине', icon: '🦴' },
  { name: 'Межрёберная невралгия', icon: '⚡' },
  { name: 'Синдром позвоночной артерии', icon: '🧠' },
  { name: 'Синдром запястного канала', icon: '✋' },
]

const myths = [
  {
    myth: '«Грыжа позвоночника — это приговор, нужна операция»',
    truth: 'Более 80% случаев грыжи успешно решаются консервативно. Операция нужна только при конкретных показаниях — нарастающем парезе, нарушении функции тазовых органов.',
  },
  {
    myth: '«Мигрень нельзя вылечить, можно только терпеть»',
    truth: 'Современные протоколы профилактики и лечения мигрени снижают частоту приступов на 50–80%. Лечение подбирается индивидуально по триггерам и частоте.',
  },
  {
    myth: '«Нужно пить курс нестероидных противовоспалительных всё время»',
    truth: 'Длительный приём НПВП опасен для ЖКТ и почек. Лечебные блокады под навигацией дают лучший эффект без системного воздействия на организм.',
  },
]

export function Neurology() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-20">

        <div className="container-clay relative z-10">
          <a href="/" className="inline-flex items-center gap-1 text-sm text-clay-muted hover:text-clay-mint transition-colors mb-6">
            ← Назад на главную
          </a>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(184,168,216,0.18)', color: '#7860B0' }}>
              <Brain size={12} />
              Неврология и центр лечения боли
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Неврология в Санкт-Петербурге:{' '}
              <span className="text-clay-lavender">жизнь без боли</span> в спине, шее и голове
            </h1>
            <p className="text-lg text-clay-muted font-medium mb-3">
              «Устал пить обезболивающие, боюсь, что грыжа — это приговор и нужна операция»
            </p>
            <p className="text-clay-muted leading-relaxed mb-8 max-w-2xl">
              Боль — это сигнал, а не ваш постоянный спутник жизни. В 80% случаев причину можно устранить без операции. Мы помогаем вернуться к активной жизни за 1–3 визита.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #CCC0EC, #A898D8)', boxShadow: '10px 10px 24px hsl(260, 12%, 60%), inset -4px -4px 9px hsla(260, 25%, 42%, 0.65), inset 0px 7px 14px hsla(260, 60%, 88%, 0.5)' }}>
                Записаться к неврологу
                <ArrowRight size={16} />
              </a>
              <a href="/prices" className="clay btn-clay-secondary">
                Посмотреть цены
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { val: '80%', label: 'случаев грыжи решаются без операции' },
              { val: '1–3', label: 'визита до значительного улучшения' },
              { val: '50%', label: 'снижение частоты мигреней за месяц' },
              { val: '0', label: 'таблеток «на всякий случай»' },
            ].map((s) => (
              <div key={s.label} className="clay clay-card p-4 text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-clay-lavender leading-none mb-1.5">{s.val}</div>
                <p className="text-xs text-clay-muted leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Наш подход к лечению боли</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Точность, эффективность и честность на каждом этапе</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className={`clay ${f.card} p-6 flex flex-col`}>
                <div className={`${f.bg} mb-4`}>{f.icon}</div>
                <h3 className="font-bold text-clay-dark text-lg mb-1">{f.title}</h3>
                <p className="text-clay-lavender text-sm font-semibold mb-3">{f.subtitle}</p>
                <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{f.desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start" style={{ background: 'rgba(184,168,216,0.18)', color: '#7060A8' }}>
                  <CheckCircle size={12} />
                  {f.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONDITIONS + MYTHS */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-extrabold text-clay-dark mb-4">Лечим эти состояния</h2>
              <p className="text-clay-muted text-sm leading-relaxed mb-5">
                Работаем со всеми ключевыми неврологическими нарушениями по протоколам European Federation of Neurological Societies
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {conditions.map((c) => (
                  <div key={c.name} className="clay clay-card flex items-center gap-3 px-4 py-3">
                    <span className="text-lg flex-shrink-0">{c.icon}</span>
                    <span className="text-sm font-medium text-clay-dark">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-clay-dark mb-2">Честные ответы на страхи</h2>
              <p className="text-clay-muted text-sm mb-4">Что говорят пациенты на первом приёме — и что отвечаем мы</p>
              {myths.map((m, i) => (
                <div key={i} className="clay clay-card p-5">
                  <p className="font-semibold text-clay-dark text-sm mb-2">{m.myth}</p>
                  <p className="text-clay-muted text-sm leading-relaxed border-l-2 border-clay-lavender pl-3">{m.truth}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BLOCKADE SPOTLIGHT */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-lavender p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  Лечебные блокады под УЗИ-навигацией
                </h2>
                <p className="text-white/90 leading-relaxed mb-5">
                  Это не «обезболивающий укол». Это точная доставка противовоспалительного препарата прямо в зону патологии — фасеточный сустав, нервный корешок, триггерную точку.
                </p>
                <div className="space-y-3">
                  {[
                    'Работает там, где таблетки не достигают',
                    'Эффект через несколько часов',
                    'Без системных побочных эффектов',
                    'Под постоянным УЗИ-контролем',
                  ].map((p) => (
                    <div key={p} className="flex items-center gap-2 text-white/90 text-sm">
                      <CheckCircle size={16} className="flex-shrink-0 text-white" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { q: 'Больно?', a: 'Используется местная анестезия. Дискомфорт минимальный.' },
                  { q: 'Это навсегда?', a: 'Блокада устраняет воспаление. В сочетании с ЛФК — эффект долгосрочный.' },
                  { q: 'Сколько нужно процедур?', a: 'Обычно 1–3. Оцениваем результат и принимаем решение совместно.' },
                ].map((faq) => (
                  <div key={faq.q} className="bg-white/20 rounded-2xl p-4">
                    <p className="font-bold text-white text-sm mb-1">— {faq.q}</p>
                    <p className="text-white/85 text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Цены на неврологию в СПб</h2>
            <p className="text-clay-muted">Фиксированные цены без скрытых доплат</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { name: 'Первичная консультация невролога', price: 'от 3 500 ₽' },
              { name: 'Повторная консультация', price: 'от 2 500 ₽' },
              { name: 'Лечебная блокада под УЗИ-навигацией', price: 'от 5 000 ₽' },
              { name: 'Комплексное лечение мигрени (курс)', price: 'от 12 000 ₽' },
            ].map((item) => (
              <div key={item.name} className="clay clay-card flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                <span className="text-clay-lavender font-bold text-sm whitespace-nowrap">{item.price}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a href="/prices" className="clay btn-clay-secondary text-sm">
              Полный прайс-лист →
            </a>
          </div>
        </div>
      </section>

      {/* INTERNAL LINKS */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-xl font-extrabold text-clay-dark mb-5">Полезные разделы</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a href="/doctors" className="clay clay-card-soft-lavender p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <Users size={20} className="text-clay-lavender mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Наши неврологи</p>
                <p className="text-clay-muted text-xs leading-relaxed">Специалисты по боли с опытом лечения по европейским протоколам</p>
              </div>
            </a>
            <a href="/prices" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <CheckCircle size={20} className="text-clay-lavender mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Цены на услуги</p>
                <p className="text-clay-muted text-xs leading-relaxed">Полный прайс-лист на все неврологические услуги</p>
              </div>
            </a>
            <a href="/second-opinion" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <MessageCircle size={20} className="text-clay-lavender mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Записаться на приём</p>
                <p className="text-clay-muted text-xs leading-relaxed">Ответим в WhatsApp в течение 2 минут</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-lavender p-8 md:p-12 text-center">
            <Brain size={40} className="text-clay-lavender mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Готовы вернуться к жизни без боли?
            </h2>
            <p className="text-clay-muted mb-8 max-w-md mx-auto">
              Запишитесь к нашему неврологу. Разберёмся в причине и предложим конкретный план.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #CCC0EC, #A898D8)', boxShadow: '10px 10px 24px hsl(260, 12%, 60%), inset -4px -4px 9px hsla(260, 25%, 42%, 0.65), inset 0px 7px 14px hsla(260, 60%, 88%, 0.5)' }}>
                Записаться
                <ArrowRight size={16} />
              </a>
              <a href="https://wa.me/79119258022" className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="container-clay">
        <FaqSection items={NEUROLOGY_FAQ} title="Частые вопросы о неврологии" />
      </div>
    </div>
  )
}
