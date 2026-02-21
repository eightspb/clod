import { DOCTORS } from '../../lib/doctors-data.js'

const FILTER_TABS = [
  { id: 'all', label: 'Все врачи' },
  { id: 'mammology', label: 'Маммология' },
  { id: 'gynecology', label: 'Гинекология' },
  { id: 'endocrinology', label: 'Эндокринология' },
]

const FILTER_BG = [
  'linear-gradient(145deg,#F0F9F6,#E4F5F0)',
  'linear-gradient(145deg,#FEF4EF,#FDE8DF)',
  'linear-gradient(145deg,#EFF6FD,#E2EFF9)',
  'linear-gradient(145deg,#F4F0FB,#EBE4F7)',
]

function matchesFilter(doctor, filterId) {
  if (filterId === 'all') return true
  const spec = doctor.specialization.toLowerCase()
  if (filterId === 'mammology') return spec.includes('онколог') || spec.includes('хирург') || spec.includes('маммол')
  if (filterId === 'gynecology') return spec.includes('гинекол') || spec.includes('акушер')
  if (filterId === 'endocrinology') return spec.includes('эндокринол') || spec.includes('нутрицио')
  return false
}

import { useState } from 'react'

export function Doctors() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = DOCTORS.filter((d) => matchesFilter(d, activeFilter))

  return (
    <div>
      {/* ── Заголовок ── */}
      <section className="section pb-0">
        <div className="container-clay text-center">
          <div className="clay clay-card-soft-mint inline-flex px-4 py-2 rounded-2xl mb-4">
            <span className="text-sm font-semibold text-clay-mint">Наша команда</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark mb-4">
            Врачи клиники Одинцова
          </h1>
          <p className="text-clay-muted text-lg max-w-2xl mx-auto">
            Онкологи-маммологи, гинекологи и эндокринологи — все владеют УЗИ и работают в единой команде
          </p>
        </div>
      </section>

      {/* ── Фильтры ── */}
      <section className="section pt-6 pb-0">
        <div className="container-clay">
          <div className="flex flex-wrap gap-2 justify-center">
            {FILTER_TABS.map((tab, i) => {
              const isActive = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className="inline-flex items-center justify-center rounded-full text-sm font-semibold px-6 py-2.5 cursor-pointer transition-all duration-200 select-none"
                  style={isActive ? {
                    background: 'linear-gradient(145deg, #68D8B8, #44C4A0)',
                    color: '#fff',
                    boxShadow: '8px 8px 20px hsl(155,12%,60%), inset -3px -3px 8px hsla(155,25%,42%,0.6), inset 0px 6px 12px hsla(155,60%,88%,0.5)',
                  } : {
                    background: FILTER_BG[i % FILTER_BG.length],
                    color: '#3D4A44',
                    boxShadow: '6px 6px 16px hsl(0,0%,72%), inset -3px -3px 7px hsla(0,0%,55%,0.18), inset 0px 5px 10px hsla(0,0%,100%,0.7)',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Карточки ── */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((doc) => {
              const initials = doc.name.split(' ').slice(0, 2).map((w) => w[0]).join('')
              const ringMap = {
                mint: 'avatar-ring-mint',
                peach: 'avatar-ring-peach',
                blue: 'avatar-ring-blue',
                lavender: 'avatar-ring-lavender',
              }
              const ring = ringMap[doc.ringColor] || 'avatar-ring-mint'

              return (
                <a
                  key={doc.slug}
                  href={`/doctors/${doc.slug}`}
                  className="clay clay-card p-6 flex flex-col relative overflow-visible group hover:scale-[1.02] transition-transform duration-200"
                >
                  {/* Декоративные шарики */}
                  <div className="pointer-events-none absolute top-4 right-10 w-3 h-3 rounded-full opacity-50" style={{ background: '#FAC8B0' }} />
                  <div className="pointer-events-none absolute top-10 right-5 w-2 h-2 rounded-full opacity-35" style={{ background: '#A8D8F4' }} />
                  <div className="pointer-events-none absolute bottom-20 right-5 w-2.5 h-2.5 rounded-full opacity-45" style={{ background: '#A0E4D4' }} />

                  {/* Верхняя строка: фото + стаж */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${ring} flex-shrink-0`}>
                      {doc.photo
                        ? (
                          <img
                            src={doc.photo}
                            alt={doc.name}
                            className="w-24 h-24 rounded-full object-cover"
                            loading="lazy"
                            width="96"
                            height="96"
                          />
                        )
                        : (
                          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(78,200,168,0.08)' }}>
                            <span className="text-3xl font-bold text-clay-muted">{initials}</span>
                          </div>
                        )
                      }
                    </div>
                    <div className="clay clay-card-soft-mint px-3 py-1.5 rounded-xl text-center flex-shrink-0">
                      <p className="text-xs text-clay-muted leading-none mb-0.5">Стаж</p>
                      <p className="text-sm font-extrabold text-clay-mint leading-none">{doc.experienceYears} лет</p>
                    </div>
                  </div>

                  {/* Имя */}
                  <h2 className="font-bold text-clay-dark text-base leading-snug mb-2 group-hover:text-clay-mint transition-colors">
                    {doc.name}
                  </h2>

                  {/* Краткое описание */}
                  {doc.tagline && (
                    <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1 line-clamp-3">{doc.tagline}</p>
                  )}

                  {/* Специализация + ссылка */}
                  <div className="mt-auto pt-3 border-t border-clay-bg flex items-center justify-between gap-2">
                    <div className="clay clay-card-soft-blue px-3 py-1.5 rounded-xl min-w-0 flex-1 mr-2">
                      <p className="text-xs font-semibold text-clay-dark leading-tight truncate">
                        {doc.specialization.split(',')[0]}
                      </p>
                      {doc.specialization.split(',')[1] && (
                        <p className="text-xs text-clay-muted leading-tight truncate">
                          {doc.specialization.split(',').slice(1).join(',').trim()}
                        </p>
                      )}
                    </div>
                    <span className="clay btn-clay-primary text-xs py-2 px-4 gap-1 flex-shrink-0">
                      Подробнее
                    </span>
                  </div>
                </a>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-clay-muted">
              Врачи по выбранному направлению не найдены
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-8 md:p-12 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 opacity-20 blob-mint" />
            <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 opacity-15 blob-peach" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-extrabold text-clay-dark mb-3">
                Не знаете, к кому обратиться?
              </h2>
              <p className="text-clay-muted mb-6 max-w-lg mx-auto">
                Позвоните нам — мы поможем выбрать нужного специалиста и запишем на удобное время
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href="/second-opinion" className="clay btn-clay-primary">
                  Бесплатное второе мнение
                </a>
                <a href="tel:+78127482210" className="clay btn-clay-secondary">
                  +7 (812) 748-22-10
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
