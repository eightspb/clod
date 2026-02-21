export const FILTER_TABS = [
  { id: 'all',           label: 'Все доктора' },
  { id: 'mammology',     label: 'Маммология' },
  { id: 'gynecology',    label: 'Гинекология' },
  { id: 'endocrinology', label: 'Эндокринология' },
]

export const FILTER_TABS_SHORT = [
  { id: 'all',           label: 'Все' },
  { id: 'mammology',     label: 'Онкологи-маммологи' },
  { id: 'gynecology',    label: 'Гинекологи' },
  { id: 'endocrinology', label: 'Эндокринологи' },
]

export const FILTER_BG = [
  'linear-gradient(145deg,#F0F9F6,#E4F5F0)',
  'linear-gradient(145deg,#FEF4EF,#FDE8DF)',
  'linear-gradient(145deg,#EFF6FD,#E2EFF9)',
  'linear-gradient(145deg,#F4F0FB,#EBE4F7)',
]

export const FILTER_BG_FLAT = ['#E8F8F4', '#FDF0EA', '#EAF4FC', '#F0EDF9']

export function matchesFilter(doctor, filterId) {
  if (filterId === 'all') return true
  const spec = doctor.specialization.toLowerCase()
  if (filterId === 'mammology') return spec.includes('онколог') || spec.includes('хирург') || spec.includes('маммол')
  if (filterId === 'gynecology') return spec.includes('гинекол') || spec.includes('акушер')
  if (filterId === 'endocrinology') return spec.includes('эндокринол') || spec.includes('нутрицио')
  return false
}
