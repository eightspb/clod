const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', dateStyle: 'short' })
const GENDER_LABELS = Object.freeze({ female: 'Женский', male: 'Мужской' })
const SOURCE_LABELS = Object.freeze({ medesk_csv: 'MEDESK', patronymic: 'отчество', patients_csv: 'выгрузка patients.csv', pd_csv: 'основная выгрузка', pd_xlsx: 'контрольная выгрузка' })

function present(value) {
  return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
}

function display(value) {
  if (typeof value === 'boolean') return value ? 'да' : 'нет'
  if (Array.isArray(value)) return value.filter(present).join(', ')
  return String(value)
}

function entry(label, value) {
  return present(value) ? [{ label, value: display(value) }] : []
}

function date(value) {
  if (typeof value !== 'string') return value
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) ? DATE_FORMAT.format(parsed) : value
}

function address(value) {
  if (!present(value)) return ''
  if (typeof value !== 'object' || Array.isArray(value)) return display(value)
  const parts = [value.postalCode, value.region, value.locality ?? value.city, value.streetAddress ?? value.street].filter(present)
  return [...new Set(parts)].join(', ')
}

function passport(value) {
  if (!present(value)) return []
  if (typeof value !== 'object' || Array.isArray(value)) return entry('Паспорт', value)
  return [...entry('Серия', value.series), ...entry('Номер', value.number), ...entry('Кем выдан', value.issuedBy), ...entry('Дата выдачи', date(value.issuedAt)), ...entry('Код подразделения', value.departmentCode)]
}

function groups(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return []
  const passportItems = passport(value.passport)
  const addressItems = entry('Адрес', address(value.address))
  const otherItems = [...entry('Пол', GENDER_LABELS[value.gender] ?? value.gender), ...entry('Источник данных о поле', SOURCE_LABELS[value.genderSource] ?? value.genderSource), ...entry('Пол определён автоматически', value.genderInferred), ...entry('Договор', value.contract), ...entry('ИНН', value.inn), ...entry('СНИЛС', value.snils), ...entry('Пенсионное удостоверение', value.pensionCertificate), ...entry('Представители', value.representatives), ...entry('Метки', value.tags), ...entry('Место работы', value.employment), ...entry('Кем создана карта', value.createdBy), ...entry('Ответственный сотрудник', value.responsibleEmployee), ...entry('Создано в исходной системе', date(value.legacyCreatedAt)), ...entry('Обновлено в исходной системе', date(value.legacyUpdatedAt)), ...entry('Источник даты рождения', SOURCE_LABELS[value.birthDateSource] ?? value.birthDateSource), ...entry('Заметки', value.notes)]
  return [{ title: 'Паспорт', items: passportItems }, { title: 'Адрес', items: addressItems }, { title: 'Прочие данные', items: otherItems }].filter(({ items }) => items.length > 0)
}

export function PatientPrivateData({ value }) {
  const sections = groups(value)
  if (sections.length === 0) return <p className="mt-2 text-sm text-clay-admin-muted">Данные не указаны</p>
  return <div className="mt-2 space-y-3">{sections.map((section) => <div key={section.title}><h4 className="text-sm font-semibold text-clay-admin-dark">{section.title}</h4><dl className="mt-1 space-y-1">{section.items.map((item) => <div key={item.label} className="text-sm text-clay-text"><dt className="inline font-medium">{item.label}:</dt>{' '}<dd className="inline break-words">{item.value}</dd></div>)}</dl></div>)}</div>
}
