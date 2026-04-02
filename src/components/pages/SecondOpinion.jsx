import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle, FileText, Search, MessageCircle, Phone, Clock, Shield } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data.js'
import { FaqSection } from '../FaqSection.jsx'
import { SecondOpinionForm } from '../SecondOpinionForm.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'
import { FadeInSection } from '../FadeInSection.jsx'

const MAMMOLOGISTS = DOCTORS.filter(d => /онколог-маммолог/i.test(d.specialization))

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const steps = [
  {
    n: '01',
    icon: <FileText size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Вы приносите снимки',
    desc: 'Принесите снимки УЗИ или маммографии из другого центра и, если есть, заключение врача. Этого обычно достаточно для первичной оценки.',
    note: 'Снимки не старше 3 месяцев',
  },
  {
    n: '02',
    icon: <Search size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Онколог изучает ваш случай',
    desc: 'Наш онколог-маммолог изучает заключение, смотрит снимки и при необходимости проводит собственный осмотр. Обычно это занимает 30–40 минут.',
    note: '30–40 минут',
  },
  {
    n: '03',
    icon: <CheckCircle size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Вы получаете честный ответ',
    desc: 'Скажем спокойно, нужна ли операция, подойдёт ли ВАБ или лучше наблюдение. Ответ даём в день обращения, без лишнего ожидания.',
    note: 'Без лишнего давления',
  },
]

const guarantees = [
  { icon: <Shield size={18} className="text-clay-mint" />, text: 'Независимое мнение - врач оценивает показания без давления и навязывания лечения' },
  { icon: <Clock size={18} className="text-clay-mint" />, text: 'Обычно отвечаем в тот же день - чтобы вы быстрее понимали следующий шаг' },
  { icon: <MessageCircle size={18} className="text-clay-mint" />, text: 'Врач остаётся на связи - можно задать уточняющие вопросы после приёма' },
]

export const SECOND_OPINION_FAQ = [
  {
    question: 'Что взять с собой?',
    answer: 'Снимки УЗИ или маммографии (не старше 3 месяцев) и заключение из предыдущей клиники. Если есть результаты анализов или биопсии, тоже принесите их.',
  },
  {
    question: 'Мне точно не придётся платить за консультацию?',
    answer: 'Да, второе мнение по вопросу показаний к операции полностью бесплатно. Если понадобятся дополнительные обследования, мы заранее объясним, зачем они нужны и сколько стоят.',
  },
  {
    question: 'Что если ВАБ мне не подходит?',
    answer: 'Скажем об этом прямо. Если операция действительно необходима, честно сообщим об этом и объясним, почему именно такой путь предпочтителен.',
  },
  {
    question: 'Сколько времени занимает весь процесс?',
    answer: 'Консультация обычно занимает 30–40 минут. Если по результатам вы решаете делать ВАБ, сама процедура занимает ещё около 30 минут. Итого на визит лучше закладывать 1,5–2 часа.',
  },
]

