import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { DoctorCard } from '../DoctorCard.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { FILTER_TABS_SHORT, FILTER_BG_FLAT, matchesFilter } from '../../lib/filters.js'

export function DoctorsSection({ doctorsData = [] }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const filteredDoctors = useMemo(
    () => doctorsData.filter((doc) => matchesFilter(doc, activeFilter)),
    [doctorsData, activeFilter]
  )
  return (
    <section className="section">
      <div className="container-clay">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">Наши доктора</h2>
          <p className="text-clay-muted">Онкологи-маммологи, гинекологи, эндокринологи и нутрициологи - все владеют УЗИ</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {FILTER_TABS_SHORT.map((tab, i) => {
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
                  background: FILTER_BG_FLAT[i % FILTER_BG_FLAT.length],
                  color: '#3D4A44',
                  boxShadow: '6px 6px 16px hsl(0,0%,72%), inset -3px -3px 7px hsla(0,0%,55%,0.18), inset 0px 5px 10px hsla(0,0%,100%,0.7)',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
          {filteredDoctors.map((doc, i) => (
            <FadeInSection key={doc.slug || doc.name} staggerIndex={i} className="h-full">
              <DoctorCard doctor={doc} />
            </FadeInSection>
          ))}
        </div>
        {filteredDoctors.length === 0 && (
          <div className="text-center py-12 text-clay-muted">
            Доктора по выбранному направлению не найдены
          </div>
        )}
        <div className="text-center mt-8">
          <a href="/doctors" className="clay btn-clay-secondary gap-2">
            Все доктора клиники
            <ChevronRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}
