const SPECIALTIES = [
  { id: 'all', label: 'Все' },
  { id: 'mammologist', label: 'Маммологи' },
  { id: 'gynecologist', label: 'Гинекологи' },
  { id: 'uzi', label: 'УЗИ' },
  { id: 'oncologist', label: 'Онкологи' },
]

export function SpecialtyFilter({ active = 'all', onChange }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {SPECIALTIES.map(s => (
        <button
          key={s.id}
          className={`pill-filter ${active === s.id ? 'active' : ''}`}
          onClick={() => onChange?.(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

export default SpecialtyFilter