export function SecondOpinion() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const lastFocusedTrigger = useRef(null)
  const modalRef = useRef(null)
  const openModal = useCallback((triggerElement) => {
    lastFocusedTrigger.current = triggerElement
    setIsFormOpen(true)
  }, [])
  const closeModal = useCallback(() => {
    setIsFormOpen(false)
    lastFocusedTrigger.current?.focus()
  }, [])
  useEffect(() => {
    if (!isFormOpen) return
    const modal = modalRef.current
    if (!modal) return
    const focusableElements = modal.querySelectorAll(FOCUSABLE_SELECTOR)
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]
    firstFocusable?.focus()
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeModal()
        return
      }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
    modal.addEventListener('keydown', handleKeyDown)
    return () => modal.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen, closeModal])

  return (
    <div>
      {/* MODAL */}
      {isFormOpen && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="second-opinion-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="fixed inset-0 bg-clay-dark/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative z-10 w-full max-w-[740px] max-h-[88vh] overflow-y-auto rounded-3xl mt-12 no-scrollbar">
            <SecondOpinionForm onClose={closeModal} modalTitleId="second-opinion-modal-title" />
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden pt-6 pb-10">

        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div>
              <div className="clay clay-card inline-flex items-center gap-2 px-5 py-2 mb-5">
                <span className="text-2xl font-extrabold text-clay-mint">0 ₽</span>
                <span className="text-sm font-semibold text-clay-dark">Второе мнение бесплатно</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Сомневаетесь в необходимости операции?{' '}
                <span className="heading-accent">Перепроверьте заключение</span> у онколога-маммолога
              </h1>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl text-lg">
                Мы внимательно изучим снимки и заключения, чтобы спокойно обсудить, нужна ли операция сейчас и какие варианты лечения доступны в вашем случае.
              </p>
              <div className="clay clay-card-soft-mint p-5 mb-5 max-w-xl">
                <p className="text-clay-dark font-medium text-sm leading-relaxed">
                  Второе мнение подходит пациентам из любого региона России. Если понадобится очный осмотр, пригласим в Санкт-Петербург, в Приморский район.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-primary gap-2">
                  <Phone size={16} />
                  Позвонить в клинику
                </a>
                <button onClick={(e) => openModal(e.currentTarget)} className="clay btn-clay-secondary gap-2">
                  <FileText size={16} />
                  Отправить документы на проверку
                </button>
              </div>
            </div>
            <HeroDoctorCard doctors={MAMMOLOGISTS} ctaHref="/second-opinion" />
          </div>
        </div>
      </section>

      {/* STAT BANNER */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { val: '0 ₽', desc: 'стоимость второго мнения - полностью бесплатно' },
                { val: '30–40 мин', desc: 'консультация и разбор случая с онкологом-маммологом' },
                { val: 'В день обращения', desc: 'обычно обсуждаем дальнейший план без лишнего ожидания' },
              ].map((s) => (
                <div key={s.val} className="clay clay-card card-interactive p-5 text-center">
                  <div className="font-serif font-light text-3xl sm:text-4xl text-clay-mint mb-1.5">{s.val}</div>
                  <p className="text-sm text-clay-muted leading-tight">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* STEPS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Как это работает</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Три понятных шага до ясности и спокойствия</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {steps.map((s, i) => (
                <FadeInSection key={s.n} staggerIndex={i} className="h-full">
                  <div className={`clay ${s.card} card-interactive p-6 flex flex-col relative`}>
                    <span className="deco-numeral absolute -top-4 -right-2 opacity-30">{s.n}</span>
                    <div className={`${s.bg} mb-4`}>{s.icon}</div>
                    <h3 className="font-bold text-clay-dark text-lg mb-2">{s.title}</h3>
                    <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{s.desc}</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start badge-specialty-mint">
                      <CheckCircle size={12} />
                      {s.note}
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* GUARANTEES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-mint p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10">
                <h2 className="text-2xl heading-serif text-clay-dark mb-6">Наши гарантии</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {guarantees.map((g, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/70 border border-white/80 flex items-center justify-center flex-shrink-0">{g.icon}</div>
                      <p className="text-sm text-clay-dark leading-relaxed font-medium">{g.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FAQ */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <FaqSection items={SECOND_OPINION_FAQ} title="Часто задаваемые вопросы" />
              </div>
              <div className="sticky top-24">
                <div className="clay clay-card-mint p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                  <div className="relative z-10">
                    <h3 className="heading-serif text-clay-dark text-2xl mb-3">
                      Второе мнение - бесплатно
                    </h3>
                    <p className="text-clay-text text-sm leading-relaxed mb-6">
                      Нам важно, чтобы вы приняли осознанное решение. Изучение заключения нашим онкологом-маммологом - без каких-либо условий.
                    </p>
                    <div className="space-y-3">
                      <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-white w-full justify-center gap-2">
                        <Phone size={16} />
                        Позвонить: {PHONE_DISPLAY}
                      </a>
                      <button onClick={(e) => openModal(e.currentTarget)} className="clay btn-clay-secondary w-full justify-center gap-2">
                        <FileText size={16} />
                        Отправить данные на проверку
                      </button>
                    </div>
                    <p className="text-clay-muted text-xs text-center mt-4">
                      Обычно отвечаем в рабочее время без долгого ожидания
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>
    </div>
  )
}
