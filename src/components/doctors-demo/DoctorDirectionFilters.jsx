export function DoctorDirectionFilters({ categories, activeSlug, onChange }) {
  if (!categories?.length) return null

  return (
    <div className="doctors-filter-wrap">
      <p className="doctors-filter-label">Фильтр</p>
      <div className="doctors-filter-row">
        {categories.map((category) => {
          const isActive = activeSlug === category.slug

          return (
            <button
              key={category.slug}
              type="button"
              className={`doctor-filter-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => onChange(category.slug)}
            >
              {category.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
