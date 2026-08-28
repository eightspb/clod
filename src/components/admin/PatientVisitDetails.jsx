function present(value) {
  return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
}

function display(value) {
  return Array.isArray(value) ? value.filter(present).join(', ') : String(value)
}

function entry(label, value) {
  return present(value) ? [{ label, value: display(value) }] : []
}

function entries(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return []
  return [...entry('Специальность врача', value.doctor_role ?? value.doctorRole), ...entry('Услуги', value.service_names ?? value.services), ...entry('Кабинет', value.cabinet), ...entry('Комментарий', value.comment)]
}

/** Renders protected visit details with human-readable labels instead of source JSON. */
export function PatientVisitDetails({ value }) {
  const items = entries(value)
  if (items.length === 0) return <p className="mt-1 text-clay-admin-muted">Дополнительные сведения не указаны</p>
  return <dl className="mt-1 space-y-1">{items.map((item) => <div key={item.label}><dt className="inline font-medium">{item.label}:</dt>{' '}<dd className="inline break-words">{item.value}</dd></div>)}</dl>
}
