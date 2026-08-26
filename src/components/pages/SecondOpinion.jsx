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

const STEPS = [
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
    desc: 'Наш онколог-маммолог изучает заключение, смотрит снимки и при необходимости проводит собственный осмотр. Обычно это занимает 30-40 минут.',
    note: '30-40 минут',
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

const GUARANTEES = [
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
    answer: 'Консультация обычно занимает 30-40 минут. Если по результатам вы решаете делать ВАБ, сама процедура занимает ещё около 30 минут. Итого на визит лучше закладывать 1,5-2 часа.',
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
          <div className="relative z-10 w-full max-w-[740px] max-h-[88vh] overflow-y-auto rounded-[18px] mt-12 no-scrollbar">
            <SecondOpinionForm onClose={closeModal} modalTitleId="second-opinion-modal-title" />
          </div>
        </div>
      )}

      <section className="relative overflow-hidden pt-6 pb-10">

        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div className="self-start text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Сомневаетесь в необходимости операции?{' '}
                <span className="heading-accent">Перепроверьте заключение</span> у онколога-маммолога
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-5 font-medium max-w-2xl">
                Изучим снимки и заключения, спокойно обсудим тактику и следующий шаг без давления.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" onClick={(e) => openModal(e.currentTarget)} className="clay btn-clay-primary gap-2">
                  <FileText size={16} />
                  Отправить документы на проверку
                </button>
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                  <Phone size={16} />
                  Позвонить в клинику
                </a>
              </div>
            </div>
            <HeroDoctorCard doctors={MAMMOLOGISTS} ctaHref="/second-opinion" />
          </div>
        </div>
      </section>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { val: '0 ₽', desc: 'стоимость второго мнения - полностью бесплатно' },
                { val: '30-40 мин', desc: 'консультация и разбор случая с онкологом-маммологом' },
                { val: 'В день обращения', desc: 'обычно обсуждаем дальнейший план без лишнего ожидания' },
              ].map((s) => (
                <div key={s.val} className="clay clay-card p-5">
                  <div className="heading-serif text-3xl sm:text-4xl text-clay-mint mb-1.5">{s.val}</div>
                  <p className="text-sm text-clay-muted leading-tight">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="mb-7 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Как это работает</h2>
              <p className="text-clay-muted">Три понятных шага до ясности и спокойствия</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {STEPS.map((s, i) => (
                <FadeInSection key={s.n} staggerIndex={i}>
                  <div className="clay clay-card p-5 md:p-6">
                    <div className="grid gap-4 md:grid-cols-[auto_minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-center">
                      <div className={`${s.bg} shrink-0`}>{s.icon}</div>
                      <h3 className="font-bold text-clay-dark text-lg">{s.title}</h3>
                      <p className="text-clay-muted text-sm leading-relaxed">{s.desc}</p>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent-light)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] md:justify-self-end">
                        <CheckCircle size={12} />
                        {s.note}
                      </div>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div>
                <h2 className="text-2xl heading-serif text-clay-dark mb-6">Наши гарантии</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {GUARANTEES.map((g) => (
                    <div key={g.text} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-[14px] bg-[color:var(--accent-light)] border border-[color:var(--border-color)] flex items-center justify-center flex-shrink-0">{g.icon}</div>
                      <p className="text-sm text-clay-dark leading-relaxed font-medium">{g.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <FaqSection items={SECOND_OPINION_FAQ} title="Часто задаваемые вопросы" />
              </div>
              <div className="sticky top-24">
                <div className="clay clay-card p-6 md:p-8">
                  <div>
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
                      <button type="button" onClick={(e) => openModal(e.currentTarget)} className="clay btn-clay-secondary w-full justify-center gap-2">
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
